import pg from 'pg';

// Create a database connection pool
const db = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false,
    } : false // No SSL for local development
});

// Test the database connection
db.query('SELECT NOW()')
    .then(() => console.log('Database connected successfully'))
    .catch(err => console.error('Database connection error:', err));

export default db;