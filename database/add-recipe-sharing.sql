-- Migration: Add Recipe Sharing & Export functionality
-- Date: 2024-12-19
-- Description: Add sharing capabilities, public links, and export tracking

-- Add sharing-related columns to recipes table
ALTER TABLE "recipes" 
ADD COLUMN "isPublic" BOOLEAN DEFAULT FALSE,
ADD COLUMN "shareToken" TEXT UNIQUE,
ADD COLUMN "shareCount" INTEGER DEFAULT 0,
ADD COLUMN "lastSharedAt" TIMESTAMPTZ(6),
ADD COLUMN "exportCount" INTEGER DEFAULT 0,
ADD COLUMN "lastExportedAt" TIMESTAMPTZ(6);

-- Create index for public recipes and share tokens
CREATE INDEX ON "recipes" ("isPublic");
CREATE INDEX ON "recipes" ("shareToken");

-- Create recipe shares tracking table
CREATE TABLE "recipeShares" (
  "shareId"       SERIAL PRIMARY KEY,
  "recipeId"      INTEGER NOT NULL REFERENCES "recipes"("recipeId") ON DELETE CASCADE,
  "sharedBy"      INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "shareType"     TEXT NOT NULL CHECK ("shareType" IN ('link', 'social', 'email', 'print', 'pdf')),
  "platform"      TEXT, -- 'facebook', 'twitter', 'instagram', 'whatsapp', etc.
  "recipientEmail" TEXT, -- for email shares
  "sharedAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "accessedAt"    TIMESTAMPTZ(6),
  "accessCount"   INTEGER DEFAULT 0
);

-- Create recipe exports tracking table  
CREATE TABLE "recipeExports" (
  "exportId"      SERIAL PRIMARY KEY,
  "recipeId"      INTEGER NOT NULL REFERENCES "recipes"("recipeId") ON DELETE CASCADE,
  "exportedBy"    INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "exportType"    TEXT NOT NULL CHECK ("exportType" IN ('pdf', 'print', 'json', 'text')),
  "exportFormat"  TEXT, -- 'standard', 'minimal', 'detailed', etc.
  "exportedAt"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Create recipe imports tracking table (for imported shared recipes)
CREATE TABLE "recipeImports" (
  "importId"      SERIAL PRIMARY KEY,
  "originalRecipeId" INTEGER REFERENCES "recipes"("recipeId") ON DELETE SET NULL,
  "importedBy"    INTEGER NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "shareToken"    TEXT NOT NULL,
  "newRecipeId"   INTEGER REFERENCES "recipes"("recipeId") ON DELETE CASCADE,
  "importedAt"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX ON "recipeShares" ("recipeId");
CREATE INDEX ON "recipeShares" ("sharedBy");
CREATE INDEX ON "recipeShares" ("shareType");
CREATE INDEX ON "recipeShares" ("sharedAt");
CREATE INDEX ON "recipeExports" ("recipeId");
CREATE INDEX ON "recipeExports" ("exportedBy");
CREATE INDEX ON "recipeExports" ("exportType");
CREATE INDEX ON "recipeImports" ("originalRecipeId");
CREATE INDEX ON "recipeImports" ("importedBy");
CREATE INDEX ON "recipeImports" ("shareToken");

-- Function to generate unique share tokens
CREATE OR REPLACE FUNCTION generate_share_token() RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(random()::text || clock_timestamp()::text, 'sha256'), 'hex')::char(16);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate share tokens when recipes are made public
CREATE OR REPLACE FUNCTION auto_generate_share_token() RETURNS TRIGGER AS $$
BEGIN
    IF NEW."isPublic" = TRUE AND (OLD."isPublic" = FALSE OR OLD."shareToken" IS NULL) THEN
        NEW."shareToken" = generate_share_token();
        WHILE EXISTS (SELECT 1 FROM "recipes" WHERE "shareToken" = NEW."shareToken") LOOP
            NEW."shareToken" = generate_share_token();
        END LOOP;
    ELSIF NEW."isPublic" = FALSE THEN
        NEW."shareToken" = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipes_share_token_trigger
    BEFORE UPDATE ON "recipes"
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_share_token(); 