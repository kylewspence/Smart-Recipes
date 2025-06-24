import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
    test.beforeEach(async ({ page }) => {
        // Start from the home page
        await page.goto('/')
    })

    test.describe('Registration', () => {
        test('should register a new user successfully', async ({ page }) => {
            // Navigate to registration page
            await page.click('text=Sign Up')
            await expect(page).toHaveURL('/register')

            // Fill registration form
            const timestamp = Date.now()
            const email = `newuser${timestamp}@test.com`

            await page.fill('input[name="name"]', 'New Test User')
            await page.fill('input[name="email"]', email)
            await page.fill('input[name="password"]', 'Password123!')
            await page.fill('input[name="confirmPassword"]', 'Password123!')

            // Submit form
            await page.click('button[type="submit"]')

            // Should redirect to onboarding or dashboard
            await expect(page).toHaveURL(/\/(onboarding|dashboard)/)

            // Should show success message or user info
            await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 10000 })
        })

        test('should show validation errors for invalid input', async ({ page }) => {
            await page.click('text=Sign Up')
            await expect(page).toHaveURL('/register')

            // Try to submit empty form
            await page.click('button[type="submit"]')

            // Should show validation errors
            await expect(page.locator('text=Name is required')).toBeVisible()
            await expect(page.locator('text=Email is required')).toBeVisible()
            await expect(page.locator('text=Password is required')).toBeVisible()
        })

        test('should show error for mismatched passwords', async ({ page }) => {
            await page.click('text=Sign Up')

            await page.fill('input[name="name"]', 'Test User')
            await page.fill('input[name="email"]', 'test@example.com')
            await page.fill('input[name="password"]', 'Password123!')
            await page.fill('input[name="confirmPassword"]', 'DifferentPassword!')

            await page.click('button[type="submit"]')

            await expect(page.locator('text=Passwords do not match')).toBeVisible()
        })

        test('should show error for existing email', async ({ page }) => {
            await page.click('text=Sign Up')

            // Use the test user email that already exists
            await page.fill('input[name="name"]', 'Test User')
            await page.fill('input[name="email"]', process.env.PLAYWRIGHT_TEST_USER_EMAIL!)
            await page.fill('input[name="password"]', 'Password123!')
            await page.fill('input[name="confirmPassword"]', 'Password123!')

            await page.click('button[type="submit"]')

            await expect(page.locator('text=Email already exists')).toBeVisible()
        })
    })

    test.describe('Login', () => {
        test('should login existing user successfully', async ({ page }) => {
            // Navigate to login page
            await page.click('text=Sign In')
            await expect(page).toHaveURL('/login')

            // Fill login form
            await page.fill('input[name="email"]', process.env.PLAYWRIGHT_TEST_USER_EMAIL!)
            await page.fill('input[name="password"]', process.env.PLAYWRIGHT_TEST_USER_PASSWORD!)

            // Submit form
            await page.click('button[type="submit"]')

            // Should redirect to dashboard
            await expect(page).toHaveURL('/dashboard')

            // Should show user info
            await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 })
        })

        test('should show validation errors for empty fields', async ({ page }) => {
            await page.click('text=Sign In')

            // Try to submit empty form
            await page.click('button[type="submit"]')

            // Should show validation errors
            await expect(page.locator('text=Email is required')).toBeVisible()
            await expect(page.locator('text=Password is required')).toBeVisible()
        })

        test('should show error for invalid credentials', async ({ page }) => {
            await page.click('text=Sign In')

            await page.fill('input[name="email"]', 'wrong@example.com')
            await page.fill('input[name="password"]', 'wrongpassword')

            await page.click('button[type="submit"]')

            await expect(page.locator('text=Invalid credentials')).toBeVisible()
        })

        test('should toggle password visibility', async ({ page }) => {
            await page.click('text=Sign In')

            const passwordInput = page.locator('input[name="password"]')
            const toggleButton = page.locator('button[aria-label*="password visibility"]')

            // Password should be hidden by default
            await expect(passwordInput).toHaveAttribute('type', 'password')

            // Click toggle to show password
            await toggleButton.click()
            await expect(passwordInput).toHaveAttribute('type', 'text')

            // Click toggle to hide password again
            await toggleButton.click()
            await expect(passwordInput).toHaveAttribute('type', 'password')
        })

        test('should support keyboard navigation', async ({ page }) => {
            await page.click('text=Sign In')

            // Tab through form elements
            await page.keyboard.press('Tab')
            await expect(page.locator('input[name="email"]')).toBeFocused()

            await page.keyboard.press('Tab')
            await expect(page.locator('input[name="password"]')).toBeFocused()

            await page.keyboard.press('Tab')
            await expect(page.locator('button[aria-label*="password visibility"]')).toBeFocused()

            await page.keyboard.press('Tab')
            await expect(page.locator('button[type="submit"]')).toBeFocused()
        })

        test('should submit form with Enter key', async ({ page }) => {
            await page.click('text=Sign In')

            await page.fill('input[name="email"]', process.env.PLAYWRIGHT_TEST_USER_EMAIL!)
            await page.fill('input[name="password"]', process.env.PLAYWRIGHT_TEST_USER_PASSWORD!)

            // Press Enter to submit
            await page.keyboard.press('Enter')

            // Should redirect to dashboard
            await expect(page).toHaveURL('/dashboard')
        })
    })

    test.describe('Logout', () => {
        test('should logout user successfully', async ({ page }) => {
            // Login first
            await page.goto('/login')
            await page.fill('input[name="email"]', process.env.PLAYWRIGHT_TEST_USER_EMAIL!)
            await page.fill('input[name="password"]', process.env.PLAYWRIGHT_TEST_USER_PASSWORD!)
            await page.click('button[type="submit"]')
            await expect(page).toHaveURL('/dashboard')

            // Logout
            await page.click('button[aria-label="User menu"]')
            await page.click('text=Logout')

            // Should redirect to home page
            await expect(page).toHaveURL('/')

            // Should show login/register options again
            await expect(page.locator('text=Sign In')).toBeVisible()
            await expect(page.locator('text=Sign Up')).toBeVisible()
        })
    })

    test.describe('Protected Routes', () => {
        test('should redirect to login when accessing protected route without auth', async ({ page }) => {
            // Try to access dashboard without authentication
            await page.goto('/dashboard')

            // Should redirect to login
            await expect(page).toHaveURL('/login')
        })

        test('should redirect to login when accessing preferences without auth', async ({ page }) => {
            // Try to access preferences without authentication
            await page.goto('/preferences')

            // Should redirect to login
            await expect(page).toHaveURL('/login')
        })

        test('should allow access to protected routes when authenticated', async ({ page }) => {
            // Login first
            await page.goto('/login')
            await page.fill('input[name="email"]', process.env.PLAYWRIGHT_TEST_USER_EMAIL!)
            await page.fill('input[name="password"]', process.env.PLAYWRIGHT_TEST_USER_PASSWORD!)
            await page.click('button[type="submit"]')

            // Should be able to access dashboard
            await page.goto('/dashboard')
            await expect(page).toHaveURL('/dashboard')

            // Should be able to access preferences
            await page.goto('/preferences')
            await expect(page).toHaveURL('/preferences')
        })
    })

    test.describe('Session Persistence', () => {
        test('should maintain session across page reloads', async ({ page }) => {
            // Login
            await page.goto('/login')
            await page.fill('input[name="email"]', process.env.PLAYWRIGHT_TEST_USER_EMAIL!)
            await page.fill('input[name="password"]', process.env.PLAYWRIGHT_TEST_USER_PASSWORD!)
            await page.click('button[type="submit"]')
            await expect(page).toHaveURL('/dashboard')

            // Reload page
            await page.reload()

            // Should still be logged in
            await expect(page).toHaveURL('/dashboard')
            await expect(page.locator('text=Welcome back')).toBeVisible()
        })

        test('should handle expired tokens gracefully', async ({ page }) => {
            // This test would require manipulating the token expiration
            // For now, we'll test the logout scenario
            await page.goto('/login')
            await page.fill('input[name="email"]', process.env.PLAYWRIGHT_TEST_USER_EMAIL!)
            await page.fill('input[name="password"]', process.env.PLAYWRIGHT_TEST_USER_PASSWORD!)
            await page.click('button[type="submit"]')

            // Clear localStorage to simulate expired token
            await page.evaluate(() => localStorage.clear())
            await page.reload()

            // Should redirect to login
            await expect(page).toHaveURL('/login')
        })
    })
}) 