// server/types/index.ts

import { Request } from 'express';

export interface User {
    userId: number;
    email: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

export type PreferenceType = 'like' | 'dislike' | 'stretch';

export interface UserIngredientPreference {
    id: number;
    userId: number;
    ingredientId: number;
    preference: PreferenceType;
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

export interface RecipeIngredient {
    name: string;
    quantity: string;
    notes?: string;
}

export interface DbRecipe {
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

export interface DbRecipeIngredient {
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

// Define user from JWT token
export interface JwtUser {
    userId: number;
    email: string;
    name: string;
    iat?: number;
}

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: JwtUser;
        }
    }
}

// Recipe model for API/OpenAI
export interface Recipe {
    title: string;
    description?: string;
    ingredients: RecipeIngredient[];
    instructions: string;
    cookingTime?: number;
    prepTime?: number;
    servings?: number;
    cuisine?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    spiceLevel?: 'mild' | 'medium' | 'hot';
    tips?: string[];
    source: 'user' | 'ai';
}

// User preferences for recipe generation
export interface UserPreference {
    dietaryRestrictions?: string[];
    allergies?: string[];
    cuisinePreferences?: string[];
    spiceLevel?: 'mild' | 'medium' | 'hot';
    maxCookingTime?: number;
    servingSize?: number;
}

export interface IngredientPreference {
    ingredientId: number;
    name: string;
    preference: PreferenceType;
}

// OpenAI recipe generation request
export interface RecipeGenerationRequest {
    userPreferences: UserPreference;
    ingredientPreferences: IngredientPreference[];
    ingredients?: string[];
    customMessage?: string;
}