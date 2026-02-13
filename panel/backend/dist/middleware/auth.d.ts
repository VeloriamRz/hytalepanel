import type { NextFunction, Request, Response } from 'express';
import type { Socket } from 'socket.io';
export interface JwtPayload {
    username: string;
    iat: number;
}
export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}
export interface AuthenticatedSocket extends Socket {
    user?: JwtPayload;
}
export declare function verifyToken(token: string): JwtPayload | null;
export declare function getToken(req: Request): string | null;
export declare function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
export declare function socketAuth(socket: AuthenticatedSocket, next: (err?: Error) => void): void;
export declare function generateToken(username: string): string;
//# sourceMappingURL=auth.d.ts.map