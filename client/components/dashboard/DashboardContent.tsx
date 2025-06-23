'use client';

import React from 'react';
import { AuthenticatedNav } from '@/components/layout/AuthenticatedNav';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
    ChefHat,
    Heart,
    BookOpen,
    Search,
    Clock,
    Star,
    TrendingUp,
    Plus
} from 'lucide-react';

export function DashboardContent() {
    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <AuthenticatedNav />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <DashboardHeader />
                    <DashboardStats />
                    <RecentActivity />
                </main>
            </div>
        </ProtectedRoute>
    );
}

function DashboardHeader() {
    const { user } = useAuth();

    return (
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome back, {user?.firstName}! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
                Ready to discover some delicious recipes today?
            </p>
        </div>
    );
}

function DashboardStats() {
    const stats = [
        {
            name: 'Saved Recipes',
            value: '24',
            icon: BookOpen,
            color: 'bg-blue-500',
            change: '+12%',
            trend: 'up'
        },
        {
            name: 'Favorites',
            value: '8',
            icon: Heart,
            color: 'bg-red-500',
            change: '+4.75%',
            trend: 'up'
        },
        {
            name: 'Cooking Time Saved',
            value: '2.4h',
            icon: Clock,
            color: 'bg-green-500',
            change: '+1.2h',
            trend: 'up'
        },
        {
            name: 'Average Rating',
            value: '4.8',
            icon: Star,
            color: 'bg-yellow-500',
            change: '+0.3',
            trend: 'up'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => (
                <div key={stat.name} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                {stat.name}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stat.value}
                            </p>
                        </div>
                        <div className={`p-3 rounded-lg ${stat.color}`}>
                            <stat.icon className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                            {stat.change}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                            this month
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function RecentActivity() {
    const quickActions = [
        {
            title: 'Generate New Recipe',
            description: 'Get AI-powered recipe suggestions based on your preferences',
            icon: ChefHat,
            href: '/recipes/generate',
            color: 'bg-gradient-to-r from-green-500 to-blue-600'
        },
        {
            title: 'Browse Recipes',
            description: 'Explore our collection of delicious recipes',
            icon: BookOpen,
            href: '/recipes',
            color: 'bg-gradient-to-r from-blue-500 to-purple-600'
        },
        {
            title: 'Search Ingredients',
            description: 'Find recipes based on ingredients you have',
            icon: Search,
            href: '/search',
            color: 'bg-gradient-to-r from-purple-500 to-pink-600'
        },
        {
            title: 'My Favorites',
            description: 'View your saved and favorite recipes',
            icon: Heart,
            href: '/favorites',
            color: 'bg-gradient-to-r from-red-500 to-orange-600'
        }
    ];

    const recentRecipes = [
        {
            id: 1,
            title: 'Spicy Thai Basil Chicken',
            description: 'A quick and flavorful dish perfect for busy weeknights',
            time: '25 mins',
            rating: 4.8,
            image: '🍗'
        },
        {
            id: 2,
            title: 'Mediterranean Chickpea Salad',
            description: 'Fresh, healthy, and perfect for meal prep',
            time: '15 mins',
            rating: 4.6,
            image: '🥗'
        },
        {
            id: 3,
            title: 'Creamy Mushroom Pasta',
            description: 'Comfort food at its finest with garlic cream sauce',
            time: '30 mins',
            rating: 4.9,
            image: '🍝'
        }
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {quickActions.map((action) => (
                        <a
                            key={action.title}
                            href={action.href}
                            className="group p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                        >
                            <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                <action.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {action.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {action.description}
                            </p>
                        </a>
                    ))}
                </div>
            </div>

            {/* Recent Recipes */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Recent Recipes
                    </h2>
                    <a
                        href="/recipes"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                        View all
                    </a>
                </div>
                <div className="space-y-4">
                    {recentRecipes.map((recipe) => (
                        <div
                            key={recipe.id}
                            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="text-2xl">
                                    {recipe.image}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {recipe.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {recipe.description}
                                    </p>
                                    <div className="flex items-center mt-2 space-x-4">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {recipe.time}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                            <Star className="w-3 h-3 mr-1 text-yellow-500" />
                                            {recipe.rating}
                                        </span>
                                    </div>
                                </div>
                                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 