// Security configuration constants and utilities
export const SECURITY_CONFIG = {
    // Environment-based settings
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    
    // HTTPS enforcement
    httpsRedirect: {
        enabled: process.env.NODE_ENV === 'production',
        statusCode: 301,
        excludePaths: ['/health', '/api/health']
    },

    // Security monitoring
    monitoring: {
        enabled: true,
        logLevel: process.env.SECURITY_LOG_LEVEL || 'warn',
        alertThreshold: 5,
        blockHighSeverity: process.env.NODE_ENV === 'production'
    }
};

// Security event types
export enum SecurityEventType {
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE'
}

export interface SecurityEvent {
    type: SecurityEventType;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timestamp: string;
    requestId: string;
    ip: string;
    path: string;
    method: string;
}
