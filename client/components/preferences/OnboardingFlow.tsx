'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { preferencesService } from '@/lib/services/preferences';
import { PreferenceFormData, OnboardingStep } from '@/lib/types/preferences';
import DietaryRestrictionsStep from './steps/DietaryRestrictionsStep';
import CookingPreferencesStep from './steps/CookingPreferencesStep';
import IngredientPreferencesStep from './steps/IngredientPreferencesStep';
import CompletionStep from './steps/CompletionStep';

interface OnboardingFlowProps {
    onComplete?: () => void;
    className?: string;
}

export default function OnboardingFlow({ onComplete, className = '' }: OnboardingFlowProps) {
    const { user } = useAuth();
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form data state
    const [formData, setFormData] = useState<PreferenceFormData>({
        dietaryRestrictions: [],
        allergies: [],
        cuisinePreferences: [],
        spiceLevel: 'medium',
        maxCookingTime: 60,
        servingSize: 4,
        ingredientPreferences: []
    });

    // Define onboarding steps
    const steps: OnboardingStep[] = [
        {
            id: 0,
            title: 'Dietary Preferences',
            description: 'Tell us about your dietary restrictions and allergies',
            completed: false
        },
        {
            id: 1,
            title: 'Cooking Style',
            description: 'Share your cooking preferences and constraints',
            completed: false
        },
        {
            id: 2,
            title: 'Ingredient Preferences',
            description: 'Let us know what ingredients you love or avoid',
            completed: false
        },
        {
            id: 3,
            title: 'All Set!',
            description: 'Review your preferences and complete setup',
            completed: false
        }
    ];

    // Update form data
    const updateFormData = (stepData: Partial<PreferenceFormData>) => {
        setFormData(prev => ({ ...prev, ...stepData }));
    };

    // Navigate to next step
    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    // Navigate to previous step
    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    // Complete onboarding
    const completeOnboarding = async () => {
        if (!user?.userId) {
            setError('User not found. Please log in again.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await preferencesService.createUserPreferences(user.userId, formData);

            // Mark onboarding as complete in local storage
            localStorage.setItem('onboarding_completed', 'true');

            // Call completion callback or redirect
            if (onComplete) {
                onComplete();
            } else {
                router.push('/dashboard');
            }
        } catch (err: any) {
            console.error('Failed to save preferences:', err);
            setError(err.message || 'Failed to save your preferences. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Render current step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <DietaryRestrictionsStep
                        data={formData}
                        onChange={updateFormData}
                        onNext={nextStep}
                    />
                );
            case 1:
                return (
                    <CookingPreferencesStep
                        data={formData}
                        onChange={updateFormData}
                        onNext={nextStep}
                        onPrev={prevStep}
                    />
                );
            case 2:
                return (
                    <IngredientPreferencesStep
                        data={formData}
                        onChange={updateFormData}
                        onNext={nextStep}
                        onPrev={prevStep}
                    />
                );
            case 3:
                return (
                    <CompletionStep
                        data={formData}
                        onComplete={completeOnboarding}
                        onPrev={prevStep}
                        isLoading={isLoading}
                        error={error}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className={`min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 ${className}`}>
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Welcome to Smart Recipes!
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        Let's personalize your cooking experience
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="max-w-4xl mx-auto mb-8">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center flex-1">
                                {/* Step Circle */}
                                <div className="relative">
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center
                                        transition-all duration-300 relative z-10
                                        ${index < currentStep
                                            ? 'bg-green-500 text-white'
                                            : index === currentStep
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                        }
                                    `}>
                                        {index < currentStep ? (
                                            <Check className="w-5 h-5" />
                                        ) : (
                                            <span className="text-sm font-medium">{index + 1}</span>
                                        )}
                                    </div>

                                    {/* Step Info */}
                                    <div className="absolute top-12 left-1/2 transform -translate-x-1/2 text-center min-w-max">
                                        <p className={`text-sm font-medium ${index <= currentStep
                                                ? 'text-gray-900 dark:text-white'
                                                : 'text-gray-500 dark:text-gray-400'
                                            }`}>
                                            {step.title}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Progress Line */}
                                {index < steps.length - 1 && (
                                    <div className={`
                                        flex-1 h-1 mx-4 rounded transition-all duration-300
                                        ${index < currentStep
                                            ? 'bg-green-500'
                                            : 'bg-gray-200 dark:bg-gray-700'
                                        }
                                    `} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step Content */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
                        {renderStepContent()}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="text-center mt-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Step {currentStep + 1} of {steps.length} • You can always change these preferences later
                    </p>
                </div>
            </div>
        </div>
    );
}