import { exec } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import config from '../config/index.js';
import { DEFAULT_BACKUP_CONFIG } from './backups.js';
const execAsync = promisify(exec);
// Dynamic path functions for testability
const getDataPath = () => config.data.path;
const getServersFile = () => path.join(getDataPath(), 'servers.json');
const getServersDir = () => path.join(getDataPath(), 'servers');
const DEFAULT_CONFIG = {
    javaXms: '4G',
    javaXmx: '8G',
    bindAddr: '0.0.0.0',
    autoDownload: true,
    useG1gc: true,
    extraArgs: '',
    useMachineId: false, // Default false for compatibility (CasaOS/Windows)
    backup: DEFAULT_BACKUP_CONFIG
};
async function ensureDataDir() {
    await fs.mkdir(getDataPath(), { recursive: true });
    await fs.mkdir(getServersDir(), { recursive: true });
}
async function loadServersData() {
    try {
        await ensureDataDir();
        const content = await fs.readFile(getServersFile(), 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return { version: 1, servers: [] };
    }
}
async function saveServersData(data) {
    await ensureDataDir();
    await fs.writeFile(getServersFile(), JSON.stringify(data, null, 2));
}
function generateDockerCompose(server) {
    const machineIdVolumes = server.config.useMachineId
        ? `      - /etc/machine-id:/etc/machine-id:ro
      - /sys/class/dmi/id:/sys/class/dmi/id:ro
`
        : '';
    // Server volume - must use absolute host path for Docker-in-Docker to work
    // HOST_DATA_PATH should always be absolute (e.g., /home/user/hytale/data)
    const serverVolume = `${config.data.hostPath}/servers/${server.id}/server:/opt/hytale`;
    return `services:
  ${server.containerName}:
    image: ketbom/hytale-server:latest
    container_name: ${server.containerName}
    restart: on-failure
    stdin_open: true
    tty: true
    privileged: true
    ports:
      - "${server.port}:${server.port}/udp"
    environment:
      TZ: ${config.timezone}
      JAVA_XMS: ${server.config.javaXms}
      JAVA_XMX: ${server.config.javaXmx}
      BIND_PORT: ${server.port}
      BIND_ADDR: ${server.config.bindAddr}
      AUTO_DOWNLOAD: ${server.config.autoDownload}
      USE_G1GC: ${server.config.useG1gc}
      SERVER_EXTRA_ARGS: "${server.config.extraArgs}"
    volumes:
      - ${serverVolume}
${machineIdVolumes}`;
}
function generateContainerName(id) {
    return `hytale-${id.slice(0, 8)}`;
}
async function findAvailablePort(servers) {
    const usedPorts = new Set(servers.map((s) => s.port));
    let port = 5520;
    while (usedPorts.has(port)) {
        port++;
    }
    return port;
}
export async function listServers() {
    try {
        const data = await loadServersData();
        return { success: true, servers: data.servers };
    }
    catch (e) {
        return { success: false, error: e.message, servers: [] };
    }
}
export async function getServer(id) {
    try {
        const data = await loadServersData();
        const server = data.servers.find((s) => s.id === id);
        if (!server) {
            return { success: false, error: 'Server not found' };
        }
        return { success: true, server };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
export async function createServer(params) {
    try {
        const data = await loadServersData();
        const id = crypto.randomUUID();
        const port = params.port || (await findAvailablePort(data.servers));
        const containerName = generateContainerName(id);
        // Check port collision
        if (data.servers.some((s) => s.port === port)) {
            return { success: false, error: `Port ${port} already in use` };
        }
        const server = {
            id,
            name: params.name,
            port,
            containerName,
            config: { ...DEFAULT_CONFIG, ...params.config },
            createdAt: new Date().toISOString()
        };
        const serverDir = path.join(getServersDir(), id);
        await fs.mkdir(serverDir, { recursive: true });
        await fs.mkdir(path.join(serverDir, 'server'), { recursive: true });
        const compose = generateDockerCompose(server);
        await fs.writeFile(path.join(serverDir, 'docker-compose.yml'), compose);
        data.servers.push(server);
        await saveServersData(data);
        return { success: true, server };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
export async function updateServer(id, updates) {
    try {
        const data = await loadServersData();
        const index = data.servers.findIndex((s) => s.id === id);
        if (index < 0) {
            return { success: false, error: 'Server not found' };
        }
        const server = data.servers[index];
        // Update fields
        if (updates.name)
            server.name = updates.name;
        if (updates.port && updates.port !== server.port) {
            if (data.servers.some((s) => s.id !== id && s.port === updates.port)) {
                return { success: false, error: `Port ${updates.port} already in use` };
            }
            server.port = updates.port;
        }
        if (updates.config) {
            server.config = { ...server.config, ...updates.config };
        }
        const serverDir = path.join(getServersDir(), id);
        const compose = generateDockerCompose(server);
        await fs.writeFile(path.join(serverDir, 'docker-compose.yml'), compose);
        data.servers[index] = server;
        await saveServersData(data);
        return { success: true, server };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
export async function deleteServer(id, removeData = true) {
    try {
        const data = await loadServersData();
        const index = data.servers.findIndex((s) => s.id === id);
        if (index < 0) {
            return { success: false, error: 'Server not found' };
        }
        const server = data.servers[index];
        const serverDir = path.join(getServersDir(), id);
        try {
            await execAsync(`docker stop ${server.containerName}`, {
                timeout: 30000
            });
        }
        catch {
            // Container might not be running
        }
        try {
            await execAsync('docker compose down -v --remove-orphans', {
                cwd: serverDir
            });
        }
        catch {
            // Compose might not exist
        }
        try {
            await execAsync(`docker rm -f ${server.containerName}`);
        }
        catch {
            // Container might not exist
        }
        if (removeData) {
            await fs.rm(serverDir, { recursive: true, force: true });
        }
        // Remove from list
        data.servers.splice(index, 1);
        await saveServersData(data);
        return { success: true };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
export async function startServer(id) {
    try {
        const result = await getServer(id);
        if (!result.success || !result.server) {
            return { success: false, error: result.error || 'Server not found' };
        }
        const serverDir = path.join(getServersDir(), id);
        await execAsync('docker compose up -d', { cwd: serverDir });
        return { success: true };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
export async function stopServer(id) {
    try {
        const result = await getServer(id);
        if (!result.success || !result.server) {
            return { success: false, error: result.error || 'Server not found' };
        }
        const serverDir = path.join(getServersDir(), id);
        await execAsync('docker compose down', { cwd: serverDir });
        return { success: true };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
export async function restartServer(id) {
    try {
        const result = await getServer(id);
        if (!result.success || !result.server) {
            return { success: false, error: result.error || 'Server not found' };
        }
        const serverDir = path.join(getServersDir(), id);
        await execAsync('docker compose restart', { cwd: serverDir });
        return { success: true };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
export function getServerDataPath(id) {
    return path.join(getServersDir(), id, 'server');
}
export function getServerModsPath(id) {
    return path.join(getServersDir(), id, 'server', 'mods');
}
export async function getServerCompose(id) {
    try {
        const serverDir = path.join(getServersDir(), id);
        const composePath = path.join(serverDir, 'docker-compose.yml');
        const content = await fs.readFile(composePath, 'utf-8');
        return { success: true, content };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
export async function saveServerCompose(id, content) {
    try {
        const serverDir = path.join(getServersDir(), id);
        const composePath = path.join(serverDir, 'docker-compose.yml');
        await fs.writeFile(composePath, content);
        return { success: true };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
export async function regenerateServerCompose(id) {
    try {
        const result = await getServer(id);
        if (!result.success || !result.server) {
            return { success: false, error: result.error || 'Server not found' };
        }
        const compose = generateDockerCompose(result.server);
        const serverDir = path.join(getServersDir(), id);
        await fs.writeFile(path.join(serverDir, 'docker-compose.yml'), compose);
        return { success: true, content: compose };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
//# sourceMappingURL=servers.js.map