import { Request, Response } from 'express';
import db from '../db/db';
import { securityAuditSchema } from '../schemas/securitySchemas';
import { z } from 'zod';

// Security audit log entry interface
interface SecurityAuditEntry {
    userId?: number;
    action: string;
    resource: string;
    ip: string;
    userAgent: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details?: Record<string, any>;
}

// Security metrics interface
interface SecurityMetrics {
    totalEvents: number;
    criticalEvents: number;
    highSeverityEvents: number;
    mediumSeverityEvents: number;
    lowSeverityEvents: number;
    topAttackTypes: Array<{ type: string; count: number }>;
    topTargetedResources: Array<{ resource: string; count: number }>;
    suspiciousIPs: Array<{ ip: string; count: number; lastSeen: Date }>;
    recentEvents: SecurityAuditEntry[];
}

// In-memory audit log (in production, this would be stored in database/external service)
const auditLog: SecurityAuditEntry[] = [];

// Security event thresholds
const SECURITY_THRESHOLDS = {
    SUSPICIOUS_IP_THRESHOLD: 10, // Number of security events per IP to flag as suspicious
    CRITICAL_EVENT_ALERT_THRESHOLD: 1, // Number of critical events to trigger alert
    HIGH_SEVERITY_THRESHOLD: 5, // Number of high severity events to trigger alert
    TIME_WINDOW_MINUTES: 60 // Time window for threshold calculations
};

// Log security event
export const logSecurityEvent = async (
    userId: number | undefined,
    action: string,
    resource: string,
    ip: string,
    userAgent: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: Record<string, any>
): Promise<void> => {
    try {
        const auditEntry: SecurityAuditEntry = {
            userId,
            action,
            resource,
            ip,
            userAgent,
            timestamp: new Date(),
            severity,
            details
        };

        // Validate audit entry
        const validatedEntry = securityAuditSchema.parse(auditEntry);

        // Add to in-memory log
        auditLog.push(validatedEntry);

        // Keep only last 1000 entries in memory
        if (auditLog.length > 1000) {
            auditLog.shift();
        }

        // Log to console with appropriate level
        const logLevel = severity === 'critical' ? 'error' :
            severity === 'high' ? 'warn' :
                severity === 'medium' ? 'info' : 'debug';

        console[logLevel]('🔒 Security Event:', JSON.stringify(validatedEntry, null, 2));

        // Check if we need to trigger alerts
        await checkSecurityThresholds(ip, severity);

        // In production, also store in database
        if (process.env.NODE_ENV === 'production') {
            await storeAuditEntryInDatabase(validatedEntry);
        }

    } catch (error) {
        console.error('Failed to log security event:', error);
    }
};

// Store audit entry in database (for production)
const storeAuditEntryInDatabase = async (entry: SecurityAuditEntry): Promise<void> => {
    try {
        await db.query(
            `INSERT INTO security_audit_log 
       (user_id, action, resource, ip, user_agent, severity, details, timestamp) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                entry.userId,
                entry.action,
                entry.resource,
                entry.ip,
                entry.userAgent,
                entry.severity,
                JSON.stringify(entry.details),
                entry.timestamp
            ]
        );
    } catch (error) {
        console.error('Failed to store audit entry in database:', error);
    }
};

// Check security thresholds and trigger alerts if needed
const checkSecurityThresholds = async (ip: string, severity: string): Promise<void> => {
    const now = new Date();
    const timeWindow = new Date(now.getTime() - SECURITY_THRESHOLDS.TIME_WINDOW_MINUTES * 60 * 1000);

    // Get recent events from this IP
    const recentEventsFromIP = auditLog.filter(
        entry => entry.ip === ip && entry.timestamp >= timeWindow
    );

    // Check for suspicious IP activity
    if (recentEventsFromIP.length >= SECURITY_THRESHOLDS.SUSPICIOUS_IP_THRESHOLD) {
        console.error('🚨 SECURITY ALERT: Suspicious IP activity detected', {
            ip,
            eventCount: recentEventsFromIP.length,
            timeWindow: SECURITY_THRESHOLDS.TIME_WINDOW_MINUTES,
            events: recentEventsFromIP.map(e => ({ action: e.action, severity: e.severity, timestamp: e.timestamp }))
        });

        // In production, send alert to security team
        await sendSecurityAlert('SUSPICIOUS_IP_ACTIVITY', { ip, eventCount: recentEventsFromIP.length });
    }

    // Check for critical events
    if (severity === 'critical') {
        console.error('🚨 CRITICAL SECURITY EVENT DETECTED', { ip, timestamp: now });
        await sendSecurityAlert('CRITICAL_SECURITY_EVENT', { ip, timestamp: now });
    }

    // Check for high severity event threshold
    const recentHighSeverityEvents = auditLog.filter(
        entry => entry.severity === 'high' && entry.timestamp >= timeWindow
    );

    if (recentHighSeverityEvents.length >= SECURITY_THRESHOLDS.HIGH_SEVERITY_THRESHOLD) {
        console.error('🚨 HIGH SEVERITY EVENT THRESHOLD EXCEEDED', {
            eventCount: recentHighSeverityEvents.length,
            timeWindow: SECURITY_THRESHOLDS.TIME_WINDOW_MINUTES
        });

        await sendSecurityAlert('HIGH_SEVERITY_THRESHOLD_EXCEEDED', {
            eventCount: recentHighSeverityEvents.length
        });
    }
};

// Send security alert (placeholder for production implementation)
const sendSecurityAlert = async (alertType: string, details: Record<string, any>): Promise<void> => {
    // In production, this would integrate with:
    // - Email alerts
    // - Slack notifications
    // - PagerDuty
    // - Security incident management system

    console.log('📧 Security Alert Triggered:', {
        type: alertType,
        details,
        timestamp: new Date().toISOString()
    });
};

// Get security metrics
export const getSecurityMetrics = (): SecurityMetrics => {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Filter events from last 24 hours
    const recentEvents = auditLog.filter(entry => entry.timestamp >= last24Hours);

    // Calculate metrics
    const totalEvents = recentEvents.length;
    const criticalEvents = recentEvents.filter(e => e.severity === 'critical').length;
    const highSeverityEvents = recentEvents.filter(e => e.severity === 'high').length;
    const mediumSeverityEvents = recentEvents.filter(e => e.severity === 'medium').length;
    const lowSeverityEvents = recentEvents.filter(e => e.severity === 'low').length;

    // Top attack types
    const attackTypeCounts: Record<string, number> = {};
    recentEvents.forEach(event => {
        attackTypeCounts[event.action] = (attackTypeCounts[event.action] || 0) + 1;
    });

    const topAttackTypes = Object.entries(attackTypeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([type, count]) => ({ type, count }));

    // Top targeted resources
    const resourceCounts: Record<string, number> = {};
    recentEvents.forEach(event => {
        resourceCounts[event.resource] = (resourceCounts[event.resource] || 0) + 1;
    });

    const topTargetedResources = Object.entries(resourceCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([resource, count]) => ({ resource, count }));

    // Suspicious IPs
    const ipCounts: Record<string, { count: number; lastSeen: Date }> = {};
    recentEvents.forEach(event => {
        if (!ipCounts[event.ip]) {
            ipCounts[event.ip] = { count: 0, lastSeen: event.timestamp };
        }
        ipCounts[event.ip].count++;
        if (event.timestamp > ipCounts[event.ip].lastSeen) {
            ipCounts[event.ip].lastSeen = event.timestamp;
        }
    });

    const suspiciousIPs = Object.entries(ipCounts)
        .filter(([, data]) => data.count >= SECURITY_THRESHOLDS.SUSPICIOUS_IP_THRESHOLD)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 10)
        .map(([ip, data]) => ({ ip, count: data.count, lastSeen: data.lastSeen }));

    return {
        totalEvents,
        criticalEvents,
        highSeverityEvents,
        mediumSeverityEvents,
        lowSeverityEvents,
        topAttackTypes,
        topTargetedResources,
        suspiciousIPs,
        recentEvents: recentEvents.slice(-20) // Last 20 events
    };
};

// Vulnerability scanner
export const runVulnerabilityScans = async (): Promise<{
    passed: string[];
    failed: string[];
    warnings: string[];
}> => {
    const results = {
        passed: [] as string[],
        failed: [] as string[],
        warnings: [] as string[]
    };

    // Check environment variables
    const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
    const optionalEnvVars = ['REDIS_URL', 'OPENAI_API_KEY'];

    for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
            results.passed.push(`✅ Required environment variable ${envVar} is set`);
        } else {
            results.failed.push(`❌ Required environment variable ${envVar} is missing`);
        }
    }

    for (const envVar of optionalEnvVars) {
        if (process.env[envVar]) {
            results.passed.push(`✅ Optional environment variable ${envVar} is set`);
        } else {
            results.warnings.push(`⚠️ Optional environment variable ${envVar} is not set`);
        }
    }

    // Check JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
        if (jwtSecret.length >= 32) {
            results.passed.push('✅ JWT secret is sufficiently long (32+ characters)');
        } else {
            results.failed.push('❌ JWT secret is too short (should be 32+ characters)');
        }

        if (/[A-Z]/.test(jwtSecret) && /[a-z]/.test(jwtSecret) && /[0-9]/.test(jwtSecret) && /[^A-Za-z0-9]/.test(jwtSecret)) {
            results.passed.push('✅ JWT secret has good complexity (uppercase, lowercase, numbers, symbols)');
        } else {
            results.warnings.push('⚠️ JWT secret could be more complex (add uppercase, lowercase, numbers, symbols)');
        }
    }

    // Check database connection security
    try {
        const dbResult = await db.query('SELECT version()');
        results.passed.push('✅ Database connection is working');

        // Check if using SSL
        const sslResult = await db.query('SHOW ssl');
        if (sslResult.rows[0]?.ssl === 'on') {
            results.passed.push('✅ Database is using SSL connection');
        } else {
            results.warnings.push('⚠️ Database SSL is not enabled (recommended for production)');
        }
    } catch (error) {
        results.failed.push('❌ Database connection failed');
    }

    // Check for security headers
    if (process.env.NODE_ENV === 'production') {
        results.passed.push('✅ Running in production mode');
    } else {
        results.warnings.push('⚠️ Not running in production mode');
    }

    return results;
};

// Express route handlers
export const getSecurityAuditReport = (req: Request, res: Response) => {
    try {
        const metrics = getSecurityMetrics();

        res.json({
            success: true,
            data: {
                metrics,
                timestamp: new Date().toISOString(),
                auditLogSize: auditLog.length,
                thresholds: SECURITY_THRESHOLDS
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to generate security audit report',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const runSecurityScan = async (req: Request, res: Response) => {
    try {
        const scanResults = await runVulnerabilityScans();

        res.json({
            success: true,
            data: {
                scanResults,
                timestamp: new Date().toISOString(),
                summary: {
                    totalChecks: scanResults.passed.length + scanResults.failed.length + scanResults.warnings.length,
                    passed: scanResults.passed.length,
                    failed: scanResults.failed.length,
                    warnings: scanResults.warnings.length,
                    overallStatus: scanResults.failed.length === 0 ? 'SECURE' : 'VULNERABILITIES_DETECTED'
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to run security scan',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Helper function for middleware
export const createSecurityEventLogger = (req: Request) => {
    return async (
        action: string,
        severity: 'low' | 'medium' | 'high' | 'critical',
        details?: Record<string, any>
    ) => {
        await logSecurityEvent(
            req.user?.id,
            action,
            req.path,
            req.ip || req.connection.remoteAddress || 'unknown',
            req.get('User-Agent') || 'unknown',
            severity,
            details
        );
    };
}; 