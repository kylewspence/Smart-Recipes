'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/contexts/AuthContext';
import { recipeService, RecipeCollection } from '@/lib/services/recipe';
import { Recipe } from '@/lib/types/recipe';
import RecipeDisplay from '@/components/recipe/RecipeDisplay';
import CollectionsManager from '@/components/recipe/CollectionsManager';
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
    Star
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

    useEffect(() => {
        if (user) {
            loadRecipes();
        }
    }, [user, activeTab]);

    const loadRecipes = async () => {
        if (!user) return;

        setIsLoading(true);
        setError(null);

        try {
            if (activeTab === 'saved') {
                const recipes = await recipeService.getSavedRecipes(user.id);
                setSavedRecipes(recipes);
            } else if (activeTab === 'favorites') {
                const recipes = await recipeService.getFavoriteRecipes(user.id);
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

    const filteredRecipes = () => {
        const recipes = activeTab === 'saved' ? savedRecipes : favoriteRecipes;
        if (!searchQuery) return recipes;

        return recipes.filter(recipe =>
            recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            recipe.cuisine?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

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
                        ) : filteredRecipes().length === 0 ? (
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
                                    {filteredRecipes().map((recipe) => (
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