import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Generate CSP nonce for inline scripts
export const generateNonce = (): string => {
    return crypto.randomBytes(16).toString('base64');
};

// Enhanced CORS configuration
const enhancedCorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://smart-recipes.vercel.app',
            'https://smart-recipes-preview.vercel.app',
            process.env.FRONTEND_URL // Dynamic frontend URL
        ].filter(Boolean);

        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
        'X-CSRF-Token',
        'X-API-Key'
    ],
    exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Request-ID'
    ],
    optionsSuccessStatus: 200
};

// Enhanced helmet configuration with CSP nonces
const createEnhancedHelmetOptions = (nonce?: string) => ({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: [
                "'self'",
                "'unsafe-inline'", // Required for Tailwind CSS
                "https://fonts.googleapis.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "https:",
                "blob:",
                "*.vercel.app"
            ],
            scriptSrc: [
                "'self'",
                ...(nonce ? [`'nonce-${nonce}'`] : ["'unsafe-eval'"]),
                "https://vercel.live"
            ],
            connectSrc: [
                "'self'",
                "https://api.openai.com",
                "https://vitals.vercel-insights.com",
                "wss:"
            ],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'", "blob:"],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["'self'"],
            formAction: ["'self'"]
        },
        reportOnly: process.env.NODE_ENV === 'development'
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' as const },
    hidePoweredBy: true,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const }
});

// HTTPS enforcement middleware
export const httpsEnforcement = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'development') {
        return next();
    }

    const isSecure = req.secure ||
        req.headers['x-forwarded-proto'] === 'https' ||
        req.headers['x-forwarded-ssl'] === 'on';

    if (!isSecure) {
        const httpsUrl = `https://${req.headers.host}${req.url}`;
        return res.redirect(301, httpsUrl);
    }

    next();
};

// Request ID middleware for tracing
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
};

// Enhanced security headers middleware
export const enhancedSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Generate nonce for CSP
    const nonce = generateNonce();
    req.nonce = nonce;

    // Apply helmet with enhanced configuration
    helmet(createEnhancedHelmetOptions(nonce))(req, res, () => {
        // Additional modern security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('X-DNS-Prefetch-Control', 'off');
        res.setHeader('X-Download-Options', 'noopen');
        res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

        // Cross-Origin headers for modern browsers
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

        // API-specific headers
        res.setHeader('X-API-Version', '1.0');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');

        // Cache control for security
        if (req.path.startsWith('/api/')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }

        next();
    });
};

// Enhanced input sanitization
export const enhancedInputSanitization = (req: Request, res: Response, next: NextFunction) => {
    const dangerousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /<object[^>]*>.*?<\/object>/gi,
        /<embed[^>]*>/gi,
        /<link[^>]*>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /data:text\/html/gi,
        /on\w+\s*=/gi,
        /expression\s*\(/gi,
        /import\s+/gi,
        /eval\s*\(/gi,
        /Function\s*\(/gi
    ];

    const sanitizeValue = (value: any): any => {
        if (typeof value === 'string') {
            let sanitized = value;

            dangerousPatterns.forEach(pattern => {
                sanitized = sanitized.replace(pattern, '');
            });

            return sanitized
                .replace(/[\x00-\x1F\x7F]/g, '')
                .trim();
        }

        if (Array.isArray(value)) {
            return value.map(sanitizeValue);
        }

        if (typeof value === 'object' && value !== null) {
            const sanitized: any = {};
            for (const key in value) {
                if (value.hasOwnProperty(key)) {
                    sanitized[key] = sanitizeValue(value[key]);
                }
            }
            return sanitized;
        }

        return value;
    };

    if (req.body) req.body = sanitizeValue(req.body);
    if (req.query) req.query = sanitizeValue(req.query);
    if (req.params) req.params = sanitizeValue(req.params);

    next();
};

// Enhanced security monitoring
export const enhancedSecurityMonitoring = (req: Request, res: Response, next: NextFunction) => {
    const suspiciousPatterns = [
        /\.\.\//g, // Directory traversal
        /<script/gi, // Script injection
        /union.*select/gi, // SQL injection
        /drop.*table/gi, // SQL injection
        /delete.*from/gi, // SQL injection
        /insert.*into/gi, // SQL injection
        /update.*set/gi, // SQL injection
        /javascript:/gi, // XSS
        /vbscript:/gi, // XSS
        /onload=/gi, // XSS
        /onerror=/gi, // XSS
        /eval\(/gi, // Code injection
        /exec\(/gi, // Code injection
        /system\(/gi, // Command injection
        /proc\/self\/environ/gi, // File inclusion
        /etc\/passwd/gi, // File inclusion
        /cmd\.exe/gi, // Command injection
        /powershell/gi, // Command injection
        /base64_decode/gi, // Encoding attacks
        /php:\/\//gi, // PHP stream wrappers
        /file:\/\//gi, // File protocol
        /ftp:\/\//gi, // FTP protocol
        /ldap:\/\//gi, // LDAP injection
        /gopher:\/\//gi // Gopher protocol
    ];

    const requestData = JSON.stringify({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: {
            'user-agent': req.headers['user-agent'],
            'referer': req.headers['referer'],
            'x-forwarded-for': req.headers['x-forwarded-for']
        }
    });

    const suspiciousActivity = suspiciousPatterns.some(pattern =>
        pattern.test(requestData) || pattern.test(req.url)
    );

    if (suspiciousActivity) {
        const securityEvent = {
            type: 'SUSPICIOUS_ACTIVITY',
            severity: 'HIGH',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            url: req.url,
            method: req.method,
            requestId: req.requestId,
            timestamp: new Date().toISOString(),
            userId: req.user?.userId || 'anonymous',
            patterns: suspiciousPatterns.filter(pattern =>
                pattern.test(requestData) || pattern.test(req.url)
            ).map(p => p.toString())
        };

        console.warn('🚨 SECURITY ALERT - Suspicious activity detected:', securityEvent);

        // Block high-severity patterns in production
        const highSeverityPatterns = [
            /union.*select/gi,
            /drop.*table/gi,
            /delete.*from/gi,
            /\.\.\//g,
            /etc\/passwd/gi,
            /proc\/self\/environ/gi
        ];

        const isHighSeverity = highSeverityPatterns.some(pattern =>
            pattern.test(requestData) || pattern.test(req.url)
        );

        if (isHighSeverity && process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: 'Request blocked by security policy',
                requestId: req.requestId
            });
        }
    }

    next();
};

// Content validation middleware
export const contentValidation = (req: Request, res: Response, next: NextFunction) => {
    // Validate JSON payloads
    if (req.headers['content-type']?.includes('application/json')) {
        try {
            if (req.body && typeof req.body === 'string') {
                JSON.parse(req.body);
            }
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid JSON',
                message: 'Request body contains invalid JSON',
                requestId: req.requestId
            });
        }
    }

    // Validate content length
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
        return res.status(413).json({
            success: false,
            error: 'Payload too large',
            message: 'Request exceeds maximum allowed size',
            requestId: req.requestId
        });
    }

    next();
};

// Security audit logging
export const securityAuditLogger = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const auditLog = {
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            userId: req.user?.userId || 'anonymous',
            contentLength: req.headers['content-length'] || '0'
        };

        // Log security-relevant events
        if (res.statusCode >= 400 || req.path.includes('auth') || req.path.includes('admin')) {
            console.log('🔍 Security Audit Log:', auditLog);
        }
    });

    next();
};

// Combined enhanced security middleware stack
export const enhancedSecurityMiddleware = [
    httpsEnforcement,
    requestIdMiddleware,
    cors(enhancedCorsOptions),
    enhancedSecurityHeaders,
    enhancedInputSanitization,
    contentValidation,
    enhancedSecurityMonitoring,
    securityAuditLogger
];

// Declare module augmentation for custom properties
declare global {
    namespace Express {
        interface Request {
            requestId?: string;
            nonce?: string;
        }
    }
} 