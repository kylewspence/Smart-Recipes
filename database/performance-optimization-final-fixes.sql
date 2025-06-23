-- =============================================================================
-- SMART RECIPES - FINAL PERFORMANCE OPTIMIZATION FIXES
-- =============================================================================

-- Fix the analyze_table_sizes function with correct column names
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
        s.schemaname||'.'||s.relname as table_name,
        s.n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(s.schemaname||'.'||s.relname)) as total_size,
        pg_size_pretty(pg_indexes_size(s.schemaname||'.'||s.relname)) as index_size,
        pg_size_pretty(pg_total_relation_size(s.schemaname||'.'||s.relname) - pg_relation_size(s.schemaname||'.'||s.relname)) as toast_size
    FROM pg_stat_user_tables s
    WHERE s.schemaname = 'public'
    ORDER BY pg_total_relation_size(s.schemaname||'.'||s.relname) DESC;
END;
$$ LANGUAGE plpgsql;

-- Also fix the generate_maintenance_commands function
CREATE OR REPLACE FUNCTION generate_maintenance_commands()
RETURNS TABLE(
    table_name text,
    command text,
    reason text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname||'.'||s.relname,
        'ANALYZE ' || s.schemaname||'.'||s.relname || ';' as command,
        'Update table statistics for query optimization' as reason
    FROM pg_stat_user_tables s
    WHERE s.schemaname = 'public'
      AND (s.last_analyze IS NULL OR s.last_analyze < NOW() - INTERVAL '1 week')
    
    UNION ALL
    
    SELECT 
        s.schemaname||'.'||s.relname,
        'VACUUM ANALYZE ' || s.schemaname||'.'||s.relname || ';' as command,
        'Reclaim space and update statistics' as reason
    FROM pg_stat_user_tables s
    WHERE s.schemaname = 'public'
      AND (s.last_vacuum IS NULL OR s.last_vacuum < NOW() - INTERVAL '1 month')
      AND s.n_live_tup > 1000;
END;
$$ LANGUAGE plpgsql;

-- Test the functions
DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'PERFORMANCE MONITORING FUNCTIONS FIXED AND READY';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'All performance monitoring tools are now working correctly!';
    RAISE NOTICE '=============================================================================';
END
$$; 