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
    Activity,
    Settings,
    User,
    Edit,
    Utensils,
    Timer,
    Users,
    Filter,
    Zap
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { responsive } from '@/lib/utils/responsive';
import { MagicCard, ShimmerButton, BlurFade, NumberTicker } from '@/components/magicui';
import RecipeCard from '@/components/recipe/RecipeCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { preferencesService } from '@/lib/services/preferences';
import { UserPreferences } from '@/lib/types/preferences';

interface UserStats {
    recipesGenerated: number;
    favoriteRecipes: number;
    totalCookingTime: number;
    averageRating: number;
    recipesThisMonth: number;
    streakDays: number;
}

interface QuickAction {
    title: string;
    description: string;
    href: string;
    icon: React.ReactNode;
    color: string;
    gradient: string;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
    const [stats, setStats] = useState<UserStats>({
        recipesGenerated: 0,
        favoriteRecipes: 0,
        totalCookingTime: 0,
        averageRating: 0,
        recipesThisMonth: 0,
        streakDays: 0
    });

    useEffect(() => {
        const initializeDashboard = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            try {
                // Get user preferences
                const preferences = await preferencesService.getUserPreferences(user.userId.toString());
                console.log('📊 Dashboard loaded preferences:', preferences);
                setUserPreferences(preferences);

                // TODO: Fetch real user stats from API
                // For now using mock data, but this should be replaced with actual API calls
                setStats({
                    recipesGenerated: 12,
                    favoriteRecipes: 8,
                    totalCookingTime: 450, // minutes
                    averageRating: 4.2,
                    recipesThisMonth: 5,
                    streakDays: 3
                });

            } catch (error: any) {
                console.error('❌ Dashboard error loading preferences:', error);

                // If user has no preferences (404 error), redirect to onboarding
                // This ensures new users complete their setup before accessing the dashboard
                if (error.response?.status === 404) {
                    console.log('🔄 No preferences found, redirecting to onboarding...');
                    router.push('/onboarding');
                    return;
                }

                // For other errors, let user stay on dashboard
                // They can click "Edit Preferences" if needed
            } finally {
                setIsLoading(false);
            }
        };

        initializeDashboard();
    }, [user, router]);

    const quickActions: QuickAction[] = [
        {
            title: "Generate Recipe",
            description: "Create a new AI-powered recipe",
            href: "/recipe-generator",
            icon: <ChefHat className="w-6 h-6" />,
            color: "text-orange-600",
            gradient: "from-orange-500 to-red-500"
        },
        {
            title: "Browse Recipes",
            description: "Explore saved and favorite recipes",
            href: "/recipes/saved",
            icon: <BookOpen className="w-6 h-6" />,
            color: "text-blue-600",
            gradient: "from-blue-500 to-purple-500"
        },
        {
            title: "Edit Preferences",
            description: "Update your dietary preferences",
            href: "/preferences/manage",
            icon: <Settings className="w-6 h-6" />,
            color: "text-green-600",
            gradient: "from-green-500 to-teal-500"
        },
        {
            title: "Search Recipes",
            description: "Find recipes by ingredients",
            href: "/search",
            icon: <Search className="w-6 h-6" />,
            color: "text-purple-600",
            gradient: "from-purple-500 to-pink-500"
        }
    ];

    const formatCookingTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const getPreferencesSummary = () => {
        if (!userPreferences) return null;

        const summary = [];

        if (userPreferences.dietaryRestrictions && userPreferences.dietaryRestrictions.length > 0) {
            summary.push(`${userPreferences.dietaryRestrictions.length} dietary restriction${userPreferences.dietaryRestrictions.length > 1 ? 's' : ''}`);
        }

        if (userPreferences.allergies && userPreferences.allergies.length > 0) {
            summary.push(`${userPreferences.allergies.length} allerg${userPreferences.allergies.length > 1 ? 'ies' : 'y'}`);
        }

        if (userPreferences.cuisinePreferences && userPreferences.cuisinePreferences.length > 0) {
            summary.push(`${userPreferences.cuisinePreferences.length} cuisine preference${userPreferences.cuisinePreferences.length > 1 ? 's' : ''}`);
        }

        return summary.length > 0 ? summary.join(', ') : 'No preferences set';
    };

    if (isLoading) {
        return (
            <div className={responsive.container.page}>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={responsive.container.page}>
                <div className="text-center py-12">
                    <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Welcome to Smart Recipes
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                        Please log in to view your personalized dashboard.
                    </p>
                    <Link href="/login">
                        <ShimmerButton className="px-8 py-3">
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
                {/* Welcome Header */}
                <BlurFade delay={0.1}>
                    <div className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                            Welcome back, {user.name}! 👋
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400">
                            Ready to create something delicious today?
                        </p>
                    </div>
                </BlurFade>

                {/* Quick Actions */}
                <BlurFade delay={0.2}>
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                            Quick Actions
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {quickActions.map((action, index) => (
                                <Link key={action.title} href={action.href}>
                                    <MagicCard
                                        className="p-6 h-full hover:scale-105 transition-transform cursor-pointer"
                                        gradientColor={action.color.replace('text-', '#').replace('-600', '')}
                                        gradientOpacity={0.1}
                                    >
                                        <div className="text-center">
                                            <div className={`${action.color} mb-3 flex justify-center`}>
                                                {action.icon}
                                            </div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                                {action.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {action.description}
                                            </p>
                                        </div>
                                    </MagicCard>
                                </Link>
                            ))}
                        </div>
                    </div>
                </BlurFade>

                {/* Your Preferences */}
                <BlurFade delay={0.3}>
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                                <Target className="w-5 h-5 mr-2 text-green-500" />
                                Your Preferences
                            </h2>
                            <Link href="/preferences/manage">
                                <ShimmerButton
                                    background="linear-gradient(45deg, #10b981, #059669)"
                                    className="flex items-center space-x-2 px-4 py-2 text-sm"
                                >
                                    <Edit className="w-4 h-4" />
                                    <span>Edit</span>
                                </ShimmerButton>
                            </Link>
                        </div>

                        <MagicCard className="p-6" gradientColor="#10b981" gradientOpacity={0.1}>
                            {userPreferences ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                                            <Filter className="w-4 h-4 mr-1" />
                                            Dietary Restrictions
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {userPreferences.dietaryRestrictions && userPreferences.dietaryRestrictions.length > 0
                                                ? userPreferences.dietaryRestrictions.join(', ')
                                                : 'None set'
                                            }
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                                            <Utensils className="w-4 h-4 mr-1" />
                                            Cuisines
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {userPreferences.cuisinePreferences && userPreferences.cuisinePreferences.length > 0
                                                ? userPreferences.cuisinePreferences.slice(0, 2).join(', ') +
                                                (userPreferences.cuisinePreferences.length > 2 ? ` +${userPreferences.cuisinePreferences.length - 2} more` : '')
                                                : 'No preferences'
                                            }
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                                            <Timer className="w-4 h-4 mr-1" />
                                            Max Cooking Time
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {userPreferences.maxCookingTime ? `${userPreferences.maxCookingTime} minutes` : '60 minutes'}
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                                            <Users className="w-4 h-4 mr-1" />
                                            Serving Size
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {userPreferences.servingSize || 4} people
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                                        No preferences set yet. Complete your setup to get personalized recommendations!
                                    </p>
                                    <Link href="/onboarding">
                                        <ShimmerButton>
                                            Complete Setup
                                        </ShimmerButton>
                                    </Link>
                                </div>
                            )}
                        </MagicCard>
                    </div>
                </BlurFade>

                {/* Stats Overview */}
                <BlurFade delay={0.4}>
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <Award className="w-5 h-5 mr-2 text-purple-500" />
                            Your Cooking Journey
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <MagicCard className="p-6" gradientColor="#f97316" gradientOpacity={0.1}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                            Recipes Generated
                                        </p>
                                        <div className="flex items-center space-x-2 mt-1">
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
                                        <div className="flex items-center space-x-2 mt-1">
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
                                            Total Cooking Time
                                        </p>
                                        <div className="flex items-center space-x-2 mt-1">
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
                                        <div className="flex items-center space-x-2 mt-1">
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
                                        <div className="flex items-center space-x-2 mt-1">
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
                                        <div className="flex items-center space-x-2 mt-1">
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
                    </div>
                </BlurFade>

                {/* Get Started Section */}
                <BlurFade delay={0.5}>
                    <MagicCard className="p-8 text-center" gradientColor="#6366f1" gradientOpacity={0.1}>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Ready to cook something amazing?
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Generate a personalized recipe based on your preferences and available ingredients.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/recipe-generator">
                                <ShimmerButton
                                    background="linear-gradient(45deg, #f97316, #ea580c)"
                                    className="flex items-center space-x-2 px-6 py-3"
                                >
                                    <ChefHat className="w-5 h-5" />
                                    <span>Generate Recipe</span>
                                </ShimmerButton>
                            </Link>
                            <Link href="/recipes/saved">
                                <ShimmerButton
                                    background="linear-gradient(45deg, #3b82f6, #1d4ed8)"
                                    className="flex items-center space-x-2 px-6 py-3"
                                >
                                    <BookOpen className="w-5 h-5" />
                                    <span>Browse Saved</span>
                                </ShimmerButton>
                            </Link>
                        </div>
                    </MagicCard>
                </BlurFade>
            </div>
        </div>
    );
} 