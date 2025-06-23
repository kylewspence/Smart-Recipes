// Recipe interfaces and types
export interface Recipe {
    id: number;
    title: string;
    description: string;
    ingredients: RecipeIngredient[];
    instructions: string[];
    cookingTime: number;
    prepTime: number;
    servings: number;
    difficulty: 'easy' | 'medium' | 'hard';
    cuisine: string;
    mealType: string;
    tags: string[];
    nutritionalInfo?: NutritionalInfo;
    rating?: number;
    reviewCount?: number;
    imageUrl?: string;
    userId: number;
    generatedPrompt?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface RecipeIngredient {
    id: number;
    name: string;
    amount: number;
    unit: string;
    preparation?: string;
    optional?: boolean;
}

export interface NutritionalInfo {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
}

export interface RecipeGenerationRequest {
    userId: number;
    message: string;
    mealType?: string;
    cuisine?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    cookingTime?: number;
    servings?: number;
    includeIngredients?: string[];
    excludeIngredients?: string[];
    dietaryRestrictions?: string[];
    spiceLevel?: 'mild' | 'medium' | 'hot';
}

export interface RecipeGenerationResponse {
    recipe: Recipe;
    generatedPrompt: string;
    status: 'success' | 'error';
    message?: string;
}

export interface RecipeFormData {
    message: string;
    mealType: string;
    cuisine: string;
    difficulty: 'easy' | 'medium' | 'hard';
    cookingTime: number;
    servings?: number;
    includeIngredients: string[];
    excludeIngredients: string[];
    dietaryRestrictions: string[];
    spiceLevel?: 'mild' | 'medium' | 'hot';
}

// Constants for recipe options
export const MEAL_TYPES = [
    'Breakfast',
    'Brunch',
    'Lunch',
    'Dinner',
    'Snack',
    'Appetizer',
    'Dessert',
    'Beverage'
] as const;

export const RECIPE_CUISINES = [
    'Any',
    'Italian',
    'Chinese',
    'Mexican',
    'Indian',
    'Japanese',
    'Thai',
    'French',
    'Mediterranean',
    'American',
    'Korean',
    'Vietnamese',
    'Greek',
    'Spanish',
    'Middle Eastern',
    'British',
    'German',
    'Moroccan',
    'Lebanese',
    'Turkish',
    'Brazilian',
    'Ethiopian',
    'Fusion'
] as const;

export const DIFFICULTY_LEVELS = [
    { value: 'easy', label: 'Easy', description: 'Simple recipes with basic techniques' },
    { value: 'medium', label: 'Medium', description: 'Some cooking experience required' },
    { value: 'hard', label: 'Hard', description: 'Advanced techniques and skills needed' }
] as const;

export const COOKING_TIME_OPTIONS = [
    { value: 15, label: '15 minutes', description: 'Quick meals' },
    { value: 30, label: '30 minutes', description: 'Fast cooking' },
    { value: 45, label: '45 minutes', description: 'Standard time' },
    { value: 60, label: '1 hour', description: 'Leisurely cooking' },
    { value: 90, label: '1.5 hours', description: 'Extended preparation' },
    { value: 120, label: '2+ hours', description: 'Special occasion meals' }
] as const;

export const SPICE_LEVELS = [
    { value: 'mild', label: 'Mild', emoji: '🌶️', description: 'Gentle flavors' },
    { value: 'medium', label: 'Medium', emoji: '🌶️🌶️', description: 'Moderate heat' },
    { value: 'hot', label: 'Hot', emoji: '🌶️🌶️🌶️', description: 'Spicy and bold' }
] as const;

export const SERVING_SIZE_OPTIONS = [
    { value: 1, label: '1 person', description: 'Individual serving' },
    { value: 2, label: '2 people', description: 'Couple or small portion' },
    { value: 4, label: '4 people', description: 'Family meal' },
    { value: 6, label: '6 people', description: 'Small gathering' },
    { value: 8, label: '8 people', description: 'Party or event' },
    { value: 12, label: '12+ people', description: 'Large group' }
] as const;

// Type definitions for constants
export type MealType = typeof MEAL_TYPES[number];
export type RecipeCuisine = typeof RECIPE_CUISINES[number];
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type SpiceLevel = 'mild' | 'medium' | 'hot';
