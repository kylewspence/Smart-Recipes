'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Plus,
    Heart,
    Clock,
    ChefHat,
    BookOpen,
    Settings,
    User,
    Command,
    ArrowRight,
    Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn, responsive } from '@/lib/utils/responsive';
import { MagicCard, ShimmerButton } from '@/components/magicui';

interface QuickAction {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
    shortcut?: string;
    category: 'recipe' | 'search' | 'profile' | 'settings';
    gradient: string;
}

interface QuickActionsProps {
    className?: string;
    showCommandPalette?: boolean;
    compact?: boolean;
}

export default function QuickActions({
    className,
    showCommandPalette = true,
    compact = false
}: QuickActionsProps) {
    const router = useRouter();
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredActions, setFilteredActions] = useState<QuickAction[]>([]);

    const quickActions: QuickAction[] = [
        {
            id: 'generate-recipe',
            title: 'Generate Recipe',
            description: 'Create a new AI-powered recipe',
            icon: Plus,
            action: () => router.push('/generate'),
            shortcut: 'Ctrl+N',
            category: 'recipe',
            gradient: 'linear-gradient(45deg, #f97316, #ea580c)'
        },
        {
            id: 'search-recipes',
            title: 'Search Recipes',
            description: 'Find recipes by ingredients or cuisine',
            icon: Search,
            action: () => router.push('/search'),
            shortcut: 'Ctrl+K',
            category: 'search',
            gradient: 'linear-gradient(45deg, #3b82f6, #1d4ed8)'
        },
        {
            id: 'favorites',
            title: 'My Favorites',
            description: 'View your saved recipes',
            icon: Heart,
            action: () => router.push('/favorites'),
            shortcut: 'Ctrl+F',
            category: 'recipe',
            gradient: 'linear-gradient(45deg, #ef4444, #dc2626)'
        },
        {
            id: 'cooking-timer',
            title: 'Cooking Timer',
            description: 'Set timers for your cooking',
            icon: Clock,
            action: () => router.push('/timer'),
            shortcut: 'Ctrl+T',
            category: 'recipe',
            gradient: 'linear-gradient(45deg, #10b981, #059669)'
        },
        {
            id: 'recipe-book',
            title: 'Recipe Book',
            description: 'Browse all your recipes',
            icon: BookOpen,
            action: () => router.push('/my-recipes'),
            shortcut: 'Ctrl+B',
            category: 'recipe',
            gradient: 'linear-gradient(45deg, #8b5cf6, #7c3aed)'
        },
        {
            id: 'quick-meal',
            title: 'Quick Meal Ideas',
            description: 'Find recipes under 30 minutes',
            icon: Zap,
            action: () => router.push('/search?maxCookingTime=30'),
            shortcut: 'Ctrl+Q',
            category: 'search',
            gradient: 'linear-gradient(45deg, #f59e0b, #d97706)'
        },
        {
            id: 'profile',
            title: 'Profile Settings',
            description: 'Manage your account and preferences',
            icon: User,
            action: () => router.push('/profile'),
            shortcut: 'Ctrl+P',
            category: 'profile',
            gradient: 'linear-gradient(45deg, #06b6d4, #0891b2)'
        },
        {
            id: 'settings',
            title: 'App Settings',
            description: 'Configure app preferences',
            icon: Settings,
            action: () => router.push('/settings'),
            shortcut: 'Ctrl+,',
            category: 'settings',
            gradient: 'linear-gradient(45deg, #6b7280, #4b5563)'
        }
    ];

    // Filter actions based on search query
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredActions(quickActions);
        } else {
            const filtered = quickActions.filter(action =>
                action.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                action.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredActions(filtered);
        }
    }, [searchQuery]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Command palette toggle
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                setIsCommandPaletteOpen(true);
                return;
            }

            // Close command palette on escape
            if (event.key === 'Escape') {
                setIsCommandPaletteOpen(false);
                setSearchQuery('');
                return;
            }

            // Individual shortcuts
            if (event.ctrlKey || event.metaKey) {
                const action = quickActions.find(a => {
                    const shortcut = a.shortcut?.toLowerCase();
                    const key = event.key.toLowerCase();
                    return shortcut?.includes(key);
                });

                if (action) {
                    event.preventDefault();
                    action.action();
                    setIsCommandPaletteOpen(false);
                }
            }
        };

        if (showCommandPalette) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [showCommandPalette, quickActions]);

    const handleActionClick = useCallback((action: QuickAction) => {
        action.action();
        setIsCommandPaletteOpen(false);
        setSearchQuery('');
    }, []);

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'recipe': return ChefHat;
            case 'search': return Search;
            case 'profile': return User;
            case 'settings': return Settings;
            default: return ChefHat;
        }
    };

    const groupedActions = filteredActions.reduce((acc, action) => {
        if (!acc[action.category]) {
            acc[action.category] = [];
        }
        acc[action.category].push(action);
        return acc;
    }, {} as Record<string, QuickAction[]>);

    if (compact) {
        return (
            <div className={cn("flex flex-wrap gap-2", className)}>
                {quickActions.slice(0, 4).map((action) => (
                    <button
                        key={action.id}
                        onClick={() => handleActionClick(action)}
                        className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title={action.description}
                    >
                        <action.icon className="w-4 h-4" />
                        <span>{action.title}</span>
                    </button>
                ))}
                {showCommandPalette && (
                    <button
                        onClick={() => setIsCommandPaletteOpen(true)}
                        className="flex items-center space-x-2 px-3 py-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                    >
                        <Command className="w-4 h-4" />
                        <span>More</span>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={cn("space-y-6", className)}>
            {/* Quick Action Grid */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Quick Actions
                    </h3>
                    {showCommandPalette && (
                        <button
                            onClick={() => setIsCommandPaletteOpen(true)}
                            className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <Command className="w-4 h-4" />
                            <span>Press Ctrl+K</span>
                        </button>
                    )}
                </div>

                <div className={responsive.grid.cards}>
                    {quickActions.slice(0, 6).map((action, index) => (
                        <motion.div
                            key={action.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <MagicCard
                                className="p-4 cursor-pointer hover:scale-105 transition-transform group"
                                onClick={() => handleActionClick(action)}
                                gradientColor={action.gradient.match(/#[a-fA-F0-9]{6}/)?.[0] || '#3b82f6'}
                                gradientOpacity={0.1}
                            >
                                <div className="flex items-center space-x-3">
                                    <div
                                        className="p-2 rounded-lg"
                                        style={{ background: action.gradient }}
                                    >
                                        <action.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                                            {action.title}
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                            {action.description}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                                </div>
                            </MagicCard>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Command Palette */}
            <AnimatePresence>
                {isCommandPaletteOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsCommandPaletteOpen(false)}
                    >
                        <div className="flex items-start justify-center pt-20 px-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                                className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Search Input */}
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search actions..."
                                            className="w-full pl-10 pr-4 py-3 bg-transparent border-none outline-none text-lg text-gray-900 dark:text-white placeholder-gray-500"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Actions List */}
                                <div className="max-h-96 overflow-y-auto">
                                    {Object.entries(groupedActions).map(([category, actions]) => {
                                        const CategoryIcon = getCategoryIcon(category);
                                        return (
                                            <div key={category} className="p-2">
                                                <div className="flex items-center space-x-2 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                    <CategoryIcon className="w-4 h-4" />
                                                    <span>{category}</span>
                                                </div>
                                                {actions.map((action) => (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => handleActionClick(action)}
                                                        className="w-full flex items-center justify-between px-3 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
                                                    >
                                                        <div className="flex items-center space-x-3">
                                                            <action.icon className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                                                            <div className="text-left">
                                                                <div className="font-medium text-gray-900 dark:text-white">
                                                                    {action.title}
                                                                </div>
                                                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                                                    {action.description}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {action.shortcut && (
                                                            <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                                                {action.shortcut}
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Footer */}
                                <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
                                    <p className="text-xs text-gray-500">
                                        Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Esc</kbd> to close
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
} 