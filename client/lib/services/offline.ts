'use client';

import { Recipe } from '@/lib/types';

// Offline storage keys
const STORAGE_KEYS = {
    OFFLINE_RECIPES: 'smart_recipes_offline_recipes',
    PENDING_SYNC: 'smart_recipes_pending_sync',
    USER_PREFERENCES: 'smart_recipes_user_preferences',
    OFFLINE_FAVORITES: 'smart_recipes_offline_favorites',
    CACHED_SEARCHES: 'smart_recipes_cached_searches',
} as const;

// Types for offline data
interface OfflineRecipe extends Recipe {
    offlineId: string;
    cachedAt: number;
    lastAccessed: number;
}

interface PendingSyncItem {
    id: string;
    type: 'favorite' | 'unfavorite' | 'generate_recipe' | 'update_preferences';
    data: any;
    timestamp: number;
    retryCount: number;
}

interface CachedSearch {
    query: string;
    filters: any;
    results: Recipe[];
    timestamp: number;
}

class OfflineService {
    private isOnline: boolean = true;
    private syncInProgress: boolean = false;
    private listeners: Set<(isOnline: boolean) => void> = new Set();

    constructor() {
        if (typeof window !== 'undefined') {
            this.isOnline = navigator.onLine;
            this.setupNetworkListeners();
            this.setupPeriodicSync();
        }
    }

    private setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.notifyListeners();
            this.syncPendingChanges();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.notifyListeners();
        });
    }

    private setupPeriodicSync() {
        // Sync every 5 minutes when online
        setInterval(() => {
            if (this.isOnline && !this.syncInProgress) {
                this.syncPendingChanges();
            }
        }, 5 * 60 * 1000);
    }

    // Network status
    getNetworkStatus() {
        return {
            isOnline: this.isOnline,
            isSyncing: this.syncInProgress,
        };
    }

    onNetworkChange(listener: (isOnline: boolean) => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.isOnline));
    }

    // Recipe caching
    async cacheRecipe(recipe: Recipe): Promise<void> {
        try {
            const offlineRecipes = this.getOfflineRecipes();
            const offlineRecipe: OfflineRecipe = {
                ...recipe,
                offlineId: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                cachedAt: Date.now(),
                lastAccessed: Date.now(),
            };

            offlineRecipes.set(recipe.id.toString(), offlineRecipe);

            // Limit cache size to 100 recipes
            if (offlineRecipes.size > 100) {
                const sortedRecipes = Array.from(offlineRecipes.values())
                    .sort((a, b) => a.lastAccessed - b.lastAccessed);

                // Remove oldest 10 recipes
                for (let i = 0; i < 10; i++) {
                    offlineRecipes.delete(sortedRecipes[i].id.toString());
                }
            }

            localStorage.setItem(STORAGE_KEYS.OFFLINE_RECIPES, JSON.stringify(Array.from(offlineRecipes.entries())));
        } catch (error) {
            console.warn('Failed to cache recipe:', error);
        }
    }

    async getCachedRecipe(recipeId: string): Promise<OfflineRecipe | null> {
        try {
            const offlineRecipes = this.getOfflineRecipes();
            const recipe = offlineRecipes.get(recipeId);

            if (recipe) {
                // Update last accessed time
                recipe.lastAccessed = Date.now();
                offlineRecipes.set(recipeId, recipe);
                localStorage.setItem(STORAGE_KEYS.OFFLINE_RECIPES, JSON.stringify(Array.from(offlineRecipes.entries())));
                return recipe;
            }

            return null;
        } catch (error) {
            console.warn('Failed to get cached recipe:', error);
            return null;
        }
    }

    getCachedRecipes(): OfflineRecipe[] {
        try {
            const offlineRecipes = this.getOfflineRecipes();
            return Array.from(offlineRecipes.values())
                .sort((a, b) => b.lastAccessed - a.lastAccessed);
        } catch (error) {
            console.warn('Failed to get cached recipes:', error);
            return [];
        }
    }

    private getOfflineRecipes(): Map<string, OfflineRecipe> {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.OFFLINE_RECIPES);
            if (stored) {
                const entries = JSON.parse(stored);
                return new Map(entries);
            }
        } catch (error) {
            console.warn('Failed to parse offline recipes:', error);
        }
        return new Map();
    }

    // Search caching
    async cacheSearch(query: string, filters: any, results: Recipe[]): Promise<void> {
        try {
            const cachedSearches = this.getCachedSearches();
            const searchKey = `${query}_${JSON.stringify(filters)}`;

            cachedSearches.set(searchKey, {
                query,
                filters,
                results,
                timestamp: Date.now(),
            });

            // Limit cache size to 50 searches
            if (cachedSearches.size > 50) {
                const sortedSearches = Array.from(cachedSearches.values())
                    .sort((a, b) => a.timestamp - b.timestamp);

                // Remove oldest 10 searches
                for (let i = 0; i < 10; i++) {
                    const searchKey = `${sortedSearches[i].query}_${JSON.stringify(sortedSearches[i].filters)}`;
                    cachedSearches.delete(searchKey);
                }
            }

            localStorage.setItem(STORAGE_KEYS.CACHED_SEARCHES, JSON.stringify(Array.from(cachedSearches.entries())));
        } catch (error) {
            console.warn('Failed to cache search:', error);
        }
    }

    async getCachedSearch(query: string, filters: any): Promise<Recipe[] | null> {
        try {
            const cachedSearches = this.getCachedSearches();
            const searchKey = `${query}_${JSON.stringify(filters)}`;
            const cached = cachedSearches.get(searchKey);

            if (cached) {
                // Check if cache is still fresh (1 hour)
                const isExpired = Date.now() - cached.timestamp > 60 * 60 * 1000;
                if (!isExpired) {
                    return cached.results;
                } else {
                    cachedSearches.delete(searchKey);
                    localStorage.setItem(STORAGE_KEYS.CACHED_SEARCHES, JSON.stringify(Array.from(cachedSearches.entries())));
                }
            }

            return null;
        } catch (error) {
            console.warn('Failed to get cached search:', error);
            return null;
        }
    }

    private getCachedSearches(): Map<string, CachedSearch> {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.CACHED_SEARCHES);
            if (stored) {
                const entries = JSON.parse(stored);
                return new Map(entries);
            }
        } catch (error) {
            console.warn('Failed to parse cached searches:', error);
        }
        return new Map();
    }

    // Background sync for pending actions
    async addPendingSync(type: PendingSyncItem['type'], data: any): Promise<void> {
        try {
            const pending = this.getPendingSync();
            const item: PendingSyncItem = {
                id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type,
                data,
                timestamp: Date.now(),
                retryCount: 0,
            };

            pending.push(item);
            localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(pending));

            // Try to sync immediately if online
            if (this.isOnline) {
                this.syncPendingChanges();
            }
        } catch (error) {
            console.warn('Failed to add pending sync:', error);
        }
    }

    private getPendingSync(): PendingSyncItem[] {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Failed to parse pending sync:', error);
            return [];
        }
    }

    async syncPendingChanges(): Promise<void> {
        if (!this.isOnline || this.syncInProgress) return;

        this.syncInProgress = true;
        const pending = this.getPendingSync();

        if (pending.length === 0) {
            this.syncInProgress = false;
            return;
        }

        const remaining: PendingSyncItem[] = [];

        for (const item of pending) {
            try {
                await this.syncItem(item);
                // Successfully synced, don't add to remaining
            } catch (error) {
                console.warn('Failed to sync item:', error);

                // Increment retry count
                item.retryCount += 1;

                // Keep retrying up to 5 times
                if (item.retryCount < 5) {
                    remaining.push(item);
                } else {
                    console.error('Max retries reached for sync item:', item);
                }
            }
        }

        localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(remaining));
        this.syncInProgress = false;
    }

    private async syncItem(item: PendingSyncItem): Promise<void> {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        switch (item.type) {
            case 'favorite':
                await fetch(`${baseUrl}/api/recipes/${item.data.recipeId}/favorite`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                break;

            case 'unfavorite':
                await fetch(`${baseUrl}/api/recipes/${item.data.recipeId}/favorite`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                break;

            case 'generate_recipe':
                await fetch(`${baseUrl}/api/recipes/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                    body: JSON.stringify(item.data),
                });
                break;

            case 'update_preferences':
                await fetch(`${baseUrl}/api/user/preferences`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                    body: JSON.stringify(item.data),
                });
                break;

            default:
                throw new Error(`Unknown sync type: ${item.type}`);
        }
    }

    // Offline favorites management
    async addOfflineFavorite(recipeId: string): Promise<void> {
        try {
            const favorites = this.getOfflineFavorites();
            favorites.add(recipeId);
            localStorage.setItem(STORAGE_KEYS.OFFLINE_FAVORITES, JSON.stringify(Array.from(favorites)));

            // Add to pending sync
            await this.addPendingSync('favorite', { recipeId });
        } catch (error) {
            console.warn('Failed to add offline favorite:', error);
        }
    }

    async removeOfflineFavorite(recipeId: string): Promise<void> {
        try {
            const favorites = this.getOfflineFavorites();
            favorites.delete(recipeId);
            localStorage.setItem(STORAGE_KEYS.OFFLINE_FAVORITES, JSON.stringify(Array.from(favorites)));

            // Add to pending sync
            await this.addPendingSync('unfavorite', { recipeId });
        } catch (error) {
            console.warn('Failed to remove offline favorite:', error);
        }
    }

    isOfflineFavorite(recipeId: string): boolean {
        try {
            const favorites = this.getOfflineFavorites();
            return favorites.has(recipeId);
        } catch (error) {
            console.warn('Failed to check offline favorite:', error);
            return false;
        }
    }

    private getOfflineFavorites(): Set<string> {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.OFFLINE_FAVORITES);
            if (stored) {
                const array = JSON.parse(stored);
                return new Set(array);
            }
        } catch (error) {
            console.warn('Failed to parse offline favorites:', error);
        }
        return new Set();
    }

    // Storage management
    getStorageUsage(): { used: number; total: number; percentage: number } {
        try {
            let used = 0;
            for (const key in localStorage) {
                if (key.startsWith('smart_recipes_')) {
                    used += localStorage[key].length;
                }
            }

            // Estimate total storage (usually 5-10MB)
            const total = 5 * 1024 * 1024; // 5MB
            const percentage = (used / total) * 100;

            return { used, total, percentage };
        } catch (error) {
            console.warn('Failed to get storage usage:', error);
            return { used: 0, total: 5 * 1024 * 1024, percentage: 0 };
        }
    }

    async clearCache(): Promise<void> {
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
        } catch (error) {
            console.warn('Failed to clear cache:', error);
        }
    }
}

// Singleton instance
export const offlineService = new OfflineService();
export default offlineService; 