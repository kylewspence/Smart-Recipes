'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMobileCapabilities } from '@/lib/utils/responsive';
import { useAuth } from '@/lib/contexts/AuthContext';
import { MobileLayout } from './MobileLayout';
import { AuthenticatedNav } from './AuthenticatedNav';

interface MobileLayoutWrapperProps {
    children: React.ReactNode;
}

export function MobileLayoutWrapper({ children }: MobileLayoutWrapperProps) {
    const [mounted, setMounted] = useState(false);
    const { isMobile, isTablet } = useMobileCapabilities();
    const { isAuthenticated, isLoading } = useAuth();
    const pathname = usePathname();

    // Ensure component is mounted before checking device capabilities
    useEffect(() => {
        setMounted(true);
    }, []);

    // Don't render until mounted to avoid hydration issues
    if (!mounted) {
        return <div className="min-h-screen bg-background">{children}</div>;
    }

    // Routes that should not use mobile layout
    const excludedRoutes = ['/login', '/register', '/auth/login', '/auth/register', '/auth/forgot-password'];
    const shouldUseMobileLayout = (isMobile || isTablet) && !excludedRoutes.includes(pathname);

    // Routes that should not show navigation
    const noNavigationRoutes = ['/login', '/register', '/auth/', '/onboarding/', '/error', '/'];
    const shouldShowNavigation = !noNavigationRoutes.some(route => pathname.startsWith(route)) && isAuthenticated;

    // Routes that should not show top bar
    const noTopBarRoutes = ['/'];
    const shouldShowTopBar = !noTopBarRoutes.includes(pathname);

    if (shouldUseMobileLayout) {
        return (
            <MobileLayout
                showNavigation={shouldShowNavigation}
                showTopBar={shouldShowTopBar}
            >
                {children}
            </MobileLayout>
        );
    }

    // Desktop layout with navigation for authenticated users
    return (
        <div className="min-h-screen bg-background">
            {shouldShowNavigation && <AuthenticatedNav />}
            {children}
        </div>
    );
}

export default MobileLayoutWrapper; 