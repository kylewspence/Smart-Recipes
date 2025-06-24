'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cn, responsive, touchOptimized, mobileA11y } from '@/lib/utils/responsive';
import { useMobileOptimizations } from '@/lib/utils/performance';
import { MobileNavigation } from '@/components/navigation/MobileNavigation';
import { MobileTopBar } from '@/components/navigation/MobileTopBar';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';

interface MobileLayoutProps {
    children: React.ReactNode;
    showNavigation?: boolean;
    showTopBar?: boolean;
    title?: string;
    showBack?: boolean;
    backHref?: string;
    onBack?: () => void;
    topBarActions?: React.ReactNode;
    className?: string;
}

export function MobileLayout({
    children,
    showNavigation = true,
    showTopBar = true,
    title,
    showBack = false,
    backHref,
    onBack,
    topBarActions,
    className,
}: MobileLayoutProps) {
    const pathname = usePathname();
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const { isMobile } = useMobileOptimizations();

    // Detect virtual keyboard on mobile
    useEffect(() => {
        if (!isMobile) return;

        const handleResize = () => {
            // On mobile, when keyboard opens, viewport height decreases significantly
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            const screenHeight = window.screen.height;
            const threshold = screenHeight * 0.6; // 60% of screen height

            setIsKeyboardOpen(viewportHeight < threshold);
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            return () => window.visualViewport?.removeEventListener('resize', handleResize);
        } else {
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [isMobile]);

    // Generate page title based on pathname if not provided
    const getPageTitle = () => {
        if (title) return title;

        const titleMap: Record<string, string> = {
            '/': 'Smart Recipes',
            '/search': 'Search Recipes',
            '/recipe-generator': 'Generate Recipe',
            '/dashboard': 'Dashboard',
            '/profile': 'Profile',
            '/favorites': 'Favorites',
            '/cooking-timer': 'Cooking Timer',
            '/settings': 'Settings',
        };

        return titleMap[pathname] || 'Smart Recipes';
    };

    // Determine if we should show back button
    const shouldShowBack = showBack || (pathname !== '/' && !pathname.startsWith('/auth'));

    return (
        <div className={cn(
            'min-h-screen bg-background',
            'flex flex-col',
            touchOptimized.scroll.momentum,
            mobileA11y.motion.safe,
            className
        )}>
            {/* Top Bar */}
            {showTopBar && (
                <MobileTopBar
                    title={getPageTitle()}
                    showBack={shouldShowBack}
                    backHref={backHref}
                    onBack={onBack}
                    actions={topBarActions}
                    className={cn(
                        'sticky top-0 z-40',
                        'pt-safe-top',
                        // Hide on keyboard open for more space
                        isKeyboardOpen && 'hidden'
                    )}
                />
            )}

            {/* Main Content */}
            <main className={cn(
                'flex-1 relative',
                responsive.container.page,
                // Adjust padding when navigation is visible
                showNavigation && !isKeyboardOpen && 'pb-20',
                // Safe area padding
                'pb-safe-bottom'
            )}>
                <div className={cn(
                    'min-h-full',
                    // Ensure content is scrollable
                    touchOptimized.scroll.momentum
                )}>
                    {children}
                </div>
            </main>

            {/* Bottom Navigation */}
            {showNavigation && !isKeyboardOpen && (
                <MobileNavigation
                    className={cn(
                        'fixed bottom-0 left-0 right-0 z-40',
                        'pb-safe-bottom'
                    )}
                />
            )}

            {/* PWA Install Prompt */}
            <PWAInstallPrompt />

            {/* Performance monitoring in development */}
            {process.env.NODE_ENV === 'development' && (
                <PerformanceMonitor />
            )}
        </div>
    );
}

// Performance monitoring component for development
function PerformanceMonitor() {
    const [metrics, setMetrics] = useState<any>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const newMetrics: any = {};

            entries.forEach((entry) => {
                if (entry.entryType === 'paint') {
                    newMetrics[entry.name] = Math.round(entry.startTime);
                }
                if (entry.entryType === 'largest-contentful-paint') {
                    newMetrics.lcp = Math.round(entry.startTime);
                }
                if (entry.entryType === 'first-input') {
                    newMetrics.fid = Math.round((entry as any).processingStart - entry.startTime);
                }
            });

            if (Object.keys(newMetrics).length > 0) {
                setMetrics((prev: any) => ({ ...prev, ...newMetrics }));
            }
        });

        try {
            observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input'] });
        } catch (error) {
            console.warn('Performance observer not supported:', error);
        }

        return () => observer.disconnect();
    }, []);

    if (!metrics) return null;

    return (
        <div className="fixed top-2 right-2 z-50 bg-black/80 text-white text-xs p-2 rounded font-mono">
            <div>FCP: {metrics['first-contentful-paint'] || '?'}ms</div>
            <div>LCP: {metrics.lcp || '?'}ms</div>
            <div>FID: {metrics.fid || '?'}ms</div>
        </div>
    );
}

// Hook for mobile layout state
export function useMobileLayout() {
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const [safeAreaInsets, setSafeAreaInsets] = useState({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    });

    useEffect(() => {
        // Get safe area insets
        const computedStyle = getComputedStyle(document.documentElement);
        setSafeAreaInsets({
            top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
            right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0'),
            bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
            left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0'),
        });

        // Monitor keyboard state
        const handleResize = () => {
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            const screenHeight = window.screen.height;
            setIsKeyboardOpen(viewportHeight < screenHeight * 0.6);
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            return () => window.visualViewport?.removeEventListener('resize', handleResize);
        } else {
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    return {
        isKeyboardOpen,
        safeAreaInsets,
    };
}

export default MobileLayout; 