'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Home } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageHeader } from '@/components/navigation/PageHeader';
import RecipeGenerationForm from '@/components/recipe/RecipeGenerationForm';
import RecipeGenerationLoading from '@/components/recipe/RecipeGenerationLoading';
import RecipeDisplay from '@/components/recipe/RecipeDisplay';
import { Recipe } from '@/lib/types/recipe';
import { ChefHat } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { recipeService } from '@/lib/services/recipe';

export default function RecipeGeneratorPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
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
                    {/* Page Header with Navigation */}
                    <PageHeader
                        breadcrumbItems={[
                            { label: 'Dashboard', href: '/dashboard' },
                            { label: 'Recipe Generator' }
                        ]}
                        actions={
                            <div className="hidden md:flex items-center space-x-2">
                                <button
                                    onClick={() => router.push('/search')}
                                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                                >
                                    Search Recipes
                                </button>
                                <button
                                    onClick={() => router.push('/recipes/saved')}
                                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                                >
                                    Saved Recipes
                                </button>
                            </div>
                        }
                    />

                    {/* Mobile Floating Navigation */}
                    <div className="fixed bottom-20 right-4 md:hidden z-40">
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => router.push('/dashboard')}
                            className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-lg flex items-center justify-center"
                            aria-label="Back to Dashboard"
                        >
                            <Home className="w-6 h-6" />
                        </motion.button>
                    </div>

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

                    {/* Development Navigation Debug Panel */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                                🔧 Navigation Debug (Development Only)
                            </h3>
                            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                <p>User: {user?.email || 'Not logged in'}</p>
                                <p>Authenticated: {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
                                <p>Current Path: {typeof window !== 'undefined' ? window.location.pathname : 'Unknown'}</p>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded hover:bg-blue-200 dark:hover:bg-blue-700"
                                >
                                    Dashboard
                                </button>
                                <button
                                    onClick={() => router.push('/search')}
                                    className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded hover:bg-blue-200 dark:hover:bg-blue-700"
                                >
                                    Search
                                </button>
                                <button
                                    onClick={() => router.push('/recipes/saved')}
                                    className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded hover:bg-blue-200 dark:hover:bg-blue-700"
                                >
                                    Saved Recipes
                                </button>
                                <button
                                    onClick={() => router.push('/')}
                                    className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded hover:bg-blue-200 dark:hover:bg-blue-700"
                                >
                                    Home
                                </button>
                            </div>
                        </div>
                    )}

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
                                            onGenerateVariation={async () => {
                                                try {
                                                    // Generate a simple variation by calling the service with a generic variation
                                                    const variationResponse = await recipeService.generateVariation(
                                                        generatedRecipe.id,
                                                        'cuisine',
                                                        'Generate a variation of this recipe with a different flavor profile or cooking method'
                                                    );
                                                    setGeneratedRecipe(variationResponse.variationRecipe);
                                                } catch (error) {
                                                    console.error('Failed to generate variation:', error);
                                                    // Create a simple variation by modifying the title
                                                    const variation = {
                                                        ...generatedRecipe,
                                                        id: Date.now(), // Temporary ID for new variation
                                                        title: `${generatedRecipe.title} (Variation)`,
                                                        description: `A delicious variation of ${generatedRecipe.title}`
                                                    };
                                                    setGeneratedRecipe(variation);
                                                }
                                            }}
                                            onEdit={() => {
                                                console.log('Edit recipe:', generatedRecipe.title);
                                                // TODO: Implement recipe editing functionality
                                            }}
                                            onPrint={() => {
                                                // Simple print functionality - format recipe for printing
                                                const printWindow = window.open('', '_blank');
                                                if (printWindow) {
                                                    const ingredientsList = generatedRecipe.ingredients?.map(ing => 
                                                        typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.unit || ''} ${ing.name || ing}`.trim()
                                                    ).join('\n• ') || '';

                                                    const instructionsList = Array.isArray(generatedRecipe.instructions) 
                                                        ? generatedRecipe.instructions.join('\n') 
                                                        : (typeof generatedRecipe.instructions === 'string' 
                                                            ? generatedRecipe.instructions 
                                                            : '');

                                                    const printContent = `
                                                        <html>
                                                            <head>
                                                                <title>${generatedRecipe.title}</title>
                                                                <style>
                                                                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                                                                    h1 { color: #333; border-bottom: 2px solid #f97316; padding-bottom: 10px; }
                                                                    h2 { color: #666; margin-top: 30px; }
                                                                    .recipe-meta { display: flex; gap: 20px; margin: 20px 0; }
                                                                    .meta-item { background: #f5f5f5; padding: 10px; border-radius: 5px; }
                                                                    .ingredients { white-space: pre-line; }
                                                                    .instructions { white-space: pre-line; line-height: 1.6; }
                                                                    @media print { body { margin: 0; } }
                                                                </style>
                                                            </head>
                                                            <body>
                                                                <h1>${generatedRecipe.title}</h1>
                                                                <p><strong>Description:</strong> ${generatedRecipe.description || ''}</p>
                                                                <div class="recipe-meta">
                                                                    <div class="meta-item"><strong>Prep Time:</strong> ${generatedRecipe.prepTime || 0} min</div>
                                                                    <div class="meta-item"><strong>Cook Time:</strong> ${generatedRecipe.cookingTime || 0} min</div>
                                                                    <div class="meta-item"><strong>Servings:</strong> ${generatedRecipe.servings || 1}</div>
                                                                    <div class="meta-item"><strong>Difficulty:</strong> ${generatedRecipe.difficulty || 'Medium'}</div>
                                                                </div>
                                                                <h2>Ingredients</h2>
                                                                <div class="ingredients">• ${ingredientsList}</div>
                                                                <h2>Instructions</h2>
                                                                <div class="instructions">${instructionsList}</div>
                                                            </body>
                                                        </html>
                                                    `;
                                                    printWindow.document.write(printContent);
                                                    printWindow.document.close();
                                                    printWindow.focus();
                                                    printWindow.print();
                                                }
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