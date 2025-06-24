import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

// In-memory cache implementation
class MemoryCache {
    private cache = new Map<string, { data: any; expiry: number; hits: number }>();
    private maxSize: number;
    private defaultTTL: number;

    constructor(maxSize = 1000, defaultTTL = 300000) { // 5 minutes default
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
    }

    set(key: string, value: any, ttl?: number): void {
        // Implement LRU eviction if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        const expiry = Date.now() + (ttl || this.defaultTTL);
        this.cache.set(key, { data: value, expiry, hits: 0 });
    }

    get(key: string): any | null {
        const item = this.cache.get(key);

        if (!item) {
            return null;
        }

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        // Update hit count and move to end (LRU)
        item.hits++;
        this.cache.delete(key);
        this.cache.set(key, item);

        return item.data;
    }

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    has(key: string): boolean {
        const item = this.cache.get(key);
        if (!item) return false;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    size(): number {
        return this.cache.size;
    }

    getStats(): { size: number; maxSize: number; hitRate: number } {
        const items = Array.from(this.cache.values());
        const totalHits = items.reduce((sum, item) => sum + item.hits, 0);
        const hitRate = items.length > 0 ? totalHits / items.length : 0;

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate,
        };
    }

    // Clean up expired entries
    cleanup(): void {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
    }
}

// Global cache instances
const responseCache = new MemoryCache(500, 300000); // 5 minutes for responses
const dataCache = new MemoryCache(1000, 600000);   // 10 minutes for data
const userCache = new MemoryCache(200, 900000);    // 15 minutes for user data

// Cache key generators
function generateCacheKey(req: Request, prefix: string = ''): string {
    const url = req.originalUrl || req.url;
    const method = req.method;
    const userId = (req as any).user?.id || 'anonymous';
    const query = JSON.stringify(req.query);
    const body = req.method === 'POST' ? JSON.stringify(req.body) : '';

    const keyString = `${prefix}:${method}:${url}:${userId}:${query}:${body}`;
    return createHash('md5').update(keyString).digest('hex');
}

function generateDataKey(identifier: string, ...params: any[]): string {
    const keyString = `${identifier}:${params.join(':')}`;
    return createHash('md5').update(keyString).digest('hex');
}

// Caching middleware
export function cacheResponse(ttl?: number, keyPrefix?: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        // Skip caching for non-GET requests by default
        if (req.method !== 'GET') {
            return next();
        }

        const cacheKey = generateCacheKey(req, keyPrefix);
        const cachedResponse = responseCache.get(cacheKey);

        if (cachedResponse) {
            res.set('X-Cache', 'HIT');
            res.set('X-Cache-Key', cacheKey);
            return res.status(cachedResponse.status).json(cachedResponse.data);
        }

        // Override res.json to cache the response
        const originalJson = res.json;
        res.json = function (data: any) {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                responseCache.set(cacheKey, {
                    status: res.statusCode,
                    data,
                }, ttl);
            }

            res.set('X-Cache', 'MISS');
            res.set('X-Cache-Key', cacheKey);
            return originalJson.call(this, data);
        };

        next();
    };
}

// User-specific caching
export function cacheUserData(ttl?: number) {
    return (req: Request, res: Response, next: NextFunction) => {
        const userId = (req as any).user?.id;
        if (!userId) {
            return next();
        }

        const cacheKey = generateCacheKey(req, `user:${userId}`);
        const cachedResponse = userCache.get(cacheKey);

        if (cachedResponse) {
            res.set('X-Cache', 'HIT');
            return res.status(cachedResponse.status).json(cachedResponse.data);
        }

        const originalJson = res.json;
        res.json = function (data: any) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                userCache.set(cacheKey, {
                    status: res.statusCode,
                    data,
                }, ttl);
            }

            res.set('X-Cache', 'MISS');
            return originalJson.call(this, data);
        };

        next();
    };
}

// Cache invalidation middleware
export function invalidateCache(patterns: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const originalJson = res.json;
        res.json = function (data: any) {
            // Only invalidate on successful operations
            if (res.statusCode >= 200 && res.statusCode < 300) {
                patterns.forEach(pattern => {
                    invalidateCachePattern(pattern, req);
                });
            }

            return originalJson.call(this, data);
        };

        next();
    };
}

// Cache invalidation helpers
function invalidateCachePattern(pattern: string, req: Request): void {
    const userId = (req as any).user?.id;

    // Simple pattern matching for cache invalidation
    if (pattern.includes('user') && userId) {
        // Invalidate all user-specific cache entries
        for (const key of userCache['cache'].keys()) {
            if (key.includes(`user:${userId}`)) {
                userCache.delete(key);
            }
        }
    }

    if (pattern.includes('recipes')) {
        // Invalidate recipe-related cache entries
        for (const key of responseCache['cache'].keys()) {
            if (key.includes('recipes')) {
                responseCache.delete(key);
            }
        }
    }

    if (pattern.includes('search')) {
        // Invalidate search-related cache entries
        for (const key of responseCache['cache'].keys()) {
            if (key.includes('search')) {
                responseCache.delete(key);
            }
        }
    }
}

// Data layer caching utilities
export const dataCache = {
    set: (key: string, value: any, ttl?: number) => {
        const cacheKey = generateDataKey(key);
        dataCache.set(cacheKey, value, ttl);
    },

    get: (key: string) => {
        const cacheKey = generateDataKey(key);
        return dataCache.get(cacheKey);
    },

    delete: (key: string) => {
        const cacheKey = generateDataKey(key);
        return dataCache.delete(cacheKey);
    },

    has: (key: string) => {
        const cacheKey = generateDataKey(key);
        return dataCache.has(cacheKey);
    },

    // Cached database query wrapper
    query: async <T>(key: string, queryFn: () => Promise<T>, ttl?: number): Promise<T> => {
        const cacheKey = generateDataKey(key);
        const cached = dataCache.get(cacheKey);

        if (cached !== null) {
            return cached;
        }

        const result = await queryFn();
        dataCache.set(cacheKey, result, ttl);
        return result;
    },
};

// Cache warming utilities
export async function warmCache() {
    // Warm up frequently accessed data
    // This would typically include popular recipes, common search results, etc.
    console.log('Cache warming initiated...');

    // Example: Pre-load popular recipes
    // const popularRecipes = await getPopularRecipes();
    // dataCache.set('popular_recipes', popularRecipes, 3600000); // 1 hour

    console.log('Cache warming completed');
}

// Cache monitoring and metrics
export function getCacheMetrics() {
    return {
        responseCache: responseCache.getStats(),
        dataCache: dataCache.getStats(),
        userCache: userCache.getStats(),
    };
}

// Cache cleanup job
export function setupCacheCleanup() {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
        responseCache.cleanup();
        dataCache.cleanup();
        userCache.cleanup();
    }, 300000);
}

// HTTP caching headers
export function setHttpCacheHeaders(maxAge: number = 300, isPrivate: boolean = false) {
    return (req: Request, res: Response, next: NextFunction) => {
        const cacheControl = isPrivate ? 'private' : 'public';
        res.set({
            'Cache-Control': `${cacheControl}, max-age=${maxAge}`,
            'ETag': generateCacheKey(req),
            'Vary': 'Accept-Encoding, Authorization',
        });

        // Handle conditional requests
        const ifNoneMatch = req.get('If-None-Match');
        const etag = res.get('ETag');

        if (ifNoneMatch && ifNoneMatch === etag) {
            return res.status(304).end();
        }

        next();
    };
}

// Compression middleware integration
export function shouldCompress(req: Request, res: Response): boolean {
    // Don't compress if caching is disabled
    if (res.get('Cache-Control')?.includes('no-cache')) {
        return false;
    }

    // Don't compress small responses
    const contentLength = parseInt(res.get('Content-Length') || '0');
    if (contentLength > 0 && contentLength < 1024) {
        return false;
    }

    return true;
}

// Export cache instances for direct use
export { responseCache, userCache };

// Cache configuration
export const cacheConfig = {
    // Recipe caching
    recipes: {
        list: { ttl: 600000, pattern: 'recipes' },      // 10 minutes
        detail: { ttl: 1800000, pattern: 'recipes' },   // 30 minutes
        search: { ttl: 300000, pattern: 'search' },     // 5 minutes
        generate: { ttl: 0, pattern: null },            // No caching for generation
    },

    // User data caching
    user: {
        profile: { ttl: 900000, pattern: 'user' },      // 15 minutes
        preferences: { ttl: 1800000, pattern: 'user' }, // 30 minutes
        favorites: { ttl: 300000, pattern: 'user' },    // 5 minutes
    },

    // Static data caching
    static: {
        ingredients: { ttl: 3600000, pattern: null },   // 1 hour
        cuisines: { ttl: 3600000, pattern: null },      // 1 hour
        categories: { ttl: 3600000, pattern: null },    // 1 hour
    },
}; 