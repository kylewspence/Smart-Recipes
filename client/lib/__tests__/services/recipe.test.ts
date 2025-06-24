import { recipeService } from '@/lib/services/recipe'
import { offlineService } from '@/lib/services/offline'

// Mock the offline service
jest.mock('@/lib/services/offline', () => ({
    offlineService: {
        getNetworkStatus: jest.fn(),
        cacheRecipe: jest.fn(),
        getCachedRecipe: jest.fn(),
        getCachedRecipes: jest.fn(),
        addOfflineFavorite: jest.fn(),
        removeOfflineFavorite: jest.fn(),
        isOfflineFavorite: jest.fn(),
        addPendingSync: jest.fn(),
    },
}))

const mockRecipe = global.testUtils.createMockRecipe()

describe('RecipeService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        global.fetch.mockClear()
        localStorage.clear()

        // Default to online status
        offlineService.getNetworkStatus.mockReturnValue({
            isOnline: true,
            isSyncing: false,
        })
    })

    describe('generateRecipe', () => {
        it('generates recipe successfully when online', async () => {
            const mockResponse = {
                recipe: mockRecipe,
                generatedPrompt: 'Test prompt',
            }

            global.testUtils.mockApiResponse(mockResponse)

            const params = {
                ingredients: ['tomatoes', 'basil'],
                cuisine: 'Italian',
                difficulty: 'easy' as const,
            }

            const result = await recipeService.generateRecipe(params)

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/recipes/generate',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify(params),
                })
            )

            expect(result).toEqual(mockResponse)
            expect(offlineService.cacheRecipe).toHaveBeenCalledWith(mockRecipe)
        })

        it('throws error when offline', async () => {
            offlineService.getNetworkStatus.mockReturnValue({
                isOnline: false,
                isSyncing: false,
            })

            const params = {
                ingredients: ['tomatoes', 'basil'],
            }

            await expect(recipeService.generateRecipe(params)).rejects.toThrow(
                'Recipe generation requires an internet connection'
            )
        })

        it('includes authorization header when token exists', async () => {
            localStorage.setItem('token', 'test-token')
            global.testUtils.mockApiResponse({ recipe: mockRecipe, generatedPrompt: 'Test' })

            await recipeService.generateRecipe({ ingredients: ['test'] })

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token',
                    }),
                })
            )
        })

        it('handles API errors correctly', async () => {
            global.testUtils.mockApiError('Server error', 500)

            await expect(recipeService.generateRecipe({ ingredients: ['test'] })).rejects.toThrow(
                'HTTP 500: Server error'
            )
        })
    })

    describe('getRecipe', () => {
        it('fetches recipe from API when online and not cached', async () => {
            global.testUtils.mockApiResponse(mockRecipe)
            offlineService.getCachedRecipe.mockResolvedValue(null)

            const result = await recipeService.getRecipe('1')

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/recipes/1',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                })
            )

            expect(result).toEqual(mockRecipe)
            expect(offlineService.cacheRecipe).toHaveBeenCalledWith(mockRecipe)
        })

        it('returns cached recipe when offline', async () => {
            offlineService.getNetworkStatus.mockReturnValue({
                isOnline: false,
                isSyncing: false,
            })
            offlineService.getCachedRecipe.mockResolvedValue(mockRecipe)

            const result = await recipeService.getRecipe('1')

            expect(result).toEqual(mockRecipe)
            expect(global.fetch).not.toHaveBeenCalled()
        })

        it('falls back to cached recipe when API fails', async () => {
            global.testUtils.mockApiError('Network error')
            offlineService.getCachedRecipe.mockResolvedValue(mockRecipe)

            const result = await recipeService.getRecipe('1')

            expect(result).toEqual(mockRecipe)
        })

        it('throws error when offline and not cached', async () => {
            offlineService.getNetworkStatus.mockReturnValue({
                isOnline: false,
                isSyncing: false,
            })
            offlineService.getCachedRecipe.mockResolvedValue(null)

            await expect(recipeService.getRecipe('1')).rejects.toThrow(
                'Recipe not available offline'
            )
        })
    })

    describe('getUserRecipes', () => {
        it('fetches user recipes from API when online', async () => {
            const mockRecipes = [mockRecipe]
            global.testUtils.mockApiResponse(mockRecipes)

            const result = await recipeService.getUserRecipes()

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/recipes/user',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                })
            )

            expect(result).toEqual(mockRecipes)
            expect(offlineService.cacheRecipe).toHaveBeenCalledWith(mockRecipe)
        })

        it('returns cached recipes when offline', async () => {
            const mockRecipes = [mockRecipe]
            offlineService.getNetworkStatus.mockReturnValue({
                isOnline: false,
                isSyncing: false,
            })
            offlineService.getCachedRecipes.mockReturnValue(mockRecipes)

            const result = await recipeService.getUserRecipes()

            expect(result).toEqual(mockRecipes)
            expect(global.fetch).not.toHaveBeenCalled()
        })

        it('falls back to cached recipes when API fails', async () => {
            const mockRecipes = [mockRecipe]
            global.testUtils.mockApiError('Network error')
            offlineService.getCachedRecipes.mockReturnValue(mockRecipes)

            const result = await recipeService.getUserRecipes()

            expect(result).toEqual(mockRecipes)
        })
    })

    describe('favoriteRecipe', () => {
        it('favorites recipe when online', async () => {
            global.testUtils.mockApiResponse({})

            await recipeService.favoriteRecipe('1')

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/recipes/1/favorite',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                })
            )

            expect(offlineService.addOfflineFavorite).toHaveBeenCalledWith('1')
        })

        it('handles offline favoriting', async () => {
            offlineService.getNetworkStatus.mockReturnValue({
                isOnline: false,
                isSyncing: false,
            })

            await recipeService.favoriteRecipe('1')

            expect(global.fetch).not.toHaveBeenCalled()
            expect(offlineService.addOfflineFavorite).toHaveBeenCalledWith('1')
        })

        it('adds to offline favorites when API fails', async () => {
            global.testUtils.mockApiError('Network error')

            await expect(recipeService.favoriteRecipe('1')).rejects.toThrow('Network error')
            expect(offlineService.addOfflineFavorite).toHaveBeenCalledWith('1')
        })
    })

    describe('unfavoriteRecipe', () => {
        it('unfavorites recipe when online', async () => {
            global.testUtils.mockApiResponse({})

            await recipeService.unfavoriteRecipe('1')

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/recipes/1/favorite',
                expect.objectContaining({
                    method: 'DELETE',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                })
            )

            expect(offlineService.removeOfflineFavorite).toHaveBeenCalledWith('1')
        })

        it('handles offline unfavoriting', async () => {
            offlineService.getNetworkStatus.mockReturnValue({
                isOnline: false,
                isSyncing: false,
            })

            await recipeService.unfavoriteRecipe('1')

            expect(global.fetch).not.toHaveBeenCalled()
            expect(offlineService.removeOfflineFavorite).toHaveBeenCalledWith('1')
        })
    })

    describe('getFavoriteRecipes', () => {
        it('fetches favorite recipes from API when online', async () => {
            const mockRecipes = [mockRecipe]
            global.testUtils.mockApiResponse(mockRecipes)

            const result = await recipeService.getFavoriteRecipes()

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/recipes/favorites',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                })
            )

            expect(result).toEqual(mockRecipes)
            expect(offlineService.cacheRecipe).toHaveBeenCalledWith(mockRecipe)
            expect(offlineService.addOfflineFavorite).toHaveBeenCalledWith(mockRecipe.id.toString())
        })

        it('returns cached favorite recipes when offline', async () => {
            const mockRecipes = [mockRecipe]
            offlineService.getNetworkStatus.mockReturnValue({
                isOnline: false,
                isSyncing: false,
            })
            offlineService.getCachedRecipes.mockReturnValue(mockRecipes)
            offlineService.isOfflineFavorite.mockReturnValue(true)

            const result = await recipeService.getFavoriteRecipes()

            expect(result).toEqual(mockRecipes)
            expect(global.fetch).not.toHaveBeenCalled()
        })
    })

    describe('rateRecipe', () => {
        it('rates recipe successfully when online', async () => {
            global.testUtils.mockApiResponse({})

            await recipeService.rateRecipe('1', 5)

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/recipes/1/rate',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({ rating: 5 }),
                })
            )
        })

        it('throws error when offline', async () => {
            offlineService.getNetworkStatus.mockReturnValue({
                isOnline: false,
                isSyncing: false,
            })

            await expect(recipeService.rateRecipe('1', 5)).rejects.toThrow(
                'Rating recipes requires an internet connection'
            )
        })
    })

    describe('deleteRecipe', () => {
        it('deletes recipe successfully when online', async () => {
            global.testUtils.mockApiResponse({})

            await recipeService.deleteRecipe('1')

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/recipes/1',
                expect.objectContaining({
                    method: 'DELETE',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                })
            )
        })

        it('throws error when offline', async () => {
            offlineService.getNetworkStatus.mockReturnValue({
                isOnline: false,
                isSyncing: false,
            })

            await expect(recipeService.deleteRecipe('1')).rejects.toThrow(
                'Deleting recipes requires an internet connection'
            )
        })
    })

    describe('utility methods', () => {
        it('checks if recipe is favorited', () => {
            offlineService.isOfflineFavorite.mockReturnValue(true)

            const result = recipeService.isRecipeFavorited('1')

            expect(result).toBe(true)
            expect(offlineService.isOfflineFavorite).toHaveBeenCalledWith('1')
        })

        it('gets cached recipes', () => {
            const mockRecipes = [mockRecipe]
            offlineService.getCachedRecipes.mockReturnValue(mockRecipes)

            const result = recipeService.getCachedRecipes()

            expect(result).toEqual(mockRecipes)
        })

        it('clears cache', async () => {
            await recipeService.clearCache()

            expect(offlineService.clearCache).toHaveBeenCalled()
        })

        it('gets storage usage', () => {
            const mockUsage = { used: 1000, total: 5000, percentage: 20 }
            offlineService.getStorageUsage.mockReturnValue(mockUsage)

            const result = recipeService.getStorageUsage()

            expect(result).toEqual(mockUsage)
        })
    })
}) 