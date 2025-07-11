// Smart Recipes API Server - Updated deployment
// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

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
import securityRoutes from './routes/security';
import privacyRoutes from './routes/privacy';
import analyticsRoutes from './routes/analytics';
import db from './db/db';

// Security and Rate Limiting Middleware
import { allSecurityMiddleware } from './middleware/security';
import { enhancedSecurityMiddleware } from './middleware/enhanced-security';
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

// Apply enhanced security middleware first (includes HTTPS enforcement, security headers, etc.)
app.use(enhancedSecurityMiddleware);

// Apply comprehensive security middleware
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
    version: '1.0.0',
    security: {
      httpsEnforced: process.env.NODE_ENV === 'production',
      securityHeaders: true,
      rateLimiting: true,
      inputSanitization: true,
      auditLogging: true
    }
  });
});

// Security status endpoint
app.get('/api/security-status', (req, res) => {
  res.json({
    success: true,
    security: {
      environment: process.env.NODE_ENV,
      httpsEnforced: process.env.NODE_ENV === 'production',
      securityHeaders: {
        csp: true,
        hsts: true,
        xssProtection: true,
        noSniff: true,
        frameOptions: true
      },
      rateLimiting: {
        enabled: true,
        redis: !!process.env.REDIS_URL
      },
      monitoring: {
        auditLogging: true,
        securityEvents: true,
        requestTracing: true
      },
      compliance: {
        gdprReady: false, // Will be implemented in subtask 16.4
        dataEncryption: true,
        accessControls: true
      }
    },
    timestamp: new Date().toISOString()
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

// Security monitoring routes with admin rate limiting
app.use('/api/security', rateLimiters.admin, securityRoutes);

// Privacy and GDPR compliance routes with admin rate limiting
app.use('/api/privacy', rateLimiters.admin, privacyRoutes);

// Regular API routes with standard rate limiting (already applied globally)
app.use('/api/users', userRoutes);
app.use('/api/users', preferencesRoutes); // Mount preferences under /api/users for /users/:userId/preferences
app.use('/api/recipes', recipeRoutes);
app.use('/api/ingredients', ingredientsRoutes);
app.use('/api/recommendations', recommendationsRoutes);

// Analytics routes with standard rate limiting
app.use('/api/analytics', analyticsRoutes);

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
      'GET /api/security-status',
      'GET /api/db-test',
      'GET /api/rate-limit-status',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/users',
      'POST /api/users/:userId/preferences',
      'GET /api/users/:userId/preferences',
      'GET /api/recipes',
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
  console.log(`🛡️  Security status: http://localhost:${PORT}/api/security-status`);
  console.log(`📊 Rate limits: http://localhost:${PORT}/api/rate-limit-status`);
  console.log(`🗄️  Database: http://localhost:${PORT}/api/db-test`);
  console.log('🛡️  Enhanced Security: HTTPS enforcement, CSP nonces, security monitoring');
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









