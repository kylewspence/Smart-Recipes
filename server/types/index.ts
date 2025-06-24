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

// Recipe Sharing Types
export interface RecipeShare {
    shareId: number;
    recipeId: number;
    ownerId: number;
    sharedWithId?: number;
    shareType: 'public' | 'friends' | 'specific';
    permission: 'view' | 'comment' | 'edit';
    shareUrl?: string;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateRecipeShareRequest {
    recipeId: number;
    shareType: 'public' | 'friends' | 'specific';
    permission?: 'view' | 'comment' | 'edit';
    sharedWithId?: number;
    expiresAt?: string;
}

// Recipe Export Types
export interface RecipeExport {
    exportId: number;
    recipeId: number;
    exportedBy: number;
    exportType: 'pdf' | 'print' | 'json' | 'text';
    exportFormat?: string;
    exportedAt: string;
}

export interface CreateRecipeExportRequest {
    recipeId: number;
    exportType: 'pdf' | 'print' | 'json' | 'text';
    exportFormat?: string;
}

// Social Media Sharing Types
export interface SocialShareData {
    platform: 'twitter' | 'facebook' | 'pinterest' | 'instagram';
    title: string;
    description: string;
    imageUrl?: string;
    url: string;
}

// Recipe Import Types
export interface RecipeImportRequest {
    shareUrl: string;
    userId: number;
}

export interface SharedRecipeData {
    recipe: DbRecipe;
    ingredients: RecipeIngredient[];
    tags: string[];
    owner: {
        name: string;
        userId: number;
    };
    shareInfo: {
        shareType: string;
        permission: string;
        createdAt: string;
    };
}