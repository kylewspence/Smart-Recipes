-- Create Analytics Tables Migration
-- This script creates the missing analytics tables identified in the audit

-- 1. Create analytics_events table for tracking user interactions
CREATE TABLE IF NOT EXISTS "analytics_events" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER REFERENCES "users"("userId") ON DELETE SET NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "event_data" JSONB,
    "session_id" VARCHAR(100),
    "ip_address" INET,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create analytics_pageviews table for tracking page views
CREATE TABLE IF NOT EXISTS "analytics_pageviews" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER REFERENCES "users"("userId") ON DELETE SET NULL,
    "page_url" VARCHAR(500) NOT NULL,
    "page_title" VARCHAR(200),
    "referrer" VARCHAR(500),
    "referrer_domain" VARCHAR(100),
    "session_id" VARCHAR(100),
    "user_agent" TEXT,
    "ip_address" INET,
    "device_type" VARCHAR(50),
    "browser" VARCHAR(50),
    "os" VARCHAR(50),
    "screen_resolution" VARCHAR(20),
    "viewport_size" VARCHAR(20),
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create analytics_performance table for tracking API performance
CREATE TABLE IF NOT EXISTS "analytics_performance" (
    "id" SERIAL PRIMARY KEY,
    "endpoint" VARCHAR(200) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "response_time_ms" INTEGER NOT NULL,
    "status_code" INTEGER NOT NULL,
    "user_id" INTEGER REFERENCES "users"("userId") ON DELETE SET NULL,
    "session_id" VARCHAR(100),
    "request_size" INTEGER,
    "response_size" INTEGER,
    "error_message" TEXT,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for frequently queried columns

-- analytics_events indexes
CREATE INDEX IF NOT EXISTS "analytics_events_user_id_idx" ON "analytics_events"("user_id");
CREATE INDEX IF NOT EXISTS "analytics_events_event_type_idx" ON "analytics_events"("event_type");
CREATE INDEX IF NOT EXISTS "analytics_events_timestamp_idx" ON "analytics_events"("timestamp");
CREATE INDEX IF NOT EXISTS "analytics_events_session_id_idx" ON "analytics_events"("session_id");
CREATE INDEX IF NOT EXISTS "analytics_events_composite_idx" ON "analytics_events"("event_type", "timestamp");

-- analytics_pageviews indexes
CREATE INDEX IF NOT EXISTS "analytics_pageviews_user_id_idx" ON "analytics_pageviews"("user_id");
CREATE INDEX IF NOT EXISTS "analytics_pageviews_page_url_idx" ON "analytics_pageviews"("page_url");
CREATE INDEX IF NOT EXISTS "analytics_pageviews_timestamp_idx" ON "analytics_pageviews"("timestamp");
CREATE INDEX IF NOT EXISTS "analytics_pageviews_session_id_idx" ON "analytics_pageviews"("session_id");
CREATE INDEX IF NOT EXISTS "analytics_pageviews_referrer_domain_idx" ON "analytics_pageviews"("referrer_domain");
CREATE INDEX IF NOT EXISTS "analytics_pageviews_device_type_idx" ON "analytics_pageviews"("device_type");

-- analytics_performance indexes
CREATE INDEX IF NOT EXISTS "analytics_performance_endpoint_idx" ON "analytics_performance"("endpoint");
CREATE INDEX IF NOT EXISTS "analytics_performance_timestamp_idx" ON "analytics_performance"("timestamp");
CREATE INDEX IF NOT EXISTS "analytics_performance_status_code_idx" ON "analytics_performance"("status_code");
CREATE INDEX IF NOT EXISTS "analytics_performance_response_time_idx" ON "analytics_performance"("response_time_ms");
CREATE INDEX IF NOT EXISTS "analytics_performance_composite_idx" ON "analytics_performance"("endpoint", "timestamp");

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "analytics_events_user_time_idx" ON "analytics_events"("user_id", "timestamp");
CREATE INDEX IF NOT EXISTS "analytics_pageviews_user_time_idx" ON "analytics_pageviews"("user_id", "timestamp");
CREATE INDEX IF NOT EXISTS "analytics_performance_endpoint_status_idx" ON "analytics_performance"("endpoint", "status_code");

-- Add comments for documentation
COMMENT ON TABLE "analytics_events" IS 'Tracks user interactions and events within the application';
COMMENT ON TABLE "analytics_pageviews" IS 'Tracks page views and navigation patterns';
COMMENT ON TABLE "analytics_performance" IS 'Tracks API endpoint performance metrics';

COMMENT ON COLUMN "analytics_events"."event_type" IS 'Type of event (e.g., recipe_generated, recipe_saved, search_performed)';
COMMENT ON COLUMN "analytics_events"."event_data" IS 'Additional event-specific data stored as JSON';
COMMENT ON COLUMN "analytics_pageviews"."page_url" IS 'Full URL of the page viewed';
COMMENT ON COLUMN "analytics_pageviews"."referrer_domain" IS 'Domain of the referring page';
COMMENT ON COLUMN "analytics_performance"."response_time_ms" IS 'API response time in milliseconds';

-- Create a view for easy analytics querying
CREATE OR REPLACE VIEW "analytics_summary" AS
SELECT 
    date_trunc('day', timestamp) as date,
    COUNT(*) as total_events,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions
FROM "analytics_events"
GROUP BY date_trunc('day', timestamp)
ORDER BY date DESC;

-- Create a view for performance monitoring
CREATE OR REPLACE VIEW "performance_summary" AS
SELECT 
    endpoint,
    method,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time,
    MIN(response_time_ms) as min_response_time,
    MAX(response_time_ms) as max_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
    (COUNT(CASE WHEN status_code >= 400 THEN 1 END)::float / COUNT(*)::float * 100) as error_rate
FROM "analytics_performance"
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint, method
ORDER BY avg_response_time DESC;

-- Grant appropriate permissions
GRANT SELECT, INSERT ON "analytics_events" TO postgres;
GRANT SELECT, INSERT ON "analytics_pageviews" TO postgres;
GRANT SELECT, INSERT ON "analytics_performance" TO postgres;
GRANT USAGE ON SEQUENCE "analytics_events_id_seq" TO postgres;
GRANT USAGE ON SEQUENCE "analytics_pageviews_id_seq" TO postgres;
GRANT USAGE ON SEQUENCE "analytics_performance_id_seq" TO postgres;
GRANT SELECT ON "analytics_summary" TO postgres;
GRANT SELECT ON "performance_summary" TO postgres; 