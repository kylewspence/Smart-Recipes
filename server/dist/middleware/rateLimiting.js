import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import Redis from 'ioredis';
// Redis client for distributed rate limiting (optional, falls back to memory)
let redisClient = null;
try {
    if (process.env.REDIS_URL) {
        redisClient = new Redis(process.env.REDIS_URL);
        console.log('✅ Redis connected for distributed rate limiting');
    }
    else {
        console.log('📝 Using memory-based rate limiting (Redis not configured)');
    }
}
catch (error) {
    console.warn('⚠️ Redis connection failed, falling back to memory-based rate limiting:', error);
    redisClient = null;
}
// Custom key generator that considers user authentication
const generateKeyGenerator = (prefix) => {
    return (req) => {
        // Use user ID if authenticated, otherwise IP address
        const userId = req.user?.userId;
        const identifier = userId ? `user:${userId}` : `ip:${req.ip}`;
        return `${prefix}:${identifier}`;
    };
};
// Custom skip function for authenticated users (higher limits)
const skipAuthenticated = (req) => {
    return !!req.user?.id; // Skip rate limit if user is authenticated
};
// Rate limit configurations
const rateLimitConfigs = {
    // General API rate limiting - affects all endpoints
    general: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: (req) => {
            // Higher limits for authenticated users
            return req.user?.userId ? 1000 : 100; // 1000/15min for auth, 100/15min for anonymous
        },
        message: {
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: generateKeyGenerator('general'),
        // Use Redis store if available
        ...(redisClient && {
            store: new (require('rate-limit-redis'))({
                client: redisClient,
                prefix: 'rl:general:'
            })
        })
    }),
    // Authentication endpoints - stricter limits
    auth: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // 10 attempts per 15 minutes regardless of authentication
        message: {
            error: 'Too many authentication attempts',
            message: 'Too many login/register attempts. Please try again later.',
            retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: generateKeyGenerator('auth'),
        ...(redisClient && {
            store: new (require('rate-limit-redis'))({
                client: redisClient,
                prefix: 'rl:auth:'
            })
        })
    }),
    // AI generation endpoints - very strict limits due to cost
    ai: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: (req) => {
            // Different limits based on user tier (could be expanded)
            return req.user?.userId ? 50 : 5; // 50/hour for auth, 5/hour for anonymous
        },
        message: {
            error: 'AI generation rate limit exceeded',
            message: 'You have exceeded the AI recipe generation limit. Please upgrade your plan or try again later.',
            retryAfter: '1 hour'
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: generateKeyGenerator('ai'),
        ...(redisClient && {
            store: new (require('rate-limit-redis'))({
                client: redisClient,
                prefix: 'rl:ai:'
            })
        })
    }),
    // Search endpoints - moderate limits
    search: rateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: (req) => {
            return req.user?.userId ? 200 : 50; // 200/5min for auth, 50/5min for anonymous
        },
        message: {
            error: 'Search rate limit exceeded',
            message: 'Too many search requests. Please slow down.',
            retryAfter: '5 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: generateKeyGenerator('search'),
        ...(redisClient && {
            store: new (require('rate-limit-redis'))({
                client: redisClient,
                prefix: 'rl:search:'
            })
        })
    }),
    // Database monitoring endpoints - admin only, very strict
    admin: rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 30, // 30 requests per minute
        message: {
            error: 'Admin endpoint rate limit exceeded',
            message: 'Too many admin requests. Please slow down.',
            retryAfter: '1 minute'
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: generateKeyGenerator('admin'),
        ...(redisClient && {
            store: new (require('rate-limit-redis'))({
                client: redisClient,
                prefix: 'rl:admin:'
            })
        })
    })
};
// Slow down middleware for progressive delays
const slowDownConfigs = {
    // General slow down - adds delays after hitting certain thresholds
    general: slowDown({
        windowMs: 15 * 60 * 1000, // 15 minutes
        delayAfter: (req) => {
            return req.user?.userId ? 500 : 50; // Higher threshold for authenticated users
        },
        delayMs: 500, // Add 500ms delay per request after threshold
        maxDelayMs: 20000, // Maximum delay of 20 seconds
        keyGenerator: generateKeyGenerator('slowdown'),
        ...(redisClient && {
            store: new (require('express-slow-down/redis'))({
                client: redisClient,
                prefix: 'sd:general:'
            })
        })
    }),
    // AI endpoints get more aggressive slow down
    ai: slowDown({
        windowMs: 60 * 60 * 1000, // 1 hour
        delayAfter: (req) => {
            return req.user?.userId ? 25 : 3; // Start slowing down before rate limit
        },
        delayMs: 2000, // 2 second delay per request
        maxDelayMs: 60000, // Maximum delay of 1 minute
        keyGenerator: generateKeyGenerator('ai-slowdown'),
        ...(redisClient && {
            store: new (require('express-slow-down/redis'))({
                client: redisClient,
                prefix: 'sd:ai:'
            })
        })
    })
};
// Custom middleware to extract user info for rate limiting
export const extractUserMiddleware = (req, res, next) => {
    // This middleware should run after authentication to extract user info
    // The authentication middleware should have already set req.user if authenticated
    // Ensure IP is set (don't try to modify req.ip directly)
    if (!req.ip) {
        // TypeScript doesn't allow modifying req.ip, so we'll work with what we have
        // The rate limiter will use req.ip automatically
    }
    next();
};
// Export configured rate limiters
export const rateLimiters = rateLimitConfigs;
export const slowDownLimiters = slowDownConfigs;
// Helper function to apply multiple rate limiters
export const applyRateLimiting = (...limiters) => {
    return limiters;
};
// Rate limiting status endpoint
export const getRateLimitStatus = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const identifier = userId ? `user:${userId}` : `ip:${req.ip}`;
        const status = {
            identifier: userId ? `user:${userId}` : `anonymous:${req.ip}`,
            limits: {
                general: { window: '15 minutes', max: userId ? 1000 : 100 },
                auth: { window: '15 minutes', max: 10 },
                ai: { window: '1 hour', max: userId ? 50 : 5 },
                search: { window: '5 minutes', max: userId ? 200 : 50 }
            },
            redis: !!redisClient
        };
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get rate limit status',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
// Graceful shutdown for Redis
export const shutdownRateLimiting = async () => {
    if (redisClient) {
        console.log('📊 Shutting down Redis connection for rate limiting...');
        await redisClient.quit();
    }
};
