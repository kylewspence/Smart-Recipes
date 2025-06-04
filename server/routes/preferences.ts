import express from 'express';
import { createUserSchema, updateUserSchema, userIdSchema } from '../schemas/userSchemas';
import { validate, validateParamsAndBody } from '../middleware/validate';
import db from '../db/db';

const router = express.Router();

router.get('/', validate(userIdSchema, 'params'), async (req, res, next) => {
    try {
        const { userId } = req.params;

        // Check if user exists
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

        // Get user preferences
        const preferencesResult = await db.query(
            'SELECT * FROM "userPreferences" WHERE "userId" = $1',
            [userId]
        );

        if (preferencesResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Preferences not found'
            });
        }

        // get ingredient preferences
        const ingredientPreferencesResult = await db.query(
            `
            SELECT uip.*, i.name
            FROM "userIngredientPreferences" uip
            JOIN ingredients i ON uip."ingredientId" = i."ingredientId"
            WHERE uip."userId" = $1
            `,
            [userId]
        );

        // Format Response
        const preferences = {
            ...preferencesResult.rows[0],
            ingredientPreferences: ingredientPreferencesResult.rows || []
        };

        res.json({
            success: true,
            preferences
        });
    } catch (error) {
        next(error);
    }
});

