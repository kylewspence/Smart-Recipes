import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Base validation schemas
const idSchema = z.string().regex(/^\d+$/, 'ID must be a positive integer');
const emailSchema = z.string().email('Invalid email format');
const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

const usernameSchema = z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

// User validation schemas
export const userValidationSchemas = {
    // Registration validation
    register: z.object({
        username: usernameSchema,
        email: emailSchema,
        password: passwordSchema,
        firstName: z.string().min(1, 'First name is required').max(50),
        lastName: z.string().min(1, 'Last name is required').max(50),
        dateOfBirth: z.string().datetime().optional(),
        termsAccepted: z.boolean().refine(val => val === true, 'Terms must be accepted')
    }),

    // Login validation
    login: z.object({
        email: emailSchema,
        password: z.string().min(1, 'Password is required')
    }),

    // Update profile validation
    updateProfile: z.object({
        firstName: z.string().min(1).max(50).optional(),
        lastName: z.string().min(1).max(50).optional(),
        dateOfBirth: z.string().datetime().optional(),
        bio: z.string().max(500).optional()
    }),

    // Password change validation
    changePassword: z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: passwordSchema,
        confirmPassword: z.string()
    }).refine(data => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"]
    })
};

// Recipe validation schemas
export const recipeValidationSchemas = {
    // Create recipe validation
    create: z.object({
        title: z.string().min(1, 'Title is required').max(200),
        description: z.string().min(1, 'Description is required').max(1000),
        instructions: z.array(z.string().min(1)).min(1, 'At least one instruction is required'),
        ingredients: z.array(z.object({
            ingredientId: idSchema,
            quantity: z.string().min(1, 'Quantity is required'),
            unit: z.string().min(1, 'Unit is required'),
            notes: z.string().optional()
        })).min(1, 'At least one ingredient is required'),
        prepTime: z.number().int().min(0, 'Prep time must be non-negative'),
        cookTime: z.number().int().min(0, 'Cook time must be non-negative'),
        servings: z.number().int().min(1, 'Servings must be at least 1'),
        difficulty: z.enum(['easy', 'medium', 'hard']),
        cuisineType: z.string().max(50).optional(),
        dietaryInfo: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().default(false),
        generatedPrompt: z.string().optional() // For AI-generated recipes
    }),

    // Update recipe validation
    update: z.object({
        title: z.string().min(1).max(200).optional(),
        description: z.string().min(1).max(1000).optional(),
        instructions: z.array(z.string().min(1)).optional(),
        ingredients: z.array(z.object({
            ingredientId: idSchema,
            quantity: z.string().min(1),
            unit: z.string().min(1),
            notes: z.string().optional()
        })).optional(),
        prepTime: z.number().int().min(0).optional(),
        cookTime: z.number().int().min(0).optional(),
        servings: z.number().int().min(1).optional(),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
        cuisineType: z.string().max(50).optional(),
        dietaryInfo: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().optional()
    }),

    // Rate recipe validation
    rate: z.object({
        rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
        review: z.string().max(1000).optional()
    }),

    // Search validation
    search: z.object({
        query: z.string().min(1, 'Search query is required'),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
        maxPrepTime: z.number().int().min(0).optional(),
        maxCookTime: z.number().int().min(0).optional(),
        cuisineType: z.string().optional(),
        dietaryInfo: z.array(z.string()).optional(),
        ingredients: z.array(z.string()).optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0)
    })
};

// User preferences validation schemas
export const preferencesValidationSchemas = {
    // Update preferences validation
    update: z.object({
        dietaryRestrictions: z.array(z.string()).optional(),
        allergies: z.array(z.string()).optional(),
        dislikedIngredients: z.array(z.string()).optional(),
        favoriteIngredients: z.array(z.string()).optional(),
        favoriteCuisines: z.array(z.string()).optional(),
        cookingSkillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
        availableEquipment: z.array(z.string()).optional(),
        mealPlanningGoals: z.array(z.string()).optional(),
        budgetRange: z.enum(['low', 'medium', 'high']).optional(),
        timeConstraints: z.object({
            breakfast: z.number().int().min(0).optional(),
            lunch: z.number().int().min(0).optional(),
            dinner: z.number().int().min(0).optional()
        }).optional()
    }),

    // Ingredient preferences batch update
    ingredientPreferences: z.object({
        preferences: z.array(z.object({
            ingredientId: idSchema,
            preference: z.enum(['love', 'like', 'neutral', 'dislike', 'allergic']),
            notes: z.string().optional()
        }))
    })
};

// Ingredient validation schemas
export const ingredientValidationSchemas = {
    // Create ingredient validation
    create: z.object({
        name: z.string().min(1, 'Name is required').max(100),
        category: z.string().min(1, 'Category is required').max(50),
        description: z.string().max(500).optional(),
        nutritionalInfo: z.object({
            calories: z.number().min(0).optional(),
            protein: z.number().min(0).optional(),
            carbs: z.number().min(0).optional(),
            fat: z.number().min(0).optional(),
            fiber: z.number().min(0).optional(),
            sugar: z.number().min(0).optional(),
            sodium: z.number().min(0).optional()
        }).optional(),
        commonUnits: z.array(z.string()).optional(),
        storageInstructions: z.string().max(500).optional(),
        seasonality: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional()
    }),

    // Update ingredient validation
    update: z.object({
        name: z.string().min(1).max(100).optional(),
        category: z.string().min(1).max(50).optional(),
        description: z.string().max(500).optional(),
        nutritionalInfo: z.object({
            calories: z.number().min(0).optional(),
            protein: z.number().min(0).optional(),
            carbs: z.number().min(0).optional(),
            fat: z.number().min(0).optional(),
            fiber: z.number().min(0).optional(),
            sugar: z.number().min(0).optional(),
            sodium: z.number().min(0).optional()
        }).optional(),
        commonUnits: z.array(z.string()).optional(),
        storageInstructions: z.string().max(500).optional(),
        seasonality: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional()
    }),

    // Search validation
    search: z.object({
        query: z.string().min(1, 'Search query is required'),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0)
    })
};

// AI generation validation schemas
export const aiValidationSchemas = {
    // Generate recipe validation
    generateRecipe: z.object({
        preferences: z.object({
            dietaryRestrictions: z.array(z.string()).optional(),
            allergies: z.array(z.string()).optional(),
            dislikedIngredients: z.array(z.string()).optional(),
            favoriteIngredients: z.array(z.string()).optional(),
            cuisinePreferences: z.array(z.string()).optional()
        }).optional(),
        availableIngredients: z.array(z.string()).optional(),
        mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'dessert']).optional(),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
        maxPrepTime: z.number().int().min(5).max(240).optional(),
        maxCookTime: z.number().int().min(0).max(480).optional(),
        servings: z.number().int().min(1).max(12).default(4),
        specialRequests: z.string().max(500).optional()
    }),

    // Batch generation validation
    generateBatch: z.object({
        count: z.number().int().min(1).max(10, 'Maximum 10 recipes per batch'),
        preferences: z.object({
            dietaryRestrictions: z.array(z.string()).optional(),
            allergies: z.array(z.string()).optional(),
            dislikedIngredients: z.array(z.string()).optional(),
            favoriteIngredients: z.array(z.string()).optional(),
            cuisinePreferences: z.array(z.string()).optional()
        }).optional(),
        mealTypes: z.array(z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'dessert'])).optional(),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
        diversityLevel: z.enum(['low', 'medium', 'high']).default('medium')
    })
};

// Validation middleware factory
export const validate = (schema: z.ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // Validate the request body, query, and params
            const dataToValidate = {
                ...req.body,
                ...req.query,
                ...req.params
            };

            // Parse and validate
            const validatedData = schema.parse(dataToValidate);

            // Replace request data with validated data
            req.body = validatedData;
            req.validatedData = validatedData;

            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const validationErrors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    value: err.code === 'invalid_type' ? undefined : err.input
                }));

                return res.status(400).json({
                    success: false,
                    error: 'Validation Error',
                    message: 'Invalid input data provided',
                    details: validationErrors,
                    timestamp: new Date().toISOString()
                });
            }

            next(error);
        }
    };
};

// Specific validation middleware for common patterns
export const validateId = validate(z.object({ id: idSchema }));
export const validateUserId = validate(z.object({ userId: idSchema }));
export const validateRecipeId = validate(z.object({ recipeId: idSchema }));
export const validateIngredientId = validate(z.object({ ingredientId: idSchema }));

// Query parameter validation
export const validatePagination = validate(z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default('20'),
    offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0)).default('0')
}));

// Email validation for password reset, etc.
export const validateEmail = validate(z.object({ email: emailSchema }));

// File upload validation
export const validateFileUpload = (allowedTypes: string[], maxSize: number = 5 * 1024 * 1024) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
                message: 'A file is required for this endpoint'
            });
        }

        // Check file type
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid file type',
                message: `Only ${allowedTypes.join(', ')} files are allowed`,
                received: req.file.mimetype
            });
        }

        // Check file size
        if (req.file.size > maxSize) {
            return res.status(400).json({
                success: false,
                error: 'File too large',
                message: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`,
                received: `${Math.round(req.file.size / 1024 / 1024)}MB`
            });
        }

        next();
    };
};

// Custom validation for complex business logic
export const validateRecipeOwnership = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // This would check if the user owns the recipe they're trying to modify
        // Implementation would depend on your authentication system
        // For now, this is a placeholder structure

        const recipeId = req.params.recipeId;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'You must be logged in to perform this action'
            });
        }

        // TODO: Implement actual ownership check with database query
        // const recipe = await db.query('SELECT userId FROM recipes WHERE id = $1', [recipeId]);
        // if (recipe.rows[0]?.userId !== userId) {
        //   return res.status(403).json({
        //     success: false,
        //     error: 'Access denied',
        //     message: 'You can only modify your own recipes'
        //   });
        // }

        next();
    } catch (error) {
        next(error);
    }
};

// Rate limiting validation helpers
export const validateRateLimitBypass = (req: Request, res: Response, next: NextFunction) => {
    // Check if request should bypass rate limiting (admin, monitoring, etc.)
    const bypassPaths = ['/api/health', '/api/database/health'];
    const isMonitoring = req.headers['user-agent']?.includes('monitoring');
    const isTrustedSource = req.isTrustedSource;

    if (bypassPaths.includes(req.path) || isMonitoring || isTrustedSource) {
        req.bypassRateLimit = true;
    }

    next();
};

// Export validation schemas for use in routes
export {
    idSchema,
    emailSchema,
    passwordSchema,
    usernameSchema
};

// Declare module augmentation for custom properties
declare global {
    namespace Express {
        interface Request {
            validatedData?: any;
            bypassRateLimit?: boolean;
        }
    }
} 