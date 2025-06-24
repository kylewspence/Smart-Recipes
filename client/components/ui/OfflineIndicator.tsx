'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    WifiIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { cn, touchOptimized } from '@/lib/utils/responsive';
import { offlineService } from '@/lib/services/offline';

interface OfflineIndicatorProps {
    className?: string;
    position?: 'top' | 'bottom';
    showWhenOnline?: boolean;
}

export function OfflineIndicator({
    className,
    position = 'top',
    showWhenOnline = false
}: OfflineIndicatorProps) {
    const [networkStatus, setNetworkStatus] = useState(offlineService.getNetworkStatus());
    const [showIndicator, setShowIndicator] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    useEffect(() => {
        // Update network status
        const updateStatus = () => {
            setNetworkStatus(offlineService.getNetworkStatus());
        };

        // Listen for network changes
        const unsubscribe = offlineService.onNetworkChange((isOnline) => {
            updateStatus();

            if (isOnline) {
                setLastSyncTime(new Date());
                // Show success briefly when coming back online
                setShowIndicator(true);
                setTimeout(() => {
                    if (!showWhenOnline) {
                        setShowIndicator(false);
                    }
                }, 3000);
            } else {
                setShowIndicator(true);
            }
        });

        // Initial check
        updateStatus();
        setShowIndicator(!networkStatus.isOnline || showWhenOnline);

        return () => {
            unsubscribe();
        };
    }, [showWhenOnline, networkStatus.isOnline]);

    const getIndicatorContent = () => {
        if (!networkStatus.isOnline) {
            return {
                icon: ExclamationTriangleIcon,
                text: 'You\'re offline',
                subtext: 'Some features may be limited',
                color: 'bg-orange-500',
                textColor: 'text-white',
            };
        }

        if (networkStatus.isSyncing) {
            return {
                icon: ArrowPathIcon,
                text: 'Syncing...',
                subtext: 'Updating your data',
                color: 'bg-blue-500',
                textColor: 'text-white',
                animate: true,
            };
        }

        if (lastSyncTime && showWhenOnline) {
            return {
                icon: CheckCircleIcon,
                text: 'You\'re online',
                subtext: `Last synced ${lastSyncTime.toLocaleTimeString()}`,
                color: 'bg-green-500',
                textColor: 'text-white',
            };
        }

        return null;
    };

    const content = getIndicatorContent();

    if (!content || !showIndicator) {
        return null;
    }

    const Icon = content.icon;

    return (
        <AnimatePresence>
            <motion.div
                initial={{
                    y: position === 'top' ? -100 : 100,
                    opacity: 0
                }}
                animate={{
                    y: 0,
                    opacity: 1
                }}
                exit={{
                    y: position === 'top' ? -100 : 100,
                    opacity: 0
                }}
                transition={{
                    type: 'spring',
                    damping: 25,
                    stiffness: 200
                }}
                className={cn(
                    'fixed left-4 right-4 z-50 mx-auto max-w-sm',
                    position === 'top' ? 'top-4 pt-safe-top' : 'bottom-4 pb-safe-bottom',
                    className
                )}
            >
                <div className={cn(
                    'flex items-center space-x-3 rounded-lg px-4 py-3 shadow-lg',
                    content.color,
                    content.textColor,
                    touchOptimized.scroll.momentum
                )}>
                    <Icon
                        className={cn(
                            'h-5 w-5 flex-shrink-0',
                            content.animate && 'animate-spin'
                        )}
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                            {content.text}
                        </p>
                        {content.subtext && (
                            <p className="text-xs opacity-90 truncate">
                                {content.subtext}
                            </p>
                        )}
                    </div>

                    {/* Dismiss button for online indicator */}
                    {networkStatus.isOnline && showWhenOnline && (
                        <button
                            onClick={() => setShowIndicator(false)}
                            className={cn(
                                'flex-shrink-0 rounded-full p-1',
                                'hover:bg-white/20 transition-colors',
                                touchOptimized.button.icon
                            )}
                            aria-label="Dismiss"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// Hook for network status
export function useNetworkStatus() {
    const [networkStatus, setNetworkStatus] = useState(offlineService.getNetworkStatus());

    useEffect(() => {
        const updateStatus = () => {
            setNetworkStatus(offlineService.getNetworkStatus());
        };

        const unsubscribe = offlineService.onNetworkChange(updateStatus);
        updateStatus();

        return () => {
            unsubscribe();
        };
    }, []);

    return networkStatus;
}

// Hook for offline capabilities
export function useOfflineCapabilities() {
    const networkStatus = useNetworkStatus();

    const cacheRecipe = async (recipe: any) => {
        await offlineService.cacheRecipe(recipe);
    };

    const getCachedRecipe = async (recipeId: string) => {
        return await offlineService.getCachedRecipe(recipeId);
    };

    const getCachedRecipes = () => {
        return offlineService.getCachedRecipes();
    };

    const addOfflineFavorite = async (recipeId: string) => {
        await offlineService.addOfflineFavorite(recipeId);
    };

    const removeOfflineFavorite = async (recipeId: string) => {
        await offlineService.removeOfflineFavorite(recipeId);
    };

    const isOfflineFavorite = (recipeId: string) => {
        return offlineService.isOfflineFavorite(recipeId);
    };

    const getStorageUsage = () => {
        return offlineService.getStorageUsage();
    };

    const clearCache = async () => {
        await offlineService.clearCache();
    };

    return {
        ...networkStatus,
        cacheRecipe,
        getCachedRecipe,
        getCachedRecipes,
        addOfflineFavorite,
        removeOfflineFavorite,
        isOfflineFavorite,
        getStorageUsage,
        clearCache,
    };
}

export default OfflineIndicator; 