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