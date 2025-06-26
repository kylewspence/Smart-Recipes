import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ClientError, errorMiddleware } from './lib/index';
import userRoutes from './routes/users';
import authRoutes from './routes/auth';
import recipeRoutes from './routes/recipes';
import preferencesRoutes from './routes/preferences';
import ingredientsRoutes from './routes/ingredients';
import searchRoutes from './routes/search';
import recommendationsRoutes from './routes/recommendations';
import databaseRoutes from './routes/database';
import db from './db/db';

const app = express();

// Trust proxy headers for accurate IP detection behind load balancers
app.set('trust proxy', 1);

// Basic security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Manual CORS middleware for better control
app.use((req, res, next) => {
    const allowedOrigins = process.env.NODE_ENV === 'production'
        ? [
            'https://smart-recipes.vercel.app',
            'https://smart-recipes-nine.vercel.app',
            'https://smart-recipes-preview.vercel.app'
        ]
        : ['http://localhost:3000', 'http://localhost:3003'];

    const origin = req.headers.origin;

    // Allow any .vercel.app domain in production
    if (process.env.NODE_ENV === 'production' && origin && origin.includes('.vercel.app')) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    next();
});

// Parse JSON with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Test database connection
app.get('/api/db-test', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW() as current_time, version() as postgres_version');
        res.json({
            success: true,
            message: 'Database connected successfully!',
            data: result.rows[0],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Database connection test failed:', error);
        res.status(500).json({
            success: false,
            error: 'Database connection failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users', preferencesRoutes); // Mount preferences under /api/users for /users/:userId/preferences
app.use('/api/recipes', recipeRoutes);
app.use('/api/ingredients', ingredientsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/database', databaseRoutes);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `API endpoint ${req.method} ${req.originalUrl} not found`,
        availableEndpoints: [
            'GET /api/health',
            'GET /api/db-test',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/users',
            'POST /api/users/:userId/preferences',
            'GET /api/users/:userId/preferences',
            'GET /api/recipes',
            'GET /api/ingredients',
            'GET /api/search',
            'GET /api/recommendations',
            'GET /api/database/health'
        ]
    });
});

// Global error handling middleware (must be last)
app.use(errorMiddleware);

// Server startup
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
    console.log('🚀 Smart Recipes API Server started successfully!');
    console.log(`📡 Server listening on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🗄️  Database: http://localhost:${PORT}/api/db-test`);
    console.log('📋 Available endpoints: http://localhost:' + PORT + '/api/*');
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
        console.log('🔌 HTTP server closed');

        try {
            // Close database connections
            await db.shutdown();
            console.log('🗄️  Database connections closed');
        } catch (error) {
            console.error('❌ Error closing database connections:', error);
        }

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app; 