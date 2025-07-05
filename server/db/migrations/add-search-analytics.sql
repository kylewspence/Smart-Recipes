-- Create searchAnalytics table for tracking search queries and performance
CREATE TABLE IF NOT EXISTS "searchAnalytics" (
    "analyticsId" SERIAL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "userId" INTEGER REFERENCES "users"("userId") ON DELETE SET NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "searchType" VARCHAR(50) NOT NULL DEFAULT 'all',
    "filters" JSONB,
    "executionTime" NUMERIC(10,3),
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "sessionId" VARCHAR(100),
    "userAgent" TEXT,
    "ipAddress" INET,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for search analytics
CREATE INDEX IF NOT EXISTS "searchAnalytics_query_idx" ON "searchAnalytics"("query");
CREATE INDEX IF NOT EXISTS "searchAnalytics_userId_idx" ON "searchAnalytics"("userId");
CREATE INDEX IF NOT EXISTS "searchAnalytics_timestamp_idx" ON "searchAnalytics"("timestamp");
CREATE INDEX IF NOT EXISTS "searchAnalytics_searchType_idx" ON "searchAnalytics"("searchType");

-- Create GIN index for filters JSONB column
CREATE INDEX IF NOT EXISTS "searchAnalytics_filters_gin_idx" ON "searchAnalytics" USING gin("filters");

-- Verify table creation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'searchAnalytics') THEN
        RAISE NOTICE 'searchAnalytics table created successfully';
    ELSE
        RAISE WARNING 'Failed to create searchAnalytics table';
    END IF;
END $$; 