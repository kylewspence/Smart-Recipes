"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// Sample recipe for demonstration
const sampleRecipe = {
    title: "Garlic Butter Shrimp Pasta",
    description: "A quick and delicious pasta dish with garlic butter shrimp.",
    cookingTime: 25,
    servings: 4,
    difficulty: "Medium",
    ingredients: [
        "8 oz linguine pasta",
        "1 lb large shrimp, peeled and deveined",
        "4 cloves garlic, minced",
        "1/2 tsp red pepper flakes",
        "1/4 cup butter",
        "1/4 cup olive oil",
        "1/4 cup white wine (optional)",
        "1 lemon, juiced",
        "1/4 cup chopped fresh parsley",
        "Salt and pepper to taste",
        "Grated Parmesan cheese for serving"
    ],
    instructions: [
        "Cook pasta according to package directions. Drain and set aside, reserving 1/2 cup pasta water.",
        "In a large skillet, heat 2 tablespoons olive oil over medium-high heat.",
        "Add shrimp in a single layer and cook for 1-2 minutes per side until pink. Remove from pan and set aside.",
        "In the same skillet, add remaining olive oil and butter. Once butter is melted, add garlic and red pepper flakes. Cook until fragrant, about 1 minute.",
        "Add white wine (if using) and lemon juice, scraping up any browned bits from the bottom of the pan. Simmer for 2 minutes.",
        "Return shrimp to the skillet and add cooked pasta, tossing to coat. If needed, add reserved pasta water to loosen the sauce.",
        "Remove from heat and stir in fresh parsley. Season with salt and pepper.",
        "Serve immediately with grated Parmesan cheese."
    ],
    nutritionInfo: {
        calories: 480,
        protein: 32,
        carbohydrates: 42,
        fat: 18,
        fiber: 2
    },
    tips: [
        "For a healthier version, use whole wheat pasta.",
        "You can substitute chicken for shrimp if preferred.",
        "Add spinach or cherry tomatoes for extra vegetables."
    ]
};

export default function RecipeResultsPage() {
    const router = useRouter();
    const [recipe, setRecipe] = useState(sampleRecipe);
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveRecipe = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSaving(false);
        router.push("/dashboard");
    };

    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />

            <main className="flex-1 py-8">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">{recipe.title}</h1>
                            <p className="mt-2 text-lg text-muted-foreground">{recipe.description}</p>
                        </div>

                        <div className="flex space-x-4">
                            <Button
                                variant="outline"
                                onClick={() => router.push("/recipes/generate")}
                            >
                                Regenerate
                            </Button>

                            <Button
                                onClick={handleSaveRecipe}
                                disabled={isSaving}
                            >
                                {isSaving ? "Saving..." : "Save Recipe"}
                            </Button>
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                            {/* Recipe Info */}
                            <div className="lg:col-span-1">
                                <div className="rounded-lg border bg-card p-6 shadow-sm">
                                    <h2 className="mb-4 text-xl font-semibold text-foreground">Recipe Details</h2>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-border pb-2">
                                            <span className="text-sm font-medium text-muted-foreground">Cooking Time:</span>
                                            <span className="text-sm text-foreground">{recipe.cookingTime} minutes</span>
                                        </div>

                                        <div className="flex items-center justify-between border-b border-border pb-2">
                                            <span className="text-sm font-medium text-muted-foreground">Servings:</span>
                                            <span className="text-sm text-foreground">{recipe.servings}</span>
                                        </div>

                                        <div className="flex items-center justify-between border-b border-border pb-2">
                                            <span className="text-sm font-medium text-muted-foreground">Difficulty:</span>
                                            <span className="text-sm text-foreground">{recipe.difficulty}</span>
                                        </div>

                                        <div className="pt-2">
                                            <h3 className="mb-2 text-sm font-medium text-foreground">Nutrition (per serving)</h3>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Calories:</span>
                                                    <span>{recipe.nutritionInfo.calories} kcal</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Protein:</span>
                                                    <span>{recipe.nutritionInfo.protein}g</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Carbs:</span>
                                                    <span>{recipe.nutritionInfo.carbohydrates}g</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Fat:</span>
                                                    <span>{recipe.nutritionInfo.fat}g</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
                                    <h2 className="mb-4 text-xl font-semibold text-foreground">Ingredients</h2>
                                    <ul className="space-y-2">
                                        {recipe.ingredients.map((ingredient, index) => (
                                            <li key={index} className="flex items-center text-sm text-foreground">
                                                <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">✓</span>
                                                {ingredient}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
                                    <h2 className="mb-4 text-xl font-semibold text-foreground">Chef's Tips</h2>
                                    <ul className="space-y-2">
                                        {recipe.tips.map((tip, index) => (
                                            <li key={index} className="flex items-start text-sm text-foreground">
                                                <span className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">💡</span>
                                                <span>{tip}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="lg:col-span-2">
                                <div className="rounded-lg border bg-card p-6 shadow-sm">
                                    <h2 className="mb-6 text-xl font-semibold text-foreground">Instructions</h2>
                                    <ol className="space-y-6">
                                        {recipe.instructions.map((instruction, index) => (
                                            <li key={index} className="flex">
                                                <span className="mr-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                                                    {index + 1}
                                                </span>
                                                <span className="mt-0.5 text-foreground">{instruction}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>

                                <div className="mt-6 flex justify-end space-x-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push("/recipes/generate")}
                                    >
                                        Regenerate
                                    </Button>

                                    <Button
                                        onClick={handleSaveRecipe}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? "Saving..." : "Save Recipe"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
} 