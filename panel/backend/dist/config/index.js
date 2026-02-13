import crypto from 'node:crypto';
const defaultSecret = crypto.randomBytes(32).toString('hex');
const config = {
    timezone: process.env.TZ || 'UTC',
    container: {
        name: process.env.CONTAINER_NAME || 'hytale-server'
    },
    server: {
        port: Number.parseInt(process.env.PANEL_PORT || '3000', 10),
        basePath: (process.env.BASE_PATH || '').replace(/\/+$/, '') // Remove trailing slashes
    },
    docker: {
        socketPath: '/var/run/docker.sock'
    },
    auth: {
        username: process.env.PANEL_USER || 'admin',
        password: process.env.PANEL_PASS || 'admin',
        jwtSecret: process.env.JWT_SECRET || defaultSecret,
        tokenExpiry: '24h',
        disabled: process.env.DISABLE_AUTH === 'true'
    },
    files: {
        basePath: '/opt/hytale',
        maxUploadSize: 500 * 1024 * 1024,
        editableExtensions: [
            '.json',
            '.yaml',
            '.yml',
            '.properties',
            '.txt',
            '.cfg',
            '.conf',
            '.xml',
            '.toml',
            '.ini',
            '.lua',
            '.js',
            '.sh',
            '.bat',
            '.md',
            '.log'
        ],
        uploadAllowedExtensions: [
            '.jar',
            '.zip',
            '.tar',
            '.gz',
            '.7z',
            '.rar',
            '.json',
            '.yaml',
            '.yml',
            '.properties',
            '.txt',
            '.cfg',
            '.conf',
            '.xml',
            '.toml',
            '.ini',
            '.lua',
            '.js',
            '.sh',
            '.bat',
            '.dat',
            '.nbt',
            '.mca',
            '.mcr',
            '.db',
            '.ldb',
            '.png',
            '.jpg',
            '.jpeg',
            '.gif',
            '.webp',
            '.ogg',
            '.mp3',
            '.wav',
            '.md',
            '.log',
            '.csv'
        ]
    },
    mods: {
        basePath: '/opt/hytale/mods',
        metadataFile: '/opt/hytale/mods.json',
        maxModSize: 50 * 1024 * 1024
    },
    modtale: {
        apiKey: process.env.MODTALE_API_KEY || null
    },
    curseforge: {
        apiKey: process.env.CURSEFORGE_API_KEY || null
    },
    data: {
        path: '/opt/hytale-panel/data', // Fixed internal path
        hostPath: process.env.HOST_DATA_PATH || './data' // Host path for server volumes
    }
};
export default config;
//# sourceMappingURL=index.js.map