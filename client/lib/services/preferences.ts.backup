import axios from 'axios';
import { UserPreferences, Ingredient, IngredientPreference } from '../types/preferences';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance with defaults
const preferencesApi = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: 10000,
});

// Add token to requests
preferencesApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const preferencesService = {
    // Get user preferences
    async getUserPreferences(userId: string): Promise<UserPreferences> {
        try {
            const response = await preferencesApi.get(`/users/${userId}/preferences`);
            return response.data.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                // Return empty preferences if none exist yet
                return {
                    userId,
                    dietaryRestrictions: [],
                    allergies: [],
                    cuisinePreferences: [],
                    spiceLevel: 'medium',
                    maxCookingTime: 60,
                    servingSize: 4,
                    ingredientPreferences: []
                };
            }
            throw error;
        }
    },

    // Create user preferences
    async createUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
        const response = await preferencesApi.post(`/users/${userId}/preferences`, preferences);
        return response.data.data;
    },

    // Update user preferences
    async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
        const response = await preferencesApi.put(`/users/${userId}/preferences`, preferences);
        return response.data.data;
    },

    // Delete user preferences
    async deleteUserPreferences(userId: string): Promise<void> {
        await preferencesApi.delete(`/users/${userId}/preferences`);
    },

    // Get ingredients with search and filtering
    async getIngredients(params?: {
        query?: string;
        category?: string;
        limit?: number;
        offset?: number;
        sortBy?: 'name' | 'category' | 'usage' | 'recent';
        sortOrder?: 'asc' | 'desc';
    }): Promise<{ ingredients: Ingredient[]; pagination: any }> {
        const response = await preferencesApi.get('/ingredients', { params });
        return response.data.data;
    },

    // Get ingredient categories
    async getIngredientCategories(): Promise<string[]> {
        try {
            const response = await preferencesApi.get('/ingredients/categories');
            return response.data.data;
        } catch (error) {
            // Fallback categories if endpoint doesn't exist
            return [
                'Vegetables',
                'Fruits',
                'Proteins',
                'Grains',
                'Dairy',
                'Spices',
                'Herbs',
                'Oils',
                'Nuts',
                'Legumes'
            ];
        }
    },

    // Set ingredient preference
    async setIngredientPreference(
        userId: string,
        ingredientId: number,
        preference: 'like' | 'dislike' | 'stretch'
    ): Promise<IngredientPreference> {
        const response = await preferencesApi.post(`/users/${userId}/preferences/ingredients`, {
            ingredientId,
            preference
        });
        return response.data.data;
    },

    // Remove ingredient preference
    async removeIngredientPreference(userId: string, ingredientId: number): Promise<void> {
        await preferencesApi.delete(`/users/${userId}/preferences/ingredients/${ingredientId}`);
    },

    // Bulk update ingredient preferences
    async bulkUpdateIngredientPreferences(
        userId: string,
        preferences: IngredientPreference[]
    ): Promise<IngredientPreference[]> {
        const response = await preferencesApi.put(`/users/${userId}/preferences/ingredients/bulk`, {
            preferences
        });
        return response.data.data;
    }
};