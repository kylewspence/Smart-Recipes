import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../lib/auth';
import { ClientError } from '../lib/client-error';
import db from '../db/db';

// User roles enum
export enum UserRole {
    USER = 'user',
    MODERATOR = 'moderator',
    ADMIN = 'admin'
}

// Permission levels
export enum Permission {
    READ = 'read',
    WRITE = 'write',
    DELETE = 'delete',
    ADMIN = 'admin'
}

// Role permissions mapping
const rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.USER]: [Permission.READ, Permission.WRITE],
    [UserRole.MODERATOR]: [Permission.READ, Permission.WRITE, Permission.DELETE],
    [UserRole.ADMIN]: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN]
};

/**
 * Enhanced authentication middleware that verifies JWT tokens and attaches user information
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

        // Log authentication for security monitoring
        console.log(`🔐 User authenticated: ${decoded.userId} (${decoded.email})`);

        next();
    } catch (error) {
        console.warn('🚨 Authentication failed:', {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            url: req.url,
            error: error instanceof Error ? error.message : 'Unknown error'
        });

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
                console.log(`🔐 Optional auth successful: ${decoded.userId}`);
            }
        }

        next();
    } catch (error) {
        // Even if auth fails, we continue for optional auth
        console.log('ℹ️ Optional authentication failed, continuing without auth');
        next();
    }
};

/**
 * Role-based access control middleware factory
 */
export const requireRole = (requiredRole: UserRole) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            if (!req.user) {
                throw new ClientError(401, 'Authentication required');
            }

            const userRole = req.user.role as UserRole || UserRole.USER;

            // Check if user has required role or higher
            const hasAccess = hasRoleAccess(userRole, requiredRole);

            if (!hasAccess) {
                throw new ClientError(403, `Access denied. Required role: ${requiredRole}`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Permission-based access control middleware factory
 */
export const requirePermission = (requiredPermission: Permission) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            if (!req.user) {
                throw new ClientError(401, 'Authentication required');
            }

            const userRole = req.user.role as UserRole || UserRole.USER;
            const userPermissions = rolePermissions[userRole] || [];

            if (!userPermissions.includes(requiredPermission)) {
                throw new ClientError(403, `Access denied. Required permission: ${requiredPermission}`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Resource ownership middleware - ensures user can only access their own resources
 */
export const requireOwnership = (resourceType: 'recipe' | 'preferences' | 'profile') => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                throw new ClientError(401, 'Authentication required');
            }

            const userId = req.user.userId;
            const resourceId = req.params.id || req.params.userId || req.params.recipeId;

            // For different resource types, check ownership
            switch (resourceType) {
                case 'recipe':
                    const recipeCheck = await db.query(
                        'SELECT "userId" FROM recipes WHERE id = $1',
                        [resourceId]
                    );

                    if (recipeCheck.rows.length === 0) {
                        throw new ClientError(404, 'Recipe not found');
                    }

                    if (recipeCheck.rows[0].userId !== userId) {
                        // Check if user is admin or if recipe is public
                        const userRole = req.user.role as UserRole;
                        const isPublic = await db.query(
                            'SELECT "isPublic" FROM recipes WHERE id = $1',
                            [resourceId]
                        );

                        if (userRole !== UserRole.ADMIN && !isPublic.rows[0]?.isPublic) {
                            throw new ClientError(403, 'Access denied. You can only access your own recipes');
                        }
                    }
                    break;

                case 'preferences':
                case 'profile':
                    // For preferences and profile, the resourceId should match the authenticated user
                    if (resourceId && resourceId !== userId.toString()) {
                        const userRole = req.user.role as UserRole;
                        if (userRole !== UserRole.ADMIN) {
                            throw new ClientError(403, 'Access denied. You can only access your own data');
                        }
                    }
                    break;

                default:
                    throw new ClientError(400, 'Invalid resource type');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Admin-only access middleware
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Moderator or higher access middleware
 */
export const requireModerator = requireRole(UserRole.MODERATOR);

/**
 * Rate limiting bypass for authenticated users
 */
export const authRateLimitBypass = (req: Request, res: Response, next: NextFunction): void => {
    // Authenticated users get higher rate limits
    if (req.user) {
        req.isAuthenticated = true;
    }
    next();
};

/**
 * Session validation middleware - ensures user account is still active
 */
export const validateSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            return next();
        }

        // Check if user account is still active
        const userCheck = await db.query(
            'SELECT id, "isActive", "lastActiveAt" FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (userCheck.rows.length === 0) {
            throw new ClientError(401, 'User account not found');
        }

        const user = userCheck.rows[0];

        if (!user.isActive) {
            throw new ClientError(401, 'User account is deactivated');
        }

        // Update last active timestamp
        await db.query(
            'UPDATE users SET "lastActiveAt" = NOW() WHERE id = $1',
            [req.user.userId]
        );

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Security headers for authenticated requests
 */
export const addAuthSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
    if (req.user) {
        // Add additional security headers for authenticated users
        res.setHeader('X-User-ID', req.user.userId);
        res.setHeader('X-Auth-Type', 'Bearer');
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    }
    next();
};

// Helper functions
function hasRoleAccess(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy = {
        [UserRole.USER]: 0,
        [UserRole.MODERATOR]: 1,
        [UserRole.ADMIN]: 2
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Declare module augmentation for custom properties
declare global {
    namespace Express {
        interface Request {
            isAuthenticated?: boolean;
        }
    }
}

// Export types and utilities
export { UserRole, Permission, rolePermissions }; 