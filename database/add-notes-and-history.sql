-- Database migration for Task 8.3: Add Recipe Editing, Rating & Notes
-- Adding personal notes and cooking history tracking

-- Personal recipe notes (user-specific notes on recipes)
CREATE TABLE IF NOT EXISTS "recipeNotes" (
  "noteId"     SERIAL PRIMARY KEY,
  "recipeId"   INTEGER NOT NULL REFERENCES "recipes"("recipeId") ON DELETE CASCADE,
  "userId"     INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "note"       TEXT NOT NULL,
  "noteType"   TEXT NOT NULL CHECK ("noteType" IN ('personal', 'modification', 'tip', 'review')) DEFAULT 'personal',
  "isPrivate"  BOOLEAN DEFAULT TRUE,
  "createdAt"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("recipeId", "userId", "noteType") -- One note per type per user per recipe
);

-- Cooking history (track when users cook recipes)
CREATE TABLE IF NOT EXISTS "cookingHistory" (
  "historyId"    SERIAL PRIMARY KEY,
  "recipeId"     INTEGER NOT NULL REFERENCES "recipes"("recipeId") ON DELETE CASCADE,
  "userId"       INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "cookedAt"     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "rating"       INTEGER CHECK ("rating" >= 1 AND "rating" <= 5),
  "notes"        TEXT, -- cooking notes for this session
  "modifications" JSONB, -- what they changed this time
  "cookingTime"  INTEGER, -- actual cooking time vs recipe time
  "servings"     INTEGER, -- actual servings made
  "success"      BOOLEAN DEFAULT TRUE, -- did the recipe turn out well?
  "wouldCookAgain" BOOLEAN
);

-- Recipe modifications tracking (version control for recipes)
CREATE TABLE IF NOT EXISTS "recipeModifications" (
  "modificationId" SERIAL PRIMARY KEY,
  "recipeId"       INTEGER NOT NULL REFERENCES "recipes"("recipeId") ON DELETE CASCADE,
  "userId"         INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "modificationType" TEXT NOT NULL CHECK ("modificationType" IN ('ingredient_change', 'instruction_change', 'time_change', 'serving_change', 'other')),
  "originalValue"  JSONB NOT NULL, -- what it was before
  "newValue"       JSONB NOT NULL, -- what it changed to
  "reason"         TEXT, -- why they made the change
  "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipe_notes_user_recipe ON "recipeNotes" ("userId", "recipeId");
CREATE INDEX IF NOT EXISTS idx_recipe_notes_type ON "recipeNotes" ("noteType");
CREATE INDEX IF NOT EXISTS idx_cooking_history_user ON "cookingHistory" ("userId");
CREATE INDEX IF NOT EXISTS idx_cooking_history_recipe ON "cookingHistory" ("recipeId");
CREATE INDEX IF NOT EXISTS idx_cooking_history_date ON "cookingHistory" ("cookedAt");
CREATE INDEX IF NOT EXISTS idx_recipe_modifications_user ON "recipeModifications" ("userId");
CREATE INDEX IF NOT EXISTS idx_recipe_modifications_recipe ON "recipeModifications" ("recipeId");
CREATE INDEX IF NOT EXISTS idx_recipe_modifications_type ON "recipeModifications" ("modificationType"); 