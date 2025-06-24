import express from 'express';
import { z } from 'zod';
import db from '../db/db';
import { hashPassword, comparePassword, generateToken, generateRefreshToken, verifyRefreshToken, revokeRefreshToken } from '../lib/auth';
import { loginSchema, registerSchema, tokenSchema } from '../schemas/authSchemas';
import { ClientError } from '../lib/client-error';
import { authenticate } from '../middleware/auth';
const router = express.Router();
/**
 * User registration
 * POST /api/auth/register
 */
router.post('/register', async (req, res, next) => {
    try {
        // Validate request body
        const validatedData = registerSchema.parse(req.body);
        // Check if email already exists
        const existingUser = await db.query('SELECT * FROM "users" WHERE "email" = $1', [validatedData.email]);
        if (existingUser.rows.length > 0) {
            throw new ClientError(409, 'Email already exists');
        }
        // Hash password
        const passwordHash = await hashPassword(validatedData.password);
        // Create user
        const result = await db.query('INSERT INTO "users" ("email", "name", "passwordHash") VALUES ($1, $2, $3) RETURNING "userId", "email", "name"', [validatedData.email, validatedData.name, passwordHash]);
        const user = result.rows[0];
        // Generate tokens
        const token = generateToken(user);
        const refreshToken = await generateRefreshToken(user.userId);
        // Return tokens and user data
        res.status(201).json({
            user: {
                userId: user.userId,
                email: user.email,
                name: user.name
            },
            token,
            refreshToken
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            next(new ClientError(400, error.errors[0].message));
        }
        else {
            next(error);
        }
    }
});
/**
 * User login
 * POST /api/auth/login
 */
router.post('/login', async (req, res, next) => {
    try {
        // Validate request body
        const validatedData = loginSchema.parse(req.body);
        // Find user by email
        const result = await db.query('SELECT "userId", "email", "name", "passwordHash" FROM "users" WHERE "email" = $1', [validatedData.email]);
        if (result.rows.length === 0) {
            throw new ClientError(401, 'Invalid email or password');
        }
        const user = result.rows[0];
        // Verify password
        const isPasswordValid = await comparePassword(validatedData.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new ClientError(401, 'Invalid email or password');
        }
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
                name: user.name
            },
            token,
            refreshToken
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            next(new ClientError(400, error.errors[0].message));
        }
        else {
            next(error);
        }
    }
});
/**
 * Refresh token
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res, next) => {
    try {
        // Validate request body
        const validatedData = tokenSchema.parse(req.body);
        // Verify refresh token
        const userId = await verifyRefreshToken(validatedData.token);
        if (!userId) {
            throw new ClientError(401, 'Invalid refresh token');
        }
        // Get user data
        const result = await db.query('SELECT "userId", "email", "name" FROM "users" WHERE "userId" = $1', [userId]);
        if (result.rows.length === 0) {
            throw new ClientError(404, 'User not found');
        }
        const user = result.rows[0];
        // Generate new tokens
        const token = generateToken(user);
        const refreshToken = await generateRefreshToken(user.userId);
        // Revoke old refresh token
        await revokeRefreshToken(validatedData.token);
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
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            next(new ClientError(400, error.errors[0].message));
        }
        else {
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
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            next(new ClientError(400, error.errors[0].message));
        }
        else {
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
        let guestUser = await db.query('SELECT "userId", "email", "name" FROM "users" WHERE "email" = $1', ['guest@smartrecipes.demo']);
        // If guest user doesn't exist, create it
        if (guestUser.rows.length === 0) {
            const guestResult = await db.query('INSERT INTO "users" ("email", "name", "passwordHash") VALUES ($1, $2, $3) RETURNING "userId", "email", "name"', ['guest@smartrecipes.demo', 'Guest User', 'guest_no_password_hash']);
            guestUser = guestResult;
            // Create default preferences for guest user
            const userId = guestResult.rows[0].userId;
            // Add basic user preferences
            await db.query(`INSERT INTO "userPreferences" 
                ("userId", "dietaryRestrictions", "allergies", "cuisinePreferences", "spiceLevel", "maxCookingTime", "servingSize") 
                VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                userId,
                [], // No dietary restrictions
                [], // No allergies
                ['american', 'italian', 'mexican'], // Popular cuisines
                'medium', // Medium spice level
                60, // 1 hour max cooking time
                4 // Serves 4 people
            ]);
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
    }
    catch (error) {
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
