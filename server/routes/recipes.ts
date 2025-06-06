import express from 'express';
import { generateRecipe, OpenAIConnectionError, OpenAIResponseValidationError } from '../lib/openai';
import { recipeGenerationRequestSchema } from '../schemas/openaiSchemas';
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

export default router;