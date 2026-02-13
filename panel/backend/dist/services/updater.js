import * as docker from './docker.js';
import * as downloader from './downloader.js';
import * as files from './files.js';
const METADATA_PATH = '/opt/hytale/.update-metadata.json';
async function getMetadata(containerName) {
    try {
        const result = await docker.execCommand(`cat ${METADATA_PATH} 2>/dev/null || echo '{}'`, 30000, containerName);
        const trimmed = result.trim();
        if (!trimmed || trimmed === '{}')
            return null;
        return JSON.parse(trimmed);
    }
    catch {
        return null;
    }
}
async function saveMetadata(metadata, containerName) {
    const json = JSON.stringify(metadata, null, 2);
    const escaped = json.replaceAll("'", String.raw `'\'`);
    await docker.execCommand(`echo '${escaped}' > ${METADATA_PATH}`, 30000, containerName);
}
async function getJarInfo(containerName) {
    try {
        const sizeResult = await docker.execCommand("stat -c '%s' /opt/hytale/HytaleServer.jar 2>/dev/null || echo '0'", 30000, containerName);
        const size = Number.parseInt(sizeResult.trim(), 10);
        if (size === 0)
            return null;
        const hashResult = await docker.execCommand("md5sum /opt/hytale/HytaleServer.jar 2>/dev/null | cut -d' ' -f1", 30000, containerName);
        const hash = hashResult.trim();
        if (!hash)
            return null;
        return { size, hash };
    }
    catch {
        return null;
    }
}
export async function checkForUpdate(serverId, containerName) {
    try {
        const filesStatus = await files.checkServerFiles(serverId);
        const metadata = await getMetadata(containerName);
        let daysSinceUpdate = null;
        if (metadata?.lastDownloadAt) {
            const lastDate = new Date(metadata.lastDownloadAt);
            const now = new Date();
            daysSinceUpdate = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        return {
            success: true,
            lastUpdate: metadata?.lastDownloadAt || null,
            daysSinceUpdate,
            hasFiles: filesStatus.ready
        };
    }
    catch (e) {
        return {
            success: false,
            lastUpdate: null,
            daysSinceUpdate: null,
            hasFiles: false,
            error: e.message
        };
    }
}
export async function applyUpdate(socket, containerName, serverId) {
    try {
        // Check if server is running before update
        const status = await docker.getStatus(containerName);
        const wasRunning = status.running;
        // Download new files FIRST (requires container running, not server)
        socket.emit('update:status', {
            status: 'downloading',
            message: 'Downloading update...',
            serverId
        });
        await downloader.downloadServerFiles(socket, containerName, serverId);
        // Update metadata
        const jarInfo = await getJarInfo(containerName);
        const metadata = {
            lastDownloadAt: new Date().toISOString(),
            jarSize: jarInfo?.size || null,
            jarHash: jarInfo?.hash || null,
            assetsSize: null // Could be added later
        };
        await saveMetadata(metadata, containerName);
        // Restart server to apply changes if it was running
        if (wasRunning) {
            socket.emit('update:status', {
                status: 'restarting',
                message: 'Restarting server to apply update...',
                serverId
            });
            await docker.restart(containerName);
            // Wait for restart to complete
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
        socket.emit('update:status', {
            status: 'complete',
            message: 'Update complete!',
            serverId
        });
        return { success: true };
    }
    catch (e) {
        socket.emit('update:status', {
            status: 'error',
            message: e.message,
            serverId
        });
        return { success: false, error: e.message };
    }
}
export async function recordDownload(containerName) {
    try {
        const jarInfo = await getJarInfo(containerName);
        const metadata = {
            lastDownloadAt: new Date().toISOString(),
            jarSize: jarInfo?.size || null,
            jarHash: jarInfo?.hash || null,
            assetsSize: null
        };
        await saveMetadata(metadata, containerName);
    }
    catch {
        // Silently fail - metadata is non-critical
    }
}
//# sourceMappingURL=updater.js.map