const fs = require('fs');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_USER = {
    name: 'Comprehensive Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!'
};

// Test results storage
let testResults = [];
let testUser = null;
let authToken = null;

// Utility functions
const log = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(logMessage);
};

const addTestResult = (endpoint, method, status, success, details = '', error = null, data = null) => {
    testResults.push({
        endpoint,
        method,
        status,
        success,
        details,
        error: error ? error.message : null,
        data: data ? JSON.stringify(data).substring(0, 200) : null,
        timestamp: new Date().toISOString()
    });
};

const makeRequest = async (endpoint, method = 'GET', body = null, headers = {}) => {
    const url = `${BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    if (authToken) {
        options.headers.Authorization = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(url, options);
        let data;
        try {
            data = await response.json();
        } catch (e) {
            data = { error: 'Invalid JSON response' };
        }
        return {
            status: response.status,
            success: response.ok,
            data
        };
    } catch (error) {
        return {
            status: 0,
            success: false,
            error: error.message,
            data: null
        };
    }
};

// Test suites
const testAuthentication = async () => {
    log('Testing Authentication Endpoints...');

    // Test registration
    try {
        const registerResult = await makeRequest('/api/auth/register', 'POST', TEST_USER);
        addTestResult('/api/auth/register', 'POST', registerResult.status, registerResult.success,
            registerResult.success ? 'User registered successfully' : 'Registration failed',
            registerResult.error ? new Error(registerResult.error) : null,
            registerResult.data);

        if (registerResult.success) {
            testUser = registerResult.data.user;
            authToken = registerResult.data.token;
            log(`Test user created: ${testUser.userId} - ${testUser.email}`);
        }
    } catch (error) {
        addTestResult('/api/auth/register', 'POST', 0, false, 'Registration request failed', error);
    }

    // Test login (only if registration failed)
    if (!authToken) {
        try {
            const loginResult = await makeRequest('/api/auth/login', 'POST', {
                email: TEST_USER.email,
                password: TEST_USER.password
            });
            addTestResult('/api/auth/login', 'POST', loginResult.status, loginResult.success,
                loginResult.success ? 'Login successful' : 'Login failed',
                loginResult.error ? new Error(loginResult.error) : null,
                loginResult.data);

            if (loginResult.success) {
                authToken = loginResult.data.token;
                testUser = loginResult.data.user;
            }
        } catch (error) {
            addTestResult('/api/auth/login', 'POST', 0, false, 'Login request failed', error);
        }
    }

    // Test auth/me
    try {
        const meResult = await makeRequest('/api/auth/me', 'GET');
        addTestResult('/api/auth/me', 'GET', meResult.status, meResult.success,
            meResult.success ? 'User profile retrieved' : 'Profile retrieval failed',
            meResult.error ? new Error(meResult.error) : null,
            meResult.data);
    } catch (error) {
        addTestResult('/api/auth/me', 'GET', 0, false, 'Profile request failed', error);
    }
};

const testUserEndpoints = async () => {
    log('Testing User Endpoints...');

    if (!testUser) {
        log('No test user available, skipping user tests', 'warn');
        return;
    }

    // Test get user by ID
    try {
        const userResult = await makeRequest(`/api/users/${testUser.userId}`, 'GET');
        addTestResult(`/api/users/${testUser.userId}`, 'GET', userResult.status, userResult.success,
            userResult.success ? 'User data retrieved' : 'User retrieval failed',
            userResult.error ? new Error(userResult.error) : null,
            userResult.data);
    } catch (error) {
        addTestResult(`/api/users/${testUser.userId}`, 'GET', 0, false, 'User request failed', error);
    }
};

const testPreferencesEndpoints = async () => {
    log('Testing Preferences Endpoints...');

    if (!testUser) {
        log('No test user available, skipping preferences tests', 'warn');
        return;
    }

    const testPreferences = {
        dietaryRestrictions: ['vegetarian'],
        allergies: ['nuts'],
        cuisinePreferences: ['italian', 'mexican'],
        spiceLevel: 'medium',
        maxCookingTime: 45,
        servingSize: 2
    };

    // Test create preferences
    try {
        const createResult = await makeRequest(`/api/preferences/${testUser.userId}/preferences`, 'POST', testPreferences);
        addTestResult(`/api/preferences/${testUser.userId}/preferences`, 'POST', createResult.status, createResult.success,
            createResult.success ? 'Preferences created' : 'Preferences creation failed',
            createResult.error ? new Error(createResult.error) : null,
            createResult.data);
    } catch (error) {
        addTestResult(`/api/preferences/${testUser.userId}/preferences`, 'POST', 0, false, 'Preferences creation request failed', error);
    }

    // Test get preferences
    try {
        const getResult = await makeRequest(`/api/preferences/${testUser.userId}/preferences`, 'GET');
        addTestResult(`/api/preferences/${testUser.userId}/preferences`, 'GET', getResult.status, getResult.success,
            getResult.success ? 'Preferences retrieved' : 'Preferences retrieval failed',
            getResult.error ? new Error(getResult.error) : null,
            getResult.data);
    } catch (error) {
        addTestResult(`/api/preferences/${testUser.userId}/preferences`, 'GET', 0, false, 'Preferences retrieval request failed', error);
    }

    // Test update preferences
    try {
        const updateResult = await makeRequest(`/api/preferences/${testUser.userId}/preferences`, 'PUT', {
            ...testPreferences,
            spiceLevel: 'hot'
        });
        addTestResult(`/api/preferences/${testUser.userId}/preferences`, 'PUT', updateResult.status, updateResult.success,
            updateResult.success ? 'Preferences updated' : 'Preferences update failed',
            updateResult.error ? new Error(updateResult.error) : null,
            updateResult.data);
    } catch (error) {
        addTestResult(`/api/preferences/${testUser.userId}/preferences`, 'PUT', 0, false, 'Preferences update request failed', error);
    }
};

const testRecipeEndpoints = async () => {
    log('Testing Recipe Endpoints...');

    if (!testUser) {
        log('No test user available, skipping recipe tests', 'warn');
        return;
    }

    const testRecipeRequest = {
        userId: testUser.userId,
        mealType: 'dinner',
        ingredients: ['chicken', 'rice', 'vegetables'],
        dietaryRestrictions: ['none'],
        cuisinePreference: 'italian',
        cookingTime: 30,
        servingSize: 2
    };

    let testRecipeId = null;

    // Test recipe generation
    try {
        log('Testing recipe generation (this may take a moment)...');
        const generateResult = await makeRequest('/api/recipes/generate', 'POST', testRecipeRequest);
        addTestResult('/api/recipes/generate', 'POST', generateResult.status, generateResult.success,
            generateResult.success ? 'Recipe generated successfully' : 'Recipe generation failed',
            generateResult.error ? new Error(generateResult.error) : null,
            generateResult.data);

        if (generateResult.success && generateResult.data.recipe) {
            testRecipeId = generateResult.data.recipe.id || generateResult.data.recipe.recipeId;
            log(`Generated recipe ID: ${testRecipeId}`);
        }
    } catch (error) {
        addTestResult('/api/recipes/generate', 'POST', 0, false, 'Recipe generation request failed', error);
    }

    // Test get user recipes
    try {
        const recipesResult = await makeRequest(`/api/recipes/user/${testUser.userId}`, 'GET');
        addTestResult(`/api/recipes/user/${testUser.userId}`, 'GET', recipesResult.status, recipesResult.success,
            recipesResult.success ? `Retrieved ${recipesResult.data.recipes?.length || 0} recipes` : 'Recipe retrieval failed',
            recipesResult.error ? new Error(recipesResult.error) : null,
            recipesResult.data);
    } catch (error) {
        addTestResult(`/api/recipes/user/${testUser.userId}`, 'GET', 0, false, 'Recipe retrieval request failed', error);
    }

    // Test favorite/unfavorite if we have a recipe
    if (testRecipeId) {
        try {
            const favoriteResult = await makeRequest(`/api/recipes/${testRecipeId}/favorite`, 'POST', { userId: testUser.userId });
            addTestResult(`/api/recipes/${testRecipeId}/favorite`, 'POST', favoriteResult.status, favoriteResult.success,
                favoriteResult.success ? 'Recipe favorited' : 'Recipe favorite failed',
                favoriteResult.error ? new Error(favoriteResult.error) : null,
                favoriteResult.data);
        } catch (error) {
            addTestResult(`/api/recipes/${testRecipeId}/favorite`, 'POST', 0, false, 'Recipe favorite request failed', error);
        }

        try {
            const unfavoriteResult = await makeRequest(`/api/recipes/${testRecipeId}/unfavorite`, 'POST', { userId: testUser.userId });
            addTestResult(`/api/recipes/${testRecipeId}/unfavorite`, 'POST', unfavoriteResult.status, unfavoriteResult.success,
                unfavoriteResult.success ? 'Recipe unfavorited' : 'Recipe unfavorite failed',
                unfavoriteResult.error ? new Error(unfavoriteResult.error) : null,
                unfavoriteResult.data);
        } catch (error) {
            addTestResult(`/api/recipes/${testRecipeId}/unfavorite`, 'POST', 0, false, 'Recipe unfavorite request failed', error);
        }

        // Test get specific recipe
        try {
            const recipeResult = await makeRequest(`/api/recipes/${testRecipeId}`, 'GET');
            addTestResult(`/api/recipes/${testRecipeId}`, 'GET', recipeResult.status, recipeResult.success,
                recipeResult.success ? 'Specific recipe retrieved' : 'Specific recipe retrieval failed',
                recipeResult.error ? new Error(recipeResult.error) : null,
                recipeResult.data);
        } catch (error) {
            addTestResult(`/api/recipes/${testRecipeId}`, 'GET', 0, false, 'Specific recipe request failed', error);
        }
    }

    // Test recipe search
    try {
        const searchResult = await makeRequest('/api/recipes/search', 'GET');
        addTestResult('/api/recipes/search', 'GET', searchResult.status, searchResult.success,
            searchResult.success ? `Found ${searchResult.data.recipes?.length || 0} recipes` : 'Recipe search failed',
            searchResult.error ? new Error(searchResult.error) : null,
            searchResult.data);
    } catch (error) {
        addTestResult('/api/recipes/search', 'GET', 0, false, 'Recipe search request failed', error);
    }
};

const testSearchEndpoints = async () => {
    log('Testing Search Endpoints...');

    // Test unified search
    try {
        const searchResult = await makeRequest('/api/search/unified?query=chicken', 'GET');
        addTestResult('/api/search/unified', 'GET', searchResult.status, searchResult.success,
            searchResult.success ? 'Unified search successful' : 'Unified search failed',
            searchResult.error ? new Error(searchResult.error) : null,
            searchResult.data);
    } catch (error) {
        addTestResult('/api/search/unified', 'GET', 0, false, 'Unified search request failed', error);
    }
};

const testRecommendationEndpoints = async () => {
    log('Testing Recommendation Endpoints...');

    if (!testUser) {
        log('No test user available, skipping recommendation tests', 'warn');
        return;
    }

    // Test get recommendations
    try {
        const recommendationsResult = await makeRequest(`/api/recommendations/${testUser.userId}`, 'GET');
        addTestResult(`/api/recommendations/${testUser.userId}`, 'GET', recommendationsResult.status, recommendationsResult.success,
            recommendationsResult.success ? 'Recommendations retrieved' : 'Recommendations retrieval failed',
            recommendationsResult.error ? new Error(recommendationsResult.error) : null,
            recommendationsResult.data);
    } catch (error) {
        addTestResult(`/api/recommendations/${testUser.userId}`, 'GET', 0, false, 'Recommendations request failed', error);
    }
};

const testIngredientsEndpoints = async () => {
    log('Testing Ingredients Endpoints...');

    // Test get ingredients
    try {
        const ingredientsResult = await makeRequest('/api/ingredients', 'GET');
        addTestResult('/api/ingredients', 'GET', ingredientsResult.status, ingredientsResult.success,
            ingredientsResult.success ? 'Ingredients retrieved' : 'Ingredients retrieval failed',
            ingredientsResult.error ? new Error(ingredientsResult.error) : null,
            ingredientsResult.data);
    } catch (error) {
        addTestResult('/api/ingredients', 'GET', 0, false, 'Ingredients request failed', error);
    }

    // Test search ingredients
    try {
        const searchResult = await makeRequest('/api/ingredients/search?query=chicken', 'GET');
        addTestResult('/api/ingredients/search', 'GET', searchResult.status, searchResult.success,
            searchResult.success ? 'Ingredient search successful' : 'Ingredient search failed',
            searchResult.error ? new Error(searchResult.error) : null,
            searchResult.data);
    } catch (error) {
        addTestResult('/api/ingredients/search', 'GET', 0, false, 'Ingredient search request failed', error);
    }
};

const testDatabaseEndpoints = async () => {
    log('Testing Database Endpoints...');

    // Test database health
    try {
        const healthResult = await makeRequest('/api/database/health', 'GET');
        addTestResult('/api/database/health', 'GET', healthResult.status, healthResult.success,
            healthResult.success ? 'Database health check passed' : 'Database health check failed',
            healthResult.error ? new Error(healthResult.error) : null,
            healthResult.data);
    } catch (error) {
        addTestResult('/api/database/health', 'GET', 0, false, 'Database health request failed', error);
    }

    // Test database pool stats
    try {
        const poolResult = await makeRequest('/api/database/pool-stats', 'GET');
        addTestResult('/api/database/pool-stats', 'GET', poolResult.status, poolResult.success,
            poolResult.success ? 'Database pool stats retrieved' : 'Database pool stats failed',
            poolResult.error ? new Error(poolResult.error) : null,
            poolResult.data);
    } catch (error) {
        addTestResult('/api/database/pool-stats', 'GET', 0, false, 'Database pool stats request failed', error);
    }
};

const testSecurityEndpoints = async () => {
    log('Testing Security Endpoints...');

    // Test security test endpoint
    try {
        const securityResult = await makeRequest('/api/security/test', 'GET');
        addTestResult('/api/security/test', 'GET', securityResult.status, securityResult.success,
            securityResult.success ? 'Security test passed' : 'Security test failed',
            securityResult.error ? new Error(securityResult.error) : null,
            securityResult.data);
    } catch (error) {
        addTestResult('/api/security/test', 'GET', 0, false, 'Security test request failed', error);
    }
};

const testPrivacyEndpoints = async () => {
    log('Testing Privacy Endpoints...');

    // Test privacy policy
    try {
        const policyResult = await makeRequest('/api/privacy/policy', 'GET');
        addTestResult('/api/privacy/policy', 'GET', policyResult.status, policyResult.success,
            policyResult.success ? 'Privacy policy retrieved' : 'Privacy policy retrieval failed',
            policyResult.error ? new Error(policyResult.error) : null,
            policyResult.data);
    } catch (error) {
        addTestResult('/api/privacy/policy', 'GET', 0, false, 'Privacy policy request failed', error);
    }

    // Test cookie consent
    try {
        const consentResult = await makeRequest('/api/privacy/cookie-consent', 'GET');
        addTestResult('/api/privacy/cookie-consent', 'GET', consentResult.status, consentResult.success,
            consentResult.success ? 'Cookie consent retrieved' : 'Cookie consent retrieval failed',
            consentResult.error ? new Error(consentResult.error) : null,
            consentResult.data);
    } catch (error) {
        addTestResult('/api/privacy/cookie-consent', 'GET', 0, false, 'Cookie consent request failed', error);
    }
};

const testMigrationEndpoints = async () => {
    log('Testing Migration Endpoints...');

    // Test migration status
    try {
        const statusResult = await makeRequest('/api/migrations/status', 'GET');
        addTestResult('/api/migrations/status', 'GET', statusResult.status, statusResult.success,
            statusResult.success ? 'Migration status retrieved' : 'Migration status retrieval failed',
            statusResult.error ? new Error(statusResult.error) : null,
            statusResult.data);
    } catch (error) {
        addTestResult('/api/migrations/status', 'GET', 0, false, 'Migration status request failed', error);
    }

    // Test migration validation
    try {
        const validateResult = await makeRequest('/api/migrations/validate', 'GET');
        addTestResult('/api/migrations/validate', 'GET', validateResult.status, validateResult.success,
            validateResult.success ? 'Migration validation passed' : 'Migration validation failed',
            validateResult.error ? new Error(validateResult.error) : null,
            validateResult.data);
    } catch (error) {
        addTestResult('/api/migrations/validate', 'GET', 0, false, 'Migration validation request failed', error);
    }
};

const generateReport = () => {
    log('Generating comprehensive test report...');

    const summary = {
        total: testResults.length,
        passed: testResults.filter(r => r.success).length,
        failed: testResults.filter(r => !r.success).length,
        endpoints: [...new Set(testResults.map(r => r.endpoint))].length
    };

    const report = {
        summary,
        timestamp: new Date().toISOString(),
        testUser: testUser ? { userId: testUser.userId, email: testUser.email } : null,
        results: testResults,
        failedTests: testResults.filter(r => !r.success),
        criticalIssues: testResults.filter(r => !r.success && r.status >= 500),
        clientErrors: testResults.filter(r => !r.success && r.status >= 400 && r.status < 500),
        networkErrors: testResults.filter(r => !r.success && r.status === 0),
        workingEndpoints: testResults.filter(r => r.success).map(r => `${r.method} ${r.endpoint}`),
        brokenEndpoints: testResults.filter(r => !r.success).map(r => `${r.method} ${r.endpoint} (${r.status})`)
    };

    // Write detailed report to file
    fs.writeFileSync('comprehensive-audit-report.json', JSON.stringify(report, null, 2));

    // Write summary to console
    console.log('\n' + '='.repeat(80));
    console.log('COMPREHENSIVE API TEST REPORT');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed} (${Math.round(summary.passed / summary.total * 100)}%)`);
    console.log(`Failed: ${summary.failed} (${Math.round(summary.failed / summary.total * 100)}%)`);
    console.log(`Endpoints Tested: ${summary.endpoints}`);
    console.log('='.repeat(80));

    if (report.workingEndpoints.length > 0) {
        console.log('\n✅ WORKING ENDPOINTS:');
        report.workingEndpoints.forEach(endpoint => {
            console.log(`   ${endpoint}`);
        });
    }

    if (report.failedTests.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        report.failedTests.forEach(test => {
            console.log(`   ${test.method} ${test.endpoint} - Status: ${test.status} - ${test.details}`);
            if (test.error) {
                console.log(`      Error: ${test.error}`);
            }
        });
    }

    if (report.criticalIssues.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES (5xx errors):');
        report.criticalIssues.forEach(issue => {
            console.log(`   ${issue.method} ${issue.endpoint} - Status: ${issue.status}`);
        });
    }

    console.log('\nDetailed report saved to: comprehensive-audit-report.json');
    return report;
};

// Main test execution
const runComprehensiveAudit = async () => {
    log('Starting comprehensive API audit...');

    // Import fetch for Node.js
    const fetch = (await import('node-fetch')).default;
    global.fetch = fetch;

    try {
        await testAuthentication();
        await testUserEndpoints();
        await testPreferencesEndpoints();
        await testRecipeEndpoints();
        await testSearchEndpoints();
        await testRecommendationEndpoints();
        await testIngredientsEndpoints();
        await testDatabaseEndpoints();
        await testSecurityEndpoints();
        await testPrivacyEndpoints();
        await testMigrationEndpoints();

        const report = generateReport();

        log('Comprehensive audit completed!');
        return report;

    } catch (error) {
        log(`Audit failed: ${error.message}`, 'error');
        throw error;
    }
};

// Run the audit
runComprehensiveAudit().catch(console.error); 