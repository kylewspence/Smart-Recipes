import express from 'express';
import { createUserSchema, updateUserSchema, userIdSchema } from '../schemas/userSchemas';
import { validate, validateParamsAndBody } from '../middleware/validate';
import db from '../db/db';

const router = express.Router();

// GET /api/users - Get all users
router.get('/', async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

        const result = await db.query(
            'SELECT "userId", email, name, "createdAt", "updatedAt" FROM users ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );

        // Return array directly to match test expectations
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

router.post('/', validate(createUserSchema), async (req, res, next) => {
    try {
        const { email, name } = req.body;

        // Check if email already exists
        const existingUser = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create new user
        const result = await db.query(
            'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
            [email, name]
        );


        res.status(201).json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/users/:userId - Get a user by ID
router.get('/:userId', validate(userIdSchema, 'params'), async (req, res, next) => {
    try {
        const { userId } = req.params;

        const result = await db.query(
            'SELECT * FROM users WHERE "userId" = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/users/:userId - Update a user by ID
router.put('/:userId', validateParamsAndBody(userIdSchema, updateUserSchema), async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { name, email } = req.body;

        // Check if user exists
        const existingUser = await db.query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );

        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prepare update query dynamically based on provided fields
        let updates = [];
        let values = [];
        let paramIndex = 1;

        if (email !== undefined) {
            updates.push(`email = $${paramIndex}`);
            values.push(email);
            paramIndex++;
        }

        if (name !== undefined) {
            updates.push(`name = $${paramIndex}`);
            values.push(name);
            paramIndex++;
        }

        values.push(userId);

        const query = `
        UPDATE users
        SET ${updates.join(', ')}, "updatedAt" = NOW()
        WHERE "userId" = $${paramIndex}
        RETURNING *
        `;

        const result = await db.query(query, values);

        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

// delete /api/users/:userId = delete a user
router.delete('/:userId', validate(userIdSchema, 'params'), async (req, res, next) => {
    try {
        const { userId } = req.params;

        const userExists = await db.query(
            'SELECT * FROM users WHERE "userId" = $1',
            [userId]
        );

        if (userExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await db.query('DELETE FROM users WHERE "userId" = $1', [userId]);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

export default router;