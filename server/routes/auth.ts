import express from 'express';
import { z } from 'zod';
import db from '../db/db';
import { hashPassword, comparePassword, generateToken, generateRefreshToken, verifyRefreshToken, revokeRefreshToken } from '../lib/auth';
import { loginSchema, registerSchema, tokenSchema } from '../schemas/authSchemas';
import { ClientError } from '../lib/client-error';
import { authenticate } from '../middleware/auth';
import {
    comprehensiveSecurityValidation,
    validateInput,
    logSecurityEvent
} from '../middleware/input-sanitization';
import { safeEmailSchema, securePasswordSchema } from '../schemas/securitySchemas';

const router = express.Router();

// Apply comprehensive security validation to all auth routes
router.use(comprehensiveSecurityValidation);

// Enhanced registration schema with security validation
const enhancedRegisterSchema = z.object({
    email: safeEmailSchema,
    name: z.string().min(1).max(100).trim(),
    password: securePasswordSchema,
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

// Enhanced login schema with security validation
const enhancedLoginSchema = z.object({
    email: safeEmailSchema,
    password: z.string().min(1).max(128)
});

/**
 * Test endpoint to verify database connectivity
 * GET /api/auth/test
 */
router.get('/test', async (req, res, next) => {
    try {
        const result = await db.query('SELECT COUNT(*) as user_count FROM "users"');
        res.json({
            success: true,
            message: 'Database connection successful',
            userCount: result.rows[0].user_count
        });
    } catch (error: any) {
        console.error('Database test error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Database connection failed'
        });
    }
});

/**
 * User registration
 * POST /api/auth/register
 */
router.post('/register',
    validateInput(enhancedRegisterSchema, 'body'),
    async (req, res, next) => {
        try {
            // Log registration attempt
            await logSecurityEvent(req, 'low', 'USER_REGISTRATION_ATTEMPT', {
                email: req.body.email,
                timestamp: new Date().toISOString()
            });

            // Remove confirmPassword from the data (we only needed it for validation)
            const { confirmPassword, ...userData } = req.body;

            // Check if email already exists
            const existingUser = await db.query(
                'SELECT * FROM "users" WHERE "email" = $1',
                [userData.email]
            );

            if (existingUser.rows.length > 0) {
                await logSecurityEvent(req, 'medium', 'DUPLICATE_EMAIL_REGISTRATION', {
                    email: userData.email
                });
                throw new ClientError(409, 'Email already exists');
            }

            // Hash password
            const passwordHash = await hashPassword(userData.password);

            // Create user
            const result = await db.query(
                'INSERT INTO "users" ("email", "name", "passwordHash") VALUES ($1, $2, $3) RETURNING "userId", "email", "name"',
                [userData.email, userData.name, passwordHash]
            );

            const user = result.rows[0];

            // Generate tokens
            const token = generateToken(user);
            const refreshToken = await generateRefreshToken(user.userId);

            // Log successful registration
            await logSecurityEvent(req, 'low', 'USER_REGISTRATION_SUCCESS', {
                userId: user.userId,
                email: user.email
            });

            // Return tokens and user data with expiresIn
            res.status(201).json({
                user: {
                    userId: user.userId,
                    email: user.email,
                    name: user.name
                },
                token,
                refreshToken,
                expiresIn: 3600 // 1 hour in seconds
            });
        } catch (error: any) {
            console.error('Registration error:', error);
            await logSecurityEvent(req, 'medium', 'USER_REGISTRATION_FAILED', {
                error: error.message,
                email: req.body?.email
            });

            if (error instanceof z.ZodError) {
                next(new ClientError(400, error.errors[0].message));
            } else {
                next(error);
            }
        }
    });

/**
 * User login
 * POST /api/auth/login
 */
router.post('/login',
    validateInput(enhancedLoginSchema, 'body'),
    async (req, res, next) => {
        try {
            // Log login attempt
            await logSecurityEvent(req, 'low', 'USER_LOGIN_ATTEMPT', {
                email: req.body.email,
                timestamp: new Date().toISOString()
            });

            // Find user by email
            const result = await db.query(
                'SELECT "userId", "email", "name", "passwordHash" FROM "users" WHERE "email" = $1',
                [req.body.email]
            );

            if (result.rows.length === 0) {
                await logSecurityEvent(req, 'medium', 'LOGIN_FAILED_USER_NOT_FOUND', {
                    email: req.body.email
                });
                throw new ClientError(401, 'Invalid email or password');
            }

            const user = result.rows[0];

            // Verify password
            const isPasswordValid = await comparePassword(req.body.password, user.passwordHash);

            if (!isPasswordValid) {
                await logSecurityEvent(req, 'medium', 'LOGIN_FAILED_INVALID_PASSWORD', {
                    userId: user.userId,
                    email: user.email
                });
                throw new ClientError(401, 'Invalid email or password');
            }

            // Generate tokens
            const token = generateToken({
                userId: user.userId,
                email: user.email,
                name: user.name
            });

            const refreshToken = await generateRefreshToken(user.userId);

            // Log successful login
            await logSecurityEvent(req, 'low', 'USER_LOGIN_SUCCESS', {
                userId: user.userId,
                email: user.email
            });

            // Return tokens and user data
            res.status(200).json({
                user: {
                    userId: user.userId,
                    email: user.email,
                    name: user.name
                },
                token,
                refreshToken,
                expiresIn: 3600 // 1 hour in seconds
            });
        } catch (error) {
            await logSecurityEvent(req, 'medium', 'USER_LOGIN_FAILED', {
                error: error instanceof Error ? error.message : 'Unknown error',
                email: req.body?.email
            });

            if (error instanceof z.ZodError) {
                next(new ClientError(400, error.errors[0].message));
            } else {
                next(error);
            }
        }
    });

/**
 * Refresh token
 * POST /api/auth/refresh
 */
router.post('/refresh',
    validateInput(tokenSchema, 'body'),
    async (req, res, next) => {
        try {
            // Log refresh attempt
            await logSecurityEvent(req, 'low', 'TOKEN_REFRESH_ATTEMPT', {
                timestamp: new Date().toISOString()
            });

            // Verify refresh token
            const userId = await verifyRefreshToken(req.body.token);

            if (!userId) {
                await logSecurityEvent(req, 'medium', 'TOKEN_REFRESH_FAILED_INVALID_TOKEN', {
                    token: req.body.token?.substring(0, 10) + '...' // Only log first 10 chars for security
                });
                throw new ClientError(401, 'Invalid refresh token');
            }

            // Get user data
            const result = await db.query(
                'SELECT "userId", "email", "name" FROM "users" WHERE "userId" = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                await logSecurityEvent(req, 'high', 'TOKEN_REFRESH_FAILED_USER_NOT_FOUND', {
                    userId
                });
                throw new ClientError(404, 'User not found');
            }

            const user = result.rows[0];

            // Generate new tokens
            const token = generateToken(user);
            const refreshToken = await generateRefreshToken(user.userId);

            // Revoke old refresh token
            await revokeRefreshToken(req.body.token);

            // Log successful refresh
            await logSecurityEvent(req, 'low', 'TOKEN_REFRESH_SUCCESS', {
                userId: user.userId
            });

            // Return tokens and user data
            res.status(200).json({
                user: {
                    userId: user.userId,
                    email: user.email,
                    name: user.name
                },
                token,
                refreshToken
            });
        } catch (error) {
            await logSecurityEvent(req, 'medium', 'TOKEN_REFRESH_FAILED', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            if (error instanceof z.ZodError) {
                next(new ClientError(400, error.errors[0].message));
            } else {
                next(error);
            }
        }
    });

/**
 * Logout
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res, next) => {
    try {
        // Validate request body
        const validatedData = tokenSchema.parse(req.body);

        // Revoke refresh token
        await revokeRefreshToken(validatedData.token);

        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            next(new ClientError(400, error.errors[0].message));
        } else {
            next(error);
        }
    }
});

/**
 * Guest login - creates a temporary guest session
 * POST /api/auth/guest
 */
router.post('/guest', async (req, res, next) => {
    try {
        // Check if guest user already exists
        let guestUser = await db.query(
            'SELECT "userId", "email", "name" FROM "users" WHERE "email" = $1',
            ['guest@smartrecipes.demo']
        );

        // If guest user doesn't exist, create it
        if (guestUser.rows.length === 0) {
            const guestResult = await db.query(
                'INSERT INTO "users" ("email", "name", "passwordHash") VALUES ($1, $2, $3) RETURNING "userId", "email", "name"',
                ['guest@smartrecipes.demo', 'Guest User', 'guest_no_password_hash']
            );
            guestUser = guestResult;

            // Create default preferences for guest user
            const userId = guestResult.rows[0].userId;

            // Add basic user preferences
            await db.query(
                `INSERT INTO "userPreferences" 
                ("userId", "dietaryRestrictions", "allergies", "cuisinePreferences", "spiceLevel", "maxCookingTime", "servingSize") 
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    userId,
                    [], // No dietary restrictions
                    [], // No allergies
                    ['american', 'italian', 'mexican'], // Popular cuisines
                    'medium', // Medium spice level
                    60, // 1 hour max cooking time
                    4 // Serves 4 people
                ]
            );
        }

        const user = guestUser.rows[0];

        // Generate tokens
        const token = generateToken({
            userId: user.userId,
            email: user.email,
            name: user.name
        });

        const refreshToken = await generateRefreshToken(user.userId);

        // Return tokens and user data
        res.status(200).json({
            user: {
                userId: user.userId,
                email: user.email,
                name: user.name,
                isGuest: true
            },
            token,
            refreshToken,
            expiresIn: 3600, // 1 hour
            message: 'Guest session created successfully'
        });
    } catch (error) {
        console.error('❌ Guest login error:', error);
        next(error);
    }
});

/**
 * Get current user
 * GET /api/auth/me
 */
router.get('/me', authenticate, (req, res) => {
    res.status(200).json({ user: req.user });
});

export default router; 