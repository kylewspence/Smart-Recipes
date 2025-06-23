-- Enhanced sample data for Smart Recipes
-- Updated to work with the new enhanced schema

-- USERS (add some enhanced profile data)
UPDATE "users" SET 
  "bio" = 'Love cooking healthy and delicious meals!',
  "location" = 'San Francisco, CA',
  "timezone" = 'America/Los_Angeles'
WHERE "userId" = 1;

UPDATE "users" SET 
  "bio" = 'Always exploring new cuisines and flavors.',
  "location" = 'New York, NY', 
  "timezone" = 'America/New_York'
WHERE "userId" = 2;

-- INGREDIENTS (updated for enhanced schema with categories)
INSERT INTO "ingredients" ("ingredientId", "name", "categoryId", "nutrition", "tags", "aliases")
VALUES
  (1, 'chicken breast', 1, '{"calories": 231, "protein": 43.5, "fat": 5}', ARRAY['lean', 'protein'], ARRAY['chicken']),
  (2, 'broccoli', 2, '{"calories": 25, "protein": 3, "fiber": 3}', ARRAY['green', 'vitamin-c'], ARRAY['brocoli']),
  (3, 'garlic', 6, '{"calories": 4, "carbs": 1}', ARRAY['aromatic', 'flavor'], ARRAY['garlic clove']),
  (4, 'soy sauce', 7, '{"sodium": 879, "calories": 8}', ARRAY['umami', 'asian'], ARRAY['shoyu']),
  (5, 'salmon', 1, '{"calories": 208, "protein": 22, "omega3": true}', ARRAY['fish', 'healthy-fat'], ARRAY['atlantic salmon']),
  (6, 'quinoa', 4, '{"calories": 222, "protein": 8, "fiber": 5}', ARRAY['grain', 'gluten-free'], ARRAY['quinua'])
ON CONFLICT ("ingredientId") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  "nutrition" = EXCLUDED."nutrition",
  "tags" = EXCLUDED."tags",
  "aliases" = EXCLUDED."aliases";

-- USER INGREDIENT PREFERENCES
INSERT INTO "userIngredientPreferences" ("userId", "ingredientId", "preference")
VALUES
  (1, 1, 'like'),   -- Kyle likes chicken
  (1, 2, 'like'),   -- Kyle likes broccoli
  (1, 5, 'dislike'),-- Kyle dislikes salmon
  (2, 3, 'stretch') -- Lily is stretching toward garlic
ON CONFLICT ("userId", "ingredientId") DO NOTHING;

-- RECIPE INGREDIENTS (update to work with existing recipe)
INSERT INTO "recipeIngredients" ("recipeId", "ingredientId", "quantity")
VALUES
  (1, 1, '200g'),
  (1, 2, '1 cup'),
  (1, 3, '2 cloves'),
  (1, 4, '2 tbsp')
ON CONFLICT ("recipeId", "ingredientId") DO NOTHING;

-- FRIDGE ITEMS (update to work with enhanced schema)
INSERT INTO "fridgeItems" ("userId", "ingredientId", "quantity", "expiresOn")
VALUES
  (1, 1, '2 pieces', CURRENT_DATE + INTERVAL '3 days'),
  (1, 2, '1 head', CURRENT_DATE + INTERVAL '5 days'),
  (1, 4, '1 bottle', NULL)
ON CONFLICT DO NOTHING;

-- SAMPLE RECIPE RATINGS
INSERT INTO "recipeRatings" ("recipeId", "userId", "rating", "review")
VALUES
  (1, 1, 5, 'Absolutely delicious! Quick and easy to make.'),
  (1, 2, 4, 'Great flavors, will definitely make again.')
ON CONFLICT ("recipeId", "userId") DO NOTHING;

-- SAMPLE RECIPE COLLECTIONS
INSERT INTO "recipeCollections" ("userId", "name", "description")
VALUES
  (1, 'Quick Weeknight Dinners', 'Fast and easy recipes for busy nights'),
  (1, 'Healthy Options', 'Nutritious recipes for a balanced diet'),
  (2, 'Asian Favorites', 'My favorite Asian-inspired dishes')
ON CONFLICT ("userId", "name") DO NOTHING;

-- Add recipe to collections
INSERT INTO "collectionRecipes" ("collectionId", "recipeId")
SELECT c."collectionId", 1
FROM "recipeCollections" c
WHERE c."name" IN ('Quick Weeknight Dinners', 'Asian Favorites')
ON CONFLICT ("collectionId", "recipeId") DO NOTHING;

-- SAMPLE USER ACTIVITY
INSERT INTO "userActivity" ("userId", "activityType", "entityId", "entityType", "metadata")
VALUES
  (1, 'recipe_generated', 1, 'recipe', '{"prompt": "quick Asian stir fry", "duration": "15 minutes"}'),
  (1, 'recipe_rated', 1, 'recipe', '{"rating": 5, "previous_rating": null}'),
  (2, 'recipe_viewed', 1, 'recipe', '{"source": "shared_link"}'),
  (2, 'recipe_rated', 1, 'recipe', '{"rating": 4, "previous_rating": null}');

-- SAMPLE RECIPE SHARING
INSERT INTO "recipeShares" ("recipeId", "ownerId", "sharedWithId", "shareType", "permission")
VALUES
  (1, 1, 2, 'specific', 'view');

-- SAMPLE NOTIFICATIONS
INSERT INTO "notifications" ("userId", "type", "title", "message", "relatedId", "relatedType")
VALUES
  (2, 'recipe_shared', 'Recipe Shared', 'Kyle shared "Garlic Chicken Stir Fry" with you', 1, 'recipe'),
  (1, 'recipe_commented', 'New Comment', 'Lily commented on your recipe', 1, 'recipe');

-- SAMPLE MEAL PLAN
INSERT INTO "mealPlans" ("userId", "name", "description", "startDate", "endDate")
VALUES
  (1, 'This Week', 'Meal plan for this week', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days');

-- MEAL PLAN ENTRIES
INSERT INTO "mealPlanEntries" ("planId", "recipeId", "date", "mealType", "servings")
SELECT mp."planId", 1, CURRENT_DATE, 'dinner', 2
FROM "mealPlans" mp
WHERE mp."name" = 'This Week' AND mp."userId" = 1;

INSERT INTO "mealPlanEntries" ("planId", "recipeId", "date", "mealType", "servings")
SELECT mp."planId", 1, CURRENT_DATE + INTERVAL '2 days', 'lunch', 1
FROM "mealPlans" mp
WHERE mp."name" = 'This Week' AND mp."userId" = 1;

-- SAMPLE SHOPPING LIST
INSERT INTO "shoppingLists" ("userId", "name", "mealPlanId")
SELECT 1, 'Weekly Groceries', mp."planId"
FROM "mealPlans" mp
WHERE mp."name" = 'This Week' AND mp."userId" = 1;

-- SHOPPING LIST ITEMS
INSERT INTO "shoppingListItems" ("listId", "ingredientId", "name", "quantity", "category", "estimatedCost")
SELECT sl."listId", 1, 'chicken breast', '1 lb', 'Proteins', 8.99
FROM "shoppingLists" sl
WHERE sl."name" = 'Weekly Groceries' AND sl."userId" = 1;

INSERT INTO "shoppingListItems" ("listId", "ingredientId", "name", "quantity", "category", "estimatedCost")
SELECT sl."listId", 2, 'broccoli', '2 heads', 'Vegetables', 3.99
FROM "shoppingLists" sl
WHERE sl."name" = 'Weekly Groceries' AND sl."userId" = 1; 