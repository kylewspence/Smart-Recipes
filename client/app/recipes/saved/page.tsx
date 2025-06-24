'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/contexts/AuthContext';
import { recipeService, RecipeCollection } from '@/lib/services/recipe';
import { Recipe } from '@/lib/types/recipe';
import RecipeDisplay from '@/components/recipe/RecipeDisplay';
import CollectionsManager from '@/components/recipe/CollectionsManager';
import AdvancedRecipeFilters, { FilterOptions } from '@/components/recipe/AdvancedRecipeFilters';
import BulkRecipeActions from '@/components/recipe/BulkRecipeActions';
import SelectableRecipeCard from '@/components/recipe/SelectableRecipeCard';
import {
    Search,
    Filter,
    Grid3X3,
    List,
    Heart,
    Bookmark,
    FolderOpen,
    Plus,
    ArrowLeft,
    ChefHat,
    Clock,
    Users,
    Star,
    CheckSquare,
    Square
} from 'lucide-react';

type ViewMode = 'grid' | 'list';
type TabMode = 'saved' | 'favorites' | 'collections';

interface CollectionViewProps {
    collection: RecipeCollection;
    onBack: () => void;
}

const CollectionView: React.FC<CollectionViewProps> = ({ collection, onBack }) => {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadCollectionRecipes();
    }, [collection.collectionId]);

    const loadCollectionRecipes = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const collectionRecipes = await recipeService.getCollectionRecipes(collection.collectionId);
            setRecipes(collectionRecipes);
        } catch (error: any) {
            setError('Failed to load collection recipes');
            console.error('Failed to load collection recipes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveFromCollection = async (recipeId: number) => {
        try {
            await recipeService.removeRecipeFromCollection(collection.collectionId, recipeId);
            setRecipes(prev => prev.filter(r => r.id !== recipeId));
        } catch (error) {
            console.error('Failed to remove recipe from collection:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="flex items-center"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Collections
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                            <FolderOpen className="w-6 h-6 mr-2 text-orange-500" />
                            {collection.name}
                        </h1>
                        {collection.description && (
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                {collection.description}
                            </p>
                        )}
                    </div>
                </div>
                <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    collection.isPublic
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                )}>
                    {collection.isPublic ? 'Public' : 'Private'}
                </span>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-gray-200 dark:bg-gray-800 rounded-xl h-64 animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-8">
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <Button onClick={loadCollectionRecipes} variant="outline">
                        Try Again
                    </Button>
                </div>
            ) : recipes.length === 0 ? (
                <div className="text-center py-12">
                    <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        No recipes in this collection
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Start adding recipes to build your collection.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recipes.map((recipe) => (
                        <RecipeDisplay
                            key={recipe.id}
                            recipe={recipe}
                            variant="compact"
                            isSaved={true}
                            onSave={() => handleRemoveFromCollection(recipe.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function SavedRecipesPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabMode>('saved');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
    const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCollection, setSelectedCollection] = useState<RecipeCollection | null>(null);

    // Advanced filtering and bulk operations state
    const [selectedRecipes, setSelectedRecipes] = useState<number[]>([]);
    const [bulkMode, setBulkMode] = useState(false);
    const [collections, setCollections] = useState<RecipeCollection[]>([]);
    const [filters, setFilters] = useState<FilterOptions>({
        cuisines: [],
        cookingTime: {},
        difficulty: [],
        dietaryRestrictions: [],
        rating: {},
        sortBy: 'dateAdded',
        sortOrder: 'desc'
    });

    useEffect(() => {
        if (user) {
            loadRecipes();
            loadCollections();
        }
    }, [user, activeTab]);

    const loadCollections = async () => {
        if (!user) return;
        try {
            const userCollections = await recipeService.getCollections(user.userId);
            setCollections(userCollections);
        } catch (error) {
            console.error('Failed to load collections:', error);
        }
    };

    const loadRecipes = async () => {
        if (!user) return;

        setIsLoading(true);
        setError(null);

        try {
            if (activeTab === 'saved') {
                const recipes = await recipeService.getSavedRecipes(user.userId);
                setSavedRecipes(recipes);
            } else if (activeTab === 'favorites') {
                const recipes = await recipeService.getFavoriteRecipes(user.userId);
                setFavoriteRecipes(recipes);
            }
        } catch (error: any) {
            setError('Failed to load recipes');
            console.error('Failed to load recipes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnsaveRecipe = (recipeId: number) => {
        setSavedRecipes(prev => prev.filter(r => r.id !== recipeId));
    };

    const handleUnfavoriteRecipe = (recipeId: number) => {
        setFavoriteRecipes(prev => prev.filter(r => r.id !== recipeId));
    };

    // Advanced filtering and sorting logic
    const filteredAndSortedRecipes = useMemo(() => {
        const recipes = activeTab === 'saved' ? savedRecipes : favoriteRecipes;
        let filtered = [...recipes];

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(recipe =>
                recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                recipe.cuisine?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                recipe.ingredients?.some(ing =>
                    ing.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }

        // Apply cuisine filter
        if (filters.cuisines.length > 0) {
            filtered = filtered.filter(recipe =>
                filters.cuisines.includes(recipe.cuisine || 'Other')
            );
        }

        // Apply cooking time filter
        if (filters.cookingTime.min !== undefined || filters.cookingTime.max !== undefined) {
            filtered = filtered.filter(recipe => {
                const cookTime = recipe.cookingTime || 0;
                const minTime = filters.cookingTime.min || 0;
                const maxTime = filters.cookingTime.max || Infinity;
                return cookTime >= minTime && cookTime <= maxTime;
            });
        }

        // Apply difficulty filter
        if (filters.difficulty.length > 0) {
            filtered = filtered.filter(recipe =>
                filters.difficulty.includes(recipe.difficulty?.toLowerCase() || 'easy')
            );
        }

        // Apply dietary restrictions filter
        if (filters.dietaryRestrictions.length > 0) {
            filtered = filtered.filter(recipe =>
                filters.dietaryRestrictions.some(restriction =>
                    recipe.tags?.some(tag =>
                        tag.toLowerCase().includes(restriction.toLowerCase())
                    )
                )
            );
        }

        // Apply rating filter
        if (filters.rating.min !== undefined && filters.rating.min > 0) {
            filtered = filtered.filter(recipe =>
                (recipe.rating || 0) >= filters.rating.min!
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (filters.sortBy) {
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'cookingTime':
                    comparison = (a.cookingTime || 0) - (b.cookingTime || 0);
                    break;
                case 'rating':
                    comparison = (b.rating || 0) - (a.rating || 0);
                    break;
                case 'difficulty':
                    const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
                    const aDiff = difficultyOrder[a.difficulty?.toLowerCase() as keyof typeof difficultyOrder] || 1;
                    const bDiff = difficultyOrder[b.difficulty?.toLowerCase() as keyof typeof difficultyOrder] || 1;
                    comparison = aDiff - bDiff;
                    break;
                case 'dateAdded':
                default:
                    comparison = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                    break;
            }

            return filters.sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [savedRecipes, favoriteRecipes, activeTab, searchQuery, filters]);

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Please Log In
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        You need to be logged in to view your saved recipes.
                    </p>
                </div>
            </div>
        );
    }

    if (selectedCollection) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <CollectionView
                        collection={selectedCollection}
                        onBack={() => setSelectedCollection(null)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        My Recipe Collection
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage your saved recipes, favorites, and collections
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-200 dark:bg-gray-800 rounded-lg p-1 mb-6 w-fit">
                    <button
                        onClick={() => setActiveTab('saved')}
                        className={cn(
                            'flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors',
                            activeTab === 'saved'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        )}
                    >
                        <Bookmark className="w-4 h-4 mr-2" />
                        Saved ({savedRecipes.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('favorites')}
                        className={cn(
                            'flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors',
                            activeTab === 'favorites'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        )}
                    >
                        <Heart className="w-4 h-4 mr-2" />
                        Favorites ({favoriteRecipes.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('collections')}
                        className={cn(
                            'flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors',
                            activeTab === 'collections'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        )}
                    >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Collections
                    </button>
                </div>

                {activeTab === 'collections' ? (
                    <CollectionsManager
                        onCollectionSelect={setSelectedCollection}
                    />
                ) : (
                    <>
                        {/* Search and Controls */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    placeholder="Search recipes..."
                                    value={searchQuery}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors duration-200"
                                />
                            </div>
                            <div className="flex space-x-2">
                                <Button
                                    variant={bulkMode ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => {
                                        setBulkMode(!bulkMode);
                                        setSelectedRecipes([]);
                                    }}
                                    className="flex items-center"
                                >
                                    {bulkMode ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                                    Select
                                </Button>
                                <Button
                                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setViewMode('grid')}
                                >
                                    <Grid3X3 className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'list' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setViewMode('list')}
                                >
                                    <List className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Advanced Filters */}
                        <div className="mb-6">
                            <AdvancedRecipeFilters
                                filters={filters}
                                onFiltersChange={setFilters}
                                onClearFilters={() => setFilters({
                                    cuisines: [],
                                    cookingTime: {},
                                    difficulty: [],
                                    dietaryRestrictions: [],
                                    rating: {},
                                    sortBy: 'dateAdded',
                                    sortOrder: 'desc'
                                })}
                                totalRecipes={activeTab === 'saved' ? savedRecipes.length : favoriteRecipes.length}
                                filteredCount={filteredAndSortedRecipes.length}
                            />
                        </div>

                        {/* Recipes */}
                        {isLoading ? (
                            <div className={cn(
                                'grid gap-6',
                                viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
                            )}>
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="bg-gray-200 dark:bg-gray-800 rounded-xl h-64 animate-pulse" />
                                ))}
                            </div>
                        ) : error ? (
                            <div className="text-center py-8">
                                <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                                <Button onClick={loadRecipes} variant="outline">
                                    Try Again
                                </Button>
                            </div>
                        ) : filteredAndSortedRecipes.length === 0 ? (
                            <div className="text-center py-12">
                                {activeTab === 'saved' ? (
                                    <Bookmark className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                ) : (
                                    <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                )}
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    No {activeTab} recipes yet
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    {activeTab === 'saved'
                                        ? "Start saving recipes you'd like to cook later."
                                        : "Mark recipes as favorites to see them here."
                                    }
                                </p>
                                <Button
                                    onClick={() => window.location.href = '/recipe-generator'}
                                    className="flex items-center"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Generate New Recipe
                                </Button>
                            </div>
                        ) : (
                            <div className={cn(
                                'grid gap-6',
                                viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
                            )}>
                                <AnimatePresence>
                                    {filteredAndSortedRecipes.map((recipe: Recipe) => (
                                        <motion.div
                                            key={recipe.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                        >
                                            <RecipeDisplay
                                                recipe={recipe}
                                                variant={viewMode === 'grid' ? 'compact' : 'default'}
                                                isSaved={activeTab === 'saved'}
                                                isLiked={activeTab === 'favorites'}
                                                onSave={() => {
                                                    if (activeTab === 'saved') {
                                                        handleUnsaveRecipe(recipe.id);
                                                    }
                                                }}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
} 