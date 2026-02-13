export interface ModVersion {
    id: string;
    version: string;
    downloads: number;
    gameVersion: string;
    releaseDate: string;
    fileSize: number;
    fileName: string;
}
export interface ModProject {
    id: string;
    slug: string;
    title: string;
    description: string;
    shortDescription: string;
    classification: string;
    author: string;
    downloads: number;
    rating: number;
    iconUrl: string | null;
    versions: ModVersion[];
    latestVersion: ModVersion | null;
    createdAt: string;
    updatedAt: string;
    allowDistribution: boolean;
}
export interface SearchParams {
    query?: string;
    classification?: string;
    classId?: number;
    categoryId?: number;
    gameVersion?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
}
export interface SearchResult {
    success: boolean;
    projects: ModProject[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
    error?: string;
}
export interface ProjectResult {
    success: boolean;
    project?: ModProject;
    error?: string;
}
export interface Classification {
    id: string;
    name: string;
    classId: number;
}
export interface ClassificationsResult {
    success: boolean;
    classifications: Classification[];
    error?: string;
}
export interface DownloadResult {
    success: boolean;
    buffer?: Buffer;
    fileName?: string | null;
    error?: string;
}
export declare function isConfigured(): boolean;
export interface VerifyResult {
    configured: boolean;
    valid: boolean;
    error?: string;
}
export declare function verifyApiKey(): Promise<VerifyResult>;
export declare function searchProjects(params?: SearchParams): Promise<SearchResult>;
export declare function getProject(projectId: string): Promise<ProjectResult>;
export declare function getCategories(): Promise<ClassificationsResult>;
export declare function getModFiles(modId: string): Promise<{
    success: boolean;
    files: ModVersion[];
    error?: string;
}>;
export declare function downloadVersion(modId: string, fileId: string): Promise<DownloadResult>;
//# sourceMappingURL=curseforge.d.ts.map