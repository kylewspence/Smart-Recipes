import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
    console.log('Setting up Playwright tests...')

    // Create a test user and get authentication token
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
        // Wait for servers to be ready
        const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'
        const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001'

        // Health check for frontend
        console.log('Checking frontend server...')
        await page.goto(baseURL)
        await page.waitForLoadState('networkidle')

        // Health check for backend
        console.log('Checking backend server...')
        const response = await page.request.get(`${apiURL}/api/health`)
        if (!response.ok()) {
            throw new Error(`Backend server not ready: ${response.status()}`)
        }

        // Create test user for authentication tests
        console.log('Creating test user...')
        const testUser = {
            email: 'test@smartrecipes.com',
            password: 'TestPassword123!',
            name: 'Test User',
        }

        // Try to register test user (might already exist)
        try {
            await page.request.post(`${apiURL}/api/auth/register`, {
                data: testUser,
            })
            console.log('Test user created successfully')
        } catch (error) {
            console.log('Test user might already exist, continuing...')
        }

        // Login and save authentication state
        console.log('Logging in test user...')
        const loginResponse = await page.request.post(`${apiURL}/api/auth/login`, {
            data: {
                email: testUser.email,
                password: testUser.password,
            },
        })

        if (loginResponse.ok()) {
            const loginData = await loginResponse.json()

            // Save authentication state
            await page.context().storageState({ path: 'e2e/.auth/user.json' })

            // Store token in environment for API tests
            process.env.PLAYWRIGHT_AUTH_TOKEN = loginData.token
            process.env.PLAYWRIGHT_TEST_USER_EMAIL = testUser.email
            process.env.PLAYWRIGHT_TEST_USER_PASSWORD = testUser.password

            console.log('Authentication state saved')
        } else {
            console.warn('Failed to login test user, some tests may fail')
        }

        // Create test data
        console.log('Creating test data...')
        await createTestData(page, apiURL)

    } catch (error) {
        console.error('Global setup failed:', error)
        throw error
    } finally {
        await browser.close()
    }

    console.log('Playwright setup completed successfully')
}

async function createTestData(page: any, apiURL: string) {
    const authToken = process.env.PLAYWRIGHT_AUTH_TOKEN
    if (!authToken) {
        console.warn('No auth token available, skipping test data creation')
        return
    }

    try {
        // Create test recipes
        const testRecipes = [
            {
                title: 'Test Pasta Recipe',
                description: 'A simple pasta recipe for testing',
                ingredients: ['pasta', 'tomato sauce', 'cheese'],
                instructions: ['Boil pasta', 'Add sauce', 'Serve with cheese'],
                cookingTime: 20,
                difficulty: 'easy',
                servings: 4,
                cuisine: 'Italian',
            },
            {
                title: 'Test Salad Recipe',
                description: 'A healthy salad for testing',
                ingredients: ['lettuce', 'tomatoes', 'cucumber', 'dressing'],
                instructions: ['Chop vegetables', 'Mix together', 'Add dressing'],
                cookingTime: 10,
                difficulty: 'easy',
                servings: 2,
                cuisine: 'Mediterranean',
            },
        ]

        for (const recipe of testRecipes) {
            try {
                await page.request.post(`${apiURL}/api/recipes`, {
                    data: recipe,
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                })
            } catch (error) {
                console.warn('Failed to create test recipe:', error)
            }
        }

        // Create test preferences
        const testPreferences = {
            dietaryRestrictions: ['vegetarian'],
            allergies: ['nuts'],
            dislikes: ['spicy'],
            favoriteIngredients: ['tomatoes', 'cheese'],
            cookingSkill: 'intermediate',
            availableTime: 30,
            servingSize: 4,
        }

        try {
            await page.request.put(`${apiURL}/api/user/preferences`, {
                data: testPreferences,
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            })
        } catch (error) {
            console.warn('Failed to create test preferences:', error)
        }

        console.log('Test data created successfully')
    } catch (error) {
        console.warn('Failed to create test data:', error)
    }
}

export default globalSetup 