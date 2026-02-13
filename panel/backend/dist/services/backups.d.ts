export interface BackupConfig {
    enabled: boolean;
    intervalMinutes: number;
    maxBackups: number;
    maxAgeDays: number;
    onServerStart: boolean;
}
export declare const DEFAULT_BACKUP_CONFIG: BackupConfig;
export interface BackupInfo {
    id: string;
    filename: string;
    createdAt: string;
    size: number;
}
export interface BackupResult {
    success: boolean;
    backup?: BackupInfo;
    error?: string;
}
export interface BackupListResult {
    success: boolean;
    backups: BackupInfo[];
    error?: string;
}
export interface OperationResult {
    success: boolean;
    error?: string;
}
export declare function createBackup(serverId: string): Promise<BackupResult>;
export declare function listBackups(serverId: string): Promise<BackupListResult>;
export declare function restoreBackup(serverId: string, backupId: string): Promise<OperationResult>;
export declare function deleteBackup(serverId: string, backupId: string): Promise<OperationResult>;
export declare function cleanupOldBackups(serverId: string, backupConfig: BackupConfig): Promise<void>;
export declare function startBackupScheduler(serverId: string, backupConfig: BackupConfig): void;
export declare function stopBackupScheduler(serverId: string): void;
export declare function stopAllSchedulers(): void;
//# sourceMappingURL=backups.d.ts.map