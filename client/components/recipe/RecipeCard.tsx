'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, ChefHat, Heart, BookOpen, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Recipe } from '@/lib/types/recipe';
import { MagicCard, NumberTicker, BlurFade } from '@/components/magicui';
import Link from 'next/link';

interface RecipeCardProps {
    recipe: Recipe;
    variant?: 'default' | 'compact' | 'featured';
    showActions?: boolean;
    onSave?: () => void;
    onLike?: () => void;
    isSaved?: boolean;
    isLiked?: boolean;
    className?: string;
}

export default function RecipeCard({
    recipe,
    variant = 'default',
    showActions = true,
    onSave,
    onLike,
    isSaved = false,
    isLiked = false,
    className
}: RecipeCardProps) {
    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300';
            case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300';
            case 'hard': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300';
            default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300';
        }
    };

    if (variant === 'compact') {
        return (
            <MagicCard
                className={cn('p-4 hover:shadow-lg transition-all duration-300', className)}
                gradientColor="#f97316"
                gradientOpacity={0.1}
            >
                <Link href={`/recipes/${recipe.id}`} className="block">
                    <div className="flex items-start space-x-4">
                        {recipe.imageUrl && (
                            <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                                <img
                                    src={recipe.imageUrl}
                                    alt={recipe.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {recipe.title}
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {recipe.description}
                            </p>
                            <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    <NumberTicker value={recipe.cookingTime} />m
                                </span>
                                <span className="flex items-center">
                                    <Users className="w-3 h-3 mr-1" />
                                    <NumberTicker value={recipe.servings} />
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>
            </MagicCard>
        );
    }

    if (variant === 'featured') {
        return (
            <MagicCard
                className={cn('p-0 overflow-hidden', className)}
                gradientColor="#f97316"
                gradientOpacity={0.15}
            >
                <Link href={`/recipes/${recipe.id}`} className="block">
                    <div className="relative">
                        {recipe.imageUrl && (
                            <div className="aspect-video w-full overflow-hidden">
                                <img
                                    src={recipe.imageUrl}
                                    alt={recipe.title}
                                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                />
                            </div>
                        )}
                        <div className="absolute top-4 right-4 flex space-x-2">
                            {recipe.difficulty && (
                                <span className={cn(
                                    'px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm',
                                    getDifficultyColor(recipe.difficulty)
                                )}>
                                    {recipe.difficulty}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2">
                                {recipe.title}
                            </h2>
                            {recipe.rating && (
                                <div className="flex items-center ml-4 flex-shrink-0">
                                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                    <NumberTicker
                                        value={recipe.rating}
                                        decimalPlaces={1}
                                        className="ml-1 text-sm font-medium text-gray-700 dark:text-gray-300"
                                    />
                                </div>
                            )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                            {recipe.description}
                        </p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                <span className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    <NumberTicker value={recipe.cookingTime} />m
                                </span>
                                <span className="flex items-center">
                                    <Users className="w-4 h-4 mr-1" />
                                    <NumberTicker value={recipe.servings} />
                                </span>
                                <span className="flex items-center">
                                    <ChefHat className="w-4 h-4 mr-1" />
                                    {recipe.cuisine}
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>
            </MagicCard>
        );
    }

    // Default variant
    return (
        <MagicCard
            className={cn('p-0 overflow-hidden', className)}
            gradientColor="#f97316"
            gradientOpacity={0.1}
        >
            <div className="relative">
                <Link href={`/recipes/${recipe.id}`} className="block">
                    {recipe.imageUrl && (
                        <div className="aspect-[4/3] w-full overflow-hidden">
                            <img
                                src={recipe.imageUrl}
                                alt={recipe.title}
                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                            />
                        </div>
                    )}
                    <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                                {recipe.title}
                            </h3>
                            {recipe.rating && (
                                <div className="flex items-center ml-2 flex-shrink-0">
                                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                    <NumberTicker
                                        value={recipe.rating}
                                        decimalPlaces={1}
                                        className="ml-1 text-sm font-medium text-gray-700 dark:text-gray-300"
                                    />
                                </div>
                            )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                            {recipe.description}
                        </p>

                        {/* Recipe metadata */}
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
                            <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                <NumberTicker value={recipe.cookingTime} />m
                            </span>
                            <span className="flex items-center">
                                <Users className="w-4 h-4 mr-1" />
                                <NumberTicker value={recipe.servings} />
                            </span>
                            <span className="flex items-center">
                                <ChefHat className="w-4 h-4 mr-1" />
                                {recipe.cuisine}
                            </span>
                        </div>

                        {/* Tags */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                {recipe.difficulty && (
                                    <span className={cn(
                                        'px-2 py-1 rounded-full text-xs font-medium',
                                        getDifficultyColor(recipe.difficulty)
                                    )}>
                                        {recipe.difficulty}
                                    </span>
                                )}
                                {recipe.tags && recipe.tags.length > 0 && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {recipe.tags.slice(0, 2).join(', ')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </Link>

                {/* Action buttons */}
                {showActions && (
                    <div className="absolute top-3 right-3 flex space-x-2">
                        {onSave && (
                            <motion.button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onSave();
                                }}
                                className={cn(
                                    'p-2 rounded-full backdrop-blur-sm transition-colors duration-200',
                                    isSaved
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white/80 text-gray-600 hover:bg-white hover:text-blue-500'
                                )}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <BookOpen className="w-4 h-4" />
                            </motion.button>
                        )}
                        {onLike && (
                            <motion.button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onLike();
                                }}
                                className={cn(
                                    'p-2 rounded-full backdrop-blur-sm transition-colors duration-200',
                                    isLiked
                                        ? 'bg-red-500 text-white'
                                        : 'bg-white/80 text-gray-600 hover:bg-white hover:text-red-500'
                                )}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <Heart className={cn('w-4 h-4', isLiked && 'fill-current')} />
                            </motion.button>
                        )}
                    </div>
                )}
            </div>
        </MagicCard>
    );
} 