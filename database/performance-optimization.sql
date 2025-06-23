-- =============================================================================
-- SMART RECIPES - DATABASE PERFORMANCE OPTIMIZATION
-- =============================================================================
-- This script adds strategic indexes for optimal query performance and 
-- includes monitoring and analysis tools for production optimization.

-- -----------------------------------------------------------------------------
-- ADDITIONAL STRATEGIC INDEXES
-- -----------------------------------------------------------------------------

-- Search and Full-Text Search Optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_title_gin 
    ON recipes USING gin(to_tsvector('english', title));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_description_gin 
    ON recipes USING gin(to_tsvector('english', description));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_instructions_gin 
    ON recipes USING gin(to_tsvector('english', instructions));

-- Compound indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_user_created 
    ON recipes("userId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_public_rating 
    ON recipes("isPublic", "averageRating" DESC) 
    WHERE "isPublic" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_prep_total_time 
    ON recipes("prepTime", "cookingTime", ("prepTime" + "cookingTime"));

-- User activity and engagement indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_recent 
    ON "userActivity"("userId", "createdAt" DESC, "activityType");

-- Recipe collection performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_recipes_created 
    ON "collectionRecipes"("collectionId", "addedAt" DESC);

-- Ingredient search optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ingredients_search 
    ON ingredients(name, "categoryId", "isActive") 
    WHERE "isActive" = true;

-- Meal planning optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meal_plan_entries_date_meal 
    ON "mealPlanEntries"("planId", date, "mealType", "recipeId");

-- Social features optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipe_comments_user_recent 
    ON "recipeComments"("userId", "createdAt" DESC);

-- -----------------------------------------------------------------------------
-- PERFORMANCE ANALYSIS FUNCTIONS
-- -----------------------------------------------------------------------------

-- Function to analyze table sizes and growth
CREATE OR REPLACE FUNCTION analyze_table_sizes()
RETURNS TABLE(
    table_name text,
    row_count bigint,
    total_size text,
    index_size text,
    toast_size text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins - n_tup_del as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as toast_size
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to identify slow queries
CREATE OR REPLACE FUNCTION analyze_slow_queries(min_duration_ms integer DEFAULT 100)
RETURNS TABLE(
    query text,
    calls bigint,
    total_time double precision,
    mean_time double precision,
    max_time double precision,
    stddev_time double precision
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_stat_statements.query,
        pg_stat_statements.calls,
        pg_stat_statements.total_exec_time,
        pg_stat_statements.mean_exec_time,
        pg_stat_statements.max_exec_time,
        pg_stat_statements.stddev_exec_time
    FROM pg_stat_statements 
    WHERE pg_stat_statements.mean_exec_time > min_duration_ms
    ORDER BY pg_stat_statements.mean_exec_time DESC
    LIMIT 20;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'pg_stat_statements extension not available. Install with: CREATE EXTENSION pg_stat_statements;';
        RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze index usage
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
    table_name text,
    index_name text,
    index_scans bigint,
    index_tup_read bigint,
    index_tup_fetch bigint,
    usage_ratio numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        indexrelname as index_name,
        idx_scan as index_scans,
        idx_tup_read as index_tup_read,
        idx_tup_fetch as index_tup_fetch,
        CASE 
            WHEN idx_scan = 0 THEN 0
            ELSE round((idx_tup_read::numeric / idx_scan), 2)
        END as usage_ratio
    FROM pg_stat_user_indexes 
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- COMMON PERFORMANCE QUERIES FOR MONITORING
-- -----------------------------------------------------------------------------

-- Check for unused indexes (should be run after app has been running for a while)
CREATE OR REPLACE VIEW unused_indexes AS
SELECT 
    schemaname||'.'||tablename as table_name,
    indexrelname as index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as index_scans
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
  AND idx_scan = 0 
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check for missing indexes on foreign keys
CREATE OR REPLACE VIEW missing_foreign_key_indexes AS
SELECT 
    c.conrelid::regclass as table_name,
    string_agg(a.attname, ', ') as columns,
    'CREATE INDEX ON ' || c.conrelid::regclass || ' (' || string_agg(a.attname, ', ') || ');' as suggested_index
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND NOT EXISTS (
      SELECT 1 FROM pg_index i 
      WHERE i.indrelid = c.conrelid 
        AND i.indkey::int[] @> c.conkey::int[]
  )
GROUP BY c.conrelid, c.conname;

-- Check for tables that might benefit from partial indexes
CREATE OR REPLACE VIEW candidate_partial_indexes AS
SELECT 
    schemaname||'.'||tablename as table_name,
    n_tup_ins - n_tup_del as row_count,
    CASE 
        WHEN tablename = 'recipes' THEN 'CREATE INDEX ON recipes (title, "averageRating") WHERE "isPublic" = true;'
        WHEN tablename = 'ingredients' THEN 'CREATE INDEX ON ingredients (name, "categoryId") WHERE "isActive" = true;'
        WHEN tablename = 'userActivity' THEN 'CREATE INDEX ON "userActivity" ("userId", "createdAt") WHERE "createdAt" > NOW() - INTERVAL ''30 days'';'
        ELSE 'Consider partial indexes for filtered queries'
    END as suggestion
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
  AND n_tup_ins - n_tup_del > 1000;

-- -----------------------------------------------------------------------------
-- VACUUM AND MAINTENANCE RECOMMENDATIONS
-- -----------------------------------------------------------------------------

-- Function to generate maintenance commands
CREATE OR REPLACE FUNCTION generate_maintenance_commands()
RETURNS TABLE(
    table_name text,
    command text,
    reason text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename,
        'ANALYZE ' || schemaname||'.'||tablename || ';' as command,
        'Update table statistics for query optimization' as reason
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
      AND (last_analyze IS NULL OR last_analyze < NOW() - INTERVAL '1 week')
    
    UNION ALL
    
    SELECT 
        schemaname||'.'||tablename,
        'VACUUM ANALYZE ' || schemaname||'.'||tablename || ';' as command,
        'Reclaim space and update statistics' as reason
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
      AND (last_vacuum IS NULL OR last_vacuum < NOW() - INTERVAL '1 month')
      AND (n_tup_ins - n_tup_del) > 1000;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- PERFORMANCE MONITORING SETUP
-- -----------------------------------------------------------------------------

-- Enable pg_stat_statements if available (requires superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Set useful configuration for monitoring
-- These would typically be set in postgresql.conf, but shown here for reference
/*
RECOMMENDED POSTGRESQL.CONF SETTINGS FOR PRODUCTION:

# Query Performance
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
track_activity_query_size = 2048
log_min_duration_statement = 1000  # Log queries > 1 second

# Connection and Memory
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Checkpoint and WAL
checkpoint_completion_target = 0.9
wal_buffers = 16MB
random_page_cost = 1.1  # For SSDs

# Autovacuum
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min
*/

-- -----------------------------------------------------------------------------
-- USAGE EXAMPLES
-- -----------------------------------------------------------------------------

/*
-- Check table sizes and identify largest tables
SELECT * FROM analyze_table_sizes();

-- Find unused indexes (run after production traffic)
SELECT * FROM unused_indexes;

-- Check index usage patterns
SELECT * FROM analyze_index_usage() WHERE index_scans < 100;

-- Generate maintenance commands
SELECT * FROM generate_maintenance_commands();

-- Check for missing foreign key indexes
SELECT * FROM missing_foreign_key_indexes;

-- Get recommendations for partial indexes
SELECT * FROM candidate_partial_indexes;

-- Analyze slow queries (requires pg_stat_statements)
SELECT * FROM analyze_slow_queries(500);

-- Manual performance analysis queries:

-- Top 10 largest tables
SELECT 
    schemaname||'.'||tablename as table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
LIMIT 10;

-- Check for bloated tables
SELECT 
    schemaname||'.'||tablename as table_name,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2) as dead_ratio
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
  AND n_dead_tup > 0
ORDER BY dead_ratio DESC;
*/

-- Final message
DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'SMART RECIPES - PERFORMANCE OPTIMIZATION COMPLETE';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Strategic indexes added for:';
    RAISE NOTICE '- Full-text search on recipes (title, description, instructions)';
    RAISE NOTICE '- Compound indexes for common query patterns';
    RAISE NOTICE '- User activity and engagement optimization';
    RAISE NOTICE '- Social features and meal planning performance';
    RAISE NOTICE '';
    RAISE NOTICE 'Performance monitoring functions created:';
    RAISE NOTICE '- analyze_table_sizes(): Check table sizes and growth';
    RAISE NOTICE '- analyze_index_usage(): Monitor index effectiveness';  
    RAISE NOTICE '- generate_maintenance_commands(): Get VACUUM/ANALYZE recommendations';
    RAISE NOTICE '';
    RAISE NOTICE 'Performance monitoring views created:';
    RAISE NOTICE '- unused_indexes: Find indexes that are never used';
    RAISE NOTICE '- missing_foreign_key_indexes: Identify missing FK indexes';
    RAISE NOTICE '- candidate_partial_indexes: Suggestions for filtered indexes';
    RAISE NOTICE '';
    RAISE NOTICE 'Run "SELECT * FROM analyze_table_sizes();" to see current database size.';
    RAISE NOTICE '=============================================================================';
END
$$; 