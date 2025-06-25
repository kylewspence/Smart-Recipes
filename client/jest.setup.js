import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
    useRouter() {
        return {
            route: '/',
            pathname: '/',
            query: {},
            asPath: '/',
            push: jest.fn(),
            pop: jest.fn(),
            reload: jest.fn(),
            back: jest.fn(),
            prefetch: jest.fn().mockResolvedValue(undefined),
            beforePopState: jest.fn(),
            events: {
                on: jest.fn(),
                off: jest.fn(),
                emit: jest.fn(),
            },
            isFallback: false,
        }
    },
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn(),
            back: jest.fn(),
            forward: jest.fn(),
            refresh: jest.fn(),
        }
    },
    useSearchParams() {
        return new URLSearchParams()
    },
    usePathname() {
        return '/'
    },
}))

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001'

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock fetch
global.fetch = jest.fn()

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
})

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: jest.fn(),
})

// Mock HTMLElement.scrollIntoView
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    writable: true,
    value: jest.fn(),
})

// Mock console methods in tests
const originalError = console.error
beforeAll(() => {
    console.error = (...args) => {
        if (
            typeof args[0] === 'string' &&
            args[0].includes('Warning: ReactDOM.render is no longer supported')
        ) {
            return
        }
        originalError.call(console, ...args)
    }
})

afterAll(() => {
    console.error = originalError
})

// Global test utilities
global.testUtils = {
    // Helper to create mock user for auth tests
    createMockUser: () => ({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        preferences: {
            dietaryRestrictions: [],
            allergies: [],
            dislikes: [],
            favoriteIngredients: [],
        },
    }),

    // Helper to create mock recipe
    createMockRecipe: () => ({
        id: 1,
        title: 'Test Recipe',
        description: 'A test recipe',
        ingredients: ['ingredient 1', 'ingredient 2'],
        instructions: ['step 1', 'step 2'],
        cookingTime: 30,
        difficulty: 'easy',
        servings: 4,
        cuisine: 'Italian',
        rating: 4.5,
        isFavorite: false,
    }),

    // Helper to mock API responses
    mockApiResponse: (data, status = 200) => {
        const mockResponse = {
            ok: status >= 200 && status < 300,
            status,
            json: jest.fn().mockResolvedValue(data),
            text: jest.fn().mockResolvedValue(JSON.stringify(data)),
        }
        global.fetch.mockResolvedValue(mockResponse)
        return mockResponse
    },

    // Helper to mock API error
    mockApiError: (message = 'API Error', status = 500) => {
        const mockResponse = {
            ok: false,
            status,
            json: jest.fn().mockRejectedValue(new Error(message)),
            text: jest.fn().mockResolvedValue(message),
        }
        global.fetch.mockResolvedValue(mockResponse)
        return mockResponse
    },
}

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
}) 