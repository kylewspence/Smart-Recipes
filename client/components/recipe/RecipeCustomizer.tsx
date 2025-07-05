'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Recipe, RecipeIngredient, SERVING_SIZE_OPTIONS } from '@/lib/types/recipe';
import { recipeService } from '@/lib/services/recipe';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Users,
    Zap,
    RefreshCw,
    ChefHat,
    ArrowRight,
    Minus,
    Plus,
    X,
    Lightbulb,
    Sparkles,
    Clock,
    AlertCircle,
    CheckCircle2,
    Loader2,
    ArrowLeft,
    Save,
    Utensils
} from 'lucide-react';

interface RecipeCustomizerProps {
    recipe: Recipe;
    onCustomizedRecipe?: (customizedRecipe: Recipe) => void;
    onClose?: () => void;
    onSave?: (customizedRecipe: Recipe) => void;
    className?: string;
}

interface IngredientSubstitution {
    originalIngredient: RecipeIngredient;
    suggestedSubstitutions: Array<{
        name: string;
        reason: string;
        ratio: number; // conversion ratio (e.g., 1.5 means use 1.5x amount)
        difficulty: 'easy' | 'medium' | 'hard';
    }>;
    selectedSubstitution?: {
        name: string;
        reason: string;
        ratio: number;
        difficulty: 'easy' | 'medium' | 'hard';
    };
}

interface RecipeVariation {
    type: 'cooking-method' | 'cuisine' | 'dietary' | 'time-saver' | 'healthier';
    title: string;
    description: string;
    icon: React.ReactNode;
    difficulty?: 'easy' | 'medium' | 'hard';
    timeChange?: number; // minutes change from original
}

const RECIPE_VARIATIONS: RecipeVariation[] = [
    {
        type: 'cooking-method',
        title: 'Air Fryer Version',
        description: 'Adapt this recipe for air fryer cooking',
        icon: <Zap className="w-4 h-4" />,
        difficulty: 'easy',
        timeChange: -10
    },
    {
        type: 'cooking-method',
        title: 'Slow Cooker Version',
        description: 'Make this recipe in a slow cooker',
        icon: <Clock className="w-4 h-4" />,
        difficulty: 'easy',
        timeChange: 120
    },
    {
        type: 'time-saver',
        title: 'Quick 15-Minute Version',
        description: 'Speed up this recipe for busy nights',
        icon: <RefreshCw className="w-4 h-4" />,
        difficulty: 'medium',
        timeChange: -30
    },
    {
        type: 'healthier',
        title: 'Healthier Alternative',
        description: 'Make this recipe more nutritious',
        icon: <Sparkles className="w-4 h-4" />,
        difficulty: 'easy'
    },
    {
        type: 'dietary',
        title: 'Vegan Version',
        description: 'Convert to plant-based ingredients',
        icon: <Utensils className="w-4 h-4" />,
        difficulty: 'medium'
    },
    {
        type: 'cuisine',
        title: 'Different Cuisine Style',
        description: 'Adapt with different regional flavors',
        icon: <ChefHat className="w-4 h-4" />,
        difficulty: 'medium'
    }
];

export default function RecipeCustomizer({
    recipe,
    onCustomizedRecipe,
    onClose,
    onSave,
    className
}: RecipeCustomizerProps) {
    const [activeTab, setActiveTab] = useState<'servings' | 'substitutions' | 'variations'>('servings');
    const [customServings, setCustomServings] = useState(recipe.servings || 4);
    const [scaledIngredients, setScaledIngredients] = useState<RecipeIngredient[]>(recipe.ingredients || []);
    const [ingredientSubstitutions, setIngredientSubstitutions] = useState<IngredientSubstitution[]>([]);
    const [isLoadingSubstitutions, setIsLoadingSubstitutions] = useState(false);
    const [isGeneratingVariation, setIsGeneratingVariation] = useState(false);
    const [selectedVariationType, setSelectedVariationType] = useState<string | null>(null);

    // Scale ingredients based on serving size
    useEffect(() => {
        const originalServings = recipe.servings || 4;
        const scalingFactor = customServings / originalServings;

        const scaled = recipe.ingredients?.map(ingredient => ({
            ...ingredient,
            amount: Math.round((ingredient.amount * scalingFactor) * 100) / 100 // Round to 2 decimal places
        })) || [];

        setScaledIngredients(scaled);
    }, [customServings, recipe.ingredients, recipe.servings]);

    // Generate ingredient substitutions using AI
    const generateSubstitutions = async (ingredient: RecipeIngredient) => {
        setIsLoadingSubstitutions(true);
        try {
            if (!recipe.id) {
                throw new Error('Recipe ID is required for substitutions');
            }

            // Use ingredientId if available, otherwise fall back to id
            const ingredientId = (ingredient as any).ingredientId || ingredient.id;

            if (!ingredientId || typeof ingredientId !== 'number') {
                throw new Error(`Invalid ingredient ID for ${ingredient.name}`);
            }

            const response = await recipeService.generateSubstitutions(
                recipe.id,
                ingredientId,
                {
                    dietaryRestrictions: [], // Could be passed from user preferences
                    preferences: []
                }
            );

            setIngredientSubstitutions(prev => [
                ...prev.filter(sub => {
                    const subIngredientId = sub.originalIngredient.id || (sub.originalIngredient as any).ingredientId;
                    const ingredientId = (ingredient as any).ingredientId || ingredient.id;
                    return subIngredientId !== ingredientId;
                }),
                {
                    originalIngredient: ingredient,
                    suggestedSubstitutions: response.substitutions
                }
            ]);
        } catch (error) {
            console.error('Failed to generate substitutions:', error);
            // Fallback to mock data if API fails
            const mockSubstitutions = [
                {
                    name: `${ingredient.name} alternative 1`,
                    reason: 'Lower sodium option',
                    ratio: 1.0,
                    difficulty: 'easy' as const
                },
                {
                    name: `${ingredient.name} alternative 2`,
                    reason: 'More accessible ingredient',
                    ratio: 1.2,
                    difficulty: 'easy' as const
                }
            ];

            setIngredientSubstitutions(prev => [
                ...prev.filter(sub => {
                    const subIngredientId = sub.originalIngredient.id || (sub.originalIngredient as any).ingredientId;
                    const ingredientId = (ingredient as any).ingredientId || ingredient.id;
                    return subIngredientId !== ingredientId;
                }),
                {
                    originalIngredient: ingredient,
                    suggestedSubstitutions: mockSubstitutions
                }
            ]);
        } finally {
            setIsLoadingSubstitutions(false);
        }
    };

    // Generate recipe variation
    const generateVariation = async (variationType: RecipeVariation) => {
        setIsGeneratingVariation(true);
        setSelectedVariationType(variationType.title);

        try {
            if (!recipe.id) {
                throw new Error('Recipe ID is required for variations');
            }

            const response = await recipeService.generateVariation(
                recipe.id,
                variationType.type,
                variationType.description
            );

            onCustomizedRecipe?.(response.variationRecipe);
        } catch (error) {
            console.error('Failed to generate variation:', error);
            // Fallback to mock variation if API fails
            const variationRecipe: Recipe = {
                ...recipe,
                title: `${recipe.title} (${variationType.title})`,
                description: `${recipe.description} - ${variationType.description}`,
                cookingTime: recipe.cookingTime + (variationType.timeChange || 0),
                difficulty: variationType.difficulty || recipe.difficulty,
                instructions: [
                    `Modified for ${variationType.title.toLowerCase()}:`,
                    ...recipe.instructions
                ]
            };

            onCustomizedRecipe?.(variationRecipe);
        } finally {
            setIsGeneratingVariation(false);
            setSelectedVariationType(null);
        }
    };

    // Apply substitution to ingredient
    const applySubstitution = (originalIngredientId: number, substitution: any) => {
        setIngredientSubstitutions(prev =>
            prev.map(sub => {
                // Check both id and ingredientId for compatibility
                const subIngredientId = sub.originalIngredient.id || (sub.originalIngredient as any).ingredientId;
                return subIngredientId === originalIngredientId
                    ? { ...sub, selectedSubstitution: substitution }
                    : sub;
            })
        );
    };

    // Save customized recipe
    const handleSaveCustomization = () => {
        const customizedRecipe: Recipe = {
            ...recipe,
            servings: customServings,
            ingredients: scaledIngredients.map(ingredient => {
                const substitution = ingredientSubstitutions.find(
                    sub => {
                        const subIngredientId = sub.originalIngredient.id || (sub.originalIngredient as any).ingredientId;
                        const ingredientId = (ingredient as any).ingredientId || ingredient.id;
                        return subIngredientId === ingredientId;
                    }
                )?.selectedSubstitution;

                if (substitution) {
                    return {
                        ...ingredient,
                        name: substitution.name,
                        amount: Math.round((ingredient.amount * substitution.ratio) * 100) / 100
                    };
                }
                return ingredient;
            })
        };

        onSave?.(customizedRecipe);
        onCustomizedRecipe?.(customizedRecipe);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
                'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden max-w-4xl w-full max-h-[90vh] overflow-y-auto',
                className
            )}
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Customize Recipe</h2>
                        <p className="text-orange-100">{recipe.title}</p>
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="bg-white/20 hover:bg-white/30 transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex space-x-0">
                    {[
                        { id: 'servings', label: 'Serving Size', icon: Users },
                        { id: 'substitutions', label: 'Ingredients', icon: RefreshCw },
                        { id: 'variations', label: 'Variations', icon: Sparkles }
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id as any)}
                            className={cn(
                                'flex-1 flex items-center justify-center space-x-2 px-6 py-4 text-sm font-medium transition-colors border-b-2',
                                activeTab === id
                                    ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
                <AnimatePresence mode="wait">
                    {activeTab === 'servings' && (
                        <motion.div
                            key="servings"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Adjust Serving Size
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    Ingredients will be automatically scaled based on your serving size selection.
                                </p>

                                {/* Serving Size Selector */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                                    {SERVING_SIZE_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setCustomServings(option.value)}
                                            className={cn(
                                                'p-4 rounded-xl border-2 transition-all text-left',
                                                customServings === option.value
                                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600'
                                            )}
                                        >
                                            <div className="font-semibold text-gray-900 dark:text-white">
                                                {option.label}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                {option.description}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Serving Input */}
                                <div className="flex items-center space-x-4 mb-8">
                                    <span className="text-gray-700 dark:text-gray-300">Custom:</span>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setCustomServings(Math.max(1, customServings - 1))}
                                            className="h-8 w-8"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </Button>
                                        <div className="w-16 text-center">
                                            <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {customServings}
                                            </span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setCustomServings(customServings + 1)}
                                            className="h-8 w-8"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <span className="text-gray-600 dark:text-gray-400">servings</span>
                                </div>

                                {/* Scaled Ingredients Preview */}
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                                        Scaled Ingredients ({customServings} servings)
                                    </h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {scaledIngredients.map((ingredient, index) => (
                                            <div key={index} className="flex justify-between items-center py-1">
                                                <span className="text-gray-700 dark:text-gray-300">
                                                    {ingredient.name}
                                                </span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {ingredient.amount} {ingredient.unit}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'substitutions' && (
                        <motion.div
                            key="substitutions"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Ingredient Substitutions
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    Get AI-powered suggestions for ingredient substitutions based on dietary needs or availability.
                                </p>

                                <div className="space-y-4">
                                    {scaledIngredients.map((ingredient, index) => {
                                        const substitution = ingredientSubstitutions.find(
                                            sub => {
                                                const subIngredientId = sub.originalIngredient.id || (sub.originalIngredient as any).ingredientId;
                                                const ingredientId = (ingredient as any).ingredientId || ingredient.id;
                                                return subIngredientId === ingredientId;
                                            }
                                        );

                                        return (
                                            <div key={ingredient.id || ingredient.name || index} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                                            {ingredient.amount} {ingredient.unit} {ingredient.name}
                                                        </h4>
                                                        {ingredient.preparation && (
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                {ingredient.preparation}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => generateSubstitutions(ingredient)}
                                                        disabled={isLoadingSubstitutions}
                                                        className="flex items-center space-x-2"
                                                    >
                                                        {isLoadingSubstitutions ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Lightbulb className="w-4 h-4" />
                                                        )}
                                                        <span>Get Substitutions</span>
                                                    </Button>
                                                </div>

                                                {substitution && (
                                                    <div className="space-y-2">
                                                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                            Suggested Substitutions:
                                                        </h5>
                                                        {substitution.suggestedSubstitutions.map((sub, subIndex) => (
                                                            <button
                                                                key={subIndex}
                                                                onClick={() => applySubstitution((ingredient as any).ingredientId || ingredient.id, sub)}
                                                                className={cn(
                                                                    'w-full text-left p-3 rounded-lg border transition-colors',
                                                                    substitution.selectedSubstitution?.name === sub.name
                                                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                                                        : 'border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-600'
                                                                )}
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                                            {sub.name}
                                                                        </p>
                                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                            {sub.reason}
                                                                        </p>
                                                                    </div>
                                                                    {substitution.selectedSubstitution?.name === sub.name && (
                                                                        <CheckCircle2 className="w-5 h-5 text-orange-500" />
                                                                    )}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'variations' && (
                        <motion.div
                            key="variations"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Recipe Variations
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    Generate different versions of this recipe with AI-powered adaptations.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {RECIPE_VARIATIONS.map((variation, index) => (
                                        <button
                                            key={index}
                                            onClick={() => generateVariation(variation)}
                                            disabled={isGeneratingVariation}
                                            className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 transition-colors text-left group"
                                        >
                                            <div className="flex items-start space-x-3">
                                                <div className="flex-shrink-0 p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg group-hover:bg-orange-200 dark:group-hover:bg-orange-900/40 transition-colors">
                                                    {variation.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                                        {variation.title}
                                                    </h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                        {variation.description}
                                                    </p>
                                                    <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                                                        {variation.difficulty && (
                                                            <span className={cn(
                                                                'px-2 py-1 rounded-full',
                                                                variation.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                                                                    variation.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' :
                                                                        'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                                            )}>
                                                                {variation.difficulty}
                                                            </span>
                                                        )}
                                                        {variation.timeChange && (
                                                            <span className="flex items-center">
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                {variation.timeChange > 0 ? '+' : ''}{variation.timeChange}m
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isGeneratingVariation && selectedVariationType === variation.title ? (
                                                    <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                                                ) : (
                                                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
                <div className="flex justify-between items-center">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex items-center space-x-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Cancel</span>
                    </Button>
                    <div className="flex space-x-3">
                        <Button
                            variant="outline"
                            onClick={handleSaveCustomization}
                            className="flex items-center space-x-2"
                        >
                            <Save className="w-4 h-4" />
                            <span>Save Customization</span>
                        </Button>
                        <Button
                            onClick={handleSaveCustomization}
                            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white flex items-center space-x-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Apply Changes</span>
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
} 