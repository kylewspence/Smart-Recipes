import { UserPreferences, DIETARY_RESTRICTIONS, COMMON_ALLERGIES, CUISINE_TYPES } from '../types/preferences';

export interface ExportedPreferences {
    version: string;
    exportDate: string;
    userInfo: {
        userId?: string;
        exportedBy?: string;
    };
    preferences: UserPreferences;
    metadata: {
        totalIngredientPreferences: number;
        hasCustomSettings: boolean;
    };
}

export interface PreferenceTemplate {
    id: string;
    name: string;
    description: string;
    preferences: Partial<UserPreferences>;
    tags: string[];
}

// Preset templates for common dietary needs
export const PREFERENCE_TEMPLATES: PreferenceTemplate[] = [
    {
        id: 'vegetarian',
        name: 'Vegetarian',
        description: 'Plant-based diet excluding meat, poultry, and fish',
        preferences: {
            dietaryRestrictions: ['Vegetarian'],
            cuisinePreferences: ['Italian', 'Mediterranean', 'Indian', 'Thai'],
            spiceLevel: 'medium',
            maxCookingTime: 45,
            servingSize: 4
        },
        tags: ['popular', 'plant-based']
    },
    {
        id: 'vegan',
        name: 'Vegan',
        description: 'Plant-based diet excluding all animal products',
        preferences: {
            dietaryRestrictions: ['Vegan'],
            allergies: ['Milk', 'Eggs'],
            cuisinePreferences: ['Mediterranean', 'Indian', 'Thai', 'Middle Eastern'],
            spiceLevel: 'medium',
            maxCookingTime: 45,
            servingSize: 4
        },
        tags: ['popular', 'plant-based', 'strict']
    },
    {
        id: 'keto',
        name: 'Ketogenic (Keto)',
        description: 'High-fat, low-carb diet for ketosis',
        preferences: {
            dietaryRestrictions: ['Keto', 'Low-Carb'],
            cuisinePreferences: ['American', 'Mediterranean', 'German'],
            spiceLevel: 'medium',
            maxCookingTime: 60,
            servingSize: 4
        },
        tags: ['popular', 'low-carb', 'weight-loss']
    },
    {
        id: 'gluten-free',
        name: 'Gluten-Free',
        description: 'Diet excluding gluten-containing grains',
        preferences: {
            dietaryRestrictions: ['Gluten-Free'],
            allergies: ['Wheat'],
            cuisinePreferences: ['Mediterranean', 'Mexican', 'Thai', 'Indian'],
            spiceLevel: 'medium',
            maxCookingTime: 45,
            servingSize: 4
        },
        tags: ['medical', 'popular']
    },
    {
        id: 'paleo',
        name: 'Paleo',
        description: 'Whole foods diet based on paleolithic eating',
        preferences: {
            dietaryRestrictions: ['Paleo'],
            allergies: ['Wheat', 'Milk', 'Soy'],
            cuisinePreferences: ['Mediterranean', 'American'],
            spiceLevel: 'medium',
            maxCookingTime: 60,
            servingSize: 4
        },
        tags: ['whole-foods', 'natural']
    },
    {
        id: 'quick-meals',
        name: 'Quick & Easy',
        description: 'Fast cooking for busy lifestyles',
        preferences: {
            maxCookingTime: 20,
            servingSize: 2,
            cuisinePreferences: ['American', 'Italian', 'Mexican', 'Chinese'],
            spiceLevel: 'mild'
        },
        tags: ['time-saving', 'busy', 'beginner']
    },
    {
        id: 'family-friendly',
        name: 'Family Friendly',
        description: 'Mild flavors suitable for all family members',
        preferences: {
            spiceLevel: 'mild',
            maxCookingTime: 45,
            servingSize: 6,
            cuisinePreferences: ['American', 'Italian', 'Mexican'],
            allergies: [] // Keep allergen-free by default
        },
        tags: ['family', 'mild', 'kid-friendly']
    },
    {
        id: 'adventurous',
        name: 'Adventurous Eater',
        description: 'Bold flavors and diverse cuisines',
        preferences: {
            spiceLevel: 'hot',
            maxCookingTime: 90,
            servingSize: 4,
            cuisinePreferences: ['Thai', 'Indian', 'Korean', 'Vietnamese', 'Middle Eastern', 'Mexican'],
            dietaryRestrictions: []
        },
        tags: ['spicy', 'diverse', 'bold']
    }
];

/**
 * Export user preferences to a downloadable JSON file
 */
export function exportPreferences(preferences: UserPreferences, userId?: string): ExportedPreferences {
    const exportData: ExportedPreferences = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        userInfo: {
            userId: userId,
            exportedBy: 'Smart Recipes App'
        },
        preferences: {
            ...preferences,
            // Remove sensitive data
            userId: undefined,
            createdAt: undefined,
            updatedAt: undefined
        },
        metadata: {
            totalIngredientPreferences: preferences.ingredientPreferences?.length || 0,
            hasCustomSettings: !!(
                preferences.dietaryRestrictions?.length ||
                preferences.allergies?.length ||
                preferences.cuisinePreferences?.length
            )
        }
    };

    return exportData;
}

/**
 * Download preferences as JSON file
 */
export function downloadPreferences(preferences: UserPreferences, userId?: string): void {
    const exportData = exportPreferences(preferences, userId);
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `smart-recipes-preferences-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Validate imported preferences data
 */
export function validateImportedPreferences(data: any): { isValid: boolean; errors: string[]; preferences?: UserPreferences } {
    const errors: string[] = [];

    // Check if it's a valid object
    if (!data || typeof data !== 'object') {
        errors.push('Invalid file format. Expected JSON object.');
        return { isValid: false, errors };
    }

    // Check if it has the expected structure
    if (data.preferences && typeof data.preferences === 'object') {
        // It's an exported preferences file
        data = data.preferences;
    }

    // Validate dietary restrictions
    if (data.dietaryRestrictions && !Array.isArray(data.dietaryRestrictions)) {
        errors.push('Dietary restrictions must be an array.');
    } else if (data.dietaryRestrictions) {
        const invalidRestrictions = data.dietaryRestrictions.filter(
            (r: any) => typeof r !== 'string' || !DIETARY_RESTRICTIONS.includes(r as any)
        );
        if (invalidRestrictions.length > 0) {
            errors.push(`Invalid dietary restrictions: ${invalidRestrictions.join(', ')}`);
        }
    }

    // Validate allergies
    if (data.allergies && !Array.isArray(data.allergies)) {
        errors.push('Allergies must be an array.');
    } else if (data.allergies) {
        const invalidAllergies = data.allergies.filter(
            (a: any) => typeof a !== 'string' || !COMMON_ALLERGIES.includes(a as any)
        );
        if (invalidAllergies.length > 0) {
            errors.push(`Invalid allergies: ${invalidAllergies.join(', ')}`);
        }
    }

    // Validate cuisine preferences
    if (data.cuisinePreferences && !Array.isArray(data.cuisinePreferences)) {
        errors.push('Cuisine preferences must be an array.');
    } else if (data.cuisinePreferences) {
        const invalidCuisines = data.cuisinePreferences.filter(
            (c: any) => typeof c !== 'string' || !CUISINE_TYPES.includes(c as any)
        );
        if (invalidCuisines.length > 0) {
            errors.push(`Invalid cuisine preferences: ${invalidCuisines.join(', ')}`);
        }
    }

    // Validate spice level
    if (data.spiceLevel && !['mild', 'medium', 'hot'].includes(data.spiceLevel)) {
        errors.push('Spice level must be "mild", "medium", or "hot".');
    }

    // Validate cooking time
    if (data.maxCookingTime && (typeof data.maxCookingTime !== 'number' || data.maxCookingTime < 5 || data.maxCookingTime > 300)) {
        errors.push('Max cooking time must be a number between 5 and 300 minutes.');
    }

    // Validate serving size
    if (data.servingSize && (typeof data.servingSize !== 'number' || data.servingSize < 1 || data.servingSize > 20)) {
        errors.push('Serving size must be a number between 1 and 20.');
    }

    // Validate ingredient preferences
    if (data.ingredientPreferences && !Array.isArray(data.ingredientPreferences)) {
        errors.push('Ingredient preferences must be an array.');
    } else if (data.ingredientPreferences) {
        data.ingredientPreferences.forEach((pref: any, index: number) => {
            if (!pref || typeof pref !== 'object') {
                errors.push(`Ingredient preference ${index + 1} must be an object.`);
            } else {
                if (typeof pref.ingredientId !== 'number') {
                    errors.push(`Ingredient preference ${index + 1} must have a valid ingredientId.`);
                }
                if (!['like', 'dislike', 'stretch'].includes(pref.preference)) {
                    errors.push(`Ingredient preference ${index + 1} must have preference "like", "dislike", or "stretch".`);
                }
            }
        });
    }

    if (errors.length > 0) {
        return { isValid: false, errors };
    }

    // Clean and return valid preferences
    const cleanPreferences: UserPreferences = {
        dietaryRestrictions: data.dietaryRestrictions || [],
        allergies: data.allergies || [],
        cuisinePreferences: data.cuisinePreferences || [],
        spiceLevel: data.spiceLevel || 'medium',
        maxCookingTime: data.maxCookingTime || 60,
        servingSize: data.servingSize || 4,
        ingredientPreferences: data.ingredientPreferences || []
    };

    return { isValid: true, errors: [], preferences: cleanPreferences };
}

/**
 * Parse uploaded file content
 */
export function parseImportFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const data = JSON.parse(content);
                resolve(data);
            } catch (error) {
                reject(new Error('Invalid JSON file format'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsText(file);
    });
}

/**
 * Apply a preset template to user preferences
 */
export function applyPresetTemplate(template: PreferenceTemplate, currentPreferences?: UserPreferences): UserPreferences {
    return {
        ...currentPreferences,
        ...template.preferences,
        // Preserve ingredient preferences unless template specifically overrides them
        ingredientPreferences: template.preferences.ingredientPreferences || currentPreferences?.ingredientPreferences || []
    };
}

/**
 * Generate a shareable link for preferences (placeholder for future implementation)
 */
export function generateShareableLink(preferences: UserPreferences): string {
    // This would typically involve creating a share token via API
    // For now, return a placeholder
    const encoded = btoa(JSON.stringify(preferences));
    return `${window.location.origin}/preferences/shared?data=${encoded}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
    }
} 