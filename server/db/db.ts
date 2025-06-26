import pg from 'pg';
import { EventEmitter } from 'events';

// Database connection pool configuration
interface DatabaseConfig {
    connectionString: string;
    // Connection pool settings
    max: number;
    min: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    // Monitoring settings
    statement_timeout: number;
    query_timeout: number;
    // Health check settings
    healthCheckInterval: number;
}

// Production-ready database configuration
const dbConfig: DatabaseConfig = {
    connectionString: process.env.DATABASE_PUBLIC_URL || process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/smart-recipes',

    // Connection Pool Configuration
    max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum connections in pool
    min: parseInt(process.env.DB_POOL_MIN || '2'),  // Minimum connections to maintain
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 30 seconds
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'), // 2 seconds

    // Query Configuration
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'), // 30 seconds
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '25000'), // 25 seconds

    // Health Check Configuration
    healthCheckInterval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '60000'), // 1 minute
};

// Create database monitoring event emitter
export const dbMonitor = new EventEmitter();

// Connection pool with enhanced configuration
const pool = new pg.Pool({
    connectionString: dbConfig.connectionString,

    // Pool configuration
    max: dbConfig.max,
    min: dbConfig.min,
    idleTimeoutMillis: dbConfig.idleTimeoutMillis,
    connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,

    // SSL configuration
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false,
    } : false,

    // Query configuration
    statement_timeout: dbConfig.statement_timeout,
    query_timeout: dbConfig.query_timeout,
});

// Connection pool monitoring
pool.on('connect', (client) => {
    console.log('📊 Database: New client connected to pool');
    dbMonitor.emit('connect', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    });
});

pool.on('acquire', (client) => {
    console.log('📊 Database: Client acquired from pool');
    dbMonitor.emit('acquire', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    });
});

pool.on('release', (client) => {
    console.log('📊 Database: Client released back to pool');
    dbMonitor.emit('release', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    });
});

pool.on('remove', (client) => {
    console.log('📊 Database: Client removed from pool');
    dbMonitor.emit('remove', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    });
});

pool.on('error', (err, client) => {
    console.error('❌ Database Pool Error:', err);
    dbMonitor.emit('error', err);
});

// Enhanced database interface with monitoring
class DatabaseManager {
    private pool: pg.Pool;
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private isHealthy = true;
    private lastHealthCheck: Date | null = null;

    constructor(pool: pg.Pool) {
        this.pool = pool;
        this.startHealthChecks();
        this.setupGracefulShutdown();
    }

    // Execute query with monitoring
    async query(text: string, params?: any[]) {
        const start = Date.now();
        const client = await this.pool.connect();

        try {
            const result = await client.query(text, params);
            const duration = Date.now() - start;

            // Emit query performance metrics
            dbMonitor.emit('query', {
                duration,
                rowCount: result.rowCount,
                query: text.substring(0, 100) + (text.length > 100 ? '...' : '')
            });

            // Log slow queries (> 1 second)
            if (duration > 1000) {
                console.warn(`🐌 Slow query detected (${duration}ms): ${text.substring(0, 100)}...`);
            }

            return result;
        } catch (error) {
            console.error('❌ Database query error:', error);
            dbMonitor.emit('queryError', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Get pool statistics
    getPoolStats() {
        return {
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount,
            config: {
                max: dbConfig.max,
                min: dbConfig.min,
                idleTimeoutMillis: dbConfig.idleTimeoutMillis,
                connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
            },
            health: {
                isHealthy: this.isHealthy,
                lastHealthCheck: this.lastHealthCheck,
            }
        };
    }

    // Database health check
    async healthCheck(): Promise<boolean> {
        try {
            const start = Date.now();
            const result = await this.query('SELECT 1 as health_check, NOW() as current_time');
            const duration = Date.now() - start;

            this.isHealthy = result.rows.length > 0 && duration < 5000; // Healthy if responds within 5 seconds
            this.lastHealthCheck = new Date();

            console.log(`💚 Database health check: ${this.isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (${duration}ms)`);

            dbMonitor.emit('healthCheck', {
                isHealthy: this.isHealthy,
                duration,
                timestamp: this.lastHealthCheck
            });

            return this.isHealthy;
        } catch (error) {
            console.error('❌ Database health check failed:', error);
            this.isHealthy = false;
            this.lastHealthCheck = new Date();

            dbMonitor.emit('healthCheckFailed', error);
            return false;
        }
    }

    // Start periodic health checks
    private startHealthChecks() {
        // Immediate health check
        this.healthCheck();

        // Periodic health checks
        this.healthCheckInterval = setInterval(() => {
            this.healthCheck();
        }, dbConfig.healthCheckInterval);

        console.log(`💚 Database health checks started (interval: ${dbConfig.healthCheckInterval}ms)`);
    }

    // Graceful shutdown
    async shutdown() {
        console.log('📊 Database: Starting graceful shutdown...');

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        try {
            await this.pool.end();
            console.log('📊 Database: Pool closed successfully');
        } catch (error) {
            console.error('❌ Database: Error during shutdown:', error);
        }
    }

    // Setup process handlers for graceful shutdown
    private setupGracefulShutdown() {
        const gracefulShutdown = async (signal: string) => {
            console.log(`📊 Received ${signal}, shutting down database connections...`);
            await this.shutdown();
            process.exit(0);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
}

// Create database manager instance
const db = new DatabaseManager(pool);

// Initial connection test
db.healthCheck()
    .then((isHealthy) => {
        if (isHealthy) {
            console.log('✅ Database connected successfully with connection pooling');
        } else {
            console.error('❌ Database connection failed');
        }
    })
    .catch(err => {
        console.error('❌ Database connection error:', err);
    });

// Export database interface
export default db;
export { dbConfig, pool };