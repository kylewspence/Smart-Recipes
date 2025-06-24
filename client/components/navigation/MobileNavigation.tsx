'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HomeIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    UserIcon,
    Bars3Icon,
    XMarkIcon,
    HeartIcon,
    ClockIcon,
    CogIcon
} from '@heroicons/react/24/outline';
import {
    HomeIcon as HomeIconSolid,
    MagnifyingGlassIcon as MagnifyingGlassIconSolid,
    PlusIcon as PlusIconSolid,
    UserIcon as UserIconSolid,
    HeartIcon as HeartIconSolid,
    ClockIcon as ClockIconSolid
} from '@heroicons/react/24/solid';
import { cn, touchOptimized, mobileA11y, triggerHaptic, useMobileCapabilities } from '@/lib/utils/responsive';
import { useAuth } from '@/lib/contexts/AuthContext';

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    iconSolid: React.ComponentType<{ className?: string }>;
    requiresAuth?: boolean;
}

const navItems: NavItem[] = [
    {
        href: '/',
        label: 'Home',
        icon: HomeIcon,
        iconSolid: HomeIconSolid,
    },
    {
        href: '/search',
        label: 'Search',
        icon: MagnifyingGlassIcon,
        iconSolid: MagnifyingGlassIconSolid,
    },
    {
        href: '/recipe-generator',
        label: 'Generate',
        icon: PlusIcon,
        iconSolid: PlusIconSolid,
        requiresAuth: true,
    },
    {
        href: '/favorites',
        label: 'Favorites',
        icon: HeartIcon,
        iconSolid: HeartIconSolid,
        requiresAuth: true,
    },
    {
        href: '/dashboard',
        label: 'Profile',
        icon: UserIcon,
        iconSolid: UserIconSolid,
        requiresAuth: true,
    },
];

const menuItems = [
    { href: '/preferences', label: 'Preferences', icon: CogIcon },
    { href: '/cooking-timer', label: 'Timer', icon: ClockIcon },
    { href: '/meal-planner', label: 'Meal Planner', icon: ClockIcon },
];

export function MobileNavigation() {
    const pathname = usePathname();
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { hasTouch, supportsHaptics } = useMobileCapabilities();

    // Close menu on route change
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    // Handle haptic feedback
    const handleTap = (type: 'light' | 'medium' | 'selection' = 'light') => {
        if (supportsHaptics) {
            triggerHaptic(type);
        }
    };

    const filteredNavItems = navItems.filter(item =>
        !item.requiresAuth || (item.requiresAuth && user)
    );

    return (
        <>
            {/* Bottom Navigation Bar */}
            <nav className={cn(
                touchOptimized.navigation.bottomBar,
                'border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'
            )}>
                <div className="grid grid-cols-5 h-16">
                    {filteredNavItems.slice(0, 4).map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = isActive ? item.iconSolid : item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    touchOptimized.target.medium,
                                    mobileA11y.focus.visible,
                                    'flex flex-col items-center justify-center space-y-1 transition-colors duration-200',
                                    isActive
                                        ? 'text-primary'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                onTouchStart={() => handleTap('selection')}
                                aria-label={item.label}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="text-xs font-medium">{item.label}</span>
                            </Link>
                        );
                    })}

                    {/* Menu Button */}
                    <button
                        className={cn(
                            touchOptimized.target.medium,
                            mobileA11y.focus.visible,
                            'flex flex-col items-center justify-center space-y-1 text-muted-foreground hover:text-foreground transition-colors duration-200'
                        )}
                        onClick={() => {
                            handleTap('medium');
                            setIsMenuOpen(true);
                        }}
                        aria-label="Open menu"
                    >
                        <Bars3Icon className="h-5 w-5" />
                        <span className="text-xs font-medium">Menu</span>
                    </button>
                </div>
            </nav>

            {/* Slide-out Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/50 z-40"
                            onClick={() => setIsMenuOpen(false)}
                        />

                        {/* Menu Panel */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={cn(
                                'fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-background border-l shadow-xl',
                                touchOptimized.scroll.momentum
                            )}
                        >
                            {/* Menu Header */}
                            <div className="flex items-center justify-between p-4 border-b">
                                <h2 className="text-lg font-semibold">Menu</h2>
                                <button
                                    className={cn(
                                        touchOptimized.button.icon,
                                        mobileA11y.focus.visible,
                                        'rounded-full hover:bg-muted'
                                    )}
                                    onClick={() => {
                                        handleTap('light');
                                        setIsMenuOpen(false);
                                    }}
                                    aria-label="Close menu"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Menu Content */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {/* User Section */}
                                {user && (
                                    <div className="mb-6 p-4 rounded-lg bg-muted/50">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <UserIcon className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{user.name || 'User'}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Navigation Items */}
                                <div className="space-y-2 mb-6">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                                        Navigation
                                    </h3>
                                    {filteredNavItems.map((item) => {
                                        const isActive = pathname === item.href;
                                        const Icon = item.icon;

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    touchOptimized.target.medium,
                                                    mobileA11y.focus.visible,
                                                    'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200',
                                                    isActive
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'hover:bg-muted text-foreground'
                                                )}
                                                onTouchStart={() => handleTap('selection')}
                                            >
                                                <Icon className="h-5 w-5" />
                                                <span className="font-medium">{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>

                                {/* Additional Menu Items */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                                        Tools
                                    </h3>
                                    {menuItems.map((item) => {
                                        const isActive = pathname === item.href;
                                        const Icon = item.icon;

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    touchOptimized.target.medium,
                                                    mobileA11y.focus.visible,
                                                    'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200',
                                                    isActive
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'hover:bg-muted text-foreground'
                                                )}
                                                onTouchStart={() => handleTap('selection')}
                                            >
                                                <Icon className="h-5 w-5" />
                                                <span className="font-medium">{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

export default MobileNavigation; 