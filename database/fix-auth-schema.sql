-- Authentication Schema Fixes
-- This migration adds the missing authentication-related columns and tables

-- Add passwordHash column to users table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'passwordHash') THEN
        ALTER TABLE users ADD COLUMN "passwordHash" TEXT;
    END IF;
END $$;

-- Create refreshTokens table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS "refreshTokens" (
    "tokenId" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Create indexes for refreshTokens table (if they don't exist)
CREATE INDEX IF NOT EXISTS "refreshTokens_token_idx" ON "refreshTokens" ("token");
CREATE INDEX IF NOT EXISTS "refreshTokens_userId_idx" ON "refreshTokens" ("userId");

-- Fix sequence for users table if needed
-- This ensures the sequence is properly aligned with existing data
SELECT setval('"users_userId_seq"', COALESCE((SELECT MAX("userId") FROM users), 0) + 1, false);

-- Verify the schema
SELECT 
    'Authentication schema verification:' as status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'passwordHash') as passwordHash_exists,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'refreshTokens') as refreshTokens_table_exists;
