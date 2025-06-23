'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, Heart, X, ThumbsUp, ThumbsDown, Zap } from 'lucide-react';
import { PreferenceFormData, Ingredient, IngredientPreference } from '@/lib/types/preferences';
import { preferencesService } from '@/lib/services/preferences';

interface IngredientPreferencesStepProps {
    data: PreferenceFormData;
    onChange: (data: Partial<PreferenceFormData>) => void;
    onNext: () => void;
    onPrev: () => void;
}

export default function IngredientPreferencesStep({ data, onChange, onNext, onPrev }: IngredientPreferencesStepProps) {
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [categories, setCategories] = useState<string[]>([]);

    // Load ingredients on component mount
    useEffect(() => {
        loadIngredients();
        loadCategories();
    }, []);

    const loadIngredients = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await preferencesService.getIngredients({
                limit: 200,
                sortBy: 'usage',
                sortOrder: 'desc'
            });
            setIngredients(result.ingredients);
        } catch (err: any) {
            console.error('Failed to load ingredients:', err);
            setError('Failed to load ingredients. Using sample data.');
            // Fallback sample ingredients
            setIngredients([
                { ingredientId: 1, name: 'Chicken Breast', category: 'Proteins' },
                { ingredientId: 2, name: 'Tomatoes', category: 'Vegetables' },
                { ingredientId: 3, name: 'Onions', category: 'Vegetables' },
                { ingredientId: 4, name: 'Garlic', category: 'Vegetables' },
                { ingredientId: 5, name: 'Rice', category: 'Grains' },
                { ingredientId: 6, name: 'Pasta', category: 'Grains' },
                { ingredientId: 7, name: 'Cheese', category: 'Dairy' },
                { ingredientId: 8, name: 'Olive Oil', category: 'Oils' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const categoryList = await preferencesService.getIngredientCategories();
            setCategories(['All', ...categoryList]);
        } catch (err) {
            setCategories(['All', 'Vegetables', 'Proteins', 'Grains', 'Dairy', 'Spices', 'Herbs', 'Oils', 'Nuts', 'Fruits']);
        }
    };

    // Filter ingredients based on search and category
    const filteredIngredients = useMemo(() => {
        return ingredients.filter(ingredient => {
            const matchesSearch = searchQuery === '' ||
                ingredient.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'All' ||
                ingredient.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [ingredients, searchQuery, selectedCategory]);

    // Get current preference for an ingredient
    const getIngredientPreference = (ingredientId: number): 'like' | 'dislike' | 'stretch' | null => {
        const pref = data.ingredientPreferences.find(p => p.ingredientId === ingredientId);
        return pref ? pref.preference : null;
    };

    // Set ingredient preference
    const setIngredientPreference = (ingredientId: number, preference: 'like' | 'dislike' | 'stretch') => {
        const updated = data.ingredientPreferences.filter(p => p.ingredientId !== ingredientId);
        const ingredient = ingredients.find(i => i.ingredientId === ingredientId);

        if (ingredient) {
            updated.push({
                ingredientId,
                preference,
                name: ingredient.name,
                category: ingredient.category
            });
        }

        onChange({ ingredientPreferences: updated });
    };

    // Remove ingredient preference
    const removeIngredientPreference = (ingredientId: number) => {
        const updated = data.ingredientPreferences.filter(p => p.ingredientId !== ingredientId);
        onChange({ ingredientPreferences: updated });
    };

    // Preference button styles
    const getPreferenceButtonStyle = (currentPref: string | null, buttonType: string) => {
        const isActive = currentPref === buttonType;
        const baseStyles = "p-2 rounded-lg transition-all duration-200 border";

        switch (buttonType) {
            case 'like':
                return `${baseStyles} ${isActive
                    ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600 text-gray-600 dark:text-gray-400'
                    }`;
            case 'dislike':
                return `${baseStyles} ${isActive
                    ? 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-600 text-gray-600 dark:text-gray-400'
                    }`;
            case 'stretch':
                return `${baseStyles} ${isActive
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 text-yellow-700 dark:text-yellow-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-yellow-300 dark:hover:border-yellow-600 text-gray-600 dark:text-gray-400'
                    }`;
            default:
                return baseStyles;
        }
    };

    // Get counts for each preference type
    const preferenceCounts = useMemo(() => {
        return {
            like: data.ingredientPreferences.filter(p => p.preference === 'like').length,
            dislike: data.ingredientPreferences.filter(p => p.preference === 'dislike').length,
            stretch: data.ingredientPreferences.filter(p => p.preference === 'stretch').length
        };
    }, [data.ingredientPreferences]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <Heart className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Ingredient Preferences
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    Help us personalize recipes by telling us what you love, avoid, or are willing to try
                </p>
            </div>

            {/* Preference Legend */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center space-x-2">
                            <ThumbsUp className="w-5 h-5 text-green-500" />
                            <span className="font-medium text-green-700 dark:text-green-300">Love It</span>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Ingredients you enjoy</span>
                        <span className="text-lg font-bold text-green-600">{preferenceCounts.like}</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center space-x-2">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            <span className="font-medium text-yellow-700 dark:text-yellow-300">Stretch Zone</span>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Willing to try occasionally</span>
                        <span className="text-lg font-bold text-yellow-600">{preferenceCounts.stretch}</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center space-x-2">
                            <ThumbsDown className="w-5 h-5 text-red-500" />
                            <span className="font-medium text-red-700 dark:text-red-300">Avoid</span>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Ingredients to exclude</span>
                        <span className="text-lg font-bold text-red-600">{preferenceCounts.dislike}</span>
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search ingredients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === category
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-600'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Ingredients Grid */}
            <div className="space-y-4">
                {loading && (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">Loading ingredients...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <p className="text-yellow-800 dark:text-yellow-200 text-sm">{error}</p>
                    </div>
                )}

                {!loading && filteredIngredients.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-gray-600 dark:text-gray-400">No ingredients found. Try adjusting your search or category filter.</p>
                    </div>
                )}

                {!loading && filteredIngredients.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredIngredients.map(ingredient => {
                            const currentPref = getIngredientPreference(ingredient.ingredientId);
                            return (
                                <div
                                    key={ingredient.ingredientId}
                                    className={`
                                        p-4 rounded-xl border-2 transition-all duration-200
                                        ${currentPref
                                            ? 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }
                                    `}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                {ingredient.name}
                                            </h4>
                                            {ingredient.category && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {ingredient.category}
                                                </p>
                                            )}
                                        </div>
                                        {currentPref && (
                                            <button
                                                onClick={() => removeIngredientPreference(ingredient.ingredientId)}
                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setIngredientPreference(ingredient.ingredientId, 'like')}
                                            className={getPreferenceButtonStyle(currentPref, 'like')}
                                            title="Love it - Include often"
                                        >
                                            <ThumbsUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setIngredientPreference(ingredient.ingredientId, 'stretch')}
                                            className={getPreferenceButtonStyle(currentPref, 'stretch')}
                                            title="Stretch zone - Willing to try"
                                        >
                                            <Zap className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setIngredientPreference(ingredient.ingredientId, 'dislike')}
                                            className={getPreferenceButtonStyle(currentPref, 'dislike')}
                                            title="Avoid - Don't include"
                                        >
                                            <ThumbsDown className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Skip Information */}
            <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Don't worry if you skip some ingredients - you can always add preferences later.
                    We'll start with safe, popular ingredients and learn from your feedback.
                </p>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={onPrev}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center space-x-2"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span>Back</span>
                </button>

                <button
                    onClick={onNext}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
                >
                    <span>Continue</span>
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}