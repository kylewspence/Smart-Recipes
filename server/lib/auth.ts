import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import db from '../db/db';

// Environment variables (should be set in .env)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development-only';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Salt rounds for bcrypt
const SALT_ROUNDS = 10;

// User interface (simplified, just what we need for auth)
interface User {
    userId: number;
    email: string;
    name: string;
}

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a password with a hash
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};

/**
 * Generate a JWT token for a user
 */
export const generateToken = (user: User): string => {
    const payload = {
        userId: user.userId,
        email: user.email,
        name: user.name
    };

    return jwt.sign(payload, JWT_SECRET as Secret);
};

/**
 * Generate a refresh token and store it in the database
 */
export const generateRefreshToken = async (userId: number): Promise<string> => {
    // Generate a random token
    const token = jwt.sign({ userId }, JWT_SECRET as Secret);

    // Calculate expiration date
    const expiresIn = REFRESH_TOKEN_EXPIRES_IN.endsWith('d')
        ? parseInt(REFRESH_TOKEN_EXPIRES_IN) * 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000; // Default to 7 days

    const expiresAt = new Date(Date.now() + expiresIn);

    // Store token in database
    await db.query(
        'INSERT INTO "refreshTokens" ("userId", "token", "expiresAt") VALUES ($1, $2, $3)',
        [userId, token, expiresAt]
    );

    return token;
};

/**
 * Verify a JWT token
 */
export const verifyToken = (token: string): any => {
    try {
        return jwt.verify(token, JWT_SECRET as Secret);
    } catch (error) {
        return null;
    }
};

/**
 * Verify a refresh token
 */
export const verifyRefreshToken = async (token: string): Promise<number | null> => {
    try {
        // Check if token exists in database and is not expired
        const result = await db.query(
            'SELECT "userId" FROM "refreshTokens" WHERE "token" = $1 AND "expiresAt" > NOW()',
            [token]
        );

        if (result.rows.length === 0) {
            return null;
        }

        // Verify the token itself
        const decoded = jwt.verify(token, JWT_SECRET as Secret) as { userId: number };

        // Make sure the userId in the token matches the one in the database
        if (decoded.userId !== result.rows[0].userId) {
            return null;
        }

        return decoded.userId;
    } catch (error) {
        return null;
    }
};

/**
 * Revoke a refresh token
 */
export const revokeRefreshToken = async (token: string): Promise<void> => {
    await db.query('DELETE FROM "refreshTokens" WHERE "token" = $1', [token]);
};

/**
 * Revoke all refresh tokens for a user
 */
export const revokeAllRefreshTokens = async (userId: number): Promise<void> => {
    await db.query('DELETE FROM "refreshTokens" WHERE "userId" = $1', [userId]);
};

/**
 * Extract token from authorization header
 */
export const extractTokenFromHeader = (authorizationHeader?: string): string | null => {
    if (!authorizationHeader) {
        return null;
    }

    const parts = authorizationHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
}; 