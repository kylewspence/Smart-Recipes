'use client';

import React, { useState } from 'react';
import { ChevronRight, Heart, Shield, Plus, X } from 'lucide-react';
import { PreferenceFormData, DIETARY_RESTRICTIONS, COMMON_ALLERGIES } from '@/lib/types/preferences';

interface DietaryRestrictionsStepProps {
    data: PreferenceFormData;
    onChange: (data: Partial<PreferenceFormData>) => void;
    onNext: () => void;
}

export default function DietaryRestrictionsStep({ data, onChange, onNext }: DietaryRestrictionsStepProps) {
    const [customDietaryRestriction, setCustomDietaryRestriction] = useState('');
    const [customAllergy, setCustomAllergy] = useState('');

    // Toggle dietary restriction
    const toggleDietaryRestriction = (restriction: string) => {
        const updated = data.dietaryRestrictions.includes(restriction)
            ? data.dietaryRestrictions.filter(r => r !== restriction)
            : [...data.dietaryRestrictions, restriction];
        onChange({ dietaryRestrictions: updated });
    };

    // Toggle allergy
    const toggleAllergy = (allergy: string) => {
        const updated = data.allergies.includes(allergy)
            ? data.allergies.filter(a => a !== allergy)
            : [...data.allergies, allergy];
        onChange({ allergies: updated });
    };

    // Add custom dietary restriction
    const addCustomDietaryRestriction = () => {
        if (customDietaryRestriction.trim() && !data.dietaryRestrictions.includes(customDietaryRestriction.trim())) {
            onChange({
                dietaryRestrictions: [...data.dietaryRestrictions, customDietaryRestriction.trim()]
            });
            setCustomDietaryRestriction('');
        }
    };

    // Add custom allergy
    const addCustomAllergy = () => {
        if (customAllergy.trim() && !data.allergies.includes(customAllergy.trim())) {
            onChange({
                allergies: [...data.allergies, customAllergy.trim()]
            });
            setCustomAllergy('');
        }
    };

    // Remove custom item
    const removeItem = (type: 'dietaryRestrictions' | 'allergies', item: string) => {
        if (type === 'dietaryRestrictions') {
            onChange({
                dietaryRestrictions: data.dietaryRestrictions.filter(r => r !== item)
            });
        } else {
            onChange({
                allergies: data.allergies.filter(a => a !== item)
            });
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <Heart className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Dietary Preferences & Allergies
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    Help us personalize your recipes by sharing your dietary needs
                </p>
            </div>

            {/* Dietary Restrictions Section */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-green-500" />
                    Dietary Restrictions
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Select all that apply to you (optional)
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                    {DIETARY_RESTRICTIONS.map((restriction) => (
                        <button
                            key={restriction}
                            onClick={() => toggleDietaryRestriction(restriction)}
                            className={`
                                p-3 rounded-xl border-2 transition-all duration-200
                                text-sm font-medium text-center
                                ${data.dietaryRestrictions.includes(restriction)
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 text-gray-700 dark:text-gray-300'
                                }
                            `}
                        >
                            {restriction}
                        </button>
                    ))}
                </div>

                {/* Custom Dietary Restriction Input */}
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={customDietaryRestriction}
                        onChange={(e) => setCustomDietaryRestriction(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomDietaryRestriction()}
                        placeholder="Add custom dietary restriction..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <button
                        onClick={addCustomDietaryRestriction}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* Selected Custom Dietary Restrictions */}
                {data.dietaryRestrictions.some(r => !DIETARY_RESTRICTIONS.includes(r as any)) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {data.dietaryRestrictions
                            .filter(r => !DIETARY_RESTRICTIONS.includes(r as any))
                            .map((restriction) => (
                                <span
                                    key={restriction}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                                >
                                    {restriction}
                                    <button
                                        onClick={() => removeItem('dietaryRestrictions', restriction)}
                                        className="ml-2 hover:text-green-600 dark:hover:text-green-300"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))
                        }
                    </div>
                )}
            </div>

            {/* Allergies Section */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-red-500" />
                    Food Allergies
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Tell us about your allergies so we can keep you safe
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                    {COMMON_ALLERGIES.map((allergy) => (
                        <button
                            key={allergy}
                            onClick={() => toggleAllergy(allergy)}
                            className={`
                                p-3 rounded-xl border-2 transition-all duration-200
                                text-sm font-medium text-center
                                ${data.allergies.includes(allergy)
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600 text-gray-700 dark:text-gray-300'
                                }
                            `}
                        >
                            {allergy}
                        </button>
                    ))}
                </div>

                {/* Custom Allergy Input */}
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={customAllergy}
                        onChange={(e) => setCustomAllergy(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomAllergy()}
                        placeholder="Add custom allergy..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <button
                        onClick={addCustomAllergy}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* Selected Custom Allergies */}
                {data.allergies.some(a => !COMMON_ALLERGIES.includes(a as any)) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {data.allergies
                            .filter(a => !COMMON_ALLERGIES.includes(a as any))
                            .map((allergy) => (
                                <span
                                    key={allergy}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                                >
                                    {allergy}
                                    <button
                                        onClick={() => removeItem('allergies', allergy)}
                                        className="ml-2 hover:text-red-600 dark:hover:text-red-300"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))
                        }
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
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