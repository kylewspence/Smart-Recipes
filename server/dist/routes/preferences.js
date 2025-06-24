import express from 'express';
import { userIdSchema } from '../schemas/userSchemas';
import { validate, validateParamsAndBody } from '../middleware/validate';
import db from '../db/db';
import { userPreferencesSchema, updatePreferencesSchema, ingredientPreferenceSchema } from '../schemas/preferenceSchemas';
import { z } from 'zod';
import { ClientError } from '../lib/client-error';
const router = express.Router();
// Helper function to check if user exists
async function checkUserExists(userId) {
    const result = await db.query('SELECT 1 FROM users WHERE "userId" = $1', [userId]);
    return result.rows.length > 0;
}
// GET /api/users/:userId/preferences - Get user preferences
router.get('/:userId/preferences', validate(userIdSchema, 'params'), async (req, res, next) => {
    try {
        const { userId } = req.params;
        // Check if user exists
        if (!(await checkUserExists(userId))) {
            throw new ClientError(404, 'User not found');
        }
        // Get user preferences
        const preferencesResult = await db.query('SELECT * FROM "userPreferences" WHERE "userId" = $1', [userId]);
        if (preferencesResult.rows.length === 0) {
            throw new ClientError(404, 'User preferences not found');
        }
        // Get ingredient preferences
        const ingredientPreferencesResult = await db.query(`SELECT uip.*, i.name, i.category
             FROM "userIngredientPreferences" uip
             JOIN ingredients i ON uip."ingredientId" = i."ingredientId"
             WHERE uip."userId" = $1
             ORDER BY i.name`, [userId]);
        // Format response
        const preferences = {
            ...preferencesResult.rows[0],
            ingredientPreferences: ingredientPreferencesResult.rows || []
        };
        res.json({
            success: true,
            data: preferences
        });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/users/:userId/preferences - Create user preferences
router.post('/:userId/preferences', validateParamsAndBody(userIdSchema, userPreferencesSchema), async (req, res, next) => {
    try {
        const { userId } = req.params;
        const preferences = req.body;
        // Check if user exists
        if (!(await checkUserExists(userId))) {
            throw new ClientError(404, 'User not found');
        }
        // Check if preferences already exist
        const existingResult = await db.query('SELECT 1 FROM "userPreferences" WHERE "userId" = $1', [userId]);
        if (existingResult.rows.length > 0) {
            throw new ClientError(409, 'User preferences already exist. Use PUT to update.');
        }
        // Create new preferences
        const result = await db.query(`INSERT INTO "userPreferences" (
                "userId", 
                "dietaryRestrictions", 
                "allergies", 
                "cuisinePreferences", 
                "spiceLevel", 
                "maxCookingTime", 
                "servingSize"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`, [
            userId,
            preferences.dietaryRestrictions || [],
            preferences.allergies || [],
            preferences.cuisinePreferences || [],
            preferences.spiceLevel || 'medium',
            preferences.maxCookingTime || 60,
            preferences.servingSize || 4
        ]);
        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'User preferences created successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
// PUT /api/users/:userId/preferences - Update user preferences
router.put('/:userId/preferences', validateParamsAndBody(userIdSchema, updatePreferencesSchema), async (req, res, next) => {
    try {
        const { userId } = req.params;
        const preferences = req.body;
        // Check if user exists
        if (!(await checkUserExists(userId))) {
            throw new ClientError(404, 'User not found');
        }
        // Check if preferences exist
        const existingResult = await db.query('SELECT 1 FROM "userPreferences" WHERE "userId" = $1', [userId]);
        if (existingResult.rows.length === 0) {
            throw new ClientError(404, 'User preferences not found. Use POST to create.');
        }
        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramIndex = 1;
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
            throw new ClientError(400, 'No valid fields provided for update');
        }
        updates.push(`"updatedAt" = NOW()`);
        values.push(userId);
        const result = await db.query(`UPDATE "userPreferences" 
             SET ${updates.join(', ')} 
             WHERE "userId" = $${paramIndex} 
             RETURNING *`, values);
        res.json({
            success: true,
            data: result.rows[0],
            message: 'User preferences updated successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
// DELETE /api/users/:userId/preferences - Delete user preferences
router.delete('/:userId/preferences', validate(userIdSchema, 'params'), async (req, res, next) => {
    try {
        const { userId } = req.params;
        // Check if user exists
        if (!(await checkUserExists(userId))) {
            throw new ClientError(404, 'User not found');
        }
        // Check if preferences exist
        const existingResult = await db.query('SELECT 1 FROM "userPreferences" WHERE "userId" = $1', [userId]);
        if (existingResult.rows.length === 0) {
            throw new ClientError(404, 'User preferences not found');
        }
        // Delete preferences (this will also cascade delete ingredient preferences due to foreign key)
        await db.query('DELETE FROM "userPreferences" WHERE "userId" = $1', [userId]);
        res.json({
            success: true,
            message: 'User preferences deleted successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
// ===== INGREDIENT PREFERENCES MANAGEMENT =====
// GET /api/users/:userId/preferences/ingredients - Get ingredient preferences
router.get('/:userId/preferences/ingredients', validate(userIdSchema, 'params'), async (req, res, next) => {
    try {
        const { userId } = req.params;
        // Check if user exists
        if (!(await checkUserExists(userId))) {
            throw new ClientError(404, 'User not found');
        }
        const result = await db.query(`SELECT uip.id, uip."ingredientId", uip.preference, i.name, i.category
             FROM "userIngredientPreferences" uip
             JOIN ingredients i ON uip."ingredientId" = i."ingredientId"
             WHERE uip."userId" = $1
             ORDER BY i.category, i.name`, [userId]);
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/users/:userId/preferences/ingredients - Add ingredient preference
router.post('/:userId/preferences/ingredients', validateParamsAndBody(userIdSchema, ingredientPreferenceSchema), async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { ingredientId, preference } = req.body;
        // Check if user exists
        if (!(await checkUserExists(userId))) {
            throw new ClientError(404, 'User not found');
        }
        // Check if ingredient exists
        const ingredientResult = await db.query('SELECT 1 FROM ingredients WHERE "ingredientId" = $1', [ingredientId]);
        if (ingredientResult.rows.length === 0) {
            throw new ClientError(404, 'Ingredient not found');
        }
        // Check if preference already exists
        const existingPref = await db.query('SELECT 1 FROM "userIngredientPreferences" WHERE "userId" = $1 AND "ingredientId" = $2', [userId, ingredientId]);
        if (existingPref.rows.length > 0) {
            throw new ClientError(409, 'Ingredient preference already exists. Use PUT to update.');
        }
        // Create ingredient preference
        const result = await db.query(`INSERT INTO "userIngredientPreferences" ("userId", "ingredientId", "preference")
             VALUES ($1, $2, $3)
             RETURNING *`, [userId, ingredientId, preference]);
        // Get ingredient details for response
        const ingredientDetails = await db.query(`SELECT uip.*, i.name, i.category
             FROM "userIngredientPreferences" uip
             JOIN ingredients i ON uip."ingredientId" = i."ingredientId"
             WHERE uip.id = $1`, [result.rows[0].id]);
        res.status(201).json({
            success: true,
            data: ingredientDetails.rows[0],
            message: 'Ingredient preference added successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
// PUT /api/users/:userId/preferences/ingredients/:ingredientId - Update ingredient preference
router.put('/:userId/preferences/ingredients/:ingredientId', validate(z.object({
    userId: userIdSchema.shape.userId,
    ingredientId: z.string().transform(val => parseInt(val, 10)).refine(val => !isNaN(val) && val > 0)
}), 'params'), validate(z.object({ preference: z.enum(['like', 'dislike', 'stretch']) })), async (req, res, next) => {
    try {
        const { userId, ingredientId } = req.params;
        const { preference } = req.body;
        // Check if user exists
        if (!(await checkUserExists(userId))) {
            throw new ClientError(404, 'User not found');
        }
        // Update ingredient preference
        const result = await db.query(`UPDATE "userIngredientPreferences" 
                 SET "preference" = $1
                 WHERE "userId" = $2 AND "ingredientId" = $3
                 RETURNING *`, [preference, userId, ingredientId]);
        if (result.rows.length === 0) {
            throw new ClientError(404, 'Ingredient preference not found');
        }
        // Get ingredient details for response
        const ingredientDetails = await db.query(`SELECT uip.*, i.name, i.category
                 FROM "userIngredientPreferences" uip
                 JOIN ingredients i ON uip."ingredientId" = i."ingredientId"
                 WHERE uip.id = $1`, [result.rows[0].id]);
        res.json({
            success: true,
            data: ingredientDetails.rows[0],
            message: 'Ingredient preference updated successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
// DELETE /api/users/:userId/preferences/ingredients/:ingredientId - Remove ingredient preference
router.delete('/:userId/preferences/ingredients/:ingredientId', validate(z.object({
    userId: userIdSchema.shape.userId,
    ingredientId: z.string().transform(val => parseInt(val, 10)).refine(val => !isNaN(val) && val > 0)
}), 'params'), async (req, res, next) => {
    try {
        const { userId, ingredientId } = req.params;
        // Check if user exists
        if (!(await checkUserExists(userId))) {
            throw new ClientError(404, 'User not found');
        }
        // Delete ingredient preference
        const result = await db.query('DELETE FROM "userIngredientPreferences" WHERE "userId" = $1 AND "ingredientId" = $2 RETURNING *', [userId, ingredientId]);
        if (result.rows.length === 0) {
            throw new ClientError(404, 'Ingredient preference not found');
        }
        res.json({
            success: true,
            message: 'Ingredient preference removed successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/users/:userId/preferences/ingredients/bulk - Bulk update ingredient preferences
const bulkIngredientPreferencesSchema = z.object({
    preferences: z.array(z.object({
        ingredientId: z.number().int().positive(),
        preference: z.enum(['like', 'dislike', 'stretch'])
    })).min(1).max(100) // Reasonable limits
});
router.post('/:userId/preferences/ingredients/bulk', validateParamsAndBody(userIdSchema, bulkIngredientPreferencesSchema), async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { preferences } = req.body;
        // Check if user exists
        if (!(await checkUserExists(userId))) {
            throw new ClientError(404, 'User not found');
        }
        // Start transaction
        await db.query('BEGIN');
        try {
            const results = [];
            for (const pref of preferences) {
                // Check if ingredient exists
                const ingredientExists = await db.query('SELECT 1 FROM ingredients WHERE "ingredientId" = $1', [pref.ingredientId]);
                if (ingredientExists.rows.length === 0) {
                    throw new ClientError(400, `Ingredient with ID ${pref.ingredientId} not found`);
                }
                // Upsert ingredient preference
                const result = await db.query(`INSERT INTO "userIngredientPreferences" ("userId", "ingredientId", "preference")
                         VALUES ($1, $2, $3)
                         ON CONFLICT ("userId", "ingredientId") 
                         DO UPDATE SET "preference" = EXCLUDED."preference"
                         RETURNING *`, [userId, pref.ingredientId, pref.preference]);
                results.push(result.rows[0]);
            }
            await db.query('COMMIT');
            res.json({
                success: true,
                data: {
                    updated: results.length,
                    preferences: results
                },
                message: `Successfully updated ${results.length} ingredient preferences`
            });
        }
        catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        next(error);
    }
});
export default router;
