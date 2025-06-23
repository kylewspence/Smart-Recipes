'use client';

import React from 'react';
import { ChevronLeft, CheckCircle, Heart, ChefHat, Clock, Users, Flame, ThumbsUp, ThumbsDown, Zap, Loader } from 'lucide-react';
import { PreferenceFormData } from '@/lib/types/preferences';

interface CompletionStepProps {
    data: PreferenceFormData;
    onComplete: () => void;
    onPrev: () => void;
    isLoading: boolean;
    error: string | null;
}

export default function CompletionStep({ data, onComplete, onPrev, isLoading, error }: CompletionStepProps) {

    const getSpiceLevelEmoji = (level: string) => {
        switch (level) {
            case 'mild': return '🌶️';
            case 'medium': return '🌶️🌶️';
            case 'hot': return '🌶️🌶️🌶️';
            default: return '🌶️🌶️';
        }
    };

    const preferenceCounts = {
        like: data.ingredientPreferences.filter(p => p.preference === 'like').length,
        dislike: data.ingredientPreferences.filter(p => p.preference === 'dislike').length,
        stretch: data.ingredientPreferences.filter(p => p.preference === 'stretch').length
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    You're All Set! 🎉
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    Here's a summary of your preferences. You can always update these later.
                </p>
            </div>

            {/* Preference Summary */}
            <div className="space-y-6">

                {/* Dietary Restrictions & Allergies */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Heart className="w-5 h-5 mr-2 text-green-500" />
                        Health & Safety
                    </h3>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Dietary Restrictions</h4>
                            {data.dietaryRestrictions.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {data.dietaryRestrictions.map(restriction => (
                                        <span key={restriction} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm">
                                            {restriction}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-sm">No restrictions specified</p>
                            )}
                        </div>

                        <div>
                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Allergies</h4>
                            {data.allergies.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {data.allergies.map(allergy => (
                                        <span key={allergy} className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-full text-sm">
                                            {allergy}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-sm">No allergies specified</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Cooking Preferences */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <ChefHat className="w-5 h-5 mr-2 text-orange-500" />
                        Cooking Style
                    </h3>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="flex justify-center mb-2">
                                <ChefHat className="w-6 h-6 text-orange-500" />
                            </div>
                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Cuisines</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {data.cuisinePreferences.length > 0
                                    ? `${data.cuisinePreferences.length} selected`
                                    : 'All cuisines'
                                }
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="flex justify-center mb-2">
                                <Flame className="w-6 h-6 text-red-500" />
                            </div>
                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Spice Level</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {getSpiceLevelEmoji(data.spiceLevel)} {data.spiceLevel}
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="flex justify-center mb-2">
                                <Clock className="w-6 h-6 text-blue-500" />
                            </div>
                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Max Time</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {data.maxCookingTime} minutes
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="flex justify-center mb-2">
                                <Users className="w-6 h-6 text-purple-500" />
                            </div>
                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Serving Size</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {data.servingSize} people
                            </p>
                        </div>
                    </div>

                    {/* Cuisine List */}
                    {data.cuisinePreferences.length > 0 && (
                        <div className="mt-4">
                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Favorite Cuisines:</h4>
                            <div className="flex flex-wrap gap-2">
                                {data.cuisinePreferences.slice(0, 8).map(cuisine => (
                                    <span key={cuisine} className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-full text-sm">
                                        {cuisine}
                                    </span>
                                ))}
                                {data.cuisinePreferences.length > 8 && (
                                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full text-sm">
                                        +{data.cuisinePreferences.length - 8} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Ingredient Preferences */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Heart className="w-5 h-5 mr-2 text-purple-500" />
                        Ingredient Preferences
                    </h3>

                    <div className="grid grid-cols-3 gap-4 text-center mb-4">
                        <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                            <ThumbsUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
                            <p className="font-bold text-2xl text-green-600">{preferenceCounts.like}</p>
                            <p className="text-sm text-green-700 dark:text-green-300">Love</p>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4">
                            <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                            <p className="font-bold text-2xl text-yellow-600">{preferenceCounts.stretch}</p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">Stretch</p>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4">
                            <ThumbsDown className="w-6 h-6 text-red-500 mx-auto mb-2" />
                            <p className="font-bold text-2xl text-red-600">{preferenceCounts.dislike}</p>
                            <p className="text-sm text-red-700 dark:text-red-300">Avoid</p>
                        </div>
                    </div>

                    {data.ingredientPreferences.length === 0 && (
                        <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
                            No specific ingredient preferences set - we'll use popular ingredients to start
                        </p>
                    )}
                </div>
            </div>

            {/* What's Next */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                    What happens next?
                </h3>
                <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        We'll use your preferences to personalize recipe recommendations
                    </li>
                    <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        Your recipe feed will be tailored to your tastes and constraints
                    </li>
                    <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        You can update these preferences anytime in your profile
                    </li>
                    <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        The more you use Smart Recipes, the better our recommendations become
                    </li>
                </ul>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                        Error: {error}
                    </p>
                    <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                        Please try again or contact support if the problem persists.
                    </p>
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={onPrev}
                    disabled={isLoading}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span>Back</span>
                </button>

                <button
                    onClick={onComplete}
                    disabled={isLoading}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                >
                    {isLoading ? (
                        <>
                            <Loader className="w-5 h-5 animate-spin" />
                            <span>Setting up your profile...</span>
                        </>
                    ) : (
                        <>
                            <span>Complete Setup</span>
                            <CheckCircle className="w-5 h-5" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}