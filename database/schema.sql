-- Reset schema
SET client_min_messages TO warning;
DROP SCHEMA "public" CASCADE;
CREATE SCHEMA "public";

-- Users table
CREATE TABLE "users" (
  "userId"       SERIAL PRIMARY KEY,
  "email"        TEXT UNIQUE NOT NULL,
  "name"         TEXT NOT NULL,
  "createdAt"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Ingredient catalog
CREATE TABLE "ingredients" (
  "ingredientId" SERIAL PRIMARY KEY,
  "name"         TEXT UNIQUE NOT NULL,
  "category"     TEXT, -- optional: 'protein', 'vegetable', 'spice', etc.
  "createdAt"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- User-specific preferences (normalized)
CREATE TABLE "userIngredientPreferences" (
  "id"           SERIAL PRIMARY KEY,
  "userId"       INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "ingredientId" INTEGER NOT NULL REFERENCES "ingredients"("ingredientId") ON DELETE CASCADE,
  "preference"   TEXT NOT NULL CHECK ("preference" IN ('like', 'dislike', 'stretch')),
  UNIQUE ("userId", "ingredientId") -- Prevent duplicate user-ingredient combinations
);

-- Broader user dietary preferences
CREATE TABLE "userPreferences" (
  "preferenceId"       SERIAL PRIMARY KEY,
  "userId"             INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "dietaryRestrictions" TEXT[], -- ['vegetarian', 'gluten-free', 'dairy-free']
  "allergies"          TEXT[],
  "cuisinePreferences" TEXT[], -- ['italian', 'mexican', 'asian', etc.]
  "spiceLevel"         TEXT CHECK ("spiceLevel" IN ('mild', 'medium', 'hot')),
  "maxCookingTime"     INTEGER, -- in minutes
  "servingSize"        INTEGER DEFAULT 4,
  "createdAt"          TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("userId") -- One preference record per user
);

-- AI-generated and saved recipes
CREATE TABLE "recipes" (
  "recipeId"       SERIAL PRIMARY KEY,
  "userId"         INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "title"          TEXT NOT NULL,
  "description"    TEXT,
  "instructions"   TEXT NOT NULL,
  "cookingTime"    INTEGER,
  "prepTime"       INTEGER,
  "servings"       INTEGER,
  "cuisine"        TEXT,
  "difficulty"     TEXT CHECK ("difficulty" IN ('easy', 'medium', 'hard')),
  "spiceLevel"     TEXT CHECK ("spiceLevel" IN ('mild', 'medium', 'hot')),
  "isFavorite"     BOOLEAN DEFAULT FALSE,
  "isGenerated"    BOOLEAN DEFAULT TRUE,
  "generatedPrompt" TEXT,
  "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Recipe ratings and reviews
CREATE TABLE "recipeRatings" (
  "id"         SERIAL PRIMARY KEY,
  "recipeId"   INTEGER NOT NULL REFERENCES "recipes"("recipeId") ON DELETE CASCADE,
  "userId"     INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "rating"     INTEGER NOT NULL CHECK ("rating" >= 1 AND "rating" <= 5),
  "review"     TEXT,
  "createdAt"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("recipeId", "userId") -- One rating per user per recipe
);

-- Recipe collections (user-created groups of recipes)
CREATE TABLE "recipeCollections" (
  "collectionId" SERIAL PRIMARY KEY,
  "userId"       INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "name"         TEXT NOT NULL,
  "description"  TEXT,
  "isPublic"     BOOLEAN DEFAULT FALSE,
  "createdAt"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("userId", "name") -- Unique collection names per user
);

-- Many-to-many: recipes in collections
CREATE TABLE "collectionRecipes" (
  "collectionId" INTEGER NOT NULL REFERENCES "recipeCollections"("collectionId") ON DELETE CASCADE,
  "recipeId"     INTEGER NOT NULL REFERENCES "recipes"("recipeId") ON DELETE CASCADE,
  "addedAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("collectionId", "recipeId")
);

-- Many-to-many relationship: ingredients in a recipe
CREATE TABLE "recipeIngredients" (
  "recipeId"     INTEGER NOT NULL REFERENCES "recipes"("recipeId") ON DELETE CASCADE,
  "ingredientId" INTEGER NOT NULL REFERENCES "ingredients"("ingredientId"),
  "quantity"     TEXT,
  PRIMARY KEY ("recipeId", "ingredientId")
);

-- Recipe tags (e.g. 'low-carb', 'quick', 'comfort food')
CREATE TABLE "recipeTags" (
  "tagId"     SERIAL PRIMARY KEY,
  "recipeId"  INTEGER NOT NULL REFERENCES "recipes"("recipeId") ON DELETE CASCADE,
  "tag"       TEXT NOT NULL
);

-- Fridge inventory: what's on hand
CREATE TABLE "fridgeItems" (
  "itemId"       SERIAL PRIMARY KEY,
  "userId"       INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "ingredientId" INTEGER NOT NULL REFERENCES "ingredients"("ingredientId"),
  "quantity"     TEXT,
  "expiresOn"    DATE
);

-- Saved/favorited recipes
CREATE TABLE "savedRecipes" (
  "id"        SERIAL PRIMARY KEY,
  "userId"    INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "recipeId"  INTEGER NOT NULL REFERENCES "recipes"("recipeId") ON DELETE CASCADE,
  "savedAt"   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("userId", "recipeId") -- Prevent duplicate saves
);

-- Indexes for performance
CREATE INDEX ON "recipes" ("userId");
CREATE INDEX ON "recipes" ("cuisine");
CREATE INDEX ON "recipes" ("difficulty");
CREATE INDEX ON "recipes" ("cookingTime");
CREATE INDEX ON "recipes" ("isFavorite");
CREATE INDEX ON "recipeRatings" ("recipeId");
CREATE INDEX ON "recipeRatings" ("userId");
CREATE INDEX ON "recipeTags" ("tag");
CREATE INDEX ON "recipeTags" ("recipeId");
CREATE INDEX ON "userIngredientPreferences" ("userId", "preference");
CREATE INDEX ON "fridgeItems" ("userId");
CREATE INDEX ON "savedRecipes" ("userId");
CREATE INDEX ON "collectionRecipes" ("collectionId");
CREATE INDEX ON "recipeCollections" ("userId", "isPublic");