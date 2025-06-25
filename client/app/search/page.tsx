'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Grid, List, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlurFade, MagicCard, ShimmerButton } from '@/components/magicui';
import RecipeCard from '@/components/recipe/RecipeCard';
import { SearchService } from '@/lib/services/search';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { Recipe } from '@/lib/types/recipe';

interface SearchRecipe {
    recipeId: string;
    title: string;
    description: string;
    instructions: string;
    cuisine: string;
    difficulty: 'easy' | 'medium' | 'hard';
    cookingTime: number;
    prepTime: number;
    servings: number;
    rating?: number;
    imageUrl?: string;
    tags?: string[];
    isGenerated?: boolean;
    createdAt: string;
    updatedAt: string;
}

interface SearchResult {
    recipes: SearchRecipe[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
}

type ViewMode = 'grid' | 'list';

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [page, setPage] = useState(1);

    const debouncedQuery = useDebounce(query, 300);
    const searchService = new SearchService();

    const performSearch = useCallback(async () => {
        if (!debouncedQuery.trim()) {
            setResults(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const searchResults = await searchService.searchRecipesAdvanced({
                query: debouncedQuery,
                page,
                limit: 12,
                sortBy: 'relevance',
                sortOrder: 'desc'
            });
            setResults(searchResults);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
            setResults(null);
        } finally {
            setIsLoading(false);
        }
    }, [debouncedQuery, page, searchService]);

    useEffect(() => {
        performSearch();
    }, [performSearch]);

    useEffect(() => {
        setPage(1);
    }, [debouncedQuery]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch();
    };

    // Convert SearchRecipe to Recipe format for RecipeCard
    const convertToRecipe = (searchRecipe: SearchRecipe): Recipe => ({
        id: parseInt(searchRecipe.recipeId) || 0,
        title: searchRecipe.title,
        description: searchRecipe.description,
        cuisine: searchRecipe.cuisine,
        difficulty: searchRecipe.difficulty,
        cookingTime: searchRecipe.cookingTime,
        prepTime: searchRecipe.prepTime,
        servings: searchRecipe.servings,
        rating: searchRecipe.rating,
        imageUrl: searchRecipe.imageUrl,
        tags: searchRecipe.tags || [],
        instructions: searchRecipe.instructions ? searchRecipe.instructions.split('\n') : [],
        ingredients: [],
        mealType: '',
        userId: 0,
        createdAt: new Date(searchRecipe.createdAt),
        updatedAt: new Date(searchRecipe.updatedAt)
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <BlurFade delay={0.1}>
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Find Your Perfect Recipe
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Search through thousands of recipes to find exactly what you're looking for.
                        </p>
                    </div>
                </BlurFade>

                {/* Search Bar */}
                <BlurFade delay={0.2}>
                    <form onSubmit={handleSearch} className="max-w-3xl mx-auto mb-8">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search recipes, ingredients, or cuisines..."
                                className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                            />
                        </div>
                    </form>
                </BlurFade>

                {/* Results Header */}
                {(results || isLoading) && (
                    <BlurFade delay={0.3}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                                {results && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {results.total} recipe{results.total !== 1 ? 's' : ''} found
                                        {query && ` for "${query}"`}
                                    </p>
                                )}

                                {isLoading && (
                                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Searching...</span>
                                    </div>
                                )}
                            </div>

                            {/* View Mode Toggle */}
                            <div className="flex items-center border rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "p-2 rounded-md transition-colors",
                                        viewMode === 'grid'
                                            ? "bg-blue-600 text-white"
                                            : "hover:bg-gray-100 dark:hover:bg-gray-800"
                                    )}
                                >
                                    <Grid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        "p-2 rounded-md transition-colors",
                                        viewMode === 'list'
                                            ? "bg-blue-600 text-white"
                                            : "hover:bg-gray-100 dark:hover:bg-gray-800"
                                    )}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </BlurFade>
                )}

                {/* Results */}
                <div className="space-y-6">
                    {error && (
                        <BlurFade delay={0.4}>
                            <div className="text-center py-12">
                                <div className="text-red-600 dark:text-red-400 text-lg font-medium mb-2">
                                    Search Error
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                                <ShimmerButton onClick={performSearch}>
                                    Try Again
                                </ShimmerButton>
                            </div>
                        </BlurFade>
                    )}

                    {!isLoading && !error && query && results?.recipes.length === 0 && (
                        <BlurFade delay={0.4}>
                            <div className="text-center py-12">
                                <div className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                                    No recipes found
                                </div>
                                <p className="text-gray-500 dark:text-gray-500 mb-4">
                                    Try adjusting your search terms or browse our featured recipes.
                                </p>
                            </div>
                        </BlurFade>
                    )}

                    {results && results.recipes.length > 0 && (
                        <BlurFade delay={0.4}>
                            <div className={cn(
                                viewMode === 'grid'
                                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                    : "space-y-4"
                            )}>
                                {results.recipes.map((recipe, index) => (
                                    <motion.div
                                        key={recipe.recipeId}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <RecipeCard
                                            recipe={convertToRecipe(recipe)}
                                            variant={viewMode === 'list' ? 'compact' : 'default'}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        </BlurFade>
                    )}

                    {/* Load More */}
                    {results && results.hasMore && (
                        <BlurFade delay={0.5}>
                            <div className="text-center py-8">
                                <ShimmerButton
                                    onClick={() => setPage(prev => prev + 1)}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Loading...' : 'Load More Recipes'}
                                </ShimmerButton>
                            </div>
                        </BlurFade>
                    )}
                </div>

                {/* Empty State */}
                {!query && !results && !isLoading && (
                    <BlurFade delay={0.4}>
                        <div className="text-center py-12">
                            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                                Start your recipe search
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Enter ingredients, cuisine types, or recipe names to find your perfect meal.
                            </p>
                        </div>
                    </BlurFade>
                )}
            </div>
        </div>
    );
} 