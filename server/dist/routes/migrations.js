import express from 'express';
import { migrationManager } from '../db/migrations.js';
const router = express.Router();
/**
 * GET /api/migrations/status
 * Get migration status including applied and pending migrations
 */
router.get('/status', async (req, res) => {
    try {
        const status = await migrationManager.getStatus();
        res.json({
            success: true,
            data: status
        });
    }
    catch (error) {
        console.error('Error getting migration status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get migration status'
        });
    }
});
/**
 * POST /api/migrations/migrate
 * Run pending migrations (ADMIN ONLY)
 */
router.post('/migrate', async (req, res) => {
    try {
        // In a real app, you'd want authentication/authorization here
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                error: 'Migration operations not allowed via API in production'
            });
        }
        await migrationManager.migrate();
        const status = await migrationManager.getStatus();
        res.json({
            success: true,
            message: 'Migrations completed successfully',
            data: status
        });
    }
    catch (error) {
        console.error('Error running migrations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run migrations'
        });
    }
});
/**
 * POST /api/migrations/rollback
 * Rollback migrations (ADMIN ONLY)
 */
router.post('/rollback', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                error: 'Migration operations not allowed via API in production'
            });
        }
        const { steps = 1 } = req.body;
        await migrationManager.rollback(steps);
        const status = await migrationManager.getStatus();
        res.json({
            success: true,
            message: `Rolled back ${steps} migration(s) successfully`,
            data: status
        });
    }
    catch (error) {
        console.error('Error rolling back migrations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to rollback migrations'
        });
    }
});
/**
 * GET /api/migrations/validate
 * Validate migration checksums
 */
router.get('/validate', async (req, res) => {
    try {
        const validation = await migrationManager.validateMigrations();
        if (validation.valid) {
            res.json({
                success: true,
                message: 'All migrations are valid',
                data: { valid: true, errors: [] }
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: 'Migration validation failed',
                data: validation
            });
        }
    }
    catch (error) {
        console.error('Error validating migrations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate migrations'
        });
    }
});
export default router;
