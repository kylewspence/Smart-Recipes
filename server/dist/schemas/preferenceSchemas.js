import { z } from 'zod';
// Schema for ingredient preferences
export const ingredientPreferenceSchema = z.object({
    ingredientId: z.number().int().positive(),
    preference: z.enum(['like', 'dislike', 'stretch'])
});
// Schema for user preferences
export const userPreferencesSchema = z.object({
    dietaryRestrictions: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    cuisinePreferences: z.array(z.string()).optional(),
    spiceLevel: z.enum(['mild', 'medium', 'hot']).optional(),
    maxCookingTime: z.number().int().positive().optional(),
    servingSize: z.number().int().positive().optional()
});
// Schema for updating preferences
export const updatePreferencesSchema = userPreferencesSchema.partial();
