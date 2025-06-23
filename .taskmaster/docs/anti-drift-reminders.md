# 🎯 Smart Recipes - Anti-Drift Reminders

## Core Project Purpose
**Smart Recipes helps picky eaters find meals they'll actually enjoy** based on their preferences and available ingredients. Every feature must serve this goal.

## Tech Stack Standards
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS + Magic UI
- **Backend**: Express.js + TypeScript + PostgreSQL + OpenAI API
- **Deployment**: Vercel (frontend) + Railway/Neon (backend/database)

## Development Standards

### Backend Development (Tasks 1-4)
- ✅ Use async/await, not .then() promises
- ✅ Always validate user input with Zod schemas - NEVER trust raw input
- ✅ Add comprehensive error handling for database and API operations
- ✅ Save `generatedPrompt` with each recipe for traceability
- ✅ Honor user preferences, allergies, dislikes in AI prompts
- ✅ Keep code modular and readable over brevity
- ✅ Never log sensitive information (passwords, tokens)

### Frontend Development (Tasks 5-15)
- ✅ Focus on clean UX for picky eaters finding recipes
- ✅ Use Magic UI components for beautiful, accessible interfaces
- ✅ Implement proper loading states and error handling
- ✅ Make the app intuitive for users who struggle with meal planning
- ✅ Prioritize mobile-first responsive design
- ✅ Follow accessibility best practices

### Security & Performance (Tasks 3, 16-20)
- ✅ All inputs must be validated and sanitized
- ✅ Implement rate limiting to prevent abuse
- ✅ Use proper authentication and authorization
- ✅ Optimize for performance under load
- ✅ Follow security best practices for production

## Core User Journey
1. **Onboarding**: Capture preferences, dietary restrictions, cooking skill
2. **Recipe Discovery**: AI-powered suggestions based on preferences
3. **Recipe Management**: Save, rate, organize favorite recipes
4. **Meal Planning**: Plan meals with available ingredients
5. **Community**: Share and discover recipes from other users

## Key Features That Must Work
- ✅ Personalized AI recipe generation honoring all preferences
- ✅ Smart ingredient substitution suggestions
- ✅ Recipe difficulty matching user cooking skill level
- ✅ Dietary restriction and allergy compliance
- ✅ Social features for recipe sharing and rating
- ✅ Mobile-friendly interface for kitchen use

## Red Flags (Things That Indicate Drift)
- ❌ Adding features not related to recipe discovery/management
- ❌ Complex UI that confuses the target audience (picky eaters)
- ❌ Ignoring user preferences in AI recipe generation
- ❌ Poor error handling or user feedback
- ❌ Features that don't work on mobile devices
- ❌ Security vulnerabilities or poor input validation
- ❌ Slow performance that affects user experience

## Success Metrics
- Users can successfully create accounts and set preferences
- AI generates relevant recipes honoring all preferences
- Users can save, rate, and organize recipes effectively
- App performs well on mobile devices
- Security vulnerabilities are minimal
- Code is maintainable and well-documented

Remember: **Every line of code should help picky eaters find meals they'll actually enjoy!** 