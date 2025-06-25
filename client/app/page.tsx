'use client';

import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { MagicCard, ShimmerButton, BlurFade } from "@/components/magicui";
import { RecommendationsSection } from "@/components/recommendations";
import { responsive } from "@/lib/utils/responsive";
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter();

    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative bg-background py-24 sm:py-32">
                    <div className={responsive.container.section}>
                        <div className="mx-auto max-w-2xl text-center">
                            <BlurFade delay={0.2}>
                                <h1 className={`${responsive.text.h1} text-center`}>
                                    AI-Powered Recipes for Your Preferences
                                </h1>
                            </BlurFade>
                            <BlurFade delay={0.4}>
                                <p className="mt-6 text-lg leading-8 text-muted-foreground text-center">
                                    Get personalized recipe suggestions based on your dietary needs, preferences, and available ingredients. Our AI learns what you love and creates perfect meal suggestions just for you.
                                </p>
                            </BlurFade>

                            <BlurFade delay={0.6}>
                                <div className="mt-10 flex items-center justify-center gap-x-6">
                                    <Link href="/register">
                                        <ShimmerButton
                                            className="px-8 py-3 text-lg"
                                            background="linear-gradient(45deg, #f97316, #ea580c)"
                                        >
                                            Get Started Free
                                        </ShimmerButton>
                                    </Link>
                                    <Link href="/login">
                                        <Button variant="outline" size="lg">
                                            Sign In
                                        </Button>
                                    </Link>
                                </div>
                            </BlurFade>

                            <BlurFade delay={0.8}>
                                <p className="mt-6 text-sm text-muted-foreground">
                                    No credit card required • Free to start • Personalized for you
                                </p>
                            </BlurFade>
                        </div>
                    </div>
                </section>

                {/* Features Preview Section */}
                <section className="bg-gradient-to-b from-background to-muted/30 py-16">
                    <div className={responsive.container.section}>
                        <BlurFade delay={0.3}>
                            <div className="text-center mb-12">
                                <h2 className={responsive.text.h2}>
                                    What makes Smart Recipes special?
                                </h2>
                                <p className="mt-4 text-lg text-muted-foreground">
                                    Discover how our AI-powered platform creates the perfect cooking experience for you
                                </p>
                            </div>
                        </BlurFade>

                        <div className={responsive.grid.features}>
                            <BlurFade delay={0.4}>
                                <MagicCard className="p-6 text-center hover:scale-105 transition-transform" gradientColor="#ef4444" gradientOpacity={0.1}>
                                    <div className="text-4xl mb-4">🧠</div>
                                    <h3 className="text-lg font-semibold mb-2">AI-Powered Personalization</h3>
                                    <p className="text-sm text-muted-foreground">Our AI learns your taste preferences, dietary restrictions, and cooking style to suggest perfect recipes</p>
                                </MagicCard>
                            </BlurFade>

                            <BlurFade delay={0.5}>
                                <MagicCard className="p-6 text-center hover:scale-105 transition-transform" gradientColor="#10b981" gradientOpacity={0.1}>
                                    <div className="text-4xl mb-4">🥘</div>
                                    <h3 className="text-lg font-semibold mb-2">Ingredient-Based Recipes</h3>
                                    <p className="text-sm text-muted-foreground">Tell us what's in your fridge and we'll create amazing recipes with what you already have</p>
                                </MagicCard>
                            </BlurFade>

                            <BlurFade delay={0.6}>
                                <MagicCard className="p-6 text-center hover:scale-105 transition-transform" gradientColor="#8b5cf6" gradientOpacity={0.1}>
                                    <div className="text-4xl mb-4">⚡</div>
                                    <h3 className="text-lg font-semibold mb-2">Quick & Easy</h3>
                                    <p className="text-sm text-muted-foreground">From 15-minute meals to elaborate dinners - find recipes that fit your schedule</p>
                                </MagicCard>
                            </BlurFade>

                            <BlurFade delay={0.7}>
                                <MagicCard className="p-6 text-center hover:scale-105 transition-transform" gradientColor="#f59e0b" gradientOpacity={0.1}>
                                    <div className="text-4xl mb-4">🎯</div>
                                    <h3 className="text-lg font-semibold mb-2">Perfect for Picky Eaters</h3>
                                    <p className="text-sm text-muted-foreground">Designed specifically for people who know what they like - no more disappointing meals</p>
                                </MagicCard>
                            </BlurFade>

                            <BlurFade delay={0.8}>
                                <MagicCard className="p-6 text-center hover:scale-105 transition-transform" gradientColor="#3b82f6" gradientOpacity={0.1}>
                                    <div className="text-4xl mb-4">📱</div>
                                    <h3 className="text-lg font-semibold mb-2">Smart Organization</h3>
                                    <p className="text-sm text-muted-foreground">Save favorites, create meal plans, and track your cooking history all in one place</p>
                                </MagicCard>
                            </BlurFade>

                            <BlurFade delay={0.9}>
                                <MagicCard className="p-6 text-center hover:scale-105 transition-transform" gradientColor="#06b6d4" gradientOpacity={0.1}>
                                    <div className="text-4xl mb-4">🌟</div>
                                    <h3 className="text-lg font-semibold mb-2">Always Learning</h3>
                                    <p className="text-sm text-muted-foreground">Rate recipes and provide feedback - our AI gets better at understanding your tastes over time</p>
                                </MagicCard>
                            </BlurFade>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section className="bg-muted/50 py-24">
                    <div className={responsive.container.section}>
                        <div className="mx-auto max-w-2xl lg:text-center">
                            <BlurFade delay={0.2}>
                                <h2 className="text-base font-semibold leading-7 text-primary">How It Works</h2>
                                <p className={responsive.text.h2}>
                                    Get personalized recipes in 3 simple steps
                                </p>
                            </BlurFade>
                        </div>
                        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                            <div className={responsive.grid.features}>
                                <MagicCard className="p-6" gradientColor="#f97316" gradientOpacity={0.1}>
                                    <div className="flex flex-col h-full">
                                        <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white font-bold">
                                                1
                                            </div>
                                            Tell Us Your Preferences
                                        </dt>
                                        <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                                            <p className="flex-auto">
                                                Set up your profile with dietary restrictions, favorite cuisines, cooking skill level, and ingredients you love or want to avoid.
                                            </p>
                                        </dd>
                                    </div>
                                </MagicCard>
                                <MagicCard className="p-6" gradientColor="#3b82f6" gradientOpacity={0.1}>
                                    <div className="flex flex-col h-full">
                                        <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white font-bold">
                                                2
                                            </div>
                                            Get AI-Generated Recipes
                                        </dt>
                                        <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                                            <p className="flex-auto">
                                                Our AI creates personalized recipes based on your preferences, available ingredients, and desired cooking time.
                                            </p>
                                        </dd>
                                    </div>
                                </MagicCard>
                                <MagicCard className="p-6" gradientColor="#10b981" gradientOpacity={0.1}>
                                    <div className="flex flex-col h-full">
                                        <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white font-bold">
                                                3
                                            </div>
                                            Cook & Improve
                                        </dt>
                                        <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                                            <p className="flex-auto">
                                                Cook the recipe and rate it. Our AI learns from your feedback to make even better suggestions next time.
                                            </p>
                                        </dd>
                                    </div>
                                </MagicCard>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Call to Action Section */}
                <section className="bg-primary/5 py-16">
                    <div className={responsive.container.section}>
                        <div className="mx-auto max-w-2xl text-center">
                            <BlurFade delay={0.2}>
                                <h2 className={responsive.text.h2}>
                                    Ready to discover your perfect recipes?
                                </h2>
                                <p className="mt-6 text-lg leading-8 text-muted-foreground">
                                    Join thousands of home cooks who've already found their new favorite meals with Smart Recipes.
                                </p>
                            </BlurFade>
                            <BlurFade delay={0.4}>
                                <div className="mt-10 flex items-center justify-center gap-x-6">
                                    <Link href="/register">
                                        <ShimmerButton
                                            className="px-8 py-3 text-lg"
                                            background="linear-gradient(45deg, #f97316, #ea580c)"
                                        >
                                            Start Cooking Smarter
                                        </ShimmerButton>
                                    </Link>
                                </div>
                            </BlurFade>
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
    );
}