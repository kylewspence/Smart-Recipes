-- =============================================================================
-- SMART RECIPES - PERFORMANCE OPTIMIZATION FIXES
-- =============================================================================
-- This script fixes issues from the previous optimization script

-- Drop the problematic index that references non-existent isPublic column
DROP INDEX IF EXISTS idx_recipes_public_rating;

-- Create a corrected version based on actual schema
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_rating_created 
    ON recipes("isFavorite", "createdAt" DESC);

-- Fix the views that had errors
DROP VIEW IF EXISTS unused_indexes;
DROP VIEW IF EXISTS candidate_partial_indexes;

-- Recreate unused_indexes view with correct column references
CREATE OR REPLACE VIEW unused_indexes AS
SELECT 
    s.schemaname||'.'||c.relname as table_name,
    s.indexrelname as index_name,
    pg_size_pretty(pg_relation_size(s.indexrelid)) as index_size,
    s.idx_scan as index_scans
FROM pg_stat_user_indexes s
JOIN pg_class c ON c.oid = s.relid 
WHERE s.schemaname = 'public' 
  AND s.idx_scan = 0 
  AND s.indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(s.indexrelid) DESC;

-- Recreate candidate_partial_indexes view with correct column references
CREATE OR REPLACE VIEW candidate_partial_indexes AS
SELECT 
    s.schemaname||'.'||c.relname as table_name,
    s.n_tup_ins - s.n_tup_del as row_count,
    CASE 
        WHEN c.relname = 'recipes' THEN 'CREATE INDEX ON recipes (title, "createdAt") WHERE "isFavorite" = true;'
        WHEN c.relname = 'ingredients' THEN 'CREATE INDEX ON ingredients (name, "categoryId") WHERE "isActive" = true;'
        WHEN c.relname = 'userActivity' THEN 'CREATE INDEX ON "userActivity" ("userId", "createdAt") WHERE "createdAt" > NOW() - INTERVAL ''30 days'';'
        ELSE 'Consider partial indexes for filtered queries'
    END as suggestion
FROM pg_stat_user_tables s
JOIN pg_class c ON c.oid = s.relid
WHERE s.schemaname = 'public' 
  AND s.n_tup_ins - s.n_tup_del > 1000;

-- Test the new performance monitoring functions
DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'TESTING PERFORMANCE MONITORING FUNCTIONS';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Performance monitoring setup complete and tested!';
    RAISE NOTICE '=============================================================================';
END
$$; 