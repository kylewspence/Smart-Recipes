'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Recipe, NutritionalInfo } from '@/lib/types/recipe';
import { recipeService } from '@/lib/services/recipe';
import { useAuth } from '@/lib/contexts/AuthContext';
import RecipeCustomizer from './RecipeCustomizer';
import RecipeNotes from './RecipeNotes';
import CookingHistory from './CookingHistory';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Clock,
    Users,
    Star,
    ChefHat,
    Bookmark,
    Share2,
    Heart,
    Download,
    Edit,
    Copy,
    Printer,
    Zap,
    BookmarkCheck,
    Timer,
    Utensils,
    Award,
    Info,
    CheckCircle2
} from 'lucide-react';

interface RecipeDisplayProps {
    recipe: Recipe;
    onSave?: () => void;
    onShare?: () => void;
    onEdit?: () => void;
    onGenerateVariation?: () => void;
    onGenerateAnother?: () => void;
    onPrint?: () => void;
    onCopy?: () => void;
    onRate?: (rating: number) => void;
    className?: string;
    showActions?: boolean;
    showNutrition?: boolean;
    showRating?: boolean;
    variant?: 'default' | 'compact' | 'detailed';
    isSaved?: boolean;
    isLiked?: boolean;
}

const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
        case 'easy':
            return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
        case 'medium':
            return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
        case 'hard':
            return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
        default:
            return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
};

const StarRating: React.FC<{
    rating: number;
    onRate?: (rating: number) => void;
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
}> = ({ rating, onRate, readonly = false, size = 'md' }) => {
    const [hoverRating, setHoverRating] = useState(0);

    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    };

    return (
        <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    className={cn(
                        'transition-colors',
                        readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform',
                        sizeClasses[size]
                    )}
                    onClick={() => !readonly && onRate?.(star)}
                    onMouseEnter={() => !readonly && setHoverRating(star)}
                    onMouseLeave={() => !readonly && setHoverRating(0)}
                    disabled={readonly}
                >
                    <Star
                        className={cn(
                            'transition-colors',
                            sizeClasses[size],
                            (hoverRating || rating) >= star
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300 dark:text-gray-600'
                        )}
                    />
                </button>
            ))}
        </div>
    );
};

const NutritionalInfoCard: React.FC<{ nutrition: NutritionalInfo }> = ({ nutrition }) => (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <Info className="w-4 h-4 mr-2" />
            Nutritional Information
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {nutrition.calories}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Calories</div>
            </div>
            <div className="text-center">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {nutrition.protein}g
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Protein</div>
            </div>
            <div className="text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {nutrition.carbs}g
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Carbs</div>
            </div>
            <div className="text-center">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {nutrition.fat}g
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Fat</div>
            </div>
        </div>
    </div>
);

export default function RecipeDisplay({
    recipe,
    onSave,
    onShare,
    onEdit,
    onGenerateVariation,
    onGenerateAnother,
    onPrint,
    onCopy,
    onRate,
    className,
    showActions = true,
    showNutrition = true,
    showRating = true,
    variant = 'default',
    isSaved = false,
    isLiked = false,
}: RecipeDisplayProps) {
    const { user } = useAuth();
    const [currentRating, setCurrentRating] = useState(recipe.rating || 0);
    const [localIsSaved, setLocalIsSaved] = useState(isSaved);
    const [localIsLiked, setLocalIsLiked] = useState(isLiked);
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [customizedRecipe, setCustomizedRecipe] = useState<Recipe>(recipe);
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!user || isLoading) return;

        setIsLoading(true);
        try {
            if (localIsSaved) {
                await recipeService.unsaveRecipe(recipe.id);
            } else {
                await recipeService.saveRecipe(recipe.id);
            }
            setLocalIsSaved(!localIsSaved);
            onSave?.();
        } catch (error) {
            console.error('Failed to save/unsave recipe:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLike = async () => {
        if (!user || isLoading) return;

        setIsLoading(true);
        try {
            const result = await recipeService.toggleFavorite(recipe.id);
            setLocalIsLiked(result.isFavorite);
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRate = async (rating: number) => {
        if (!user || isLoading) return;

        setIsLoading(true);
        try {
            await recipeService.rateRecipe(recipe.id, rating);
            setCurrentRating(rating);
            onRate?.(rating);
        } catch (error) {
            console.error('Failed to rate recipe:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = () => {
        setShowCustomizer(true);
        onEdit?.();
    };

    const handleCustomizedRecipe = (newRecipe: Recipe) => {
        setCustomizedRecipe(newRecipe);
        setShowCustomizer(false);
    };

    const handleSaveCustomization = (newRecipe: Recipe) => {
        setCustomizedRecipe(newRecipe);
        // Here you could also save to backend or local storage
    };

    const totalTime = (recipe.prepTime || 0) + (recipe.cookingTime || 0);

    if (variant === 'compact') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    'bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden',
                    className
                )}
            >
                <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2">
                            {recipe.title}
                        </h3>
                        {showActions && (
                            <div className="flex space-x-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleLike}
                                    className="p-1"
                                >
                                    <Heart className={cn(
                                        'w-4 h-4',
                                        localIsLiked ? 'fill-red-500 text-red-500' : 'text-gray-400'
                                    )} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSave}
                                    className="p-1"
                                >
                                    {localIsSaved ? (
                                        <BookmarkCheck className="w-4 h-4 text-orange-500" />
                                    ) : (
                                        <Bookmark className="w-4 h-4 text-gray-400" />
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {totalTime}m
                        </div>
                        <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {recipe.servings || 4}
                        </div>
                        <div className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            getDifficultyColor(recipe.difficulty || 'medium')
                        )}>
                            {recipe.difficulty || 'Medium'}
                        </div>
                    </div>

                    {showRating && (
                        <div className="flex items-center space-x-2 mb-3">
                            <StarRating
                                rating={currentRating}
                                onRate={handleRate}
                                size="sm"
                            />
                            {recipe.reviewCount && (
                                <span className="text-xs text-gray-500">
                                    ({recipe.reviewCount} reviews)
                                </span>
                            )}
                        </div>
                    )}

                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {recipe.description}
                    </p>
                </div>
            </motion.div>
        );
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    'bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden',
                    className
                )}
            >
                {/* Recipe Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h2 className="text-2xl lg:text-3xl font-bold mb-2">{recipe.title}</h2>
                            <p className="text-orange-100 text-lg">{recipe.description}</p>

                            {/* Tags */}
                            {recipe.tags && recipe.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {recipe.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {showActions && (
                            <div className="flex space-x-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleLike}
                                    className="bg-white/20 hover:bg-white/30 transition-colors"
                                >
                                    <Heart className={cn(
                                        'w-5 h-5',
                                        localIsLiked ? 'fill-white text-white' : 'text-white'
                                    )} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleSave}
                                    className="bg-white/20 hover:bg-white/30 transition-colors"
                                >
                                    {localIsSaved ? (
                                        <BookmarkCheck className="w-5 h-5 text-white" />
                                    ) : (
                                        <Bookmark className="w-5 h-5 text-white" />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onShare}
                                    className="bg-white/20 hover:bg-white/30 transition-colors"
                                >
                                    <Share2 className="w-5 h-5 text-white" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recipe Info */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="flex justify-center mb-2">
                                <Timer className="w-6 h-6 text-orange-500" />
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 block">Prep Time</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {recipe.prepTime || 0} min
                            </span>
                        </div>
                        <div className="text-center">
                            <div className="flex justify-center mb-2">
                                <Clock className="w-6 h-6 text-orange-500" />
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 block">Cook Time</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {recipe.cookingTime || 0} min
                            </span>
                        </div>
                        <div className="text-center">
                            <div className="flex justify-center mb-2">
                                <Users className="w-6 h-6 text-orange-500" />
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 block">Servings</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {recipe.servings || 4}
                            </span>
                        </div>
                        <div className="text-center">
                            <div className="flex justify-center mb-2">
                                <Award className="w-6 h-6 text-orange-500" />
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 block">Difficulty</span>
                            <span className={cn(
                                'font-semibold px-2 py-1 rounded-full text-xs',
                                getDifficultyColor(recipe.difficulty || 'medium')
                            )}>
                                {recipe.difficulty || 'Medium'}
                            </span>
                        </div>
                    </div>

                    {/* Rating Section */}
                    {showRating && (
                        <div className="flex items-center justify-center space-x-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-center">
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your Rating</div>
                                <StarRating
                                    rating={currentRating}
                                    onRate={handleRate}
                                    size="lg"
                                />
                            </div>
                            {recipe.reviewCount && (
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {recipe.rating?.toFixed(1) || '0.0'}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {recipe.reviewCount} reviews
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Nutritional Information */}
                {showNutrition && recipe.nutritionalInfo && (
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <NutritionalInfoCard nutrition={recipe.nutritionalInfo} />
                    </div>
                )}

                {/* Ingredients */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Utensils className="w-5 h-5 mr-2" />
                        Ingredients
                    </h3>
                    <div className="space-y-3">
                        {recipe.ingredients?.map((ingredient, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-start space-x-3 group"
                            >
                                <div className="flex-shrink-0 w-6 h-6 mt-0.5">
                                    <div className="w-3 h-3 bg-orange-500 rounded-full group-hover:scale-110 transition-transform"></div>
                                </div>
                                <span className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    <span className="font-medium">
                                        {ingredient.amount} {ingredient.unit}
                                    </span>{' '}
                                    {ingredient.name}
                                    {ingredient.preparation && (
                                        <span className="text-gray-500 dark:text-gray-400">
                                            {' '}({ingredient.preparation})
                                        </span>
                                    )}
                                    {ingredient.optional && (
                                        <span className="text-orange-500 text-sm ml-1">(optional)</span>
                                    )}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Instructions */}
                <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <ChefHat className="w-5 h-5 mr-2" />
                        Instructions
                    </h3>
                    <div className="space-y-4">
                        {recipe.instructions?.map((instruction, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex space-x-4 group"
                            >
                                <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-orange-600 transition-colors">
                                    {index + 1}
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-1 flex-1">
                                    {instruction}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Recipe Notes */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <RecipeNotes recipeId={recipe.id} />
                </div>

                {/* Cooking History */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <CookingHistory recipeId={recipe.id} />
                </div>

                {/* Action Buttons */}
                {showActions && (
                    <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <Button
                                variant="outline"
                                onClick={onGenerateVariation}
                                className="flex items-center justify-center"
                            >
                                <Zap className="w-4 h-4 mr-2" />
                                Variation
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleEdit}
                                className="flex items-center justify-center"
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                            <Button
                                variant="outline"
                                onClick={onCopy}
                                className="flex items-center justify-center"
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                            </Button>
                            <Button
                                variant="outline"
                                onClick={onPrint}
                                className="flex items-center justify-center"
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                Print
                            </Button>
                        </div>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {onGenerateAnother && (
                                <Button
                                    variant="outline"
                                    onClick={onGenerateAnother}
                                    className="flex items-center justify-center"
                                >
                                    <ChefHat className="w-4 h-4 mr-2" />
                                    Generate Another
                                </Button>
                            )}
                            <Button
                                onClick={handleSave}
                                className={cn(
                                    "flex items-center justify-center bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium",
                                    onGenerateAnother ? "" : "col-span-full"
                                )}
                            >
                                {localIsSaved ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Saved to Library
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4 mr-2" />
                                        Save Recipe
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Recipe Customizer Modal */}
            <AnimatePresence>
                {showCustomizer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCustomizer(false)}
                    >
                        <div onClick={(e) => e.stopPropagation()}>
                            <RecipeCustomizer
                                recipe={customizedRecipe}
                                onCustomizedRecipe={handleCustomizedRecipe}
                                onClose={() => setShowCustomizer(false)}
                                onSave={handleSaveCustomization}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
} 