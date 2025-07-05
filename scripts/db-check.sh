#!/bin/bash

# Smart Recipes Database Connection Verification Script
# This script ensures we're always connecting to the correct database

echo "🔍 Smart Recipes Database Verification"
echo "======================================"

# The correct database connection string (from server config)
CORRECT_DB="postgresql://postgres:postgres@localhost:5432/smart-recipes"

echo "✅ Correct database: smart-recipes (with hyphen)"
echo "🔗 Connection string: $CORRECT_DB"
echo ""

# Check if there are any duplicate databases
echo "📋 Checking for duplicate databases..."
SMART_DBS=$(psql -l | grep smart | wc -l)

if [ "$SMART_DBS" -gt 1 ]; then
    echo "⚠️  WARNING: Multiple smart-recipes databases found!"
    echo "   This can cause confusion. Here are the databases:"
    psql -l | grep smart
    echo ""
    echo "   Consider removing duplicates to prevent issues."
else
    echo "✅ Only one smart-recipes database found (correct)"
fi

echo ""
echo "🧪 Testing connection to correct database..."
USER_COUNT=$(psql "$CORRECT_DB" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')

if [ -n "$USER_COUNT" ]; then
    echo "✅ Connection successful! Users in database: $USER_COUNT"
else
    echo "❌ Failed to connect to database"
fi

echo ""
echo "💡 Usage:"
echo "   To connect to the correct database, always use:"
echo "   psql \"$CORRECT_DB\""
echo ""
echo "   Or use this shortcut:"
echo "   alias smart-psql='psql \"$CORRECT_DB\"'" 