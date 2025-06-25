'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMobileCapabilities } from '@/lib/utils/responsive';
import { MobileLayout } from './MobileLayout';

interface MobileLayoutWrapperProps {
    children: React.ReactNode;
}

export function MobileLayoutWrapper({ children }: MobileLayoutWrapperProps) {
    const [mounted, setMounted] = useState(false);
    const { isMobile, isTablet } = useMobileCapabilities();
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
    const excludedRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password'];
    const shouldUseMobileLayout = (isMobile || isTablet) && !excludedRoutes.includes(pathname);

    // Routes that should not show navigation
    const noNavigationRoutes = ['/auth/', '/onboarding/', '/error'];
    const shouldShowNavigation = !noNavigationRoutes.some(route => pathname.startsWith(route));

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

    // Desktop layout - simple wrapper
    return (
        <div className="min-h-screen bg-background">
            {children}
        </div>
    );
}

export default MobileLayoutWrapper; 