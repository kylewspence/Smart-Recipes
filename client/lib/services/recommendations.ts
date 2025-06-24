export interface RecommendationMetadata {
    strategy: string;
    limit: number;
    count: number;
}

export interface UserProfile {
    favoriteCuisines: string[];
    totalFavorites: number;
}

export interface PersonalizedRecommendationsResponse {
    recommendations: any[];
    userProfile: UserProfile;
    metadata: RecommendationMetadata;
}

export interface SimilarRecipesResponse {
    baseRecipe: {
        id: number;
        title: string;
        cuisine: string;
        difficulty: string;
        cookingTime: number;
    };
    similarRecipes: any[];
    metadata: RecommendationMetadata;
}

export interface TrendingRecipesResponse {
    trendingRecipes: any[];
    metadata: RecommendationMetadata;
}

export interface SeasonalRecommendationsResponse {
    seasonalRecipes: any[];
    currentSeason: string;
    metadata: RecommendationMetadata;
}

export class RecommendationsService {
    private baseURL: string;

    constructor() {
        this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    }

    /**
     * Get personalized recommendations for a user
     */
    async getPersonalizedRecommendations(userId: number, limit: number = 10): Promise<PersonalizedRecommendationsResponse> {
        try {
            const response = await fetch(`${this.baseURL}/api/recommendations/personalized`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, limit }),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch personalized recommendations: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching personalized recommendations:', error);
            throw error;
        }
    }

    /**
     * Get similar recipes to a given recipe
     */
    async getSimilarRecipes(recipeId: number, limit: number = 5): Promise<SimilarRecipesResponse> {
        try {
            const response = await fetch(`${this.baseURL}/api/recommendations/similar/${recipeId}?limit=${limit}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch similar recipes: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching similar recipes:', error);
            throw error;
        }
    }

    /**
     * Get trending recipes
     */
    async getTrendingRecipes(limit: number = 10): Promise<TrendingRecipesResponse> {
        try {
            const response = await fetch(`${this.baseURL}/api/recommendations/trending?limit=${limit}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch trending recipes: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching trending recipes:', error);
            throw error;
        }
    }

    /**
     * Get seasonal recommendations
     */
    async getSeasonalRecommendations(limit: number = 10): Promise<SeasonalRecommendationsResponse> {
        try {
            const response = await fetch(`${this.baseURL}/api/recommendations/seasonal?limit=${limit}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch seasonal recommendations: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching seasonal recommendations:', error);
            throw error;
        }
    }

    /**
     * Get quick recommendations (no auth required)
     */
    async getQuickRecommendations(limit: number = 6): Promise<any[]> {
        try {
            const response = await fetch(`${this.baseURL}/api/recommendations/quick?limit=${limit}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch quick recommendations: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data.recommendations;
        } catch (error) {
            console.error('Error fetching quick recommendations:', error);
            throw error;
        }
    }
}

// Export a singleton instance
export const recommendationsService = new RecommendationsService(); 