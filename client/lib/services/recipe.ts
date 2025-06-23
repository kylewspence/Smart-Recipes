import axios from 'axios';
import { RecipeGenerationRequest, RecipeGenerationResponse, Recipe } from '../types/recipe';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Create axios instance with defaults
const recipeApi = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000, // 60 seconds for recipe generation
});

// Add token to requests
recipeApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const recipeService = {
    // Generate a new recipe
    async generateRecipe(request: RecipeGenerationRequest): Promise<RecipeGenerationResponse> {
        try {
            const response = await recipeApi.post('/recipes/generate', request);
            return response.data;
        } catch (error: any) {
            console.error('Recipe generation failed:', error);

            // Handle specific error cases
            if (error.response?.status === 503) {
                throw new Error('Recipe generation service is temporarily unavailable. Please try again later.');
            } else if (error.response?.status === 422) {
                throw new Error('Could not generate a recipe with the provided parameters. Please try different options.');
            } else if (error.response?.status === 404) {
                throw new Error('User preferences not found. Please complete your profile setup first.');
            }

            throw new Error(error.response?.data?.message || 'Failed to generate recipe. Please try again.');
        }
    },

    // Search recipes
    async searchRecipes(params?: {
        query?: string;
        cuisine?: string;
        difficulty?: 'easy' | 'medium' | 'hard';
        maxCookingTime?: number;
        spiceLevel?: 'mild' | 'medium' | 'hot';
        ingredients?: string[];
        excludeIngredients?: string[];
        tags?: string[];
        rating?: number;
        limit?: number;
        offset?: number;
    }): Promise<{ recipes: Recipe[]; pagination: any }> {
        const response = await recipeApi.get('/recipes/search', { params });
        return response.data.data;
    },

    // Get a specific recipe
    async getRecipe(recipeId: number): Promise<Recipe> {
        const response = await recipeApi.get(`/recipes/${recipeId}`);
        return response.data.data;
    },

    // Get user's recipes
    async getUserRecipes(userId: number, params?: {
        limit?: number;
        offset?: number;
        status?: string;
    }): Promise<{ recipes: Recipe[]; pagination: any }> {
        const response = await recipeApi.get(`/recipes/user/${userId}`, { params });
        return response.data.data;
    },

    // Save/favorite a recipe
    async saveRecipe(recipeId: number): Promise<void> {
        await recipeApi.post(`/recipes/${recipeId}/save`);
    },

    // Unsave/unfavorite a recipe
    async unsaveRecipe(recipeId: number): Promise<void> {
        await recipeApi.delete(`/recipes/${recipeId}/save`);
    },

    // Rate a recipe
    async rateRecipe(recipeId: number, rating: number, review?: string): Promise<void> {
        await recipeApi.post(`/recipes/${recipeId}/rate`, {
            rating,
            review
        });
    },

    // Delete a recipe
    async deleteRecipe(recipeId: number): Promise<void> {
        await recipeApi.delete(`/recipes/${recipeId}`);
    },

    // Get popular recipes
    async getPopularRecipes(params?: {
        limit?: number;
        timeframe?: 'day' | 'week' | 'month' | 'all';
    }): Promise<Recipe[]> {
        const response = await recipeApi.get('/recipes/popular', { params });
        return response.data.data;
    },

    // Get recent recipes
    async getRecentRecipes(params?: {
        limit?: number;
    }): Promise<Recipe[]> {
        const response = await recipeApi.get('/recipes/recent', { params });
        return response.data.data;
    },

    // Bulk actions on recipes
    async bulkRecipeAction(
        recipeIds: number[],
        action: 'favorite' | 'unfavorite' | 'save' | 'unsave' | 'delete'
    ): Promise<void> {
        await recipeApi.post('/recipes/bulk-action', {
            recipeIds,
            action
        });
    }
};