import { z } from 'zod';
// Base user schema
export const userSchema = z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(2, 'Name must be at least 2 characters')
});
// Schema for creating a new user
export const createUserSchema = userSchema;
// Schema for updating a user
export const updateUserSchema = userSchema.partial();
// Schema for user ID parameter
export const userIdSchema = z.object({
    userId: z.coerce.number().int().positive('User ID must be a positive integer')
});
