import type { Socket } from 'socket.io';
export interface DownloadStatus {
    status: 'starting' | 'auth-required' | 'output' | 'error' | 'extracting' | 'complete' | 'done';
    message: string;
    serverId?: string;
}
export declare function downloadServerFiles(socket: Socket, containerName?: string, serverId?: string): Promise<void>;
//# sourceMappingURL=downloader.d.ts.map