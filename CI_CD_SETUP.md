# Smart Recipes CI/CD Pipeline Setup

This document explains the complete CI/CD pipeline setup for the Smart Recipes application, including automated testing, deployment, and monitoring.

## 🔄 Pipeline Overview

Our CI/CD pipeline consists of three main workflows:

1. **Comprehensive Testing** (`test.yml`) - Runs on every push/PR
2. **Frontend Deployment** (`frontend-deploy.yml`) - Deploys to Vercel
3. **Backend Deployment** (`backend-deploy.yml`) - Deploys to Railway/Render

## 📋 Required GitHub Secrets

### For Frontend Deployment (Vercel):
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
```

### For Backend Deployment:
```
RAILWAY_TOKEN=your_railway_token
RENDER_SERVICE_ID=your_render_service_id
RENDER_API_KEY=your_render_api_key
OPENAI_API_KEY=your_openai_api_key
```

### For Testing:
```
OPENAI_API_KEY=your_openai_api_key
CODECOV_TOKEN=your_codecov_token (optional)
```

## 🔧 Setting Up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings > Secrets and variables > Actions**
3. Click **New repository secret**
4. Add each secret listed above

### Getting Vercel Secrets:
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Link project: `vercel link`
4. Get tokens: `vercel env pull`

### Getting Railway Secrets:
1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Go to **Settings > Tokens**
4. Create a new token

### Getting Render Secrets:
1. Go to [render.com](https://render.com)
2. Create a web service
3. Go to **Settings > API**
4. Create API key

## 🧪 Testing Pipeline

### Frontend Tests:
- **Unit Tests**: Component and utility function tests
- **Integration Tests**: API integration and data flow tests
- **E2E Tests**: Full user journey tests with Playwright
- **Performance Tests**: Lighthouse audits for Core Web Vitals

### Backend Tests:
- **Unit Tests**: Individual function and module tests
- **Integration Tests**: Database and API endpoint tests
- **Security Tests**: Vulnerability scanning and dependency audits
- **Health Checks**: Production server health verification

### Test Matrix:
- Node.js versions: 18, 20
- Multiple browsers for E2E tests
- PostgreSQL database integration

## 🚀 Deployment Pipeline

### Frontend Deployment (Vercel):
1. **Build Check**: Ensures Next.js builds successfully
2. **Type Check**: TypeScript validation
3. **Test Suite**: Runs all frontend tests
4. **Deploy**: Automatic deployment to Vercel
5. **Performance Audit**: Lighthouse CI checks

### Backend Deployment (Railway):
1. **Database Setup**: PostgreSQL test instance
2. **Build Check**: tsx production build verification
3. **Test Suite**: Unit, integration, and health tests
4. **Security Scan**: Vulnerability assessment
5. **Deploy**: Automatic deployment to Railway
6. **Health Check**: Production endpoint verification

### Deployment Strategy:
- **Main Branch**: Automatic production deployment
- **Feature Branches**: Preview deployments (Vercel)
- **Pull Requests**: Full test suite without deployment
- **Rollback**: Automatic on health check failure

## 📊 Monitoring & Quality Gates

### Quality Gates:
- ✅ All tests must pass
- ✅ Build must succeed
- ✅ Security scan must pass
- ✅ Performance thresholds must be met
- ✅ Health checks must succeed

### Performance Thresholds:
- **Performance**: ≥80%
- **Accessibility**: ≥90%
- **Best Practices**: ≥80%
- **SEO**: ≥80%
- **PWA**: ≥70%

### Monitoring:
- **Health Endpoints**: `/api/health`, `/api/db-test`
- **Error Tracking**: Automatic SARIF uploads
- **Coverage Reports**: Codecov integration
- **Performance**: Lighthouse CI reports

## 🔄 Workflow Triggers

### Automatic Triggers:
- **Push to main/openai**: Full deployment pipeline
- **Pull Request**: Testing pipeline only
- **Daily Schedule**: Full test suite (2 AM UTC)
- **Performance Tag**: `[perf]` in commit message

### Manual Triggers:
- **Workflow Dispatch**: Manual pipeline execution
- **Release Tags**: Production deployment
- **Hotfix Branches**: Emergency deployment

## 🛠️ Local Development Integration

### Pre-commit Hooks (Recommended):
```bash
# Install husky
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run test && npm run lint"
```

### Local Testing:
```bash
# Frontend
cd client
npm run test:all
npm run build

# Backend  
cd server
npm run test:all
npm run start:tsx

# E2E
npm run test:e2e
```

## 🚨 Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check TypeScript errors in Actions logs
   - Verify all dependencies are in package.json
   - Ensure environment variables are set

2. **Test Failures**:
   - Check database connection in CI
   - Verify test data setup
   - Check API key availability

3. **Deployment Issues**:
   - Verify deployment secrets
   - Check service health endpoints
   - Review deployment logs

4. **Performance Issues**:
   - Check Lighthouse reports
   - Review bundle size analysis
   - Verify CDN configuration

### Debug Commands:
```bash
# Check workflow status
gh workflow list

# View workflow logs
gh run view <run-id>

# Re-run failed workflow
gh run rerun <run-id>
```

## 📈 Pipeline Metrics

### Success Metrics:
- **Build Success Rate**: >95%
- **Test Pass Rate**: >98%
- **Deployment Success**: >99%
- **Performance Score**: >80%

### Monitoring Dashboard:
- GitHub Actions dashboard
- Vercel deployment logs
- Railway application metrics
- Lighthouse CI reports

## 🔒 Security Considerations

### Security Measures:
- **Dependency Scanning**: Trivy vulnerability scanner
- **Secret Management**: GitHub Secrets
- **Access Control**: Repository permissions
- **Audit Logs**: All deployment activities logged

### Security Gates:
- No high/critical vulnerabilities
- All secrets properly encrypted
- HTTPS-only deployments
- Security headers verification

## 🎯 Best Practices

1. **Keep secrets minimal and scoped**
2. **Use environment-specific configurations**
3. **Monitor deployment health continuously**
4. **Maintain comprehensive test coverage**
5. **Document all pipeline changes**
6. **Regular security audits**
7. **Performance monitoring**
8. **Automated rollback procedures**

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Guide](https://vercel.com/docs/deployments)
- [Railway Deployment Guide](https://docs.railway.app/deploy)
- [Lighthouse CI Guide](https://github.com/GoogleChrome/lighthouse-ci)
- [Playwright Testing Guide](https://playwright.dev/docs/intro)

Your Smart Recipes CI/CD pipeline is now enterprise-ready! 🚀 