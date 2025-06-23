export interface UserPreferences {
    userId?: string;
    dietaryRestrictions?: string[];
    allergies?: string[];
    cuisinePreferences?: string[];
    spiceLevel?: 'mild' | 'medium' | 'hot';
    maxCookingTime?: number;
    servingSize?: number;
    createdAt?: string;
    updatedAt?: string;
    ingredientPreferences?: IngredientPreference[];
}

export interface IngredientPreference {
    ingredientId: number;
    preference: 'like' | 'dislike' | 'stretch';
    name?: string;
    category?: string;
}

export interface Ingredient {
    ingredientId: number;
    name: string;
    category?: string;
    createdAt?: string;
    updatedAt?: string;
    usage_count?: number;
    preference_count?: number;
}

export interface PreferenceFormData {
    // Step 1: Basic Info
    dietaryRestrictions: string[];
    allergies: string[];

    // Step 2: Cooking Preferences  
    cuisinePreferences: string[];
    spiceLevel: 'mild' | 'medium' | 'hot';
    maxCookingTime: number;
    servingSize: number;

    // Step 3: Ingredient Preferences
    ingredientPreferences: IngredientPreference[];
}

export interface OnboardingStep {
    id: number;
    title: string;
    description: string;
    completed: boolean;
}

// Common dietary restrictions
export const DIETARY_RESTRICTIONS = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Keto',
    'Paleo',
    'Low-Carb',
    'Low-Fat',
    'Kosher',
    'Halal',
    'Pescatarian',
    'Nut-Free'
] as const;

// Common allergies
export const COMMON_ALLERGIES = [
    'Peanuts',
    'Tree Nuts',
    'Shellfish',
    'Fish',
    'Eggs',
    'Milk',
    'Soy',
    'Wheat',
    'Sesame',
    'Sulfites'
] as const;

// Common cuisines
export const CUISINE_TYPES = [
    'Italian',
    'Mexican',
    'Chinese',
    'Japanese',
    'Indian',
    'Thai',
    'Mediterranean',
    'French',
    'American',
    'Middle Eastern',
    'Korean',
    'Vietnamese',
    'Greek',
    'Spanish',
    'German',
    'British'
] as const;