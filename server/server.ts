import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import { ClientError, errorMiddleware } from './lib/index';
import userRoutes from './routes/users';
import authRoutes from './routes/auth';
import recipeRoutes from './routes/recipes';
import db from './db/db';

const app = express();
app.use(express.json());

// Test database connection
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as current_time, version() as postgres_version');
    res.json({
      success: true,
      message: 'Database connected successfully!',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test if your tables exist
app.get('/api/tables-test', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    res.json({
      success: true,
      tables: result.rows.map(row => row.table_name)
    });
  } catch (error) {
    console.error('Tables test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/test', async (req, res) => {
  res.send('Hello, world!');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/recipes', recipeRoutes);

// Error handling middleware
app.use(errorMiddleware);

app.listen(process.env.PORT, () => {
  console.log(`express server listening on port ${process.env.PORT}`);
});









