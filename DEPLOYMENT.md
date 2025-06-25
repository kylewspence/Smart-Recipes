# Smart Recipes Deployment Guide

This guide covers deploying the Smart Recipes application to production using modern cloud platforms.

## 🚀 Quick Deployment Overview

### Frontend (Vercel) + Backend (Railway/Render) + Database (Neon)

1. **Frontend**: Deploy to Vercel for optimal Next.js hosting
2. **Backend**: Deploy to Railway or Render for Node.js API
3. **Database**: Use Neon for managed PostgreSQL

## 📋 Prerequisites

- GitHub repository with your Smart Recipes code
- Vercel account (free tier available)
- Railway or Render account (free tier available)
- Neon account for PostgreSQL (free tier available)
- OpenAI API key

## 🎯 Frontend Deployment (Vercel)

### Step 1: Prepare Your Repository

Ensure your code is pushed to GitHub with the latest changes.

### Step 2: Deploy to Vercel

1. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your Smart Recipes repository

2. **Configure Build Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

3. **Set Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   NEXT_PUBLIC_APP_NAME=Smart Recipes
   NEXT_PUBLIC_APP_VERSION=1.0.0
   NEXT_PUBLIC_PWA_ENABLED=true
   ```

4. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be available at `https://your-project.vercel.app`

### Step 3: Custom Domain (Optional)

1. Go to your Vercel project dashboard
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## 🛠 Backend Deployment Options

### Option A: Railway

1. **Connect to Railway**:
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your Smart Recipes repository

2. **Configure Service**:
   - **Root Directory**: `server`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

3. **Set Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=your-neon-database-url
   JWT_SECRET=your-super-secure-jwt-secret
   OPENAI_API_KEY=your-openai-api-key
   ```

4. **Deploy**:
   - Railway will automatically deploy
   - Note your app URL for frontend configuration

### Option B: Render

1. **Connect to Render**:
   - Go to [render.com](https://render.com)
   - Sign in with GitHub
   - Click "New Web Service"
   - Connect your Smart Recipes repository

2. **Configure Service**:
   - **Name**: smart-recipes-api
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

3. **Set Environment Variables**:
   ```
   NODE_ENV=production
   DATABASE_URL=your-neon-database-url
   JWT_SECRET=your-super-secure-jwt-secret
   OPENAI_API_KEY=your-openai-api-key
   ```

## 🗄 Database Setup (Neon)

### Step 1: Create Neon Database

1. **Sign up for Neon**:
   - Go to [neon.tech](https://neon.tech)
   - Create a free account
   - Create a new project

2. **Get Connection String**:
   - Copy the connection string from your Neon dashboard
   - It looks like: `postgresql://username:password@host/database?sslmode=require`

### Step 2: Run Database Migrations

1. **Connect to your deployed backend**:
   - Use the Railway/Render console or connect locally
   - Set the `DATABASE_URL` environment variable

2. **Run migrations**:
   ```bash
   npm run migrate
   ```

3. **Seed initial data** (optional):
   ```bash
   npm run seed
   ```

## 🔗 Connect Frontend to Backend

### Update Frontend Environment Variables

In your Vercel project settings, update:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
# or
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
```

### Redeploy Frontend

After updating environment variables, Vercel will automatically redeploy your frontend.

## ✅ Verification Checklist

- [ ] Frontend loads at your Vercel URL
- [ ] Backend API responds at `/api/health`
- [ ] Database connections work
- [ ] User registration/login works
- [ ] Recipe generation works
- [ ] All features function as expected

## 🔧 Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check build logs in Vercel/Railway/Render
   - Ensure all dependencies are in `package.json`
   - Verify TypeScript/ESLint errors

2. **API Connection Issues**:
   - Verify `NEXT_PUBLIC_API_URL` is correct
   - Check CORS settings in backend
   - Ensure backend is running and accessible

3. **Database Connection Issues**:
   - Verify `DATABASE_URL` format
   - Check Neon database is running
   - Ensure migrations have been run

4. **Environment Variables**:
   - Double-check all required variables are set
   - Ensure no typos in variable names
   - Verify secrets are properly configured

### Getting Help

- Check deployment logs in your platform dashboards
- Use browser developer tools to debug frontend issues
- Check backend logs for API errors
- Verify all environment variables are set correctly

## 🚀 Next Steps

After successful deployment:

1. Set up monitoring (Task 19)
2. Configure CI/CD pipeline (Task 18)
3. Add custom domain
4. Set up SSL certificates (usually automatic)
5. Configure analytics and error tracking

## 📊 Performance Optimization

- Enable Vercel Analytics
- Configure CDN caching
- Optimize images and assets
- Monitor Core Web Vitals
- Set up performance monitoring

Your Smart Recipes app is now live and ready for users! 🎉 