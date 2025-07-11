import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

// Middleware factory to validate request body, params, or query
export const validate = (schema: AnyZodObject, source: 'body' | 'params' | 'query' = 'body') => async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate the request data against the schema
        const data = await schema.parseAsync(req[source]);

        req[source] = data;
        return next();
    } catch (error) {
        // If validation fails, return a 400 Bad Request with details
        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors.map(err => ({
                    path: err.path.join('.'),
                    message: err.message
                }))
            });
        }
        return next(error);
    }
};

export const validateParamsAndBody = (paramsSchema: AnyZodObject, bodySchema: AnyZodObject) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate params
        const validatedParams = await paramsSchema.parseAsync(req.params);
        req.params = validatedParams;

        // Validate body
        const validatedBody = await bodySchema.parseAsync(req.body);
        req.body = validatedBody;

        return next();
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors.map(err => ({
                    path: err.path.join('.'),
                    message: err.message
                }))
            });
        }
        return next(error);
    }
};