'use client';

import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { MagicCard, ShimmerButton, BlurFade, SimpleAnimatedList } from "@/components/magicui";
import EnhancedSearchBar from "@/components/search/EnhancedSearchBar";
import { RecommendationsSection } from "@/components/recommendations";
import { responsive } from "@/lib/utils/responsive";
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter();

    const handleSearch = (query: string, filters?: any) => {
        if (query.trim()) {
            const params = new URLSearchParams();
            params.set('q', query);
            if (filters) {
                // Add filter parameters to URL
                Object.entries(filters).forEach(([key, value]) => {
                    if (value && (Array.isArray(value) ? value.length > 0 : true)) {
                        params.set(key, Array.isArray(value) ? value.join(',') : String(value));
                    }
                });
            }
            router.push(`/search?${params.toString()}`);
        }
    };

    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative bg-background py-24 sm:py-32">
                    <div className={responsive.container.section}>
                        <div className="mx-auto max-w-2xl text-center">
                            <BlurFade delay={0.2}>
                                <h1 className={responsive.text.h1}>
                                    AI-Powered Recipes for Your Preferences
                                </h1>
                            </BlurFade>
                            <BlurFade delay={0.4}>
                                <p className="mt-6 text-lg leading-8 text-muted-foreground">
                                    Get personalized recipe suggestions based on your dietary needs, preferences, and available ingredients.
                                </p>
                            </BlurFade>

                            {/* Enhanced Search Bar */}
                            <BlurFade delay={0.5}>
                                <div className="mt-8 max-w-2xl mx-auto">
                                    <EnhancedSearchBar
                                        onSearch={handleSearch}
                                        placeholder="Search for recipes, ingredients, or cuisines..."
                                        className="w-full"
                                        showFilters={true}
                                        showTrending={true}
                                        autoFocus={false}
                                    />
                                </div>
                            </BlurFade>

                            <BlurFade delay={0.6}>
                                <div className="mt-10 flex items-center justify-center gap-x-6">
                                    <Link href="/register">
                                        <ShimmerButton
                                            className="px-8 py-3 text-lg"
                                            background="linear-gradient(45deg, #f97316, #ea580c)"
                                        >
                                            Get Started
                                        </ShimmerButton>
                                    </Link>
                                    <Link href="/search">
                                        <Button variant="outline" size="lg">
                                            Browse Recipes
                                        </Button>
                                    </Link>
                                </div>
                            </BlurFade>
                        </div>
                    </div>
                </section>

                {/* Recommendations Section */}
                <section className="bg-background py-16">
                    <div className={responsive.container.section}>
                        <RecommendationsSection
                            showQuick={true}
                            showTrending={true}
                            showSeasonal={true}
                            showPersonalized={false}
                            limit={6}
                            className="max-w-7xl mx-auto"
                        />
                    </div>
                </section>

                {/* Quick Actions Section */}
                <section className="bg-gradient-to-b from-background to-muted/30 py-16">
                    <div className={responsive.container.section}>
                        <BlurFade delay={0.3}>
                            <div className="text-center mb-12">
                                <h2 className={responsive.text.h2}>
                                    What would you like to cook today?
                                </h2>
                                <p className="mt-4 text-lg text-muted-foreground">
                                    Quick access to popular recipe categories and features
                                </p>
                            </div>
                        </BlurFade>

                        <div className={responsive.grid.features}>
                            <BlurFade delay={0.4}>
                                <MagicCard className="p-6 text-center cursor-pointer hover:scale-105 transition-transform" gradientColor="#ef4444" gradientOpacity={0.1}>
                                    <div className="text-4xl mb-4">🍝</div>
                                    <h3 className="text-lg font-semibold mb-2">Quick & Easy</h3>
                                    <p className="text-sm text-muted-foreground">Ready in 30 minutes or less</p>
                                </MagicCard>
                            </BlurFade>

                            <BlurFade delay={0.5}>
                                <MagicCard className="p-6 text-center cursor-pointer hover:scale-105 transition-transform" gradientColor="#10b981" gradientOpacity={0.1}>
                                    <div className="text-4xl mb-4">🥗</div>
                                    <h3 className="text-lg font-semibold mb-2">Healthy Options</h3>
                                    <p className="text-sm text-muted-foreground">Nutritious and delicious meals</p>
                                </MagicCard>
                            </BlurFade>

                            <BlurFade delay={0.6}>
                                <MagicCard className="p-6 text-center cursor-pointer hover:scale-105 transition-transform" gradientColor="#8b5cf6" gradientOpacity={0.1}>
                                    <div className="text-4xl mb-4">🍰</div>
                                    <h3 className="text-lg font-semibold mb-2">Desserts</h3>
                                    <p className="text-sm text-muted-foreground">Sweet treats and baked goods</p>
                                </MagicCard>
                            </BlurFade>

                            <BlurFade delay={0.7}>
                                <MagicCard className="p-6 text-center cursor-pointer hover:scale-105 transition-transform" gradientColor="#f59e0b" gradientOpacity={0.1}>
                                    <div className="text-4xl mb-4">🌶️</div>
                                    <h3 className="text-lg font-semibold mb-2">Spicy Food</h3>
                                    <p className="text-sm text-muted-foreground">Heat up your taste buds</p>
                                </MagicCard>
                            </BlurFade>

                            <BlurFade delay={0.8}>
                                <MagicCard className="p-6 text-center cursor-pointer hover:scale-105 transition-transform" gradientColor="#3b82f6" gradientOpacity={0.1}>
                                    <div className="text-4xl mb-4">🍲</div>
                                    <h3 className="text-lg font-semibold mb-2">Comfort Food</h3>
                                    <p className="text-sm text-muted-foreground">Hearty and satisfying dishes</p>
                                </MagicCard>
                            </BlurFade>

                            <BlurFade delay={0.9}>
                                <MagicCard className="p-6 text-center cursor-pointer hover:scale-105 transition-transform" gradientColor="#06b6d4" gradientOpacity={0.1}>
                                    <div className="text-4xl mb-4">🌍</div>
                                    <h3 className="text-lg font-semibold mb-2">World Cuisine</h3>
                                    <p className="text-sm text-muted-foreground">Explore global flavors</p>
                                </MagicCard>
                            </BlurFade>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="bg-muted/50 py-24">
                    <div className={responsive.container.section}>
                        <div className="mx-auto max-w-2xl lg:text-center">
                            <BlurFade delay={0.2}>
                                <h2 className="text-base font-semibold leading-7 text-primary">Smart Cooking</h2>
                                <p className={responsive.text.h2}>
                                    Everything you need for perfect meals
                                </p>
                                <p className="mt-6 text-lg leading-8 text-muted-foreground">
                                    Our AI-powered recipe engine learns your preferences, dietary restrictions, and favorite ingredients to create perfect meal suggestions every time.
                                </p>
                            </BlurFade>
                        </div>
                        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                            <SimpleAnimatedList className={responsive.grid.features}>
                                <MagicCard className="p-6" gradientColor="#f97316" gradientOpacity={0.1}>
                                    <div className="flex flex-col h-full">
                                        <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 flex-none text-primary">
                                                <path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z" />
                                            </svg>
                                            Personalized Recipes
                                        </dt>
                                        <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                                            <p className="flex-auto">
                                                Recipes tailored to your dietary needs, preferences, and ingredient availability.
                                            </p>
                                        </dd>
                                    </div>
                                </MagicCard>
                                <MagicCard className="p-6" gradientColor="#3b82f6" gradientOpacity={0.1}>
                                    <div className="flex flex-col h-full">
                                        <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 flex-none text-primary">
                                                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                                                <path d="M9 18h6" />
                                                <path d="M10 22h4" />
                                            </svg>
                                            Advanced Search
                                        </dt>
                                        <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                                            <p className="flex-auto">
                                                Find recipes with powerful search and filtering by cuisine, time, difficulty, and more.
                                            </p>
                                        </dd>
                                    </div>
                                </MagicCard>
                                <MagicCard className="p-6" gradientColor="#10b981" gradientOpacity={0.1}>
                                    <div className="flex flex-col h-full">
                                        <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 flex-none text-primary">
                                                <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l6.29-6.29c.94-.94.94-2.48 0-3.42L11.71 2.71c-.94-.94-2.48-.94-3.42 0L5 6" />
                                                <path d="M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                                            </svg>
                                            Dietary Flexibility
                                        </dt>
                                        <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                                            <p className="flex-auto">
                                                Whether you're vegan, gluten-free, or just picky, we've got recipes that work for you.
                                            </p>
                                        </dd>
                                    </div>
                                </MagicCard>
                            </SimpleAnimatedList>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t bg-background py-10">
                <div className={responsive.container.section}>
                    <p className="text-center text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} Smart Recipes. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}