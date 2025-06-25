import { z } from 'zod';

// XSS Prevention: Sanitize HTML and script tags
const sanitizeHtml = (value: string) => {
    return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
};

// SQL Injection Prevention: Validate against common SQL injection patterns
const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b|[';\"\\-])/i;

// Path Traversal Prevention
const pathTraversalPattern = /(\.\.|\/\.\.|\\\.\.)/;

// Command Injection Prevention
const commandInjectionPattern = /[;&|`$(){}[\]]/;

// Safe string validation with XSS protection
export const safeStringSchema = z
    .string()
    .min(1)
    .max(1000)
    .refine((val) => !sqlInjectionPattern.test(val), {
        message: 'Input contains potentially dangerous SQL patterns'
    })
    .refine((val) => !pathTraversalPattern.test(val), {
        message: 'Input contains path traversal patterns'
    })
    .refine((val) => !commandInjectionPattern.test(val), {
        message: 'Input contains command injection patterns'
    })
    .transform(sanitizeHtml);

// Safe text content (for longer text like descriptions)
export const safeTextSchema = z
    .string()
    .min(1)
    .max(5000)
    .refine((val) => !sqlInjectionPattern.test(val), {
        message: 'Text contains potentially dangerous SQL patterns'
    })
    .transform(sanitizeHtml);

// Safe filename validation
export const safeFilenameSchema = z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Filename contains invalid characters')
    .refine((val) => !pathTraversalPattern.test(val), {
        message: 'Filename contains path traversal patterns'
    });

// Safe URL validation
export const safeUrlSchema = z
    .string()
    .url()
    .refine((val) => {
        const url = new URL(val);
        return ['http:', 'https:'].includes(url.protocol);
    }, {
        message: 'Only HTTP and HTTPS URLs are allowed'
    })
    .refine((val) => !val.includes('javascript:'), {
        message: 'JavaScript URLs are not allowed'
    });

// Safe email validation with additional security
export const safeEmailSchema = z
    .string()
    .email()
    .max(254)
    .transform((val) => val.toLowerCase().trim());

// Safe ID validation (for database IDs)
export const safeIdSchema = z
    .union([
        z.string().regex(/^\d+$/, 'ID must be numeric'),
        z.number().int().positive()
    ])
    .transform((val) => parseInt(val.toString(), 10));

// Safe search query validation
export const safeSearchSchema = z
    .string()
    .min(1)
    .max(200)
    .refine((val) => !sqlInjectionPattern.test(val), {
        message: 'Search query contains potentially dangerous patterns'
    })
    .transform(sanitizeHtml);

// File upload validation schema
export const fileUploadSchema = z.object({
    filename: safeFilenameSchema,
    mimetype: z.enum([
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'text/plain',
        'application/json'
    ]),
    size: z.number().max(5 * 1024 * 1024) // 5MB max
});

// Rate limiting validation
export const rateLimitSchema = z.object({
    ip: z.string().ip(),
    endpoint: safeStringSchema,
    timestamp: z.date().default(() => new Date())
});

// Security headers validation
export const securityHeadersSchema = z.object({
    'content-security-policy': z.string().optional(),
    'strict-transport-security': z.string().optional(),
    'x-frame-options': z.enum(['DENY', 'SAMEORIGIN']).optional(),
    'x-content-type-options': z.literal('nosniff').optional(),
    'x-xss-protection': z.string().optional(),
    'referrer-policy': z.string().optional()
});

// CSRF token validation
export const csrfTokenSchema = z
    .string()
    .length(32)
    .regex(/^[a-zA-Z0-9]+$/, 'Invalid CSRF token format');

// Password validation with security requirements
export const securePasswordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
    .refine((val) => {
        // Check against common weak passwords
        const weakPasswords = [
            'password', '123456', 'password123', 'admin', 'qwerty',
            'letmein', 'welcome', 'monkey', '1234567890'
        ];
        return !weakPasswords.includes(val.toLowerCase());
    }, {
        message: 'Password is too common and weak'
    });

// Security audit log schema
export const securityAuditSchema = z.object({
    userId: safeIdSchema.optional(),
    action: safeStringSchema,
    resource: safeStringSchema,
    ip: z.string().ip(),
    userAgent: safeStringSchema,
    timestamp: z.date().default(() => new Date()),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    details: z.record(z.any()).optional()
});

// API request validation schema
export const apiRequestSchema = z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    path: safeStringSchema,
    headers: z.record(z.string()),
    body: z.any().optional(),
    query: z.record(z.string()).optional(),
    params: z.record(z.string()).optional()
}); 