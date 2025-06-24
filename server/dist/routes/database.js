import express from 'express';
import db, { dbMonitor, dbConfig } from '../db/db';
const router = express.Router();
// Database health check endpoint
router.get('/health', async (req, res, next) => {
    try {
        const isHealthy = await db.healthCheck();
        const poolStats = db.getPoolStats();
        res.status(isHealthy ? 200 : 503).json({
            success: isHealthy,
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            pool: poolStats,
            message: isHealthy ? 'Database is responding normally' : 'Database health check failed'
        });
    }
    catch (error) {
        next(error);
    }
});
// Database pool statistics
router.get('/pool-stats', async (req, res, next) => {
    try {
        const stats = db.getPoolStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
// Database configuration (excluding sensitive data)
router.get('/config', async (req, res, next) => {
    try {
        const config = {
            pool: {
                max: dbConfig.max,
                min: dbConfig.min,
                idleTimeoutMillis: dbConfig.idleTimeoutMillis,
                connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
            },
            query: {
                statement_timeout: dbConfig.statement_timeout,
                query_timeout: dbConfig.query_timeout,
            },
            monitoring: {
                healthCheckInterval: dbConfig.healthCheckInterval,
            }
        };
        res.json({
            success: true,
            config,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
// Performance metrics (requires monitoring to be enabled)
router.get('/metrics', async (req, res, next) => {
    try {
        // Get table sizes using our performance monitoring function
        const tableSizes = await db.query('SELECT * FROM analyze_table_sizes() LIMIT 20');
        // Get index usage statistics
        const indexUsage = await db.query('SELECT * FROM analyze_index_usage() ORDER BY index_scans DESC LIMIT 20');
        // Get pool statistics
        const poolStats = db.getPoolStats();
        res.json({
            success: true,
            data: {
                pool: poolStats,
                tables: tableSizes.rows,
                indexes: indexUsage.rows,
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
// Maintenance commands (useful for admin operations)
router.get('/maintenance', async (req, res, next) => {
    try {
        const maintenanceCommands = await db.query('SELECT * FROM generate_maintenance_commands()');
        res.json({
            success: true,
            data: {
                commands: maintenanceCommands.rows,
                note: 'These commands should be run during maintenance windows'
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
// Unused indexes report (helpful for optimization)
router.get('/unused-indexes', async (req, res, next) => {
    try {
        const unusedIndexes = await db.query('SELECT * FROM unused_indexes');
        res.json({
            success: true,
            data: {
                unusedIndexes: unusedIndexes.rows,
                note: 'These indexes are not being used and could potentially be dropped',
                warning: 'Only drop indexes after confirming they are truly unused in production'
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
// Database live monitoring events (SSE endpoint)
router.get('/events', (req, res, next) => {
    try {
        // Set up Server-Sent Events
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        });
        // Send initial pool stats
        const initialStats = db.getPoolStats();
        res.write(`data: ${JSON.stringify({ type: 'initial', data: initialStats })}\n\n`);
        // Set up event listeners
        const onPoolEvent = (eventType) => (data) => {
            res.write(`data: ${JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() })}\n\n`);
        };
        const onConnect = onPoolEvent('connect');
        const onAcquire = onPoolEvent('acquire');
        const onRelease = onPoolEvent('release');
        const onRemove = onPoolEvent('remove');
        const onError = onPoolEvent('error');
        const onQuery = onPoolEvent('query');
        const onHealthCheck = onPoolEvent('healthCheck');
        // Register event listeners
        dbMonitor.on('connect', onConnect);
        dbMonitor.on('acquire', onAcquire);
        dbMonitor.on('release', onRelease);
        dbMonitor.on('remove', onRemove);
        dbMonitor.on('error', onError);
        dbMonitor.on('query', onQuery);
        dbMonitor.on('healthCheck', onHealthCheck);
        // Clean up on client disconnect
        req.on('close', () => {
            dbMonitor.off('connect', onConnect);
            dbMonitor.off('acquire', onAcquire);
            dbMonitor.off('release', onRelease);
            dbMonitor.off('remove', onRemove);
            dbMonitor.off('error', onError);
            dbMonitor.off('query', onQuery);
            dbMonitor.off('healthCheck', onHealthCheck);
        });
        // Keep connection alive
        const keepAlive = setInterval(() => {
            res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`);
        }, 30000); // Every 30 seconds
        req.on('close', () => {
            clearInterval(keepAlive);
        });
    }
    catch (error) {
        next(error);
    }
});
// Force a database health check
router.post('/health-check', async (req, res, next) => {
    try {
        const isHealthy = await db.healthCheck();
        const poolStats = db.getPoolStats();
        res.json({
            success: true,
            status: isHealthy ? 'healthy' : 'unhealthy',
            poolStats,
            timestamp: new Date().toISOString(),
            message: 'Health check completed'
        });
    }
    catch (error) {
        next(error);
    }
});
export default router;
