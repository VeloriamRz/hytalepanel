import Docker from 'dockerode';
import config from '../config/index.js';
const docker = new Docker({ socketPath: config.docker.socketPath });
// Cache containers by name
const containerCache = new Map();
export async function getContainer(containerName) {
    const name = containerName || config.container.name;
    try {
        const container = docker.getContainer(name);
        containerCache.set(name, container);
        return container;
    }
    catch {
        return null;
    }
}
export async function getStatus(containerName) {
    try {
        const c = await getContainer(containerName);
        if (!c)
            return { running: false, status: 'not found' };
        const info = await c.inspect();
        const status = {
            running: info.State.Running,
            status: info.State.Status,
            startedAt: info.State.StartedAt,
            health: info.State.Health?.Status || 'unknown'
        };
        console.log(`[Docker] Status (${containerName || config.container.name}):`, status.running ? 'RUNNING' : 'STOPPED', status.status);
        return status;
    }
    catch (e) {
        console.error(`[Docker] Status error (${containerName || config.container.name}):`, e.message);
        return { running: false, status: 'not found', error: e.message };
    }
}
export async function execCommand(cmd, timeout = 30000, containerName) {
    const c = await getContainer(containerName);
    if (!c)
        throw new Error('Container not found');
    const exec = await c.exec({
        Cmd: ['sh', '-c', cmd],
        AttachStdout: true,
        AttachStderr: true
    });
    const stream = await exec.start({});
    return new Promise((resolve, reject) => {
        let output = '';
        const timer = setTimeout(() => resolve(output || 'Command timed out'), timeout);
        stream.on('data', (chunk) => {
            output += chunk.slice(8).toString('utf8');
        });
        stream.on('end', () => {
            clearTimeout(timer);
            resolve(output);
        });
        stream.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}
export async function sendCommand(cmd, containerName) {
    try {
        // Write to the console pipe - the entrypoint.sh creates /tmp/hytale-console as a FIFO
        // Use printf to avoid issues with special characters, and redirect in background to avoid blocking
        const escapedCmd = cmd.replace(/"/g, '\\"').replace(/\$/g, '\\$');
        await execCommand(`printf '%s\\n' "${escapedCmd}" > /tmp/hytale-console`, 5000, containerName);
        return { success: true };
    }
    catch (e) {
        console.error('[Docker] sendCommand error:', e.message);
        return { success: false, error: e.message };
    }
}
export async function restart(containerName) {
    try {
        const c = await getContainer(containerName);
        if (!c)
            throw new Error('Container not found');
        await c.restart();
        return { success: true };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
export async function stop(containerName) {
    try {
        const c = await getContainer(containerName);
        if (!c)
            throw new Error('Container not found');
        console.log(`[Docker] Stopping container ${containerName || config.container.name}...`);
        await c.stop();
        console.log('[Docker] Container stopped');
        return { success: true };
    }
    catch (e) {
        const error = e.message;
        if (error.includes('304') || error.includes('already stopped') || error.includes('not running')) {
            console.log('[Docker] Container already stopped');
            return { success: true };
        }
        console.error('[Docker] Stop failed:', error);
        return { success: false, error };
    }
}
export async function kill(containerName) {
    try {
        const c = await getContainer(containerName);
        if (!c)
            throw new Error('Container not found');
        console.log(`[Docker] Force killing container ${containerName || config.container.name}...`);
        await c.kill();
        console.log('[Docker] Container killed');
        return { success: true };
    }
    catch (e) {
        const error = e.message;
        if (error.includes('not running') || error.includes('already stopped')) {
            console.log('[Docker] Container already stopped');
            return { success: true };
        }
        console.error('[Docker] Kill failed:', error);
        return { success: false, error };
    }
}
export async function start(containerName) {
    try {
        const c = await getContainer(containerName);
        if (!c)
            throw new Error('Container not found');
        console.log(`[Docker] Starting container ${containerName || config.container.name}...`);
        await c.start();
        console.log('[Docker] Container started');
        return { success: true };
    }
    catch (e) {
        const error = e.message;
        if (error.includes('304') || error.includes('already started') || error.includes('already running')) {
            console.log('[Docker] Container already running');
            return { success: true };
        }
        console.error('[Docker] Start failed:', error);
        return { success: false, error };
    }
}
export async function getLogs(options = {}) {
    const c = await getContainer(options.containerName);
    if (!c)
        throw new Error('Container not found');
    return c.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: options.tail || 100,
        timestamps: true
    });
}
export async function getLogsHistory(tail = 500, containerName) {
    const c = await getContainer(containerName);
    if (!c)
        throw new Error('Container not found');
    return new Promise((resolve, reject) => {
        c.logs({
            follow: false,
            stdout: true,
            stderr: true,
            tail,
            timestamps: true
        }, (err, buffer) => {
            if (err)
                return reject(err);
            if (!buffer || buffer.length === 0) {
                return resolve([]);
            }
            const text = buffer.toString('utf8');
            const lines = text
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0);
            resolve(lines);
        });
    });
}
export async function getArchive(filePath, containerName) {
    const c = await getContainer(containerName);
    if (!c)
        throw new Error('Container not found');
    return c.getArchive({ path: filePath });
}
export async function putArchive(stream, options, containerName) {
    const c = await getContainer(containerName);
    if (!c)
        throw new Error('Container not found');
    await c.putArchive(stream, options);
}
export async function removeContainer(containerName, removeVolumes = false) {
    try {
        const c = await getContainer(containerName);
        if (!c) {
            return { success: true }; // Already gone
        }
        // Stop first if running
        try {
            await c.stop();
        }
        catch {
            // Ignore if already stopped
        }
        await c.remove({ v: removeVolumes });
        containerCache.delete(containerName);
        return { success: true };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
export async function listContainers() {
    try {
        const containers = await docker.listContainers({ all: true });
        return containers
            .filter((c) => c.Names.some((n) => n.startsWith('/hytale-')))
            .map((c) => ({
            name: c.Names[0].replace('/', ''),
            status: c.Status,
            running: c.State === 'running'
        }));
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=docker.js.map