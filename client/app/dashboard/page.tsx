"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Mock data for initial development
const mockRecipes = [
    {
        id: 1,
        title: "Spicy Thai Basil Chicken",
        description: "A quick and flavorful dish that comes together in minutes.",
        cookingTime: 25,
        ingredients: ["chicken", "basil", "garlic", "chili", "fish sauce", "soy sauce"],
        createdAt: new Date().toISOString()
    },
    {
        id: 2,
        title: "Mediterranean Chickpea Salad",
        description: "Fresh, healthy, and perfect for meal prep.",
        cookingTime: 15,
        ingredients: ["chickpeas", "cucumber", "tomato", "feta", "olives", "olive oil"],
        createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 3,
        title: "Creamy Mushroom Pasta",
        description: "Comfort food at its finest with a garlic cream sauce.",
        cookingTime: 30,
        ingredients: ["pasta", "mushrooms", "heavy cream", "garlic", "parmesan", "thyme"],
        createdAt: new Date(Date.now() - 172800000).toISOString()
    }
];

export default function DashboardPage() {
    const [recipes, setRecipes] = useState(mockRecipes);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch recipes from API (when ready)
    // useEffect(() => {
    //   const fetchRecipes = async () => {
    //     setIsLoading(true);
    //     try {
    //       const response = await fetch('/api/recipes');
    //       const data = await response.json();
    //       setRecipes(data);
    //     } catch (error) {
    //       console.error("Failed to fetch recipes:", error);
    //     } finally {
    //       setIsLoading(false);
    //     }
    //   };
    //
    //   fetchRecipes();
    // }, []);

    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />

            <main className="flex-1 py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                        <Link href="/recipes/generate">
                            <Button>Generate New Recipe</Button>
                        </Link>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {isLoading ? (
                            <p className="col-span-full text-center text-muted-foreground">Loading recipes...</p>
                        ) : recipes.length > 0 ? (
                            recipes.map((recipe) => (
                                <div
                                    key={recipe.id}
                                    className="rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md"
                                >
                                    <h3 className="mb-2 text-xl font-semibold text-foreground">{recipe.title}</h3>
                                    <p className="mb-4 text-sm text-muted-foreground">{recipe.description}</p>

                                    <div className="mb-4 flex items-center text-sm text-muted-foreground">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        {recipe.cookingTime} mins
                                    </div>

                                    <div className="mb-4">
                                        <h4 className="mb-2 text-sm font-medium text-foreground">Ingredients:</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {recipe.ingredients.map((ingredient, idx) => (
                                                <span
                                                    key={idx}
                                                    className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
                                                >
                                                    {ingredient}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-auto flex justify-end">
                                        <Link href={`/recipes/${recipe.id}`}>
                                            <Button variant="outline" size="sm">View Recipe</Button>
                                        </Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full rounded-lg border border-dashed border-border p-12 text-center">
                                <h3 className="text-xl font-medium text-foreground">No recipes yet</h3>
                                <p className="mt-2 text-muted-foreground">
                                    Get started by generating your first recipe based on your preferences.
                                </p>
                                <div className="mt-6">
                                    <Link href="/recipes/generate">
                                        <Button>Generate Recipe</Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
} 