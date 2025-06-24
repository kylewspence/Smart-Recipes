import express from 'express';
import { z } from 'zod';
import db from '../db/db';
import { ClientError } from '../lib';

const router = express.Router();

// Enhanced unified search schema
const unifiedSearchSchema = z.object({
    query: z.string().min(1).max(200),
    type: z.enum(['all', 'recipes', 'ingredients', 'users']).default('all'),
    limit: z.coerce.number().int().positive().max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    fuzzy: z.coerce.boolean().default(false), // Enable fuzzy/typo-tolerant search
    filters: z.object({
        cuisine: z.string().optional(),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
        maxCookingTime: z.coerce.number().int().positive().optional(),
        spiceLevel: z.enum(['mild', 'medium', 'hot']).optional(),
        category: z.string().optional(),
        minRating: z.coerce.number().min(1).max(5).optional(),
        isGenerated: z.coerce.boolean().optional(),
        dateRange: z.object({
            start: z.string().optional(),
            end: z.string().optional()
        }).optional()
    }).optional()
});

// Enhanced advanced recipe search schema
const advancedRecipeSearchSchema = z.object({
    query: z.string().optional(),
    fuzzy: z.coerce.boolean().default(false),
    includeIngredients: z.array(z.string()).optional(),
    excludeIngredients: z.array(z.string()).optional(),
    cuisine: z.array(z.string()).optional(),
    difficulty: z.array(z.enum(['easy', 'medium', 'hard'])).optional(),
    maxCookingTime: z.coerce.number().int().positive().optional(),
    minCookingTime: z.coerce.number().int().positive().optional(),
    spiceLevel: z.array(z.enum(['mild', 'medium', 'hot'])).optional(),
    tags: z.array(z.string()).optional(),
    minRating: z.coerce.number().min(1).max(5).optional(),
    maxRating: z.coerce.number().min(1).max(5).optional(),
    servings: z.object({
        min: z.coerce.number().int().positive().optional(),
        max: z.coerce.number().int().positive().optional()
    }).optional(),
    isGenerated: z.coerce.boolean().optional(),
    isFavorite: z.coerce.boolean().optional(),
    userId: z.coerce.number().int().positive().optional(),
    dateRange: z.object({
        start: z.string().optional(),
        end: z.string().optional()
    }).optional(),
    sortBy: z.enum(['relevance', 'rating', 'cookingTime', 'prepTime', 'recent', 'popular']).default('relevance'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    limit: z.coerce.number().int().positive().max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0)
});

// Helper function to log search analytics
async function logSearchAnalytics(query: string, userId: number | null, resultCount: number, searchType: string, filters?: any) {
    try {
        await db.query(`
            INSERT INTO "searchAnalytics" ("query", "userId", "resultCount", "searchType", "filters")
            VALUES ($1, $2, $3, $4, $5)
        `, [query, userId, resultCount, searchType, filters ? JSON.stringify(filters) : null]);
    } catch (error) {
        // Don't fail the search if analytics logging fails
        console.warn('Failed to log search analytics:', error);
    }
}

/**
 * Enhanced unified search with full-text search capabilities
 * GET /api/search
 */
router.get('/', async (req, res, next) => {
    try {
        const searchParams = unifiedSearchSchema.parse(req.query);
        const userId = (req as any).user?.id || null;

        const results = {
            query: searchParams.query,
            type: searchParams.type,
            fuzzy: searchParams.fuzzy,
            pagination: {
                limit: searchParams.limit,
                offset: searchParams.offset
            },
            results: {}
        };

        let totalResults = 0;

        if (searchParams.type === 'all' || searchParams.type === 'recipes') {
            const recipeResults = await searchRecipesEnhanced(searchParams);
            (results.results as any).recipes = recipeResults;
            totalResults += recipeResults.length;
        }

        if (searchParams.type === 'all' || searchParams.type === 'ingredients') {
            const ingredientResults = await searchIngredientsEnhanced(searchParams);
            (results.results as any).ingredients = ingredientResults;
            totalResults += ingredientResults.length;
        }

        if (searchParams.type === 'all' || searchParams.type === 'users') {
            const userResults = await searchUsers(searchParams);
            (results.results as any).users = userResults;
            totalResults += userResults.length;
        }

        // Log search analytics
        await logSearchAnalytics(searchParams.query, userId, totalResults, searchParams.type, searchParams.filters);

        res.json({
            success: true,
            data: results
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Enhanced advanced recipe search with full-text search
 * GET /api/search/recipes/advanced
 */
router.get('/recipes/advanced', async (req, res, next) => {
    try {
        const searchParams = advancedRecipeSearchSchema.parse(req.query);
        const userId = (req as any).user?.id || null;

        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;
        let joinConditions = [];
        let selectFields = [];

        // Enhanced full-text search with relevance ranking
        if (searchParams.query) {
            if (searchParams.fuzzy) {
                // Use trigram similarity for fuzzy matching
                whereConditions.push(`(
                    similarity(r."title", $${paramIndex}) > 0.3 OR
                    similarity(r."description", $${paramIndex}) > 0.2 OR
                    r."searchVector" @@ plainto_tsquery('english', $${paramIndex})
                )`);
                selectFields.push(`
                    GREATEST(
                        similarity(r."title", $${paramIndex}),
                        similarity(r."description", $${paramIndex}),
                        ts_rank(r."searchVector", plainto_tsquery('english', $${paramIndex}))
                    ) as relevance_score
                `);
            } else {
                // Use standard full-text search
                whereConditions.push(`r."searchVector" @@ plainto_tsquery('english', $${paramIndex})`);
                selectFields.push(`ts_rank(r."searchVector", plainto_tsquery('english', $${paramIndex})) as relevance_score`);
            }
            queryParams.push(searchParams.query);
            paramIndex++;
        } else {
            selectFields.push('0 as relevance_score');
        }

        // Include specific ingredients with enhanced matching
        if (searchParams.includeIngredients && searchParams.includeIngredients.length > 0) {
            if (searchParams.fuzzy) {
                whereConditions.push(`r."recipeId" IN (
                    SELECT ri."recipeId"
                    FROM "recipeIngredients" ri
                    JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                    WHERE EXISTS (
                        SELECT 1 FROM unnest($${paramIndex}::text[]) AS search_ingredient
                        WHERE similarity(i."name", search_ingredient) > 0.4
                    )
                    GROUP BY ri."recipeId"
                    HAVING COUNT(DISTINCT i."ingredientId") >= $${paramIndex + 1}
                )`);
            } else {
                whereConditions.push(`r."recipeId" IN (
                    SELECT ri."recipeId"
                    FROM "recipeIngredients" ri
                    JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                    WHERE i."name" ILIKE ANY($${paramIndex})
                    GROUP BY ri."recipeId"
                    HAVING COUNT(DISTINCT i."ingredientId") = $${paramIndex + 1}
                )`);
                queryParams.push(searchParams.includeIngredients.map(ing => `%${ing}%`));
            }

            if (searchParams.fuzzy) {
                queryParams.push(searchParams.includeIngredients);
            }
            queryParams.push(searchParams.includeIngredients.length);
            paramIndex += 2;
        }

        // Exclude specific ingredients with enhanced matching
        if (searchParams.excludeIngredients && searchParams.excludeIngredients.length > 0) {
            if (searchParams.fuzzy) {
                whereConditions.push(`r."recipeId" NOT IN (
                    SELECT DISTINCT ri."recipeId"
                    FROM "recipeIngredients" ri
                    JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                    WHERE EXISTS (
                        SELECT 1 FROM unnest($${paramIndex}::text[]) AS exclude_ingredient
                        WHERE similarity(i."name", exclude_ingredient) > 0.6
                    )
                )`);
                queryParams.push(searchParams.excludeIngredients);
            } else {
                whereConditions.push(`r."recipeId" NOT IN (
                    SELECT DISTINCT ri."recipeId"
                    FROM "recipeIngredients" ri
                    JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                    WHERE i."name" ILIKE ANY($${paramIndex})
                )`);
                queryParams.push(searchParams.excludeIngredients.map(ing => `%${ing}%`));
            }
            paramIndex++;
        }

        // Multiple cuisines with fuzzy matching
        if (searchParams.cuisine && searchParams.cuisine.length > 0) {
            if (searchParams.fuzzy) {
                whereConditions.push(`EXISTS (
                    SELECT 1 FROM unnest($${paramIndex}::text[]) AS search_cuisine
                    WHERE similarity(r."cuisine", search_cuisine) > 0.5
                )`);
                queryParams.push(searchParams.cuisine);
            } else {
                whereConditions.push(`r."cuisine" ILIKE ANY($${paramIndex})`);
                queryParams.push(searchParams.cuisine.map(c => `%${c}%`));
            }
            paramIndex++;
        }

        // Multiple difficulties
        if (searchParams.difficulty && searchParams.difficulty.length > 0) {
            whereConditions.push(`r."difficulty" = ANY($${paramIndex})`);
            queryParams.push(searchParams.difficulty);
            paramIndex++;
        }

        // Cooking time range
        if (searchParams.maxCookingTime) {
            whereConditions.push(`r."cookingTime" <= $${paramIndex}`);
            queryParams.push(searchParams.maxCookingTime);
            paramIndex++;
        }

        if (searchParams.minCookingTime) {
            whereConditions.push(`r."cookingTime" >= $${paramIndex}`);
            queryParams.push(searchParams.minCookingTime);
            paramIndex++;
        }

        // Multiple spice levels
        if (searchParams.spiceLevel && searchParams.spiceLevel.length > 0) {
            whereConditions.push(`r."spiceLevel" = ANY($${paramIndex})`);
            queryParams.push(searchParams.spiceLevel);
            paramIndex++;
        }

        // Tags filter with fuzzy matching
        if (searchParams.tags && searchParams.tags.length > 0) {
            if (searchParams.fuzzy) {
                whereConditions.push(`r."recipeId" IN (
                    SELECT rt."recipeId"
                    FROM "recipeTags" rt
                    WHERE EXISTS (
                        SELECT 1 FROM unnest($${paramIndex}::text[]) AS search_tag
                        WHERE similarity(rt."tag", search_tag) > 0.5
                    )
                    GROUP BY rt."recipeId"
                    HAVING COUNT(DISTINCT rt."tag") >= 1
                )`);
                queryParams.push(searchParams.tags);
            } else {
                whereConditions.push(`r."recipeId" IN (
                    SELECT rt."recipeId"
                    FROM "recipeTags" rt
                    WHERE rt."tag" ILIKE ANY($${paramIndex})
                    GROUP BY rt."recipeId"
                    HAVING COUNT(DISTINCT rt."tag") >= $${paramIndex + 1}
                )`);
                queryParams.push(searchParams.tags.map(tag => `%${tag}%`));
                queryParams.push(Math.min(searchParams.tags.length, 1));
                paramIndex++;
            }
            paramIndex++;
        }

        // Rating range
        if (searchParams.minRating || searchParams.maxRating) {
            joinConditions.push(`
                LEFT JOIN (
                    SELECT "recipeId", AVG("rating") as avg_rating
                    FROM "recipeRatings"
                    GROUP BY "recipeId"
                ) ratings ON r."recipeId" = ratings."recipeId"
            `);

            if (searchParams.minRating) {
                whereConditions.push(`COALESCE(ratings.avg_rating, 0) >= $${paramIndex}`);
                queryParams.push(searchParams.minRating);
                paramIndex++;
            }

            if (searchParams.maxRating) {
                whereConditions.push(`COALESCE(ratings.avg_rating, 0) <= $${paramIndex}`);
                queryParams.push(searchParams.maxRating);
                paramIndex++;
            }
        }

        // Serving size range
        if (searchParams.servings) {
            if (searchParams.servings.min) {
                whereConditions.push(`r."servings" >= $${paramIndex}`);
                queryParams.push(searchParams.servings.min);
                paramIndex++;
            }
            if (searchParams.servings.max) {
                whereConditions.push(`r."servings" <= $${paramIndex}`);
                queryParams.push(searchParams.servings.max);
                paramIndex++;
            }
        }

        // Generated vs manual recipes
        if (searchParams.isGenerated !== undefined) {
            whereConditions.push(`r."isGenerated" = $${paramIndex}`);
            queryParams.push(searchParams.isGenerated);
            paramIndex++;
        }

        // Favorite recipes filter
        if (searchParams.isFavorite !== undefined && searchParams.userId) {
            if (searchParams.isFavorite) {
                whereConditions.push(`r."userId" = $${paramIndex} AND r."isFavorite" = true`);
                queryParams.push(searchParams.userId);
                paramIndex++;
            }
        }

        // User's recipes only
        if (searchParams.userId && searchParams.isFavorite === undefined) {
            whereConditions.push(`r."userId" = $${paramIndex}`);
            queryParams.push(searchParams.userId);
            paramIndex++;
        }

        // Date range filter
        if (searchParams.dateRange) {
            if (searchParams.dateRange.start) {
                whereConditions.push(`r."createdAt" >= $${paramIndex}`);
                queryParams.push(searchParams.dateRange.start);
                paramIndex++;
            }
            if (searchParams.dateRange.end) {
                whereConditions.push(`r."createdAt" <= $${paramIndex}`);
                queryParams.push(searchParams.dateRange.end);
                paramIndex++;
            }
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const joinClause = joinConditions.join(' ');

        // Enhanced ORDER BY clause with relevance scoring
        let orderBy = '';
        const sortOrder = searchParams.sortOrder.toUpperCase();

        switch (searchParams.sortBy) {
            case 'relevance':
                if (searchParams.query) {
                    orderBy = `ORDER BY relevance_score ${sortOrder}, r."createdAt" DESC`;
                } else {
                    orderBy = `ORDER BY r."createdAt" DESC`;
                }
                break;
            case 'rating':
                if (!joinConditions.some(j => j.includes('ratings'))) {
                    joinConditions.push(`
                        LEFT JOIN (
                            SELECT "recipeId", AVG("rating") as avg_rating
                            FROM "recipeRatings"
                            GROUP BY "recipeId"
                        ) ratings ON r."recipeId" = ratings."recipeId"
                    `);
                }
                orderBy = `ORDER BY COALESCE(ratings.avg_rating, 0) ${sortOrder}, r."createdAt" DESC`;
                break;
            case 'cookingTime':
                orderBy = `ORDER BY COALESCE(r."cookingTime", 999999) ${sortOrder}`;
                break;
            case 'prepTime':
                orderBy = `ORDER BY COALESCE(r."prepTime", 999999) ${sortOrder}`;
                break;
            case 'recent':
                orderBy = `ORDER BY r."createdAt" ${sortOrder}`;
                break;
            case 'popular':
                joinConditions.push(`
                    LEFT JOIN (
                        SELECT "recipeId", COUNT(*) as save_count
                        FROM "savedRecipes"
                        GROUP BY "recipeId"
                    ) saves ON r."recipeId" = saves."recipeId"
                `);
                orderBy = `ORDER BY COALESCE(saves.save_count, 0) ${sortOrder}, r."createdAt" DESC`;
                break;
        }

        // Add pagination parameters
        queryParams.push(searchParams.limit, searchParams.offset);

        const searchQuery = `
            SELECT r.*, 
                   ${selectFields.join(', ')},
                   COALESCE(
                       (SELECT json_agg(
                           json_build_object(
                               'ingredientId', ri."ingredientId",
                               'name', i."name",
                               'quantity', ri."quantity",
                               'category', i."category"
                           )
                       )
                       FROM "recipeIngredients" ri
                       JOIN "ingredients" i ON ri."ingredientId" = i."ingredientId"
                       WHERE ri."recipeId" = r."recipeId"
                       ), '[]'::json) as ingredients,
                   COALESCE(
                       (SELECT json_agg(rt."tag")
                       FROM "recipeTags" rt
                       WHERE rt."recipeId" = r."recipeId"
                       ), '[]'::json) as tags,
                   COALESCE(
                       (SELECT ROUND(AVG(rr."rating"), 2)
                       FROM "recipeRatings" rr
                       WHERE rr."recipeId" = r."recipeId"
                       ), 0) as avgRating,
                   COALESCE(
                       (SELECT COUNT(*)
                       FROM "recipeRatings" rr
                       WHERE rr."recipeId" = r."recipeId"
                       ), 0) as ratingCount,
                   COALESCE(
                       (SELECT COUNT(*)
                       FROM "savedRecipes" sr
                       WHERE sr."recipeId" = r."recipeId"
                       ), 0) as saveCount
            FROM "recipes" r
            ${joinConditions.join(' ')}
            ${whereClause}
            ${orderBy}
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        const results = await db.query(searchQuery, queryParams);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(DISTINCT r."recipeId") as total
            FROM "recipes" r
            ${joinConditions.join(' ')}
            ${whereClause}
        `;
        const countResult = await db.query(countQuery, queryParams.slice(0, -2));

        // Log search analytics
        await logSearchAnalytics(
            searchParams.query || 'advanced_filter',
            userId,
            results.rows.length,
            'advanced_recipe',
            searchParams
        );

        res.json({
            success: true,
            data: {
                recipes: results.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].total),
                    limit: searchParams.limit,
                    offset: searchParams.offset,
                    hasMore: (searchParams.offset + searchParams.limit) < parseInt(countResult.rows[0].total)
                },
                filters: searchParams,
                searchMetadata: {
                    hasTextSearch: !!searchParams.query,
                    fuzzySearch: searchParams.fuzzy,
                    hasFilters: Object.keys(searchParams).length > 4,
                    sortBy: searchParams.sortBy,
                    sortOrder: searchParams.sortOrder,
                    relevanceScoring: !!searchParams.query
                }
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Enhanced search suggestions with popular searches and typo correction
 * GET /api/search/suggestions
 */
router.get('/suggestions', async (req, res, next) => {
    try {
        const { query, type = 'all', limit = 10, includePopular = true } = req.query;

        if (!query || typeof query !== 'string' || query.length < 2) {
            // Return popular searches if no query provided
            if (includePopular === 'true') {
                const popularSearches = await db.query(`
                    SELECT "query", search_count, 'popular' as suggestion_type
                    FROM "popularSearches"
                    LIMIT $1
                `, [Math.min(parseInt(limit as string) || 10, 20)]);

                return res.json({
                    success: true,
                    data: {
                        query: '',
                        suggestions: {
                            popular: popularSearches.rows
                        }
                    }
                });
            }
            throw new ClientError(400, 'Query must be at least 2 characters long');
        }

        const limitNum = Math.min(parseInt(limit as string) || 10, 20);
        const suggestions: any = {};

        if (type === 'all' || type === 'recipes') {
            // Enhanced recipe suggestions with fuzzy matching
            const recipeSuggestions = await db.query(`
                SELECT DISTINCT r."title", 'recipe' as type, r."recipeId" as id,
                       similarity(r."title", $1) as similarity_score
                FROM "recipes" r
                WHERE similarity(r."title", $1) > 0.3 OR r."title" ILIKE $2
                ORDER BY similarity_score DESC, r."title"
                LIMIT $3
            `, [query, `%${query}%`, limitNum]);

            suggestions.recipes = recipeSuggestions.rows;
        }

        if (type === 'all' || type === 'ingredients') {
            // Enhanced ingredient suggestions with fuzzy matching
            const ingredientSuggestions = await db.query(`
                SELECT DISTINCT i."name", 'ingredient' as type, i."ingredientId" as id,
                       similarity(i."name", $1) as similarity_score
                FROM "ingredients" i
                WHERE similarity(i."name", $1) > 0.4 OR i."name" ILIKE $2
                ORDER BY similarity_score DESC, i."name"
                LIMIT $3
            `, [query, `%${query}%`, limitNum]);

            suggestions.ingredients = ingredientSuggestions.rows;
        }

        if (type === 'all' || type === 'cuisines') {
            const cuisineSuggestions = await db.query(`
                SELECT DISTINCT r."cuisine" as name, 'cuisine' as type,
                       similarity(r."cuisine", $1) as similarity_score
                FROM "recipes" r
                WHERE r."cuisine" IS NOT NULL 
                  AND (similarity(r."cuisine", $1) > 0.4 OR r."cuisine" ILIKE $2)
                ORDER BY similarity_score DESC, r."cuisine"
                LIMIT $3
            `, [query, `%${query}%`, limitNum]);

            suggestions.cuisines = cuisineSuggestions.rows;
        }

        if (type === 'all' || type === 'tags') {
            const tagSuggestions = await db.query(`
                SELECT DISTINCT rt."tag" as name, 'tag' as type,
                       similarity(rt."tag", $1) as similarity_score
                FROM "recipeTags" rt
                WHERE similarity(rt."tag", $1) > 0.4 OR rt."tag" ILIKE $2
                ORDER BY similarity_score DESC, rt."tag"
                LIMIT $3
            `, [query, `%${query}%`, limitNum]);

            suggestions.tags = tagSuggestions.rows;
        }

        // Include popular related searches
        if (includePopular === 'true') {
            const relatedPopular = await db.query(`
                SELECT "query", search_count, 'popular' as suggestion_type
                FROM "popularSearches"
                WHERE similarity("query", $1) > 0.3
                ORDER BY search_count DESC
                LIMIT 5
            `, [query]);

            suggestions.popular = relatedPopular.rows;
        }

        res.json({
            success: true,
            data: {
                query,
                suggestions
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Get popular search terms and trending content
 * GET /api/search/trending
 */
router.get('/trending', async (req, res, next) => {
    try {
        const { days = 7, limit = 10 } = req.query;

        const daysNum = Math.min(parseInt(days as string) || 7, 30);
        const limitNum = Math.min(parseInt(limit as string) || 10, 20);

        // Get trending recipes (most saved/viewed recently)
        const trendingRecipes = await db.query(`
            SELECT r."recipeId", r."title", r."cuisine", r."difficulty",
                   COUNT(DISTINCT sr."userId") as save_count,
                   COALESCE(AVG(rr."rating"), 0) as avg_rating
            FROM "recipes" r
            LEFT JOIN "savedRecipes" sr ON r."recipeId" = sr."recipeId"
            LEFT JOIN "recipeRatings" rr ON r."recipeId" = rr."recipeId"
            WHERE r."createdAt" >= NOW() - INTERVAL '${daysNum} days'
            GROUP BY r."recipeId", r."title", r."cuisine", r."difficulty"
            HAVING COUNT(DISTINCT sr."userId") > 0
            ORDER BY save_count DESC, avg_rating DESC
            LIMIT $1
        `, [limitNum]);

        // Get trending ingredients
        const trendingIngredients = await db.query(`
            SELECT i."ingredientId", i."name", i."category",
                   COUNT(DISTINCT r."recipeId") as recipe_count
            FROM "ingredients" i
            JOIN "recipeIngredients" ri ON i."ingredientId" = ri."ingredientId"
            JOIN "recipes" r ON ri."recipeId" = r."recipeId"
            WHERE r."createdAt" >= NOW() - INTERVAL '${daysNum} days'
            GROUP BY i."ingredientId", i."name", i."category"
            ORDER BY recipe_count DESC
            LIMIT $1
        `, [limitNum]);

        // Get trending cuisines
        const trendingCuisines = await db.query(`
            SELECT r."cuisine", COUNT(*) as recipe_count,
                   COALESCE(AVG(rr."rating"), 0) as avg_rating
            FROM "recipes" r
            LEFT JOIN "recipeRatings" rr ON r."recipeId" = rr."recipeId"
            WHERE r."createdAt" >= NOW() - INTERVAL '${daysNum} days'
              AND r."cuisine" IS NOT NULL
            GROUP BY r."cuisine"
            ORDER BY recipe_count DESC, avg_rating DESC
            LIMIT $1
        `, [limitNum]);

        res.json({
            success: true,
            data: {
                period: `${daysNum} days`,
                trending: {
                    recipes: trendingRecipes.rows,
                    ingredients: trendingIngredients.rows,
                    cuisines: trendingCuisines.rows
                }
            }
        });
    } catch (err) {
        next(err);
    }
});

// Enhanced helper functions with full-text search
async function searchRecipesEnhanced(params: any) {
    let whereConditions = ['1=1'];
    let queryParams = [];
    let paramIndex = 1;
    let relevanceScore = '1 as relevance_score'; // Default relevance score

    // Only add search conditions if query is provided
    if (params.query && params.query.trim()) {
        if (params.fuzzy) {
            whereConditions.push(`(
                similarity(r."title", $${paramIndex}) > 0.3 OR
                similarity(r."description", $${paramIndex}) > 0.2 OR
                r."searchVector" @@ plainto_tsquery('english', $${paramIndex})
            )`);
            relevanceScore = `GREATEST(
                similarity(r."title", $${paramIndex}),
                similarity(r."description", $${paramIndex}),
                ts_rank(r."searchVector", plainto_tsquery('english', $${paramIndex}))
              ) as relevance_score`;
            queryParams.push(params.query);
            paramIndex++;
        } else {
            whereConditions.push(`(
                r."searchVector" @@ plainto_tsquery('english', $${paramIndex}) OR
                r."title" ILIKE $${paramIndex + 1} OR 
                r."description" ILIKE $${paramIndex + 1}
            )`);
            relevanceScore = `ts_rank(r."searchVector", plainto_tsquery('english', $${paramIndex})) as relevance_score`;
            queryParams.push(params.query, `%${params.query}%`);
            paramIndex += 2;
        }
    }

    const query = `
        SELECT r."recipeId", r."title", r."description", r."cuisine", r."difficulty",
               'recipe' as result_type,
               COALESCE(AVG(rr."rating"), 0) as avg_rating,
               ${relevanceScore}
        FROM "recipes" r
        LEFT JOIN "recipeRatings" rr ON r."recipeId" = rr."recipeId"
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY r."recipeId", r."title", r."description", r."cuisine", r."difficulty"
        ORDER BY relevance_score DESC, avg_rating DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(Math.min(params.limit, 10), params.offset);

    const result = await db.query(query, queryParams);
    return result.rows;
}

async function searchIngredientsEnhanced(params: any) {
    let whereConditions = ['1=1'];
    let queryParams = [];
    let paramIndex = 1;
    let relevanceScore = '1 as relevance_score'; // Default relevance score

    // Only add search conditions if query is provided
    if (params.query && params.query.trim()) {
        if (params.fuzzy) {
            whereConditions.push(`similarity(i."name", $${paramIndex}) > 0.4`);
            relevanceScore = `similarity(i."name", $${paramIndex}) as relevance_score`;
            queryParams.push(params.query);
            paramIndex++;
        } else {
            whereConditions.push(`(
                to_tsvector('english', i."name") @@ plainto_tsquery('english', $${paramIndex}) OR
                i."name" ILIKE $${paramIndex + 1}
            )`);
            relevanceScore = `ts_rank(to_tsvector('english', i."name"), plainto_tsquery('english', $${paramIndex})) as relevance_score`;
            queryParams.push(params.query, `%${params.query}%`);
            paramIndex += 2;
        }
    }

    const query = `
        SELECT i."ingredientId", i."name", ic."name" as category,
               'ingredient' as result_type,
               COUNT(DISTINCT ri."recipeId") as usage_count,
               ${relevanceScore}
        FROM "ingredients" i
        LEFT JOIN "ingredientCategories" ic ON i."categoryId" = ic."categoryId"
        LEFT JOIN "recipeIngredients" ri ON i."ingredientId" = ri."ingredientId"
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY i."ingredientId", i."name", ic."name"
        ORDER BY relevance_score DESC, usage_count DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(Math.min(params.limit, 10), params.offset);

    const result = await db.query(query, queryParams);
    return result.rows;
}

async function searchUsers(params: any) {
    let whereCondition = '1=1';
    let queryParams = [];
    let paramIndex = 1;

    // Only add search condition if query is provided
    if (params.query && params.query.trim()) {
        whereCondition = `u."name" ILIKE $${paramIndex}`;
        queryParams.push(`%${params.query}%`);
        paramIndex++;
    }

    const query = `
        SELECT u."userId", u."name", u."email",
               'user' as result_type,
               COUNT(DISTINCT r."recipeId") as recipe_count
        FROM "users" u
        LEFT JOIN "recipes" r ON u."userId" = r."userId"
        WHERE ${whereCondition}
        GROUP BY u."userId", u."name", u."email"
        ORDER BY recipe_count DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(Math.min(params.limit, 5), params.offset);

    const result = await db.query(query, queryParams);

    // Remove sensitive information
    return result.rows.map(user => ({
        userId: user.userId,
        name: user.name,
        result_type: user.result_type,
        recipe_count: user.recipe_count
    }));
}

export default router; 