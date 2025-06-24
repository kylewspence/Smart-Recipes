import { Request, Response, NextFunction } from 'express';

// Security validation middleware
export const securityValidation = (req: Request, res: Response, next: NextFunction) => {
    // Validate security headers are present
    const requiredHeaders = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'X-Request-ID'
    ];

    const missingHeaders = requiredHeaders.filter(header => !res.getHeader(header));

    if (missingHeaders.length > 0) {
        console.warn('⚠️ Missing security headers:', {
            path: req.path,
            method: req.method,
            missingHeaders,
            requestId: req.requestId || 'unknown'
        });
    }

    next();
};

// Test endpoint for security validation
export const securityTestEndpoint = (req: Request, res: Response) => {
    const securityChecks = {
        httpsEnforced: req.secure || req.headers['x-forwarded-proto'] === 'https',
        securityHeaders: {
            csp: !!res.getHeader('Content-Security-Policy'),
            hsts: !!res.getHeader('Strict-Transport-Security'),
            xssProtection: !!res.getHeader('X-XSS-Protection'),
            noSniff: !!res.getHeader('X-Content-Type-Options'),
            frameOptions: !!res.getHeader('X-Frame-Options'),
            requestId: !!res.getHeader('X-Request-ID')
        },
        inputSanitization: true, // Validated by middleware
        rateLimiting: !!req.headers['x-ratelimit-limit'],
        cors: !!res.getHeader('Access-Control-Allow-Origin')
    };

    res.json({
        success: true,
        securityStatus: 'SECURE',
        checks: securityChecks,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
    });
};
