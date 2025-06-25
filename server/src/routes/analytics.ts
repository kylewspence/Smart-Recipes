import express from 'express';
import { z } from 'zod';
import { pool } from '../db/connection';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const PerformanceMetricSchema = z.object({
    name: z.string(),
    value: z.number(),
    rating: z.enum(['good', 'needs-improvement', 'poor']),
    timestamp: z.number(),
    url: z.string(),
    userAgent: z.string(),
    connection: z.object({
        effectiveType: z.string(),
        downlink: z.number(),
        rtt: z.number(),
    }).optional(),
});

const UserInteractionSchema = z.object({
    type: z.enum(['click', 'scroll', 'navigation', 'form-submit']),
    element: z.string().optional(),
    duration: z.number().optional(),
    timestamp: z.number(),
    url: z.string(),
});

const ResourceMetricSchema = z.object({
    name: z.string(),
    type: z.string(),
    size: z.number(),
    duration: z.number(),
    timestamp: z.number(),
});

const PerformanceDataSchema = z.object({
    metrics: z.array(PerformanceMetricSchema),
    interactions: z.array(UserInteractionSchema),
    resources: z.array(ResourceMetricSchema),
    timestamp: z.number(),
    sessionId: z.string(),
    userId: z.string().nullable().optional(),
});

// Performance metrics endpoint
router.post('/performance', async (req, res) => {
    try {
        const data = PerformanceDataSchema.parse(req.body);

        // Store performance metrics
        if (data.metrics.length > 0) {
            await storePerformanceMetrics(data.metrics, data.sessionId, data.userId);
        }

        // Store user interactions
        if (data.interactions.length > 0) {
            await storeUserInteractions(data.interactions, data.sessionId, data.userId);
        }

        // Store resource metrics
        if (data.resources.length > 0) {
            await storeResourceMetrics(data.resources, data.sessionId, data.userId);
        }

        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Error storing performance data:', error);
        res.status(500).json({ error: 'Failed to store performance data' });
    }
});

// Get performance analytics
router.get('/performance/summary', async (req, res) => {
    try {
        const { timeRange = '24h', page } = req.query;

        const summary = await getPerformanceSummary(timeRange as string, page as string);
        res.json(summary);
    } catch (error) {
        logger.error('Error getting performance summary:', error);
        res.status(500).json({ error: 'Failed to get performance summary' });
    }
});

// Get Core Web Vitals trends
router.get('/performance/web-vitals', async (req, res) => {
    try {
        const { timeRange = '7d' } = req.query;

        const webVitals = await getWebVitalsTrends(timeRange as string);
        res.json(webVitals);
    } catch (error) {
        logger.error('Error getting web vitals:', error);
        res.status(500).json({ error: 'Failed to get web vitals data' });
    }
});

// Get resource performance insights
router.get('/performance/resources', async (req, res) => {
    try {
        const { timeRange = '24h', type } = req.query;

        const resources = await getResourcePerformance(timeRange as string, type as string);
        res.json(resources);
    } catch (error) {
        logger.error('Error getting resource performance:', error);
        res.status(500).json({ error: 'Failed to get resource performance data' });
    }
});

// Get user interaction analytics
router.get('/performance/interactions', async (req, res) => {
    try {
        const { timeRange = '24h', type } = req.query;

        const interactions = await getUserInteractionAnalytics(timeRange as string, type as string);
        res.json(interactions);
    } catch (error) {
        logger.error('Error getting interaction analytics:', error);
        res.status(500).json({ error: 'Failed to get interaction analytics' });
    }
});

// Helper functions
async function storePerformanceMetrics(
    metrics: z.infer<typeof PerformanceMetricSchema>[],
    sessionId: string,
    userId?: string | null
) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const metric of metrics) {
            await client.query(`
        INSERT INTO performance_metrics (
          name, value, rating, timestamp, url, user_agent, 
          connection_type, connection_downlink, connection_rtt,
          session_id, user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
                metric.name,
                metric.value,
                metric.rating,
                new Date(metric.timestamp),
                metric.url,
                metric.userAgent,
                metric.connection?.effectiveType,
                metric.connection?.downlink,
                metric.connection?.rtt,
                sessionId,
                userId ? parseInt(userId) : null,
            ]);
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function storeUserInteractions(
    interactions: z.infer<typeof UserInteractionSchema>[],
    sessionId: string,
    userId?: string | null
) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const interaction of interactions) {
            await client.query(`
        INSERT INTO user_interactions (
          type, element, duration, timestamp, url, session_id, user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
                interaction.type,
                interaction.element,
                interaction.duration,
                new Date(interaction.timestamp),
                interaction.url,
                sessionId,
                userId ? parseInt(userId) : null,
            ]);
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function storeResourceMetrics(
    resources: z.infer<typeof ResourceMetricSchema>[],
    sessionId: string,
    userId?: string | null
) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const resource of resources) {
            await client.query(`
        INSERT INTO resource_metrics (
          name, type, size, duration, timestamp, session_id, user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
                resource.name,
                resource.type,
                resource.size,
                resource.duration,
                new Date(resource.timestamp),
                sessionId,
                userId ? parseInt(userId) : null,
            ]);
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function getPerformanceSummary(timeRange: string, page?: string) {
    const timeCondition = getTimeCondition(timeRange);
    const pageCondition = page ? `AND url LIKE '%${page}%'` : '';

    const result = await pool.query(`
    WITH core_vitals AS (
      SELECT 
        name,
        AVG(value) as avg_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as median_value,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75_value,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value,
        COUNT(*) as sample_count,
        COUNT(CASE WHEN rating = 'good' THEN 1 END) * 100.0 / COUNT(*) as good_percentage
      FROM performance_metrics 
      WHERE name IN ('LCP', 'FID', 'CLS', 'FCP', 'TTFB') 
        AND created_at >= NOW() - INTERVAL '${timeCondition}'
        ${pageCondition}
      GROUP BY name
    ),
    resource_summary AS (
      SELECT 
        type,
        COUNT(*) as count,
        AVG(duration) as avg_duration,
        AVG(size) as avg_size,
        SUM(size) as total_size
      FROM resource_metrics 
      WHERE created_at >= NOW() - INTERVAL '${timeCondition}'
      GROUP BY type
    ),
    interaction_summary AS (
      SELECT 
        type,
        COUNT(*) as count,
        AVG(duration) as avg_duration
      FROM user_interactions 
      WHERE created_at >= NOW() - INTERVAL '${timeCondition}'
        AND duration IS NOT NULL
      GROUP BY type
    )
    SELECT 
      (SELECT json_agg(core_vitals.*) FROM core_vitals) as core_vitals,
      (SELECT json_agg(resource_summary.*) FROM resource_summary) as resources,
      (SELECT json_agg(interaction_summary.*) FROM interaction_summary) as interactions
  `);

    return result.rows[0];
}

async function getWebVitalsTrends(timeRange: string) {
    const timeCondition = getTimeCondition(timeRange);

    const result = await pool.query(`
    SELECT 
      name,
      DATE_TRUNC('hour', created_at) as hour,
      AVG(value) as avg_value,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75_value,
      COUNT(CASE WHEN rating = 'good' THEN 1 END) * 100.0 / COUNT(*) as good_percentage
    FROM performance_metrics 
    WHERE name IN ('LCP', 'FID', 'CLS', 'FCP', 'TTFB') 
      AND created_at >= NOW() - INTERVAL '${timeCondition}'
    GROUP BY name, DATE_TRUNC('hour', created_at)
    ORDER BY hour DESC, name
  `);

    return result.rows;
}

async function getResourcePerformance(timeRange: string, type?: string) {
    const timeCondition = getTimeCondition(timeRange);
    const typeCondition = type ? `AND type = '${type}'` : '';

    const result = await pool.query(`
    SELECT 
      name,
      type,
      COUNT(*) as load_count,
      AVG(duration) as avg_duration,
      MAX(duration) as max_duration,
      AVG(size) as avg_size,
      MAX(size) as max_size,
      SUM(size) as total_size
    FROM resource_metrics 
    WHERE created_at >= NOW() - INTERVAL '${timeCondition}'
      ${typeCondition}
    GROUP BY name, type
    ORDER BY avg_duration DESC
    LIMIT 50
  `);

    return result.rows;
}

async function getUserInteractionAnalytics(timeRange: string, type?: string) {
    const timeCondition = getTimeCondition(timeRange);
    const typeCondition = type ? `AND type = '${type}'` : '';

    const result = await pool.query(`
    SELECT 
      type,
      element,
      COUNT(*) as interaction_count,
      AVG(duration) as avg_duration,
      url,
      COUNT(DISTINCT session_id) as unique_sessions
    FROM user_interactions 
    WHERE created_at >= NOW() - INTERVAL '${timeCondition}'
      ${typeCondition}
    GROUP BY type, element, url
    ORDER BY interaction_count DESC
    LIMIT 100
  `);

    return result.rows;
}

function getTimeCondition(timeRange: string): string {
    switch (timeRange) {
        case '1h': return '1 hour';
        case '24h': return '1 day';
        case '7d': return '7 days';
        case '30d': return '30 days';
        default: return '1 day';
    }
}

export default router; 