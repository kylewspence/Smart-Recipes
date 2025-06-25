'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MagicCard, ShimmerButton, BlurFade } from '@/components/magicui';

interface Ingredient {
    id: string;
    name: string;
    category?: string;
    common?: boolean;
}

interface IngredientSelectorProps {
    selectedIngredients: string[];
    onIngredientsChange: (ingredients: string[]) => void;
    placeholder?: string;
    label?: string;
    variant?: 'include' | 'exclude';
    className?: string;
    maxIngredients?: number;
}

// Mock ingredient data - in a real app, this would come from an API
const COMMON_INGREDIENTS: Ingredient[] = [
    { id: '1', name: 'Chicken breast', category: 'Protein', common: true },
    { id: '2', name: 'Ground beef', category: 'Protein', common: true },
    { id: '3', name: 'Salmon', category: 'Protein', common: true },
    { id: '4', name: 'Eggs', category: 'Protein', common: true },
    { id: '5', name: 'Rice', category: 'Grains', common: true },
    { id: '6', name: 'Pasta', category: 'Grains', common: true },
    { id: '7', name: 'Bread', category: 'Grains', common: true },
    { id: '8', name: 'Potatoes', category: 'Vegetables', common: true },
    { id: '9', name: 'Onions', category: 'Vegetables', common: true },
    { id: '10', name: 'Garlic', category: 'Vegetables', common: true },
    { id: '11', name: 'Tomatoes', category: 'Vegetables', common: true },
    { id: '12', name: 'Bell peppers', category: 'Vegetables', common: true },
    { id: '13', name: 'Carrots', category: 'Vegetables', common: true },
    { id: '14', name: 'Broccoli', category: 'Vegetables', common: true },
    { id: '15', name: 'Spinach', category: 'Vegetables', common: true },
    { id: '16', name: 'Cheese', category: 'Dairy', common: true },
    { id: '17', name: 'Milk', category: 'Dairy', common: true },
    { id: '18', name: 'Butter', category: 'Dairy', common: true },
    { id: '19', name: 'Olive oil', category: 'Oils', common: true },
    { id: '20', name: 'Salt', category: 'Seasonings', common: true },
    { id: '21', name: 'Black pepper', category: 'Seasonings', common: true },
    { id: '22', name: 'Garlic powder', category: 'Seasonings', common: true },
];

export default function IngredientSelector({
    selectedIngredients,
    onIngredientsChange,
    placeholder = "Type an ingredient...",
    label = "Ingredients",
    variant = 'include',
    className,
    maxIngredients = 10
}: IngredientSelectorProps) {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);

    const variantColors = {
        include: {
            bg: 'bg-green-100 dark:bg-green-900',
            text: 'text-green-800 dark:text-green-200',
            border: 'border-green-300 dark:border-green-700',
            button: 'bg-green-500 hover:bg-green-600'
        },
        exclude: {
            bg: 'bg-red-100 dark:bg-red-900',
            text: 'text-red-800 dark:text-red-200',
            border: 'border-red-300 dark:border-red-700',
            button: 'bg-red-500 hover:bg-red-600'
        }
    };

    const colors = variantColors[variant];

    useEffect(() => {
        if (inputValue.length > 0) {
            const filtered = COMMON_INGREDIENTS.filter(ingredient =>
                ingredient.name.toLowerCase().includes(inputValue.toLowerCase()) &&
                !selectedIngredients.includes(ingredient.name)
            );
            setFilteredIngredients(filtered);
            setShowSuggestions(true);
        } else {
            setFilteredIngredients([]);
            setShowSuggestions(false);
        }
    }, [inputValue, selectedIngredients]);

    const addIngredient = (ingredientName: string) => {
        if (ingredientName.trim() &&
            !selectedIngredients.includes(ingredientName.trim()) &&
            selectedIngredients.length < maxIngredients) {
            onIngredientsChange([...selectedIngredients, ingredientName.trim()]);
            setInputValue('');
            setShowSuggestions(false);
        }
    };

    const removeIngredient = (ingredientName: string) => {
        onIngredientsChange(selectedIngredients.filter(ing => ing !== ingredientName));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredIngredients.length > 0) {
                addIngredient(filteredIngredients[0].name);
            } else if (inputValue.trim()) {
                addIngredient(inputValue);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setInputValue('');
        }
    };

    const getCommonIngredients = () => {
        return COMMON_INGREDIENTS
            .filter(ingredient =>
                ingredient.common &&
                !selectedIngredients.includes(ingredient.name)
            )
            .slice(0, 8);
    };

    return (
        <BlurFade delay={0.1} className={className}>
            <div className="space-y-3">
                {/* Label */}
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                    {maxIngredients && (
                        <span className="text-xs text-gray-500 ml-2">
                            ({selectedIngredients.length}/{maxIngredients})
                        </span>
                    )}
                </label>

                {/* Input with suggestions */}
                <div className="relative">
                    <div className="flex space-x-2">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={() => inputValue && setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                placeholder={placeholder}
                                disabled={selectedIngredients.length >= maxIngredients}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        <ShimmerButton
                            onClick={() => inputValue && addIngredient(inputValue)}
                            disabled={!inputValue.trim() || selectedIngredients.length >= maxIngredients}
                            className="px-4 py-2"
                            background={`linear-gradient(45deg, ${variant === 'include' ? '#10b981, #059669' : '#ef4444, #dc2626'})`}
                        >
                            <Plus className="w-4 h-4" />
                        </ShimmerButton>
                    </div>

                    {/* Suggestions dropdown */}
                    <AnimatePresence>
                        {showSuggestions && filteredIngredients.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                            >
                                {filteredIngredients.slice(0, 6).map((ingredient) => (
                                    <button
                                        key={ingredient.id}
                                        onClick={() => addIngredient(ingredient.name)}
                                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between group"
                                    >
                                        <div>
                                            <span className="text-gray-900 dark:text-white">
                                                {ingredient.name}
                                            </span>
                                            {ingredient.category && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                                    {ingredient.category}
                                                </span>
                                            )}
                                        </div>
                                        <Plus className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Common ingredients quick add */}
                {selectedIngredients.length === 0 && !inputValue && (
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Quick add common ingredients:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {getCommonIngredients().map((ingredient) => (
                                <button
                                    key={ingredient.id}
                                    onClick={() => addIngredient(ingredient.name)}
                                    className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors duration-200"
                                >
                                    {ingredient.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Selected ingredients */}
                {selectedIngredients.length > 0 && (
                    <MagicCard
                        className="p-4"
                        gradientColor={variant === 'include' ? '#10b981' : '#ef4444'}
                        gradientOpacity={0.1}
                    >
                        <div className="flex flex-wrap gap-2">
                            <AnimatePresence>
                                {selectedIngredients.map((ingredient, index) => (
                                    <motion.span
                                        key={ingredient}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={cn(
                                            'inline-flex items-center px-3 py-1 rounded-full text-sm',
                                            colors.bg,
                                            colors.text
                                        )}
                                    >
                                        {ingredient}
                                        <button
                                            onClick={() => removeIngredient(ingredient)}
                                            className={cn(
                                                'ml-2 hover:bg-black/10 rounded-full p-0.5 transition-colors duration-200',
                                                variant === 'include'
                                                    ? 'hover:text-green-900 dark:hover:text-green-100'
                                                    : 'hover:text-red-900 dark:hover:text-red-100'
                                            )}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </motion.span>
                                ))}
                            </AnimatePresence>
                        </div>
                    </MagicCard>
                )}

                {/* Max ingredients warning */}
                {selectedIngredients.length >= maxIngredients && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-amber-600 dark:text-amber-400"
                    >
                        Maximum number of ingredients reached. Remove some to add more.
                    </motion.p>
                )}
            </div>
        </BlurFade>
    );
} 