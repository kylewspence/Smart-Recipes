'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Recipe } from '@/lib/types/recipe';
import RecipeDisplay from './RecipeDisplay';
import { Check } from 'lucide-react';

interface SelectableRecipeCardProps {
    recipe: Recipe;
    isSelected: boolean;
    onSelectionChange: (recipeId: number, selected: boolean) => void;
    variant?: 'default' | 'compact' | 'detailed';
    isSaved?: boolean;
    isLiked?: boolean;
    onSave?: () => void;
    onEdit?: () => void;
    onGenerateAnother?: () => void;
    className?: string;
}

export default function SelectableRecipeCard({
    recipe,
    isSelected,
    onSelectionChange,
    variant = 'compact',
    isSaved,
    isLiked,
    onSave,
    onEdit,
    onGenerateAnother,
    className
}: SelectableRecipeCardProps) {
    const handleSelectionChange = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onSelectionChange(recipe.id, !isSelected);
    };

    const handleCardClick = (e: React.MouseEvent) => {
        // Only trigger selection if clicking on the card itself, not on action buttons
        const target = e.target as HTMLElement;

        // Check if the click is on an interactive element
        if (
            target.closest('button') ||
            target.closest('a') ||
            target.closest('[role="button"]') ||
            target.closest('.recipe-actions')
        ) {
            return;
        }

        onSelectionChange(recipe.id, !isSelected);
    };

    return (
        <motion.div
            layout
            className={cn(
                'relative group cursor-pointer transition-all duration-200',
                isSelected && 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900',
                className
            )}
            onClick={handleCardClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Selection Checkbox */}
            <div
                className={cn(
                    'absolute top-3 left-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer',
                    isSelected
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-400 group-hover:opacity-100',
                    !isSelected && 'opacity-0 group-hover:opacity-100'
                )}
                onClick={handleSelectionChange}
            >
                {isSelected && <Check className="w-4 h-4" />}
            </div>

            {/* Selection Overlay */}
            {isSelected && (
                <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-lg pointer-events-none z-0" />
            )}

            {/* Recipe Display */}
            <div className={cn(isSelected && 'relative z-5')}>
                <RecipeDisplay
                    recipe={recipe}
                    variant={variant}
                    isSaved={isSaved}
                    isLiked={isLiked}
                    onSave={onSave}
                    onEdit={onEdit}
                    onGenerateAnother={onGenerateAnother}
                    className="recipe-actions"
                />
            </div>

            {/* Selection Indicator Badge */}
            {isSelected && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 z-10 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                >
                    ✓
                </motion.div>
            )}
        </motion.div>
    );
} 