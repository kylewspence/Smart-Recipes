import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";

export default function Home() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative bg-background py-24 sm:py-32">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl text-center">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                                AI-Powered Recipes for Your Preferences
                            </h1>
                            <p className="mt-6 text-lg leading-8 text-muted-foreground">
                                Get personalized recipe suggestions based on your dietary needs, preferences, and available ingredients.
                            </p>
                            <div className="mt-10 flex items-center justify-center gap-x-6">
                                <Link href="/register">
                                    <Button size="lg">Get Started</Button>
                                </Link>
                                <Link href="/about">
                                    <Button variant="outline" size="lg">
                                        Learn more
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="bg-muted/50 py-24">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl lg:text-center">
                            <h2 className="text-base font-semibold leading-7 text-primary">Smart Cooking</h2>
                            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                                Everything you need for perfect meals
                            </p>
                            <p className="mt-6 text-lg leading-8 text-muted-foreground">
                                Our AI-powered recipe engine learns your preferences, dietary restrictions, and favorite ingredients to create perfect meal suggestions every time.
                            </p>
                        </div>
                        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                                <div className="flex flex-col">
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
                                <div className="flex flex-col">
                                    <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 flex-none text-primary">
                                            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                                            <path d="M9 18h6" />
                                            <path d="M10 22h4" />
                                        </svg>
                                        Smart Suggestions
                                    </dt>
                                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                                        <p className="flex-auto">
                                            Our AI learns what you like and adapts to your taste preferences over time.
                                        </p>
                                    </dd>
                                </div>
                                <div className="flex flex-col">
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
                            </dl>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t bg-background py-10">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <p className="text-center text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} Smart Recipes. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}