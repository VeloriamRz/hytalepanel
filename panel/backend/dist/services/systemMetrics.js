import { statfsSync } from 'node:fs';
import os from 'node:os';
import process from 'node:process';
let previousCpu = null;
let previousProcess = null;
function round(value, decimals = 1) {
    const p = 10 ** decimals;
    return Math.round(value * p) / p;
}
function clamp(value, min = 0, max = 100) {
    return Math.min(max, Math.max(min, value));
}
function getCpuSnapshot() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
        idle += cpu.times.idle;
        total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
    }
    return { idle, total };
}
function getCpuPercent() {
    const current = getCpuSnapshot();
    if (!previousCpu) {
        previousCpu = current;
        return 0;
    }
    const idleDiff = current.idle - previousCpu.idle;
    const totalDiff = current.total - previousCpu.total;
    previousCpu = current;
    if (totalDiff <= 0)
        return 0;
    return round(clamp((1 - idleDiff / totalDiff) * 100));
}
function getProcessCpuPercent() {
    const current = {
        usage: process.cpuUsage(),
        at: process.hrtime.bigint()
    };
    if (!previousProcess) {
        previousProcess = current;
        return 0;
    }
    const usageDiff = current.usage.user -
        previousProcess.usage.user +
        (current.usage.system - previousProcess.usage.system);
    const elapsedMicroseconds = Number(current.at - previousProcess.at) / 1000;
    const cpuCount = Math.max(1, os.cpus().length);
    previousProcess = current;
    if (elapsedMicroseconds <= 0)
        return 0;
    return round(clamp((usageDiff / (elapsedMicroseconds * cpuCount)) * 100));
}
function getRootPath() {
    if (process.platform === 'win32') {
        const cwd = process.cwd();
        return cwd.length >= 2 ? `${cwd.slice(0, 2)}\\` : 'C:\\';
    }
    return '/';
}
function getDiskUsage() {
    try {
        const stats = statfsSync(getRootPath());
        const blockSize = Number(stats.bsize);
        const blocks = Number(stats.blocks);
        const availableBlocks = Number(stats.bavail);
        if (blockSize <= 0 || blocks <= 0)
            return null;
        const totalBytes = blockSize * blocks;
        const availableBytes = blockSize * availableBlocks;
        const usedBytes = Math.max(0, totalBytes - availableBytes);
        const gb = 1024 ** 3;
        return {
            percent: round(clamp((usedBytes / totalBytes) * 100)),
            usedGb: round(usedBytes / gb),
            totalGb: round(totalBytes / gb)
        };
    }
    catch {
        return null;
    }
}
export function getSystemMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const processMemory = process.memoryUsage();
    const disk = getDiskUsage();
    return {
        timestamp: Date.now(),
        cpuPercent: getCpuPercent(),
        memoryPercent: round(clamp((usedMemory / totalMemory) * 100)),
        memoryUsedMb: round(usedMemory / (1024 * 1024)),
        memoryTotalMb: round(totalMemory / (1024 * 1024)),
        processCpuPercent: getProcessCpuPercent(),
        processRssMb: round(processMemory.rss / (1024 * 1024)),
        processHeapUsedMb: round(processMemory.heapUsed / (1024 * 1024)),
        processHeapTotalMb: round(processMemory.heapTotal / (1024 * 1024)),
        diskPercent: disk?.percent ?? null,
        diskUsedGb: disk?.usedGb ?? null,
        diskTotalGb: disk?.totalGb ?? null,
        hostUptimeSec: Math.floor(os.uptime()),
        processUptimeSec: Math.floor(process.uptime())
    };
}
//# sourceMappingURL=systemMetrics.js.map