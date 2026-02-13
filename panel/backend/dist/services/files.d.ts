export type FileIcon = 'folder' | 'java' | 'archive' | 'json' | 'yaml' | 'config' | 'text' | 'log' | 'image' | 'script' | 'data' | 'audio' | 'file';
export interface FileEntry {
    name: string;
    isDirectory: boolean;
    size: number | null;
    permissions: string;
    icon: FileIcon;
    editable: boolean;
}
export interface ListResult {
    success: boolean;
    files: FileEntry[];
    path: string;
    error?: string;
}
export interface OperationResult {
    success: boolean;
    error?: string;
}
export interface BackupResult extends OperationResult {
    backupPath?: string;
}
export interface ReadResult extends OperationResult {
    content?: string;
    path?: string;
    binary?: boolean;
}
export interface DownloadResult extends OperationResult {
    localPath?: string;
    fileName?: string;
}
export interface ServerFilesStatus {
    hasJar: boolean;
    hasAssets: boolean;
    ready: boolean;
}
export declare function isAllowedUpload(filename: string): boolean;
export declare function isEditable(filename: string): boolean;
export declare function getFileIcon(filename: string, isDirectory: boolean): FileIcon;
export declare function listDirectory(dirPath: string, serverId: string): Promise<ListResult>;
export declare function createDirectory(dirPath: string, serverId: string): Promise<OperationResult>;
export declare function deleteItem(itemPath: string, serverId: string): Promise<OperationResult>;
export declare function renameItem(oldPath: string, newPath: string, serverId: string): Promise<OperationResult>;
export declare function createBackup(filePath: string, serverId: string): Promise<BackupResult>;
export declare function readContent(filePath: string, serverId: string): Promise<ReadResult>;
export declare function writeContent(filePath: string, content: string, serverId: string): Promise<OperationResult>;
export declare function upload(targetDir: string, fileName: string, fileBuffer: Buffer, serverId: string): Promise<OperationResult & {
    fileName?: string;
}>;
export declare function download(filePath: string, serverId: string): Promise<DownloadResult>;
export declare function checkServerFiles(serverId: string): Promise<ServerFilesStatus>;
export declare function checkAuth(serverId: string): Promise<boolean>;
export declare function wipeData(serverId: string): Promise<OperationResult>;
export declare function copyItem(srcPath: string, destPath: string, serverId: string): Promise<OperationResult>;
//# sourceMappingURL=files.d.ts.map