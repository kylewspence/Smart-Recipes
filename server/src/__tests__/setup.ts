import { Pool } from 'pg'
import jwt from 'jsonwebtoken'

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/smart_recipes_test'
process.env.OPENAI_API_KEY = 'test-openai-key'

// Mock OpenAI
jest.mock('openai', () => {
    return {
        OpenAI: jest.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: jest.fn().mockResolvedValue({
                        choices: [{
                            message: {
                                content: JSON.stringify({
                                    title: 'Test Recipe',
                                    description: 'A test recipe',
                                    ingredients: ['ingredient 1', 'ingredient 2'],
                                    instructions: ['step 1', 'step 2'],
                                    cookingTime: 30,
                                    difficulty: 'easy',
                                    servings: 4,
                                    cuisine: 'Italian',
                                })
                            }
                        }]
                    })
                }
            }
        }))
    }
})

// Mock database pool
jest.mock('pg', () => {
    const mockQuery = jest.fn()
    const mockRelease = jest.fn()
    const mockConnect = jest.fn().mockResolvedValue({
        query: mockQuery,
        release: mockRelease,
    })

    return {
        Pool: jest.fn().mockImplementation(() => ({
            query: mockQuery,
            connect: mockConnect,
            end: jest.fn(),
        })),
    }
})

// Test utilities
export const testUtils = {
    // Create mock user
    createMockUser: () => ({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: '$2a$10$test.hash',
        createdAt: new Date(),
        updatedAt: new Date(),
    }),

    // Create mock recipe
    createMockRecipe: () => ({
        id: 1,
        userId: 1,
        title: 'Test Recipe',
        description: 'A test recipe',
        ingredients: ['ingredient 1', 'ingredient 2'],
        instructions: ['step 1', 'step 2'],
        cookingTime: 30,
        difficulty: 'easy',
        servings: 4,
        cuisine: 'Italian',
        rating: 4.5,
        createdAt: new Date(),
        updatedAt: new Date(),
    }),

    // Create JWT token for testing
    createAuthToken: (userId: number = 1) => {
        return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '1h' })
    },

    // Mock database responses
    mockDbResponse: (rows: any[] = []) => ({
        rows,
        rowCount: rows.length,
        command: 'SELECT',
        oid: 0,
        fields: [],
    }),

    // Mock database error
    mockDbError: (message: string = 'Database error') => {
        const error = new Error(message)
        error.name = 'DatabaseError'
        return error
    },

    // Mock request object
    createMockRequest: (overrides: any = {}) => ({
        body: {},
        params: {},
        query: {},
        headers: {},
        user: null,
        ...overrides,
    }),

    // Mock response object
    createMockResponse: () => {
        const res: any = {}
        res.status = jest.fn().mockReturnValue(res)
        res.json = jest.fn().mockReturnValue(res)
        res.send = jest.fn().mockReturnValue(res)
        res.cookie = jest.fn().mockReturnValue(res)
        res.clearCookie = jest.fn().mockReturnValue(res)
        return res
    },

    // Mock next function
    createMockNext: () => jest.fn(),

    // Clean up database mocks
    resetDbMocks: () => {
        const { Pool } = require('pg')
        const mockPool = new Pool()
        mockPool.query.mockClear()
        mockPool.connect.mockClear()
    },

    // Setup database mock responses
    setupDbMocks: (responses: any[]) => {
        const { Pool } = require('pg')
        const mockPool = new Pool()

        responses.forEach((response, index) => {
            if (response instanceof Error) {
                mockPool.query.mockRejectedValueOnce(response)
            } else {
                mockPool.query.mockResolvedValueOnce(testUtils.mockDbResponse(response))
            }
        })
    },
}

// Global test setup
beforeEach(() => {
    testUtils.resetDbMocks()
})

// Export for use in tests
declare global {
    var testUtils: typeof testUtils
}

global.testUtils = testUtils 