-- Fix recommendations schema - Add missing tables and views
-- This migration adds the missing tables that the recommendations route expects

-- Create userFavorites table (if it doesn't exist)
-- This will be a view that maps to our existing savedRecipes table
CREATE OR REPLACE VIEW "userFavorites" AS
SELECT 
    s."userId",
    s."recipeId",
    r.title,
    r.cuisine,
    r.difficulty,
    r."cookingTime",
    r.servings,
    s."savedAt" as "favoritedAt"
FROM "savedRecipes" s
JOIN "recipes" r ON s."recipeId" = r."recipeId";

-- Create favorites table as an alias/view to savedRecipes for compatibility
CREATE OR REPLACE VIEW "favorites" AS
SELECT 
    "id" as "favoriteId",
    "userId",
    "recipeId", 
    "savedAt" as "createdAt"
FROM "savedRecipes";

-- Add missing columns to recipes table if they don't exist
DO $$ 
BEGIN
    -- Add rating column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipes' AND column_name = 'rating') THEN
        ALTER TABLE "recipes" ADD COLUMN "rating" DECIMAL(3,2) DEFAULT NULL;
    END IF;
    
    -- Add imageUrl column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipes' AND column_name = 'imageUrl') THEN
        ALTER TABLE "recipes" ADD COLUMN "imageUrl" TEXT DEFAULT NULL;
    END IF;
    
    -- Add tags column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipes' AND column_name = 'tags') THEN
        ALTER TABLE "recipes" ADD COLUMN "tags" TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Create cooking history table for tracking user cooking activities
CREATE TABLE IF NOT EXISTS "cookingHistory" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
    "recipeId" INTEGER NOT NULL REFERENCES "recipes"("recipeId") ON DELETE CASCADE,
    "cookedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "rating" INTEGER CHECK ("rating" >= 1 AND "rating" <= 5),
    "notes" TEXT,
    "cookingTime" INTEGER, -- actual time taken
    "difficulty" TEXT CHECK ("difficulty" IN ('easier', 'as_expected', 'harder'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_cooking_history_user" ON "cookingHistory" ("userId");
CREATE INDEX IF NOT EXISTS "idx_cooking_history_recipe" ON "cookingHistory" ("recipeId");
CREATE INDEX IF NOT EXISTS "idx_cooking_history_cooked_at" ON "cookingHistory" ("cookedAt");

-- Update existing recipes with calculated ratings from recipeRatings table
UPDATE "recipes" 
SET "rating" = (
    SELECT ROUND(AVG("rating")::numeric, 2)
    FROM "recipeRatings" 
    WHERE "recipeRatings"."recipeId" = "recipes"."recipeId"
)
WHERE EXISTS (
    SELECT 1 FROM "recipeRatings" 
    WHERE "recipeRatings"."recipeId" = "recipes"."recipeId"
);

-- Create a trigger to automatically update recipe ratings when ratings are added/updated
CREATE OR REPLACE FUNCTION update_recipe_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "recipes" 
    SET "rating" = (
        SELECT ROUND(AVG("rating")::numeric, 2)
        FROM "recipeRatings" 
        WHERE "recipeRatings"."recipeId" = COALESCE(NEW."recipeId", OLD."recipeId")
    )
    WHERE "recipeId" = COALESCE(NEW."recipeId", OLD."recipeId");
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic rating updates
DROP TRIGGER IF EXISTS trigger_update_recipe_rating_insert ON "recipeRatings";
DROP TRIGGER IF EXISTS trigger_update_recipe_rating_update ON "recipeRatings";
DROP TRIGGER IF EXISTS trigger_update_recipe_rating_delete ON "recipeRatings";

CREATE TRIGGER trigger_update_recipe_rating_insert
    AFTER INSERT ON "recipeRatings"
    FOR EACH ROW EXECUTE FUNCTION update_recipe_rating();

CREATE TRIGGER trigger_update_recipe_rating_update
    AFTER UPDATE ON "recipeRatings"
    FOR EACH ROW EXECUTE FUNCTION update_recipe_rating();

CREATE TRIGGER trigger_update_recipe_rating_delete
    AFTER DELETE ON "recipeRatings"
    FOR EACH ROW EXECUTE FUNCTION update_recipe_rating();

-- Insert some sample cooking history data
INSERT INTO "cookingHistory" ("userId", "recipeId", "cookedAt", "rating", "notes", "cookingTime", "difficulty")
SELECT 
    1, -- Assuming user ID 1 exists
    r."recipeId",
    NOW() - INTERVAL '1 day' * (random() * 30), -- Random dates in last 30 days
    (random() * 4 + 1)::integer, -- Random rating 1-5
    CASE 
        WHEN random() > 0.7 THEN 'Delicious! Will make again.'
        WHEN random() > 0.4 THEN 'Good recipe, followed instructions exactly.'
        ELSE NULL
    END,
    (r."cookingTime" * (0.8 + random() * 0.4))::integer, -- Actual time 80-120% of estimated
    CASE 
        WHEN random() > 0.7 THEN 'as_expected'
        WHEN random() > 0.3 THEN 'easier'
        ELSE 'harder'
    END
FROM "recipes" r
WHERE random() > 0.8 -- Only for ~20% of recipes
LIMIT 10
ON CONFLICT DO NOTHING;

COMMIT; 