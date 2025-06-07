"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// Form validation schema
const recipeGenerationSchema = z.object({
    dietaryRestrictions: z.array(z.string()).optional(),
    cuisineType: z.string().optional(),
    ingredients: z.array(z.string()).min(1, "Please add at least one ingredient"),
    mealType: z.string().optional(),
    cookingTime: z.number().positive().optional(),
    difficulty: z.string().optional(),
    servings: z.number().positive().optional(),
    excludeIngredients: z.array(z.string()).optional(),
});

type RecipeGenerationFormValues = z.infer<typeof recipeGenerationSchema>;

// Predefined options
const dietaryOptions = [
    "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free",
    "Keto", "Paleo", "Low-Carb", "Low-Fat", "Nut-Free"
];

const cuisineOptions = [
    "Italian", "Mexican", "Chinese", "Japanese", "Indian",
    "Thai", "Mediterranean", "American", "French", "Middle Eastern"
];

const mealTypeOptions = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"];
const difficultyOptions = ["Easy", "Medium", "Hard"];

export default function GenerateRecipePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ingredient, setIngredient] = useState("");
    const [excludeIngredient, setExcludeIngredient] = useState("");

    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<RecipeGenerationFormValues>({
        resolver: zodResolver(recipeGenerationSchema),
        defaultValues: {
            dietaryRestrictions: [],
            ingredients: [],
            excludeIngredients: [],
            cookingTime: 30,
            servings: 2,
        }
    });

    const ingredients = watch("ingredients") || [];
    const excludeIngredients = watch("excludeIngredients") || [];

    const addIngredient = () => {
        if (ingredient.trim() && !ingredients.includes(ingredient.trim())) {
            setValue("ingredients", [...ingredients, ingredient.trim()]);
            setIngredient("");
        }
    };

    const removeIngredient = (index: number) => {
        setValue("ingredients", ingredients.filter((_, i) => i !== index));
    };

    const addExcludeIngredient = () => {
        if (excludeIngredient.trim() && !excludeIngredients.includes(excludeIngredient.trim())) {
            setValue("excludeIngredients", [...excludeIngredients, excludeIngredient.trim()]);
            setExcludeIngredient("");
        }
    };

    const removeExcludeIngredient = (index: number) => {
        setValue("excludeIngredients", excludeIngredients.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: RecipeGenerationFormValues) => {
        setIsLoading(true);
        setError(null);

        try {
            // This will be replaced with the actual API call
            console.log("Generating recipe with:", data);

            // Mock delay for demo
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Redirect to a success page or results page
            router.push("/recipes/results");
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                "Failed to generate recipe. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />

            <main className="flex-1 py-8">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-foreground">Generate Recipe</h1>
                        <p className="mt-2 text-lg text-muted-foreground">
                            Customize your preferences to generate the perfect recipe.
                        </p>
                    </div>

                    {error && (
                        <div className="mt-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mt-8 rounded-lg border bg-card p-6 shadow-sm"
                    >
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                            {/* Ingredients Section */}
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Ingredients</h3>
                                <p className="text-sm text-muted-foreground">
                                    What ingredients do you have or want to use?
                                </p>

                                <div className="mt-4 flex">
                                    <input
                                        type="text"
                                        value={ingredient}
                                        onChange={(e) => setIngredient(e.target.value)}
                                        placeholder="Add an ingredient..."
                                        className="flex-1 rounded-l-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                    <Button
                                        type="button"
                                        onClick={addIngredient}
                                        className="rounded-l-none"
                                    >
                                        Add
                                    </Button>
                                </div>

                                {errors.ingredients && (
                                    <p className="mt-1 text-xs text-destructive">{errors.ingredients.message}</p>
                                )}

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {ingredients.map((ing, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                                        >
                                            {ing}
                                            <button
                                                type="button"
                                                onClick={() => removeIngredient(index)}
                                                className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Exclude Ingredients */}
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Exclude Ingredients</h3>
                                <p className="text-sm text-muted-foreground">
                                    Any ingredients you don't want in your recipe?
                                </p>

                                <div className="mt-4 flex">
                                    <input
                                        type="text"
                                        value={excludeIngredient}
                                        onChange={(e) => setExcludeIngredient(e.target.value)}
                                        placeholder="Add ingredient to exclude..."
                                        className="flex-1 rounded-l-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                    <Button
                                        type="button"
                                        onClick={addExcludeIngredient}
                                        className="rounded-l-none"
                                        variant="outline"
                                    >
                                        Add
                                    </Button>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {excludeIngredients.map((ing, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1 text-sm text-destructive"
                                        >
                                            {ing}
                                            <button
                                                type="button"
                                                onClick={() => removeExcludeIngredient(index)}
                                                className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Dietary Restrictions */}
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Dietary Restrictions</h3>
                                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {dietaryOptions.map((option) => (
                                        <label
                                            key={option}
                                            className="flex items-center space-x-2"
                                        >
                                            <input
                                                type="checkbox"
                                                value={option}
                                                {...register("dietaryRestrictions")}
                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm text-foreground">{option}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Cuisine Type */}
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Cuisine Type</h3>
                                <select
                                    {...register("cuisineType")}
                                    className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="">Any cuisine</option>
                                    {cuisineOptions.map((cuisine) => (
                                        <option key={cuisine} value={cuisine}>{cuisine}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Meal Type */}
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Meal Type</h3>
                                <select
                                    {...register("mealType")}
                                    className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="">Any meal type</option>
                                    {mealTypeOptions.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Cooking Time & Difficulty */}
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div>
                                    <h3 className="text-lg font-medium text-foreground">Cooking Time (minutes)</h3>
                                    <input
                                        type="number"
                                        {...register("cookingTime", { valueAsNumber: true })}
                                        min="5"
                                        max="180"
                                        className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    />
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium text-foreground">Difficulty</h3>
                                    <select
                                        {...register("difficulty")}
                                        className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <option value="">Any difficulty</option>
                                        {difficultyOptions.map((diff) => (
                                            <option key={diff} value={diff}>{diff}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Servings */}
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Servings</h3>
                                <input
                                    type="number"
                                    {...register("servings", { valueAsNumber: true })}
                                    min="1"
                                    max="12"
                                    className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full sm:w-auto"
                                >
                                    {isLoading ? "Generating..." : "Generate Recipe"}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </main>
        </div>
    );
} 