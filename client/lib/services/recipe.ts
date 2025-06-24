import axios from 'axios';
import { RecipeGenerationRequest, RecipeGenerationResponse, Recipe, RecipeIngredient } from '../types/recipe';
import { offlineService } from './offline';

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

export interface RecipeGenerationParams {
    ingredients?: string[];
    excludeIngredients?: string[];
    cuisine?: string;
    dietaryRestrictions?: string[];
    allergies?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    cookingTime?: number;
    servings?: number;
    preferences?: string[];
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
    equipment?: string[];
}

export interface RecipeResponse {
    recipe: Recipe;
    generatedPrompt: string;
}

class RecipeService {
    private getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
        };
    }

    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`HTTP ${response.status}: ${error}`);
        }
        return response.json();
    }

    async generateRecipe(params: RecipeGenerationParams): Promise<RecipeResponse> {
        const networkStatus = offlineService.getNetworkStatus();

        if (!networkStatus.isOnline) {
            throw new Error('Recipe generation requires an internet connection');
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/recipes/generate`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(params),
            });

            const result = await this.handleResponse<RecipeResponse>(response);

            // Cache the generated recipe for offline access
            if (result.recipe) {
                await offlineService.cacheRecipe(result.recipe);
            }

            return result;
        } catch (error) {
            // Add to pending sync if offline
            if (!networkStatus.isOnline) {
                await offlineService.addPendingSync('generate_recipe', params);
                throw new Error('Recipe generation queued for when you\'re back online');
            }
            throw error;
        }
    }

    async getRecipe(id: string): Promise<Recipe> {
        const networkStatus = offlineService.getNetworkStatus();

        // Try to get from cache first
        const cachedRecipe = await offlineService.getCachedRecipe(id);
        if (cachedRecipe) {
            // If offline, return cached version
            if (!networkStatus.isOnline) {
                return cachedRecipe;
            }

            // If online, try to fetch fresh data but fallback to cache
            try {
                const response = await fetch(`${API_BASE_URL}/api/recipes/${id}`, {
                    headers: this.getAuthHeaders(),
                });

                const recipe = await this.handleResponse<Recipe>(response);
                await offlineService.cacheRecipe(recipe);
                return recipe;
            } catch (error) {
                console.warn('Failed to fetch fresh recipe, using cached version:', error);
                return cachedRecipe;
            }
        }

        // If not cached and offline, throw error
        if (!networkStatus.isOnline) {
            throw new Error('Recipe not available offline');
        }

        // Fetch from server
        const response = await fetch(`${API_BASE_URL}/api/recipes/${id}`, {
            headers: this.getAuthHeaders(),
        });

        const recipe = await this.handleResponse<Recipe>(response);
        await offlineService.cacheRecipe(recipe);
        return recipe;
    }

    async getUserRecipes(): Promise<Recipe[]> {
        const networkStatus = offlineService.getNetworkStatus();

        if (!networkStatus.isOnline) {
            // Return cached recipes when offline
            return offlineService.getCachedRecipes();
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/recipes/user`, {
                headers: this.getAuthHeaders(),
            });

            const recipes = await this.handleResponse<Recipe[]>(response);

            // Cache all recipes for offline access
            for (const recipe of recipes) {
                await offlineService.cacheRecipe(recipe);
            }

            return recipes;
        } catch (error) {
            console.warn('Failed to fetch user recipes, using cached versions:', error);
            return offlineService.getCachedRecipes();
        }
    }

    async favoriteRecipe(recipeId: string): Promise<void> {
        const networkStatus = offlineService.getNetworkStatus();

        if (!networkStatus.isOnline) {
            // Handle offline
            await offlineService.addOfflineFavorite(recipeId);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}/favorite`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
            });

            await this.handleResponse<void>(response);

            // Also update offline favorites
            await offlineService.addOfflineFavorite(recipeId);
        } catch (error) {
            // If request fails, add to offline favorites and pending sync
            await offlineService.addOfflineFavorite(recipeId);
            throw error;
        }
    }

    async unfavoriteRecipe(recipeId: string): Promise<void> {
        const networkStatus = offlineService.getNetworkStatus();

        if (!networkStatus.isOnline) {
            // Handle offline
            await offlineService.removeOfflineFavorite(recipeId);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}/favorite`, {
                method: 'DELETE',
                headers: this.getAuthHeaders(),
            });

            await this.handleResponse<void>(response);

            // Also update offline favorites
            await offlineService.removeOfflineFavorite(recipeId);
        } catch (error) {
            // If request fails, remove from offline favorites and add to pending sync
            await offlineService.removeOfflineFavorite(recipeId);
            throw error;
        }
    }

    async getFavoriteRecipes(): Promise<Recipe[]> {
        const networkStatus = offlineService.getNetworkStatus();

        if (!networkStatus.isOnline) {
            // Return cached recipes that are marked as favorites offline
            const cachedRecipes = offlineService.getCachedRecipes();
            return cachedRecipes.filter(recipe =>
                offlineService.isOfflineFavorite(recipe.id.toString())
            );
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/recipes/favorites`, {
                headers: this.getAuthHeaders(),
            });

            const recipes = await this.handleResponse<Recipe[]>(response);

            // Cache all favorite recipes
            for (const recipe of recipes) {
                await offlineService.cacheRecipe(recipe);
                await offlineService.addOfflineFavorite(recipe.id.toString());
            }

            return recipes;
        } catch (error) {
            console.warn('Failed to fetch favorite recipes, using cached versions:', error);
            const cachedRecipes = offlineService.getCachedRecipes();
            return cachedRecipes.filter(recipe =>
                offlineService.isOfflineFavorite(recipe.id.toString())
            );
        }
    }

    async rateRecipe(recipeId: string, rating: number): Promise<void> {
        const networkStatus = offlineService.getNetworkStatus();

        if (!networkStatus.isOnline) {
            throw new Error('Rating recipes requires an internet connection');
        }

        const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}/rate`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ rating }),
        });

        await this.handleResponse<void>(response);
    }

    async deleteRecipe(recipeId: string): Promise<void> {
        const networkStatus = offlineService.getNetworkStatus();

        if (!networkStatus.isOnline) {
            throw new Error('Deleting recipes requires an internet connection');
        }

        const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders(),
        });

        await this.handleResponse<void>(response);
    }

    // Utility methods for offline functionality
    isRecipeFavorited(recipeId: string): boolean {
        return offlineService.isOfflineFavorite(recipeId);
    }

    getCachedRecipes(): Recipe[] {
        return offlineService.getCachedRecipes();
    }

    async clearCache(): Promise<void> {
        await offlineService.clearCache();
    }

    getStorageUsage() {
        return offlineService.getStorageUsage();
    }
}

export const recipeService = new RecipeService();
export default recipeService;