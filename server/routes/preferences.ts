import express from 'express';
import { createUserSchema, updateUserSchema, userIdSchema } from '../schemas/userSchemas';
import { validate, validateParamsAndBody } from '../middleware/validate';
import db from '../db/db';
import { userPreferencesSchema } from '../schemas/preferenceSchemas';
import { existsSync } from 'fs';

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

router.post('/', validateParamsAndBody(userIdSchema, userPreferencesSchema), async (req, res, next) => {
    try {
        const { userId } = req.params;
        const preferences = req.body;

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

        // Check if preferences exist 
        const existingResult = await db.query(
            'SELECT * FROM "userPreferences" WHERE "userId" = $1',
            [userId]
        );

        const exists = existingResult.rows.length > 0;
        let result;

        if (exists) {
            const updates = [];
            const values = []
            let paramIndex = 1;

            // Build dynamic query based on provided fields
            const fields = [
                'dietaryRestrictions',
                'allergies',
                'cuisinePreferences',
                'spiceLevel',
                'maxCookingTime',
                'servingSize'
            ];

            fields.forEach(field => {
                if (preferences[field] !== undefined) {
                    updates.push(`"${field}" = $${paramIndex}`);
                    values.push(preferences[field]);
                    paramIndex++;
                }
            });

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No valid fields to update'
                });
            }

            updates.push(`"updatedAt" = NOW()`);
            values.push(userId);

            result = await db.query(
                `UPDATE "userPreferences" 
                SET ${updates.join(', ')} 
                WHERE "userId" = $${paramIndex} 
                RETURNING *`,
                values
            );
        } else {
            // Create new preferences
            result = await db.query(
                `INSERT INTO "userPreferences" (
                "userId", 
                "dietaryRestrictions", 
                "allergies", 
                "cuisinePreferences", 
                "spiceLevel", 
                "maxCookingTime", 
                "servingSize")
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *`,
                [
                    userId,
                    preferences.dietaryRestrictions || [],
                    preferences.allergies || [],
                    preferences.cuisinePreferences || [],
                    preferences.spiceLevel || 'medium',
                    preferences.maxCookingTime || 60,
                    preferences.servingSize || 2
                ]
            );
        }

        res.json({
            success: true,
            preferences: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});