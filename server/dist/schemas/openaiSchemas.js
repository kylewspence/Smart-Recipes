import { z } from 'zod';
// Schema for recipe generation request
export const recipeGenerationRequestSchema = z.object({
    userId: z.number().int().positive(),
    includeIngredients: z.array(z.string()).optional(),
    excludeIngredients: z.array(z.string()).optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    cuisine: z.string().optional(),
    mealType: z.string().optional(),
    cookingTime: z.number().int().positive().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    message: z.string().min(2).optional()
});
// Schema for OpenAI generated recipe response
// This is critical to ensure AI responses are properly structured
export const openaiRecipeResponseSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    ingredients: z.array(z.object({
        name: z.string(),
        quantity: z.string(),
        notes: z.string().optional()
    })),
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
