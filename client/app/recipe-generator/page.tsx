'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import RecipeGenerationForm from '@/components/recipe/RecipeGenerationForm';
import RecipeGenerationLoading from '@/components/recipe/RecipeGenerationLoading';
import RecipeDisplay from '@/components/recipe/RecipeDisplay';
import { Recipe } from '@/lib/types/recipe';
import { ChefHat } from 'lucide-react';

export default function RecipeGeneratorPage() {
    const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStartTime, setGenerationStartTime] = useState<Date | null>(null);
    const [recipeType, setRecipeType] = useState<string>('recipe');

    const handleRecipeGenerated = (recipe: Recipe) => {
        setGeneratedRecipe(recipe);
        setIsGenerating(false);
        setGenerationStartTime(null);
    };

    const handleGenerationStart = (formData?: any) => {
        setIsGenerating(true);
        setGeneratedRecipe(null);
        setGenerationStartTime(new Date());

        // Set recipe type for loading display
        if (formData?.mealType) {
            setRecipeType(formData.mealType.toLowerCase());
        }
    };

    const handleGenerationError = (error: string) => {
        setIsGenerating(false);
        setGenerationStartTime(null);
        console.error('Recipe generation error:', error);
    };

    const handleCancelGeneration = () => {
        setIsGenerating(false);
        setGenerationStartTime(null);
        // TODO: Implement actual API cancellation if needed
    };

    const resetGenerator = () => {
        setGeneratedRecipe(null);
        setIsGenerating(false);
        setGenerationStartTime(null);
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
                                    onGenerationError={handleGenerationError}
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
                                        <RecipeGenerationLoading
                                            key="generating"
                                            onCancel={handleCancelGeneration}
                                            estimatedTime={45}
                                            recipeType={recipeType}
                                        />
                                    )}

                                    {generatedRecipe && (
                                        <RecipeDisplay
                                            key="recipe"
                                            recipe={generatedRecipe}
                                            onSave={() => {
                                                console.log('Save recipe:', generatedRecipe.title);
                                                // TODO: Implement recipe saving functionality
                                            }}
                                            onGenerateAnother={resetGenerator}
                                            onShare={() => {
                                                console.log('Share recipe:', generatedRecipe.title);
                                                // TODO: Implement recipe sharing functionality
                                            }}
                                            onGenerateVariation={() => {
                                                console.log('Generate variation for:', generatedRecipe.title);
                                                // TODO: Implement recipe variation generation
                                            }}
                                            onEdit={() => {
                                                console.log('Edit recipe:', generatedRecipe.title);
                                                // TODO: Implement recipe editing functionality
                                            }}
                                            onCopy={() => {
                                                console.log('Copy recipe:', generatedRecipe.title);
                                                // TODO: Implement recipe copying functionality
                                            }}
                                            onPrint={() => {
                                                console.log('Print recipe:', generatedRecipe.title);
                                                // TODO: Implement recipe printing functionality
                                            }}
                                            onRate={(rating) => {
                                                console.log('Rate recipe:', generatedRecipe.title, 'Rating:', rating);
                                                // TODO: Implement recipe rating functionality
                                            }}
                                            showActions={true}
                                            showNutrition={true}
                                            showRating={true}
                                            variant="default"
                                        />
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