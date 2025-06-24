import { z } from 'zod';

// Schema for a recipe ingredient
export const recipeIngredientSchema = z.object({
    ingredientId: z.number().int().positive(),
    name: z.string(),
    quantity: z.string().optional()
});

// Schema for creating a recipe
export const createRecipeSchema = z.object({
    title: z.string().min(3, 'Recipe title must be at least 3 characters'),
    description: z.string().optional(),
    instructions: z.string().min(10, 'Instructions must be detailed'),
    cookingTime: z.number().int().positive().optional(),
    prepTime: z.number().int().positive().optional(),
    servings: z.number().int().positive().optional(),
    cuisine: z.string().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    spiceLevel: z.enum(['mild', 'medium', 'hot']).optional(),
    ingredients: z.array(recipeIngredientSchema),
    tags: z.array(z.string()).optional(),
    isFavorite: z.boolean().optional(),
    isGenerated: z.boolean().default(true),
    generatedPrompt: z.string().optional()
});

// Schema for updating a recipe
export const updateRecipeSchema = createRecipeSchema.partial();

// Schema for recipe ID parameter
export const recipeIdSchema = z.object({
    recipeId: z.coerce.number().int().positive('Recipe ID must be a positive integer')
});