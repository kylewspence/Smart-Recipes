'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRightIcon, FireIcon, SparklesIcon, SunIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useRecommendations } from '../../lib/hooks/useRecommendations';
import RecipeCard from '../recipe/RecipeCard';
import { MagicCard, ShimmerButton, BlurFade } from '../magicui';

interface RecommendationsSectionProps {
    userId?: number;
    className?: string;
    showPersonalized?: boolean;
    showTrending?: boolean;
    showSeasonal?: boolean;
    showQuick?: boolean;
    limit?: number;
}

interface RecommendationTabProps {
    id: string;
    label: string;
    icon: React.ComponentType<any>;
    count?: number;
    isActive: boolean;
    onClick: () => void;
}

const RecommendationTab: React.FC<RecommendationTabProps> = ({
    id,
    label,
    icon: Icon,
    count,
    isActive,
    onClick
}) => (
    <button
        onClick={onClick}
        className={`
      relative flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200
      ${isActive
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }
    `}
    >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{label}</span>
        {count !== undefined && (
            <span className={`
        px-2 py-1 text-xs rounded-full
        ${isActive ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'}
      `}>
                {count}
            </span>
        )}
    </button>
);

const LoadingGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="animate-pulse">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-64 w-full" />
            </div>
        ))}
    </div>
);

const ErrorMessage: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
    <MagicCard className="p-6 text-center">
        <div className="text-red-500 mb-4">
            <SparklesIcon className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Oops! Something went wrong
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
        {onRetry && (
            <ShimmerButton onClick={onRetry}>
                Try Again
            </ShimmerButton>
        )}
    </MagicCard>
);

const EmptyState: React.FC<{ title: string; description: string }> = ({ title, description }) => (
    <MagicCard className="p-8 text-center">
        <div className="text-gray-400 mb-4">
            <SparklesIcon className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </MagicCard>
);

export const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
    userId,
    className = '',
    showPersonalized = true,
    showTrending = true,
    showSeasonal = true,
    showQuick = true,
    limit = 6
}) => {
    const [activeTab, setActiveTab] = useState<string>('quick');

    const {
        personalizedRecommendations,
        trendingRecipes,
        seasonalRecommendations,
        quickRecommendations,
        isLoadingPersonalized,
        isLoadingTrending,
        isLoadingSeasonal,
        isLoadingQuick,
        personalizedError,
        trendingError,
        seasonalError,
        quickError,
        fetchPersonalizedRecommendations,
        fetchTrendingRecipes,
        fetchSeasonalRecommendations,
        fetchQuickRecommendations
    } = useRecommendations();

    // Auto-fetch quick recommendations on mount
    useEffect(() => {
        fetchQuickRecommendations(limit);
    }, [fetchQuickRecommendations, limit]);

    // Auto-fetch personalized recommendations if user is provided
    useEffect(() => {
        if (userId && showPersonalized) {
            fetchPersonalizedRecommendations(userId, limit);
            setActiveTab('personalized');
        }
    }, [userId, showPersonalized, fetchPersonalizedRecommendations, limit]);

    const tabs = [
        ...(showQuick ? [{
            id: 'quick',
            label: 'Quick Picks',
            icon: ClockIcon,
            count: quickRecommendations?.length
        }] : []),
        ...(showPersonalized && userId ? [{
            id: 'personalized',
            label: 'For You',
            icon: SparklesIcon,
            count: personalizedRecommendations?.recommendations?.length
        }] : []),
        ...(showTrending ? [{
            id: 'trending',
            label: 'Trending',
            icon: FireIcon,
            count: trendingRecipes?.trendingRecipes?.length
        }] : []),
        ...(showSeasonal ? [{
            id: 'seasonal',
            label: 'Seasonal',
            icon: SunIcon,
            count: seasonalRecommendations?.seasonalRecipes?.length
        }] : [])
    ];

    const handleTabClick = (tabId: string) => {
        setActiveTab(tabId);

        // Fetch data if not already loaded
        switch (tabId) {
            case 'personalized':
                if (!personalizedRecommendations && userId) {
                    fetchPersonalizedRecommendations(userId, limit);
                }
                break;
            case 'trending':
                if (!trendingRecipes) {
                    fetchTrendingRecipes(limit);
                }
                break;
            case 'seasonal':
                if (!seasonalRecommendations) {
                    fetchSeasonalRecommendations(limit);
                }
                break;
            case 'quick':
                if (!quickRecommendations) {
                    fetchQuickRecommendations(limit);
                }
                break;
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'personalized':
                if (isLoadingPersonalized) return <LoadingGrid count={limit} />;
                if (personalizedError) return <ErrorMessage message={personalizedError} onRetry={() => userId && fetchPersonalizedRecommendations(userId, limit)} />;
                if (!personalizedRecommendations?.recommendations?.length) {
                    return <EmptyState title="No personalized recommendations yet" description="Start favoriting recipes to get personalized suggestions!" />;
                }
                return (
                    <div className="space-y-6">
                        {personalizedRecommendations.userProfile && (
                            <BlurFade delay={0.1}>
                                <MagicCard className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white">Your Profile</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {personalizedRecommendations.userProfile.totalFavorites} favorites
                                                {personalizedRecommendations.userProfile.favoriteCuisines.length > 0 && (
                                                    <span> • Loves {personalizedRecommendations.userProfile.favoriteCuisines.join(', ')}</span>
                                                )}
                                            </p>
                                        </div>
                                        <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full">
                                            {personalizedRecommendations.metadata.strategy}
                                        </span>
                                    </div>
                                </MagicCard>
                            </BlurFade>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {personalizedRecommendations.recommendations.map((recipe, index) => (
                                <BlurFade key={recipe.recipeId} delay={0.2 + index * 0.1}>
                                    <RecipeCard recipe={recipe} variant="default" />
                                </BlurFade>
                            ))}
                        </div>
                    </div>
                );

            case 'trending':
                if (isLoadingTrending) return <LoadingGrid count={limit} />;
                if (trendingError) return <ErrorMessage message={trendingError} onRetry={() => fetchTrendingRecipes(limit)} />;
                if (!trendingRecipes?.trendingRecipes?.length) {
                    return <EmptyState title="No trending recipes" description="Check back later for the latest trending recipes!" />;
                }
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trendingRecipes.trendingRecipes.map((recipe, index) => (
                            <BlurFade key={recipe.recipeId || recipe.id} delay={0.1 + index * 0.1}>
                                <RecipeCard recipe={recipe} variant="default" />
                            </BlurFade>
                        ))}
                    </div>
                );

            case 'seasonal':
                if (isLoadingSeasonal) return <LoadingGrid count={limit} />;
                if (seasonalError) return <ErrorMessage message={seasonalError} onRetry={() => fetchSeasonalRecommendations(limit)} />;
                if (!seasonalRecommendations?.seasonalRecipes?.length) {
                    return <EmptyState title="No seasonal recipes" description="Check back for seasonal recipe recommendations!" />;
                }
                return (
                    <div className="space-y-6">
                        <BlurFade delay={0.1}>
                            <MagicCard className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
                                <div className="flex items-center space-x-2">
                                    <SunIcon className="w-5 h-5 text-orange-500" />
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {seasonalRecommendations.currentSeason} Favorites
                                    </span>
                                    <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded-full">
                                        {seasonalRecommendations.metadata.strategy}
                                    </span>
                                </div>
                            </MagicCard>
                        </BlurFade>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {seasonalRecommendations.seasonalRecipes.map((recipe, index) => (
                                <BlurFade key={recipe.recipeId || recipe.id} delay={0.2 + index * 0.1}>
                                    <RecipeCard recipe={recipe} variant="default" />
                                </BlurFade>
                            ))}
                        </div>
                    </div>
                );

            case 'quick':
            default:
                if (isLoadingQuick) return <LoadingGrid count={limit} />;
                if (quickError) return <ErrorMessage message={quickError} onRetry={() => fetchQuickRecommendations(limit)} />;
                if (!quickRecommendations?.length) {
                    return <EmptyState title="No recommendations available" description="We're working on finding great recipes for you!" />;
                }
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quickRecommendations.map((recipe, index) => (
                            <BlurFade key={recipe.recipeId || recipe.id} delay={0.1 + index * 0.1}>
                                <RecipeCard recipe={recipe} variant="default" />
                            </BlurFade>
                        ))}
                    </div>
                );
        }
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <BlurFade delay={0.1}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Recipe Recommendations
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Discover recipes tailored just for you
                        </p>
                    </div>
                </div>
            </BlurFade>

            {/* Tabs */}
            <BlurFade delay={0.2}>
                <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                        <RecommendationTab
                            key={tab.id}
                            id={tab.id}
                            label={tab.label}
                            icon={tab.icon}
                            count={tab.count}
                            isActive={activeTab === tab.id}
                            onClick={() => handleTabClick(tab.id)}
                        />
                    ))}
                </div>
            </BlurFade>

            {/* Content */}
            <BlurFade delay={0.3}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {renderContent()}
                    </motion.div>
                </AnimatePresence>
            </BlurFade>
        </div>
    );
};
