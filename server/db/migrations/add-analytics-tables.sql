-- Performance Analytics Tables Migration
-- Creates tables for storing performance monitoring data

-- Performance metrics table for Core Web Vitals and custom metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  value NUMERIC(10,3) NOT NULL,
  rating VARCHAR(20) NOT NULL CHECK (rating IN ('good', 'needs-improvement', 'poor')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  url TEXT NOT NULL,
  user_agent TEXT,
  connection_type VARCHAR(50),
  connection_downlink NUMERIC(8,3),
  connection_rtt INTEGER,
  session_id VARCHAR(100) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User interactions table for tracking user behavior
CREATE TABLE IF NOT EXISTS user_interactions (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('click', 'scroll', 'navigation', 'form-submit')),
  element VARCHAR(255),
  duration NUMERIC(10,3),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  url TEXT NOT NULL,
  session_id VARCHAR(100) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resource metrics table for tracking resource loading performance
CREATE TABLE IF NOT EXISTS resource_metrics (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  duration NUMERIC(10,3) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  session_id VARCHAR(100) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error tracking table for application errors
CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT,
  stack_trace TEXT,
  url TEXT NOT NULL,
  user_agent TEXT,
  session_id VARCHAR(100),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Application health metrics table
CREATE TABLE IF NOT EXISTS health_metrics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC(15,6) NOT NULL,
  metric_unit VARCHAR(20),
  tags JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API performance tracking table
CREATE TABLE IF NOT EXISTS api_performance (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time NUMERIC(10,3) NOT NULL,
  request_size BIGINT,
  response_size BIGINT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_created_at ON performance_metrics(name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session_id ON performance_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_url ON performance_metrics(url);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_rating ON performance_metrics(rating);

CREATE INDEX IF NOT EXISTS idx_user_interactions_type_created_at ON user_interactions(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_session_id ON user_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_url ON user_interactions(url);

CREATE INDEX IF NOT EXISTS idx_resource_metrics_type_created_at ON resource_metrics(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_metrics_name ON resource_metrics(name);
CREATE INDEX IF NOT EXISTS idx_resource_metrics_session_id ON resource_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_resource_metrics_duration ON resource_metrics(duration DESC);
CREATE INDEX IF NOT EXISTS idx_resource_metrics_size ON resource_metrics(size DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_type_created_at ON error_logs(error_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_session_id ON error_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_health_metrics_name_timestamp ON health_metrics(metric_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_api_performance_endpoint_created_at ON api_performance(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_performance_status_code ON api_performance(status_code);
CREATE INDEX IF NOT EXISTS idx_api_performance_response_time ON api_performance(response_time DESC);
CREATE INDEX IF NOT EXISTS idx_api_performance_user_id ON api_performance(user_id);

-- Views for common analytics queries
CREATE OR REPLACE VIEW core_web_vitals_summary AS
SELECT 
  name,
  DATE_TRUNC('day', created_at) as date,
  AVG(value) as avg_value,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as median_value,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75_value,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value,
  COUNT(*) as sample_count,
  COUNT(CASE WHEN rating = 'good' THEN 1 END) * 100.0 / COUNT(*) as good_percentage
FROM performance_metrics 
WHERE name IN ('LCP', 'FID', 'CLS', 'FCP', 'TTFB')
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY name, DATE_TRUNC('day', created_at)
ORDER BY date DESC, name;

CREATE OR REPLACE VIEW resource_performance_summary AS
SELECT 
  type,
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as load_count,
  AVG(duration) as avg_duration,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95_duration,
  AVG(size) as avg_size,
  SUM(size) as total_size
FROM resource_metrics 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY type, DATE_TRUNC('day', created_at)
ORDER BY date DESC, type;

CREATE OR REPLACE VIEW user_interaction_summary AS
SELECT 
  type,
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as interaction_count,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(duration) as avg_duration
FROM user_interactions 
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND duration IS NOT NULL
GROUP BY type, DATE_TRUNC('day', created_at)
ORDER BY date DESC, type;

CREATE OR REPLACE VIEW error_rate_summary AS
SELECT 
  error_type,
  severity,
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as error_count,
  COUNT(DISTINCT session_id) as affected_sessions
FROM error_logs 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY error_type, severity, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC, error_count DESC;

CREATE OR REPLACE VIEW api_performance_summary AS
SELECT 
  endpoint,
  method,
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as request_count,
  AVG(response_time) as avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95_response_time,
  COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*) as error_rate,
  AVG(response_size) as avg_response_size
FROM api_performance 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint, method, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC, request_count DESC;

-- Function to clean up old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data() RETURNS void AS $$
BEGIN
  -- Delete performance metrics older than 90 days
  DELETE FROM performance_metrics WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete user interactions older than 60 days
  DELETE FROM user_interactions WHERE created_at < NOW() - INTERVAL '60 days';
  
  -- Delete resource metrics older than 30 days
  DELETE FROM resource_metrics WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete error logs older than 180 days (keep errors longer for debugging)
  DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '180 days';
  
  -- Delete health metrics older than 30 days
  DELETE FROM health_metrics WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete API performance data older than 30 days
  DELETE FROM api_performance WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Vacuum tables to reclaim space
  VACUUM ANALYZE performance_metrics;
  VACUUM ANALYZE user_interactions;
  VACUUM ANALYZE resource_metrics;
  VACUUM ANALYZE error_logs;
  VACUUM ANALYZE health_metrics;
  VACUUM ANALYZE api_performance;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup weekly (requires pg_cron extension)
-- SELECT cron.schedule('analytics-cleanup', '0 2 * * 0', 'SELECT cleanup_old_analytics_data();');

COMMENT ON TABLE performance_metrics IS 'Stores Core Web Vitals and custom performance metrics';
COMMENT ON TABLE user_interactions IS 'Tracks user interactions and behavior patterns';
COMMENT ON TABLE resource_metrics IS 'Monitors resource loading performance';
COMMENT ON TABLE error_logs IS 'Application error tracking and debugging';
COMMENT ON TABLE health_metrics IS 'System health and infrastructure metrics';
COMMENT ON TABLE api_performance IS 'API endpoint performance monitoring'; 