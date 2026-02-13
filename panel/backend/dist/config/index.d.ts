export interface Config {
    timezone: string;
    container: {
        name: string;
    };
    server: {
        port: number;
        basePath: string;
    };
    docker: {
        socketPath: string;
    };
    auth: {
        username: string;
        password: string;
        jwtSecret: string;
        tokenExpiry: string;
        disabled: boolean;
    };
    files: {
        basePath: string;
        maxUploadSize: number;
        editableExtensions: string[];
        uploadAllowedExtensions: string[];
    };
    mods: {
        basePath: string;
        metadataFile: string;
        maxModSize: number;
    };
    modtale: {
        apiKey: string | null;
    };
    curseforge: {
        apiKey: string | null;
    };
    data: {
        path: string;
        hostPath: string;
    };
}
declare const config: Config;
export default config;
//# sourceMappingURL=index.d.ts.map