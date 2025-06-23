import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

// CORS configuration for different environments
const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests from our frontend domains
        const allowedOrigins = [
            'http://localhost:3000', // Local development
            'http://localhost:3001', // Local API testing
            'https://smart-recipes.vercel.app', // Production frontend
            'https://smart-recipes-preview.vercel.app', // Preview deployments
            // Add more domains as needed
        ];

        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // In development, allow any localhost
        if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true, // Allow cookies for authentication
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
    ],
    exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset'
    ],
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Security headers configuration
const helmetOptions = {
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.openai.com"], // Allow OpenAI API calls
            frameSrc: ["'none'"],
            objectSrc: ["'none'"]
        }
    },

    // HTTP Strict Transport Security
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },

    // Prevent MIME type sniffing
    noSniff: true,

    // Prevent clickjacking
    frameguard: { action: 'deny' as const },

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // Prevent cross-domain sharing
    crossOriginEmbedderPolicy: false, // Disable if causing issues with external APIs

    // Referrer policy
    referrerPolicy: { policy: 'same-origin' as const }
};

// Security middleware function
export const securityMiddleware = [
    // Apply CORS
    cors(corsOptions),

    // Apply security headers
    helmet(helmetOptions),

    // Custom security middleware
    (req: Request, res: Response, next: NextFunction) => {
        // Add custom security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

        // Add API-specific headers
        res.setHeader('X-API-Version', '1.0');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');

        next();
    }
];

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    // Sanitize common dangerous characters
    const sanitizeValue = (value: any): any => {
        if (typeof value === 'string') {
            return value
                .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/javascript:/gi, '') // Remove javascript: URLs
                .replace(/on\w+\s*=/gi, '') // Remove event handlers
                .trim();
        }

        if (typeof value === 'object' && value !== null) {
            const sanitized: any = {};
            for (const key in value) {
                sanitized[key] = sanitizeValue(value[key]);
            }
            return sanitized;
        }

        return value;
    };

    // Sanitize request body
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
        req.query = sanitizeValue(req.query);
    }

    next();
};

// Rate limiting bypass for trusted sources (like health checks)
export const trustedSourceMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const trustedIPs = [
        '127.0.0.1',
        '::1',
        'localhost'
    ];

    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIP = forwarded ? forwarded.split(',')[0].trim() : req.ip || '';

    if (trustedIPs.includes(realIP)) {
        req.isTrustedSource = true;
    }

    next();
};

// Request size limiting middleware
export const requestSizeLimit = (limit: string = '10mb') => {
    return (req: Request, res: Response, next: NextFunction) => {
        const contentLength = req.headers['content-length'];

        if (contentLength) {
            const sizeInBytes = parseInt(contentLength);
            const limitInBytes = parseSize(limit);

            if (sizeInBytes > limitInBytes) {
                return res.status(413).json({
                    success: false,
                    error: 'Payload too large',
                    message: `Request size exceeds limit of ${limit}`,
                    maxSize: limit
                });
            }
        }

        next();
    };
};

// Helper function to parse size strings like "10mb"
const parseSize = (size: string): number => {
    const units: { [key: string]: number } = {
        b: 1,
        kb: 1024,
        mb: 1024 * 1024,
        gb: 1024 * 1024 * 1024
    };

    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)([a-z]*)$/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2] || 'b';

    return Math.floor(value * (units[unit] || 1));
};

// Security monitoring middleware
export const securityMonitoring = (req: Request, res: Response, next: NextFunction) => {
    // Log potentially suspicious activity
    const suspiciousPatterns = [
        /\.\.\//g, // Directory traversal
        /<script/gi, // Script injection
        /union.*select/gi, // SQL injection
        /drop.*table/gi, // SQL injection
        /javascript:/gi, // XSS
        /vbscript:/gi, // XSS
        /onload=/gi, // XSS
        /onerror=/gi // XSS
    ];

    const requestData = JSON.stringify({
        body: req.body,
        query: req.query,
        params: req.params
    });

    const suspiciousActivity = suspiciousPatterns.some(pattern =>
        pattern.test(requestData) || pattern.test(req.url)
    );

    if (suspiciousActivity) {
        console.warn('🚨 Suspicious activity detected:', {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            url: req.url,
            method: req.method,
            timestamp: new Date().toISOString()
        });

        // You could implement additional logging here (e.g., to a security service)
    }

    next();
};

// Export all security middleware
export {
    corsOptions,
    helmetOptions
};

// Combine all security middleware for easy application
export const allSecurityMiddleware = [
    trustedSourceMiddleware,
    ...securityMiddleware,
    sanitizeInput,
    securityMonitoring,
    requestSizeLimit('10mb')
];

// Declare module augmentation for custom properties
declare global {
    namespace Express {
        interface Request {
            isTrustedSource?: boolean;
        }
    }
} 