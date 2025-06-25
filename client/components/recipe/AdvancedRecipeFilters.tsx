'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Filter,
    X,
    ChevronDown,
    Clock,
    ChefHat,
    Utensils,
    Leaf,
    Wheat,
    Fish,
    Beef,
    Calendar,
    Star,
    SortAsc,
    SortDesc
} from 'lucide-react';

export interface FilterOptions {
    cuisines: string[];
    cookingTime: {
        min?: number;
        max?: number;
    };
    difficulty: string[];
    dietaryRestrictions: string[];
    rating: {
        min?: number;
    };
    sortBy: 'dateAdded' | 'title' | 'cookingTime' | 'rating' | 'difficulty';
    sortOrder: 'asc' | 'desc';
}

interface AdvancedRecipeFiltersProps {
    filters: FilterOptions;
    onFiltersChange: (filters: FilterOptions) => void;
    onClearFilters: () => void;
    totalRecipes: number;
    filteredCount: number;
}

const CUISINE_OPTIONS = [
    'American', 'Italian', 'Mexican', 'Chinese', 'Indian', 'Japanese',
    'French', 'Thai', 'Mediterranean', 'Korean', 'Vietnamese', 'Greek',
    'Spanish', 'Middle Eastern', 'Brazilian', 'German', 'British', 'Other'
];

const DIFFICULTY_OPTIONS = [
    { value: 'easy', label: 'Easy', icon: '🟢' },
    { value: 'medium', label: 'Medium', icon: '🟡' },
    { value: 'hard', label: 'Hard', icon: '🔴' }
];

const DIETARY_OPTIONS = [
    { value: 'vegetarian', label: 'Vegetarian', icon: <Leaf className="w-4 h-4" /> },
    { value: 'vegan', label: 'Vegan', icon: <Leaf className="w-4 h-4" /> },
    { value: 'gluten-free', label: 'Gluten Free', icon: <Wheat className="w-4 h-4" /> },
    { value: 'dairy-free', label: 'Dairy Free', icon: <Fish className="w-4 h-4" /> },
    { value: 'keto', label: 'Keto', icon: <Beef className="w-4 h-4" /> },
    { value: 'paleo', label: 'Paleo', icon: <Beef className="w-4 h-4" /> },
    { value: 'low-carb', label: 'Low Carb', icon: <Leaf className="w-4 h-4" /> },
    { value: 'high-protein', label: 'High Protein', icon: <Beef className="w-4 h-4" /> }
];

const COOKING_TIME_PRESETS = [
    { label: 'Quick (≤30 min)', min: 0, max: 30 },
    { label: 'Medium (30-60 min)', min: 30, max: 60 },
    { label: 'Long (1-2 hours)', min: 60, max: 120 },
    { label: 'Very Long (2+ hours)', min: 120, max: undefined }
];

const SORT_OPTIONS = [
    { value: 'dateAdded', label: 'Date Added', icon: <Calendar className="w-4 h-4" /> },
    { value: 'title', label: 'Name', icon: <ChefHat className="w-4 h-4" /> },
    { value: 'cookingTime', label: 'Cooking Time', icon: <Clock className="w-4 h-4" /> },
    { value: 'rating', label: 'Rating', icon: <Star className="w-4 h-4" /> },
    { value: 'difficulty', label: 'Difficulty', icon: <Utensils className="w-4 h-4" /> }
];

export default function AdvancedRecipeFilters({
    filters,
    onFiltersChange,
    onClearFilters,
    totalRecipes,
    filteredCount
}: AdvancedRecipeFiltersProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);

    const hasActiveFilters = () => {
        return (
            filters.cuisines.length > 0 ||
            filters.difficulty.length > 0 ||
            filters.dietaryRestrictions.length > 0 ||
            (filters.cookingTime.min !== undefined || filters.cookingTime.max !== undefined) ||
            (filters.rating.min !== undefined && filters.rating.min > 0)
        );
    };

    const updateFilters = (updates: Partial<FilterOptions>) => {
        onFiltersChange({ ...filters, ...updates });
    };

    const toggleArrayFilter = (array: string[], value: string) => {
        return array.includes(value)
            ? array.filter(item => item !== value)
            : [...array, value];
    };

    const FilterSection = ({
        title,
        children,
        sectionKey
    }: {
        title: string;
        children: React.ReactNode;
        sectionKey: string;
    }) => (
        <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
            <button
                onClick={() => setActiveSection(activeSection === sectionKey ? null : sectionKey)}
                className="w-full flex items-center justify-between py-4 px-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
                <span className="font-medium text-gray-900 dark:text-white">{title}</span>
                <ChevronDown
                    className={cn(
                        "w-4 h-4 text-gray-500 transition-transform",
                        activeSection === sectionKey && "rotate-180"
                    )}
                />
            </button>
            <AnimatePresence>
                {activeSection === sectionKey && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            {/* Filter Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                            Advanced Filters
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {filteredCount} of {totalRecipes} recipes
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {hasActiveFilters() && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearFilters}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={cn(
                            "transition-colors",
                            isExpanded && "bg-gray-100 dark:bg-gray-700"
                        )}
                    >
                        <ChevronDown
                            className={cn(
                                "w-4 h-4 transition-transform",
                                isExpanded && "rotate-180"
                            )}
                        />
                    </Button>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        {/* Sort Options */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Sort By</h4>
                            <div className="flex flex-wrap gap-2">
                                {SORT_OPTIONS.map((option) => (
                                    <Button
                                        key={option.value}
                                        variant={filters.sortBy === option.value ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => updateFilters({ sortBy: option.value as any })}
                                        className="flex items-center"
                                    >
                                        {option.icon}
                                        <span className="ml-1">{option.label}</span>
                                        {filters.sortBy === option.value && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateFilters({
                                                        sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
                                                    });
                                                }}
                                                className="ml-1"
                                            >
                                                {filters.sortOrder === 'asc' ?
                                                    <SortAsc className="w-3 h-3" /> :
                                                    <SortDesc className="w-3 h-3" />
                                                }
                                            </button>
                                        )}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Cuisine Filter */}
                        <FilterSection title="Cuisine" sectionKey="cuisine">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {CUISINE_OPTIONS.map((cuisine) => (
                                    <Button
                                        key={cuisine}
                                        variant={filters.cuisines.includes(cuisine) ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => updateFilters({
                                            cuisines: toggleArrayFilter(filters.cuisines, cuisine)
                                        })}
                                        className="justify-start"
                                    >
                                        {cuisine}
                                    </Button>
                                ))}
                            </div>
                        </FilterSection>

                        {/* Cooking Time Filter */}
                        <FilterSection title="Cooking Time" sectionKey="cookingTime">
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    {COOKING_TIME_PRESETS.map((preset) => (
                                        <Button
                                            key={preset.label}
                                            variant={
                                                filters.cookingTime.min === preset.min &&
                                                    filters.cookingTime.max === preset.max
                                                    ? 'default' : 'outline'
                                            }
                                            size="sm"
                                            onClick={() => updateFilters({
                                                cookingTime: { min: preset.min, max: preset.max }
                                            })}
                                        >
                                            {preset.label}
                                        </Button>
                                    ))}
                                </div>
                                <div className="flex items-center space-x-2 text-sm">
                                    <span className="text-gray-500">Custom:</span>
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={filters.cookingTime.min || ''}
                                        onChange={(e) => updateFilters({
                                            cookingTime: {
                                                ...filters.cookingTime,
                                                min: e.target.value ? parseInt(e.target.value) : undefined
                                            }
                                        })}
                                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <span>-</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={filters.cookingTime.max || ''}
                                        onChange={(e) => updateFilters({
                                            cookingTime: {
                                                ...filters.cookingTime,
                                                max: e.target.value ? parseInt(e.target.value) : undefined
                                            }
                                        })}
                                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <span className="text-gray-500">minutes</span>
                                </div>
                            </div>
                        </FilterSection>

                        {/* Difficulty Filter */}
                        <FilterSection title="Difficulty" sectionKey="difficulty">
                            <div className="flex flex-wrap gap-2">
                                {DIFFICULTY_OPTIONS.map((option) => (
                                    <Button
                                        key={option.value}
                                        variant={filters.difficulty.includes(option.value) ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => updateFilters({
                                            difficulty: toggleArrayFilter(filters.difficulty, option.value)
                                        })}
                                        className="flex items-center"
                                    >
                                        <span className="mr-1">{option.icon}</span>
                                        {option.label}
                                    </Button>
                                ))}
                            </div>
                        </FilterSection>

                        {/* Dietary Restrictions Filter */}
                        <FilterSection title="Dietary Restrictions" sectionKey="dietary">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {DIETARY_OPTIONS.map((option) => (
                                    <Button
                                        key={option.value}
                                        variant={filters.dietaryRestrictions.includes(option.value) ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => updateFilters({
                                            dietaryRestrictions: toggleArrayFilter(filters.dietaryRestrictions, option.value)
                                        })}
                                        className="flex items-center justify-start"
                                    >
                                        {option.icon}
                                        <span className="ml-1">{option.label}</span>
                                    </Button>
                                ))}
                            </div>
                        </FilterSection>

                        {/* Rating Filter */}
                        <FilterSection title="Minimum Rating" sectionKey="rating">
                            <div className="flex space-x-2">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <Button
                                        key={rating}
                                        variant={filters.rating.min === rating ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => updateFilters({
                                            rating: { min: filters.rating.min === rating ? undefined : rating }
                                        })}
                                        className="flex items-center"
                                    >
                                        <Star className="w-4 h-4 mr-1" />
                                        {rating}+
                                    </Button>
                                ))}
                            </div>
                        </FilterSection>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
} 