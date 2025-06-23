-- Enhanced Database Schema Migration for Smart Recipes
-- Adding missing tables and relationships for production-ready functionality

-- ===== ENHANCED INGREDIENT SYSTEM =====

-- Ingredient categories with metadata
CREATE TABLE IF NOT EXISTS "ingredientCategories" (
  "categoryId"     SERIAL PRIMARY KEY,
  "name"           TEXT UNIQUE NOT NULL,
  "description"    TEXT,
  "color"          TEXT, -- for UI categorization
  "sortOrder"      INTEGER DEFAULT 0,
  "isActive"       BOOLEAN DEFAULT TRUE,
  "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Add foreign key to ingredients table for better categorization
ALTER TABLE "ingredients" 
  DROP COLUMN IF EXISTS "category";
ALTER TABLE "ingredients" 
  ADD COLUMN "categoryId" INTEGER REFERENCES "ingredientCategories"("categoryId"),
  ADD COLUMN "nutrition" JSONB, -- nutritional information
  ADD COLUMN "tags" TEXT[], -- searchable tags
  ADD COLUMN "aliases" TEXT[], -- alternative names
  ADD COLUMN "seasonality" TEXT[], -- months when in season
  ADD COLUMN "isActive" BOOLEAN DEFAULT TRUE,
  ADD COLUMN "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW();

-- ===== USER ACTIVITY TRACKING =====

-- Track user actions for analytics and personalization
CREATE TABLE IF NOT EXISTS "userActivity" (
  "activityId"     SERIAL PRIMARY KEY,
  "userId"         INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "activityType"   TEXT NOT NULL CHECK ("activityType" IN (
    'recipe_generated', 'recipe_viewed', 'recipe_saved', 'recipe_rated',
    'recipe_shared', 'search_performed', 'ingredient_added', 'login'
  )),
  "entityId"       INTEGER, -- recipeId, ingredientId, etc.
  "entityType"     TEXT, -- 'recipe', 'ingredient', 'search', etc.
  "metadata"       JSONB, -- flexible data storage
  "sessionId"      TEXT,
  "ipAddress"      INET,
  "userAgent"      TEXT,
  "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- ===== RECIPE ENHANCEMENT =====

-- Recipe versions for tracking changes
CREATE TABLE IF NOT EXISTS "recipeVersions" (
  "versionId"      SERIAL PRIMARY KEY,
  "recipeId"       INTEGER NOT NULL REFERENCES "recipes"("recipeId") ON DELETE CASCADE,
  "versionNumber"  INTEGER NOT NULL DEFAULT 1,
  "title"          TEXT NOT NULL,
  "description"    TEXT,
  "instructions"   TEXT NOT NULL,
  "ingredients"    JSONB, -- snapshot of ingredients at this version
  "nutrition"      JSONB, -- calculated nutritional information
  "modifiedBy"     INTEGER REFERENCES "users"("userId"),
  "changeNotes"    TEXT,
  "isActive"       BOOLEAN DEFAULT TRUE,
  "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("recipeId", "versionNumber")
);

-- Recipe sharing and permissions
CREATE TABLE IF NOT EXISTS "recipeShares" (
  "shareId"        SERIAL PRIMARY KEY,
  "recipeId"       INTEGER NOT NULL REFERENCES "recipes"("recipeId") ON DELETE CASCADE,
  "ownerId"        INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "sharedWithId"   INTEGER REFERENCES "users"("userId") ON DELETE CASCADE,
  "shareType"      TEXT NOT NULL CHECK ("shareType" IN ('public', 'friends', 'specific')),
  "permission"     TEXT NOT NULL CHECK ("permission" IN ('view', 'comment', 'edit')) DEFAULT 'view',
  "shareUrl"       TEXT UNIQUE, -- for public sharing
  "expiresAt"      TIMESTAMPTZ(6),
  "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Recipe comments and discussions
CREATE TABLE IF NOT EXISTS "recipeComments" (
  "commentId"      SERIAL PRIMARY KEY,
  "recipeId"       INTEGER NOT NULL REFERENCES "recipes"("recipeId") ON DELETE CASCADE,
  "userId"         INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "parentId"       INTEGER REFERENCES "recipeComments"("commentId") ON DELETE CASCADE,
  "content"        TEXT NOT NULL,
  "isHidden"       BOOLEAN DEFAULT FALSE,
  "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- ===== SOCIAL FEATURES =====

-- User follows/friends system
CREATE TABLE IF NOT EXISTS "userFollows" (
  "followId"       SERIAL PRIMARY KEY,
  "followerId"     INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "followingId"    INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("followerId", "followingId"),
  CHECK ("followerId" != "followingId")
);

-- User profiles with additional information
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "bio" TEXT,
  ADD COLUMN IF NOT EXISTS "profilePicture" TEXT,
  ADD COLUMN IF NOT EXISTS "location" TEXT,
  ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "preferredLanguage" TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS "timezone" TEXT,
  ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMPTZ(6) DEFAULT NOW();

-- ===== NOTIFICATION SYSTEM =====

-- User notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "notificationId" SERIAL PRIMARY KEY,
  "userId"         INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "type"           TEXT NOT NULL CHECK ("type" IN (
    'recipe_shared', 'recipe_commented', 'user_followed', 'recipe_liked',
    'system_announcement', 'recipe_featured'
  )),
  "title"          TEXT NOT NULL,
  "message"        TEXT NOT NULL,
  "relatedId"      INTEGER, -- recipeId, userId, etc.
  "relatedType"    TEXT, -- 'recipe', 'user', etc.
  "isRead"         BOOLEAN DEFAULT FALSE,
  "actionUrl"      TEXT,
  "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "readAt"         TIMESTAMPTZ(6)
);

-- ===== MEAL PLANNING =====

-- Meal plans for users
CREATE TABLE IF NOT EXISTS "mealPlans" (
  "planId"         SERIAL PRIMARY KEY,
  "userId"         INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "name"           TEXT NOT NULL,
  "description"    TEXT,
  "startDate"      DATE NOT NULL,
  "endDate"        DATE NOT NULL,
  "isActive"       BOOLEAN DEFAULT TRUE,
  "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Meal plan entries (specific meals)
CREATE TABLE IF NOT EXISTS "mealPlanEntries" (
  "entryId"        SERIAL PRIMARY KEY,
  "planId"         INTEGER NOT NULL REFERENCES "mealPlans"("planId") ON DELETE CASCADE,
  "recipeId"       INTEGER REFERENCES "recipes"("recipeId") ON DELETE SET NULL,
  "date"           DATE NOT NULL,
  "mealType"       TEXT NOT NULL CHECK ("mealType" IN ('breakfast', 'lunch', 'dinner', 'snack')),
  "servings"       INTEGER DEFAULT 1,
  "notes"          TEXT,
  "isCompleted"    BOOLEAN DEFAULT FALSE,
  "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- ===== SHOPPING LISTS =====

-- Generated shopping lists
CREATE TABLE IF NOT EXISTS "shoppingLists" (
  "listId"         SERIAL PRIMARY KEY,
  "userId"         INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "name"           TEXT NOT NULL DEFAULT 'Shopping List',
  "mealPlanId"     INTEGER REFERENCES "mealPlans"("planId") ON DELETE SET NULL,
  "isCompleted"    BOOLEAN DEFAULT FALSE,
  "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Shopping list items
CREATE TABLE IF NOT EXISTS "shoppingListItems" (
  "itemId"         SERIAL PRIMARY KEY,
  "listId"         INTEGER NOT NULL REFERENCES "shoppingLists"("listId") ON DELETE CASCADE,
  "ingredientId"   INTEGER REFERENCES "ingredients"("ingredientId") ON DELETE SET NULL,
  "name"           TEXT NOT NULL, -- fallback if ingredientId is null
  "quantity"       TEXT,
  "category"       TEXT,
  "isPurchased"    BOOLEAN DEFAULT FALSE,
  "notes"          TEXT,
  "estimatedCost"  DECIMAL(10,2),
  "actualCost"     DECIMAL(10,2),
  "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- ===== ADVANCED INDEXING =====

-- Activity tracking indexes
CREATE INDEX IF NOT EXISTS "idx_user_activity_user_time" ON "userActivity" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_activity_type" ON "userActivity" ("activityType");
CREATE INDEX IF NOT EXISTS "idx_user_activity_entity" ON "userActivity" ("entityType", "entityId");

-- Recipe enhancement indexes
CREATE INDEX IF NOT EXISTS "idx_recipe_versions_recipe" ON "recipeVersions" ("recipeId", "versionNumber" DESC);
CREATE INDEX IF NOT EXISTS "idx_recipe_shares_owner" ON "recipeShares" ("ownerId");
CREATE INDEX IF NOT EXISTS "idx_recipe_shares_shared" ON "recipeShares" ("sharedWithId");
CREATE INDEX IF NOT EXISTS "idx_recipe_comments_recipe" ON "recipeComments" ("recipeId", "createdAt" DESC);

-- Social features indexes
CREATE INDEX IF NOT EXISTS "idx_user_follows_follower" ON "userFollows" ("followerId");
CREATE INDEX IF NOT EXISTS "idx_user_follows_following" ON "userFollows" ("followingId");

-- Notifications indexes
CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread" ON "notifications" ("userId", "isRead", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_notifications_type" ON "notifications" ("type");

-- Meal planning indexes
CREATE INDEX IF NOT EXISTS "idx_meal_plans_user_date" ON "mealPlans" ("userId", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS "idx_meal_plan_entries_plan_date" ON "mealPlanEntries" ("planId", "date");

-- Shopping list indexes
CREATE INDEX IF NOT EXISTS "idx_shopping_lists_user" ON "shoppingLists" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_shopping_list_items_list" ON "shoppingListItems" ("listId");

-- Enhanced ingredient indexes
CREATE INDEX IF NOT EXISTS "idx_ingredients_category" ON "ingredients" ("categoryId");
CREATE INDEX IF NOT EXISTS "idx_ingredients_tags" ON "ingredients" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "idx_ingredients_active" ON "ingredients" ("isActive");

-- ===== INSERT DEFAULT DATA =====

-- Default ingredient categories
INSERT INTO "ingredientCategories" ("name", "description", "color", "sortOrder") VALUES
  ('Proteins', 'Meat, fish, eggs, legumes', '#FF6B6B', 1),
  ('Vegetables', 'Fresh and frozen vegetables', '#4ECDC4', 2),
  ('Fruits', 'Fresh and dried fruits', '#45B7D1', 3),
  ('Grains', 'Rice, pasta, bread, cereals', '#96CEB4', 4),
  ('Dairy', 'Milk, cheese, yogurt', '#FFEAA7', 5),
  ('Spices & Herbs', 'Seasonings and flavorings', '#DDA0DD', 6),
  ('Condiments & Sauces', 'Dressings, sauces, oils', '#98D8C8', 7),
  ('Beverages', 'Drinks and liquids', '#74B9FF', 8),
  ('Snacks', 'Nuts, crackers, chips', '#FDCB6E', 9),
  ('Baking', 'Flour, sugar, baking supplies', '#E17055', 10)
ON CONFLICT (name) DO NOTHING;

-- ===== TRIGGERS FOR UPDATED_AT =====

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON "ingredients"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON "userPreferences"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_recipe_ratings_updated_at BEFORE UPDATE ON "recipeRatings"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_recipe_collections_updated_at BEFORE UPDATE ON "recipeCollections"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_ingredient_categories_updated_at BEFORE UPDATE ON "ingredientCategories"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_recipe_shares_updated_at BEFORE UPDATE ON "recipeShares"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_recipe_comments_updated_at BEFORE UPDATE ON "recipeComments"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON "mealPlans"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON "shoppingLists"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ===== VIEWS FOR COMMON QUERIES =====

-- Popular recipes view
CREATE OR REPLACE VIEW "popularRecipes" AS
SELECT 
    r."recipeId",
    r."title",
    r."cuisine",
    r."difficulty",
    r."cookingTime",
    COUNT(DISTINCT sr."userId") as "saveCount",
    COALESCE(AVG(rr."rating"), 0) as "avgRating",
    COUNT(DISTINCT rr."userId") as "ratingCount"
FROM "recipes" r
LEFT JOIN "savedRecipes" sr ON r."recipeId" = sr."recipeId"
LEFT JOIN "recipeRatings" rr ON r."recipeId" = rr."recipeId"
GROUP BY r."recipeId", r."title", r."cuisine", r."difficulty", r."cookingTime";

-- User recipe statistics view
CREATE OR REPLACE VIEW "userRecipeStats" AS
SELECT 
    u."userId",
    u."name",
    COUNT(DISTINCT r."recipeId") as "totalRecipes",
    COUNT(DISTINCT sr."recipeId") as "savedRecipes",
    COALESCE(AVG(rr."rating"), 0) as "avgRatingGiven",
    COUNT(DISTINCT rr."recipeId") as "recipesRated"
FROM "users" u
LEFT JOIN "recipes" r ON u."userId" = r."userId"
LEFT JOIN "savedRecipes" sr ON u."userId" = sr."userId"
LEFT JOIN "recipeRatings" rr ON u."userId" = rr."userId"
GROUP BY u."userId", u."name";

-- Active meal plans view
CREATE OR REPLACE VIEW "activeMealPlans" AS
SELECT 
    mp.*,
    COUNT(mpe."entryId") as "totalMeals",
    COUNT(CASE WHEN mpe."isCompleted" = true THEN 1 END) as "completedMeals"
FROM "mealPlans" mp
LEFT JOIN "mealPlanEntries" mpe ON mp."planId" = mpe."planId"
WHERE mp."isActive" = true 
    AND mp."startDate" <= CURRENT_DATE 
    AND mp."endDate" >= CURRENT_DATE
GROUP BY mp."planId"; 