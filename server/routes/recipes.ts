import express from 'express';
import { generateRecipe, OpenAIConnectionError, OpenAIResponseValidationError } from '../lib/openai';
import { recipeGenerationRequestSchema } from '../schemas/openaiSchemas';
import { createRecipeSchema, updateRecipeSchema, recipeIdSchema } from '../schemas/recipeSchemas';
import db from '../db/db';
import { ClientError } from '../lib';
import { z } from 'zod';

const router = express.Router();

// Additional schemas for new functionality
const recipeRatingSchema = z.object({
    userId: z.number().int().positive(),
    rating: z.number().min(1).max(5),
    review: z.string().optional()
});

const recipeCollectionSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    isPublic: z.boolean().default(false)
});

const bulkRecipeActionSchema = z.object({
    recipeIds: z.array(z.number().int().positive()).min(1).max(50),
    action: z.enum(['favorite', 'unfavorite', 'save', 'unsave', 'delete'])
});

const recipeSearchSchema = z.object({
    query: z.string().optional(),
    cuisine: z.string().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    maxCookingTime: z.number().int().positive().optional(),
    spiceLevel: z.enum(['mild', 'medium', 'hot']).optional(),
    ingredients: z.array(z.string()).optional(),
    excludeIngredients: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    rating: z.number().min(1).max(5).optional(),
    limit: z.number().int().positive().max(100).default(20),
    offset: z.number().int().min(0).default(0)
});

/**
 * Generate a recipe based on user preferences and specified parameters
 */
router.post('/generate', async (req, res, next) => {
    try {
        // Validate request body
        const validatedData = recipeGenerationRequestSchema.parse(req.body);
        const { userId } = validatedData;

        // Get user preferences from database
        const userPrefsResult = await db.query(
            'SELECT * FROM "userPreferences" WHERE "userId" = $1',
            [userId]
        );

        if (userPrefsResult.rows.length === 0) {
            throw new ClientError(404, 'User preferences not found');
        }

        const userPreferences = userPrefsResult.rows[0];

        // Get user ingredient preferences
        const ingredientPrefsResult = await db.query(
            `SELECT uip.*, i."name", i."category" 
             FROM "userIngredientPreferences" uip
             JOIN "ingredients" i ON uip."ingredientId" = i."ingredientId"
             WHERE uip."userId" = $1`,
            [userId]
        );

        // Get all ingredients for reference
        const ingredientsResult = await db.query('SELECT * FROM "ingredients"');

        // Generate recipe using OpenAI
        try {
            const result = await generateRecipe({
                userPreferences,
                ingredientPreferences: ingredientPrefsResult.rows,
                ingredients: ingredientsResult.rows,
                includeIngredients: validatedData.includeIngredients,
                excludeIngredients: validatedData.excludeIngredients,
                cuisine: validatedData.cuisine,
                mealType: validatedData.mealType,
                cookingTime: validatedData.cookingTime,
                difficulty: validatedData.difficulty,
                customMessage: validatedData.message
            });

            const { recipe, generatedPrompt, fallback } = result;

            // If it's a fallback recipe, still return it but with a warning
            if (fallback) {
                res.status(207).json({
                    warning: "Could not generate a proper recipe. Returning a fallback recipe instead.",
                    fallback: true,
                    recipe,
                    generatedPrompt
                });
                return;
            }

            // Save the generated recipe to the database
            const recipeInsertResult = await db.query(
                `INSERT INTO "recipes" (
                    "userId", "title", "description", "instructions", "cookingTime", 
                    "prepTime", "servings", "cuisine", "difficulty", "spiceLevel", 
                    "isGenerated", "generatedPrompt"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING "recipeId"`,
                [
                    userId,
                    recipe.title,
                    recipe.description || '',
                    recipe.instructions,
                    recipe.cookingTime || null,
                    recipe.prepTime || null,
                    recipe.servings || userPreferences.servingSize,
                    recipe.cuisine || null,
                    recipe.difficulty || null,
                    recipe.spiceLevel || userPreferences.spiceLevel,
                    true,
                    generatedPrompt
                ]
            );

            const recipeId = recipeInsertResult.rows[0].recipeId;

            // Save recipe ingredients
            for (const ingredient of recipe.ingredients) {
                // Check if ingredient exists, create if not
                let ingredientId;
                const ingredientResult = await db.query(
                    'SELECT "ingredientId" FROM "ingredients" WHERE LOWER("name") = LOWER($1)',
                    [ingredient.name]
                );

                if (ingredientResult.rows.length === 0) {
                    const newIngredientResult = await db.query(
                        'INSERT INTO "ingredients" ("name", "category") VALUES ($1, $2) RETURNING "ingredientId"',
                        [ingredient.name, 'other'] // Default category
                    );
                    ingredientId = newIngredientResult.rows[0].ingredientId;
                } else {
                    ingredientId = ingredientResult.rows[0].ingredientId;
                }

                // Add to recipe_ingredients
                await db.query(
                    'INSERT INTO "recipeIngredients" ("recipeId", "ingredientId", "quantity") VALUES ($1, $2, $3)',
                    [recipeId, ingredientId, ingredient.quantity]
                );
            }

            // Save any recipe tips as tags
            if (recipe.tips && recipe.tips.length > 0) {
                for (const tip of recipe.tips) {
                    await db.query(
                        'INSERT INTO "recipeTags" ("recipeId", "tag") VALUES ($1, $2)',
                        [recipeId, tip]
                    );
                }
            }

            // Return the complete recipe with its ID
            res.status(201).json({
                recipeId,
                ...recipe,
                generatedPrompt
            });
        } catch (openAIError) {
            // Special handling for OpenAI-specific errors
            if (openAIError instanceof OpenAIConnectionError) {
                console.error('OpenAI connection error:', openAIError.originalError);
                throw new ClientError(503, 'Unable to connect to the recipe generation service. Please try again later.');
            } else if (openAIError instanceof OpenAIResponseValidationError) {
                console.error('OpenAI validation error:', openAIError.validationErrors);
                console.error('Invalid response:', openAIError.response);
                throw new ClientError(422, 'The recipe generation service produced an invalid response. Please try again with different parameters.');
            }
            // If it's not one of our custom errors, rethrow it
            throw openAIError;
        }
    } catch (err) {
        next(err);
    }
});

/**
 * Advanced recipe search with filtering and pagination
 * GET /api/recipes/search
 */
router.get('/search', async (req, res, next) => {
    try {
        const searchParams = recipeSearchSchema.parse(req.query);

        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        // Build dynamic WHERE clause
        if (searchParams.query) {
            whereConditions.push(`(r."title" ILIKE $${paramIndex} OR r."description" ILIKE $${paramIndex})`);
            queryParams.push(`%${searchParams.query}%`);
            paramIndex++;
        }

        if (searchParams.cuisine) {
            whereConditions.push(`r."cuisine" ILIKE $${paramIndex}`);
            queryParams.push(searchParams.cuisine);
            paramIndex++;
        }

        if (searchParams.difficulty) {
            whereConditions.push(`r."difficulty" = $${paramIndex}`);
            queryParams.push(searchParams.difficulty);
            paramIndex++;
        }

        if (searchParams.maxCookingTime) {
            whereConditions.push(`r."cookingTime" <= $${paramIndex}`);
            queryParams.push(searchParams.maxCookingTime);
            paramIndex++;
        }

        if (searchParams.spiceLevel) {
            whereConditions.push(`r."spiceLevel" = $${paramIndex}`);
            queryParams.push(searchParams.spiceLevel);
            paramIndex++;
        }

        if (searchParams.ingredients && searchParams.ingredients.length > 0) {
            whereConditions.push(`r."recipeId" IN (
                SELECT DISTINCT ri."recipeId" 
                FROM "recipeIngredients" ri
                JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                WHERE i."name" ILIKE ANY($${paramIndex})
            )`);
            queryParams.push(searchParams.ingredients.map(ing => `%${ing}%`));
            paramIndex++;
        }

        if (searchParams.excludeIngredients && searchParams.excludeIngredients.length > 0) {
            whereConditions.push(`r."recipeId" NOT IN (
                SELECT DISTINCT ri."recipeId" 
                FROM "recipeIngredients" ri
                JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                WHERE i."name" ILIKE ANY($${paramIndex})
            )`);
            queryParams.push(searchParams.excludeIngredients.map(ing => `%${ing}%`));
            paramIndex++;
        }

        if (searchParams.tags && searchParams.tags.length > 0) {
            whereConditions.push(`r."recipeId" IN (
                SELECT DISTINCT rt."recipeId"
                FROM "recipeTags" rt
                WHERE rt."tag" ILIKE ANY($${paramIndex})
            )`);
            queryParams.push(searchParams.tags.map(tag => `%${tag}%`));
            paramIndex++;
        }

        if (searchParams.rating) {
            whereConditions.push(`(
                SELECT COALESCE(AVG(rr."rating"), 0)
                FROM "recipeRatings" rr
                WHERE rr."recipeId" = r."recipeId"
            ) >= $${paramIndex}`);
            queryParams.push(searchParams.rating);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Add pagination parameters
        queryParams.push(searchParams.limit, searchParams.offset);

        const searchQuery = `
            SELECT r.*, 
                   COALESCE(
                       (SELECT json_agg(
                           json_build_object(
                               'ingredientId', ri."ingredientId",
                               'name', i."name",
                               'quantity', ri."quantity"
                           )
                       )
                       FROM "recipeIngredients" ri
                       JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                       WHERE ri."recipeId" = r."recipeId"
                       ), '[]'::json) as ingredients,
                   COALESCE(
                       (SELECT json_agg(rt."tag")
                       FROM "recipeTags" rt
                       WHERE rt."recipeId" = r."recipeId"
                       ), '[]'::json) as tags,
                   COALESCE(
                       (SELECT ROUND(AVG(rr."rating"), 2)
                       FROM "recipeRatings" rr
                       WHERE rr."recipeId" = r."recipeId"
                       ), 0) as avgRating,
                   COALESCE(
                       (SELECT COUNT(*)
                       FROM "recipeRatings" rr
                       WHERE rr."recipeId" = r."recipeId"
                       ), 0) as ratingCount
            FROM "recipes" r
            ${whereClause}
            ORDER BY r."createdAt" DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        const results = await db.query(searchQuery, queryParams);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM "recipes" r
            ${whereClause}
        `;
        const countResult = await db.query(countQuery, queryParams.slice(0, -2)); // Remove limit/offset

        res.json({
            success: true,
            data: {
                recipes: results.rows,
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
 * Get all recipes for a specific user
 * GET /api/users/:userId/recipes
 */
router.get('/user/:userId', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.userId, 10);

        if (isNaN(userId) || userId <= 0) {
            throw new ClientError(400, 'Invalid user ID');
        }

        // Get all recipes for the user with ratings
        const recipesResult = await db.query(
            `SELECT r.*, 
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object(
                                'ingredientId', ri."ingredientId",
                                'name', i."name",
                                'quantity', ri."quantity"
                            )
                        )
                        FROM "recipeIngredients" ri
                        JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                        WHERE ri."recipeId" = r."recipeId"
                        ), '[]'::json) as ingredients,
                    COALESCE(
                        (SELECT json_agg(rt."tag")
                        FROM "recipeTags" rt
                        WHERE rt."recipeId" = r."recipeId"
                        ), '[]'::json) as tags,
                    COALESCE(
                        (SELECT ROUND(AVG(rr."rating"), 2)
                        FROM "recipeRatings" rr
                        WHERE rr."recipeId" = r."recipeId"
                        ), 0) as avgRating,
                    COALESCE(
                        (SELECT COUNT(*)
                        FROM "recipeRatings" rr
                        WHERE rr."recipeId" = r."recipeId"
                        ), 0) as ratingCount
            FROM "recipes" r
            WHERE r."userId" = $1
            ORDER BY r."createdAt" DESC`,
            [userId]
        );

        res.json({
            success: true,
            data: recipesResult.rows
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Get a specific recipe by ID
 * GET /api/recipes/:recipeId
 */
router.get('/:recipeId', async (req, res, next) => {
    try {
        const { recipeId } = recipeIdSchema.parse({ recipeId: req.params.recipeId });

        const recipeResult = await db.query(
            `SELECT r.*, 
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object(
                                'ingredientId', ri."ingredientId",
                                'name', i."name",
                                'quantity', ri."quantity"
                            )
                        )
                        FROM "recipeIngredients" ri
                        JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                        WHERE ri."recipeId" = r."recipeId"
                        ), '[]'::json) as ingredients,
                    COALESCE(
                        (SELECT json_agg(rt."tag")
                        FROM "recipeTags" rt
                        WHERE rt."recipeId" = r."recipeId"
                        ), '[]'::json) as tags,
                    COALESCE(
                        (SELECT ROUND(AVG(rr."rating"), 2)
                        FROM "recipeRatings" rr
                        WHERE rr."recipeId" = r."recipeId"
                        ), 0) as avgRating,
                    COALESCE(
                        (SELECT COUNT(*)
                        FROM "recipeRatings" rr
                        WHERE rr."recipeId" = r."recipeId"
                        ), 0) as ratingCount,
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object(
                                'id', rr."id",
                                'userId', rr."userId",
                                'rating', rr."rating",
                                'review', rr."review",
                                'createdAt', rr."createdAt",
                                'userName', u."name"
                            )
                        )
                        FROM "recipeRatings" rr
                        JOIN "users" u ON rr."userId" = u."userId"
                        WHERE rr."recipeId" = r."recipeId"
                        ORDER BY rr."createdAt" DESC
                        ), '[]'::json) as ratings
            FROM "recipes" r
            WHERE r."recipeId" = $1`,
            [recipeId]
        );

        if (recipeResult.rows.length === 0) {
            throw new ClientError(404, 'Recipe not found');
        }

        res.json({
            success: true,
            data: recipeResult.rows[0]
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Create a new recipe manually
 * POST /api/users/:userId/recipes
 */
router.post('/user/:userId', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.userId, 10);

        if (isNaN(userId) || userId <= 0) {
            throw new ClientError(400, 'Invalid user ID');
        }

        // Validate recipe data
        const recipeData = createRecipeSchema.parse(req.body);

        // Start a transaction
        await db.query('BEGIN');

        try {
            // Insert recipe
            const recipeInsertResult = await db.query(
                `INSERT INTO "recipes" (
                    "userId", "title", "description", "instructions", "cookingTime", 
                    "prepTime", "servings", "cuisine", "difficulty", "spiceLevel", 
                    "isGenerated", "generatedPrompt"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING "recipeId"`,
                [
                    userId,
                    recipeData.title,
                    recipeData.description || '',
                    recipeData.instructions,
                    recipeData.cookingTime || null,
                    recipeData.prepTime || null,
                    recipeData.servings || null,
                    recipeData.cuisine || null,
                    recipeData.difficulty || null,
                    recipeData.spiceLevel || null,
                    recipeData.isGenerated || false,
                    recipeData.generatedPrompt || null
                ]
            );

            const recipeId = recipeInsertResult.rows[0].recipeId;

            // Insert ingredients
            for (const ingredient of recipeData.ingredients) {
                await db.query(
                    'INSERT INTO "recipeIngredients" ("recipeId", "ingredientId", "quantity") VALUES ($1, $2, $3)',
                    [recipeId, ingredient.ingredientId, ingredient.quantity || null]
                );
            }

            // Insert tags if provided
            if (recipeData.tags) {
                for (const tag of recipeData.tags) {
                    await db.query(
                        'INSERT INTO "recipeTags" ("recipeId", "tag") VALUES ($1, $2)',
                        [recipeId, tag]
                    );
                }
            }

            // Commit the transaction
            await db.query('COMMIT');

            // Return the created recipe
            res.status(201).json({
                success: true,
                data: {
                    recipeId,
                    ...recipeData
                },
                message: 'Recipe created successfully'
            });
        } catch (dbError) {
            // Rollback in case of any error
            await db.query('ROLLBACK');
            throw dbError;
        }
    } catch (err) {
        next(err);
    }
});

/**
 * Update an existing recipe
 * PUT /api/recipes/:recipeId
 */
router.put('/:recipeId', async (req, res, next) => {
    try {
        const { recipeId } = recipeIdSchema.parse({ recipeId: req.params.recipeId });

        // Validate update data
        const updateData = updateRecipeSchema.parse(req.body);

        // Check if recipe exists and get the current recipe
        const recipeCheck = await db.query(
            'SELECT * FROM "recipes" WHERE "recipeId" = $1',
            [recipeId]
        );

        if (recipeCheck.rows.length === 0) {
            throw new ClientError(404, 'Recipe not found');
        }

        const currentRecipe = recipeCheck.rows[0];

        // Start a transaction
        await db.query('BEGIN');

        try {
            // Update recipe base information
            const updateFields = [];
            const updateValues = [];
            let valueCounter = 1;

            // Only update fields that are provided in the update request
            if (updateData.title !== undefined) {
                updateFields.push(`"title" = $${valueCounter++}`);
                updateValues.push(updateData.title);
            }

            if (updateData.description !== undefined) {
                updateFields.push(`"description" = $${valueCounter++}`);
                updateValues.push(updateData.description);
            }

            if (updateData.instructions !== undefined) {
                updateFields.push(`"instructions" = $${valueCounter++}`);
                updateValues.push(updateData.instructions);
            }

            if (updateData.cookingTime !== undefined) {
                updateFields.push(`"cookingTime" = $${valueCounter++}`);
                updateValues.push(updateData.cookingTime);
            }

            if (updateData.prepTime !== undefined) {
                updateFields.push(`"prepTime" = $${valueCounter++}`);
                updateValues.push(updateData.prepTime);
            }

            if (updateData.servings !== undefined) {
                updateFields.push(`"servings" = $${valueCounter++}`);
                updateValues.push(updateData.servings);
            }

            if (updateData.cuisine !== undefined) {
                updateFields.push(`"cuisine" = $${valueCounter++}`);
                updateValues.push(updateData.cuisine);
            }

            if (updateData.difficulty !== undefined) {
                updateFields.push(`"difficulty" = $${valueCounter++}`);
                updateValues.push(updateData.difficulty);
            }

            if (updateData.spiceLevel !== undefined) {
                updateFields.push(`"spiceLevel" = $${valueCounter++}`);
                updateValues.push(updateData.spiceLevel);
            }

            if (updateData.isFavorite !== undefined) {
                updateFields.push(`"isFavorite" = $${valueCounter++}`);
                updateValues.push(updateData.isFavorite);
            }

            // If we have fields to update
            if (updateFields.length > 0) {
                updateValues.push(recipeId);
                await db.query(
                    `UPDATE "recipes"
                    SET ${updateFields.join(', ')}
                    WHERE "recipeId" = $${valueCounter}`,
                    updateValues
                );
            }

            // Update ingredients if provided
            if (updateData.ingredients !== undefined) {
                // Delete existing ingredients
                await db.query(
                    'DELETE FROM "recipeIngredients" WHERE "recipeId" = $1',
                    [recipeId]
                );

                // Insert new ingredients
                for (const ingredient of updateData.ingredients) {
                    await db.query(
                        'INSERT INTO "recipeIngredients" ("recipeId", "ingredientId", "quantity") VALUES ($1, $2, $3)',
                        [recipeId, ingredient.ingredientId, ingredient.quantity || null]
                    );
                }
            }

            // Update tags if provided
            if (updateData.tags !== undefined) {
                // Delete existing tags
                await db.query(
                    'DELETE FROM "recipeTags" WHERE "recipeId" = $1',
                    [recipeId]
                );

                // Insert new tags
                for (const tag of updateData.tags) {
                    await db.query(
                        'INSERT INTO "recipeTags" ("recipeId", "tag") VALUES ($1, $2)',
                        [recipeId, tag]
                    );
                }
            }

            // Commit the transaction
            await db.query('COMMIT');

            // Get the updated recipe with ingredients
            const updatedRecipeResult = await db.query(
                `SELECT r.*, 
                        COALESCE(
                            (SELECT json_agg(
                                json_build_object(
                                    'ingredientId', ri."ingredientId",
                                    'name', i."name",
                                    'quantity', ri."quantity"
                                )
                            )
                            FROM "recipeIngredients" ri
                            JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                            WHERE ri."recipeId" = r."recipeId"
                            ), '[]'::json) as ingredients,
                        COALESCE(
                            (SELECT json_agg(rt."tag")
                            FROM "recipeTags" rt
                            WHERE rt."recipeId" = r."recipeId"
                            ), '[]'::json) as tags
                FROM "recipes" r
                WHERE r."recipeId" = $1`,
                [recipeId]
            );

            res.json({
                success: true,
                data: updatedRecipeResult.rows[0],
                message: 'Recipe updated successfully'
            });
        } catch (dbError) {
            // Rollback in case of any error
            await db.query('ROLLBACK');
            throw dbError;
        }
    } catch (err) {
        next(err);
    }
});

/**
 * Delete a recipe
 * DELETE /api/recipes/:recipeId
 */
router.delete('/:recipeId', async (req, res, next) => {
    try {
        const { recipeId } = recipeIdSchema.parse({ recipeId: req.params.recipeId });

        // Check if recipe exists
        const recipeCheck = await db.query(
            'SELECT * FROM "recipes" WHERE "recipeId" = $1',
            [recipeId]
        );

        if (recipeCheck.rows.length === 0) {
            throw new ClientError(404, 'Recipe not found');
        }

        // Delete the recipe (cascading will handle related records)
        await db.query(
            'DELETE FROM "recipes" WHERE "recipeId" = $1',
            [recipeId]
        );

        res.json({
            success: true,
            message: 'Recipe deleted successfully'
        });
    } catch (err) {
        next(err);
    }
});

// ===== RECIPE RATING SYSTEM =====

/**
 * Rate a recipe
 * POST /api/recipes/:recipeId/rating
 */
router.post('/:recipeId/rating', async (req, res, next) => {
    try {
        const { recipeId } = recipeIdSchema.parse({ recipeId: req.params.recipeId });
        const ratingData = recipeRatingSchema.parse(req.body);

        // Check if recipe exists
        const recipeCheck = await db.query(
            'SELECT 1 FROM "recipes" WHERE "recipeId" = $1',
            [recipeId]
        );

        if (recipeCheck.rows.length === 0) {
            throw new ClientError(404, 'Recipe not found');
        }

        // Check if user has already rated this recipe
        const existingRating = await db.query(
            'SELECT "id" FROM "recipeRatings" WHERE "recipeId" = $1 AND "userId" = $2',
            [recipeId, ratingData.userId]
        );

        if (existingRating.rows.length > 0) {
            // Update existing rating
            const result = await db.query(
                `UPDATE "recipeRatings" 
                 SET "rating" = $1, "review" = $2, "updatedAt" = NOW()
                 WHERE "recipeId" = $3 AND "userId" = $4
                 RETURNING *`,
                [ratingData.rating, ratingData.review || null, recipeId, ratingData.userId]
            );

            res.json({
                success: true,
                data: result.rows[0],
                message: 'Recipe rating updated successfully'
            });
        } else {
            // Create new rating
            const result = await db.query(
                `INSERT INTO "recipeRatings" ("recipeId", "userId", "rating", "review")
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [recipeId, ratingData.userId, ratingData.rating, ratingData.review || null]
            );

            res.status(201).json({
                success: true,
                data: result.rows[0],
                message: 'Recipe rating added successfully'
            });
        }
    } catch (err) {
        next(err);
    }
});

/**
 * Delete a recipe rating
 * DELETE /api/recipes/:recipeId/rating/:userId
 */
router.delete('/:recipeId/rating/:userId', async (req, res, next) => {
    try {
        const { recipeId } = recipeIdSchema.parse({ recipeId: req.params.recipeId });
        const userId = parseInt(req.params.userId, 10);

        if (isNaN(userId) || userId <= 0) {
            throw new ClientError(400, 'Invalid user ID');
        }

        const result = await db.query(
            'DELETE FROM "recipeRatings" WHERE "recipeId" = $1 AND "userId" = $2 RETURNING *',
            [recipeId, userId]
        );

        if (result.rows.length === 0) {
            throw new ClientError(404, 'Recipe rating not found');
        }

        res.json({
            success: true,
            message: 'Recipe rating deleted successfully'
        });
    } catch (err) {
        next(err);
    }
});

// ===== RECIPE FAVORITING =====

/**
 * Toggle recipe favorite status
 * POST /api/recipes/:recipeId/favorite
 */
router.post('/:recipeId/favorite', async (req, res, next) => {
    try {
        const { recipeId } = recipeIdSchema.parse({ recipeId: req.params.recipeId });
        const { userId } = req.body;

        if (!userId || isNaN(parseInt(userId, 10)) || parseInt(userId, 10) <= 0) {
            throw new ClientError(400, 'Valid user ID is required');
        }

        // Check if recipe exists and belongs to user
        const recipeCheck = await db.query(
            'SELECT "isFavorite" FROM "recipes" WHERE "recipeId" = $1 AND "userId" = $2',
            [recipeId, userId]
        );

        if (recipeCheck.rows.length === 0) {
            throw new ClientError(404, 'Recipe not found or does not belong to user');
        }

        const currentFavoriteStatus = recipeCheck.rows[0].isFavorite;
        const newFavoriteStatus = !currentFavoriteStatus;

        // Update favorite status
        await db.query(
            'UPDATE "recipes" SET "isFavorite" = $1 WHERE "recipeId" = $2',
            [newFavoriteStatus, recipeId]
        );

        res.json({
            success: true,
            data: {
                recipeId: parseInt(recipeId, 10),
                isFavorite: newFavoriteStatus
            },
            message: `Recipe ${newFavoriteStatus ? 'added to' : 'removed from'} favorites`
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Get user's favorite recipes
 * GET /api/users/:userId/favorites
 */
router.get('/user/:userId/favorites', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.userId, 10);

        if (isNaN(userId) || userId <= 0) {
            throw new ClientError(400, 'Invalid user ID');
        }

        const favoritesResult = await db.query(
            `SELECT r.*, 
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object(
                                'ingredientId', ri."ingredientId",
                                'name', i."name",
                                'quantity', ri."quantity"
                            )
                        )
                        FROM "recipeIngredients" ri
                        JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                        WHERE ri."recipeId" = r."recipeId"
                        ), '[]'::json) as ingredients,
                    COALESCE(
                        (SELECT json_agg(rt."tag")
                        FROM "recipeTags" rt
                        WHERE rt."recipeId" = r."recipeId"
                        ), '[]'::json) as tags
            FROM "recipes" r
            WHERE r."userId" = $1 AND r."isFavorite" = true
            ORDER BY r."createdAt" DESC`,
            [userId]
        );

        res.json({
            success: true,
            data: favoritesResult.rows
        });
    } catch (err) {
        next(err);
    }
});

// ===== BULK OPERATIONS =====

/**
 * Bulk recipe operations
 * POST /api/recipes/bulk
 */
router.post('/bulk', async (req, res, next) => {
    try {
        const bulkData = bulkRecipeActionSchema.parse(req.body);
        const { userId } = req.body;

        if (!userId || isNaN(parseInt(userId, 10)) || parseInt(userId, 10) <= 0) {
            throw new ClientError(400, 'Valid user ID is required');
        }

        let results = [];

        await db.query('BEGIN');

        try {
            switch (bulkData.action) {
                case 'favorite':
                    for (const recipeId of bulkData.recipeIds) {
                        const result = await db.query(
                            'UPDATE "recipes" SET "isFavorite" = true WHERE "recipeId" = $1 AND "userId" = $2 RETURNING "recipeId"',
                            [recipeId, userId]
                        );
                        if (result.rows.length > 0) {
                            results.push({ recipeId, success: true });
                        } else {
                            results.push({ recipeId, success: false, error: 'Recipe not found or does not belong to user' });
                        }
                    }
                    break;

                case 'unfavorite':
                    for (const recipeId of bulkData.recipeIds) {
                        const result = await db.query(
                            'UPDATE "recipes" SET "isFavorite" = false WHERE "recipeId" = $1 AND "userId" = $2 RETURNING "recipeId"',
                            [recipeId, userId]
                        );
                        if (result.rows.length > 0) {
                            results.push({ recipeId, success: true });
                        } else {
                            results.push({ recipeId, success: false, error: 'Recipe not found or does not belong to user' });
                        }
                    }
                    break;

                case 'save':
                    for (const recipeId of bulkData.recipeIds) {
                        try {
                            await db.query(
                                'INSERT INTO "savedRecipes" ("userId", "recipeId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
                                [userId, recipeId]
                            );
                            results.push({ recipeId, success: true });
                        } catch (error) {
                            results.push({ recipeId, success: false, error: 'Failed to save recipe' });
                        }
                    }
                    break;

                case 'unsave':
                    for (const recipeId of bulkData.recipeIds) {
                        await db.query(
                            'DELETE FROM "savedRecipes" WHERE "userId" = $1 AND "recipeId" = $2',
                            [userId, recipeId]
                        );
                        results.push({ recipeId, success: true });
                    }
                    break;

                case 'delete':
                    for (const recipeId of bulkData.recipeIds) {
                        const result = await db.query(
                            'DELETE FROM "recipes" WHERE "recipeId" = $1 AND "userId" = $2 RETURNING "recipeId"',
                            [recipeId, userId]
                        );
                        if (result.rows.length > 0) {
                            results.push({ recipeId, success: true });
                        } else {
                            results.push({ recipeId, success: false, error: 'Recipe not found or does not belong to user' });
                        }
                    }
                    break;
            }

            await db.query('COMMIT');

            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;

            res.json({
                success: true,
                data: {
                    processed: results.length,
                    successful: successCount,
                    failed: failCount,
                    results: results
                },
                message: `Bulk ${bulkData.action} completed: ${successCount} successful, ${failCount} failed`
            });
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (err) {
        next(err);
    }
});

/**
 * Save a recipe to user's favorites
 * POST /api/recipes/:recipeId/save
 */
router.post('/:recipeId/save', async (req, res, next) => {
    try {
        const { recipeId } = recipeIdSchema.parse({ recipeId: req.params.recipeId });
        const { userId } = req.body;

        if (!userId) {
            throw new ClientError(400, 'User ID is required');
        }

        // Check if recipe exists
        const recipeCheck = await db.query(
            'SELECT * FROM "recipes" WHERE "recipeId" = $1',
            [recipeId]
        );

        if (recipeCheck.rows.length === 0) {
            throw new ClientError(404, 'Recipe not found');
        }

        // Check if already saved
        const existingCheck = await db.query(
            'SELECT * FROM "savedRecipes" WHERE "userId" = $1 AND "recipeId" = $2',
            [userId, recipeId]
        );

        if (existingCheck.rows.length > 0) {
            // Already saved, return success
            res.json({
                success: true,
                message: 'Recipe already saved'
            });
            return;
        }

        // Save the recipe
        await db.query(
            'INSERT INTO "savedRecipes" ("userId", "recipeId") VALUES ($1, $2)',
            [userId, recipeId]
        );

        res.status(201).json({
            success: true,
            message: 'Recipe saved successfully'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Unsave a recipe from user's favorites
 * DELETE /api/recipes/:recipeId/save
 */
router.delete('/:recipeId/save', async (req, res, next) => {
    try {
        const { recipeId } = recipeIdSchema.parse({ recipeId: req.params.recipeId });
        const { userId } = req.body;

        if (!userId) {
            throw new ClientError(400, 'User ID is required');
        }

        // Remove from saved recipes
        await db.query(
            'DELETE FROM "savedRecipes" WHERE "userId" = $1 AND "recipeId" = $2',
            [userId, recipeId]
        );

        res.json({
            success: true,
            message: 'Recipe unsaved successfully'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Get user's saved recipes
 * GET /api/users/:userId/saved
 */
router.get('/user/:userId/saved', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.userId, 10);

        if (isNaN(userId) || userId <= 0) {
            throw new ClientError(400, 'Invalid user ID');
        }

        // Get saved recipes
        const savedRecipesResult = await db.query(
            `SELECT r.*, 
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object(
                                'ingredientId', ri."ingredientId",
                                'name', i."name",
                                'quantity', ri."quantity"
                            )
                        )
                        FROM "recipeIngredients" ri
                        JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                        WHERE ri."recipeId" = r."recipeId"
                        ), '[]'::json) as ingredients,
                    COALESCE(
                        (SELECT json_agg(rt."tag")
                        FROM "recipeTags" rt
                        WHERE rt."recipeId" = r."recipeId"
                        ), '[]'::json) as tags,
                    sr."savedAt"
            FROM "savedRecipes" sr
            JOIN "recipes" r ON sr."recipeId" = r."recipeId"
            WHERE sr."userId" = $1
            ORDER BY sr."savedAt" DESC`,
            [userId]
        );

        res.json({
            success: true,
            data: savedRecipesResult.rows
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Generate ingredient substitutions for a recipe
 * POST /api/recipes/:recipeId/substitutions
 */
router.post('/:recipeId/substitutions', async (req, res, next) => {
    try {
        const { recipeId } = recipeIdSchema.parse({ recipeId: req.params.recipeId });
        const { ingredientId, dietaryRestrictions = [], preferences = [] } = req.body;

        if (!ingredientId) {
            throw new ClientError(400, 'Ingredient ID is required');
        }

        // Get the original ingredient
        const ingredientResult = await db.query(
            'SELECT * FROM "ingredients" WHERE "ingredientId" = $1',
            [ingredientId]
        );

        if (ingredientResult.rows.length === 0) {
            throw new ClientError(404, 'Ingredient not found');
        }

        const ingredient = ingredientResult.rows[0];

        // Mock AI-generated substitutions (in real implementation, this would call OpenAI)
        const mockSubstitutions = [
            {
                name: `${ingredient.name} alternative 1`,
                reason: 'Lower sodium option',
                ratio: 1.0,
                difficulty: 'easy',
                availability: 'common'
            },
            {
                name: `${ingredient.name} alternative 2`,
                reason: 'More accessible ingredient',
                ratio: 1.2,
                difficulty: 'easy',
                availability: 'common'
            },
            {
                name: `${ingredient.name} substitute 3`,
                reason: 'Healthier alternative',
                ratio: 0.8,
                difficulty: 'medium',
                availability: 'specialty'
            }
        ];

        res.json({
            success: true,
            data: {
                originalIngredient: ingredient,
                substitutions: mockSubstitutions
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Generate recipe variation
 * POST /api/recipes/:recipeId/variation
 */
router.post('/:recipeId/variation', async (req, res, next) => {
    try {
        const { recipeId } = recipeIdSchema.parse({ recipeId: req.params.recipeId });
        const { variationType, customInstructions } = req.body;

        if (!variationType) {
            throw new ClientError(400, 'Variation type is required');
        }

        // Get the original recipe
        const recipeResult = await db.query(
            `SELECT r.*, 
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object(
                                'ingredientId', ri."ingredientId",
                                'name', i."name",
                                'quantity', ri."quantity"
                            )
                        )
                        FROM "recipeIngredients" ri
                        JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                        WHERE ri."recipeId" = r."recipeId"
                        ), '[]'::json) as ingredients,
                    COALESCE(
                        (SELECT json_agg(rt."tag")
                        FROM "recipeTags" rt
                        WHERE rt."recipeId" = r."recipeId"
                        ), '[]'::json) as tags
            FROM "recipes" r
            WHERE r."recipeId" = $1`,
            [recipeId]
        );

        if (recipeResult.rows.length === 0) {
            throw new ClientError(404, 'Recipe not found');
        }

        const originalRecipe = recipeResult.rows[0];

        // Mock variation generation (in real implementation, this would call OpenAI)
        const originalInstructions = Array.isArray(originalRecipe.instructions)
            ? originalRecipe.instructions
            : [originalRecipe.instructions];

        const variationRecipe = {
            ...originalRecipe,
            title: `${originalRecipe.title} (${variationType})`,
            description: `${originalRecipe.description} - Adapted for ${variationType.toLowerCase()}`,
            instructions: [
                `Modified for ${variationType.toLowerCase()}:`,
                ...originalInstructions
            ],
            // Adjust cooking time based on variation type
            cookingTime: variationType === 'air-fryer' ?
                Math.max(10, originalRecipe.cookingTime - 10) :
                variationType === 'slow-cooker' ?
                    originalRecipe.cookingTime + 120 :
                    originalRecipe.cookingTime
        };

        res.json({
            success: true,
            data: {
                originalRecipe,
                variationRecipe,
                variationType
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Scale recipe ingredients for different serving sizes
 * POST /api/recipes/:recipeId/scale
 */
router.post('/:recipeId/scale', async (req, res, next) => {
    try {
        const { recipeId } = recipeIdSchema.parse({ recipeId: req.params.recipeId });
        const { newServings } = req.body;

        if (!newServings || newServings <= 0) {
            throw new ClientError(400, 'Valid serving size is required');
        }

        // Get the recipe with ingredients
        const recipeResult = await db.query(
            `SELECT r.*, 
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object(
                                'ingredientId', ri."ingredientId",
                                'name', i."name",
                                'quantity', ri."quantity"
                            )
                        )
                        FROM "recipeIngredients" ri
                        JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                        WHERE ri."recipeId" = r."recipeId"
                        ), '[]'::json) as ingredients
            FROM "recipes" r
            WHERE r."recipeId" = $1`,
            [recipeId]
        );

        if (recipeResult.rows.length === 0) {
            throw new ClientError(404, 'Recipe not found');
        }

        const recipe = recipeResult.rows[0];
        const originalServings = recipe.servings || 4;
        const scalingFactor = newServings / originalServings;

        // Scale ingredients
        const scaledIngredients = recipe.ingredients.map((ingredient: any) => ({
            ...ingredient,
            quantity: Math.round((parseFloat(ingredient.quantity) * scalingFactor) * 100) / 100
        }));

        const scaledRecipe = {
            ...recipe,
            servings: newServings,
            ingredients: scaledIngredients
        };

        res.json({
            success: true,
            data: {
                originalRecipe: recipe,
                scaledRecipe,
                scalingFactor
            }
        });
    } catch (err) {
        next(err);
    }
});

// ===== RECIPE COLLECTIONS =====

/**
 * Get user's collections
 * GET /api/users/:userId/collections
 */
router.get('/users/:userId/collections', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.userId, 10);

        if (isNaN(userId) || userId <= 0) {
            throw new ClientError(400, 'Invalid user ID');
        }

        const collectionsResult = await db.query(
            `SELECT rc.*, 
                    COALESCE(
                        (SELECT COUNT(*)::integer 
                         FROM "collectionRecipes" cr 
                         WHERE cr."collectionId" = rc."collectionId"
                        ), 0) as "recipeCount"
            FROM "recipeCollections" rc
            WHERE rc."userId" = $1
            ORDER BY rc."createdAt" DESC`,
            [userId]
        );

        res.json({
            success: true,
            data: collectionsResult.rows
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Create a new collection
 * POST /api/collections
 */
router.post('/collections', async (req, res, next) => {
    try {
        const collectionData = recipeCollectionSchema.parse(req.body);
        const { userId } = req.body;

        if (!userId || isNaN(parseInt(userId, 10)) || parseInt(userId, 10) <= 0) {
            throw new ClientError(400, 'Valid user ID is required');
        }

        // Check if collection name already exists for this user
        const existingCollection = await db.query(
            'SELECT "collectionId" FROM "recipeCollections" WHERE "userId" = $1 AND "name" = $2',
            [userId, collectionData.name]
        );

        if (existingCollection.rows.length > 0) {
            throw new ClientError(409, 'Collection with this name already exists');
        }

        const result = await db.query(
            `INSERT INTO "recipeCollections" ("userId", "name", "description", "isPublic")
             VALUES ($1, $2, $3, $4)
             RETURNING *, 0 as "recipeCount"`,
            [userId, collectionData.name, collectionData.description || null, collectionData.isPublic]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Collection created successfully'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Update a collection
 * PUT /api/collections/:collectionId
 */
router.put('/collections/:collectionId', async (req, res, next) => {
    try {
        const collectionId = parseInt(req.params.collectionId, 10);

        if (isNaN(collectionId) || collectionId <= 0) {
            throw new ClientError(400, 'Invalid collection ID');
        }

        const updateData = recipeCollectionSchema.partial().parse(req.body);
        const { userId } = req.body;

        if (!userId || isNaN(parseInt(userId, 10)) || parseInt(userId, 10) <= 0) {
            throw new ClientError(400, 'Valid user ID is required');
        }

        // Check if collection exists and belongs to user
        const collectionCheck = await db.query(
            'SELECT * FROM "recipeCollections" WHERE "collectionId" = $1 AND "userId" = $2',
            [collectionId, userId]
        );

        if (collectionCheck.rows.length === 0) {
            throw new ClientError(404, 'Collection not found or does not belong to user');
        }

        // If name is being updated, check for duplicates
        if (updateData.name) {
            const existingCollection = await db.query(
                'SELECT "collectionId" FROM "recipeCollections" WHERE "userId" = $1 AND "name" = $2 AND "collectionId" != $3',
                [userId, updateData.name, collectionId]
            );

            if (existingCollection.rows.length > 0) {
                throw new ClientError(409, 'Collection with this name already exists');
            }
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (updateData.name !== undefined) {
            updateFields.push(`"name" = $${paramIndex}`);
            updateValues.push(updateData.name);
            paramIndex++;
        }

        if (updateData.description !== undefined) {
            updateFields.push(`"description" = $${paramIndex}`);
            updateValues.push(updateData.description);
            paramIndex++;
        }

        if (updateData.isPublic !== undefined) {
            updateFields.push(`"isPublic" = $${paramIndex}`);
            updateValues.push(updateData.isPublic);
            paramIndex++;
        }

        updateFields.push(`"updatedAt" = NOW()`);
        updateValues.push(collectionId);

        const result = await db.query(
            `UPDATE "recipeCollections" 
             SET ${updateFields.join(', ')}
             WHERE "collectionId" = $${paramIndex}
             RETURNING *, 
                      (SELECT COUNT(*)::integer 
                       FROM "collectionRecipes" cr 
                       WHERE cr."collectionId" = $${paramIndex}) as "recipeCount"`,
            updateValues
        );

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Collection updated successfully'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Delete a collection
 * DELETE /api/collections/:collectionId
 */
router.delete('/collections/:collectionId', async (req, res, next) => {
    try {
        const collectionId = parseInt(req.params.collectionId, 10);

        if (isNaN(collectionId) || collectionId <= 0) {
            throw new ClientError(400, 'Invalid collection ID');
        }

        const { userId } = req.body;

        if (!userId || isNaN(parseInt(userId, 10)) || parseInt(userId, 10) <= 0) {
            throw new ClientError(400, 'Valid user ID is required');
        }

        // Check if collection exists and belongs to user
        const collectionCheck = await db.query(
            'SELECT * FROM "recipeCollections" WHERE "collectionId" = $1 AND "userId" = $2',
            [collectionId, userId]
        );

        if (collectionCheck.rows.length === 0) {
            throw new ClientError(404, 'Collection not found or does not belong to user');
        }

        // Delete the collection (cascading will handle collectionRecipes)
        await db.query(
            'DELETE FROM "recipeCollections" WHERE "collectionId" = $1',
            [collectionId]
        );

        res.json({
            success: true,
            message: 'Collection deleted successfully'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Get recipes in a collection
 * GET /api/collections/:collectionId/recipes
 */
router.get('/collections/:collectionId/recipes', async (req, res, next) => {
    try {
        const collectionId = parseInt(req.params.collectionId, 10);

        if (isNaN(collectionId) || collectionId <= 0) {
            throw new ClientError(400, 'Invalid collection ID');
        }

        // Check if collection exists
        const collectionCheck = await db.query(
            'SELECT * FROM "recipeCollections" WHERE "collectionId" = $1',
            [collectionId]
        );

        if (collectionCheck.rows.length === 0) {
            throw new ClientError(404, 'Collection not found');
        }

        const recipesResult = await db.query(
            `SELECT r.*, 
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object(
                                'ingredientId', ri."ingredientId",
                                'name', i."name",
                                'quantity', ri."quantity"
                            )
                        )
                        FROM "recipeIngredients" ri
                        JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                        WHERE ri."recipeId" = r."recipeId"
                        ), '[]'::json) as ingredients,
                    COALESCE(
                        (SELECT json_agg(rt."tag")
                        FROM "recipeTags" rt
                        WHERE rt."recipeId" = r."recipeId"
                        ), '[]'::json) as tags,
                    cr."addedAt"
            FROM "collectionRecipes" cr
            JOIN "recipes" r ON cr."recipeId" = r."recipeId"
            WHERE cr."collectionId" = $1
            ORDER BY cr."addedAt" DESC`,
            [collectionId]
        );

        res.json({
            success: true,
            data: recipesResult.rows
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Add recipe to collection
 * POST /api/collections/:collectionId/recipes
 */
router.post('/collections/:collectionId/recipes', async (req, res, next) => {
    try {
        const collectionId = parseInt(req.params.collectionId, 10);

        if (isNaN(collectionId) || collectionId <= 0) {
            throw new ClientError(400, 'Invalid collection ID');
        }

        const { recipeId, userId } = req.body;

        if (!recipeId || isNaN(parseInt(recipeId, 10)) || parseInt(recipeId, 10) <= 0) {
            throw new ClientError(400, 'Valid recipe ID is required');
        }

        if (!userId || isNaN(parseInt(userId, 10)) || parseInt(userId, 10) <= 0) {
            throw new ClientError(400, 'Valid user ID is required');
        }

        // Check if collection exists and belongs to user
        const collectionCheck = await db.query(
            'SELECT * FROM "recipeCollections" WHERE "collectionId" = $1 AND "userId" = $2',
            [collectionId, userId]
        );

        if (collectionCheck.rows.length === 0) {
            throw new ClientError(404, 'Collection not found or does not belong to user');
        }

        // Check if recipe exists
        const recipeCheck = await db.query(
            'SELECT * FROM "recipes" WHERE "recipeId" = $1',
            [recipeId]
        );

        if (recipeCheck.rows.length === 0) {
            throw new ClientError(404, 'Recipe not found');
        }

        // Check if recipe is already in collection
        const existingEntry = await db.query(
            'SELECT * FROM "collectionRecipes" WHERE "collectionId" = $1 AND "recipeId" = $2',
            [collectionId, recipeId]
        );

        if (existingEntry.rows.length > 0) {
            res.json({
                success: true,
                message: 'Recipe already in collection'
            });
            return;
        }

        // Add recipe to collection
        await db.query(
            'INSERT INTO "collectionRecipes" ("collectionId", "recipeId") VALUES ($1, $2)',
            [collectionId, recipeId]
        );

        res.status(201).json({
            success: true,
            message: 'Recipe added to collection successfully'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Remove recipe from collection
 * DELETE /api/collections/:collectionId/recipes/:recipeId
 */
router.delete('/collections/:collectionId/recipes/:recipeId', async (req, res, next) => {
    try {
        const collectionId = parseInt(req.params.collectionId, 10);
        const recipeId = parseInt(req.params.recipeId, 10);

        if (isNaN(collectionId) || collectionId <= 0) {
            throw new ClientError(400, 'Invalid collection ID');
        }

        if (isNaN(recipeId) || recipeId <= 0) {
            throw new ClientError(400, 'Invalid recipe ID');
        }

        const { userId } = req.body;

        if (!userId || isNaN(parseInt(userId, 10)) || parseInt(userId, 10) <= 0) {
            throw new ClientError(400, 'Valid user ID is required');
        }

        // Check if collection exists and belongs to user
        const collectionCheck = await db.query(
            'SELECT * FROM "recipeCollections" WHERE "collectionId" = $1 AND "userId" = $2',
            [collectionId, userId]
        );

        if (collectionCheck.rows.length === 0) {
            throw new ClientError(404, 'Collection not found or does not belong to user');
        }

        // Remove recipe from collection
        await db.query(
            'DELETE FROM "collectionRecipes" WHERE "collectionId" = $1 AND "recipeId" = $2',
            [collectionId, recipeId]
        );

        res.json({
            success: true,
            message: 'Recipe removed from collection successfully'
        });
    } catch (err) {
        next(err);
    }
});

export default router;