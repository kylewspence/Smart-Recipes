-- Full-text search enhancements for Smart Recipes
-- Add tsvector columns and GIN indexes for optimal search performance

-- Add tsvector columns to recipes table for full-text search
ALTER TABLE "recipes" 
ADD COLUMN "searchVector" tsvector;

-- Create a function to update the search vector
CREATE OR REPLACE FUNCTION update_recipe_search_vector()
RETURNS trigger AS $$
BEGIN
    NEW."searchVector" := 
        setweight(to_tsvector('english', COALESCE(NEW."title", '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW."description", '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW."instructions", '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW."cuisine", '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector on insert/update
DROP TRIGGER IF EXISTS recipe_search_vector_update ON "recipes";
CREATE TRIGGER recipe_search_vector_update
    BEFORE INSERT OR UPDATE ON "recipes"
    FOR EACH ROW EXECUTE FUNCTION update_recipe_search_vector();

-- Update existing recipes with search vectors
UPDATE "recipes" SET 
    "searchVector" = 
        setweight(to_tsvector('english', COALESCE("title", '')), 'A') ||
        setweight(to_tsvector('english', COALESCE("description", '')), 'B') ||
        setweight(to_tsvector('english', COALESCE("instructions", '')), 'C') ||
        setweight(to_tsvector('english', COALESCE("cuisine", '')), 'D');

-- Create GIN index for fast full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS "recipes_search_vector_idx" 
ON "recipes" USING GIN ("searchVector");

-- Create additional indexes for search optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS "recipes_title_gin_idx" 
ON "recipes" USING GIN (to_tsvector('english', "title"));

CREATE INDEX CONCURRENTLY IF NOT EXISTS "recipes_cuisine_idx" 
ON "recipes" ("cuisine") WHERE "cuisine" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "recipes_difficulty_cookingtime_idx" 
ON "recipes" ("difficulty", "cookingTime") WHERE "difficulty" IS NOT NULL;

-- Add ingredient search optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ingredients_name_gin_idx" 
ON "ingredients" USING GIN (to_tsvector('english', "name"));

-- Add trigram extension for fuzzy matching (typo tolerance)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes for fuzzy search
CREATE INDEX CONCURRENTLY IF NOT EXISTS "recipes_title_trgm_idx" 
ON "recipes" USING GIN ("title" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ingredients_name_trgm_idx" 
ON "ingredients" USING GIN ("name" gin_trgm_ops);

-- Create search statistics table for analytics
CREATE TABLE IF NOT EXISTS "searchAnalytics" (
    "id" SERIAL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "userId" INTEGER REFERENCES "users"("userId") ON DELETE SET NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "searchType" TEXT NOT NULL DEFAULT 'recipe',
    "filters" JSONB,
    "searchedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "search_analytics_query_idx" ON "searchAnalytics" ("query");
CREATE INDEX IF NOT EXISTS "search_analytics_user_idx" ON "searchAnalytics" ("userId");
CREATE INDEX IF NOT EXISTS "search_analytics_date_idx" ON "searchAnalytics" ("searchedAt");

-- Create popular searches view for suggestions
CREATE OR REPLACE VIEW "popularSearches" AS
SELECT 
    "query",
    COUNT(*) as search_count,
    MAX("searchedAt") as last_searched,
    AVG("resultCount") as avg_results
FROM "searchAnalytics"
WHERE "searchedAt" >= NOW() - INTERVAL '30 days'
    AND LENGTH("query") >= 3
    AND "resultCount" > 0
GROUP BY "query"
HAVING COUNT(*) >= 2
ORDER BY search_count DESC, last_searched DESC
LIMIT 100; 