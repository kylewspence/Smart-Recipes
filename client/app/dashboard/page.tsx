'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ChefHat,
    Heart,
    Clock,
    TrendingUp,
    Star,
    Calendar,
    Search,
    Plus,
    BookOpen,
    Award,
    Target,
    Activity
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { responsive } from '@/lib/utils/responsive';
import { MagicCard, ShimmerButton, BlurFade, NumberTicker } from '@/components/magicui';
import RecipeCard from '@/components/recipe/RecipeCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { preferencesService } from '@/lib/services/preferences';

interface UserStats {
    recipesGenerated: number;
    favoriteRecipes: number;
    totalCookingTime: number;
    averageRating: number;
    recipesThisMonth: number;
    streakDays: number;
    achievements: number;
    topCuisine: string;
}

interface RecentActivity {
    id: string;
    type: 'generated' | 'favorited' | 'cooked' | 'rated';
    recipe: {
        recipeId: string;
        title: string;
        imageUrl?: string;
        cuisine: string;
        difficulty: string;
        cookingTime: number;
    };
    timestamp: string;
    rating?: number;
}

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export default function DashboardPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
    const [stats, setStats] = useState<UserStats>({
        recipesGenerated: 0,
        favoriteRecipes: 0,
        totalCookingTime: 0,
        averageRating: 0,
        recipesThisMonth: 0,
        streakDays: 0,
        achievements: 0,
        topCuisine: 'Italian'
    });

    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [recentRecipes, setRecentRecipes] = useState<any[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Check if user has completed onboarding
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            if (!user || authLoading) return;

            try {
                // Try to get user preferences
                const preferences = await preferencesService.getUserPreferences(user.userId.toString());
                setHasCompletedOnboarding(true);
            } catch (error: any) {
                // If preferences don't exist (404), user needs onboarding
                if (error.status === 404 || error.message?.includes('not found')) {
                    setHasCompletedOnboarding(false);
                    router.push('/onboarding');
                    return;
                } else {
                    console.error('Error checking onboarding status:', error);
                    // On other errors, assume they need onboarding
                    setHasCompletedOnboarding(false);
                    router.push('/onboarding');
                    return;
                }
            }
        };

        checkOnboardingStatus();
    }, [user, authLoading, router]);

    // Mock data for demonstration
    useEffect(() => {
        // In a real app, this would fetch from your API
        setTimeout(() => {
            setStats({
                recipesGenerated: 47,
                favoriteRecipes: 23,
                totalCookingTime: 1840, // minutes
                averageRating: 4.3,
                recipesThisMonth: 12,
                streakDays: 5,
                achievements: 8,
                topCuisine: 'Italian'
            });

            setRecentActivity([
                {
                    id: '1',
                    type: 'generated',
                    recipe: {
                        recipeId: '1',
                        title: 'Creamy Mushroom Risotto',
                        cuisine: 'Italian',
                        difficulty: 'medium',
                        cookingTime: 35,
                        imageUrl: '/api/placeholder/300/200'
                    },
                    timestamp: '2024-01-15T10:30:00Z'
                },
                {
                    id: '2',
                    type: 'favorited',
                    recipe: {
                        recipeId: '2',
                        title: 'Spicy Thai Basil Chicken',
                        cuisine: 'Thai',
                        difficulty: 'easy',
                        cookingTime: 20,
                        imageUrl: '/api/placeholder/300/200'
                    },
                    timestamp: '2024-01-14T15:45:00Z'
                },
                {
                    id: '3',
                    type: 'rated',
                    recipe: {
                        recipeId: '3',
                        title: 'Classic Beef Tacos',
                        cuisine: 'Mexican',
                        difficulty: 'easy',
                        cookingTime: 25,
                        imageUrl: '/api/placeholder/300/200'
                    },
                    timestamp: '2024-01-14T12:20:00Z',
                    rating: 5
                }
            ]);

            setRecentRecipes([
                {
                    recipeId: '1',
                    title: 'Creamy Mushroom Risotto',
                    description: 'A rich and creamy risotto with mixed mushrooms and parmesan cheese.',
                    cuisine: 'Italian',
                    difficulty: 'medium',
                    cookingTime: 35,
                    prepTime: 15,
                    servings: 4,
                    rating: 4.5,
                    imageUrl: '/api/placeholder/300/200',
                    isGenerated: true,
                    createdAt: '2024-01-15T10:30:00Z',
                    updatedAt: '2024-01-15T10:30:00Z'
                },
                {
                    recipeId: '2',
                    title: 'Spicy Thai Basil Chicken',
                    description: 'Quick and flavorful Thai stir-fry with fresh basil and chilies.',
                    cuisine: 'Thai',
                    difficulty: 'easy',
                    cookingTime: 20,
                    prepTime: 10,
                    servings: 2,
                    rating: 4.8,
                    imageUrl: '/api/placeholder/300/200',
                    isGenerated: true,
                    createdAt: '2024-01-14T15:45:00Z',
                    updatedAt: '2024-01-14T15:45:00Z'
                }
            ]);

            setAchievements([
                {
                    id: '1',
                    title: 'First Recipe',
                    description: 'Generated your first AI recipe',
                    icon: '🎉',
                    unlockedAt: '2024-01-10T09:00:00Z',
                    rarity: 'common'
                },
                {
                    id: '2',
                    title: 'Italian Master',
                    description: 'Cooked 10 Italian recipes',
                    icon: '🍝',
                    unlockedAt: '2024-01-12T14:30:00Z',
                    rarity: 'rare'
                },
                {
                    id: '3',
                    title: 'Speed Chef',
                    description: 'Completed 5 recipes under 20 minutes',
                    icon: '⚡',
                    unlockedAt: '2024-01-14T11:15:00Z',
                    rarity: 'epic'
                }
            ]);

            setIsLoading(false);
        }, 1000);
    }, [hasCompletedOnboarding]); // Only load data after onboarding check is complete

    // Show loading while checking authentication or onboarding status
    if (authLoading || hasCompletedOnboarding === null) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    // If user hasn't completed onboarding, they'll be redirected
    if (hasCompletedOnboarding === false) {
        return null;
    }

    const formatCookingTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'generated': return <ChefHat className="w-4 h-4" />;
            case 'favorited': return <Heart className="w-4 h-4" />;
            case 'cooked': return <Clock className="w-4 h-4" />;
            case 'rated': return <Star className="w-4 h-4" />;
            default: return <Activity className="w-4 h-4" />;
        }
    };

    const getActivityText = (activity: RecentActivity) => {
        switch (activity.type) {
            case 'generated': return 'Generated recipe';
            case 'favorited': return 'Added to favorites';
            case 'cooked': return 'Cooked recipe';
            case 'rated': return `Rated ${activity.rating} stars`;
            default: return 'Activity';
        }
    };

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'common': return 'text-gray-600';
            case 'rare': return 'text-blue-600';
            case 'epic': return 'text-purple-600';
            case 'legendary': return 'text-yellow-600';
            default: return 'text-gray-600';
        }
    };

    if (!user) {
        return (
            <div className={responsive.container.page}>
                <div className="text-center py-12">
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        Please log in to view your dashboard.
                    </p>
                    <Link href="/login">
                        <ShimmerButton className="mt-4">
                            Sign In
                        </ShimmerButton>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={responsive.container.page}>
            <div className={responsive.spacing.section}>
                {/* Header */}
                <BlurFade delay={0.1}>
                    <div className={responsive.flex.between}>
                        <div>
                            <h1 className={responsive.text.h1}>
                                Welcome back, {user.name}!
                            </h1>
                            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                                Here's what's cooking in your kitchen
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            <Link href="/generate">
                                <ShimmerButton
                                    background="linear-gradient(45deg, #f97316, #ea580c)"
                                    className="flex items-center space-x-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>New Recipe</span>
                                </ShimmerButton>
                            </Link>
                            <Link href="/search">
                                <ShimmerButton
                                    background="linear-gradient(45deg, #3b82f6, #1d4ed8)"
                                    className="flex items-center space-x-2"
                                >
                                    <Search className="w-4 h-4" />
                                    <span>Browse</span>
                                </ShimmerButton>
                            </Link>
                        </div>
                    </div>
                </BlurFade>

                {/* Stats Grid */}
                <BlurFade delay={0.2}>
                    <div className={responsive.grid.dashboard}>
                        <MagicCard className="p-6" gradientColor="#f97316" gradientOpacity={0.1}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Recipes Generated
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <NumberTicker
                                            value={stats.recipesGenerated}
                                            className="text-2xl font-bold text-gray-900 dark:text-white"
                                        />
                                        <ChefHat className="w-5 h-5 text-orange-500" />
                                    </div>
                                </div>
                            </div>
                        </MagicCard>

                        <MagicCard className="p-6" gradientColor="#ef4444" gradientOpacity={0.1}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Favorite Recipes
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <NumberTicker
                                            value={stats.favoriteRecipes}
                                            className="text-2xl font-bold text-gray-900 dark:text-white"
                                        />
                                        <Heart className="w-5 h-5 text-red-500" />
                                    </div>
                                </div>
                            </div>
                        </MagicCard>

                        <MagicCard className="p-6" gradientColor="#10b981" gradientOpacity={0.1}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Cooking Time
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {formatCookingTime(stats.totalCookingTime)}
                                        </span>
                                        <Clock className="w-5 h-5 text-green-500" />
                                    </div>
                                </div>
                            </div>
                        </MagicCard>

                        <MagicCard className="p-6" gradientColor="#8b5cf6" gradientOpacity={0.1}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Average Rating
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <NumberTicker
                                            value={stats.averageRating}
                                            className="text-2xl font-bold text-gray-900 dark:text-white"
                                            decimalPlaces={1}
                                        />
                                        <Star className="w-5 h-5 text-purple-500 fill-current" />
                                    </div>
                                </div>
                            </div>
                        </MagicCard>

                        <MagicCard className="p-6" gradientColor="#06b6d4" gradientOpacity={0.1}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        This Month
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <NumberTicker
                                            value={stats.recipesThisMonth}
                                            className="text-2xl font-bold text-gray-900 dark:text-white"
                                        />
                                        <Calendar className="w-5 h-5 text-cyan-500" />
                                    </div>
                                </div>
                            </div>
                        </MagicCard>

                        <MagicCard className="p-6" gradientColor="#f59e0b" gradientOpacity={0.1}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Cooking Streak
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <NumberTicker
                                            value={stats.streakDays}
                                            className="text-2xl font-bold text-gray-900 dark:text-white"
                                        />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">days</span>
                                        <TrendingUp className="w-5 h-5 text-amber-500" />
                                    </div>
                                </div>
                            </div>
                        </MagicCard>
                    </div>
                </BlurFade>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                    {/* Recent Activity */}
                    <BlurFade delay={0.3}>
                        <MagicCard className="lg:col-span-2" gradientColor="#3b82f6" gradientOpacity={0.05}>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        Recent Activity
                                    </h2>
                                    <Link href="/activity" className="text-primary hover:text-primary/80 text-sm">
                                        View All
                                    </Link>
                                </div>
                                <div className="space-y-4">
                                    {recentActivity.map((activity, index) => (
                                        <motion.div
                                            key={activity.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full">
                                                {getActivityIcon(activity.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {getActivityText(activity)}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                    {activity.recipe.title}
                                                </p>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(activity.timestamp).toLocaleDateString()}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </MagicCard>
                    </BlurFade>

                    {/* Achievements */}
                    <BlurFade delay={0.4}>
                        <MagicCard gradientColor="#8b5cf6" gradientOpacity={0.05}>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        Achievements
                                    </h2>
                                    <Award className="w-5 h-5 text-purple-500" />
                                </div>
                                <div className="space-y-4">
                                    {achievements.map((achievement, index) => (
                                        <motion.div
                                            key={achievement.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                                        >
                                            <div className="text-2xl">{achievement.icon}</div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {achievement.title}
                                                </p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                                    {achievement.description}
                                                </p>
                                            </div>
                                            <div className={`text-xs font-medium ${getRarityColor(achievement.rarity)}`}>
                                                {achievement.rarity}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <Link href="/achievements" className="text-primary hover:text-primary/80 text-sm">
                                        View All Achievements
                                    </Link>
                                </div>
                            </div>
                        </MagicCard>
                    </BlurFade>
                </div>

                {/* Recent Recipes */}
                <BlurFade delay={0.5}>
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                Your Recent Recipes
                            </h2>
                            <Link href="/my-recipes" className="text-primary hover:text-primary/80">
                                View All Recipes
                            </Link>
                        </div>
                        <div className={responsive.grid.cards}>
                            {recentRecipes.map((recipe, index) => (
                                <BlurFade key={recipe.recipeId} delay={0.1 * index}>
                                    <RecipeCard
                                        recipe={recipe}
                                        variant="default"
                                        showActions={true}
                                        className="h-full"
                                    />
                                </BlurFade>
                            ))}
                        </div>
                    </div>
                </BlurFade>

                {/* Quick Goals */}
                <BlurFade delay={0.6}>
                    <MagicCard className="mt-8" gradientColor="#10b981" gradientOpacity={0.05}>
                        <div className="p-6">
                            <div className="flex items-center space-x-2 mb-6">
                                <Target className="w-5 h-5 text-green-500" />
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    Your Cooking Goals
                                </h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <div className="text-2xl mb-2">🎯</div>
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                                        Try 3 New Cuisines
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Progress: 1/3 completed
                                    </p>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                        <div className="bg-green-500 h-2 rounded-full w-1/3"></div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl mb-2">⚡</div>
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                                        Cook 5 Quick Meals
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Progress: 3/5 completed
                                    </p>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                        <div className="bg-green-500 h-2 rounded-full w-3/5"></div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl mb-2">🌟</div>
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                                        Rate 10 Recipes
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Progress: 7/10 completed
                                    </p>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                        <div className="bg-green-500 h-2 rounded-full w-7/10"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </MagicCard>
                </BlurFade>
            </div>
        </div>
    );
} 