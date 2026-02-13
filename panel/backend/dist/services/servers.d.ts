import { type BackupConfig } from './backups.js';
export interface ServerConfig {
    javaXms: string;
    javaXmx: string;
    bindAddr: string;
    autoDownload: boolean;
    useG1gc: boolean;
    extraArgs: string;
    useMachineId: boolean;
    backup: BackupConfig;
}
export interface Server {
    id: string;
    name: string;
    port: number;
    containerName: string;
    config: ServerConfig;
    createdAt: string;
}
export interface ServersData {
    version: number;
    servers: Server[];
}
export interface OperationResult {
    success: boolean;
    error?: string;
}
export interface ServerResult extends OperationResult {
    server?: Server;
}
export interface ServersListResult extends OperationResult {
    servers: Server[];
}
export declare function listServers(): Promise<ServersListResult>;
export declare function getServer(id: string): Promise<ServerResult>;
export interface CreateServerParams {
    name: string;
    port?: number;
    config?: Partial<ServerConfig>;
}
export declare function createServer(params: CreateServerParams): Promise<ServerResult>;
export declare function updateServer(id: string, updates: Partial<CreateServerParams>): Promise<ServerResult>;
export declare function deleteServer(id: string, removeData?: boolean): Promise<OperationResult>;
export declare function startServer(id: string): Promise<OperationResult>;
export declare function stopServer(id: string): Promise<OperationResult>;
export declare function restartServer(id: string): Promise<OperationResult>;
export declare function getServerDataPath(id: string): string;
export declare function getServerModsPath(id: string): string;
export interface ComposeResult extends OperationResult {
    content?: string;
}
export declare function getServerCompose(id: string): Promise<ComposeResult>;
export declare function saveServerCompose(id: string, content: string): Promise<OperationResult>;
export declare function regenerateServerCompose(id: string): Promise<ComposeResult>;
//# sourceMappingURL=servers.d.ts.map