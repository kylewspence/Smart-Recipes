# Smart Recipes - AI-Powered Recipe Application

## 🍳 Project Overview

Smart Recipes is a full-stack web application that helps picky eaters discover meals they'll actually enjoy. Using AI-powered recommendations and personalized preferences, the app generates custom recipes based on available ingredients, dietary restrictions, and taste preferences.

## 🎯 Purpose & Goals

**Primary Goal**: Help picky eaters find meals they'll actually enjoy through personalized AI recommendations.

**Key Features**:
- AI-powered recipe generation using OpenAI
- Personalized recommendations based on user preferences
- Ingredient-based recipe search
- Dietary restriction and allergy management
- User preference learning system
- Recipe saving and organization

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL
- **AI Integration**: OpenAI GPT API
- **Authentication**: JWT-based auth system
- **Deployment**: Vercel (frontend) + Railway/Render (backend)

### Project Structure
```
Smart-Recipes/
├── client/                 # Next.js frontend application
│   ├── app/               # Next.js app router pages
│   ├── components/        # React components
│   ├── lib/              # Utilities and configurations
│   └── public/           # Static assets
├── server/                # Express.js backend API
│   ├── routes/           # API route handlers
│   ├── middleware/       # Express middleware
│   ├── db/              # Database configuration
│   └── types/           # TypeScript type definitions
├── database/             # Database schemas and migrations
├── docs/                # Project documentation
└── .github/             # CI/CD workflows
```

## 🚀 Features Implemented

### ✅ Core Authentication System
- User registration and login
- JWT token-based authentication
- Password hashing and validation
- Protected routes and middleware

### ✅ User Preference Management
- Dietary restrictions (vegetarian, vegan, gluten-free, etc.)
- Allergy tracking and management
- Disliked ingredients tracking
- Preference-based recipe filtering

### ✅ AI Recipe Generation
- OpenAI integration for recipe creation
- Dynamic prompt generation based on user preferences
- Ingredient-based recipe suggestions
- Cooking time and difficulty preferences

### ✅ Search & Discovery
- Advanced ingredient search
- Recipe filtering by dietary restrictions
- Search history and suggestions
- Recommendation engine

### ✅ Recipe Management
- Recipe saving and organization
- Personal recipe collections
- Recipe rating system
- Cooking history tracking

### ✅ Production-Ready Infrastructure
- **Security**: Rate limiting, input validation, HTTPS enforcement
- **Monitoring**: Analytics, performance tracking, error logging
- **Deployment**: CI/CD pipelines, automated testing
- **Documentation**: Comprehensive guides and API documentation

## 🔧 Development Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- OpenAI API key

### Quick Start
```bash
# Clone the repository
git clone https://github.com/your-username/Smart-Recipes.git
cd Smart-Recipes

# Install dependencies
npm install
cd client && npm install
cd ../server && npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and OpenAI API key

# Set up database
npm run db:setup

# Start development servers
npm run dev:all
```

### Available Scripts
```bash
# Development
npm run dev:frontend    # Start Next.js dev server
npm run dev:backend     # Start Express dev server
npm run dev:all        # Start both servers

# Testing
npm run test:all       # Run all tests
npm run test:frontend  # Frontend tests only
npm run test:backend   # Backend tests only
npm run test:e2e      # End-to-end tests

# Production
npm run build:all      # Build both applications
npm run start:all      # Start production servers
```

## 📊 Database Schema

### Core Tables
- **users**: User accounts and basic information
- **user_preferences**: Dietary restrictions and preferences
- **recipes**: Generated and saved recipes
- **ingredients**: Ingredient database
- **user_recipes**: User's saved recipes
- **analytics_***: Monitoring and analytics data

### Key Relationships
- Users have preferences (1:many)
- Users can save recipes (many:many)
- Recipes contain ingredients (many:many)
- Analytics track user behavior

## 🔒 Security Features

### Authentication & Authorization
- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control (user/admin)
- Protected API endpoints

### Security Middleware
- Rate limiting (per-user and global)
- Input validation and sanitization
- CORS configuration
- Security headers (HSTS, CSP, etc.)
- SQL injection prevention

### Privacy & Compliance
- User data anonymization
- GDPR-ready data handling
- Secure session management
- Audit logging

## 📈 Monitoring & Analytics

### Performance Monitoring
- Web Vitals tracking (CLS, FCP, LCP, INP, TTFB)
- Real-time performance metrics
- Bundle size optimization
- Load time monitoring

### User Analytics
- Page view tracking
- User interaction events
- Recipe generation analytics
- Search behavior tracking

### System Health
- API endpoint monitoring
- Database performance tracking
- Error rate monitoring
- Uptime monitoring

## 🚀 Deployment

### Frontend (Vercel)
- Automatic deployments from GitHub
- Edge functions for API routes
- Global CDN distribution
- Preview deployments for PRs

### Backend (Railway/Render)
- Containerized deployment
- Auto-scaling capabilities
- Environment variable management
- Health check monitoring

### Database (Neon/Supabase)
- Managed PostgreSQL
- Automatic backups
- Connection pooling
- SSL encryption

## 🧪 Testing Strategy

### Test Coverage
- **Unit Tests**: 80%+ coverage for critical components
- **Integration Tests**: All API endpoints tested
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Load testing and optimization

### Test Types
- **Frontend**: React component testing, user interaction testing
- **Backend**: API testing, database integration testing
- **Security**: Authentication testing, input validation testing
- **Performance**: Web Vitals testing, load testing

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/auth/register  # User registration
POST /api/auth/login     # User login
GET  /api/auth/verify    # Token verification
```

### Recipe Endpoints
```
GET    /api/recipes           # Get user's recipes
POST   /api/recipes/generate  # Generate new recipe
GET    /api/recipes/:id       # Get specific recipe
POST   /api/recipes/:id/save  # Save recipe
DELETE /api/recipes/:id       # Delete recipe
```

### Search Endpoints
```
GET  /api/search/ingredients  # Search ingredients
GET  /api/search/recipes      # Search recipes
POST /api/search/advanced     # Advanced search
```

### User Endpoints
```
GET    /api/users/profile     # Get user profile
PUT    /api/users/profile     # Update profile
GET    /api/users/preferences # Get preferences
PUT    /api/users/preferences # Update preferences
```

## 🎨 UI/UX Features

### Design System
- Consistent color palette and typography
- Responsive design for all screen sizes
- Dark mode support
- Accessibility features (WCAG compliance)

### User Experience
- Intuitive onboarding flow
- Smart search with autocomplete
- Real-time recipe generation
- Smooth animations and transitions

### Components
- Reusable component library
- Form validation and error handling
- Loading states and skeletons
- Interactive recipe cards

## 🔮 Future Enhancements

### Planned Features
- **Social Features**: Recipe sharing, user reviews
- **Advanced AI**: Meal planning, nutrition analysis
- **Mobile App**: React Native implementation
- **Integration**: Grocery list generation, shopping APIs

### Technical Improvements
- **Caching**: Redis implementation for better performance
- **Search**: Elasticsearch for advanced search capabilities
- **Real-time**: WebSocket integration for live updates
- **Microservices**: Service-oriented architecture

## 📞 Support & Contributing

### Getting Help
- Check the [TESTING.md](./TESTING.md) for testing guidelines
- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions
- See [CI_CD_SETUP.md](./CI_CD_SETUP.md) for CI/CD configuration

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Standards
- TypeScript for type safety
- ESLint and Prettier for code formatting
- Conventional commits for git messages
- Test-driven development approach

## 📊 Project Metrics

### Development Stats
- **Lines of Code**: ~15,000+ lines
- **Components**: 50+ React components
- **API Endpoints**: 25+ REST endpoints
- **Database Tables**: 10+ normalized tables
- **Test Coverage**: 80%+ across all modules

### Performance Targets
- **Page Load Time**: <2 seconds
- **Time to Interactive**: <3 seconds
- **Lighthouse Score**: 90+ for all categories
- **Bundle Size**: <500KB gzipped

## 🏆 Achievements

✅ **Production-Ready**: Fully deployable application with CI/CD  
✅ **Secure**: Comprehensive security implementation  
✅ **Tested**: Extensive test coverage with multiple test types  
✅ **Monitored**: Real-time analytics and performance monitoring  
✅ **Documented**: Complete documentation and guides  
✅ **Scalable**: Architecture designed for growth  
✅ **User-Friendly**: Intuitive UI/UX with accessibility features  

---

**Smart Recipes** - Making meal discovery delightful for picky eaters! 🍽️✨

*Built with ❤️ for the coding bootcamp final project* 