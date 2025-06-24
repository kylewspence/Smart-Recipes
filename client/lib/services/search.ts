import { Recipe } from '../types/recipe';

const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://your-api-domain.com/api'
    : 'http://localhost:3001/api';

// Search types and interfaces
export interface SearchFilters {
    cuisine?: string[];
    difficulty?: ('easy' | 'medium' | 'hard')[];
    maxCookingTime?: number;
    minCookingTime?: number;
    spiceLevel?: ('mild' | 'medium' | 'hot')[];
    tags?: string[];
    minRating?: number;
    maxRating?: number;
    servings?: {
        min?: number;
        max?: number;
    };
    isGenerated?: boolean;
    isFavorite?: boolean;
    dateRange?: {
        start?: string;
        end?: string;
    };
}

export interface SearchParams {
    query?: string;
    fuzzy?: boolean;
    includeIngredients?: string[];
    excludeIngredients?: string[];
    filters?: SearchFilters;
    sortBy?: 'relevance' | 'rating' | 'cookingTime' | 'prepTime' | 'recent' | 'popular';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

export interface SearchResult {
    recipes: Recipe[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
    searchMetadata: {
        hasTextSearch: boolean;
        fuzzySearch: boolean;
        hasFilters: boolean;
        sortBy: string;
        sortOrder: string;
        relevanceScoring: boolean;
    };
}

export interface SearchSuggestion {
    name?: string;
    title?: string;
    type: 'recipe' | 'ingredient' | 'cuisine' | 'tag' | 'popular';
    id?: number;
    similarity_score?: number;
    search_count?: number;
}

export interface UnifiedSearchResult {
    query: string;
    type: string;
    fuzzy: boolean;
    results: {
        recipes?: any[];
        ingredients?: any[];
        users?: any[];
    };
}

export class SearchService {
    private cache = new Map<string, { data: any; timestamp: number }>();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    private getCacheKey(endpoint: string, params: any): string {
        return `${endpoint}_${JSON.stringify(params)}`;
    }

    private getFromCache<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    private setCache(key: string, data: any): void {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    private async makeRequest<T>(endpoint: string, params: URLSearchParams): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}?${params.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Search request failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Search failed');
        }

        return result.data;
    }

    /**
     * Perform unified search across all content types
     */
    async unifiedSearch(
        query: string,
        options: {
            type?: 'all' | 'recipes' | 'ingredients' | 'users';
            fuzzy?: boolean;
            limit?: number;
            offset?: number;
            filters?: SearchFilters;
        } = {}
    ): Promise<UnifiedSearchResult> {
        const cacheKey = this.getCacheKey('/search', { query, ...options });
        const cached = this.getFromCache<UnifiedSearchResult>(cacheKey);
        if (cached) return cached;

        const params = new URLSearchParams({
            query,
            type: options.type || 'all',
            fuzzy: (options.fuzzy || false).toString(),
            limit: (options.limit || 20).toString(),
            offset: (options.offset || 0).toString(),
        });

        if (options.filters) {
            Object.entries(options.filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        value.forEach(v => params.append(`filters.${key}`, v.toString()));
                    } else if (typeof value === 'object') {
                        Object.entries(value).forEach(([subKey, subValue]) => {
                            if (subValue !== undefined && subValue !== null) {
                                params.append(`filters.${key}.${subKey}`, subValue.toString());
                            }
                        });
                    } else {
                        params.append(`filters.${key}`, value.toString());
                    }
                }
            });
        }

        const result = await this.makeRequest<UnifiedSearchResult>('/search', params);
        this.setCache(cacheKey, result);
        return result;
    }

    /**
     * Advanced recipe search with comprehensive filtering
     */
    async searchRecipes(searchParams: SearchParams): Promise<SearchResult> {
        const cacheKey = this.getCacheKey('/search/recipes/advanced', searchParams);
        const cached = this.getFromCache<SearchResult>(cacheKey);
        if (cached) return cached;

        const params = new URLSearchParams();

        // Add basic search parameters
        if (searchParams.query) params.append('query', searchParams.query);
        if (searchParams.fuzzy) params.append('fuzzy', searchParams.fuzzy.toString());
        if (searchParams.sortBy) params.append('sortBy', searchParams.sortBy);
        if (searchParams.sortOrder) params.append('sortOrder', searchParams.sortOrder);
        if (searchParams.limit) params.append('limit', searchParams.limit.toString());
        if (searchParams.offset) params.append('offset', searchParams.offset.toString());

        // Add ingredient filters
        if (searchParams.includeIngredients?.length) {
            searchParams.includeIngredients.forEach(ingredient =>
                params.append('includeIngredients', ingredient)
            );
        }
        if (searchParams.excludeIngredients?.length) {
            searchParams.excludeIngredients.forEach(ingredient =>
                params.append('excludeIngredients', ingredient)
            );
        }

        // Add other filters
        if (searchParams.filters) {
            Object.entries(searchParams.filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        value.forEach(v => params.append(key, v.toString()));
                    } else if (typeof value === 'object') {
                        Object.entries(value).forEach(([subKey, subValue]) => {
                            if (subValue !== undefined && subValue !== null) {
                                params.append(`${key}.${subKey}`, subValue.toString());
                            }
                        });
                    } else {
                        params.append(key, value.toString());
                    }
                }
            });
        }

        const result = await this.makeRequest<SearchResult>('/search/recipes/advanced', params);
        this.setCache(cacheKey, result);
        return result;
    }

    /**
     * Get search suggestions with fuzzy matching and popular searches
     */
    async getSuggestions(
        query: string,
        options: {
            type?: 'all' | 'recipes' | 'ingredients' | 'cuisines' | 'tags';
            limit?: number;
            includePopular?: boolean;
        } = {}
    ): Promise<{ query: string; suggestions: Record<string, SearchSuggestion[]> }> {
        if (query.length < 2 && !options.includePopular) {
            return { query, suggestions: {} };
        }

        const cacheKey = this.getCacheKey('/search/suggestions', { query, ...options });
        const cached = this.getFromCache<{ query: string; suggestions: Record<string, SearchSuggestion[]> }>(cacheKey);
        if (cached) return cached;

        const params = new URLSearchParams({
            type: options.type || 'all',
            limit: (options.limit || 10).toString(),
            includePopular: (options.includePopular !== false).toString(),
        });

        if (query) params.append('query', query);

        const result = await this.makeRequest<{ query: string; suggestions: Record<string, SearchSuggestion[]> }>('/search/suggestions', params);
        this.setCache(cacheKey, result);
        return result;
    }

    /**
     * Get trending content and popular searches
     */
    async getTrending(options: { days?: number; limit?: number } = {}): Promise<{
        period: string;
        trending: {
            recipes: any[];
            ingredients: any[];
            cuisines: any[];
        };
    }> {
        const cacheKey = this.getCacheKey('/search/trending', options);
        const cached = this.getFromCache<any>(cacheKey);
        if (cached) return cached;

        const params = new URLSearchParams({
            days: (options.days || 7).toString(),
            limit: (options.limit || 10).toString(),
        });

        const result = await this.makeRequest<any>('/search/trending', params);
        this.setCache(cacheKey, result);
        return result;
    }

    /**
     * Quick recipe search with basic filtering (for search bars)
     */
    async quickSearch(query: string, limit: number = 10): Promise<Recipe[]> {
        if (!query.trim()) return [];

        const result = await this.unifiedSearch(query, {
            type: 'recipes',
            limit,
            fuzzy: true,
        });

        return result.results.recipes || [];
    }

    /**
     * Search recipes by ingredients (what's in my fridge?)
     */
    async searchByIngredients(
        includeIngredients: string[],
        excludeIngredients: string[] = [],
        options: Partial<SearchParams> = {}
    ): Promise<SearchResult> {
        return this.searchRecipes({
            includeIngredients,
            excludeIngredients,
            sortBy: 'relevance',
            fuzzy: true,
            ...options,
        });
    }

    /**
     * Get recipe recommendations based on user preferences
     */
    async getRecommendations(
        userPreferences: {
            cuisines?: string[];
            dietaryRestrictions?: string[];
            spiceLevel?: string;
            maxCookingTime?: number;
        },
        limit: number = 20
    ): Promise<Recipe[]> {
        const filters: SearchFilters = {};

        if (userPreferences.cuisines?.length) {
            filters.cuisine = userPreferences.cuisines;
        }
        if (userPreferences.spiceLevel) {
            filters.spiceLevel = [userPreferences.spiceLevel as any];
        }
        if (userPreferences.maxCookingTime) {
            filters.maxCookingTime = userPreferences.maxCookingTime;
        }

        const result = await this.searchRecipes({
            filters,
            sortBy: 'popular',
            limit,
        });

        return result.recipes;
    }

    /**
     * Clear search cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Clear expired cache entries
     */
    cleanupCache(): void {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp >= this.CACHE_DURATION) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Advanced recipe search with comprehensive filtering - matches search page interface
     */
    async searchRecipesAdvanced(searchParams: any): Promise<{
        recipes: Recipe[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasMore: boolean;
    }> {
        try {
            // Convert the search page params to our internal format
            const internalParams: SearchParams = {
                query: searchParams.query,
                fuzzy: searchParams.fuzzy,
                includeIngredients: searchParams.includeIngredients,
                excludeIngredients: searchParams.excludeIngredients,
                sortBy: searchParams.sortBy,
                sortOrder: searchParams.sortOrder,
                limit: searchParams.limit || 12,
                offset: ((searchParams.page || 1) - 1) * (searchParams.limit || 12),
                filters: {
                    cuisine: searchParams.cuisine,
                    difficulty: searchParams.difficulty,
                    minCookingTime: searchParams.minCookingTime,
                    maxCookingTime: searchParams.maxCookingTime,
                    spiceLevel: searchParams.spiceLevel,
                    tags: searchParams.tags,
                    minRating: searchParams.minRating,
                    isGenerated: searchParams.isGenerated,
                    isFavorite: searchParams.isFavorite,
                }
            };

            const result = await this.searchRecipes(internalParams);

            // Convert to the format expected by the search page
            const page = searchParams.page || 1;
            const limit = searchParams.limit || 12;
            const total = result.pagination.total;
            const totalPages = Math.ceil(total / limit);

            return {
                recipes: result.recipes,
                total,
                page,
                limit,
                totalPages,
                hasMore: page < totalPages
            };
        } catch (error) {
            console.error('Search failed:', error);
            return {
                recipes: [],
                total: 0,
                page: 1,
                limit: 12,
                totalPages: 0,
                hasMore: false
            };
        }
    }
}

// Export singleton instance
export const searchService = new SearchService();

// Cleanup cache periodically
if (typeof window !== 'undefined') {
    setInterval(() => {
        searchService.cleanupCache();
    }, 10 * 60 * 1000); // Every 10 minutes
}

export default SearchService; 