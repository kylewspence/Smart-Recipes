import express from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import db from '../db/db';
import { authenticate } from '../middleware/auth';
import { comprehensiveSecurityValidation, validateInput } from '../middleware/input-sanitization';
import { safeEmailSchema } from '../schemas/securitySchemas';

const router = express.Router();

// Apply security validation to all routes
router.use(comprehensiveSecurityValidation);

// GDPR Data Export Schema
const dataExportSchema = z.object({
    format: z.enum(['json', 'csv', 'xml']).default('json'),
    includeRecipes: z.boolean().default(true),
    includePreferences: z.boolean().default(true),
    includeActivity: z.boolean().default(false)
});

// GDPR Data Deletion Schema  
const dataDeletionSchema = z.object({
    confirmEmail: safeEmailSchema,
    deleteReason: z.string().min(1).max(500).optional(),
    keepAnonymizedData: z.boolean().default(false)
});

// Cookie Consent Schema
const cookieConsentSchema = z.object({
    essential: z.boolean().default(true),
    analytics: z.boolean().default(false),
    marketing: z.boolean().default(false),
    preferences: z.boolean().default(false)
});

/**
 * Get user's data in GDPR-compliant format
 * GET /api/privacy/data-export
 */
router.get('/data-export',
    authenticate,
    validateInput(dataExportSchema, 'query'),
    async (req: Request, res: Response) => {
        try {
            const userId = req.user!.userId;
            const { format, includeRecipes, includePreferences, includeActivity } = req.query as any;

            // Get user basic information
            const userResult = await db.query(
                'SELECT "userId", "email", "name", "createdAt", "updatedAt" FROM "users" WHERE "userId" = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const userData = userResult.rows[0];
            const exportData: any = {
                user: userData,
                exportDate: new Date().toISOString(),
                dataTypes: []
            };

            // Include recipes if requested
            if (includeRecipes) {
                const recipesResult = await db.query(`
          SELECT r.*, 
                 COALESCE(
                   json_agg(
                     json_build_object(
                       'name', i.name,
                       'quantity', ri.quantity
                     )
                   ) FILTER (WHERE i.name IS NOT NULL), 
                   '[]'::json
                 ) as ingredients
          FROM recipes r
          LEFT JOIN recipe_ingredients ri ON r."recipeId" = ri."recipeId"
          LEFT JOIN ingredients i ON ri."ingredientId" = i."ingredientId"
          WHERE r."userId" = $1
          GROUP BY r."recipeId"
          ORDER BY r."createdAt" DESC
        `, [userId]);

                exportData.recipes = recipesResult.rows;
                exportData.dataTypes.push('recipes');
            }

            // Include preferences if requested
            if (includePreferences) {
                const preferencesResult = await db.query(
                    'SELECT * FROM "userPreferences" WHERE "userId" = $1',
                    [userId]
                );

                const ingredientPrefsResult = await db.query(`
          SELECT uip.*, i.name as ingredient_name
          FROM "userIngredientPreferences" uip
          JOIN ingredients i ON uip."ingredientId" = i."ingredientId"
          WHERE uip."userId" = $1
        `, [userId]);

                exportData.preferences = {
                    general: preferencesResult.rows[0] || null,
                    ingredients: ingredientPrefsResult.rows
                };
                exportData.dataTypes.push('preferences');
            }

            // Include activity data if requested
            if (includeActivity) {
                const favoritesResult = await db.query(`
          SELECT uf.*, r.title as recipe_title
          FROM "userFavorites" uf
          JOIN recipes r ON uf."recipeId" = r."recipeId"
          WHERE uf."userId" = $1
        `, [userId]);

                exportData.activity = {
                    favorites: favoritesResult.rows,
                    lastLogin: userData.updatedAt
                };
                exportData.dataTypes.push('activity');
            }

            // Format response based on requested format
            if (format === 'csv') {
                // Convert to CSV format
                const csv = convertToCSV(exportData);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${Date.now()}.csv"`);
                return res.send(csv);
            } else if (format === 'xml') {
                // Convert to XML format
                const xml = convertToXML(exportData);
                res.setHeader('Content-Type', 'application/xml');
                res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${Date.now()}.xml"`);
                return res.send(xml);
            } else {
                // Default JSON format
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${Date.now()}.json"`);
                return res.json({
                    success: true,
                    data: exportData
                });
            }

        } catch (error) {
            console.error('Data export error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to export user data'
            });
        }
    }
);

/**
 * Delete user account and all associated data (GDPR Right to be Forgotten)
 * DELETE /api/privacy/delete-account
 */
router.delete('/delete-account',
    authenticate,
    validateInput(dataDeletionSchema, 'body'),
    async (req: Request, res: Response) => {
        try {
            const userId = req.user!.userId;
            const { confirmEmail, deleteReason, keepAnonymizedData } = req.body;

            // Verify email matches
            const userResult = await db.query(
                'SELECT "email" FROM "users" WHERE "userId" = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            if (userResult.rows[0].email !== confirmEmail) {
                return res.status(400).json({
                    success: false,
                    error: 'Email confirmation does not match'
                });
            }

            // Start transaction for complete data deletion
            await db.query('BEGIN');

            try {
                // Log deletion request
                await db.query(`
          INSERT INTO data_deletion_log (user_id, email, reason, keep_anonymized, requested_at)
          VALUES ($1, $2, $3, $4, NOW())
        `, [userId, confirmEmail, deleteReason, keepAnonymizedData]);

                if (keepAnonymizedData) {
                    // Anonymize data instead of deleting
                    await db.query(`
            UPDATE "users" 
            SET "email" = 'deleted-user-' || $1 || '@anonymized.local',
                "name" = 'Deleted User',
                "passwordHash" = 'DELETED',
                "deletedAt" = NOW()
            WHERE "userId" = $1
          `, [userId]);

                    // Anonymize recipes
                    await db.query(`
            UPDATE recipes 
            SET "generatedPrompt" = '[ANONYMIZED]'
            WHERE "userId" = $1
          `, [userId]);

                } else {
                    // Complete data deletion

                    // Delete user favorites
                    await db.query('DELETE FROM "userFavorites" WHERE "userId" = $1', [userId]);

                    // Delete user ingredient preferences
                    await db.query('DELETE FROM "userIngredientPreferences" WHERE "userId" = $1', [userId]);

                    // Delete user preferences
                    await db.query('DELETE FROM "userPreferences" WHERE "userId" = $1', [userId]);

                    // Delete recipe ingredients for user's recipes
                    await db.query(`
            DELETE FROM recipe_ingredients 
            WHERE "recipeId" IN (SELECT "recipeId" FROM recipes WHERE "userId" = $1)
          `, [userId]);

                    // Delete recipe tags for user's recipes
                    await db.query(`
            DELETE FROM recipe_tags 
            WHERE "recipeId" IN (SELECT "recipeId" FROM recipes WHERE "userId" = $1)
          `, [userId]);

                    // Delete user's recipes
                    await db.query('DELETE FROM recipes WHERE "userId" = $1', [userId]);

                    // Delete refresh tokens
                    await db.query('DELETE FROM "refreshTokens" WHERE "userId" = $1', [userId]);

                    // Finally delete the user
                    await db.query('DELETE FROM "users" WHERE "userId" = $1', [userId]);
                }

                await db.query('COMMIT');

                res.json({
                    success: true,
                    message: keepAnonymizedData ?
                        'Account anonymized successfully' :
                        'Account and all associated data deleted successfully',
                    deletionType: keepAnonymizedData ? 'anonymized' : 'complete',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                await db.query('ROLLBACK');
                throw error;
            }

        } catch (error) {
            console.error('Account deletion error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete account'
            });
        }
    }
);

/**
 * Get user's current cookie consent preferences
 * GET /api/privacy/cookie-consent
 */
router.get('/cookie-consent', async (req: Request, res: Response) => {
    try {
        // For now, return default consent (would be stored per user/session in production)
        const defaultConsent = {
            essential: true,
            analytics: false,
            marketing: false,
            preferences: false,
            lastUpdated: null
        };

        res.json({
            success: true,
            consent: defaultConsent
        });
    } catch (error) {
        console.error('Cookie consent fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch cookie consent'
        });
    }
});

/**
 * Update user's cookie consent preferences
 * POST /api/privacy/cookie-consent
 */
router.post('/cookie-consent',
    validateInput(cookieConsentSchema, 'body'),
    async (req: Request, res: Response) => {
        try {
            const { essential, analytics, marketing, preferences } = req.body;

            // In production, this would be stored in database per user/session
            const consentData = {
                essential,
                analytics,
                marketing,
                preferences,
                lastUpdated: new Date().toISOString(),
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            };

            // Log consent for audit purposes
            console.log('Cookie consent updated:', consentData);

            res.json({
                success: true,
                message: 'Cookie consent preferences updated',
                consent: consentData
            });
        } catch (error) {
            console.error('Cookie consent update error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update cookie consent'
            });
        }
    }
);

/**
 * Get privacy policy and data processing information
 * GET /api/privacy/policy
 */
router.get('/policy', async (req: Request, res: Response) => {
    try {
        const privacyPolicy = {
            lastUpdated: '2024-01-01',
            version: '1.0',
            dataCollection: {
                personalData: [
                    'Email address',
                    'Name',
                    'Recipe preferences',
                    'Dietary restrictions',
                    'Cooking history'
                ],
                purpose: [
                    'Provide personalized recipe recommendations',
                    'Improve AI recipe generation',
                    'Account management',
                    'Security and fraud prevention'
                ],
                legalBasis: 'Consent and legitimate interest',
                retention: '2 years after account deletion or 5 years of inactivity'
            },
            userRights: [
                'Right to access your data',
                'Right to rectification',
                'Right to erasure (right to be forgotten)',
                'Right to restrict processing',
                'Right to data portability',
                'Right to object',
                'Right to withdraw consent'
            ],
            cookies: {
                essential: 'Required for basic functionality',
                analytics: 'Help us understand how you use the app',
                marketing: 'Used for personalized advertising',
                preferences: 'Remember your settings and preferences'
            },
            contact: {
                email: 'privacy@smartrecipes.com',
                address: 'Smart Recipes Privacy Team, [Address]'
            }
        };

        res.json({
            success: true,
            policy: privacyPolicy
        });
    } catch (error) {
        console.error('Privacy policy fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch privacy policy'
        });
    }
});

/**
 * Submit data processing request (access, rectification, etc.)
 * POST /api/privacy/data-request
 */
router.post('/data-request',
    authenticate,
    validateInput(z.object({
        requestType: z.enum(['access', 'rectification', 'restriction', 'objection', 'portability']),
        description: z.string().min(10).max(1000),
        urgency: z.enum(['low', 'medium', 'high']).default('medium')
    }), 'body'),
    async (req: Request, res: Response) => {
        try {
            const userId = req.user!.userId;
            const { requestType, description, urgency } = req.body;

            // Log the request (in production, this would create a ticket in a system)
            const requestId = `REQ-${Date.now()}-${userId}`;

            console.log('Data processing request:', {
                requestId,
                userId,
                requestType,
                description,
                urgency,
                timestamp: new Date().toISOString()
            });

            res.json({
                success: true,
                message: 'Data processing request submitted successfully',
                requestId,
                estimatedResponseTime: '30 days',
                status: 'pending'
            });
        } catch (error) {
            console.error('Data request error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to submit data request'
            });
        }
    }
);

// Helper functions for data export formats
function convertToCSV(data: any): string {
    // Simple CSV conversion - in production, use a proper CSV library
    const lines = ['Data Type,Field,Value'];

    // Convert user data
    Object.entries(data.user).forEach(([key, value]) => {
        lines.push(`User,${key},"${value}"`);
    });

    // Convert recipes if present
    if (data.recipes) {
        data.recipes.forEach((recipe: any, index: number) => {
            Object.entries(recipe).forEach(([key, value]) => {
                lines.push(`Recipe ${index + 1},${key},"${value}"`);
            });
        });
    }

    return lines.join('\n');
}

function convertToXML(data: any): string {
    // Simple XML conversion - in production, use a proper XML library
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<userData>\n';

    xml += '  <user>\n';
    Object.entries(data.user).forEach(([key, value]) => {
        xml += `    <${key}>${value}</${key}>\n`;
    });
    xml += '  </user>\n';

    if (data.recipes) {
        xml += '  <recipes>\n';
        data.recipes.forEach((recipe: any) => {
            xml += '    <recipe>\n';
            Object.entries(recipe).forEach(([key, value]) => {
                xml += `      <${key}>${value}</${key}>\n`;
            });
            xml += '    </recipe>\n';
        });
        xml += '  </recipes>\n';
    }

    xml += '</userData>';
    return xml;
}

export default router; 