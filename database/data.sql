-- USERS
INSERT INTO "users" ("userId", "email", "name")
VALUES
  (1, 'kyle@example.com', 'Kyle Spence'),
  (2, 'lily@example.com', 'Lily S.');

-- INGREDIENTS
INSERT INTO "ingredients" ("ingredientId", "name", "category")
VALUES
  (1, 'chicken breast', 'protein'),
  (2, 'broccoli', 'vegetable'),
  (3, 'garlic', 'spice'),
  (4, 'soy sauce', 'condiment'),
  (5, 'salmon', 'protein'),
  (6, 'quinoa', 'grain');

-- USER INGREDIENT PREFERENCES
INSERT INTO "userIngredientPreferences" ("userId", "ingredientId", "preference")
VALUES
  (1, 1, 'like'),   -- Kyle likes chicken
  (1, 2, 'like'),   -- Kyle likes broccoli
  (1, 5, 'dislike'),-- Kyle dislikes salmon
  (2, 3, 'stretch');-- Lily is stretching toward garlic

-- USER PREFERENCES (Broader)
INSERT INTO "userPreferences" (
  "userId", "dietaryRestrictions", "allergies",
  "cuisinePreferences", "spiceLevel", "maxCookingTime", "servingSize"
)
VALUES (
  1,
  ARRAY['gluten-free'],
  ARRAY['peanuts'],
  ARRAY['asian', 'mediterranean'],
  'medium',
  30,
  2
);

-- RECIPES
INSERT INTO "recipes" (
  "recipeId", "userId", "title", "description",
  "instructions", "cookingTime", "prepTime", "servings",
  "cuisine", "difficulty", "spiceLevel", "isFavorite",
  "isGenerated", "generatedPrompt"
)
VALUES (
  1,
  1,
  'Garlic Chicken Stir Fry',
  'Quick and tasty stir fry with chicken and veggies.',
  '1. Cook chicken. 2. Add veggies and garlic. 3. Stir in soy sauce. 4. Serve hot.',
  15,
  10,
  2,
  'asian',
  'easy',
  'medium',
  true,
  true,
  'Make a 15-minute Asian stir fry with chicken and broccoli.'
);

-- RECIPE INGREDIENTS
INSERT INTO "recipeIngredients" ("recipeId", "ingredientId", "quantity")
VALUES
  (1, 1, '200g'),
  (1, 2, '1 cup'),
  (1, 3, '2 cloves'),
  (1, 4, '2 tbsp');

-- FRIDGE ITEMS
INSERT INTO "fridgeItems" ("userId", "ingredientId", "quantity", "expiresOn")
VALUES
  (1, 1, '2 pieces', CURRENT_DATE + INTERVAL '3 days'),
  (1, 2, '1 head', CURRENT_DATE + INTERVAL '5 days'),
  (1, 4, '1 bottle', NULL);