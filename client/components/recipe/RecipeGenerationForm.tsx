'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChefHat, Clock, Plus, X, Sparkles, Loader, Wand2 } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { RecipeGenerationParams, recipeService } from '@/lib/services/recipe';
import { preferencesService } from '@/lib/services/preferences';
import {
    RecipeFormData,
    RecipeGenerationRequest,
    MEAL_TYPES,
    RECIPE_CUISINES,
    DIFFICULTY_LEVELS,
    COOKING_TIME_OPTIONS,
    SPICE_LEVELS,
    SERVING_SIZE_OPTIONS,
    Recipe
} from '@/lib/types/recipe';
import { UserPreferences } from '@/lib/types/preferences';

interface RecipeGenerationFormProps {
    onRecipeGenerated: (recipe: Recipe) => void;
    onGenerationStart: (formData?: any) => void;
    onGenerationError?: (error: string) => void;
    className?: string;
}

export default function RecipeGenerationForm({ onRecipeGenerated, onGenerationStart, onGenerationError, className = '' }: RecipeGenerationFormProps) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);

    // Form state
    const [formData, setFormData] = useState<RecipeFormData>({
        message: '',
        mealType: 'Dinner',
        cuisine: 'Any',
        difficulty: 'medium',
        cookingTime: 60,
        servings: 4,
        spiceLevel: 'medium',
        includeIngredients: [],
        excludeIngredients: [],
        dietaryRestrictions: []
    });

    // Ingredient input states
    const [includeIngredientInput, setIncludeIngredientInput] = useState('');
    const [excludeIngredientInput, setExcludeIngredientInput] = useState('');

    // Quick recipe suggestions
    const quickSuggestions = [
        "Something with chicken and vegetables",
        "A hearty pasta dish",
        "Quick and healthy breakfast",
        "Comfort food for a cold day",
        "Light summer meal",
        "Vegetarian protein-rich meal",
        "One-pot dinner",
        "Spicy Asian-inspired dish"
    ];

    // Load user preferences on component mount
    const loadUserPreferences = useCallback(async () => {
        if (!user?.userId) return;

        try {
            const prefs = await preferencesService.getUserPreferences(user.userId.toString());
            setUserPreferences(prefs);

            // Pre-fill form with user preferences
            setFormData(prev => ({
                ...prev,
                dietaryRestrictions: prefs.dietaryRestrictions || [],
                cookingTime: prefs.maxCookingTime || 60,
                servings: prefs.servingSize || 4,
                spiceLevel: prefs.spiceLevel || 'medium'
            }));
        } catch (error) {
            console.error('Failed to load user preferences:', error);
        }
    }, [user?.id]);

    useEffect(() => {
        loadUserPreferences();
    }, [loadUserPreferences]);

    // Update form data
    const updateFormData = (updates: Partial<RecipeFormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    // Add ingredient to include list
    const addIncludeIngredient = () => {
        if (includeIngredientInput.trim() && !formData.includeIngredients.includes(includeIngredientInput.trim())) {
            updateFormData({
                includeIngredients: [...formData.includeIngredients, includeIngredientInput.trim()]
            });
            setIncludeIngredientInput('');
        }
    };

    // Add ingredient to exclude list
    const addExcludeIngredient = () => {
        if (excludeIngredientInput.trim() && !formData.excludeIngredients.includes(excludeIngredientInput.trim())) {
            updateFormData({
                excludeIngredients: [...formData.excludeIngredients, excludeIngredientInput.trim()]
            });
            setExcludeIngredientInput('');
        }
    };

    // Remove ingredient from include list
    const removeIncludeIngredient = (ingredient: string) => {
        updateFormData({
            includeIngredients: formData.includeIngredients.filter(ing => ing !== ingredient)
        });
    };

    // Remove ingredient from exclude list
    const removeExcludeIngredient = (ingredient: string) => {
        updateFormData({
            excludeIngredients: formData.excludeIngredients.filter(ing => ing !== ingredient)
        });
    };

    // Use a quick suggestion
    const selectQuickSuggestion = (suggestion: string) => {
        updateFormData({ message: suggestion });
    };

    // Generate recipe
    const generateRecipe = async () => {
        if (!user?.userId) {
            setError('Please log in to generate recipes.');
            return;
        }

        if (!formData.message.trim()) {
            setError('Please describe what kind of recipe you want.');
            return;
        }

        setIsLoading(true);
        setError(null);
        onGenerationStart(formData);

        try {
            const request: RecipeGenerationRequest = {
                userId: user.userId,
                message: formData.message,
                mealType: formData.mealType,
                cuisine: formData.cuisine === 'Any' ? undefined : formData.cuisine,
                difficulty: formData.difficulty,
                cookingTime: formData.cookingTime,
                servings: formData.servings,
                spiceLevel: formData.spiceLevel,
                includeIngredients: formData.includeIngredients.length > 0 ? formData.includeIngredients : undefined,
                excludeIngredients: formData.excludeIngredients.length > 0 ? formData.excludeIngredients : undefined,
                dietaryRestrictions: formData.dietaryRestrictions.length > 0 ? formData.dietaryRestrictions : undefined
            };

            const response = await recipeService.generateRecipe(request as RecipeGenerationParams);
            onRecipeGenerated(response.recipe);

            // Clear the message for next generation
            updateFormData({ message: '' });
        } catch (err: unknown) {
            console.error('Recipe generation failed:', err);
            let errorMessage = 'An unexpected error occurred';

            if (err instanceof Error) {
                errorMessage = err.message;
                // Add more specific error messages for common issues
                if (err.message.includes('fetch')) {
                    errorMessage = 'Unable to connect to the recipe server. Please try again later.';
                } else if (err.message.includes('404')) {
                    errorMessage = 'Recipe service is temporarily unavailable. Please try again later.';
                } else if (err.message.includes('timeout')) {
                    errorMessage = 'Request timed out. Please try again.';
                }
            }

            setError(`Recipe generation failed: ${errorMessage}`);
            onGenerationError?.(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 ${className}`}>
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <ChefHat className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Generate Your Perfect Recipe
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    Tell us what you&apos;re craving and we&apos;ll create a personalized recipe just for you
                </p>
            </div>

            {/* Main Recipe Request */}
            <div className="space-y-6">
                {/* Recipe Description Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        What would you like to cook? <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <textarea
                            value={formData.message}
                            onChange={(e) => updateFormData({ message: e.target.value })}
                            placeholder="Describe the recipe you want... (e.g., 'A healthy pasta dish with vegetables' or 'Comfort food for a rainy day')"
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                        />
                        <Sparkles className="absolute top-3 right-3 w-5 h-5 text-orange-500" />
                    </div>

                    {/* Quick Suggestions */}
                    <div className="mt-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quick suggestions:</p>
                        <div className="flex flex-wrap gap-2">
                            {quickSuggestions.slice(0, 4).map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => selectQuickSuggestion(suggestion)}
                                    className="px-3 py-1 text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recipe Options Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Meal Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Meal Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {MEAL_TYPES.slice(0, 6).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => updateFormData({ mealType: type })}
                                    className={`p-2 text-sm rounded-lg border-2 transition-all ${formData.mealType === type
                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cuisine */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Cuisine Style
                        </label>
                        <select
                            value={formData.cuisine}
                            onChange={(e) => updateFormData({ cuisine: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            {RECIPE_CUISINES.map((cuisine) => (
                                <option key={cuisine} value={cuisine}>{cuisine}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Cooking Details Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Difficulty */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Difficulty Level
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {DIFFICULTY_LEVELS.map((level) => (
                                <button
                                    key={level.value}
                                    onClick={() => updateFormData({ difficulty: level.value })}
                                    className={`p-3 rounded-lg border-2 transition-all text-center ${formData.difficulty === level.value
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <div className="text-sm font-medium">{level.label}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{level.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cooking Time */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Maximum Cooking Time
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {COOKING_TIME_OPTIONS.slice(0, 6).map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => updateFormData({ cookingTime: option.value })}
                                    className={`p-2 text-sm rounded-lg border-2 transition-all ${formData.cookingTime === option.value
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <Clock className="w-4 h-4 mx-auto mb-1" />
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Advanced Options Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Serving Size */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Serving Size
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {SERVING_SIZE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => updateFormData({ servings: option.value })}
                                    className={`p-2 text-sm rounded-lg border-2 transition-all text-center ${formData.servings === option.value
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <div className="text-sm font-medium">{option.label}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Spice Level */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Spice Level
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {SPICE_LEVELS.map((level) => (
                                <button
                                    key={level.value}
                                    onClick={() => updateFormData({ spiceLevel: level.value })}
                                    className={`p-3 rounded-lg border-2 transition-all text-center ${formData.spiceLevel === level.value
                                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <div className="text-lg mb-1">{level.emoji}</div>
                                    <div className="text-sm font-medium">{level.label}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{level.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Ingredients Section */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Include Ingredients */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Must Include Ingredients
                        </label>
                        <div className="space-y-3">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={includeIngredientInput}
                                    onChange={(e) => setIncludeIngredientInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addIncludeIngredient()}
                                    placeholder="Add ingredient..."
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                                <button
                                    onClick={addIncludeIngredient}
                                    className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            {formData.includeIngredients.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.includeIngredients.map((ingredient) => (
                                        <span
                                            key={ingredient}
                                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                                        >
                                            {ingredient}
                                            <button
                                                onClick={() => removeIncludeIngredient(ingredient)}
                                                className="ml-2 hover:text-green-600 dark:hover:text-green-300"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Exclude Ingredients */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Avoid Ingredients
                        </label>
                        <div className="space-y-3">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={excludeIngredientInput}
                                    onChange={(e) => setExcludeIngredientInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addExcludeIngredient()}
                                    placeholder="Add ingredient to avoid..."
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                                <button
                                    onClick={addExcludeIngredient}
                                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            {formData.excludeIngredients.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.excludeIngredients.map((ingredient) => (
                                        <span
                                            key={ingredient}
                                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                                        >
                                            {ingredient}
                                            <button
                                                onClick={() => removeExcludeIngredient(ingredient)}
                                                className="ml-2 hover:text-red-600 dark:hover:text-red-300"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dietary Restrictions (from user preferences) */}
                {userPreferences?.dietaryRestrictions && userPreferences.dietaryRestrictions.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                            Your Dietary Restrictions (from preferences):
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {userPreferences.dietaryRestrictions.map((restriction) => (
                                <span
                                    key={restriction}
                                    className="px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200"
                                >
                                    {restriction}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                    </div>
                )}

                {/* Generate Button */}
                <div className="flex justify-center pt-6">
                    <button
                        onClick={generateRecipe}
                        disabled={isLoading || !formData.message.trim()}
                        className={`px-8 py-4 rounded-xl font-semibold text-lg flex items-center space-x-3 transition-all ${isLoading || !formData.message.trim()
                            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader className="w-6 h-6 animate-spin" />
                                <span>Generating Recipe...</span>
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-6 h-6" />
                                <span>Generate Recipe</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
} 