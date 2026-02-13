import type { Socket } from 'socket.io';
export interface UpdateMetadata {
    lastDownloadAt: string | null;
    jarSize: number | null;
    jarHash: string | null;
    assetsSize: number | null;
}
export interface UpdateCheckResult {
    success: boolean;
    lastUpdate: string | null;
    daysSinceUpdate: number | null;
    hasFiles: boolean;
    error?: string;
}
export interface UpdateApplyResult {
    success: boolean;
    error?: string;
}
export declare function checkForUpdate(serverId: string, containerName?: string): Promise<UpdateCheckResult>;
export declare function applyUpdate(socket: Socket, containerName?: string, serverId?: string): Promise<UpdateApplyResult>;
export declare function recordDownload(containerName?: string): Promise<void>;
//# sourceMappingURL=updater.d.ts.map