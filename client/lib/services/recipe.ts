import axios from 'axios';
import { RecipeGenerationRequest, RecipeGenerationResponse, Recipe, RecipeIngredient } from '../types/recipe';

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

// Types for customization features
interface IngredientSubstitution {
    name: string;
    reason: string;
    ratio: number;
    difficulty: 'easy' | 'medium' | 'hard';
}

interface SubstitutionResponse {
    substitutions: IngredientSubstitution[];
}

interface VariationResponse {
    variationRecipe: Recipe;
}

interface ScalingResponse {
    scaledIngredients: RecipeIngredient[];
    scaledServings: number;
}

// Types for collections
export interface RecipeCollection {
    collectionId: number;
    name: string;
    description?: string;
    isPublic: boolean;
    recipeCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCollectionRequest {
    name: string;
    description?: string;
    isPublic?: boolean;
}

export interface SavedRecipe extends Recipe {
    savedAt: string;
}

// Notes and Cooking History Types
export type NoteType = 'personal' | 'modification' | 'tip' | 'review';

export interface RecipeNote {
    noteId: number;
    recipeId: number;
    userId: number;
    note: string;
    noteType: NoteType;
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CookingSessionData {
    rating?: number;
    notes?: string;
    modifications?: any;
    cookingTime?: number;
    servings?: number;
    success?: boolean;
    wouldCookAgain?: boolean;
}

export interface CookingSession extends CookingSessionData {
    historyId: number;
    recipeId: number;
    userId: number;
    cookedAt: string;
    recipeTitle?: string;
    recipeDescription?: string;
    cuisine?: string;
    difficulty?: string;
}

export interface CookingStats {
    stats: {
        totalCookingSessions: number;
        uniqueRecipesCooked: number;
        averageRating: number;
        successfulCooks: number;
        wouldCookAgainCount: number;
        averageCookingTime: number;
    };
    popularRecipes: Array<{
        title: string;
        recipeId: number;
        cookCount: number;
    }>;
}

export const recipeService = {
    // Generate a new recipe
    async generateRecipe(request: RecipeGenerationRequest): Promise<RecipeGenerationResponse> {
        const response = await recipeApi.post<RecipeGenerationResponse>('/recipes/generate', request);
        return response.data;
    },

    // Get all user's recipes
    async getUserRecipes(userId: number): Promise<Recipe[]> {
        const response = await recipeApi.get<{ success: boolean; data: Recipe[] }>(`/users/${userId}/recipes`);
        return response.data.data;
    },

    // Get a specific recipe
    async getRecipe(recipeId: number): Promise<Recipe> {
        const response = await recipeApi.get<{ success: boolean; data: Recipe }>(`/recipes/${recipeId}`);
        return response.data.data;
    },

    // Save/favorite a recipe
    async saveRecipe(recipeId: number): Promise<void> {
        const userData = localStorage.getItem('user_data');
        const user = userData ? JSON.parse(userData) : null;

        await recipeApi.post(`/recipes/${recipeId}/save`, {
            userId: user?.userId
        });
    },

    // Unsave a recipe
    async unsaveRecipe(recipeId: number): Promise<void> {
        const userData = localStorage.getItem('user_data');
        const user = userData ? JSON.parse(userData) : null;

        await recipeApi.delete(`/recipes/${recipeId}/save`, {
            data: { userId: user?.userId }
        });
    },

    // Toggle favorite status
    async toggleFavorite(recipeId: number): Promise<{ isFavorite: boolean }> {
        const userData = localStorage.getItem('user_data');
        const user = userData ? JSON.parse(userData) : null;

        const response = await recipeApi.post<{ success: boolean; data: { isFavorite: boolean } }>(`/recipes/${recipeId}/favorite`, {
            userId: user?.userId
        });
        return response.data.data;
    },

    // Get user's saved recipes
    async getSavedRecipes(userId: number): Promise<SavedRecipe[]> {
        const response = await recipeApi.get<{ success: boolean; data: SavedRecipe[] }>(`/users/${userId}/saved`);
        return response.data.data;
    },

    // Get user's favorite recipes
    async getFavoriteRecipes(userId: number): Promise<Recipe[]> {
        const response = await recipeApi.get<{ success: boolean; data: Recipe[] }>(`/users/${userId}/favorites`);
        return response.data.data;
    },

    // Rate a recipe
    async rateRecipe(recipeId: number, rating: number, review?: string): Promise<void> {
        await recipeApi.post(`/recipes/${recipeId}/rate`, { rating, review });
    },

    // Collections Management
    async getCollections(userId: number): Promise<RecipeCollection[]> {
        const response = await recipeApi.get<{ success: boolean; data: RecipeCollection[] }>(`/users/${userId}/collections`);
        return response.data.data;
    },

    async createCollection(data: CreateCollectionRequest): Promise<RecipeCollection> {
        const userData = localStorage.getItem('user_data');
        const user = userData ? JSON.parse(userData) : null;

        const response = await recipeApi.post<{ success: boolean; data: RecipeCollection }>('/collections', {
            ...data,
            userId: user?.userId
        });
        return response.data.data;
    },

    async updateCollection(collectionId: number, data: Partial<CreateCollectionRequest>): Promise<RecipeCollection> {
        const userData = localStorage.getItem('user_data');
        const user = userData ? JSON.parse(userData) : null;

        const response = await recipeApi.put<{ success: boolean; data: RecipeCollection }>(`/collections/${collectionId}`, {
            ...data,
            userId: user?.userId
        });
        return response.data.data;
    },

    async deleteCollection(collectionId: number): Promise<void> {
        const userData = localStorage.getItem('user_data');
        const user = userData ? JSON.parse(userData) : null;

        await recipeApi.delete(`/collections/${collectionId}`, {
            data: { userId: user?.userId }
        });
    },

    async getCollectionRecipes(collectionId: number): Promise<Recipe[]> {
        const response = await recipeApi.get<{ success: boolean; data: Recipe[] }>(`/collections/${collectionId}/recipes`);
        return response.data.data;
    },

    async addRecipeToCollection(collectionId: number, recipeId: number): Promise<void> {
        const userData = localStorage.getItem('user_data');
        const user = userData ? JSON.parse(userData) : null;

        await recipeApi.post(`/collections/${collectionId}/recipes`, {
            recipeId,
            userId: user?.userId
        });
    },

    async removeRecipeFromCollection(collectionId: number, recipeId: number): Promise<void> {
        const userData = localStorage.getItem('user_data');
        const user = userData ? JSON.parse(userData) : null;

        await recipeApi.delete(`/collections/${collectionId}/recipes/${recipeId}`, {
            data: { userId: user?.userId }
        });
    },

    // Bulk operations
    async bulkRecipeAction(
        recipeIds: number[],
        action: 'favorite' | 'unfavorite' | 'save' | 'unsave' | 'delete'
    ): Promise<void> {
        await recipeApi.post('/recipes/bulk', {
            recipeIds,
            action
        });
    },

    // Recipe customization features
    async generateSubstitutions(recipeId: number, ingredientId: number): Promise<IngredientSubstitution[]> {
        try {
            const response = await recipeApi.post<{ success: boolean; data: SubstitutionResponse }>(`/recipes/${recipeId}/substitutions`, {
                ingredientId
            });
            return response.data.data.substitutions;
        } catch (error) {
            console.error('Failed to generate substitutions:', error);
            // Fallback to mock data if API fails
            return [
                {
                    name: 'Alternative ingredient',
                    reason: 'More accessible option',
                    ratio: 1.0,
                    difficulty: 'easy'
                }
            ];
        }
    },

    async generateVariation(recipeId: number, variationType: string, description: string): Promise<VariationResponse> {
        try {
            const response = await recipeApi.post<{ success: boolean; data: VariationResponse }>(`/recipes/${recipeId}/variation`, {
                variationType,
                description
            });
            return response.data.data;
        } catch (error) {
            console.error('Failed to generate variation:', error);
            throw error;
        }
    },

    async scaleRecipe(recipeId: number, newServings: number): Promise<ScalingResponse> {
        try {
            const response = await recipeApi.post<{ success: boolean; data: ScalingResponse }>(`/recipes/${recipeId}/scale`, {
                newServings
            });
            return response.data.data;
        } catch (error) {
            console.error('Failed to scale recipe:', error);
            throw error;
        }
    },

    // Recipe Notes
    async getRecipeNotes(recipeId: number, userId: number): Promise<RecipeNote[]> {
        const response = await recipeApi.get<{ success: boolean; data: RecipeNote[] }>(`/recipes/${recipeId}/notes/${userId}`);
        return response.data.data;
    },

    async addRecipeNote(recipeId: number, note: string, noteType: NoteType = 'personal', isPrivate: boolean = true): Promise<RecipeNote> {
        const userData = localStorage.getItem('user_data');
        const user = userData ? JSON.parse(userData) : null;

        const response = await recipeApi.post<{ success: boolean; data: RecipeNote }>(`/recipes/${recipeId}/notes`, {
            userId: user?.userId,
            note,
            noteType,
            isPrivate
        });
        return response.data.data;
    },

    async deleteRecipeNote(recipeId: number, noteId: number): Promise<void> {
        const userData = localStorage.getItem('user_data');
        const user = userData ? JSON.parse(userData) : null;

        await recipeApi.delete(`/recipes/${recipeId}/notes/${noteId}`, {
            data: { userId: user?.userId }
        });
    },

    // Cooking History
    async getCookingHistory(userId: number, recipeId?: number): Promise<CookingSession[]> {
        const params = recipeId ? `?recipeId=${recipeId}` : '';
        const response = await recipeApi.get<{ success: boolean; data: CookingSession[] }>(`/users/${userId}/cooking-history${params}`);
        return response.data.data;
    },

    async recordCookingSession(recipeId: number, sessionData: CookingSessionData): Promise<CookingSession> {
        const userData = localStorage.getItem('user_data');
        const user = userData ? JSON.parse(userData) : null;

        const response = await recipeApi.post<{ success: boolean; data: CookingSession }>(`/recipes/${recipeId}/cook`, {
            userId: user?.userId,
            ...sessionData
        });
        return response.data.data;
    },

    async getCookingStats(userId: number): Promise<CookingStats> {
        const response = await recipeApi.get<{ success: boolean; data: CookingStats }>(`/users/${userId}/cooking-stats`);
        return response.data.data;
    }
};