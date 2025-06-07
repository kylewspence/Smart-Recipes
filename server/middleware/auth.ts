import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../lib/auth';
import { ClientError } from '../lib/client-error';

/**
 * Authentication middleware that verifies JWT tokens in the Authorization header
 * and attaches the user information to the request object.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader);

        if (!token) {
            throw new ClientError(401, 'Authentication required');
        }

        const decoded = verifyToken(token);

        if (!decoded) {
            throw new ClientError(401, 'Invalid or expired token');
        }

        // Attach user data to request object
        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof ClientError) {
            next(error);
        } else {
            next(new ClientError(401, 'Authentication failed'));
        }
    }
};

/**
 * Optional authentication middleware that attaches user data if token is valid,
 * but does not require authentication to proceed.
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader);

        if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
                req.user = decoded;
            }
        }

        next();
    } catch (error) {
        // Even if auth fails, we continue
        next();
    }
}; 