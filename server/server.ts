import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import { ClientError, errorMiddleware } from './lib/index';
import userRoutes from './routes/users';
import authRoutes from './routes/auth';
import recipeRoutes from './routes/recipes';
import preferencesRoutes from './routes/preferences';
import ingredientsRoutes from './routes/ingredients';
import searchRoutes from './routes/search';
import recommendationsRoutes from './routes/recommendations';
import migrationsRoutes from './routes/migrations';
import databaseRoutes from './routes/database';
import db from './db/db';

// Security and Rate Limiting Middleware
import { allSecurityMiddleware } from './middleware/security';
import {
  rateLimiters,
  slowDownLimiters,
  extractUserMiddleware,
  getRateLimitStatus,
  shutdownRateLimiting
} from './middleware/rateLimiting';

const app = express();

// Trust proxy headers for accurate IP detection behind load balancers
app.set('trust proxy', 1);

// Apply comprehensive security middleware first
app.use(allSecurityMiddleware);

// Parse JSON with size limit (redundant with security middleware, but explicit)
app.use(express.json({ limit: '10mb' }));

// Extract user information for rate limiting (should come after auth middleware when added)
app.use(extractUserMiddleware);

// Apply general rate limiting to all routes
app.use(rateLimiters.general);
app.use(slowDownLimiters.general);

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

// Basic health check endpoint (no rate limiting for monitoring)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rate limiting status endpoint
app.get('/api/rate-limit-status', getRateLimitStatus);

// Authentication routes with specific rate limiting
app.use('/api/auth', rateLimiters.auth, authRoutes);

// Search routes with search-specific rate limiting
app.use('/api/search', rateLimiters.search, searchRoutes);

// Admin/Database routes with strict rate limiting
app.use('/api/database', rateLimiters.admin, databaseRoutes);
app.use('/api/migrations', rateLimiters.admin, migrationsRoutes);

// Regular API routes with standard rate limiting (already applied globally)
app.use('/api/users', userRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/ingredients', ingredientsRoutes);
app.use('/api/recommendations', recommendationsRoutes);

// Future: AI recipe generation routes will use AI-specific rate limiting
// app.use('/api/ai', rateLimiters.ai, slowDownLimiters.ai, aiRoutes);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `API endpoint ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/db-test',
      'GET /api/rate-limit-status',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/users',
      'GET /api/recipes',
      'GET /api/preferences',
      'GET /api/ingredients',
      'GET /api/search',
      'GET /api/recommendations',
      'GET /api/database/health',
      'GET /api/migrations/status'
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
  console.log(`📊 Rate limits: http://localhost:${PORT}/api/rate-limit-status`);
  console.log(`🗄️  Database: http://localhost:${PORT}/api/db-test`);
  console.log('🛡️  Security middleware: CORS, Helmet, Rate Limiting, Input Sanitization');
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
      console.log('💾 Database connections closed');

      // Close rate limiting connections
      await shutdownRateLimiting();
      console.log('📊 Rate limiting connections closed');

      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('⏰ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default app;









