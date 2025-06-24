import { OpenAI } from 'openai';
import { z } from 'zod';
import { openaiRecipeResponseSchema } from '../schemas/openaiSchemas';
// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
// Error types to handle different failure scenarios
export class OpenAIConnectionError extends Error {
    constructor(message, originalError) {
        super(message);
        this.originalError = originalError;
        this.name = 'OpenAIConnectionError';
    }
}
export class OpenAIResponseValidationError extends Error {
    constructor(message, validationErrors, response) {
        super(message);
        this.validationErrors = validationErrors;
        this.response = response;
        this.name = 'OpenAIResponseValidationError';
    }
}
/**
 * Generate a dynamic prompt for recipe creation based on user preferences and ingredients
 */
export async function generateRecipePrompt({ userPreferences, ingredientPreferences, ingredients, includeIngredients = [], excludeIngredients = [], cuisine, mealType, cookingTime, difficulty, customMessage = '', }) {
    // Extract liked ingredients
    const likedIngredients = ingredientPreferences
        .filter(pref => pref.preference === 'like')
        .map(pref => pref.ingredient.name);
    // Extract disliked ingredients
    const dislikedIngredients = ingredientPreferences
        .filter(pref => pref.preference === 'dislike')
        .map(pref => pref.ingredient.name);
    // Extract stretch ingredients (ingredients user is willing to try)
    const stretchIngredients = ingredientPreferences
        .filter(pref => pref.preference === 'stretch')
        .map(pref => pref.ingredient.name);
    // Build prompt components with strict error indicators for critical requirements
    const promptParts = [
        `Create a detailed recipe with the following requirements:`,
        // Add dietary restrictions - critical safety requirement
        userPreferences.dietaryRestrictions?.length > 0
            ? `DIETARY RESTRICTIONS (CRITICAL - MUST FOLLOW): ${userPreferences.dietaryRestrictions.join(', ')}.`
            : '',
        // Add allergies - critical safety requirement
        userPreferences.allergies?.length > 0
            ? `ALLERGIES (CRITICAL - ABSOLUTELY DO NOT INCLUDE THESE INGREDIENTS): ${userPreferences.allergies.join(', ')}.`
            : '',
        // Add preferences
        likedIngredients.length > 0
            ? `Preferred ingredients: ${likedIngredients.join(', ')}.`
            : '',
        dislikedIngredients.length > 0
            ? `Disliked ingredients (avoid using these): ${dislikedIngredients.join(', ')}.`
            : '',
        stretchIngredients.length > 0
            ? `"Stretch" ingredients (user is willing to try these, use 1-2 maximum): ${stretchIngredients.join(', ')}.`
            : '',
        // Add required/excluded ingredients from this specific request
        includeIngredients?.length > 0
            ? `REQUIRED ingredients (must use these): ${includeIngredients.join(', ')}.`
            : '',
        excludeIngredients?.length > 0
            ? `EXCLUDED ingredients (do not use these): ${excludeIngredients.join(', ')}.`
            : '',
        // Add cuisine preferences
        cuisine
            ? `Cuisine type: ${cuisine}.`
            : userPreferences.cuisinePreferences?.length > 0
                ? `Preferred cuisines: ${userPreferences.cuisinePreferences.join(', ')}.`
                : '',
        // Add meal type
        mealType ? `Meal type: ${mealType}.` : '',
        // Add cooking constraints
        cookingTime
            ? `Maximum cooking time: ${cookingTime} minutes.`
            : userPreferences.maxCookingTime
                ? `Maximum cooking time: ${userPreferences.maxCookingTime} minutes.`
                : '',
        // Add difficulty level
        difficulty ? `Difficulty level: ${difficulty}.` : '',
        // Add spice level preference
        `Spice level: ${userPreferences.spiceLevel}.`,
        // Add serving size
        `Serving size: ${userPreferences.servingSize}.`,
        // Add custom message if provided
        customMessage ? `Additional request: ${customMessage}` : '',
        // Response format instructions - be very explicit
        `IMPORTANT: Return the recipe in a properly formatted JSON with these exact fields:
    {
      "title": "Recipe Title",
      "description": "Brief description of the recipe",
      "ingredients": [
        { "name": "Ingredient name", "quantity": "Amount needed", "notes": "Optional preparation notes" }
      ],
      "instructions": "Detailed step-by-step cooking instructions",
      "cookingTime": 30, // in minutes
      "prepTime": 15, // in minutes
      "servings": 4,
      "cuisine": "Cuisine type",
      "difficulty": "easy", // must be one of: easy, medium, hard
      "spiceLevel": "mild", // must be one of: mild, medium, hot
      "tips": ["Cooking tip 1", "Cooking tip 2"]
    }`,
    ].filter(Boolean).join('\n\n');
    return promptParts;
}
// Generate a minimal valid recipe for fallback situations
function generateFallbackRecipe(title = "Simple Fallback Recipe") {
    return {
        title,
        description: "A simple recipe generated as a fallback.",
        ingredients: [
            { name: "Ingredient 1", quantity: "As needed" },
            { name: "Ingredient 2", quantity: "As needed" }
        ],
        instructions: "1. Combine ingredients. 2. Cook as preferred.",
        cookingTime: 30,
        prepTime: 10,
        servings: 2,
        cuisine: "Mixed",
        difficulty: "easy",
        spiceLevel: "mild",
        tips: ["Keep it simple"]
    };
}
/**
 * Generate a recipe using OpenAI based on user preferences and parameters
 */
export async function generateRecipe(promptParams) {
    const MAX_RETRIES = 2;
    try {
        // Generate the prompt
        const prompt = await generateRecipePrompt(promptParams);
        // Try up to MAX_RETRIES times to get a valid response
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                // Call OpenAI API with increasing temperature on retries
                // This makes responses more creative/varied if previous attempts failed
                const temperature = 0.7 + (attempt * 0.1); // 0.7, 0.8, 0.9
                console.log(`[OpenAI] Attempt ${attempt + 1}/${MAX_RETRIES + 1} with temperature ${temperature}`);
                const completion = await openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [
                        {
                            role: "system",
                            content: "You are a professional chef specialized in creating personalized recipes based on user preferences, dietary restrictions, and available ingredients. Always respect allergies and dietary restrictions as they are critical for health and safety. Format your response as valid JSON exactly matching the required schema."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    response_format: { type: "json_object" },
                    temperature,
                });
                // Extract the content from the response
                const responseContent = completion.choices[0]?.message?.content;
                if (!responseContent) {
                    console.error("[OpenAI] Empty response content");
                    continue; // Try again if no content
                }
                // Parse and validate the JSON response
                try {
                    const parsedResponse = JSON.parse(responseContent);
                    console.log("[OpenAI] Response received and parsed successfully");
                    // Check for the presence of critical ingredients that were supposed to be excluded
                    if (promptParams.userPreferences.allergies?.length) {
                        const allergies = promptParams.userPreferences.allergies.map(a => a.toLowerCase());
                        const foundAllergies = parsedResponse.ingredients
                            ?.filter((ing) => allergies.some(allergy => ing.name.toLowerCase().includes(allergy)))
                            .map((ing) => ing.name);
                        if (foundAllergies?.length) {
                            throw new Error(`Recipe contains allergens that must be excluded: ${foundAllergies.join(', ')}`);
                        }
                    }
                    // Validate the response structure against our schema
                    const validatedRecipe = openaiRecipeResponseSchema.parse(parsedResponse);
                    // Return both the validated recipe and the original prompt for traceability
                    return {
                        recipe: validatedRecipe,
                        generatedPrompt: prompt
                    };
                }
                catch (parseError) {
                    // Log validation errors but continue to retry
                    if (parseError instanceof z.ZodError) {
                        console.error("[OpenAI] Validation error:", JSON.stringify(parseError.format(), null, 2));
                        // If this is the last attempt, throw a proper validation error
                        if (attempt === MAX_RETRIES) {
                            throw new OpenAIResponseValidationError("OpenAI response failed validation after multiple attempts", parseError, responseContent);
                        }
                    }
                    else {
                        console.error("[OpenAI] JSON parse error:", parseError);
                    }
                    // Continue to next attempt
                    continue;
                }
            }
            catch (apiError) {
                console.error(`[OpenAI] API call error on attempt ${attempt + 1}:`, apiError);
                // If this is the last attempt, throw
                if (attempt === MAX_RETRIES) {
                    throw new OpenAIConnectionError("Failed to connect to OpenAI API after multiple attempts", apiError);
                }
                // Wait before retrying (exponential backoff)
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`[OpenAI] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        // If we get here, all attempts failed but didn't throw terminal errors
        // Generate a fallback recipe as last resort
        console.warn("[OpenAI] All attempts failed, returning fallback recipe");
        const fallbackTitle = "Simple Recipe" +
            (promptParams.cuisine ? ` (${promptParams.cuisine})` : "") +
            (promptParams.mealType ? ` - ${promptParams.mealType}` : "");
        return {
            recipe: generateFallbackRecipe(fallbackTitle),
            generatedPrompt: prompt,
            fallback: true // Indicate this is a fallback recipe
        };
    }
    catch (error) {
        console.error("[OpenAI] Fatal error in recipe generation:", error);
        // If it's already one of our custom errors, rethrow it
        if (error instanceof OpenAIConnectionError || error instanceof OpenAIResponseValidationError) {
            throw error;
        }
        // Otherwise wrap in a general error
        throw new Error(`Recipe generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
