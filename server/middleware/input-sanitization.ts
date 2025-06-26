import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import {
    safeStringSchema,
    safeTextSchema,
    safeIdSchema,
    safeSearchSchema,
    safeEmailSchema,
    safeUrlSchema,
    securityAuditSchema
} from '../schemas/securitySchemas';
import { pool as db } from '../db/db';

// Extend Express Request interface for file uploads
declare global {
    namespace Express {
        interface Request {
            file?: {
                originalname: string;
                mimetype: string;
                size: number;
            };
            files?: any;
        }
    }
}

// Security audit logging
const logSecurityEvent = async (req: Request, severity: 'low' | 'medium' | 'high' | 'critical', action: string, details?: any) => {
    try {
        const auditEntry = {
            userId: req.user?.userId,
            action,
            resource: req.path,
            ip: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            severity,
            details
        };

        // Validate audit entry
        const validatedEntry = securityAuditSchema.parse(auditEntry);

        // Log to console (in production, this would go to a security monitoring system)
        console.log('🔒 Security Event:', JSON.stringify(validatedEntry, null, 2));

        // TODO: In production, send to security monitoring service (e.g., Sentry, DataDog)
    } catch (error) {
        console.error('Failed to log security event:', error);
    }
};

// XSS Protection Middleware
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
    try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }

        // Sanitize query parameters
        if (req.query) {
            req.query = sanitizeObject(req.query);
        }

        // Sanitize URL parameters
        if (req.params) {
            req.params = sanitizeObject(req.params);
        }

        next();
    } catch (error) {
        logSecurityEvent(req, 'high', 'XSS_PROTECTION_ERROR', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(400).json({
            success: false,
            message: 'Request contains invalid or potentially dangerous content',
            error: 'INPUT_SANITIZATION_FAILED'
        });
    }
};

// Recursive object sanitization
const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }

    if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[sanitizeString(key)] = sanitizeObject(value);
        }
        return sanitized;
    }

    return obj;
};

// String sanitization function
const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;

    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/data:text\/html/gi, '')
        .replace(/vbscript:/gi, '')
        .trim();
};

// SQL Injection Protection Middleware
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
    try {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
            /[';\"]/,
            /--/,
            /\/\*/,
            /\*\//,
            /xp_/i,
            /sp_/i
        ];

        const checkForSqlInjection = (value: any): boolean => {
            if (typeof value === 'string') {
                return sqlPatterns.some(pattern => pattern.test(value));
            }
            if (Array.isArray(value)) {
                return value.some(checkForSqlInjection);
            }
            if (value && typeof value === 'object') {
                return Object.values(value).some(checkForSqlInjection);
            }
            return false;
        };

        const requestData = { ...req.body, ...req.query, ...req.params };

        if (checkForSqlInjection(requestData)) {
            logSecurityEvent(req, 'critical', 'SQL_INJECTION_ATTEMPT', {
                body: req.body,
                query: req.query,
                params: req.params
            });

            return res.status(400).json({
                success: false,
                message: 'Request contains potentially dangerous SQL patterns',
                error: 'SQL_INJECTION_DETECTED'
            });
        }

        next();
    } catch (error: any) {
        logSecurityEvent(req, 'high', 'SQL_INJECTION_CHECK_ERROR', { error: error.message });
        next(error);
    }
};

// Path Traversal Protection Middleware
export const pathTraversalProtection = (req: Request, res: Response, next: NextFunction) => {
    try {
        const pathTraversalPatterns = [
            /\.\./,
            /\/\.\./,
            /\\\.\./,
            /%2e%2e/i,
            /%252e%252e/i,
            /\.%2f/i,
            /\.%5c/i
        ];

        const checkForPathTraversal = (value: any): boolean => {
            if (typeof value === 'string') {
                return pathTraversalPatterns.some(pattern => pattern.test(value));
            }
            if (Array.isArray(value)) {
                return value.some(checkForPathTraversal);
            }
            if (value && typeof value === 'object') {
                return Object.values(value).some(checkForPathTraversal);
            }
            return false;
        };

        const requestData = { ...req.body, ...req.query, ...req.params };

        if (checkForPathTraversal(requestData)) {
            logSecurityEvent(req, 'critical', 'PATH_TRAVERSAL_ATTEMPT', {
                body: req.body,
                query: req.query,
                params: req.params
            });

            return res.status(400).json({
                success: false,
                message: 'Request contains path traversal patterns',
                error: 'PATH_TRAVERSAL_DETECTED'
            });
        }

        next();
    } catch (error: any) {
        logSecurityEvent(req, 'high', 'PATH_TRAVERSAL_CHECK_ERROR', { error: error.message });
        next(error);
    }
};

// Command Injection Protection Middleware
export const commandInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
    try {
        const commandPatterns = [
            /[;&|`$(){}[\]]/,
            /\|\|/,
            /&&/,
            />/,
            /</,
            /\$/,
            /`/,
            /\|/
        ];

        const checkForCommandInjection = (value: any): boolean => {
            if (typeof value === 'string') {
                return commandPatterns.some(pattern => pattern.test(value));
            }
            if (Array.isArray(value)) {
                return value.some(checkForCommandInjection);
            }
            if (value && typeof value === 'object') {
                return Object.values(value).some(checkForCommandInjection);
            }
            return false;
        };

        const requestData = { ...req.body, ...req.query, ...req.params };

        if (checkForCommandInjection(requestData)) {
            logSecurityEvent(req, 'critical', 'COMMAND_INJECTION_ATTEMPT', {
                body: req.body,
                query: req.query,
                params: req.params
            });

            return res.status(400).json({
                success: false,
                message: 'Request contains command injection patterns',
                error: 'COMMAND_INJECTION_DETECTED'
            });
        }

        next();
    } catch (error: any) {
        logSecurityEvent(req, 'high', 'COMMAND_INJECTION_CHECK_ERROR', { error: error.message });
        next(error);
    }
};

// Request size validation middleware
export const requestSizeValidation = (maxSize: number = 1024 * 1024) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const contentLength = parseInt(req.get('content-length') || '0', 10);

        if (contentLength > maxSize) {
            logSecurityEvent(req, 'medium', 'REQUEST_SIZE_EXCEEDED', {
                contentLength,
                maxSize
            });

            return res.status(413).json({
                success: false,
                message: 'Request entity too large',
                error: 'REQUEST_TOO_LARGE'
            });
        }

        next();
    };
};

// File upload security middleware
export const fileUploadSecurity = (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.file || req.files) {
            const files = req.files ? (Array.isArray(req.files) ? req.files : [req.files]) : [req.file];

            for (const file of files) {
                if (!file) continue;

                // Check file type
                const allowedMimeTypes = [
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                    'text/plain',
                    'application/json'
                ];

                if (!allowedMimeTypes.includes(file.mimetype)) {
                    logSecurityEvent(req, 'medium', 'INVALID_FILE_TYPE', {
                        filename: file.originalname,
                        mimetype: file.mimetype
                    });

                    return res.status(400).json({
                        success: false,
                        message: 'File type not allowed',
                        error: 'INVALID_FILE_TYPE'
                    });
                }

                // Check file size (5MB max)
                if (file.size > 5 * 1024 * 1024) {
                    logSecurityEvent(req, 'medium', 'FILE_SIZE_EXCEEDED', {
                        filename: file.originalname,
                        size: file.size
                    });

                    return res.status(400).json({
                        success: false,
                        message: 'File size too large (max 5MB)',
                        error: 'FILE_TOO_LARGE'
                    });
                }

                // Sanitize filename
                if (file.originalname) {
                    file.originalname = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '');
                }
            }
        }

        next();
    } catch (error: any) {
        logSecurityEvent(req, 'high', 'FILE_UPLOAD_SECURITY_ERROR', { error: error.message });
        next(error);
    }
};

// Comprehensive input validation middleware using Zod schemas
export const validateInput = (schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req[source];
            const validatedData = await schema.parseAsync(data);
            req[source] = validatedData;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                logSecurityEvent(req, 'medium', 'INPUT_VALIDATION_FAILED', {
                    source,
                    errors: error.errors
                });

                return res.status(400).json({
                    success: false,
                    message: 'Input validation failed',
                    errors: error.errors.map(err => ({
                        path: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            next(error);
        }
    };
};

// Combined security middleware
export const comprehensiveSecurityValidation = [
    xssProtection,
    sqlInjectionProtection,
    pathTraversalProtection,
    commandInjectionProtection,
    requestSizeValidation(),
    fileUploadSecurity
];

// Export individual middleware for selective use
export {
    logSecurityEvent,
    sanitizeObject,
    sanitizeString
}; 