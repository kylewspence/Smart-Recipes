# Smart Recipes Testing Guide

This document outlines the comprehensive testing strategy and procedures for the Smart Recipes application.

## 🧪 Testing Overview

Smart Recipes uses a multi-layered testing approach covering:
- **Unit Tests**: Individual components and functions
- **Integration Tests**: API endpoints and database interactions
- **End-to-End Tests**: Complete user workflows
- **Performance Tests**: Load testing and Web Vitals
- **Security Tests**: Vulnerability scanning and auth testing

## 📁 Test Structure

```
client/
├── __tests__/           # Jest unit tests
├── e2e/                 # Playwright E2E tests
└── components/__tests__/ # Component tests

server/
├── __tests__/           # Jest unit tests
└── tests/
    ├── unit/            # Unit tests
    ├── integration/     # API integration tests
    └── security/        # Security tests
```

## 🔧 Setup and Installation

### Prerequisites
```bash
# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install
```

### Environment Setup
```bash
# Copy test environment file
cp .env.example .env.test

# Set test database URL
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/smart_recipes_test
```

## 🏃‍♂️ Running Tests

### Frontend Tests

```bash
# Run all frontend tests
cd client
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run integration tests only
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Run E2E tests with UI
npm run test:e2e:ui
```

### Backend Tests

```bash
# Run all backend tests
cd server
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run all tests
npm run test:all
```

### Full Application Tests

```bash
# Run all tests (frontend + backend)
npm run test:all

# Run tests with coverage reports
npm run test:coverage:all
```

## 📋 Test Categories

### 1. Unit Tests

#### Frontend Unit Tests
- **Components**: React component rendering and behavior
- **Utilities**: Helper functions and custom hooks
- **Services**: API service functions
- **Context**: React context providers

Example test locations:
- `client/components/__tests__/auth/LoginForm.test.tsx`
- `client/lib/__tests__/utils/validation.test.ts`
- `client/services/__tests__/api.test.ts`

#### Backend Unit Tests
- **Routes**: Individual route handlers
- **Middleware**: Authentication and validation middleware
- **Utilities**: Helper functions and utilities
- **Models**: Data models and validation

Example test locations:
- `server/__tests__/routes/auth.test.ts`
- `server/__tests__/middleware/auth.test.ts`
- `server/__tests__/utils/validation.test.ts`

### 2. Integration Tests

#### API Integration Tests
- **Authentication Flow**: Login, register, token validation
- **Recipe Management**: CRUD operations for recipes
- **Search Functionality**: Ingredient and recipe search
- **User Preferences**: Dietary restrictions and preferences
- **Database Operations**: Data persistence and retrieval

Example test file:
```typescript
// server/tests/integration/auth.test.ts
describe('Authentication API', () => {
  test('POST /api/auth/register creates new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('test@example.com');
  });
});
```

#### Database Integration Tests
- **Connection Handling**: Database connectivity
- **Migrations**: Schema updates and rollbacks
- **Data Integrity**: Foreign key constraints
- **Performance**: Query optimization

### 3. End-to-End Tests

#### User Journey Tests
- **Registration Flow**: Complete user onboarding
- **Recipe Generation**: AI-powered recipe creation
- **Search and Discovery**: Finding recipes by ingredients
- **User Preferences**: Setting dietary restrictions
- **Recipe Management**: Saving and organizing recipes

Example E2E test:
```typescript
// client/e2e/recipe-generation.spec.ts
test('user can generate recipe from ingredients', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid=email]', 'test@example.com');
  await page.fill('[data-testid=password]', 'password123');
  await page.click('[data-testid=login-button]');
  
  await page.goto('/recipes/generate');
  await page.fill('[data-testid=ingredients-input]', 'chicken, broccoli, rice');
  await page.click('[data-testid=generate-button]');
  
  await expect(page.locator('[data-testid=recipe-result]')).toBeVisible();
});
```

### 4. Performance Tests

#### Web Vitals Testing
- **Core Web Vitals**: LCP, FID, CLS measurements
- **Performance Metrics**: TTFB, FCP timing
- **Bundle Size**: JavaScript bundle optimization
- **Loading Performance**: Page load times

#### Load Testing
- **API Endpoints**: Concurrent request handling
- **Database Performance**: Query response times
- **Memory Usage**: Memory leak detection
- **Scalability**: Performance under load

### 5. Security Tests

#### Authentication Security
- **JWT Token Validation**: Token expiration and tampering
- **Password Security**: Hashing and validation
- **Session Management**: Secure session handling
- **Rate Limiting**: Brute force protection

#### Input Validation
- **SQL Injection**: Database query protection
- **XSS Prevention**: Cross-site scripting protection
- **CSRF Protection**: Cross-site request forgery
- **Input Sanitization**: Malicious input handling

## 📊 Test Coverage

### Coverage Requirements
- **Unit Tests**: ≥80% line coverage
- **Integration Tests**: ≥70% endpoint coverage
- **E2E Tests**: ≥90% critical path coverage

### Coverage Reports
```bash
# Generate coverage reports
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

### Coverage Targets by Module
- **Authentication**: 90%
- **Recipe Management**: 85%
- **Search Functionality**: 80%
- **User Preferences**: 80%
- **API Routes**: 85%

## 🔍 Test Data Management

### Test Database
- **Isolation**: Each test suite uses isolated data
- **Cleanup**: Automatic cleanup after test runs
- **Fixtures**: Predefined test data sets
- **Migrations**: Test-specific database schema

### Mock Data
```typescript
// Test fixtures
export const mockUser = {
  id: 1,
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  preferences: {
    dietaryRestrictions: ['vegetarian'],
    allergies: ['nuts'],
    dislikedIngredients: ['mushrooms']
  }
};

export const mockRecipe = {
  id: 1,
  title: 'Test Recipe',
  ingredients: ['chicken', 'rice', 'vegetables'],
  instructions: ['Cook chicken', 'Prepare rice', 'Combine'],
  cookingTime: 30,
  difficulty: 'medium'
};
```

## 🚨 Continuous Integration

### GitHub Actions
Tests run automatically on:
- **Pull Requests**: All test suites
- **Main Branch**: Full test suite + deployment
- **Scheduled**: Daily comprehensive tests

### Quality Gates
- ✅ All tests must pass
- ✅ Coverage thresholds must be met
- ✅ Security scans must pass
- ✅ Performance budgets must be met

## 🐛 Debugging Tests

### Common Issues

1. **Test Timeouts**
   ```bash
   # Increase timeout for slow tests
   jest.setTimeout(30000);
   ```

2. **Database Connection Issues**
   ```bash
   # Check test database connection
   npm run db:test:status
   ```

3. **Async Test Issues**
   ```typescript
   // Proper async/await usage
   test('async operation', async () => {
     const result = await asyncFunction();
     expect(result).toBeDefined();
   });
   ```

4. **Mock Issues**
   ```typescript
   // Clear mocks between tests
   afterEach(() => {
     jest.clearAllMocks();
   });
   ```

### Debug Commands
```bash
# Run specific test file
npm test -- auth.test.ts

# Run tests in debug mode
npm test -- --inspect-brk

# Run single test case
npm test -- --testNamePattern="should login user"
```

## 📈 Test Metrics

### Key Metrics to Track
- **Test Execution Time**: Monitor for performance regression
- **Flaky Test Rate**: Identify unstable tests
- **Coverage Trends**: Ensure coverage doesn't decrease
- **Bug Detection Rate**: Tests catching real issues

### Reporting
- **Daily Reports**: Automated test result summaries
- **Coverage Reports**: Updated with each PR
- **Performance Reports**: Web Vitals and load test results
- **Security Reports**: Vulnerability scan results

## 🔄 Test Maintenance

### Regular Tasks
- **Update Test Data**: Keep fixtures current
- **Review Flaky Tests**: Fix unstable tests
- **Performance Monitoring**: Update performance budgets
- **Security Updates**: Update security test cases

### Best Practices
1. **Write Tests First**: TDD approach when possible
2. **Keep Tests Simple**: One assertion per test
3. **Use Descriptive Names**: Clear test descriptions
4. **Mock External Dependencies**: Isolate units under test
5. **Regular Cleanup**: Remove obsolete tests

## 📚 Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs)
- [Playwright Documentation](https://playwright.dev/docs)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

### Tools
- **Jest**: JavaScript testing framework
- **Playwright**: End-to-end testing
- **React Testing Library**: React component testing
- **Supertest**: HTTP assertion library
- **MSW**: API mocking for tests

Your Smart Recipes application is thoroughly tested! 🧪✅ 