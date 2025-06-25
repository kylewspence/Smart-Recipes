'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Filter,
    X,
    Clock,
    Star,
    ChefHat,
    Flame,
    Globe,
    Users,
    Bookmark,
    Settings,
    RotateCcw,
    Save
} from 'lucide-react';
import { cn, responsive, formResponsive } from '@/lib/utils/responsive';
import { MagicCard, ShimmerButton } from '@/components/magicui';

export interface FilterOptions {
    cuisine: string[];
    difficulty: ('easy' | 'medium' | 'hard')[];
    cookingTime: {
        min?: number;
        max?: number;
    };
    prepTime: {
        min?: number;
        max?: number;
    };
    servings: {
        min?: number;
        max?: number;
    };
    spiceLevel: ('mild' | 'medium' | 'hot')[];
    dietaryRestrictions: string[];
    ingredients: {
        include: string[];
        exclude: string[];
    };
    rating: {
        min?: number;
    };
    tags: string[];
    isGenerated?: boolean;
    isFavorite?: boolean;
    dateRange?: {
        start?: string;
        end?: string;
    };
}

interface AdvancedFiltersProps {
    filters: FilterOptions;
    onFiltersChange: (filters: FilterOptions) => void;
    onApplyFilters: () => void;
    onResetFilters: () => void;
    isOpen: boolean;
    onToggle: () => void;
    className?: string;
    savedFilters?: Array<{ name: string; filters: FilterOptions }>;
    onSaveFilters?: (name: string, filters: FilterOptions) => void;
    onLoadFilters?: (filters: FilterOptions) => void;
}

const CUISINE_OPTIONS = [
    'Italian', 'Mexican', 'Chinese', 'Indian', 'Thai', 'Japanese', 'French',
    'Mediterranean', 'American', 'Korean', 'Vietnamese', 'Greek', 'Spanish',
    'Middle Eastern', 'British', 'German', 'Moroccan', 'Brazilian'
];

const DIETARY_RESTRICTIONS = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free',
    'Keto', 'Paleo', 'Low-Carb', 'Low-Fat', 'Low-Sodium', 'Diabetic-Friendly'
];

const COMMON_TAGS = [
    'Quick & Easy', 'One-Pot', 'Make-Ahead', 'Freezer-Friendly', 'Kid-Friendly',
    'Date Night', 'Comfort Food', 'Healthy', 'Indulgent', 'Seasonal', 'Holiday'
];

export default function AdvancedFilters({
    filters,
    onFiltersChange,
    onApplyFilters,
    onResetFilters,
    isOpen,
    onToggle,
    className,
    savedFilters = [],
    onSaveFilters,
    onLoadFilters
}: AdvancedFiltersProps) {
    const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);
    const [saveFilterName, setSaveFilterName] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'saved'>('basic');

    // Update local filters when props change
    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    const updateFilter = useCallback((key: keyof FilterOptions, value: any) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
        onFiltersChange(newFilters);
    }, [localFilters, onFiltersChange]);

    const toggleArrayFilter = useCallback((key: keyof FilterOptions, value: string) => {
        const currentArray = (localFilters[key] as string[]) || [];
        const newArray = currentArray.includes(value)
            ? currentArray.filter(item => item !== value)
            : [...currentArray, value];
        updateFilter(key, newArray);
    }, [localFilters, updateFilter]);

    const updateRangeFilter = useCallback((
        key: keyof FilterOptions,
        rangeKey: 'min' | 'max',
        value: number | undefined
    ) => {
        const currentRange = (localFilters[key] as any) || {};
        const newRange = { ...currentRange, [rangeKey]: value };
        updateFilter(key, newRange);
    }, [localFilters, updateFilter]);

    const hasActiveFilters = useCallback(() => {
        return (
            localFilters.cuisine.length > 0 ||
            localFilters.difficulty.length > 0 ||
            localFilters.spiceLevel.length > 0 ||
            localFilters.dietaryRestrictions.length > 0 ||
            localFilters.ingredients.include.length > 0 ||
            localFilters.ingredients.exclude.length > 0 ||
            localFilters.tags.length > 0 ||
            localFilters.cookingTime.min !== undefined ||
            localFilters.cookingTime.max !== undefined ||
            localFilters.prepTime.min !== undefined ||
            localFilters.prepTime.max !== undefined ||
            localFilters.servings.min !== undefined ||
            localFilters.servings.max !== undefined ||
            localFilters.rating.min !== undefined ||
            localFilters.isGenerated !== undefined ||
            localFilters.isFavorite !== undefined
        );
    }, [localFilters]);

    const handleSaveFilters = () => {
        if (saveFilterName.trim() && onSaveFilters) {
            onSaveFilters(saveFilterName.trim(), localFilters);
            setSaveFilterName('');
            setShowSaveDialog(false);
        }
    };

    const FilterSection = ({ title, children, icon: Icon }: {
        title: string;
        children: React.ReactNode;
        icon: React.ComponentType<{ className?: string }>;
    }) => (
        <div className="space-y-3">
            <div className="flex items-center space-x-2">
                <Icon className="w-4 h-4 text-primary" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">{title}</h4>
            </div>
            <div className="space-y-2">
                {children}
            </div>
        </div>
    );

    const CheckboxGroup = ({
        options,
        selected,
        onChange
    }: {
        options: string[];
        selected: string[];
        onChange: (value: string) => void;
    }) => (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {options.map((option) => (
                <label
                    key={option}
                    className={cn(
                        "flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors",
                        "hover:bg-gray-100 dark:hover:bg-gray-800",
                        selected.includes(option) && "bg-primary/10 border border-primary/20"
                    )}
                >
                    <input
                        type="checkbox"
                        checked={selected.includes(option)}
                        onChange={() => onChange(option)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                </label>
            ))}
        </div>
    );

    const RangeInput = ({
        label,
        min,
        max,
        onMinChange,
        onMaxChange,
        unit = '',
        step = 1
    }: {
        label: string;
        min?: number;
        max?: number;
        onMinChange: (value: number | undefined) => void;
        onMaxChange: (value: number | undefined) => void;
        unit?: string;
        step?: number;
    }) => (
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <div className="flex items-center space-x-2">
                <input
                    type="number"
                    placeholder="Min"
                    value={min || ''}
                    onChange={(e) => onMinChange(e.target.value ? Number(e.target.value) : undefined)}
                    step={step}
                    className={cn(formResponsive.input, "flex-1")}
                />
                <span className="text-gray-400">to</span>
                <input
                    type="number"
                    placeholder="Max"
                    value={max || ''}
                    onChange={(e) => onMaxChange(e.target.value ? Number(e.target.value) : undefined)}
                    step={step}
                    className={cn(formResponsive.input, "flex-1")}
                />
                {unit && <span className="text-sm text-gray-500">{unit}</span>}
            </div>
        </div>
    );

    return (
        <div className={cn("relative", className)}>
            {/* Filter Toggle Button */}
            <ShimmerButton
                onClick={onToggle}
                className={cn(
                    "relative",
                    hasActiveFilters() && "ring-2 ring-primary ring-offset-2"
                )}
                background="linear-gradient(45deg, #6366f1, #8b5cf6)"
            >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters() && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                        Active
                    </span>
                )}
            </ShimmerButton>

            {/* Filter Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 z-50 mt-2"
                    >
                        <MagicCard className="w-full max-w-4xl" gradientColor="#6366f1" gradientOpacity={0.1}>
                            <div className="p-6 space-y-6">
                                {/* Header */}
                                <div className={responsive.flex.between}>
                                    <div className="flex items-center space-x-2">
                                        <Filter className="w-5 h-5 text-primary" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            Advanced Filters
                                        </h3>
                                    </div>
                                    <button
                                        onClick={onToggle}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Tabs */}
                                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                    {[
                                        { key: 'basic', label: 'Basic', icon: Filter },
                                        { key: 'advanced', label: 'Advanced', icon: Settings },
                                        { key: 'saved', label: 'Saved', icon: Bookmark }
                                    ].map(({ key, label, icon: Icon }) => (
                                        <button
                                            key={key}
                                            onClick={() => setActiveTab(key as any)}
                                            className={cn(
                                                "flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                                activeTab === key
                                                    ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                            )}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className={responsive.mobile.hidden}>{label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Filter Content */}
                                <div className="space-y-6">
                                    {activeTab === 'basic' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <FilterSection title="Cuisine" icon={Globe}>
                                                <CheckboxGroup
                                                    options={CUISINE_OPTIONS}
                                                    selected={localFilters.cuisine}
                                                    onChange={(value) => toggleArrayFilter('cuisine', value)}
                                                />
                                            </FilterSection>

                                            <FilterSection title="Difficulty" icon={ChefHat}>
                                                <CheckboxGroup
                                                    options={['easy', 'medium', 'hard']}
                                                    selected={localFilters.difficulty}
                                                    onChange={(value) => toggleArrayFilter('difficulty', value)}
                                                />
                                            </FilterSection>

                                            <FilterSection title="Spice Level" icon={Flame}>
                                                <CheckboxGroup
                                                    options={['mild', 'medium', 'hot']}
                                                    selected={localFilters.spiceLevel}
                                                    onChange={(value) => toggleArrayFilter('spiceLevel', value)}
                                                />
                                            </FilterSection>

                                            <FilterSection title="Time & Servings" icon={Clock}>
                                                <div className="space-y-4">
                                                    <RangeInput
                                                        label="Cooking Time"
                                                        min={localFilters.cookingTime.min}
                                                        max={localFilters.cookingTime.max}
                                                        onMinChange={(value) => updateRangeFilter('cookingTime', 'min', value)}
                                                        onMaxChange={(value) => updateRangeFilter('cookingTime', 'max', value)}
                                                        unit="min"
                                                        step={5}
                                                    />
                                                    <RangeInput
                                                        label="Servings"
                                                        min={localFilters.servings.min}
                                                        max={localFilters.servings.max}
                                                        onMinChange={(value) => updateRangeFilter('servings', 'min', value)}
                                                        onMaxChange={(value) => updateRangeFilter('servings', 'max', value)}
                                                        unit="people"
                                                    />
                                                </div>
                                            </FilterSection>
                                        </div>
                                    )}

                                    {activeTab === 'advanced' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <FilterSection title="Dietary Restrictions" icon={Users}>
                                                <CheckboxGroup
                                                    options={DIETARY_RESTRICTIONS}
                                                    selected={localFilters.dietaryRestrictions}
                                                    onChange={(value) => toggleArrayFilter('dietaryRestrictions', value)}
                                                />
                                            </FilterSection>

                                            <FilterSection title="Recipe Tags" icon={Bookmark}>
                                                <CheckboxGroup
                                                    options={COMMON_TAGS}
                                                    selected={localFilters.tags}
                                                    onChange={(value) => toggleArrayFilter('tags', value)}
                                                />
                                            </FilterSection>

                                            <FilterSection title="Rating" icon={Star}>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Minimum Rating
                                                    </label>
                                                    <div className="flex space-x-2">
                                                        {[1, 2, 3, 4, 5].map((rating) => (
                                                            <button
                                                                key={rating}
                                                                onClick={() => updateFilter('rating', { min: rating })}
                                                                className={cn(
                                                                    "flex items-center space-x-1 px-3 py-2 rounded-md border transition-colors",
                                                                    (localFilters.rating.min || 0) >= rating
                                                                        ? "bg-primary text-primary-foreground border-primary"
                                                                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                )}
                                                            >
                                                                <Star className="w-4 h-4" />
                                                                <span className="text-sm">{rating}+</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </FilterSection>

                                            <FilterSection title="Recipe Type" icon={ChefHat}>
                                                <div className="space-y-3">
                                                    <label className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={localFilters.isGenerated === true}
                                                            onChange={(e) => updateFilter('isGenerated', e.target.checked ? true : undefined)}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">AI Generated Only</span>
                                                    </label>
                                                    <label className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={localFilters.isFavorite === true}
                                                            onChange={(e) => updateFilter('isFavorite', e.target.checked ? true : undefined)}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">Favorites Only</span>
                                                    </label>
                                                </div>
                                            </FilterSection>
                                        </div>
                                    )}

                                    {activeTab === 'saved' && (
                                        <div className="space-y-4">
                                            {savedFilters.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {savedFilters.map((saved, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => onLoadFilters?.(saved.filters)}
                                                            className="p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                        >
                                                            <div className="font-medium text-sm text-gray-900 dark:text-white">
                                                                {saved.name}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                Click to apply
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-gray-500">
                                                    No saved filters yet. Create some filters and save them for quick access.
                                                </div>
                                            )}

                                            {onSaveFilters && hasActiveFilters() && (
                                                <div className="border-t pt-4">
                                                    {!showSaveDialog ? (
                                                        <button
                                                            onClick={() => setShowSaveDialog(true)}
                                                            className="flex items-center space-x-2 text-primary hover:text-primary/80"
                                                        >
                                                            <Save className="w-4 h-4" />
                                                            <span>Save Current Filters</span>
                                                        </button>
                                                    ) : (
                                                        <div className="flex space-x-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Filter name..."
                                                                value={saveFilterName}
                                                                onChange={(e) => setSaveFilterName(e.target.value)}
                                                                className={cn(formResponsive.input, "flex-1")}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveFilters()}
                                                            />
                                                            <button
                                                                onClick={handleSaveFilters}
                                                                disabled={!saveFilterName.trim()}
                                                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() => setShowSaveDialog(false)}
                                                                className="px-4 py-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className={formResponsive.actions}>
                                    <button
                                        onClick={onResetFilters}
                                        className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        <span>Reset All</span>
                                    </button>
                                    <ShimmerButton
                                        onClick={onApplyFilters}
                                        className="px-6 py-2"
                                        background="linear-gradient(45deg, #10b981, #059669)"
                                    >
                                        Apply Filters
                                    </ShimmerButton>
                                </div>
                            </div>
                        </MagicCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
} 