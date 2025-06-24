import { test, expect } from '@playwright/test'

test.describe('Recipe Generation', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/login')
        await page.fill('input[name="email"]', process.env.PLAYWRIGHT_TEST_USER_EMAIL!)
        await page.fill('input[name="password"]', process.env.PLAYWRIGHT_TEST_USER_PASSWORD!)
        await page.click('button[type="submit"]')
        await expect(page).toHaveURL('/dashboard')
    })

    test.describe('Recipe Generation Form', () => {
        test('should navigate to recipe generation page', async ({ page }) => {
            // Navigate to recipe generation from dashboard
            await page.click('text=Generate Recipe')
            await expect(page).toHaveURL('/recipes/generate')

            // Should show the recipe generation form
            await expect(page.locator('h1')).toContainText('Generate Recipe')
            await expect(page.locator('form')).toBeVisible()
        })

        test('should fill and submit basic recipe generation form', async ({ page }) => {
            await page.goto('/recipes/generate')

            // Add ingredients
            await page.fill('input[placeholder*="ingredient"]', 'tomatoes')
            await page.keyboard.press('Enter')
            await page.fill('input[placeholder*="ingredient"]', 'basil')
            await page.keyboard.press('Enter')

            // Select cuisine
            await page.selectOption('select[name="cuisine"]', 'Italian')

            // Select difficulty
            await page.click('input[value="easy"]')

            // Set cooking time
            await page.fill('input[name="cookingTime"]', '30')

            // Set servings
            await page.fill('input[name="servings"]', '4')

            // Submit form
            await page.click('button[type="submit"]')

            // Should show loading state
            await expect(page.locator('text=Generating')).toBeVisible()

            // Should eventually show generated recipe
            await expect(page.locator('[data-testid="generated-recipe"]')).toBeVisible({ timeout: 30000 })
        })

        test('should add and remove ingredients', async ({ page }) => {
            await page.goto('/recipes/generate')

            // Add ingredients
            const ingredientInput = page.locator('input[placeholder*="ingredient"]')
            await ingredientInput.fill('tomatoes')
            await page.keyboard.press('Enter')

            // Should show ingredient tag
            await expect(page.locator('text=tomatoes')).toBeVisible()

            // Add another ingredient
            await ingredientInput.fill('onions')
            await page.keyboard.press('Enter')
            await expect(page.locator('text=onions')).toBeVisible()

            // Remove first ingredient
            await page.click('button[aria-label="Remove tomatoes"]')
            await expect(page.locator('text=tomatoes')).not.toBeVisible()
            await expect(page.locator('text=onions')).toBeVisible()
        })

        test('should handle dietary restrictions', async ({ page }) => {
            await page.goto('/recipes/generate')

            // Open dietary restrictions section
            await page.click('text=Dietary Restrictions')

            // Select vegetarian
            await page.check('input[value="vegetarian"]')
            await expect(page.locator('input[value="vegetarian"]')).toBeChecked()

            // Select gluten-free
            await page.check('input[value="gluten-free"]')
            await expect(page.locator('input[value="gluten-free"]')).toBeChecked()

            // Uncheck vegetarian
            await page.uncheck('input[value="vegetarian"]')
            await expect(page.locator('input[value="vegetarian"]')).not.toBeChecked()
        })

        test('should handle allergies', async ({ page }) => {
            await page.goto('/recipes/generate')

            // Open allergies section
            await page.click('text=Allergies')

            // Add allergy
            const allergyInput = page.locator('input[placeholder*="allergy"]')
            await allergyInput.fill('nuts')
            await page.keyboard.press('Enter')

            // Should show allergy tag
            await expect(page.locator('text=nuts')).toBeVisible()

            // Remove allergy
            await page.click('button[aria-label="Remove nuts"]')
            await expect(page.locator('text=nuts')).not.toBeVisible()
        })

        test('should validate required fields', async ({ page }) => {
            await page.goto('/recipes/generate')

            // Try to submit without ingredients
            await page.click('button[type="submit"]')

            // Should show validation error
            await expect(page.locator('text=At least one ingredient is required')).toBeVisible()
        })

        test('should save generated recipe', async ({ page }) => {
            await page.goto('/recipes/generate')

            // Fill minimal form
            await page.fill('input[placeholder*="ingredient"]', 'pasta')
            await page.keyboard.press('Enter')
            await page.click('button[type="submit"]')

            // Wait for recipe generation
            await expect(page.locator('[data-testid="generated-recipe"]')).toBeVisible({ timeout: 30000 })

            // Save the recipe
            await page.click('button[data-testid="save-recipe"]')

            // Should show success message
            await expect(page.locator('text=Recipe saved')).toBeVisible()

            // Should be able to navigate to saved recipes
            await page.click('text=View Saved Recipes')
            await expect(page).toHaveURL('/recipes/saved')
        })

        test('should regenerate recipe with different parameters', async ({ page }) => {
            await page.goto('/recipes/generate')

            // Generate first recipe
            await page.fill('input[placeholder*="ingredient"]', 'chicken')
            await page.keyboard.press('Enter')
            await page.click('button[type="submit"]')
            await expect(page.locator('[data-testid="generated-recipe"]')).toBeVisible({ timeout: 30000 })

            const firstRecipeTitle = await page.locator('[data-testid="recipe-title"]').textContent()

            // Modify parameters and regenerate
            await page.click('button[data-testid="modify-recipe"]')
            await page.selectOption('select[name="cuisine"]', 'Asian')
            await page.click('button[type="submit"]')

            // Should generate new recipe
            await expect(page.locator('[data-testid="generated-recipe"]')).toBeVisible({ timeout: 30000 })

            const secondRecipeTitle = await page.locator('[data-testid="recipe-title"]').textContent()
            expect(secondRecipeTitle).not.toBe(firstRecipeTitle)
        })
    })

    test.describe('Recipe Display', () => {
        test('should display generated recipe with all details', async ({ page }) => {
            await page.goto('/recipes/generate')

            // Generate recipe
            await page.fill('input[placeholder*="ingredient"]', 'eggs')
            await page.keyboard.press('Enter')
            await page.fill('input[placeholder*="ingredient"]', 'milk')
            await page.keyboard.press('Enter')
            await page.selectOption('select[name="cuisine"]', 'French')
            await page.click('button[type="submit"]')

            // Wait for recipe
            await expect(page.locator('[data-testid="generated-recipe"]')).toBeVisible({ timeout: 30000 })

            // Check recipe components
            await expect(page.locator('[data-testid="recipe-title"]')).toBeVisible()
            await expect(page.locator('[data-testid="recipe-description"]')).toBeVisible()
            await expect(page.locator('[data-testid="recipe-ingredients"]')).toBeVisible()
            await expect(page.locator('[data-testid="recipe-instructions"]')).toBeVisible()
            await expect(page.locator('[data-testid="recipe-metadata"]')).toBeVisible()
        })

        test('should show recipe metadata correctly', async ({ page }) => {
            await page.goto('/recipes/generate')

            // Generate recipe with specific parameters
            await page.fill('input[placeholder*="ingredient"]', 'rice')
            await page.keyboard.press('Enter')
            await page.fill('input[name="cookingTime"]', '25')
            await page.fill('input[name="servings"]', '6')
            await page.click('input[value="medium"]')
            await page.click('button[type="submit"]')

            await expect(page.locator('[data-testid="generated-recipe"]')).toBeVisible({ timeout: 30000 })

            // Check metadata
            await expect(page.locator('text=25 min')).toBeVisible()
            await expect(page.locator('text=6 servings')).toBeVisible()
            await expect(page.locator('text=Medium')).toBeVisible()
        })

        test('should allow rating generated recipe', async ({ page }) => {
            await page.goto('/recipes/generate')

            // Generate and save recipe
            await page.fill('input[placeholder*="ingredient"]', 'potatoes')
            await page.keyboard.press('Enter')
            await page.click('button[type="submit"]')
            await expect(page.locator('[data-testid="generated-recipe"]')).toBeVisible({ timeout: 30000 })
            await page.click('button[data-testid="save-recipe"]')

            // Rate the recipe
            await page.click('[data-testid="star-4"]')
            await expect(page.locator('[data-testid="rating-display"]')).toContainText('4')
        })

        test('should share recipe', async ({ page }) => {
            await page.goto('/recipes/generate')

            // Generate recipe
            await page.fill('input[placeholder*="ingredient"]', 'bread')
            await page.keyboard.press('Enter')
            await page.click('button[type="submit"]')
            await expect(page.locator('[data-testid="generated-recipe"]')).toBeVisible({ timeout: 30000 })

            // Open share menu
            await page.click('button[data-testid="share-recipe"]')
            await expect(page.locator('[data-testid="share-menu"]')).toBeVisible()

            // Test copy link
            await page.click('button[data-testid="copy-link"]')
            await expect(page.locator('text=Link copied')).toBeVisible()
        })
    })

    test.describe('Error Handling', () => {
        test('should handle API errors gracefully', async ({ page }) => {
            // Mock API failure
            await page.route('**/api/recipes/generate', route => {
                route.fulfill({
                    status: 500,
                    body: JSON.stringify({ error: 'Server error' }),
                })
            })

            await page.goto('/recipes/generate')
            await page.fill('input[placeholder*="ingredient"]', 'test')
            await page.keyboard.press('Enter')
            await page.click('button[type="submit"]')

            // Should show error message
            await expect(page.locator('text=Failed to generate recipe')).toBeVisible()
            await expect(page.locator('button[data-testid="retry-generation"]')).toBeVisible()
        })

        test('should handle network errors', async ({ page }) => {
            await page.goto('/recipes/generate')

            // Simulate offline
            await page.context().setOffline(true)

            await page.fill('input[placeholder*="ingredient"]', 'test')
            await page.keyboard.press('Enter')
            await page.click('button[type="submit"]')

            // Should show offline message
            await expect(page.locator('text=You are offline')).toBeVisible()
            await expect(page.locator('text=Recipe generation requires an internet connection')).toBeVisible()
        })

        test('should retry failed generation', async ({ page }) => {
            let requestCount = 0

            // Mock API to fail first time, succeed second time
            await page.route('**/api/recipes/generate', route => {
                requestCount++
                if (requestCount === 1) {
                    route.fulfill({
                        status: 500,
                        body: JSON.stringify({ error: 'Server error' }),
                    })
                } else {
                    route.continue()
                }
            })

            await page.goto('/recipes/generate')
            await page.fill('input[placeholder*="ingredient"]', 'test')
            await page.keyboard.press('Enter')
            await page.click('button[type="submit"]')

            // Should show error first
            await expect(page.locator('text=Failed to generate recipe')).toBeVisible()

            // Retry
            await page.click('button[data-testid="retry-generation"]')

            // Should succeed on retry
            await expect(page.locator('[data-testid="generated-recipe"]')).toBeVisible({ timeout: 30000 })
        })
    })

    test.describe('Mobile Experience', () => {
        test('should work on mobile devices', async ({ page, isMobile }) => {
            test.skip(!isMobile, 'Mobile-specific test')

            await page.goto('/recipes/generate')

            // Should be responsive
            await expect(page.locator('form')).toBeVisible()

            // Touch interactions should work
            await page.tap('input[placeholder*="ingredient"]')
            await page.fill('input[placeholder*="ingredient"]', 'mobile-test')
            await page.keyboard.press('Enter')

            await page.tap('button[type="submit"]')
            await expect(page.locator('text=Generating')).toBeVisible()
        })
    })
}) 