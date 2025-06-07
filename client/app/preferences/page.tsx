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
const preferencesSchema = z.object({
    dietaryRestrictions: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    dislikedIngredients: z.array(z.string()).optional(),
    favoriteIngredients: z.array(z.string()).optional(),
    favoritesCuisines: z.array(z.string()).optional(),
    cookingSkillLevel: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
    cookingTimePreference: z.number().min(5).max(120).optional(),
    caloriesPerMeal: z.number().min(100).max(2000).optional(),
    mealPlanningFrequency: z.enum(["Daily", "Weekly", "Monthly"]).optional(),
});

type PreferencesFormValues = z.infer<typeof preferencesSchema>;

// Predefined options
const dietaryOptions = [
    "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free",
    "Keto", "Paleo", "Low-Carb", "Low-Fat", "Nut-Free"
];

const cuisineOptions = [
    "Italian", "Mexican", "Chinese", "Japanese", "Indian",
    "Thai", "Mediterranean", "American", "French", "Middle Eastern"
];

const commonAllergies = [
    "Peanuts", "Tree Nuts", "Milk", "Eggs", "Fish",
    "Shellfish", "Soy", "Wheat", "Sesame"
];

// Mock data for initial values
const mockPreferences = {
    dietaryRestrictions: ["Gluten-Free"],
    allergies: ["Peanuts"],
    dislikedIngredients: ["Olives", "Blue Cheese"],
    favoriteIngredients: ["Chicken", "Avocado", "Garlic"],
    favoritesCuisines: ["Italian", "Thai"],
    cookingSkillLevel: "Intermediate" as "Beginner" | "Intermediate" | "Advanced",
    cookingTimePreference: 45,
    caloriesPerMeal: 650,
    mealPlanningFrequency: "Weekly" as "Daily" | "Weekly" | "Monthly",
};

export default function PreferencesPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newIngredient, setNewIngredient] = useState("");
    const [dislikedIngredient, setDislikedIngredient] = useState("");
    const [favoriteIngredient, setFavoriteIngredient] = useState("");
    const [success, setSuccess] = useState(false);

    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PreferencesFormValues>({
        resolver: zodResolver(preferencesSchema),
        defaultValues: mockPreferences
    });

    const dislikedIngredients = watch("dislikedIngredients") || [];
    const favoriteIngredients = watch("favoriteIngredients") || [];

    const addDislikedIngredient = () => {
        if (dislikedIngredient.trim() && !dislikedIngredients.includes(dislikedIngredient.trim())) {
            setValue("dislikedIngredients", [...dislikedIngredients, dislikedIngredient.trim()]);
            setDislikedIngredient("");
        }
    };

    const removeDislikedIngredient = (index: number) => {
        setValue("dislikedIngredients", dislikedIngredients.filter((_, i) => i !== index));
    };

    const addFavoriteIngredient = () => {
        if (favoriteIngredient.trim() && !favoriteIngredients.includes(favoriteIngredient.trim())) {
            setValue("favoriteIngredients", [...favoriteIngredients, favoriteIngredient.trim()]);
            setFavoriteIngredient("");
        }
    };

    const removeFavoriteIngredient = (index: number) => {
        setValue("favoriteIngredients", favoriteIngredients.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: PreferencesFormValues) => {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // This will be replaced with the actual API call
            console.log("Saving preferences:", data);

            // Mock delay for demo
            await new Promise(resolve => setTimeout(resolve, 1500));

            setSuccess(true);
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                "Failed to save preferences. Please try again."
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
                        <h1 className="text-3xl font-bold text-foreground">Your Preferences</h1>
                        <p className="mt-2 text-lg text-muted-foreground">
                            Customize your preferences to get better recipe suggestions.
                        </p>
                    </div>

                    {error && (
                        <div className="mt-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mt-6 rounded-md bg-primary/10 p-3 text-sm text-primary">
                            Your preferences have been saved successfully!
                        </div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mt-8 rounded-lg border bg-card p-6 shadow-sm"
                    >
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                            {/* Dietary Restrictions */}
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Dietary Restrictions</h3>
                                <p className="text-sm text-muted-foreground">
                                    Select any dietary restrictions you have.
                                </p>
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

                            {/* Allergies */}
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Allergies</h3>
                                <p className="text-sm text-muted-foreground">
                                    Select any food allergies you have.
                                </p>
                                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {commonAllergies.map((allergy) => (
                                        <label
                                            key={allergy}
                                            className="flex items-center space-x-2"
                                        >
                                            <input
                                                type="checkbox"
                                                value={allergy}
                                                {...register("allergies")}
                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm text-foreground">{allergy}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Disliked Ingredients */}
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Disliked Ingredients</h3>
                                <p className="text-sm text-muted-foreground">
                                    Add ingredients you don't like or want to avoid.
                                </p>

                                <div className="mt-4 flex">
                                    <input
                                        type="text"
                                        value={dislikedIngredient}
                                        onChange={(e) => setDislikedIngredient(e.target.value)}
                                        placeholder="Add an ingredient you dislike..."
                                        className="flex-1 rounded-l-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                    <Button
                                        type="button"
                                        onClick={addDislikedIngredient}
                                        className="rounded-l-none"
                                        variant="outline"
                                    >
                                        Add
                                    </Button>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {dislikedIngredients.map((ing, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1 text-sm text-destructive"
                                        >
                                            {ing}
                                            <button
                                                type="button"
                                                onClick={() => removeDislikedIngredient(index)}
                                                className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Favorite Ingredients */}
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Favorite Ingredients</h3>
                                <p className="text-sm text-muted-foreground">
                                    Add ingredients you love and want to see more often.
                                </p>

                                <div className="mt-4 flex">
                                    <input
                                        type="text"
                                        value={favoriteIngredient}
                                        onChange={(e) => setFavoriteIngredient(e.target.value)}
                                        placeholder="Add a favorite ingredient..."
                                        className="flex-1 rounded-l-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                    <Button
                                        type="button"
                                        onClick={addFavoriteIngredient}
                                        className="rounded-l-none"
                                    >
                                        Add
                                    </Button>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {favoriteIngredients.map((ing, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                                        >
                                            {ing}
                                            <button
                                                type="button"
                                                onClick={() => removeFavoriteIngredient(index)}
                                                className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Favorite Cuisines */}
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Favorite Cuisines</h3>
                                <p className="text-sm text-muted-foreground">
                                    Select cuisines you prefer.
                                </p>
                                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {cuisineOptions.map((cuisine) => (
                                        <label
                                            key={cuisine}
                                            className="flex items-center space-x-2"
                                        >
                                            <input
                                                type="checkbox"
                                                value={cuisine}
                                                {...register("favoritesCuisines")}
                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm text-foreground">{cuisine}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Cooking Skill Level */}
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Cooking Skill Level</h3>
                                <p className="text-sm text-muted-foreground">
                                    How would you rate your cooking skills?
                                </p>
                                <div className="mt-3 space-y-2">
                                    {["Beginner", "Intermediate", "Advanced"].map((level) => (
                                        <label
                                            key={level}
                                            className="flex items-center space-x-2"
                                        >
                                            <input
                                                type="radio"
                                                value={level}
                                                {...register("cookingSkillLevel")}
                                                className="h-4 w-4 border-border text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm text-foreground">{level}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Cooking Time Preference */}
                            <div>
                                <h3 className="text-lg font-medium text-foreground">
                                    Cooking Time Preference (minutes)
                                </h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    How much time do you typically want to spend cooking?
                                </p>
                                <input
                                    type="range"
                                    min="5"
                                    max="120"
                                    step="5"
                                    {...register("cookingTimePreference", { valueAsNumber: true })}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>5 min</span>
                                    <span>{watch("cookingTimePreference")} min</span>
                                    <span>120 min</span>
                                </div>
                            </div>

                            {/* Calories Per Meal */}
                            <div>
                                <h3 className="text-lg font-medium text-foreground">
                                    Calories Per Meal
                                </h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Preferred calorie range per meal.
                                </p>
                                <input
                                    type="range"
                                    min="100"
                                    max="2000"
                                    step="50"
                                    {...register("caloriesPerMeal", { valueAsNumber: true })}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>100 kcal</span>
                                    <span>{watch("caloriesPerMeal")} kcal</span>
                                    <span>2000 kcal</span>
                                </div>
                            </div>

                            {/* Meal Planning Frequency */}
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Meal Planning Frequency</h3>
                                <p className="text-sm text-muted-foreground">
                                    How often do you plan your meals?
                                </p>
                                <div className="mt-3 space-y-2">
                                    {["Daily", "Weekly", "Monthly"].map((frequency) => (
                                        <label
                                            key={frequency}
                                            className="flex items-center space-x-2"
                                        >
                                            <input
                                                type="radio"
                                                value={frequency}
                                                {...register("mealPlanningFrequency")}
                                                className="h-4 w-4 border-border text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm text-foreground">{frequency}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full sm:w-auto"
                                >
                                    {isLoading ? "Saving..." : "Save Preferences"}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </main>
        </div>
    );
} 