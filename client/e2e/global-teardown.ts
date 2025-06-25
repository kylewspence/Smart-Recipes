import { chromium, FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
    console.log('Cleaning up Playwright tests...')

    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
        const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001'
        const authToken = process.env.PLAYWRIGHT_AUTH_TOKEN

        if (authToken) {
            console.log('Cleaning up test data...')

            // Clean up test recipes
            try {
                const recipesResponse = await page.request.get(`${apiURL}/api/recipes/user`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                    },
                })

                if (recipesResponse.ok()) {
                    const recipes = await recipesResponse.json()

                    for (const recipe of recipes) {
                        if (recipe.title.includes('Test')) {
                            try {
                                await page.request.delete(`${apiURL}/api/recipes/${recipe.id}`, {
                                    headers: {
                                        'Authorization': `Bearer ${authToken}`,
                                    },
                                })
                            } catch (error) {
                                console.warn(`Failed to delete test recipe ${recipe.id}:`, error)
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn('Failed to clean up test recipes:', error)
            }

            // Reset test user preferences
            try {
                await page.request.put(`${apiURL}/api/user/preferences`, {
                    data: {
                        dietaryRestrictions: [],
                        allergies: [],
                        dislikes: [],
                        favoriteIngredients: [],
                        cookingSkill: 'beginner',
                        availableTime: 60,
                        servingSize: 2,
                    },
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                })
            } catch (error) {
                console.warn('Failed to reset test user preferences:', error)
            }

            console.log('Test data cleanup completed')
        }

        // Clean up authentication files
        const fs = require('fs')
        const path = require('path')

        const authDir = path.join(__dirname, '.auth')
        if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true })
            console.log('Authentication files cleaned up')
        }

    } catch (error) {
        console.error('Global teardown failed:', error)
    } finally {
        await browser.close()
    }

    console.log('Playwright teardown completed')
}

export default globalTeardown 