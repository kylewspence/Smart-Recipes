import express from 'express';
import { generateRecipe, OpenAIConnectionError, OpenAIResponseValidationError } from '../lib/openai';
import { recipeGenerationRequestSchema } from '../schemas/openaiSchemas';
import { createRecipeSchema, updateRecipeSchema, recipeIdSchema } from '../schemas/recipeSchemas';
import db from '../db/db';
import { ClientError } from '../lib';

const router = express.Router();

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
 * Get all recipes for a specific user
 * GET /api/users/:userId/recipes
 */
router.get('/user/:userId', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.userId, 10);

        if (isNaN(userId) || userId <= 0) {
            throw new ClientError(400, 'Invalid user ID');
        }

        // Get all recipes for the user
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
                        ), '[]'::json) as tags
            FROM "recipes" r
            WHERE r."userId" = $1
            ORDER BY r."createdAt" DESC`,
            [userId]
        );

        res.json(recipesResult.rows);
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
                        ), '[]'::json) as tags
            FROM "recipes" r
            WHERE r."recipeId" = $1`,
            [recipeId]
        );

        if (recipeResult.rows.length === 0) {
            throw new ClientError(404, 'Recipe not found');
        }

        res.json(recipeResult.rows[0]);
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

            // Commit the transaction
            await db.query('COMMIT');

            // Return the created recipe
            res.status(201).json({
                recipeId,
                ...recipeData
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

            res.json(updatedRecipeResult.rows[0]);
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

        res.status(204).end();
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
            res.json({ message: 'Recipe already saved' });
            return;
        }

        // Save the recipe
        await db.query(
            'INSERT INTO "savedRecipes" ("userId", "recipeId") VALUES ($1, $2)',
            [userId, recipeId]
        );

        res.status(201).json({ message: 'Recipe saved successfully' });
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

        res.status(204).end();
    } catch (err) {
        next(err);
    }
});

/**
 * Get user's saved recipes
 * GET /api/users/:userId/saved-recipes
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

        res.json(savedRecipesResult.rows);
    } catch (err) {
        next(err);
    }
});

export default router;