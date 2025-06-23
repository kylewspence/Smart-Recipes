import express from 'express';
import { z } from 'zod';
import db from '../db/db';
import { ClientError } from '../lib';

const router = express.Router();

// Validation schemas
const ingredientSchema = z.object({
    name: z.string().min(1).max(100).trim(),
    category: z.string().optional()
});

const updateIngredientSchema = z.object({
    name: z.string().min(1).max(100).trim().optional(),
    category: z.string().optional()
});

const ingredientSearchSchema = z.object({
    query: z.string().optional(),
    category: z.string().optional(),
    limit: z.number().int().positive().max(100).default(50),
    offset: z.number().int().min(0).default(0),
    sortBy: z.enum(['name', 'category', 'usage', 'recent']).default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
});

const bulkIngredientSchema = z.object({
    ingredients: z.array(ingredientSchema).min(1).max(100)
});

const ingredientIdSchema = z.object({
    ingredientId: z.string().regex(/^\d+$/).transform(val => parseInt(val, 10))
});

// ===== INGREDIENT CRUD OPERATIONS =====

/**
 * Get all ingredients with search and filtering
 * GET /api/ingredients
 */
router.get('/', async (req, res, next) => {
    try {
        const searchParams = ingredientSearchSchema.parse(req.query);

        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        // Build dynamic WHERE clause
        if (searchParams.query) {
            whereConditions.push(`i."name" ILIKE $${paramIndex}`);
            queryParams.push(`%${searchParams.query}%`);
            paramIndex++;
        }

        if (searchParams.category) {
            whereConditions.push(`i."category" ILIKE $${paramIndex}`);
            queryParams.push(searchParams.category);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Build ORDER BY clause
        let orderBy = '';
        switch (searchParams.sortBy) {
            case 'name':
                orderBy = `ORDER BY i."name" ${searchParams.sortOrder.toUpperCase()}`;
                break;
            case 'category':
                orderBy = `ORDER BY i."category" ${searchParams.sortOrder.toUpperCase()}, i."name" ASC`;
                break;
            case 'usage':
                orderBy = `ORDER BY usage_count ${searchParams.sortOrder.toUpperCase()}, i."name" ASC`;
                break;
            case 'recent':
                orderBy = `ORDER BY i."createdAt" ${searchParams.sortOrder.toUpperCase()}`;
                break;
        }

        // Add pagination parameters
        queryParams.push(searchParams.limit, searchParams.offset);

        const searchQuery = `
            SELECT i.*, 
                   COALESCE(
                       (SELECT COUNT(*)
                        FROM "recipeIngredients" ri
                        WHERE ri."ingredientId" = i."ingredientId"
                       ), 0) as usage_count,
                   COALESCE(
                       (SELECT COUNT(*)
                        FROM "userIngredientPreferences" uip
                        WHERE uip."ingredientId" = i."ingredientId"
                       ), 0) as preference_count
            FROM "ingredients" i
            ${whereClause}
            ${orderBy}
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        const results = await db.query(searchQuery, queryParams);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM "ingredients" i
            ${whereClause}
        `;
        const countResult = await db.query(countQuery, queryParams.slice(0, -2));

        res.json({
            success: true,
            data: {
                ingredients: results.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].total),
                    limit: searchParams.limit,
                    offset: searchParams.offset,
                    hasMore: (searchParams.offset + searchParams.limit) < parseInt(countResult.rows[0].total)
                }
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Get a specific ingredient by ID
 * GET /api/ingredients/:ingredientId
 */
router.get('/:ingredientId', async (req, res, next) => {
    try {
        const { ingredientId } = ingredientIdSchema.parse({ ingredientId: req.params.ingredientId });

        const ingredientResult = await db.query(
            `SELECT i.*, 
                    COALESCE(
                        (SELECT COUNT(*)
                         FROM "recipeIngredients" ri
                         WHERE ri."ingredientId" = i."ingredientId"
                        ), 0) as usage_count,
                    COALESCE(
                        (SELECT COUNT(*)
                         FROM "userIngredientPreferences" uip
                         WHERE uip."ingredientId" = i."ingredientId"
                        ), 0) as preference_count,
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object(
                                'preference', uip."preference",
                                'count', count
                            )
                        )
                        FROM (
                            SELECT uip."preference", COUNT(*) as count
                            FROM "userIngredientPreferences" uip
                            WHERE uip."ingredientId" = i."ingredientId"
                            GROUP BY uip."preference"
                        ) preference_breakdown
                        ), '[]'::json) as preference_breakdown
            FROM "ingredients" i
            WHERE i."ingredientId" = $1`,
            [ingredientId]
        );

        if (ingredientResult.rows.length === 0) {
            throw new ClientError(404, 'Ingredient not found');
        }

        // Get recent recipes using this ingredient
        const recentRecipesResult = await db.query(
            `SELECT r."recipeId", r."title", r."cuisine", r."difficulty", r."createdAt"
             FROM "recipes" r
             JOIN "recipeIngredients" ri ON r."recipeId" = ri."recipeId"
             WHERE ri."ingredientId" = $1
             ORDER BY r."createdAt" DESC
             LIMIT 10`,
            [ingredientId]
        );

        res.json({
            success: true,
            data: {
                ...ingredientResult.rows[0],
                recentRecipes: recentRecipesResult.rows
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Create a new ingredient
 * POST /api/ingredients
 */
router.post('/', async (req, res, next) => {
    try {
        const ingredientData = ingredientSchema.parse(req.body);

        // Check if ingredient already exists
        const existingIngredient = await db.query(
            'SELECT "ingredientId" FROM "ingredients" WHERE LOWER("name") = LOWER($1)',
            [ingredientData.name]
        );

        if (existingIngredient.rows.length > 0) {
            throw new ClientError(409, 'Ingredient already exists');
        }

        // Create the ingredient
        const result = await db.query(
            'INSERT INTO "ingredients" ("name", "category") VALUES ($1, $2) RETURNING *',
            [ingredientData.name, ingredientData.category || 'other']
        );

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Ingredient created successfully'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Update an existing ingredient
 * PUT /api/ingredients/:ingredientId
 */
router.put('/:ingredientId', async (req, res, next) => {
    try {
        const { ingredientId } = ingredientIdSchema.parse({ ingredientId: req.params.ingredientId });
        const updateData = updateIngredientSchema.parse(req.body);

        // Check if ingredient exists
        const existingIngredient = await db.query(
            'SELECT * FROM "ingredients" WHERE "ingredientId" = $1',
            [ingredientId]
        );

        if (existingIngredient.rows.length === 0) {
            throw new ClientError(404, 'Ingredient not found');
        }

        // If updating name, check for duplicates
        if (updateData.name) {
            const duplicateCheck = await db.query(
                'SELECT "ingredientId" FROM "ingredients" WHERE LOWER("name") = LOWER($1) AND "ingredientId" != $2',
                [updateData.name, ingredientId]
            );

            if (duplicateCheck.rows.length > 0) {
                throw new ClientError(409, 'An ingredient with this name already exists');
            }
        }

        // Build update query
        const updateFields = [];
        const updateValues = [];
        let valueCounter = 1;

        if (updateData.name !== undefined) {
            updateFields.push(`"name" = $${valueCounter++}`);
            updateValues.push(updateData.name);
        }

        if (updateData.category !== undefined) {
            updateFields.push(`"category" = $${valueCounter++}`);
            updateValues.push(updateData.category);
        }

        if (updateFields.length === 0) {
            throw new ClientError(400, 'No valid fields to update');
        }

        updateValues.push(ingredientId);

        const result = await db.query(
            `UPDATE "ingredients" 
             SET ${updateFields.join(', ')}
             WHERE "ingredientId" = $${valueCounter}
             RETURNING *`,
            updateValues
        );

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Ingredient updated successfully'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Delete an ingredient
 * DELETE /api/ingredients/:ingredientId
 */
router.delete('/:ingredientId', async (req, res, next) => {
    try {
        const { ingredientId } = ingredientIdSchema.parse({ ingredientId: req.params.ingredientId });

        // Check if ingredient exists
        const existingIngredient = await db.query(
            'SELECT * FROM "ingredients" WHERE "ingredientId" = $1',
            [ingredientId]
        );

        if (existingIngredient.rows.length === 0) {
            throw new ClientError(404, 'Ingredient not found');
        }

        // Check if ingredient is used in recipes
        const usageCheck = await db.query(
            'SELECT COUNT(*) as count FROM "recipeIngredients" WHERE "ingredientId" = $1',
            [ingredientId]
        );

        const usageCount = parseInt(usageCheck.rows[0].count);

        if (usageCount > 0) {
            throw new ClientError(409, `Cannot delete ingredient. It is used in ${usageCount} recipe(s). Remove it from all recipes first.`);
        }

        // Delete the ingredient (this will cascade to user preferences)
        await db.query(
            'DELETE FROM "ingredients" WHERE "ingredientId" = $1',
            [ingredientId]
        );

        res.json({
            success: true,
            message: 'Ingredient deleted successfully'
        });
    } catch (err) {
        next(err);
    }
});

// ===== BULK OPERATIONS =====

/**
 * Bulk create ingredients
 * POST /api/ingredients/bulk
 */
router.post('/bulk', async (req, res, next) => {
    try {
        const bulkData = bulkIngredientSchema.parse(req.body);

        let results = [];
        let created = 0;
        let skipped = 0;

        await db.query('BEGIN');

        try {
            for (const ingredientData of bulkData.ingredients) {
                // Check if ingredient already exists
                const existingIngredient = await db.query(
                    'SELECT "ingredientId" FROM "ingredients" WHERE LOWER("name") = LOWER($1)',
                    [ingredientData.name]
                );

                if (existingIngredient.rows.length > 0) {
                    results.push({
                        name: ingredientData.name,
                        success: false,
                        error: 'Ingredient already exists',
                        ingredientId: existingIngredient.rows[0].ingredientId
                    });
                    skipped++;
                } else {
                    // Create the ingredient
                    const result = await db.query(
                        'INSERT INTO "ingredients" ("name", "category") VALUES ($1, $2) RETURNING *',
                        [ingredientData.name, ingredientData.category || 'other']
                    );

                    results.push({
                        name: ingredientData.name,
                        success: true,
                        data: result.rows[0]
                    });
                    created++;
                }
            }

            await db.query('COMMIT');

            res.status(201).json({
                success: true,
                data: {
                    processed: bulkData.ingredients.length,
                    created: created,
                    skipped: skipped,
                    results: results
                },
                message: `Bulk creation completed: ${created} created, ${skipped} skipped`
            });
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (err) {
        next(err);
    }
});

// ===== CATEGORY MANAGEMENT =====

/**
 * Get all ingredient categories with statistics
 * GET /api/ingredients/categories
 */
router.get('/categories/list', async (req, res, next) => {
    try {
        const categoriesResult = await db.query(`
            SELECT 
                i."category",
                COUNT(*) as ingredient_count,
                COUNT(DISTINCT ri."recipeId") as recipe_count,
                COUNT(DISTINCT uip."userId") as user_preference_count,
                COALESCE(AVG(CASE 
                    WHEN uip."preference" = 'like' THEN 3
                    WHEN uip."preference" = 'stretch' THEN 2  
                    WHEN uip."preference" = 'dislike' THEN 1
                    ELSE 2
                END), 2) as avg_preference_score
            FROM "ingredients" i
            LEFT JOIN "recipeIngredients" ri ON i."ingredientId" = ri."ingredientId"
            LEFT JOIN "userIngredientPreferences" uip ON i."ingredientId" = uip."ingredientId"
            GROUP BY i."category"
            ORDER BY ingredient_count DESC
        `);

        // Get most popular ingredients per category
        const popularIngredientsResult = await db.query(`
            WITH ingredient_usage AS (
                SELECT 
                    i."ingredientId",
                    i."name",
                    i."category",
                    COUNT(DISTINCT ri."recipeId") as recipe_count,
                    ROW_NUMBER() OVER (PARTITION BY i."category" ORDER BY COUNT(DISTINCT ri."recipeId") DESC) as rank
                FROM "ingredients" i
                LEFT JOIN "recipeIngredients" ri ON i."ingredientId" = ri."ingredientId"
                GROUP BY i."ingredientId", i."name", i."category"
            )
            SELECT 
                category,
                json_agg(
                    json_build_object(
                        'ingredientId', "ingredientId",
                        'name', name,
                        'recipeCount', recipe_count
                    ) ORDER BY recipe_count DESC
                ) as top_ingredients
            FROM ingredient_usage
            WHERE rank <= 5
            GROUP BY category
        `);

        // Create a map for easy lookup
        const topIngredientsMap = {};
        popularIngredientsResult.rows.forEach(row => {
            topIngredientsMap[row.category] = row.top_ingredients;
        });

        // Add top ingredients to category stats
        const enrichedCategories = categoriesResult.rows.map(category => ({
            ...category,
            topIngredients: topIngredientsMap[category.category] || []
        }));

        res.json({
            success: true,
            data: enrichedCategories
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Update ingredient category in bulk
 * PUT /api/ingredients/categories/bulk
 */
router.put('/categories/bulk', async (req, res, next) => {
    try {
        const { ingredientIds, newCategory } = req.body;

        if (!Array.isArray(ingredientIds) || ingredientIds.length === 0) {
            throw new ClientError(400, 'ingredientIds must be a non-empty array');
        }

        if (!newCategory || typeof newCategory !== 'string') {
            throw new ClientError(400, 'newCategory is required and must be a string');
        }

        if (ingredientIds.length > 100) {
            throw new ClientError(400, 'Cannot update more than 100 ingredients at once');
        }

        // Validate all ingredient IDs
        const validIds = ingredientIds.filter(id => Number.isInteger(id) && id > 0);
        if (validIds.length !== ingredientIds.length) {
            throw new ClientError(400, 'All ingredient IDs must be positive integers');
        }

        const result = await db.query(
            `UPDATE "ingredients" 
             SET "category" = $1 
             WHERE "ingredientId" = ANY($2)
             RETURNING "ingredientId", "name", "category"`,
            [newCategory, validIds]
        );

        res.json({
            success: true,
            data: {
                updatedCount: result.rows.length,
                updatedIngredients: result.rows
            },
            message: `Successfully updated ${result.rows.length} ingredients to category "${newCategory}"`
        });
    } catch (err) {
        next(err);
    }
});

// ===== USER PREFERENCE INTEGRATION =====

/**
 * Get ingredients with user preference data
 * GET /api/ingredients/with-preferences/:userId
 */
router.get('/with-preferences/:userId', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        const searchParams = ingredientSearchSchema.parse(req.query);

        if (isNaN(userId) || userId <= 0) {
            throw new ClientError(400, 'Invalid user ID');
        }

        let whereConditions = ['TRUE']; // Base condition
        let queryParams = [userId]; // userId is always first parameter
        let paramIndex = 2;

        // Build dynamic WHERE clause
        if (searchParams.query) {
            whereConditions.push(`i."name" ILIKE $${paramIndex}`);
            queryParams.push(`%${searchParams.query}%`);
            paramIndex++;
        }

        if (searchParams.category) {
            whereConditions.push(`i."category" ILIKE $${paramIndex}`);
            queryParams.push(searchParams.category);
            paramIndex++;
        }

        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

        // Add pagination parameters
        queryParams.push(searchParams.limit, searchParams.offset);

        const query = `
            SELECT i.*, 
                   COALESCE(uip."preference", 'none') as user_preference,
                   COALESCE(
                       (SELECT COUNT(*)
                        FROM "recipeIngredients" ri
                        WHERE ri."ingredientId" = i."ingredientId"
                       ), 0) as usage_count
            FROM "ingredients" i
            LEFT JOIN "userIngredientPreferences" uip ON i."ingredientId" = uip."ingredientId" AND uip."userId" = $1
            ${whereClause}
            ORDER BY i."name" ASC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        const results = await db.query(query, queryParams);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM "ingredients" i
            ${whereClause.replace('WHERE TRUE AND', 'WHERE')}
        `;
        const countResult = await db.query(countQuery, queryParams.slice(1, -2)); // Remove userId and pagination

        res.json({
            success: true,
            data: {
                ingredients: results.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].total),
                    limit: searchParams.limit,
                    offset: searchParams.offset,
                    hasMore: (searchParams.offset + searchParams.limit) < parseInt(countResult.rows[0].total)
                }
            }
        });
    } catch (err) {
        next(err);
    }
});

// ===== SUGGESTIONS AND DISCOVERY =====

/**
 * Get ingredient suggestions for recipe generation
 * GET /api/ingredients/suggestions
 */
router.get('/suggestions/discover', async (req, res, next) => {
    try {
        const { cuisine, category, limit = 20 } = req.query;

        const limitNum = Math.min(parseInt(limit as string) || 20, 50);

        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (cuisine) {
            whereConditions.push(`r."cuisine" ILIKE $${paramIndex}`);
            queryParams.push(`%${cuisine}%`);
            paramIndex++;
        }

        if (category) {
            whereConditions.push(`i."category" ILIKE $${paramIndex}`);
            queryParams.push(`%${category}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        queryParams.push(limitNum);

        const suggestionsQuery = `
            SELECT i.*, 
                   COUNT(DISTINCT ri."recipeId") as recipe_count,
                   COUNT(DISTINCT r."cuisine") as cuisine_count,
                   array_agg(DISTINCT r."cuisine") FILTER (WHERE r."cuisine" IS NOT NULL) as cuisines
            FROM "ingredients" i
            JOIN "recipeIngredients" ri ON i."ingredientId" = ri."ingredientId"
            JOIN "recipes" r ON ri."recipeId" = r."recipeId"
            ${whereClause}
            GROUP BY i."ingredientId", i."name", i."category"
            ORDER BY recipe_count DESC, i."name" ASC
            LIMIT $${paramIndex}
        `;

        const results = await db.query(suggestionsQuery, queryParams);

        res.json({
            success: true,
            data: {
                suggestions: results.rows,
                filters: {
                    cuisine: cuisine || null,
                    category: category || null
                }
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Get trending ingredients (most used recently)
 * GET /api/ingredients/trending
 */
router.get('/trending/popular', async (req, res, next) => {
    try {
        const { days = 30, limit = 20 } = req.query;

        const daysNum = Math.min(parseInt(days as string) || 30, 365);
        const limitNum = Math.min(parseInt(limit as string) || 20, 50);

        const trendingQuery = `
            SELECT i.*, 
                   COUNT(DISTINCT ri."recipeId") as recent_usage,
                   COUNT(DISTINCT r."userId") as user_count,
                   ROUND(
                       COUNT(DISTINCT ri."recipeId")::decimal / 
                       GREATEST(1, (SELECT COUNT(*) FROM "recipes" WHERE "createdAt" >= NOW() - INTERVAL '${daysNum} days')::decimal) * 100, 
                       2
                   ) as usage_percentage
            FROM "ingredients" i
            JOIN "recipeIngredients" ri ON i."ingredientId" = ri."ingredientId"
            JOIN "recipes" r ON ri."recipeId" = r."recipeId"
            WHERE r."createdAt" >= NOW() - INTERVAL '${daysNum} days'
            GROUP BY i."ingredientId", i."name", i."category"
            HAVING COUNT(DISTINCT ri."recipeId") >= 2
            ORDER BY recent_usage DESC, user_count DESC
            LIMIT $1
        `;

        const results = await db.query(trendingQuery, [limitNum]);

        res.json({
            success: true,
            data: {
                trending: results.rows,
                period: `${daysNum} days`,
                totalTrending: results.rows.length
            }
        });
    } catch (err) {
        next(err);
    }
});

export default router; 