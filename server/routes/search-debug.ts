import express from 'express';
import db from '../db/db';

const router = express.Router();

// Simple debug search endpoint
router.get('/debug', async (req, res, next) => {
    try {
        console.log('🔍 Debug search called with query:', req.query);

        const { query = 'chicken' } = req.query;

        console.log('📊 Testing basic recipe query...');

        // Test 1: Very basic query
        const basicQuery = `SELECT COUNT(*) as recipe_count FROM \"recipes\"`;
        const basicResult = await db.query(basicQuery);
        console.log('✅ Basic count result:', basicResult.rows);

        // Test 2: Simple recipe query without searchVector
        const simpleQuery = `
            SELECT r.\"recipeId\", r.\"title\", r.\"description\"
            FROM \"recipes\" r
            LIMIT 3
        `;
        const simpleResult = await db.query(simpleQuery);
        console.log('✅ Simple query result:', simpleResult.rows);

        // Test 3: Check if searchVector column exists
        const columnQuery = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'recipes' AND column_name = 'searchVector'
        `;
        const columnResult = await db.query(columnQuery);
        console.log('✅ Column check result:', columnResult.rows);

        // Test 4: Test searchVector functionality
        const searchVectorQuery = `
            SELECT r.\"recipeId\", r.\"title\", r.\"searchVector\" IS NOT NULL as has_vector
            FROM \"recipes\" r
            WHERE r.\"title\" ILIKE $1
            LIMIT 3
        `;
        const searchVectorResult = await db.query(searchVectorQuery, [`%${query}%`]);
        console.log('✅ SearchVector query result:', searchVectorResult.rows);

        // Test 5: Full text search with searchVector
        const fullTextQuery = `
            SELECT r.\"recipeId\", r.\"title\",
                   ts_rank(r.\"searchVector\", plainto_tsquery('english', $1)) as relevance_score
            FROM \"recipes\" r
            WHERE r.\"searchVector\" @@ plainto_tsquery('english', $1)
            ORDER BY relevance_score DESC
            LIMIT 5
        `;
        const fullTextResult = await db.query(fullTextQuery, [query]);
        console.log('✅ Full text search result:', fullTextResult.rows);

        res.json({
            success: true,
            debug: true,
            query,
            tests: {
                count: basicResult.rows,
                simple: simpleResult.rows,
                columnCheck: columnResult.rows,
                searchVector: searchVectorResult.rows,
                fullTextSearch: fullTextResult.rows
            }
        });

    } catch (error) {
        console.error('🚨 Debug search error:', error);
        if (error instanceof Error) {
            console.error('Error stack:', error.stack);
        }
        next(error);
    }
});

export default router; 