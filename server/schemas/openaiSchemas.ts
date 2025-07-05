import { z } from 'zod';

// Schema for recipe generation request
export const recipeGenerationRequestSchema = z.object({
    userId: z.number().int().positive().optional(), // Make optional for backward compatibility
    mealType: z.string().optional(),
    cuisineType: z.string().optional(), // Test uses cuisineType, not cuisine
    ingredients: z.array(z.string()).optional(), // Test uses ingredients, not includeIngredients
    includeIngredients: z.array(z.string()).optional(), // Keep for backward compatibility
    excludeIngredients: z.array(z.string()).optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    cuisine: z.string().optional(), // Keep for backward compatibility
    cookingTime: z.number().int().positive().optional(),
    servingSize: z.number().int().positive().optional(), // Test includes servingSize
    spiceLevel: z.enum(['mild', 'medium', 'hot']).optional(), // Test includes spiceLevel
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    message: z.string().min(2).optional()
});

// Schema for OpenAI generated recipe response
// This is critical to ensure AI responses are properly structured
export const openaiRecipeResponseSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    ingredients: z.array(
        z.object({
            name: z.string(),
            quantity: z.string(),
            notes: z.string().optional()
        })
    ),
    instructions: z.string(),
    cookingTime: z.number().int().positive().optional(),
    prepTime: z.number().int().positive().optional(),
    servings: z.number().int().positive().optional(),
    cuisine: z.string().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    spiceLevel: z.enum(['mild', 'medium', 'hot']).optional(),
    tips: z.array(z.string()).optional(),
    source: z.enum(['user', 'ai']).default('ai')
});