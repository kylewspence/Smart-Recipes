'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import RecipeGenerationForm from '@/components/recipe/RecipeGenerationForm';
import { Recipe } from '@/lib/types/recipe';
import { Clock, Users, ChefHat, Bookmark, Share2, Star } from 'lucide-react';

export default function RecipeGeneratorPage() {
    const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleRecipeGenerated = (recipe: Recipe) => {
        setGeneratedRecipe(recipe);
        setIsGenerating(false);
    };

    const handleGenerationStart = () => {
        setIsGenerating(true);
        setGeneratedRecipe(null);
    };

    const resetGenerator = () => {
        setGeneratedRecipe(null);
        setIsGenerating(false);
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="container mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                                🍳 Smart Recipe Generator
                            </h1>
                            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                                Powered by AI, tailored for your preferences. Create amazing recipes in seconds.
                            </p>
                        </motion.div>
                    </div>

                    <div className="max-w-7xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Recipe Generation Form */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                            >
                                <RecipeGenerationForm
                                    onRecipeGenerated={handleRecipeGenerated}
                                    onGenerationStart={handleGenerationStart}
                                    className="h-fit"
                                />
                            </motion.div>

                            {/* Recipe Display Area */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.4 }}
                                className="space-y-6"
                            >
                                <AnimatePresence mode="wait">
                                    {isGenerating && (
                                        <motion.div
                                            key="generating"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8"
                                        >
                                            <div className="text-center">
                                                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                                                    <ChefHat className="w-8 h-8 text-white animate-bounce" />
                                                </div>
                                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                                    Crafting Your Recipe
                                                </h3>
                                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                                    Our AI chef is working on something delicious...
                                                </p>
                                                <div className="flex justify-center">
                                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {generatedRecipe && (
                                        <motion.div
                                            key="recipe"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
                                        >
                                            {/* Recipe Header */}
                                            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-6">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h2 className="text-2xl font-bold mb-2">{generatedRecipe.title}</h2>
                                                        <p className="text-orange-100">{generatedRecipe.description}</p>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                                                            <Bookmark className="w-5 h-5" />
                                                        </button>
                                                        <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                                                            <Share2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Recipe Info */}
                                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                                <div className="grid grid-cols-3 gap-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <Clock className="w-6 h-6 text-orange-500 mb-2" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Prep + Cook</span>
                                                        <span className="font-semibold text-gray-900 dark:text-white">
                                                            {(generatedRecipe.prepTime || 0) + (generatedRecipe.cookingTime || 0)} min
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <Users className="w-6 h-6 text-orange-500 mb-2" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Servings</span>
                                                        <span className="font-semibold text-gray-900 dark:text-white">
                                                            {generatedRecipe.servings || 4}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <Star className="w-6 h-6 text-orange-500 mb-2" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Difficulty</span>
                                                        <span className="font-semibold text-gray-900 dark:text-white capitalize">
                                                            {generatedRecipe.difficulty || 'Medium'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Ingredients */}
                                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Ingredients</h3>
                                                <div className="space-y-2">
                                                    {generatedRecipe.ingredients?.map((ingredient, index) => (
                                                        <div key={index} className="flex items-center space-x-3">
                                                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                                            <span className="text-gray-700 dark:text-gray-300">
                                                                <span className="font-medium">{ingredient.amount} {ingredient.unit}</span> {ingredient.name}
                                                                {ingredient.preparation && (
                                                                    <span className="text-gray-500 dark:text-gray-400"> ({ingredient.preparation})</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Instructions */}
                                            <div className="p-6">
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Instructions</h3>
                                                <div className="space-y-4">
                                                    {generatedRecipe.instructions?.map((instruction, index) => (
                                                        <div key={index} className="flex space-x-4">
                                                            <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                                                                {index + 1}
                                                            </div>
                                                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-1">
                                                                {instruction}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="p-6 bg-gray-50 dark:bg-gray-800 flex space-x-4">
                                                <button
                                                    onClick={resetGenerator}
                                                    className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                                >
                                                    Generate Another
                                                </button>
                                                <button className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-700 transition-all">
                                                    Save Recipe
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {!isGenerating && !generatedRecipe && (
                                        <motion.div
                                            key="placeholder"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8"
                                        >
                                            <div className="text-center">
                                                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center">
                                                    <ChefHat className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                                                </div>
                                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                                    Ready to Cook?
                                                </h3>
                                                <p className="text-gray-600 dark:text-gray-400">
                                                    Fill out the form on the left to generate your perfect recipe!
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}