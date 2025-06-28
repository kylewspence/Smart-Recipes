import { OpenAI } from 'openai';
import { z } from 'zod';
import {
    UserPreferences,
    Ingredient,
    UserIngredientPreference
} from '../types';
import { openaiRecipeResponseSchema } from '../schemas/openaiSchemas';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Error types to handle different failure scenarios
export class OpenAIConnectionError extends Error {
    constructor(message: string, public originalError: unknown) {
        super(message);
        this.name = 'OpenAIConnectionError';
    }
}

export class OpenAIResponseValidationError extends Error {
    constructor(message: string, public validationErrors: z.ZodError, public response: unknown) {
        super(message);
        this.name = 'OpenAIResponseValidationError';
        this.validationErrors = validationErrors;
        this.response = response;
    }
}

/**
 * Generate a dynamic prompt for recipe creation based on user preferences and ingredients
 */
export async function generateRecipePrompt({
    userPreferences,
    ingredientPreferences,
    ingredients,
    includeIngredients = [],
    excludeIngredients = [],
    cuisine,
    mealType,
    cookingTime,
    difficulty,
    customMessage = '',
}: {
    userPreferences: UserPreferences;
    ingredientPreferences: (UserIngredientPreference & { ingredient: Ingredient })[];
    ingredients: Ingredient[];
    includeIngredients?: string[];
    excludeIngredients?: string[];
    cuisine?: string;
    mealType?: string;
    cookingTime?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    customMessage?: string;
}): Promise<string> {
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

        // Add required ingredients FIRST and make it extremely clear
        includeIngredients?.length > 0
            ? `🚨 CRITICAL REQUIREMENT - REQUIRED INGREDIENTS (YOU MUST USE ALL OF THESE): ${includeIngredients.join(', ')}.
            
            ⚠️ WARNING: The recipe will be rejected if it does not contain ALL of these required ingredients: ${includeIngredients.join(', ')}.
            
            These ingredients MUST appear in your ingredients list. This is non-negotiable.`
            : '',

        // Add dietary restrictions - critical safety requirement
        userPreferences.dietaryRestrictions?.length > 0
            ? `DIETARY RESTRICTIONS (CRITICAL - MUST FOLLOW): ${userPreferences.dietaryRestrictions.join(', ')}.`
            : '',

        // Add allergies - critical safety requirement
        userPreferences.allergies?.length > 0
            ? `ALLERGIES (CRITICAL - ABSOLUTELY DO NOT INCLUDE THESE INGREDIENTS): ${userPreferences.allergies.join(', ')}.`
            : '',

        // Add excluded ingredients from this specific request
        excludeIngredients?.length > 0
            ? `EXCLUDED ingredients (do not use these): ${excludeIngredients.join(', ')}.`
            : '',

        // Add preferences
        likedIngredients.length > 0
            ? `Preferred ingredients (try to use some of these): ${likedIngredients.join(', ')}.`
            : '',

        dislikedIngredients.length > 0
            ? `Disliked ingredients (avoid using these): ${dislikedIngredients.join(', ')}.`
            : '',

        stretchIngredients.length > 0
            ? `"Stretch" ingredients (user is willing to try these, use 1-2 maximum): ${stretchIngredients.join(', ')}.`
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

        // Final reminder about required ingredients
        includeIngredients?.length > 0
            ? `🔴 FINAL REMINDER: Your recipe MUST include these ingredients: ${includeIngredients.join(', ')}. 
            The user specifically requested a recipe using these ingredients. Do not ignore this requirement.`
            : '',

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
        difficulty: "easy" as const,
        spiceLevel: "mild" as const,
        tips: ["Keep it simple"]
    };
}

/**
 * Generate a recipe using OpenAI based on user preferences and parameters
 */
export async function generateRecipe(promptParams: Parameters<typeof generateRecipePrompt>[0]) {
    const MAX_RETRIES = 2;

    try {
        // Generate the prompt
        const prompt = await generateRecipePrompt(promptParams);

        // Add detailed logging to help debug issues
        console.log('\n🔍 [RECIPE GENERATION DEBUG]');
        console.log('📝 Include Ingredients:', promptParams.includeIngredients);
        console.log('🚫 Exclude Ingredients:', promptParams.excludeIngredients);
        console.log('👤 User ID:', promptParams.userPreferences.userId);
        console.log('🍽️ Meal Type:', promptParams.mealType);
        console.log('🌍 Cuisine:', promptParams.cuisine);
        console.log('💬 Custom Message:', promptParams.customMessage);
        console.log('\n📋 FULL PROMPT BEING SENT TO OPENAI:');
        console.log('='.repeat(80));
        console.log(prompt);
        console.log('='.repeat(80));

        // Try up to MAX_RETRIES times to get a valid response
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                // Call OpenAI API with increasing temperature on retries
                // This makes responses more creative/varied if previous attempts failed
                const temperature = 0.7 + (attempt * 0.1); // 0.7, 0.8, 0.9

                console.log(`\n🤖 [OpenAI] Attempt ${attempt + 1}/${MAX_RETRIES + 1} with temperature ${temperature}`);

                const completion = await openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [
                        {
                            role: "system",
                            content: `You are a professional chef specialized in creating personalized recipes based on user preferences, dietary restrictions, and available ingredients. 

CRITICAL INSTRUCTIONS:
1. ALWAYS respect allergies and dietary restrictions as they are critical for health and safety
2. When specific ingredients are marked as "REQUIRED" or "CRITICAL REQUIREMENT", you MUST include ALL of them in your recipe
3. When a user requests a recipe with specific ingredients (like "chicken and rice"), those ingredients are MANDATORY and must be the main components of your recipe
4. Format your response as valid JSON exactly matching the required schema
5. Never ignore or substitute required ingredients - the user is counting on you to use what they specified

Your reputation depends on following these instructions precisely.`
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
                    console.error("❌ [OpenAI] Empty response content");
                    continue; // Try again if no content
                }

                // Parse and validate the JSON response
                try {
                    const parsedResponse = JSON.parse(responseContent);
                    console.log("✅ [OpenAI] Response received and parsed successfully");

                    // Log the generated recipe for debugging
                    console.log('\n📋 GENERATED RECIPE:');
                    console.log('🏷️ Title:', parsedResponse.title);
                    console.log('🥘 Ingredients:', parsedResponse.ingredients?.map((ing: any) => ing.name).join(', '));
                    console.log('🍽️ Cuisine:', parsedResponse.cuisine);

                    // Validate that required ingredients are actually included
                    if (promptParams.includeIngredients && promptParams.includeIngredients.length > 0) {
                        const recipeIngredientNames = parsedResponse.ingredients?.map((ing: any) =>
                            ing.name.toLowerCase()
                        ) || [];

                        const missingIngredients = promptParams.includeIngredients.filter(required =>
                            !recipeIngredientNames.some((recipeIng: string) =>
                                recipeIng.includes(required.toLowerCase()) ||
                                required.toLowerCase().includes(recipeIng)
                            )
                        );

                        if (missingIngredients.length > 0) {
                            console.error(`❌ [VALIDATION] Recipe missing required ingredients: ${missingIngredients.join(', ')}`);
                            console.error(`📝 Required: ${promptParams.includeIngredients.join(', ')}`);
                            console.error(`🥘 Recipe has: ${recipeIngredientNames.join(', ')}`);

                            if (attempt === MAX_RETRIES) {
                                throw new Error(
                                    `Recipe does not include required ingredients: ${missingIngredients.join(', ')}`
                                );
                            } else {
                                console.log(`🔄 Retrying with stronger instructions...`);
                                continue; // Try again with higher temperature
                            }
                        } else {
                            console.log('✅ [VALIDATION] All required ingredients found in recipe');
                        }
                    }

                    // Check for the presence of critical ingredients that were supposed to be excluded
                    if (promptParams.userPreferences.allergies?.length) {
                        const allergies = promptParams.userPreferences.allergies.map(a => a.toLowerCase());
                        const foundAllergies = parsedResponse.ingredients
                            ?.filter((ing: { name: string }) => allergies.some(allergy =>
                                ing.name.toLowerCase().includes(allergy)
                            ))
                            .map((ing: { name: string }) => ing.name);

                        if (foundAllergies?.length) {
                            throw new Error(
                                `Recipe contains allergens that must be excluded: ${foundAllergies.join(', ')}`
                            );
                        }
                    }

                    // Validate the response structure against our schema
                    const validatedRecipe = openaiRecipeResponseSchema.parse(parsedResponse);

                    console.log('🎉 [SUCCESS] Recipe generation completed successfully');

                    // Return both the validated recipe and the original prompt for traceability
                    return {
                        recipe: validatedRecipe,
                        generatedPrompt: prompt
                    };
                } catch (parseError) {
                    // Log validation errors but continue to retry
                    if (parseError instanceof z.ZodError) {
                        console.error("❌ [OpenAI] Validation error:", JSON.stringify(parseError.format(), null, 2));

                        // If this is the last attempt, throw a proper validation error
                        if (attempt === MAX_RETRIES) {
                            throw new OpenAIResponseValidationError(
                                "OpenAI response failed validation after multiple attempts",
                                parseError,
                                responseContent
                            );
                        }
                    } else {
                        console.error("❌ [OpenAI] Parse error:", parseError);

                        if (attempt === MAX_RETRIES) {
                            throw new Error(`Failed to parse OpenAI response: ${parseError}`);
                        }
                    }

                    // Continue to retry
                    console.log(`🔄 [OpenAI] Retrying due to parse/validation error...`);
                    continue;
                }
            } catch (apiError) {
                console.error(`❌ [OpenAI] API error on attempt ${attempt + 1}:`, apiError);

                // If this is the last attempt or it's a non-retryable error, handle it
                if (attempt === MAX_RETRIES || (apiError as any)?.status === 401) {
                    throw new OpenAIConnectionError(
                        "Failed to connect to OpenAI after multiple attempts",
                        apiError
                    );
                }

                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                console.log(`🔄 [OpenAI] Retrying API call...`);
            }
        }

        // If we get here, all retries failed
        console.error("❌ [OpenAI] All retry attempts exhausted");
        throw new Error("Recipe generation failed after multiple attempts");

    } catch (error) {
        console.error("💥 [OpenAI] Fatal error in recipe generation:", error);

        // If it's already one of our custom errors, rethrow it
        if (error instanceof OpenAIConnectionError || error instanceof OpenAIResponseValidationError) {
            throw error;
        }

        // Create a fallback recipe with the requested ingredients if possible
        const fallbackTitle = "Simple Recipe" +
            (promptParams.includeIngredients?.length ? ` with ${promptParams.includeIngredients.join(' and ')}` : "") +
            (promptParams.cuisine ? ` (${promptParams.cuisine})` : "") +
            (promptParams.mealType ? ` - ${promptParams.mealType}` : "");

        console.log(`🆘 [FALLBACK] Generating fallback recipe: ${fallbackTitle}`);

        return {
            recipe: generateFallbackRecipe(fallbackTitle),
            generatedPrompt: await generateRecipePrompt(promptParams),
            fallback: true // Indicate this is a fallback recipe
        };
    }
}