import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Consistent breakpoints for the application
export const breakpoints = {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
} as const;

// Responsive utility classes
export const responsive = {
    // Container classes for different content types
    container: {
        page: 'container mx-auto px-4 sm:px-6 lg:px-8',
        section: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
        content: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',
        narrow: 'max-w-2xl mx-auto px-4 sm:px-6 lg:px-8',
    },

    // Grid patterns
    grid: {
        responsive: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6',
        cards: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6',
        features: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8',
        dashboard: 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6',
    },

    // Flexbox patterns
    flex: {
        between: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
        center: 'flex flex-col sm:flex-row items-center justify-center gap-4',
        stack: 'flex flex-col space-y-4',
        inline: 'flex flex-wrap items-center gap-2',
    },

    // Typography responsive classes
    text: {
        h1: 'text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight',
        h2: 'text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight',
        h3: 'text-xl sm:text-2xl lg:text-3xl font-semibold',
        h4: 'text-lg sm:text-xl lg:text-2xl font-semibold',
        body: 'text-sm sm:text-base',
        small: 'text-xs sm:text-sm',
    },

    // Spacing patterns
    spacing: {
        section: 'py-8 sm:py-12 lg:py-16',
        component: 'p-4 sm:p-6 lg:p-8',
        tight: 'p-2 sm:p-3 lg:p-4',
    },

    // Button sizes
    button: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm sm:text-base',
        lg: 'px-6 py-3 text-base sm:text-lg',
        xl: 'px-8 py-4 text-lg sm:text-xl',
    },

    // Mobile-specific utilities
    mobile: {
        hidden: 'hidden sm:block',
        only: 'block sm:hidden',
        touch: 'touch-manipulation select-none',
        scroll: 'overflow-x-auto scrollbar-hide',
    },

    // Card responsive patterns
    card: {
        base: 'rounded-lg border bg-card text-card-foreground shadow-sm',
        responsive: 'p-4 sm:p-6 rounded-lg border bg-card text-card-foreground shadow-sm',
        compact: 'p-3 sm:p-4 rounded-md border bg-card text-card-foreground shadow-sm',
    },
} as const;

// Enhanced touch interaction utilities
export const touchOptimized = {
    // Touch target sizes (minimum 44px recommended by Apple/Google)
    target: {
        small: 'min-h-[44px] min-w-[44px] touch-manipulation',
        medium: 'min-h-[48px] min-w-[48px] touch-manipulation',
        large: 'min-h-[56px] min-w-[56px] touch-manipulation',
    },

    // Touch-friendly button styles
    button: {
        primary: 'min-h-[48px] px-6 py-3 touch-manipulation select-none active:scale-95 transition-transform duration-75',
        secondary: 'min-h-[44px] px-4 py-2 touch-manipulation select-none active:scale-95 transition-transform duration-75',
        icon: 'min-h-[44px] min-w-[44px] p-2 touch-manipulation select-none active:scale-90 transition-transform duration-75',
        floating: 'min-h-[56px] min-w-[56px] rounded-full touch-manipulation select-none active:scale-90 transition-transform duration-100 shadow-lg',
    },

    // Swipe and gesture areas
    swipe: {
        horizontal: 'touch-pan-x overscroll-x-contain',
        vertical: 'touch-pan-y overscroll-y-contain',
        none: 'touch-none',
        auto: 'touch-auto',
    },

    // Mobile navigation patterns
    navigation: {
        bottomBar: 'fixed bottom-0 left-0 right-0 z-50 bg-background border-t',
        topBar: 'sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b',
        sidebar: 'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out',
    },

    // Pull-to-refresh and scroll behaviors
    scroll: {
        momentum: 'overflow-scroll -webkit-overflow-scrolling-touch',
        snap: 'scroll-smooth snap-mandatory',
        snapX: 'scroll-smooth snap-mandatory snap-x',
        snapY: 'scroll-smooth snap-mandatory snap-y',
        pullToRefresh: 'overscroll-y-contain',
    },

    // Safe area support for notched devices
    safeArea: {
        top: 'pt-safe-top',
        bottom: 'pb-safe-bottom',
        left: 'pl-safe-left',
        right: 'pr-safe-right',
        all: 'pt-safe-top pb-safe-bottom pl-safe-left pr-safe-right',
    },

    // Haptic feedback classes (for use with JS)
    haptic: {
        light: 'haptic-light',
        medium: 'haptic-medium',
        heavy: 'haptic-heavy',
        selection: 'haptic-selection',
        impact: 'haptic-impact',
    },
} as const;

// Mobile-first form patterns
export const mobileForm = {
    // Input patterns optimized for mobile
    input: {
        base: 'w-full min-h-[48px] px-4 py-3 text-base rounded-lg border border-input bg-background touch-manipulation',
        search: 'w-full min-h-[44px] px-4 py-2 text-base rounded-full border border-input bg-background touch-manipulation',
        textarea: 'w-full min-h-[120px] px-4 py-3 text-base rounded-lg border border-input bg-background resize-none touch-manipulation',
    },

    // Mobile-optimized layouts
    layout: {
        stack: 'flex flex-col space-y-4',
        grid: 'grid grid-cols-1 gap-4',
        inline: 'flex flex-wrap gap-2',
        split: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
    },

    // Action button patterns
    actions: {
        primary: 'w-full min-h-[52px] rounded-lg font-medium touch-manipulation active:scale-[0.98] transition-transform',
        secondary: 'w-full min-h-[48px] rounded-lg font-medium touch-manipulation active:scale-[0.98] transition-transform',
        split: 'grid grid-cols-2 gap-3',
        stack: 'flex flex-col space-y-3',
    },
} as const;

// Accessibility enhancements for mobile
export const mobileA11y = {
    // Screen reader optimizations
    screenReader: {
        only: 'sr-only',
        focusable: 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 z-50 p-2 bg-background border rounded',
    },

    // Focus management for touch devices
    focus: {
        visible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        within: 'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        trap: 'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    },

    // High contrast support
    contrast: {
        high: 'contrast-more:border-2 contrast-more:border-foreground',
        text: 'contrast-more:text-foreground contrast-more:font-bold',
    },

    // Reduced motion support
    motion: {
        reduce: 'motion-reduce:transition-none motion-reduce:animation-none',
        safe: 'motion-safe:transition-all motion-safe:duration-200',
    },
} as const;

// Utility function to combine responsive classes
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Hook for responsive behavior (client-side only)
export function useResponsive() {
    if (typeof window === 'undefined') return { isMobile: false, isTablet: false, isDesktop: false };

    const width = window.innerWidth;
    return {
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        width,
    };
}

// Enhanced mobile detection with device capabilities
export function useMobileCapabilities() {
    if (typeof window === 'undefined') {
        return {
            isMobile: false,
            isTablet: false,
            isDesktop: false,
            hasTouch: false,
            isIOS: false,
            isAndroid: false,
            supportsPWA: false,
            supportsHaptics: false,
        };
    }

    const userAgent = window.navigator.userAgent;
    const width = window.innerWidth;

    return {
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        isIOS: /iPad|iPhone|iPod/.test(userAgent),
        isAndroid: /Android/.test(userAgent),
        supportsPWA: 'serviceWorker' in navigator && 'PushManager' in window,
        supportsHaptics: 'vibrate' in navigator,
        width,
    };
}

// Haptic feedback utility
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'selection' | 'impact' = 'light') {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        const patterns = {
            light: [10],
            medium: [20],
            heavy: [50],
            selection: [5],
            impact: [30],
        };

        navigator.vibrate(patterns[type]);
    }
}

// Media query helpers for styled components or CSS-in-JS
export const mediaQueries = {
    xs: `(min-width: ${breakpoints.xs})`,
    sm: `(min-width: ${breakpoints.sm})`,
    md: `(min-width: ${breakpoints.md})`,
    lg: `(min-width: ${breakpoints.lg})`,
    xl: `(min-width: ${breakpoints.xl})`,
    '2xl': `(min-width: ${breakpoints['2xl']})`,

    // Max width queries
    maxSm: `(max-width: ${parseInt(breakpoints.sm) - 1}px)`,
    maxMd: `(max-width: ${parseInt(breakpoints.md) - 1}px)`,
    maxLg: `(max-width: ${parseInt(breakpoints.lg) - 1}px)`,

    // Orientation queries
    portrait: '(orientation: portrait)',
    landscape: '(orientation: landscape)',

    // Device-specific
    mobile: '(max-width: 767px)',
    tablet: '(min-width: 768px) and (max-width: 1023px)',
    desktop: '(min-width: 1024px)',

    // High DPI
    retina: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',

    // Accessibility
    reducedMotion: '(prefers-reduced-motion: reduce)',
    highContrast: '(prefers-contrast: high)',
    darkMode: '(prefers-color-scheme: dark)',
    lightMode: '(prefers-color-scheme: light)',

    // Touch capabilities
    hover: '(hover: hover)',
    noHover: '(hover: none)',
    coarsePointer: '(pointer: coarse)',
    finePointer: '(pointer: fine)',
} as const;

// Responsive image utilities
export const imageResponsive = {
    cover: 'object-cover w-full h-full',
    contain: 'object-contain w-full h-full',
    avatar: 'w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover',
    card: 'w-full h-48 sm:h-56 lg:h-64 object-cover rounded-t-lg',
    hero: 'w-full h-64 sm:h-80 lg:h-96 object-cover',
} as const;

// Form responsive patterns
export const formResponsive = {
    field: 'flex flex-col space-y-1.5',
    group: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
    actions: 'flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end',
    input: 'w-full px-3 py-2 text-sm sm:text-base rounded-md border border-input bg-background',
} as const; 