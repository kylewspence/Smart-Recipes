"use client";

import Link from "next/link";
import { UserCircle, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isLoggedIn = false; // This will come from your auth context

    return (
        <nav className="border-b bg-background">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex items-center">
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="text-xl font-bold text-primary">
                            Smart<span className="text-foreground">Recipes</span>
                        </span>
                    </Link>
                </div>

                {/* Desktop navigation */}
                <div className="hidden md:flex md:items-center md:space-x-8">
                    <Link
                        href="/recipes"
                        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Recipes
                    </Link>
                    <Link
                        href="/preferences"
                        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Preferences
                    </Link>

                    <ThemeToggle />

                    {isLoggedIn ? (
                        <Link href="/dashboard">
                            <Button variant="ghost" size="icon">
                                <UserCircle className="h-5 w-5" />
                            </Button>
                        </Link>
                    ) : (
                        <div className="flex items-center space-x-4">
                            <Link href="/login">
                                <Button variant="ghost">Log in</Button>
                            </Link>
                            <Link href="/register">
                                <Button>Sign up</Button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile menu button */}
                <div className="flex md:hidden">
                    <ThemeToggle />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="ml-2"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Mobile navigation */}
            <div
                className={cn(
                    "md:hidden",
                    isMenuOpen ? "block" : "hidden"
                )}
            >
                <div className="space-y-1 px-4 pb-3 pt-2">
                    <Link
                        href="/recipes"
                        className="block py-2 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Recipes
                    </Link>
                    <Link
                        href="/preferences"
                        className="block py-2 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Preferences
                    </Link>
                    {isLoggedIn ? (
                        <Link
                            href="/dashboard"
                            className="block py-2 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="block py-2 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Log in
                            </Link>
                            <Link
                                href="/register"
                                className="block py-2 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Sign up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
} 