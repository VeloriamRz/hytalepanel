import type { Container } from 'dockerode';
export interface ContainerStatus {
    running: boolean;
    status: string;
    startedAt?: string;
    health?: string;
    error?: string;
}
export interface CommandResult {
    success: boolean;
    error?: string;
}
export declare function getContainer(containerName?: string): Promise<Container | null>;
export declare function getStatus(containerName?: string): Promise<ContainerStatus>;
export declare function execCommand(cmd: string, timeout?: number, containerName?: string): Promise<string>;
export declare function sendCommand(cmd: string, containerName?: string): Promise<CommandResult>;
export declare function restart(containerName?: string): Promise<CommandResult>;
export declare function stop(containerName?: string): Promise<CommandResult>;
export declare function kill(containerName?: string): Promise<CommandResult>;
export declare function start(containerName?: string): Promise<CommandResult>;
export declare function getLogs(options?: {
    tail?: number;
    containerName?: string;
}): Promise<NodeJS.ReadableStream>;
export declare function getLogsHistory(tail?: number, containerName?: string): Promise<string[]>;
export declare function getArchive(filePath: string, containerName?: string): Promise<NodeJS.ReadableStream>;
export declare function putArchive(stream: NodeJS.ReadableStream, options: {
    path: string;
}, containerName?: string): Promise<void>;
export declare function removeContainer(containerName: string, removeVolumes?: boolean): Promise<CommandResult>;
export declare function listContainers(): Promise<Array<{
    name: string;
    status: string;
    running: boolean;
}>>;
//# sourceMappingURL=docker.d.ts.map