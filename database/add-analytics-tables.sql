-- Analytics Tables Migration
-- Creates tables for tracking user behavior, performance metrics, and application usage

-- Analytics Events Table
-- Tracks user actions, clicks, form submissions, etc.
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    label TEXT,
    value INTEGER,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Pageviews Table
-- Tracks page navigation and user journey
CREATE TABLE IF NOT EXISTS analytics_pageviews (
    id SERIAL PRIMARY KEY,
    path VARCHAR(500) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Performance Table
-- Tracks Web Vitals and performance metrics
CREATE TABLE IF NOT EXISTS analytics_performance (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(50) NOT NULL, -- CLS, FCP, LCP, INP, TTFB
    value DECIMAL(10,3) NOT NULL,
    rating VARCHAR(20) NOT NULL CHECK (rating IN ('good', 'needs-improvement', 'poor')),
    url TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_action_category ON analytics_events(action, category);

CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_timestamp ON analytics_pageviews(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_user_id ON analytics_pageviews(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_session_id ON analytics_pageviews(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_path ON analytics_pageviews(path);

CREATE INDEX IF NOT EXISTS idx_analytics_performance_timestamp ON analytics_performance(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_performance_user_id ON analytics_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_performance_metric_name ON analytics_performance(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_performance_rating ON analytics_performance(rating);

-- Add role column to users table if it doesn't exist (for admin analytics access)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));
    END IF;
END $$;

-- Create a view for analytics summary (optional, for easier querying)
CREATE OR REPLACE VIEW analytics_summary AS
SELECT 
    DATE(ae.timestamp) as date,
    COUNT(DISTINCT ae.session_id) as unique_sessions,
    COUNT(DISTINCT ae.user_id) as unique_users,
    COUNT(ae.id) as total_events,
    COUNT(ap.id) as total_pageviews,
    AVG(CASE WHEN aperf.metric_name = 'LCP' THEN aperf.value END) as avg_lcp,
    AVG(CASE WHEN aperf.metric_name = 'FCP' THEN aperf.value END) as avg_fcp,
    AVG(CASE WHEN aperf.metric_name = 'CLS' THEN aperf.value END) as avg_cls
FROM analytics_events ae
LEFT JOIN analytics_pageviews ap ON ae.session_id = ap.session_id AND DATE(ae.timestamp) = DATE(ap.timestamp)
LEFT JOIN analytics_performance aperf ON ae.session_id = aperf.session_id AND DATE(ae.timestamp) = DATE(aperf.timestamp)
WHERE ae.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(ae.timestamp)
ORDER BY date DESC;

-- Insert sample admin user role (only if no admin exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin') THEN
        -- Update the first user to be admin (for demo purposes)
        UPDATE users 
        SET role = 'admin' 
        WHERE id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
    END IF;
END $$;

-- Comments for documentation
COMMENT ON TABLE analytics_events IS 'Tracks user interactions and custom events';
COMMENT ON TABLE analytics_pageviews IS 'Tracks page navigation and user journey';
COMMENT ON TABLE analytics_performance IS 'Tracks Web Vitals and performance metrics';
COMMENT ON VIEW analytics_summary IS 'Daily summary of analytics data for the last 30 days'; 