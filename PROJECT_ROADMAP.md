# Smart Recipes App - Project Roadmap

## 🎯 Project Overview
AI-powered recipe suggestion app with user preferences, dietary restrictions, and personalized recommendations.

**Tech Stack:**
- Frontend: Next.js + TypeScript + Tailwind CSS
- Backend: Express.js + TypeScript
- Database: PostgreSQL
- AI: OpenAI API
- Authentication: JWT (or Auth0/Clerk for faster setup)
- **Validation: Zod** (for API requests/responses and OpenAI data)

---

## 🚀 Development Phases

### Phase 1: Backend Foundation ✅
**Status: COMPLETED**
- [x] Express server setup
- [x] PostgreSQL database connection
- [x] Basic API endpoints
- [x] Database schema design
- [x] Environment configuration

**Current Status:** Database connected, basic server running

---

### Phase 2: Database Schema & Models ✅
**Status: COMPLETED**
**Estimated Time: 1-2 days**

#### 2.1 Update Database Schema ✅
- [x] Update `database/schema.sql` with recipe app tables:
  - Users table
  - User preferences table  
  - Recipes table
  - Recipe tags table
  - **Bonus: Normalized ingredients, fridge inventory, saved recipes**
- [x] Run schema migration: `npm run db:import`
- [x] Test table creation with `/api/tables-test`

#### 2.2 TypeScript Types ✅
Create `server/types/index.ts`:
- [x] User interface
- [x] UserPreferences interface
- [x] Recipe interface
- [x] API response types

**Checkpoint:** ✅ All tables created, types defined

---

### Phase 3: Data Validation & Core API Setup (Start Here)
**Estimated Time: 2-3 days**

#### 3.1 Zod Schema Setup
- [ ] Install Zod: `npm install zod`
- [ ] Create `server/schemas/` directory
- [ ] Define Zod schemas for:
  - [ ] User creation/update
  - [ ] User preferences
  - [ ] Recipe data
  - [ ] **OpenAI response validation** (critical for reliable AI integration)
- [ ] Create validation middleware for API endpoints

#### 3.2 User Management API
```
POST /api/users              # Create user (with Zod validation)
GET /api/users/:id           # Get user
PUT /api/users/:id           # Update user (with Zod validation)
DELETE /api/users/:id        # Delete user
```

#### 3.3 User Preferences API
```
GET /api/users/:id/preferences     # Get user preferences
POST /api/users/:id/preferences    # Create/update preferences (with Zod validation)
```

**Checkpoint:** ✅ Basic CRUD operations working with proper validation

---

### Phase 4: OpenAI Integration with Robust Validation
**Estimated Time: 3-4 days**

#### 4.1 OpenAI Setup
- [ ] Install OpenAI SDK: `npm install openai`
- [ ] Add OpenAI API key to environment
- [ ] Create prompt engineering functions

#### 4.2 OpenAI Response Validation (Critical)
- [ ] **Create Zod schemas for expected OpenAI response format:**
  ```typescript
  // Example schema for recipe generation response
  const OpenAIRecipeSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    ingredients: z.array(z.string()),
    instructions: z.string(),
    cookingTime: z.number().optional(),
    // ... etc
  })
  ```
- [ ] Implement response parsing with error handling
- [ ] Add fallback logic for malformed AI responses
- [ ] Log validation failures for debugging

#### 4.3 Recipe Generation Logic
- [ ] Build dynamic prompts based on user preferences
- [ ] Handle "stretch" ingredients logic
- [ ] **Parse and validate OpenAI responses with Zod**
- [ ] Error handling for API failures and validation errors
- [ ] Rate limiting for API calls

#### 4.4 Recipe API
```
GET /api/users/:id/recipes         # Get user's saved recipes
POST /api/users/:id/recipes        # Save a recipe (with Zod validation)
PUT /api/recipes/:id               # Update recipe (add notes, etc.)
DELETE /api/recipes/:id            # Delete recipe
POST /api/generate-recipe          # Generate recipe with OpenAI (validated)
```

**Checkpoint:** ✅ AI generates reliable, validated recipes based on user preferences

---

### Phase 5: Authentication System
**Estimated Time: 2-3 days**

#### 5.1 Choose Authentication Method
**Option A: Simple JWT (Recommended for learning)**
- [ ] Password hashing (bcrypt)
- [ ] JWT token generation
- [ ] Protected route middleware
- [ ] **Zod validation for auth payloads**

**Option B: Third-party (Faster)**
- [ ] Clerk or Auth0 integration

#### 5.2 Auth Endpoints with Validation
```
POST /api/auth/register      # User registration (Zod validated)
POST /api/auth/login         # User login (Zod validated)
POST /api/auth/logout        # User logout
GET /api/auth/me             # Get current user
```

#### 5.3 Protect Routes
- [ ] Add auth middleware to user-specific endpoints
- [ ] Update all endpoints to use authenticated user ID

**Checkpoint:** ✅ Users can register, login, access protected routes with validated data

---

### Phase 6: Frontend Foundation
**Estimated Time: 2-3 days**

#### 6.1 Next.js Setup ✅
- [x] Next.js app created
- [x] Tailwind CSS configured
- [x] API proxy setup

#### 6.2 Frontend Validation Setup
- [ ] Install Zod for frontend: `npm install zod` (in client)
- [ ] Create shared validation schemas (client/server)
- [ ] Set up form validation with Zod + React Hook Form

#### 6.3 Core Layout & Navigation
- [ ] Main layout component
- [ ] Navigation bar
- [ ] Responsive design setup
- [ ] Loading states and error handling

#### 6.4 Authentication UI
- [ ] Login/Register forms (with Zod validation)
- [ ] Protected route wrapper
- [ ] User context/state management

**Checkpoint:** ✅ Users can register/login through UI with validated forms

---

### Phase 7: Core Frontend Features
**Estimated Time: 4-5 days**

#### 7.1 User Preferences Form
- [ ] Multi-step form for preferences setup
- [ ] Ingredient selection interface
- [ ] Dietary restrictions checkboxes
- [ ] "Stretch" ingredients selection
- [ ] **Form validation with Zod schemas**
- [ ] Real-time validation feedback

#### 7.2 Recipe Generation Interface
- [ ] Generate recipe button
- [ ] Loading state during generation
- [ ] Recipe display component
- [ ] **Error handling for validation failures**
- [ ] Save/discard recipe options

#### 7.3 Recipe Management
- [ ] Saved recipes list/grid
- [ ] Recipe detail view
- [ ] Edit recipe form (notes, modifications)
- [ ] Delete confirmation

**Checkpoint:** ✅ Full user flow working: preferences → generate → save → manage

---

### Phase 8: Dashboard & Polish
**Estimated Time: 3-4 days**

#### 8.1 Dashboard Overview
- [ ] Recent recipes
- [ ] Quick generate button
- [ ] Preferences summary
- [ ] Usage statistics (recipes generated, saved, etc.)

#### 8.2 Search & Filtering
- [ ] Search saved recipes
- [ ] Filter by cuisine, cooking time, etc.
- [ ] Tag system for organization

#### 8.3 UI/UX Polish
- [ ] Consistent styling
- [ ] Animations and transitions
- [ ] Mobile responsiveness
- [ ] Accessibility improvements

**Checkpoint:** ✅ Professional-looking, fully functional app

---

### Phase 9: Advanced Features (Optional)
**Estimated Time: 2-3 days each**

#### 9.1 Recipe Sharing
- [ ] Share recipe links
- [ ] Public recipe gallery
- [ ] Import shared recipes

#### 9.2 Meal Planning
- [ ] Weekly meal planner
- [ ] Shopping list generation
- [ ] Calendar integration

#### 9.3 Advanced AI Features
- [ ] Recipe variations
- [ ] Nutritional information
- [ ] Cooking instructions optimization

---

## 🛠️ Development Workflow

### Backend-First Approach (Recommended)
1. **Build API endpoints with validation** → Test with Postman/curl
2. **Add authentication** → Test protected routes
3. **Integrate OpenAI with robust validation** → Test recipe generation
4. **Build frontend** → Connect to working API

### Benefits:
- Solid foundation before UI work
- Easy to test and debug
- Clear separation of concerns
- **Reliable data flow with validation**
- Can build frontend knowing API works

---

## 🔍 Zod Integration Strategy

### Why Zod is Critical for This Project:
- **OpenAI responses can be unpredictable** - Zod ensures data consistency
- **User input validation** - Prevent bad data from reaching database
- **Type safety** - Runtime validation matches TypeScript types
- **Better error messages** - Clear feedback for users and debugging

### Where to Use Zod:
1. **API request/response validation** (all endpoints)
2. **OpenAI response parsing** (most critical)
3. **Form validation** (frontend)
4. **Database input sanitization**

### Implementation Order:
1. **Phase 3**: Basic API validation
2. **Phase 4**: OpenAI response validation (highest priority)
3. **Phase 6**: Frontend form validation
4. **Throughout**: Refine and add validation as needed

---

## 📋 Daily Checklist Template

### Today's Goal: [Phase X.X - Feature Name]
- [ ] Task 1
- [ ] Task 2  
- [ ] Task 3
- [ ] Test endpoint/feature
- [ ] **Validate data flows properly**
- [ ] Commit progress

### Blockers:
- Issue 1: [Description and solution approach]

### Next Session:
- Continue with: [Next logical task]

---

## 🧪 Testing Strategy

### Backend Testing
- [ ] Test all endpoints with Postman/curl
- [ ] **Test validation with invalid data**
- [ ] Database operations working correctly
- [ ] Authentication flow complete
- [ ] **OpenAI integration with validation edge cases**

### Frontend Testing  
- [ ] All forms submit correctly
- [ ] **Form validation works (valid/invalid cases)**
- [ ] Navigation works
- [ ] Responsive design tested
- [ ] Error states handled

### Integration Testing
- [ ] Full user journey works
- [ ] **Data validation works end-to-end**
- [ ] Data flows correctly between frontend/backend
- [ ] Authentication persists correctly

---

## 📚 Resources & References

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Express.js Docs](https://expressjs.com/)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- **[Zod Docs](https://zod.dev/) - Schema validation**

### Code Examples
- JWT authentication patterns
- OpenAI prompt engineering
- **Zod validation patterns**
- PostgreSQL array handling
- Next.js form handling

---

## 🎯 Success Metrics

### MVP (Minimum Viable Product)
- [ ] Users can register/login
- [ ] Users can set food preferences
- [ ] **AI generates reliable, validated recipes**
- [ ] Users can save and manage recipes
- [ ] **All data flows are validated and secure**

### Full Feature Set
- [ ] All CRUD operations working
- [ ] **Robust validation throughout**
- [ ] Clean, responsive UI
- [ ] Fast recipe generation
- [ ] Good user experience
- [ ] Error handling throughout

---

**Start with Phase 3 - Data Validation & Core API Setup**
**Current status: Schema and types completed, ready for validation layer** ✅ 