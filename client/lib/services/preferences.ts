import axios from 'axios';
import { UserPreferences, Ingredient, IngredientPreference } from '../types/preferences';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance with defaults
const preferencesApi = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: 60000,
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
                // User has no preferences yet - throw the error so caller knows
                throw error;
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

    // Save user preferences (create or update as needed)
    async saveUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
        try {
            // Try to update first
            return await this.updateUserPreferences(userId, preferences);
        } catch (error: any) {
            // If update fails with 404 (not found), try to create
            if (error.response?.status === 404) {
                return await this.createUserPreferences(userId, preferences);
            }
            // If create fails with 409 (conflict), try update again
            if (error.response?.status === 409) {
                return await this.updateUserPreferences(userId, preferences);
            }
            throw error;
        }
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