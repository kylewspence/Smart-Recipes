// server/types/index.ts

export interface User {
    userId: number;
    email: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

export type IngredientPreference = 'like' | 'dislike' | 'stretch';

export interface UserIngredientPreference {
    id: number;
    userId: number;
    ingredientId: number;
    preference: IngredientPreference;
}

export interface UserPreferences {
    preferenceId: number;
    userId: number;
    dietaryRestrictions: string[];
    allergies: string[];
    cuisinePreferences: string[];
    spiceLevel: 'mild' | 'medium' | 'hot';
    maxCookingTime: number;
    servingSize: number;
    createdAt: string;
    updatedAt: string;
}

export interface Ingredient {
    ingredientId: number;
    name: string;
    category: string;
    createdAt: string;
}

export interface Recipe {
    recipeId: number;
    userId: number;
    title: string;
    description: string;
    instructions: string;
    cookingTime: number;
    prepTime: number;
    servings: number;
    cuisine: string;
    difficulty: 'easy' | 'medium' | 'hard';
    spiceLevel: 'mild' | 'medium' | 'hot';
    isFavorite: boolean;
    isGenerated: boolean;
    generatedPrompt: string;
    createdAt: string;
}

export interface RecipeIngredient {
    recipeId: number;
    ingredientId: number;
    quantity: string;
}

export interface RecipeTag {
    tagId: number;
    recipeId: number;
    tag: string;
}

export interface FridgeItem {
    itemId: number;
    userId: number;
    ingredientId: number;
    quantity: string;
    expiresOn: string | null;
}

export interface SavedRecipe {
    id: number;
    userId: number;
    recipeId: number;
    savedAt: string;
}