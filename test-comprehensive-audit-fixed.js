#!/usr/bin/env node

/**
 * Smart Recipes Comprehensive System Audit - Fixed Version
 * 
 * This script tests ALL API endpoints and functionality with detailed error reporting
 */

const axios = require('axios');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3001/api';
const TEST_EMAIL = 'audit-test@smartrecipes.com';
const TEST_PASSWORD = 'AuditTest123!';
const TEST_NAME = 'Audit Test User';

// Test results tracking
const results = {
    passed: 0,
    failed: 0,
    tests: [],
    errors: [],
    detailedErrors: []
};

// Helper functions
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
}

function logTest(testName, passed, details = '', errorDetails = null) {
    results.tests.push({ testName, passed, details, errorDetails, timestamp: new Date().toISOString() });
    if (passed) {
        results.passed++;
        log(`✅ PASS: ${testName}${details ? ` - ${details}` : ''}`, 'success');
    } else {
        results.failed++;
        log(`❌ FAIL: ${testName}${details ? ` - ${details}` : ''}`, 'error');
        results.errors.push(`${testName}: ${details}`);
        if (errorDetails) {
            results.detailedErrors.push({ testName, error: errorDetails });
            console.log(`   🔍 Error Details:`, JSON.stringify(errorDetails, null, 2));
        }
    }
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status || 500,
            fullError: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data,
                headers: error.response.headers
            } : error
        };
    }
}

// Test categories
async function testHealthAndConnectivity() {
    log('\n🔍 Testing Health and Connectivity...');

    // Test basic health check
    const health = await makeRequest('GET', '/health');
    logTest('API Health Check', health.success && health.data?.success === true,
        health.success ? `Status: ${health.data.status}` : health.error,
        health.success ? null : health.fullError);

    // Test database health
    const dbHealth = await makeRequest('GET', '/database/health');
    logTest('Database Health Check', dbHealth.success && dbHealth.data?.success === true,
        dbHealth.success ? `DB Status: ${dbHealth.data.status}` : dbHealth.error,
        dbHealth.success ? null : dbHealth.fullError);

    // Test 404 handling
    const notFound = await makeRequest('GET', '/nonexistent-endpoint');
    logTest('404 Error Handling', notFound.status === 404 && notFound.error?.success === false,
        notFound.status === 404 ? 'Correctly returns 404' : `Unexpected status: ${notFound.status}`,
        notFound.status === 404 ? null : notFound.fullError);
}

async function testAuthentication() {
    log('\n🔐 Testing Authentication System...');

    // Test auth health
    const authTest = await makeRequest('GET', '/auth/test');
    logTest('Auth Database Connection', authTest.success && authTest.data?.success === true,
        authTest.success ? `User count: ${authTest.data.userCount}` : authTest.error,
        authTest.success ? null : authTest.fullError);

    // Test registration
    const register = await makeRequest('POST', '/auth/register', {
        email: TEST_EMAIL,
        name: TEST_NAME,
        password: TEST_PASSWORD,
        confirmPassword: TEST_PASSWORD
    });

    // Registration might fail if user exists, that's okay
    const registrationWorking = register.success || (register.status === 400 && register.error?.error?.includes('exists'));
    logTest('User Registration', registrationWorking,
        register.success ? 'New user created' : 'User already exists (expected)',
        registrationWorking ? null : register.fullError);

    // Test login
    const login = await makeRequest('POST', '/auth/login', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
    });
    logTest('User Login', login.success && login.data?.token,
        login.success ? 'Token received' : login.error,
        login.success ? null : login.fullError);

    if (!login.success) {
        throw new Error('Cannot proceed without authentication token');
    }

    global.authToken = login.data.token;
    global.testUserId = login.data.user?.userId;

    // Test protected route
    const me = await makeRequest('GET', '/auth/me', null, {
        'Authorization': `Bearer ${global.authToken}`
    });
    logTest('Protected Route Access', me.success && me.data?.user,
        me.success ? `User: ${me.data.user.name}` : me.error,
        me.success ? null : me.fullError);

    return global.authToken;
}

async function testUserManagement() {
    log('\n👥 Testing User Management...');

    if (!global.authToken) {
        logTest('User Management', false, 'No auth token available');
        return;
    }

    const headers = { 'Authorization': `Bearer ${global.authToken}` };

    // Test getting all users (might be admin only)
    const users = await makeRequest('GET', '/users', null, headers);
    logTest('Get Users List', users.success || users.status === 403,
        users.success ? `Found ${users.data?.length || 0} users` :
            users.status === 403 ? 'Correctly restricted (admin only)' : users.error,
        (users.success || users.status === 403) ? null : users.fullError);
}

async function testPreferences() {
    log('\n⚙️ Testing User Preferences...');

    if (!global.authToken || !global.testUserId) {
        logTest('User Preferences', false, 'No auth token or user ID available');
        return;
    }

    const headers = { 'Authorization': `Bearer ${global.authToken}` };

    // Test getting preferences (might not exist initially)
    const getPrefs = await makeRequest('GET', `/users/${global.testUserId}/preferences`, null, headers);
    logTest('Get User Preferences', getPrefs.success || getPrefs.status === 404,
        getPrefs.success ? 'Preferences loaded' :
            getPrefs.status === 404 ? 'No preferences found (expected for new user)' : getPrefs.error,
        (getPrefs.success || getPrefs.status === 404) ? null : getPrefs.fullError);

    // Test setting preferences
    const testPreferences = {
        dietaryRestrictions: ['vegetarian'],
        allergies: ['nuts'],
        cuisinePreferences: ['italian', 'mexican'],
        spiceLevel: 'medium',
        cookingSkillLevel: 'intermediate',
        cookingTime: 30,
        servingSize: 4,
        dislikedIngredients: ['mushrooms'],
        favoriteIngredients: ['tomatoes', 'cheese']
    };

    const setPrefs = await makeRequest('POST', `/users/${global.testUserId}/preferences`, testPreferences, headers);
    logTest('Set User Preferences', setPrefs.success && setPrefs.data?.success,
        setPrefs.success ? 'Preferences saved successfully' : setPrefs.error,
        setPrefs.success ? null : setPrefs.fullError);

    // Test getting preferences after setting them
    const getPrefsAfter = await makeRequest('GET', `/users/${global.testUserId}/preferences`, null, headers);
    logTest('Get Preferences After Setting', getPrefsAfter.success && getPrefsAfter.data?.dietaryRestrictions,
        getPrefsAfter.success ? `Found ${getPrefsAfter.data.dietaryRestrictions?.length || 0} dietary restrictions` : getPrefsAfter.error,
        getPrefsAfter.success ? null : getPrefsAfter.fullError);
}

async function testIngredients() {
    log('\n🥕 Testing Ingredients System...');

    // Test getting all ingredients
    const ingredients = await makeRequest('GET', '/ingredients');
    logTest('Get All Ingredients', ingredients.success && Array.isArray(ingredients.data),
        ingredients.success ? `Found ${ingredients.data?.length || 'unknown number of'} ingredients` : ingredients.error,
        ingredients.success ? null : ingredients.fullError);

    // Test ingredient search
    const searchIngredients = await makeRequest('GET', '/ingredients?query=tomato&limit=5');
    logTest('Search Ingredients', searchIngredients.success && Array.isArray(searchIngredients.data),
        searchIngredients.success ? `Found ${searchIngredients.data?.length || 'unknown number of'} tomato-related ingredients` : searchIngredients.error,
        searchIngredients.success ? null : searchIngredients.fullError);

    // Test ingredient categories
    const categories = await makeRequest('GET', '/ingredients?category=vegetables&limit=10');
    logTest('Get Ingredients by Category', categories.success && Array.isArray(categories.data),
        categories.success ? `Found ${categories.data?.length || 'unknown number of'} vegetables` : categories.error,
        categories.success ? null : categories.fullError);
}

async function testRecipes() {
    log('\n🍳 Testing Recipe System...');

    if (!global.authToken || !global.testUserId) {
        logTest('Recipe System', false, 'No auth token or user ID available');
        return;
    }

    const headers = { 'Authorization': `Bearer ${global.authToken}` };

    // Test getting all recipes
    const recipes = await makeRequest('GET', '/recipes', null, headers);
    logTest('Get All Recipes', recipes.success && Array.isArray(recipes.data),
        recipes.success ? `Found ${recipes.data?.length || 'unknown number of'} recipes` : recipes.error,
        recipes.success ? null : recipes.fullError);

    // Test recipe generation
    const generationRequest = {
        mealType: 'dinner',
        cuisineType: 'italian',
        ingredients: ['tomatoes', 'pasta', 'cheese'],
        servingSize: 4,
        cookingTime: 30,
        spiceLevel: 'medium'
    };

    const generateRecipe = await makeRequest('POST', '/recipes/generate', generationRequest, headers);
    logTest('Generate Recipe', generateRecipe.success && generateRecipe.data?.recipe,
        generateRecipe.success ? `Generated: ${generateRecipe.data.recipe?.title}` : generateRecipe.error,
        generateRecipe.success ? null : generateRecipe.fullError);

    if (generateRecipe.success && generateRecipe.data?.recipe?.id) {
        global.testRecipeId = generateRecipe.data.recipe.id;

        // Test getting specific recipe
        const getRecipe = await makeRequest('GET', `/recipes/${global.testRecipeId}`, null, headers);
        logTest('Get Specific Recipe', getRecipe.success && getRecipe.data?.id,
            getRecipe.success ? `Recipe: ${getRecipe.data.title}` : getRecipe.error,
            getRecipe.success ? null : getRecipe.fullError);

        // Test favoriting recipe
        const favoriteRecipe = await makeRequest('POST', `/recipes/${global.testRecipeId}/favorite`, { userId: global.testUserId }, headers);
        logTest('Favorite Recipe', favoriteRecipe.success && favoriteRecipe.data?.success,
            favoriteRecipe.success ? 'Recipe favorited' : favoriteRecipe.error,
            favoriteRecipe.success ? null : favoriteRecipe.fullError);

        // Test unfavoriting recipe
        const unfavoriteRecipe = await makeRequest('DELETE', `/recipes/${global.testRecipeId}/favorite`, { userId: global.testUserId }, headers);
        logTest('Unfavorite Recipe', unfavoriteRecipe.success && unfavoriteRecipe.data?.success,
            unfavoriteRecipe.success ? 'Recipe unfavorited' : unfavoriteRecipe.error,
            unfavoriteRecipe.success ? null : unfavoriteRecipe.fullError);

        // Test getting recipe substitutions
        if (getRecipe.success && getRecipe.data?.ingredients?.length > 0) {
            const firstIngredientId = getRecipe.data.ingredients[0].ingredientId || getRecipe.data.ingredients[0].id;
            if (firstIngredientId) {
                const substitutions = await makeRequest('GET', `/recipes/${global.testRecipeId}/substitutions/${firstIngredientId}`, null, headers);
                logTest('Get Recipe Substitutions', substitutions.success && Array.isArray(substitutions.data),
                    substitutions.success ? `Found ${substitutions.data?.length || 'unknown number of'} substitutions` : substitutions.error,
                    substitutions.success ? null : substitutions.fullError);
            }
        }
    }

    // Test getting user's saved recipes
    const savedRecipes = await makeRequest('GET', '/recipes/saved', null, headers);
    logTest('Get Saved Recipes', savedRecipes.success || savedRecipes.status === 404,
        savedRecipes.success ? `Found ${savedRecipes.data?.length || 0} saved recipes` :
            savedRecipes.status === 404 ? 'No saved recipes (expected)' : savedRecipes.error,
        (savedRecipes.success || savedRecipes.status === 404) ? null : savedRecipes.fullError);

    // Test getting user's favorite recipes
    const favoriteRecipes = await makeRequest('GET', '/recipes/favorites', null, headers);
    logTest('Get Favorite Recipes', favoriteRecipes.success || favoriteRecipes.status === 404,
        favoriteRecipes.success ? `Found ${favoriteRecipes.data?.length || 0} favorite recipes` :
            favoriteRecipes.status === 404 ? 'No favorite recipes (expected)' : favoriteRecipes.error,
        (favoriteRecipes.success || favoriteRecipes.status === 404) ? null : favoriteRecipes.fullError);
}

async function testSearch() {
    log('\n🔍 Testing Search System...');

    // Test basic search
    const basicSearch = await makeRequest('GET', '/search?q=pasta');
    logTest('Basic Recipe Search', basicSearch.success && Array.isArray(basicSearch.data),
        basicSearch.success ? `Found ${basicSearch.data?.length || 'unknown number of'} pasta recipes` : basicSearch.error,
        basicSearch.success ? null : basicSearch.fullError);

    // Test advanced search
    const advancedSearch = await makeRequest('GET', '/search?q=chicken&cuisine=italian&maxCookingTime=60');
    logTest('Advanced Recipe Search', advancedSearch.success && Array.isArray(advancedSearch.data),
        advancedSearch.success ? `Found ${advancedSearch.data?.length || 'unknown number of'} Italian chicken recipes` : advancedSearch.error,
        advancedSearch.success ? null : advancedSearch.fullError);

    // Test ingredient-based search
    const ingredientSearch = await makeRequest('GET', '/search?ingredients=tomato,cheese&excludeIngredients=mushroom');
    logTest('Ingredient-based Search', ingredientSearch.success && Array.isArray(ingredientSearch.data),
        ingredientSearch.success ? `Found ${ingredientSearch.data?.length || 'unknown number of'} recipes with tomato and cheese, no mushroom` : ingredientSearch.error,
        ingredientSearch.success ? null : ingredientSearch.fullError);
}

async function testRecommendations() {
    log('\n🎯 Testing Recommendation System...');

    if (!global.authToken || !global.testUserId) {
        logTest('Recommendation System', false, 'No auth token or user ID available');
        return;
    }

    const headers = { 'Authorization': `Bearer ${global.authToken}` };

    // Test getting recommendations
    const recommendations = await makeRequest('GET', '/recommendations', null, headers);
    logTest('Get Recipe Recommendations', recommendations.success && Array.isArray(recommendations.data),
        recommendations.success ? `Found ${recommendations.data?.length || 'unknown number of'} recommended recipes` : recommendations.error,
        recommendations.success ? null : recommendations.fullError);

    // Test personalized recommendations
    const personalizedRecs = await makeRequest('GET', `/recommendations?userId=${global.testUserId}&limit=5`, null, headers);
    logTest('Get Personalized Recommendations', personalizedRecs.success && Array.isArray(personalizedRecs.data),
        personalizedRecs.success ? `Found ${personalizedRecs.data?.length || 'unknown number of'} personalized recommendations` : personalizedRecs.error,
        personalizedRecs.success ? null : personalizedRecs.fullError);
}

async function testAnalytics() {
    log('\n📊 Testing Analytics System...');

    // Test analytics health
    const analyticsHealth = await makeRequest('GET', '/analytics/health');
    logTest('Analytics Health Check', analyticsHealth.success && analyticsHealth.data?.status === 'healthy',
        analyticsHealth.success ? `Analytics: ${analyticsHealth.data.status}` : analyticsHealth.error,
        analyticsHealth.success ? null : analyticsHealth.fullError);

    // Test posting analytics event
    const analyticsEvent = {
        type: 'event',
        data: {
            action: 'recipe_generated',
            category: 'recipes',
            label: 'audit_test',
            value: 1,
            userId: global.testUserId?.toString(),
            sessionId: 'audit-session-123'
        },
        timestamp: Date.now()
    };

    const postEvent = await makeRequest('POST', '/analytics/events', analyticsEvent);
    logTest('Post Analytics Event', postEvent.success && postEvent.data?.success,
        postEvent.success ? 'Event logged successfully' : postEvent.error,
        postEvent.success ? null : postEvent.fullError);

    // Test getting analytics data (might require admin auth)
    const analyticsData = await makeRequest('GET', '/analytics/summary?days=7');
    logTest('Get Analytics Summary', analyticsData.success || analyticsData.status === 403,
        analyticsData.success ? 'Analytics data retrieved' :
            analyticsData.status === 403 ? 'Correctly restricted (admin only)' : analyticsData.error,
        (analyticsData.success || analyticsData.status === 403) ? null : analyticsData.fullError);
}

async function testSecurity() {
    log('\n🛡️ Testing Security Features...');

    // Test security status
    const securityTest = await makeRequest('GET', '/security/test');
    logTest('Security Test Endpoint', securityTest.success && securityTest.data?.securityStatus,
        securityTest.success ? `Security: ${securityTest.data.securityStatus}` : securityTest.error,
        securityTest.success ? null : securityTest.fullError);

    // Test rate limiting status
    const rateLimitStatus = await makeRequest('GET', '/rate-limit-status');
    logTest('Rate Limiting Status', rateLimitStatus.success && rateLimitStatus.data,
        rateLimitStatus.success ? 'Rate limiting active' : rateLimitStatus.error,
        rateLimitStatus.success ? null : rateLimitStatus.fullError);

    // Test input sanitization (this should be blocked)
    const maliciousInput = await makeRequest('POST', '/auth/login', {
        email: '<script>alert("xss")</script>',
        password: 'test'
    });
    logTest('XSS Protection', !maliciousInput.success && maliciousInput.status >= 400,
        !maliciousInput.success ? 'Malicious input correctly blocked' : 'XSS protection may be compromised',
        !maliciousInput.success ? null : maliciousInput.fullError);
}

async function testPrivacy() {
    log('\n🔒 Testing Privacy and GDPR Features...');

    // Test privacy policy endpoint
    const privacyPolicy = await makeRequest('GET', '/privacy/policy');
    logTest('Privacy Policy Endpoint', privacyPolicy.success && privacyPolicy.data?.policy,
        privacyPolicy.success ? 'Privacy policy available' : privacyPolicy.error,
        privacyPolicy.success ? null : privacyPolicy.fullError);

    // Test cookie consent endpoint
    const cookieConsent = await makeRequest('GET', '/privacy/cookie-consent');
    logTest('Cookie Consent Endpoint', cookieConsent.success && cookieConsent.data?.consent,
        cookieConsent.success ? 'Cookie consent system working' : cookieConsent.error,
        cookieConsent.success ? null : cookieConsent.fullError);

    if (global.authToken) {
        const headers = { 'Authorization': `Bearer ${global.authToken}` };

        // Test data export request
        const dataExport = await makeRequest('GET', '/privacy/data-export?format=json', null, headers);
        logTest('GDPR Data Export', dataExport.success && dataExport.data?.data,
            dataExport.success ? 'User data export working' : dataExport.error,
            dataExport.success ? null : dataExport.fullError);
    }
}

async function testMigrations() {
    log('\n🔄 Testing Database Migrations...');

    // Test migration status
    const migrationStatus = await makeRequest('GET', '/migrations/status');
    logTest('Migration Status Check', migrationStatus.success && migrationStatus.data?.data,
        migrationStatus.success ? `Migrations: ${migrationStatus.data.data.appliedMigrations?.length || 0} applied` : migrationStatus.error,
        migrationStatus.success ? null : migrationStatus.fullError);

    // Test migration validation
    const migrationValidation = await makeRequest('GET', '/migrations/validate');
    logTest('Migration Validation', migrationValidation.success && migrationValidation.data?.data?.valid,
        migrationValidation.success ? 'All migrations valid' : migrationValidation.error,
        migrationValidation.success ? null : migrationValidation.fullError);
}

// Generate comprehensive report
function generateReport() {
    log('\n📋 Generating Comprehensive Report...');

    const report = {
        summary: {
            totalTests: results.tests.length,
            passed: results.passed,
            failed: results.failed,
            successRate: `${((results.passed / results.tests.length) * 100).toFixed(1)}%`,
            timestamp: new Date().toISOString()
        },
        testResults: results.tests,
        errors: results.errors,
        detailedErrors: results.detailedErrors,
        recommendations: []
    };

    // Add recommendations based on failures
    if (results.failed > 0) {
        report.recommendations.push('Review failed tests and fix underlying issues');
        report.recommendations.push('Check database connectivity and schema');
        report.recommendations.push('Verify all environment variables are set correctly');
        report.recommendations.push('Ensure all required services are running');
        report.recommendations.push('Check route mounting in server configuration');
    }

    if (results.failed === 0) {
        report.recommendations.push('All systems are functioning correctly');
        report.recommendations.push('Consider adding more comprehensive test coverage');
        report.recommendations.push('Monitor performance and add alerting');
    }

    // Save report to file
    const reportPath = 'audit-report-detailed.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    log(`\n📊 AUDIT COMPLETE`);
    log(`✅ Tests Passed: ${results.passed}`);
    log(`❌ Tests Failed: ${results.failed}`);
    log(`📈 Success Rate: ${report.summary.successRate}`);
    log(`📄 Full report saved to: ${reportPath}`);

    if (results.failed > 0) {
        log('\n🚨 CRITICAL ISSUES FOUND:');
        results.errors.forEach(error => log(`   • ${error}`, 'error'));
    }

    return report;
}

// Main execution
async function runComprehensiveAudit() {
    log('🚀 Starting Smart Recipes Comprehensive System Audit (Fixed Version)...');
    log(`🎯 Target API: ${BASE_URL}`);

    try {
        await testHealthAndConnectivity();
        await testAuthentication();
        await testUserManagement();
        await testPreferences();
        await testIngredients();
        await testRecipes();
        await testSearch();
        await testRecommendations();
        await testAnalytics();
        await testSecurity();
        await testPrivacy();
        await testMigrations();

        const report = generateReport();

        // Exit with error code if tests failed
        process.exit(results.failed > 0 ? 1 : 0);

    } catch (error) {
        log(`💥 Audit failed with critical error: ${error.message}`, 'error');
        console.error(error);
        process.exit(1);
    }
}

// Run the audit
if (require.main === module) {
    runComprehensiveAudit();
}

module.exports = { runComprehensiveAudit }; 