-- Add searchVector column and search functionality to recipes table
-- This migration adds the missing search infrastructure needed for full-text search

-- Add the searchVector column to recipes table
ALTER TABLE "recipes" 
ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- Create GIN index for the searchVector column for fast full-text search
CREATE INDEX IF NOT EXISTS "recipes_search_vector_idx" 
ON "recipes" USING gin("searchVector");

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_recipe_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW."searchVector" := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.instructions, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.cuisine, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update searchVector on INSERT/UPDATE
DROP TRIGGER IF EXISTS recipe_search_vector_update ON "recipes";
CREATE TRIGGER recipe_search_vector_update
    BEFORE INSERT OR UPDATE ON "recipes"
    FOR EACH ROW
    EXECUTE FUNCTION update_recipe_search_vector();

-- Update existing recipes to populate searchVector
UPDATE "recipes" 
SET "searchVector" = 
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(instructions, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(cuisine, '')), 'D')
WHERE "searchVector" IS NULL;

-- Verify the migration by checking if searchVector exists and is populated
DO $$
DECLARE
    recipe_count INTEGER;
    search_vector_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO recipe_count FROM "recipes";
    SELECT COUNT(*) INTO search_vector_count FROM "recipes" WHERE "searchVector" IS NOT NULL;
    
    RAISE NOTICE 'Migration completed: % recipes total, % with searchVector populated', 
        recipe_count, search_vector_count;
        
    IF search_vector_count < recipe_count THEN
        RAISE WARNING 'Some recipes do not have searchVector populated';
    END IF;
END $$; 