-- Add passwordHash to users table
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';

-- Create refresh token table for managing session
CREATE TABLE "refreshTokens" (
  "tokenId" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Index for looking up tokens
CREATE INDEX ON "refreshTokens" ("token");
CREATE INDEX ON "refreshTokens" ("userId"); 