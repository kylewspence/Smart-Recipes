# 🧠 Smart Recipes - AI-Powered Meal Planner - Still very much under construction.

Smart Recipes is a full-stack, AI-powered meal planning app that helps users generate personalized recipes based on their preferences, dietary restrictions, and ingredient availability.

Built as my senior capstone project, this app showcases my ability to architect, build, and scale a modern full-stack application using:

- **Next.js + TypeScript** for the frontend
- **Express.js + PostgreSQL** for the backend
- **Zod** for data validation
- **OpenAI API** for recipe generation
- **JWT-based authentication** for secure user access

---

## 🚀 Live Demo

Coming soon — will deploy with Vercel + Render/Neon.

---

## 🧩 Features

- ✅ **User registration & authentication**
- ✅ **Multi-step food preference form**
- ✅ **Save favorite ingredients, cuisines, restrictions**
- ✅ **Generate AI recipes using OpenAI + user context**
- ✅ **Save, edit, or delete recipes**
- ✅ **Structured Zod validation across backend**
- ✅ **Full CRUD API for users, preferences, recipes**

---

## 🛠️ Tech Stack

| Layer       | Tech                          |
|-------------|-------------------------------|
| Frontend    | Next.js, React, TypeScript, Tailwind CSS |
| Backend     | Node.js, Express, TypeScript  |
| Database    | PostgreSQL                    |
| AI          | OpenAI API (GPT-4)            |
| Auth        | JWT w/ bcrypt password hashing |
| Validation  | Zod (Request/Response guards) |

---

## 📦 Installation

```bash
# Clone repo
git clone https://github.com/your-username/smart-recipes.git
cd smart-recipes

# Install server dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
