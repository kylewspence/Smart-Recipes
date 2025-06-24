import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { body, validationResult, ValidationChain } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';
import { logger } from '../utils/logger';

// Security configuration
const SECURITY_CONFIG = {
    // Rate limiting
    rateLimits: {
        general: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
        auth: { windowMs: 15 * 60 * 1000, max: 5 },      // 5 login attempts per 15 minutes
        api: { windowMs: 15 * 60 * 1000, max: 200 },     // 200 API calls per 15 minutes
        upload: { windowMs: 60 * 60 * 1000, max: 10 },   // 10 uploads per hour
    },

    // Content Security Policy
    csp: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            scriptSrc: ["'self'", "'unsafe-eval'"], // Next.js requires unsafe-eval in dev
            connectSrc: ["'self'", "https://api.openai.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'", "blob:"],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: [],
        },
    },

    // Input validation patterns
    validation: {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        username: /^[a-zA-Z0-9_-]{3,20}$/,
        sqlInjection: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
        xss: /<script|javascript:|onload=|onerror=|onclick=/i,
        pathTraversal: /\.\.|\/etc\/|\/proc\/|\/sys\/|\/dev\/|\/tmp\//i,
    },
};

// Helmet configuration for security headers
export function configureHelmet() {
    return helmet({
        contentSecurityPolicy: {
            directives: SECURITY_CONFIG.csp.directives,
            reportOnly: process.env.NODE_ENV === 'development',
        },
        crossOriginEmbedderPolicy: false, // Disable for Next.js compatibility
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
        },
        noSniff: true,
        frameguard: { action: 'deny' },
        xssFilter: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        permittedCrossDomainPolicies: false,
        hidePoweredBy: true,
    });
}

// Rate limiting middleware
export function createRateLimit(type: keyof typeof SECURITY_CONFIG.rateLimits) {
    const config = SECURITY_CONFIG.rateLimits[type];

    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        message: {
            error: 'Too many requests, please try again later',
            retryAfter: Math.ceil(config.windowMs / 1000),
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            // Skip rate limiting for health checks
            return req.path === '/health' || req.path === '/api/health';
        },
        onLimitReached: (req, res, options) => {
            logger.warn('Rate limit exceeded', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                limit: config.max,
                window: config.windowMs,
            });
        },
    });
}

// Slow down middleware for additional protection
export function createSlowDown(type: keyof typeof SECURITY_CONFIG.rateLimits) {
    const config = SECURITY_CONFIG.rateLimits[type];

    return slowDown({
        windowMs: config.windowMs,
        delayAfter: Math.floor(config.max * 0.5), // Start slowing down at 50% of limit
        delayMs: (hits) => hits * 100, // Increase delay by 100ms per hit
        maxDelayMs: 5000, // Maximum delay of 5 seconds
        skipFailedRequests: true,
        skipSuccessfulRequests: false,
    });
}

// Input sanitization middleware
export function sanitizeInput(fields: string[] = []) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // Sanitize specified fields or all string fields
            const fieldsToSanitize = fields.length > 0 ? fields : Object.keys(req.body || {});

            fieldsToSanitize.forEach(field => {
                if (req.body && typeof req.body[field] === 'string') {
                    // Remove potential XSS vectors
                    req.body[field] = DOMPurify.sanitize(req.body[field], {
                        ALLOWED_TAGS: [],
                        ALLOWED_ATTR: [],
                        KEEP_CONTENT: true,
                    });

                    // Additional sanitization
                    req.body[field] = req.body[field]
                        .replace(/[<>]/g, '') // Remove angle brackets
                        .trim(); // Remove leading/trailing whitespace
                }
            });

            next();
        } catch (error) {
            logger.error('Input sanitization error:', error);
            res.status(500).json({ error: 'Input processing failed' });
        }
    };
}

// SQL injection detection
export function detectSQLInjection(req: Request, res: Response, next: NextFunction) {
    const checkForSQLInjection = (value: any): boolean => {
        if (typeof value === 'string') {
            return SECURITY_CONFIG.validation.sqlInjection.test(value);
        }
        if (typeof value === 'object' && value !== null) {
            return Object.values(value).some(checkForSQLInjection);
        }
        return false;
    };

    const suspicious =
        checkForSQLInjection(req.query) ||
        checkForSQLInjection(req.body) ||
        checkForSQLInjection(req.params);

    if (suspicious) {
        logger.warn('Potential SQL injection attempt detected', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            query: req.query,
            body: req.body,
            params: req.params,
        });

        return res.status(400).json({
            error: 'Invalid input detected',
            code: 'INVALID_INPUT',
        });
    }

    next();
}

// XSS detection
export function detectXSS(req: Request, res: Response, next: NextFunction) {
    const checkForXSS = (value: any): boolean => {
        if (typeof value === 'string') {
            return SECURITY_CONFIG.validation.xss.test(value);
        }
        if (typeof value === 'object' && value !== null) {
            return Object.values(value).some(checkForXSS);
        }
        return false;
    };

    const suspicious =
        checkForXSS(req.query) ||
        checkForXSS(req.body) ||
        checkForXSS(req.params);

    if (suspicious) {
        logger.warn('Potential XSS attempt detected', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            query: req.query,
            body: req.body,
            params: req.params,
        });

        return res.status(400).json({
            error: 'Invalid input detected',
            code: 'INVALID_INPUT',
        });
    }

    next();
}

// Path traversal detection
export function detectPathTraversal(req: Request, res: Response, next: NextFunction) {
    const checkForPathTraversal = (value: any): boolean => {
        if (typeof value === 'string') {
            return SECURITY_CONFIG.validation.pathTraversal.test(value);
        }
        if (typeof value === 'object' && value !== null) {
            return Object.values(value).some(checkForPathTraversal);
        }
        return false;
    };

    const suspicious =
        checkForPathTraversal(req.query) ||
        checkForPathTraversal(req.body) ||
        checkForPathTraversal(req.params) ||
        checkForPathTraversal(req.path);

    if (suspicious) {
        logger.warn('Potential path traversal attempt detected', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            query: req.query,
            body: req.body,
            params: req.params,
        });

        return res.status(400).json({
            error: 'Invalid path detected',
            code: 'INVALID_PATH',
        });
    }

    next();
}

// CSRF protection
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Skip CSRF for API endpoints with proper authentication
    if (req.path.startsWith('/api/') && req.headers.authorization) {
        return next();
    }

    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session?.csrfToken;

    if (!token || !sessionToken || token !== sessionToken) {
        logger.warn('CSRF token mismatch', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            hasToken: !!token,
            hasSessionToken: !!sessionToken,
        });

        return res.status(403).json({
            error: 'CSRF token validation failed',
            code: 'CSRF_ERROR',
        });
    }

    next();
}

// Request validation helpers
export function validateRequired(fields: string[]): ValidationChain[] {
    return fields.map(field =>
        body(field)
            .notEmpty()
            .withMessage(`${field} is required`)
            .trim()
    );
}

export function validateEmail(field: string = 'email'): ValidationChain {
    return body(field)
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail()
        .custom((value) => {
            if (!SECURITY_CONFIG.validation.email.test(value)) {
                throw new Error('Email format not allowed');
            }
            return true;
        });
}

export function validatePassword(field: string = 'password'): ValidationChain {
    return body(field)
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .custom((value) => {
            if (!SECURITY_CONFIG.validation.password.test(value)) {
                throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
            }
            return true;
        });
}

export function validateUsername(field: string = 'username'): ValidationChain {
    return body(field)
        .isLength({ min: 3, max: 20 })
        .withMessage('Username must be between 3 and 20 characters')
        .custom((value) => {
            if (!SECURITY_CONFIG.validation.username.test(value)) {
                throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
            }
            return true;
        });
}

// Validation result handler
export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        logger.warn('Validation errors', {
            ip: req.ip,
            path: req.path,
            errors: errors.array(),
        });

        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array(),
            code: 'VALIDATION_ERROR',
        });
    }

    next();
}

// Security audit logging
export function auditLog(action: string, details?: any) {
    return (req: Request, res: Response, next: NextFunction) => {
        const originalJson = res.json;

        res.json = function (data) {
            // Log successful security-relevant actions
            if (res.statusCode >= 200 && res.statusCode < 300) {
                logger.info('Security audit log', {
                    action,
                    userId: (req as any).user?.id,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    path: req.path,
                    method: req.method,
                    statusCode: res.statusCode,
                    timestamp: new Date().toISOString(),
                    details,
                });
            }

            return originalJson.call(this, data);
        };

        next();
    };
}

// IP whitelist/blacklist
const blacklistedIPs = new Set<string>();
const whitelistedIPs = new Set<string>();

export function ipFilter(req: Request, res: Response, next: NextFunction) {
    const clientIP = req.ip;

    // Check if IP is blacklisted
    if (blacklistedIPs.has(clientIP)) {
        logger.warn('Blocked request from blacklisted IP', {
            ip: clientIP,
            path: req.path,
            userAgent: req.get('User-Agent'),
        });

        return res.status(403).json({
            error: 'Access denied',
            code: 'IP_BLOCKED',
        });
    }

    // If whitelist is configured and IP is not whitelisted
    if (whitelistedIPs.size > 0 && !whitelistedIPs.has(clientIP)) {
        logger.warn('Blocked request from non-whitelisted IP', {
            ip: clientIP,
            path: req.path,
            userAgent: req.get('User-Agent'),
        });

        return res.status(403).json({
            error: 'Access denied',
            code: 'IP_NOT_WHITELISTED',
        });
    }

    next();
}

// Security utilities
export const securityUtils = {
    addToBlacklist: (ip: string) => blacklistedIPs.add(ip),
    removeFromBlacklist: (ip: string) => blacklistedIPs.delete(ip),
    addToWhitelist: (ip: string) => whitelistedIPs.add(ip),
    removeFromWhitelist: (ip: string) => whitelistedIPs.delete(ip),
    isBlacklisted: (ip: string) => blacklistedIPs.has(ip),
    isWhitelisted: (ip: string) => whitelistedIPs.has(ip),

    // Generate CSRF token
    generateCSRFToken: () => {
        return require('crypto').randomBytes(32).toString('hex');
    },

    // Validate input against patterns
    validateInput: (input: string, pattern: keyof typeof SECURITY_CONFIG.validation) => {
        return SECURITY_CONFIG.validation[pattern].test(input);
    },

    // Hash sensitive data
    hashSensitiveData: (data: string) => {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(data).digest('hex');
    },
};

// Combined security middleware stack
export function createSecurityStack() {
    return [
        configureHelmet(),
        ipFilter,
        createRateLimit('general'),
        createSlowDown('general'),
        detectSQLInjection,
        detectXSS,
        detectPathTraversal,
        sanitizeInput(),
    ];
}

// API-specific security stack
export function createAPISecurityStack() {
    return [
        createRateLimit('api'),
        createSlowDown('api'),
        detectSQLInjection,
        detectXSS,
        detectPathTraversal,
        sanitizeInput(),
    ];
}

// Auth-specific security stack
export function createAuthSecurityStack() {
    return [
        createRateLimit('auth'),
        createSlowDown('auth'),
        detectSQLInjection,
        detectXSS,
        sanitizeInput(['email', 'password', 'name']),
        auditLog('authentication_attempt'),
    ];
}

export { SECURITY_CONFIG }; 