export interface InstalledMod {
    id: string;
    providerId: string;
    projectId: string | null;
    projectSlug?: string | null;
    projectTitle: string;
    projectIconUrl: string | null;
    versionId: string | null;
    versionName: string;
    classification: string;
    fileName: string;
    fileSize: number;
    enabled: boolean;
    installedAt: string;
    updatedAt: string;
    isLocal?: boolean;
    fileExists?: boolean;
}
export interface ModsData {
    version: number;
    apiKey: string | null;
    mods: InstalledMod[];
}
export interface ModMetadata {
    providerId?: string;
    projectId?: string;
    projectSlug?: string | null;
    projectTitle: string;
    projectIconUrl?: string | null;
    versionId?: string;
    versionName: string;
    classification?: string;
    fileName?: string;
}
export interface OperationResult {
    success: boolean;
    error?: string;
}
export interface ModResult extends OperationResult {
    mod?: InstalledMod | null;
}
export interface ModsListResult extends OperationResult {
    mods: InstalledMod[];
}
export declare function listInstalledMods(containerName?: string): Promise<ModsListResult>;
export declare function installMod(fileBuffer: Buffer, metadata: ModMetadata, containerName?: string): Promise<ModResult>;
export declare function uninstallMod(modId: string, containerName?: string): Promise<OperationResult>;
export declare function enableMod(modId: string, containerName?: string): Promise<ModResult>;
export declare function disableMod(modId: string, containerName?: string): Promise<ModResult>;
export declare function getMod(modId: string, containerName?: string): Promise<ModResult>;
export declare function updateMod(modId: string, updates: Partial<InstalledMod>, containerName?: string): Promise<ModResult>;
//# sourceMappingURL=mods.d.ts.map