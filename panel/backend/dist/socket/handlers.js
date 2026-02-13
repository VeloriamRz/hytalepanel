import * as backups from '../services/backups.js';
import * as curseforge from '../services/curseforge.js';
import * as docker from '../services/docker.js';
import * as downloader from '../services/downloader.js';
import * as files from '../services/files.js';
import * as mods from '../services/mods.js';
import * as modtale from '../services/modtale.js';
import * as servers from '../services/servers.js';
import * as systemMetrics from '../services/systemMetrics.js';
import * as updater from '../services/updater.js';
export function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('Client connected');
        // Server context for this socket
        const ctx = {
            serverId: null,
            containerName: null
        };
        let logStream = null;
        function emitSystemMetrics() {
            socket.emit('system:metrics', systemMetrics.getSystemMetrics());
        }
        // Emit immediately and then every second for dashboard hardware charts
        emitSystemMetrics();
        const metricsInterval = setInterval(emitSystemMetrics, 1000);
        async function connectLogStream(tail = 0) {
            if (logStream) {
                try {
                    logStream.destroy?.();
                }
                catch {
                    /* ignore */
                }
                logStream = null;
            }
            if (!ctx.containerName)
                return;
            try {
                logStream = await docker.getLogs({
                    tail,
                    containerName: ctx.containerName
                });
                logStream.on('data', (chunk) => {
                    socket.emit('log', chunk.slice(8).toString('utf8'));
                });
                logStream.on('error', () => {
                    logStream = null;
                });
                logStream.on('end', () => {
                    logStream = null;
                });
            }
            catch (e) {
                socket.emit('error', `Failed to connect to container logs: ${e.message}`);
            }
        }
        // Join a server room and set context
        socket.on('server:join', async (serverId) => {
            // Leave previous room and cleanup
            if (ctx.serverId) {
                socket.leave(`server:${ctx.serverId}`);
                if (logStream) {
                    try {
                        logStream.destroy?.();
                    }
                    catch {
                        /* ignore */
                    }
                    logStream = null;
                }
            }
            const result = await servers.getServer(serverId);
            if (!result.success || !result.server) {
                socket.emit('server:join-error', { error: 'Server not found' });
                return;
            }
            ctx.serverId = serverId;
            ctx.containerName = result.server.containerName;
            socket.join(`server:${serverId}`);
            // Check if server is running first
            const status = await docker.getStatus(ctx.containerName);
            socket.emit('status', status);
            // Files status from local filesystem
            socket.emit('files', await files.checkServerFiles(serverId));
            socket.emit('downloader-auth', await files.checkAuth(serverId));
            // Logs only available when container is running
            if (status.running) {
                try {
                    const history = await docker.getLogsHistory(500, ctx.containerName);
                    socket.emit('logs:history', { logs: history, initial: true });
                }
                catch (e) {
                    console.error('Failed to get log history:', e.message);
                }
                await connectLogStream();
            }
            else {
                socket.emit('logs:history', { logs: [], initial: true });
            }
            socket.emit('server:joined', { serverId, server: result.server });
        });
        socket.on('server:leave', () => {
            if (ctx.serverId) {
                socket.leave(`server:${ctx.serverId}`);
            }
            ctx.serverId = null;
            ctx.containerName = null;
            if (logStream) {
                try {
                    logStream.destroy?.();
                }
                catch {
                    /* ignore */
                }
                logStream = null;
            }
        });
        socket.on('command', async (cmd) => {
            if (!ctx.containerName) {
                socket.emit('command-result', {
                    cmd,
                    success: false,
                    error: 'No server selected'
                });
                return;
            }
            const result = await docker.sendCommand(cmd, ctx.containerName);
            socket.emit('command-result', { cmd, ...result });
        });
        socket.on('download', async () => {
            if (!ctx.containerName || !ctx.serverId)
                return;
            await downloader.downloadServerFiles(socket, ctx.containerName, ctx.serverId);
        });
        socket.on('restart', async () => {
            if (!ctx.containerName)
                return;
            socket.emit('action-status', { action: 'restart', status: 'starting' });
            const result = await docker.restart(ctx.containerName);
            socket.emit('action-status', { action: 'restart', ...result });
            if (result.success) {
                setTimeout(async () => {
                    await connectLogStream(50);
                    socket.emit('status', await docker.getStatus(ctx.containerName));
                }, 2000);
            }
        });
        socket.on('stop', async () => {
            if (!ctx.containerName)
                return;
            console.log('[Socket] Stop requested');
            // Stop backup scheduler
            if (ctx.serverId) {
                backups.stopBackupScheduler(ctx.serverId);
            }
            socket.emit('action-status', { action: 'stop', status: 'starting' });
            const result = await docker.stop(ctx.containerName);
            console.log('[Socket] Stop result:', result);
            socket.emit('action-status', { action: 'stop', ...result });
            // Emit updated status so UI knows server is stopped
            if (result.success) {
                setTimeout(async () => {
                    socket.emit('status', await docker.getStatus(ctx.containerName));
                }, 500);
            }
        });
        socket.on('kill', async () => {
            if (!ctx.containerName)
                return;
            console.log('[Socket] Kill (force stop) requested');
            // Stop backup scheduler
            if (ctx.serverId) {
                backups.stopBackupScheduler(ctx.serverId);
            }
            socket.emit('action-status', { action: 'kill', status: 'starting' });
            const result = await docker.kill(ctx.containerName);
            console.log('[Socket] Kill result:', result);
            socket.emit('action-status', { action: 'kill', ...result });
            // Emit updated status so UI knows server is stopped
            if (result.success) {
                setTimeout(async () => {
                    socket.emit('status', await docker.getStatus(ctx.containerName));
                }, 500);
            }
        });
        socket.on('start', async () => {
            if (!ctx.serverId)
                return;
            console.log('[Socket] Start requested');
            // Get server config for backup settings
            const serverResult = await servers.getServer(ctx.serverId);
            const backupConfig = serverResult.server?.config.backup;
            // Create backup on start if enabled
            if (backupConfig?.onServerStart) {
                console.log('[Socket] Creating backup before start');
                socket.emit('backup:status', { status: 'creating' });
                const backupResult = await backups.createBackup(ctx.serverId);
                if (backupResult.success) {
                    console.log(`[Socket] Backup created: ${backupResult.backup?.filename}`);
                    await backups.cleanupOldBackups(ctx.serverId, backupConfig);
                }
            }
            socket.emit('action-status', { action: 'start', status: 'starting' });
            // Use docker-compose up for the server
            const result = await servers.startServer(ctx.serverId);
            console.log('[Socket] Start result:', result);
            socket.emit('action-status', { action: 'start', ...result });
            if (result.success && ctx.containerName && ctx.serverId) {
                // Start backup scheduler if enabled
                if (backupConfig?.enabled && backupConfig.intervalMinutes > 0) {
                    backups.startBackupScheduler(ctx.serverId, backupConfig);
                }
                setTimeout(async () => {
                    await connectLogStream(50);
                    const status = await docker.getStatus(ctx.containerName);
                    socket.emit('status', status);
                    socket.emit('files', await files.checkServerFiles(ctx.serverId));
                    socket.emit('downloader-auth', await files.checkAuth(ctx.serverId));
                }, 2000);
            }
        });
        socket.on('check-files', async () => {
            if (!ctx.serverId)
                return;
            socket.emit('files', await files.checkServerFiles(ctx.serverId));
            socket.emit('downloader-auth', await files.checkAuth(ctx.serverId));
        });
        socket.on('logs:more', async ({ currentCount = 0, batchSize = 200 }) => {
            if (!ctx.containerName)
                return;
            try {
                const total = currentCount + batchSize;
                const allLogs = await docker.getLogsHistory(total, ctx.containerName);
                const olderLogs = allLogs.slice(0, Math.max(0, allLogs.length - currentCount));
                socket.emit('logs:history', {
                    logs: olderLogs,
                    initial: false,
                    hasMore: allLogs.length >= total
                });
            }
            catch (e) {
                socket.emit('logs:history', {
                    logs: [],
                    error: e.message
                });
            }
        });
        socket.on('wipe', async () => {
            if (!ctx.serverId)
                return;
            socket.emit('action-status', { action: 'wipe', status: 'starting' });
            const result = await files.wipeData(ctx.serverId);
            socket.emit('action-status', { action: 'wipe', ...result });
            socket.emit('downloader-auth', await files.checkAuth(ctx.serverId));
        });
        socket.on('files:list', async (dirPath = '/') => {
            if (!ctx.serverId)
                return;
            socket.emit('files:list-result', await files.listDirectory(dirPath, ctx.serverId));
        });
        socket.on('files:read', async (filePath) => {
            if (!ctx.serverId)
                return;
            socket.emit('files:read-result', await files.readContent(filePath, ctx.serverId));
        });
        socket.on('files:save', async ({ path: filePath, content, createBackup: shouldBackup }) => {
            if (!ctx.serverId)
                return;
            let backupResult = null;
            if (shouldBackup) {
                backupResult = await files.createBackup(filePath, ctx.serverId);
            }
            const result = await files.writeContent(filePath, content, ctx.serverId);
            socket.emit('files:save-result', { ...result, backup: backupResult });
        });
        socket.on('files:mkdir', async (dirPath) => {
            if (!ctx.serverId)
                return;
            socket.emit('files:mkdir-result', await files.createDirectory(dirPath, ctx.serverId));
        });
        socket.on('files:delete', async (itemPath) => {
            if (!ctx.serverId)
                return;
            socket.emit('files:delete-result', await files.deleteItem(itemPath, ctx.serverId));
        });
        socket.on('files:rename', async ({ oldPath, newPath }) => {
            if (!ctx.serverId)
                return;
            socket.emit('files:rename-result', await files.renameItem(oldPath, newPath, ctx.serverId));
        });
        socket.on('files:copy', async ({ srcPath, destPath }) => {
            if (!ctx.serverId)
                return;
            const result = await files.copyItem(srcPath, destPath, ctx.serverId);
            socket.emit('files:copy-result', result);
        });
        socket.on('mods:list', async () => {
            if (!ctx.containerName)
                return;
            const result = await mods.listInstalledMods(ctx.containerName);
            if (result.success && modtale.isConfigured()) {
                const localMods = result.mods.filter((m) => m.isLocal && !m.projectId);
                if (localMods.length > 0) {
                    const enrichPromises = localMods.map(async (mod) => {
                        try {
                            const searchTerm = mod.fileName
                                .replace(/\.(jar|zip|disabled)$/gi, '')
                                .replace(/-[\d.]+.*$/, '')
                                .replace(/[-_]/g, ' ');
                            if (!searchTerm || searchTerm.length < 2)
                                return;
                            const searchResult = await modtale.searchProjects({
                                query: searchTerm,
                                pageSize: 5
                            });
                            if (!searchResult.success || !searchResult.projects.length)
                                return;
                            const match = searchResult.projects.find((p) => p.title.toLowerCase() === searchTerm.toLowerCase() ||
                                p.title.toLowerCase().includes(searchTerm.toLowerCase()));
                            if (match) {
                                const updates = {
                                    providerId: 'modtale',
                                    projectId: match.id,
                                    projectSlug: match.slug,
                                    projectTitle: match.title,
                                    projectIconUrl: match.iconUrl,
                                    classification: match.classification,
                                    isLocal: false
                                };
                                const versionMatch = mod.fileName.match(/-(\d+\.\d+(?:\.\d+)?)/);
                                if (versionMatch) {
                                    const fileVersion = versionMatch[1];
                                    const matchingVersion = match.versions?.find((v) => v.version === fileVersion);
                                    if (matchingVersion) {
                                        updates.versionId = matchingVersion.id;
                                        updates.versionName = matchingVersion.version;
                                    }
                                    else {
                                        updates.versionName = fileVersion;
                                    }
                                }
                                Object.assign(mod, updates);
                                await mods.updateMod(mod.id, updates, ctx.containerName);
                            }
                        }
                        catch (e) {
                            console.error(`[Mods] Error enriching mod ${mod.fileName}:`, e.message);
                        }
                    });
                    await Promise.all(enrichPromises);
                }
            }
            socket.emit('mods:list-result', result);
        });
        socket.on('mods:search', async (params) => {
            socket.emit('mods:search-result', await modtale.searchProjects(params));
        });
        socket.on('mods:get', async (projectId) => {
            socket.emit('mods:get-result', await modtale.getProject(projectId));
        });
        socket.on('mods:install', async ({ projectId, versionId, metadata }) => {
            if (!ctx.containerName)
                return;
            socket.emit('mods:install-status', {
                status: 'downloading',
                projectId
            });
            const downloadResult = await modtale.downloadVersion(projectId, metadata.versionName);
            if (!downloadResult.success || !downloadResult.buffer) {
                socket.emit('mods:install-result', {
                    success: false,
                    error: downloadResult.error
                });
                return;
            }
            socket.emit('mods:install-status', { status: 'installing', projectId });
            let fileName = downloadResult.fileName || metadata.fileName;
            if (!fileName) {
                const ext = metadata.classification === 'MODPACK' ? 'zip' : 'jar';
                fileName = `${metadata.projectTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${metadata.versionName}.${ext}`;
            }
            const installResult = await mods.installMod(downloadResult.buffer, {
                ...metadata,
                projectId,
                versionId,
                fileName
            }, ctx.containerName);
            socket.emit('mods:install-result', installResult);
        });
        socket.on('mods:uninstall', async (modId) => {
            if (!ctx.containerName)
                return;
            socket.emit('mods:uninstall-result', await mods.uninstallMod(modId, ctx.containerName));
        });
        socket.on('mods:enable', async (modId) => {
            if (!ctx.containerName)
                return;
            socket.emit('mods:enable-result', await mods.enableMod(modId, ctx.containerName));
        });
        socket.on('mods:disable', async (modId) => {
            if (!ctx.containerName)
                return;
            socket.emit('mods:disable-result', await mods.disableMod(modId, ctx.containerName));
        });
        socket.on('mods:check-config', async () => {
            const result = await modtale.verifyApiKey();
            socket.emit('mods:config-status', result);
        });
        socket.on('mods:classifications', async () => {
            socket.emit('mods:classifications-result', await modtale.getClassifications());
        });
        // CurseForge handlers
        socket.on('cf:check-config', async () => {
            const result = await curseforge.verifyApiKey();
            socket.emit('cf:config-status', result);
        });
        socket.on('cf:search', async (params) => {
            socket.emit('cf:search-result', await curseforge.searchProjects(params));
        });
        socket.on('cf:get', async (modId) => {
            socket.emit('cf:get-result', await curseforge.getProject(modId));
        });
        socket.on('cf:categories', async () => {
            socket.emit('cf:categories-result', await curseforge.getCategories());
        });
        socket.on('cf:files', async (modId) => {
            socket.emit('cf:files-result', await curseforge.getModFiles(modId));
        });
        socket.on('cf:install', async ({ modId, fileId, metadata }) => {
            if (!ctx.containerName)
                return;
            socket.emit('cf:install-status', { status: 'downloading', modId });
            const downloadResult = await curseforge.downloadVersion(modId, fileId);
            if (!downloadResult.success || !downloadResult.buffer) {
                socket.emit('cf:install-result', {
                    success: false,
                    error: downloadResult.error
                });
                return;
            }
            socket.emit('cf:install-status', { status: 'installing', modId });
            let fileName = downloadResult.fileName || metadata.fileName;
            if (!fileName) {
                const ext = metadata.classification === 'PACK' ? 'zip' : 'jar';
                fileName = `${metadata.projectTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${metadata.versionName}.${ext}`;
            }
            const installResult = await mods.installMod(downloadResult.buffer, {
                providerId: 'curseforge',
                projectId: modId,
                versionId: fileId,
                versionName: metadata.versionName,
                projectTitle: metadata.projectTitle,
                classification: metadata.classification,
                fileName,
                projectIconUrl: metadata.projectIconUrl,
                projectSlug: metadata.projectSlug
            }, ctx.containerName);
            socket.emit('cf:install-result', installResult);
        });
        // Server update handlers
        socket.on('update:check', async () => {
            if (!ctx.serverId)
                return;
            socket.emit('update:check-result', await updater.checkForUpdate(ctx.serverId, ctx.containerName ?? undefined));
        });
        socket.on('update:apply', async () => {
            if (!ctx.containerName || !ctx.serverId)
                return;
            await updater.applyUpdate(socket, ctx.containerName, ctx.serverId);
        });
        socket.on('mods:check-updates', async () => {
            if (!ctx.containerName)
                return;
            try {
                const listResult = await mods.listInstalledMods(ctx.containerName);
                if (!listResult.success) {
                    socket.emit('mods:check-updates-result', {
                        success: false,
                        error: listResult.error
                    });
                    return;
                }
                const allUpdates = [];
                // Check Modtale mods if API is configured
                if (modtale.isConfigured()) {
                    const modtaleMods = listResult.mods.filter((m) => m.providerId === 'modtale' && m.projectId);
                    const modtaleChecks = await Promise.all(modtaleMods.map(async (mod) => {
                        try {
                            const projectResult = await modtale.getProject(mod.projectId);
                            if (projectResult.success && projectResult.project?.latestVersion) {
                                const latest = projectResult.project.latestVersion;
                                if (latest.id && latest.id !== mod.versionId) {
                                    return {
                                        modId: mod.id,
                                        projectId: mod.projectId,
                                        projectTitle: mod.projectTitle,
                                        currentVersion: mod.versionName,
                                        latestVersion: latest.version,
                                        latestVersionId: latest.id,
                                        latestFileName: latest.fileName,
                                        providerId: 'modtale'
                                    };
                                }
                            }
                        }
                        catch (e) {
                            console.error(`[Mods] Error checking Modtale updates for ${mod.projectTitle}:`, e.message);
                        }
                        return null;
                    }));
                    allUpdates.push(...modtaleChecks.filter(Boolean));
                }
                // Check CurseForge mods if API is configured
                if (curseforge.isConfigured()) {
                    const cfMods = listResult.mods.filter((m) => m.providerId === 'curseforge' && m.projectId);
                    const cfChecks = await Promise.all(cfMods.map(async (mod) => {
                        try {
                            const projectResult = await curseforge.getProject(mod.projectId);
                            if (projectResult.success && projectResult.project?.latestVersion) {
                                const latest = projectResult.project.latestVersion;
                                if (latest.id && latest.id !== mod.versionId) {
                                    return {
                                        modId: mod.id,
                                        projectId: mod.projectId,
                                        projectTitle: mod.projectTitle,
                                        currentVersion: mod.versionName,
                                        latestVersion: latest.version,
                                        latestVersionId: latest.id,
                                        latestFileName: latest.fileName,
                                        providerId: 'curseforge'
                                    };
                                }
                            }
                        }
                        catch (e) {
                            console.error(`[Mods] Error checking CurseForge updates for ${mod.projectTitle}:`, e.message);
                        }
                        return null;
                    }));
                    allUpdates.push(...cfChecks.filter(Boolean));
                }
                socket.emit('mods:check-updates-result', {
                    success: true,
                    updates: allUpdates
                });
            }
            catch (e) {
                socket.emit('mods:check-updates-result', {
                    success: false,
                    error: e.message
                });
            }
        });
        socket.on('mods:update', async ({ modId, versionId, metadata }) => {
            if (!ctx.containerName)
                return;
            console.log(`[Mods] Update request: modId=${modId}, versionId=${versionId}`);
            const modResult = await mods.getMod(modId, ctx.containerName);
            if (!modResult.success || !modResult.mod) {
                socket.emit('mods:update-result', {
                    success: false,
                    error: 'Mod not found'
                });
                return;
            }
            const mod = modResult.mod;
            socket.emit('mods:update-status', { status: 'downloading', modId });
            let downloadResult;
            if (mod.providerId === 'curseforge') {
                downloadResult = await curseforge.downloadVersion(mod.projectId, versionId);
            }
            else {
                downloadResult = await modtale.downloadVersion(mod.projectId, metadata.versionName);
            }
            if (!downloadResult.success || !downloadResult.buffer) {
                socket.emit('mods:update-result', {
                    success: false,
                    error: downloadResult.error
                });
                return;
            }
            socket.emit('mods:update-status', { status: 'installing', modId });
            const installResult = await mods.installMod(downloadResult.buffer, {
                providerId: mod.providerId,
                projectId: mod.projectId || undefined,
                projectSlug: mod.projectSlug,
                projectTitle: mod.projectTitle,
                projectIconUrl: mod.projectIconUrl,
                versionId: versionId,
                versionName: metadata.versionName,
                classification: mod.classification,
                fileName: downloadResult.fileName || metadata.fileName
            }, ctx.containerName);
            if (installResult.success) {
                socket.emit('mods:update-result', {
                    success: true,
                    mod: installResult.mod
                });
            }
            else {
                socket.emit('mods:update-result', {
                    success: false,
                    error: installResult.error
                });
            }
        });
        // Backup handlers
        socket.on('backup:create', async () => {
            if (!ctx.serverId)
                return;
            socket.emit('backup:status', { status: 'creating' });
            const result = await backups.createBackup(ctx.serverId);
            socket.emit('backup:create-result', result);
            if (result.success) {
                // Cleanup old backups after creating new one
                const serverResult = await servers.getServer(ctx.serverId);
                if (serverResult.server?.config.backup) {
                    await backups.cleanupOldBackups(ctx.serverId, serverResult.server.config.backup);
                }
            }
        });
        socket.on('backup:list', async () => {
            if (!ctx.serverId)
                return;
            socket.emit('backup:list-result', await backups.listBackups(ctx.serverId));
        });
        socket.on('backup:restore', async (backupId) => {
            if (!ctx.serverId || !ctx.containerName)
                return;
            // Check if server is running
            const status = await docker.getStatus(ctx.containerName);
            if (status.running) {
                socket.emit('backup:restore-result', {
                    success: false,
                    error: 'Server must be stopped before restoring backup'
                });
                return;
            }
            socket.emit('backup:status', { status: 'restoring' });
            const result = await backups.restoreBackup(ctx.serverId, backupId);
            socket.emit('backup:restore-result', result);
        });
        socket.on('backup:delete', async (backupId) => {
            if (!ctx.serverId)
                return;
            const result = await backups.deleteBackup(ctx.serverId, backupId);
            socket.emit('backup:delete-result', result);
        });
        socket.on('backup:config', async (newConfig) => {
            if (!ctx.serverId)
                return;
            if (newConfig) {
                // Update backup config
                const result = await servers.updateServer(ctx.serverId, {
                    config: { backup: newConfig }
                });
                if (result.success && result.server) {
                    // Restart scheduler if needed
                    if (newConfig.enabled && newConfig.intervalMinutes > 0) {
                        backups.startBackupScheduler(ctx.serverId, newConfig);
                    }
                    else {
                        backups.stopBackupScheduler(ctx.serverId);
                    }
                    socket.emit('backup:config-result', {
                        success: true,
                        config: newConfig
                    });
                }
                else {
                    socket.emit('backup:config-result', {
                        success: false,
                        error: result.error
                    });
                }
            }
            else {
                // Get current backup config
                const serverResult = await servers.getServer(ctx.serverId);
                if (serverResult.success && serverResult.server) {
                    socket.emit('backup:config-result', {
                        success: true,
                        config: serverResult.server.config.backup
                    });
                }
                else {
                    socket.emit('backup:config-result', {
                        success: false,
                        error: 'Server not found'
                    });
                }
            }
        });
        // Status interval - only when joined to a server
        const statusInterval = setInterval(async () => {
            if (ctx.containerName) {
                socket.emit('status', await docker.getStatus(ctx.containerName));
            }
        }, 5000);
        socket.on('disconnect', () => {
            clearInterval(statusInterval);
            clearInterval(metricsInterval);
            if (logStream) {
                try {
                    logStream.destroy?.();
                }
                catch {
                    /* ignore */
                }
            }
            console.log('Client disconnected');
        });
    });
}
//# sourceMappingURL=handlers.js.map