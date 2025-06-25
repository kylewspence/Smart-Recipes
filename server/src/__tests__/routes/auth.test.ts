import request from 'supertest'
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import authRoutes from '../../routes/auth'

// Create test app
const app = express()
app.use(express.json())
app.use('/api/auth', authRoutes)

describe('Auth Routes', () => {
    beforeEach(() => {
        testUtils.resetDbMocks()
    })

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123',
                confirmPassword: 'password123',
            }

            // Mock database responses
            testUtils.setupDbMocks([
                [], // Check if user exists (empty result)
                [{ id: 1, ...userData, passwordHash: 'hashed-password' }], // Insert user
            ])

            // Mock bcrypt
            jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never)

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)

            expect(response.status).toBe(201)
            expect(response.body).toHaveProperty('user')
            expect(response.body).toHaveProperty('token')
            expect(response.body.user.email).toBe(userData.email)
            expect(response.body.user).not.toHaveProperty('passwordHash')
        })

        it('should return 400 for invalid input', async () => {
            const invalidData = {
                name: '',
                email: 'invalid-email',
                password: '123',
                confirmPassword: '456',
            }

            const response = await request(app)
                .post('/api/auth/register')
                .send(invalidData)

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty('errors')
        })

        it('should return 409 if user already exists', async () => {
            const userData = {
                name: 'John Doe',
                email: 'existing@example.com',
                password: 'password123',
                confirmPassword: 'password123',
            }

            // Mock user already exists
            testUtils.setupDbMocks([
                [testUtils.createMockUser()], // User exists
            ])

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)

            expect(response.status).toBe(409)
            expect(response.body.error).toBe('User already exists')
        })

        it('should return 400 if passwords do not match', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123',
                confirmPassword: 'different123',
            }

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Passwords do not match')
        })

        it('should handle database errors', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123',
                confirmPassword: 'password123',
            }

            // Mock database error
            testUtils.setupDbMocks([
                testUtils.mockDbError('Database connection failed'),
            ])

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Internal server error')
        })
    })

    describe('POST /api/auth/login', () => {
        it('should login user successfully', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123',
            }

            const mockUser = testUtils.createMockUser()

            // Mock database response
            testUtils.setupDbMocks([
                [mockUser], // Find user
            ])

            // Mock bcrypt compare
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never)

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty('user')
            expect(response.body).toHaveProperty('token')
            expect(response.body.user.email).toBe(mockUser.email)
            expect(response.body.user).not.toHaveProperty('passwordHash')
        })

        it('should return 400 for invalid input', async () => {
            const invalidData = {
                email: 'invalid-email',
                password: '',
            }

            const response = await request(app)
                .post('/api/auth/login')
                .send(invalidData)

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty('errors')
        })

        it('should return 401 for non-existent user', async () => {
            const loginData = {
                email: 'nonexistent@example.com',
                password: 'password123',
            }

            // Mock user not found
            testUtils.setupDbMocks([
                [], // No user found
            ])

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Invalid credentials')
        })

        it('should return 401 for incorrect password', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'wrongpassword',
            }

            const mockUser = testUtils.createMockUser()

            // Mock database response
            testUtils.setupDbMocks([
                [mockUser], // Find user
            ])

            // Mock bcrypt compare (password doesn't match)
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never)

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Invalid credentials')
        })

        it('should handle database errors', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123',
            }

            // Mock database error
            testUtils.setupDbMocks([
                testUtils.mockDbError('Database connection failed'),
            ])

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Internal server error')
        })
    })

    describe('POST /api/auth/refresh', () => {
        it('should refresh token successfully', async () => {
            const refreshToken = 'valid-refresh-token'
            const mockUser = testUtils.createMockUser()

            // Mock database responses
            testUtils.setupDbMocks([
                [{ userId: mockUser.id, token: refreshToken }], // Find refresh token
                [mockUser], // Find user
            ])

            const response = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken })

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty('token')
            expect(response.body).toHaveProperty('refreshToken')
        })

        it('should return 401 for invalid refresh token', async () => {
            const refreshToken = 'invalid-refresh-token'

            // Mock refresh token not found
            testUtils.setupDbMocks([
                [], // No refresh token found
            ])

            const response = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Invalid refresh token')
        })

        it('should return 400 for missing refresh token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .send({})

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty('errors')
        })
    })

    describe('POST /api/auth/logout', () => {
        it('should logout user successfully', async () => {
            const refreshToken = 'valid-refresh-token'

            // Mock database response
            testUtils.setupDbMocks([
                [], // Delete refresh token
            ])

            const response = await request(app)
                .post('/api/auth/logout')
                .send({ refreshToken })

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Logged out successfully')
        })

        it('should return 400 for missing refresh token', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .send({})

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty('errors')
        })

        it('should handle database errors gracefully', async () => {
            const refreshToken = 'valid-refresh-token'

            // Mock database error
            testUtils.setupDbMocks([
                testUtils.mockDbError('Database connection failed'),
            ])

            const response = await request(app)
                .post('/api/auth/logout')
                .send({ refreshToken })

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Internal server error')
        })
    })

    describe('JWT Token Validation', () => {
        it('should create valid JWT tokens', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123',
                confirmPassword: 'password123',
            }

            const mockUser = { id: 1, ...userData }

            testUtils.setupDbMocks([
                [], // Check if user exists
                [mockUser], // Insert user
            ])

            jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never)

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)

            expect(response.status).toBe(201)

            // Verify token is valid
            const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET!)
            expect(decoded).toHaveProperty('userId')
        })

        it('should include correct user data in token', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123',
            }

            const mockUser = testUtils.createMockUser()

            testUtils.setupDbMocks([
                [mockUser], // Find user
            ])

            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never)

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)

            const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET!) as any
            expect(decoded.userId).toBe(mockUser.id)
        })
    })

    describe('Rate Limiting', () => {
        it('should handle multiple requests within rate limit', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123',
            }

            const mockUser = testUtils.createMockUser()

            // Setup for multiple requests
            for (let i = 0; i < 5; i++) {
                testUtils.setupDbMocks([
                    [mockUser], // Find user
                ])
            }

            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never)

            // Make multiple requests
            for (let i = 0; i < 5; i++) {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send(loginData)

                expect(response.status).toBe(200)
            }
        })
    })

    describe('Input Sanitization', () => {
        it('should sanitize malicious input', async () => {
            const maliciousData = {
                name: '<script>alert("xss")</script>',
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
            }

            testUtils.setupDbMocks([
                [], // Check if user exists
                [{ id: 1, name: 'Clean Name', email: maliciousData.email }], // Insert user
            ])

            jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never)

            const response = await request(app)
                .post('/api/auth/register')
                .send(maliciousData)

            expect(response.status).toBe(201)
            // Name should be sanitized
            expect(response.body.user.name).not.toContain('<script>')
        })
    })
}) 