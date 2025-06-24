'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Grid, List, SortAsc, SortDesc, Loader2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn, responsive } from '@/lib/utils/responsive';
import { BlurFade, MagicCard, ShimmerButton } from '@/components/magicui';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { EnhancedSearchBar } from '@/components/search/EnhancedSearchBar';
import AdvancedFilters, { FilterOptions } from '@/components/search/AdvancedFilters';
import { SearchService } from '@/lib/services/search';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface Recipe {
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
    recipes: Recipe[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
}

type SortOption = 'relevance' | 'rating' | 'cookingTime' | 'createdAt' | 'title';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

const SORT_OPTIONS = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'rating', label: 'Rating' },
    { value: 'cookingTime', label: 'Cooking Time' },
    { value: 'createdAt', label: 'Date Added' },
    { value: 'title', label: 'Name' },
] as const;

export default function SearchPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Search state
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [results, setResults] = useState<SearchResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter state
    const [filters, setFilters] = useState<FilterOptions>({
        cuisine: [],
        difficulty: [],
        cookingTime: {},
        prepTime: {},
        servings: {},
        spiceLevel: [],
        dietaryRestrictions: [],
        ingredients: { include: [], exclude: [] },
        rating: {},
        tags: [],
    });
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    // UI state
    const [sortBy, setSortBy] = useState<SortOption>('relevance');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [page, setPage] = useState(1);
    const [limit] = useState(12);

    // Saved filters (in real app, this would come from user preferences/localStorage)
    const [savedFilters, setSavedFilters] = useState<Array<{ name: string; filters: FilterOptions }>>([]);

    // Debounced search query
    const debouncedQuery = useDebounce(query, 300);

    // Search service instance
    const searchService = useMemo(() => new SearchService(), []);

    // Build search parameters
    const searchParams_obj = useMemo(() => {
        const params: any = {
            query: debouncedQuery,
            page,
            limit,
            sortBy,
            sortOrder,
        };

        // Add active filters
        if (filters.cuisine.length > 0) params.cuisine = filters.cuisine;
        if (filters.difficulty.length > 0) params.difficulty = filters.difficulty;
        if (filters.spiceLevel.length > 0) params.spiceLevel = filters.spiceLevel;
        if (filters.dietaryRestrictions.length > 0) params.dietaryRestrictions = filters.dietaryRestrictions;
        if (filters.tags.length > 0) params.tags = filters.tags;
        if (filters.ingredients.include.length > 0) params.includeIngredients = filters.ingredients.include;
        if (filters.ingredients.exclude.length > 0) params.excludeIngredients = filters.ingredients.exclude;

        // Add range filters
        if (filters.cookingTime.min !== undefined) params.minCookingTime = filters.cookingTime.min;
        if (filters.cookingTime.max !== undefined) params.maxCookingTime = filters.cookingTime.max;
        if (filters.prepTime.min !== undefined) params.minPrepTime = filters.prepTime.min;
        if (filters.prepTime.max !== undefined) params.maxPrepTime = filters.prepTime.max;
        if (filters.servings.min !== undefined) params.minServings = filters.servings.min;
        if (filters.servings.max !== undefined) params.maxServings = filters.servings.max;
        if (filters.rating.min !== undefined) params.minRating = filters.rating.min;

        // Add boolean filters
        if (filters.isGenerated !== undefined) params.isGenerated = filters.isGenerated;
        if (filters.isFavorite !== undefined) params.isFavorite = filters.isFavorite;

        return params;
    }, [debouncedQuery, filters, page, limit, sortBy, sortOrder]);

    // Perform search
    const performSearch = useCallback(async () => {
        if (!debouncedQuery.trim() && !hasActiveFilters()) {
            setResults(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const searchResults = await searchService.searchRecipesAdvanced(searchParams_obj);
            setResults(searchResults);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
            setResults(null);
        } finally {
            setIsLoading(false);
        }
    }, [searchService, searchParams_obj, debouncedQuery]);

    // Check if any filters are active
    const hasActiveFilters = useCallback(() => {
        return (
            filters.cuisine.length > 0 ||
            filters.difficulty.length > 0 ||
            filters.spiceLevel.length > 0 ||
            filters.dietaryRestrictions.length > 0 ||
            filters.ingredients.include.length > 0 ||
            filters.ingredients.exclude.length > 0 ||
            filters.tags.length > 0 ||
            filters.cookingTime.min !== undefined ||
            filters.cookingTime.max !== undefined ||
            filters.prepTime.min !== undefined ||
            filters.prepTime.max !== undefined ||
            filters.servings.min !== undefined ||
            filters.servings.max !== undefined ||
            filters.rating.min !== undefined ||
            filters.isGenerated !== undefined ||
            filters.isFavorite !== undefined
        );
    }, [filters]);

    // Update URL when search changes
    useEffect(() => {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (sortBy !== 'relevance') params.set('sort', sortBy);
        if (sortOrder !== 'desc') params.set('order', sortOrder);
        if (page !== 1) params.set('page', page.toString());

        const newUrl = `/search${params.toString() ? `?${params.toString()}` : ''}`;
        router.replace(newUrl, { scroll: false });
    }, [query, sortBy, sortOrder, page, router]);

    // Trigger search when parameters change
    useEffect(() => {
        performSearch();
    }, [performSearch]);

    // Reset page when search parameters change
    useEffect(() => {
        setPage(1);
    }, [debouncedQuery, filters]);

    // Handle filter changes
    const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
        setFilters(newFilters);
    }, []);

    const handleApplyFilters = useCallback(() => {
        setIsFiltersOpen(false);
        // Search will be triggered by useEffect
    }, []);

    const handleResetFilters = useCallback(() => {
        setFilters({
            cuisine: [],
            difficulty: [],
            cookingTime: {},
            prepTime: {},
            servings: {},
            spiceLevel: [],
            dietaryRestrictions: [],
            ingredients: { include: [], exclude: [] },
            rating: {},
            tags: [],
        });
    }, []);

    // Handle saved filters
    const handleSaveFilters = useCallback((name: string, filterSet: FilterOptions) => {
        setSavedFilters(prev => [...prev, { name, filters: filterSet }]);
    }, []);

    const handleLoadFilters = useCallback((filterSet: FilterOptions) => {
        setFilters(filterSet);
        setIsFiltersOpen(false);
    }, []);

    // Handle sorting
    const handleSortChange = useCallback((newSortBy: SortOption) => {
        if (newSortBy === sortBy) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSortBy);
            setSortOrder(newSortBy === 'relevance' ? 'desc' : 'asc');
        }
    }, [sortBy, sortOrder]);

    // Load more results
    const handleLoadMore = useCallback(() => {
        if (results && results.hasMore) {
            setPage(prev => prev + 1);
        }
    }, [results]);

    return (
        <div className={responsive.container.page}>
            <div className={responsive.spacing.section}>
                {/* Header */}
                <BlurFade delay={0.1}>
                    <div className="text-center mb-8">
                        <h1 className={responsive.text.h1}>Find Your Perfect Recipe</h1>
                        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Search through thousands of recipes with advanced filtering to find exactly what you're looking for.
                        </p>
                    </div>
                </BlurFade>

                {/* Search and Filters */}
                <BlurFade delay={0.2}>
                    <div className="space-y-4 mb-8">
                        <EnhancedSearchBar
                            value={query}
                            onChange={setQuery}
                            placeholder="Search recipes, ingredients, cuisines..."
                            className="max-w-3xl mx-auto"
                        />

                        <div className="flex items-center justify-center">
                            <AdvancedFilters
                                filters={filters}
                                onFiltersChange={handleFiltersChange}
                                onApplyFilters={handleApplyFilters}
                                onResetFilters={handleResetFilters}
                                isOpen={isFiltersOpen}
                                onToggle={() => setIsFiltersOpen(!isFiltersOpen)}
                                savedFilters={savedFilters}
                                onSaveFilters={handleSaveFilters}
                                onLoadFilters={handleLoadFilters}
                            />
                        </div>
                    </div>
                </BlurFade>

                {/* Results Header */}
                {(results || isLoading) && (
                    <BlurFade delay={0.3}>
                        <div className={cn(responsive.flex.between, "mb-6")}>
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

                            <div className="flex items-center space-x-4">
                                {/* View Mode Toggle */}
                                <div className="flex items-center border rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={cn(
                                            "p-2 rounded-md transition-colors",
                                            viewMode === 'grid'
                                                ? "bg-primary text-primary-foreground"
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
                                                ? "bg-primary text-primary-foreground"
                                                : "hover:bg-gray-100 dark:hover:bg-gray-800"
                                        )}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Sort Options */}
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
                                    <div className="flex space-x-1">
                                        {SORT_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => handleSortChange(option.value)}
                                                className={cn(
                                                    "flex items-center space-x-1 px-3 py-1.5 text-sm rounded-md transition-colors",
                                                    sortBy === option.value
                                                        ? "bg-primary text-primary-foreground"
                                                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                                                )}
                                            >
                                                <span>{option.label}</span>
                                                {sortBy === option.value && (
                                                    sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
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
                                <p className="text-gray-600 dark:text-gray-400">{error}</p>
                            </div>
                        </BlurFade>
                    )}

                    {results && results.recipes.length === 0 && !isLoading && (
                        <BlurFade delay={0.4}>
                            <div className="text-center py-12">
                                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    No recipes found
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    Try adjusting your search terms or filters to find more results.
                                </p>
                                <ShimmerButton
                                    onClick={handleResetFilters}
                                    background="linear-gradient(45deg, #6366f1, #8b5cf6)"
                                >
                                    Clear All Filters
                                </ShimmerButton>
                            </div>
                        </BlurFade>
                    )}

                    {results && results.recipes.length > 0 && (
                        <>
                            <div className={cn(
                                viewMode === 'grid'
                                    ? responsive.grid.cards
                                    : "space-y-4"
                            )}>
                                <AnimatePresence>
                                    {results.recipes.map((recipe, index) => (
                                        <BlurFade key={recipe.recipeId} delay={0.1 * (index % 12)}>
                                            <RecipeCard
                                                recipe={recipe}
                                                variant={viewMode === 'list' ? 'compact' : 'default'}
                                                showActions={true}
                                                className="h-full"
                                            />
                                        </BlurFade>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Load More */}
                            {results.hasMore && (
                                <BlurFade delay={0.5}>
                                    <div className="text-center pt-8">
                                        <ShimmerButton
                                            onClick={handleLoadMore}
                                            disabled={isLoading}
                                            background="linear-gradient(45deg, #10b981, #059669)"
                                            className="px-8 py-3"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Loading...
                                                </>
                                            ) : (
                                                `Load More (${results.total - results.recipes.length} remaining)`
                                            )}
                                        </ShimmerButton>
                                    </div>
                                </BlurFade>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
} 