import jwt from 'jsonwebtoken';
import config from '../config/index.js';
const ANONYMOUS_USER = { username: 'anonymous', iat: Date.now() };
export function verifyToken(token) {
    try {
        return jwt.verify(token, config.auth.jwtSecret);
    }
    catch {
        return null;
    }
}
function verifyBasicAuth(authHeader) {
    if (!authHeader.startsWith('Basic '))
        return null;
    try {
        const base64 = authHeader.slice(6);
        const decoded = Buffer.from(base64, 'base64').toString('utf-8');
        const colonIndex = decoded.indexOf(':');
        if (colonIndex === -1)
            return null;
        const username = decoded.slice(0, colonIndex);
        const password = decoded.slice(colonIndex + 1);
        if (username === config.auth.username && password === config.auth.password) {
            return { username, iat: Date.now() };
        }
    }
    catch {
        // Invalid base64
    }
    return null;
}
export function getToken(req) {
    if (req.cookies?.token) {
        return req.cookies.token;
    }
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    return null;
}
export function requireAuth(req, res, next) {
    // Auth disabled - allow all requests
    if (config.auth.disabled) {
        req.user = ANONYMOUS_USER;
        next();
        return;
    }
    // Try Basic Auth first (for SSO/reverse proxy)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Basic ')) {
        const user = verifyBasicAuth(authHeader);
        if (user) {
            req.user = user;
            next();
            return;
        }
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }
    // Try JWT token
    const token = getToken(req);
    if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    const decoded = verifyToken(token);
    if (!decoded) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    req.user = decoded;
    next();
}
export function socketAuth(socket, next) {
    // Auth disabled - allow all connections
    if (config.auth.disabled) {
        socket.user = ANONYMOUS_USER;
        next();
        return;
    }
    // Try Basic Auth from headers (SSO/reverse proxy)
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader?.startsWith('Basic ')) {
        const user = verifyBasicAuth(authHeader);
        if (user) {
            socket.user = user;
            next();
            return;
        }
        next(new Error('Invalid credentials'));
        return;
    }
    // Try JWT token
    let token = socket.handshake.auth?.token;
    if (!token) {
        const cookies = socket.handshake.headers.cookie;
        if (cookies) {
            const match = cookies.match(/token=([^;]+)/);
            if (match)
                token = match[1];
        }
    }
    if (!token) {
        next(new Error('Authentication required'));
        return;
    }
    const decoded = verifyToken(token);
    if (!decoded) {
        next(new Error('Invalid or expired token'));
        return;
    }
    socket.user = decoded;
    next();
}
export function generateToken(username) {
    return jwt.sign({ username, iat: Date.now() }, config.auth.jwtSecret, {
        expiresIn: config.auth.tokenExpiry
    });
}
//# sourceMappingURL=auth.js.map