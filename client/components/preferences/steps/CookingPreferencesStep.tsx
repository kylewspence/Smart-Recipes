'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChefHat, Clock, Users, Flame, Plus, X } from 'lucide-react';
import { PreferenceFormData, CUISINE_TYPES } from '@/lib/types/preferences';

interface CookingPreferencesStepProps {
    data: PreferenceFormData;
    onChange: (data: Partial<PreferenceFormData>) => void;
    onNext: () => void;
    onPrev: () => void;
}

export default function CookingPreferencesStep({ data, onChange, onNext, onPrev }: CookingPreferencesStepProps) {
    const [customCuisine, setCustomCuisine] = useState('');

    // Toggle cuisine preference
    const toggleCuisinePreference = (cuisine: string) => {
        const updated = data.cuisinePreferences.includes(cuisine)
            ? data.cuisinePreferences.filter(c => c !== cuisine)
            : [...data.cuisinePreferences, cuisine];
        onChange({ cuisinePreferences: updated });
    };

    // Add custom cuisine
    const addCustomCuisine = () => {
        if (customCuisine.trim() && !data.cuisinePreferences.includes(customCuisine.trim())) {
            onChange({
                cuisinePreferences: [...data.cuisinePreferences, customCuisine.trim()]
            });
            setCustomCuisine('');
        }
    };

    // Remove custom cuisine
    const removeCuisine = (cuisine: string) => {
        onChange({
            cuisinePreferences: data.cuisinePreferences.filter(c => c !== cuisine)
        });
    };

    // Update spice level
    const updateSpiceLevel = (level: 'mild' | 'medium' | 'hot') => {
        onChange({ spiceLevel: level });
    };

    // Update cooking time
    const updateCookingTime = (time: number) => {
        onChange({ maxCookingTime: time });
    };

    // Update serving size
    const updateServingSize = (size: number) => {
        onChange({ servingSize: size });
    };

    const spiceLevels = [
        { value: 'mild', label: 'Mild', icon: '🌶️', color: 'green' },
        { value: 'medium', label: 'Medium', icon: '🌶️🌶️', color: 'yellow' },
        { value: 'hot', label: 'Hot', icon: '🌶️🌶️🌶️', color: 'red' }
    ] as const;

    const cookingTimes = [15, 30, 45, 60, 90, 120];
    const servingSizes = [1, 2, 3, 4, 5, 6, 8];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <ChefHat className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Cooking Preferences
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    Tell us about your cooking style and constraints
                </p>
            </div>

            {/* Cuisine Preferences */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <ChefHat className="w-5 h-5 mr-2 text-orange-500" />
                    Favorite Cuisines
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    What types of cuisine do you enjoy? (Select as many as you like)
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                    {CUISINE_TYPES.map((cuisine) => (
                        <button
                            key={cuisine}
                            onClick={() => toggleCuisinePreference(cuisine)}
                            className={`
                                p-3 rounded-xl border-2 transition-all duration-200
                                text-sm font-medium text-center
                                ${data.cuisinePreferences.includes(cuisine)
                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 text-gray-700 dark:text-gray-300'
                                }
                            `}
                        >
                            {cuisine}
                        </button>
                    ))}
                </div>

                {/* Custom Cuisine Input */}
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={customCuisine}
                        onChange={(e) => setCustomCuisine(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomCuisine()}
                        placeholder="Add custom cuisine..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <button
                        onClick={addCustomCuisine}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* Selected Custom Cuisines */}
                {data.cuisinePreferences.some(c => !CUISINE_TYPES.includes(c as any)) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {data.cuisinePreferences
                            .filter(c => !CUISINE_TYPES.includes(c as any))
                            .map((cuisine) => (
                                <span
                                    key={cuisine}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200"
                                >
                                    {cuisine}
                                    <button
                                        onClick={() => removeCuisine(cuisine)}
                                        className="ml-2 hover:text-orange-600 dark:hover:text-orange-300"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))
                        }
                    </div>
                )}
            </div>

            {/* Spice Level */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Flame className="w-5 h-5 mr-2 text-red-500" />
                    Spice Level
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    How spicy do you like your food?
                </p>

                <div className="grid grid-cols-3 gap-4">
                    {spiceLevels.map((level) => (
                        <button
                            key={level.value}
                            onClick={() => updateSpiceLevel(level.value)}
                            className={`
                                p-4 rounded-xl border-2 transition-all duration-200
                                text-center
                                ${data.spiceLevel === level.value
                                    ? `border-${level.color}-500 bg-${level.color}-50 dark:bg-${level.color}-900/20`
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }
                            `}
                        >
                            <div className="text-2xl mb-2">{level.icon}</div>
                            <div className={`font-medium ${data.spiceLevel === level.value
                                    ? `text-${level.color}-700 dark:text-${level.color}-300`
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                {level.label}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Cooking Time */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-500" />
                    Maximum Cooking Time
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    What's the longest you're willing to spend cooking?
                </p>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {cookingTimes.map((time) => (
                        <button
                            key={time}
                            onClick={() => updateCookingTime(time)}
                            className={`
                                p-3 rounded-xl border-2 transition-all duration-200
                                text-center
                                ${data.maxCookingTime === time
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-gray-700 dark:text-gray-300'
                                }
                            `}
                        >
                            <div className="font-medium">{time}min</div>
                        </button>
                    ))}
                </div>

                {/* Custom time input */}
                <div className="mt-4 flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Custom:</span>
                    <input
                        type="number"
                        min="5"
                        max="480"
                        value={data.maxCookingTime}
                        onChange={(e) => updateCookingTime(parseInt(e.target.value) || 60)}
                        className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">minutes</span>
                </div>
            </div>

            {/* Serving Size */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-purple-500" />
                    Typical Serving Size
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    How many people do you usually cook for?
                </p>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                    {servingSizes.map((size) => (
                        <button
                            key={size}
                            onClick={() => updateServingSize(size)}
                            className={`
                                p-3 rounded-xl border-2 transition-all duration-200
                                text-center
                                ${data.servingSize === size
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 text-gray-700 dark:text-gray-300'
                                }
                            `}
                        >
                            <div className="font-medium">{size}</div>
                        </button>
                    ))}
                </div>

                {/* Custom serving size input */}
                <div className="mt-4 flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Custom:</span>
                    <input
                        type="number"
                        min="1"
                        max="20"
                        value={data.servingSize}
                        onChange={(e) => updateServingSize(parseInt(e.target.value) || 4)}
                        className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">people</span>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={onPrev}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center space-x-2"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span>Back</span>
                </button>

                <button
                    onClick={onNext}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
                >
                    <span>Continue</span>
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}