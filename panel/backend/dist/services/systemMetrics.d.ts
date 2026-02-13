export interface SystemMetrics {
    timestamp: number;
    cpuPercent: number;
    memoryPercent: number;
    memoryUsedMb: number;
    memoryTotalMb: number;
    processCpuPercent: number;
    processRssMb: number;
    processHeapUsedMb: number;
    processHeapTotalMb: number;
    diskPercent: number | null;
    diskUsedGb: number | null;
    diskTotalGb: number | null;
    hostUptimeSec: number;
    processUptimeSec: number;
}
export declare function getSystemMetrics(): SystemMetrics;
//# sourceMappingURL=systemMetrics.d.ts.map