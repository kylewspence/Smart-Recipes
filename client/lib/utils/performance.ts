import { useMobileCapabilities } from './responsive';

// Performance monitoring utilities
export interface PerformanceMetrics {
    fcp: number; // First Contentful Paint
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    ttfb: number; // Time to First Byte
}

// Lazy loading utility with intersection observer
export function useLazyLoading(options?: IntersectionObserverInit) {
    const defaultOptions: IntersectionObserverInit = {
        root: null,
        rootMargin: '50px',
        threshold: 0.1,
        ...options,
    };

    const observeElement = (
        element: Element,
        callback: (entry: IntersectionObserverEntry) => void
    ) => {
        if (!('IntersectionObserver' in window)) {
            // Fallback for older browsers
            callback({ isIntersecting: true } as IntersectionObserverEntry);
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    callback(entry);
                    observer.unobserve(element);
                }
            });
        }, defaultOptions);

        observer.observe(element);
        return () => observer.disconnect();
    };

    return { observeElement };
}

// Image optimization utilities
export interface OptimizedImageProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    priority?: boolean;
    quality?: number;
    placeholder?: 'blur' | 'empty';
    blurDataURL?: string;
}

export function getOptimizedImageUrl(
    src: string,
    options: {
        width?: number;
        height?: number;
        quality?: number;
        format?: 'webp' | 'avif' | 'jpeg' | 'png';
    } = {}
): string {
    const { width, height, quality = 75, format = 'webp' } = options;

    // If it's already an optimized URL or external URL, return as-is
    if (src.startsWith('http') || src.includes('/_next/image')) {
        return src;
    }

    // Build Next.js image optimization URL
    const params = new URLSearchParams();
    params.append('url', src);
    params.append('q', quality.toString());

    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());

    return `/_next/image?${params.toString()}`;
}

// Bundle size optimization utilities
export function dynamicImport<T>(
    importFn: () => Promise<{ default: T }>,
    fallback?: T
): Promise<T> {
    return importFn()
        .then((module) => module.default)
        .catch((error) => {
            console.warn('Dynamic import failed:', error);
            if (fallback) return fallback;
            throw error;
        });
}

// Network-aware loading
export function useNetworkAwareLoading() {
    const getConnectionInfo = () => {
        if (typeof navigator === 'undefined' || !('connection' in navigator)) {
            return {
                effectiveType: '4g',
                downlink: 10,
                rtt: 100,
                saveData: false,
            };
        }

        const connection = (navigator as any).connection;
        return {
            effectiveType: connection.effectiveType || '4g',
            downlink: connection.downlink || 10,
            rtt: connection.rtt || 100,
            saveData: connection.saveData || false,
        };
    };

    const isSlowConnection = () => {
        const { effectiveType, saveData } = getConnectionInfo();
        return saveData || effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';
    };

    const shouldReduceQuality = () => {
        return isSlowConnection();
    };

    const getOptimalImageQuality = () => {
        const { effectiveType, saveData } = getConnectionInfo();

        if (saveData) return 30;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') return 40;
        if (effectiveType === '3g') return 60;
        return 75; // 4g and above
    };

    return {
        getConnectionInfo,
        isSlowConnection,
        shouldReduceQuality,
        getOptimalImageQuality,
    };
}

// Performance monitoring
export function measurePerformance(): Promise<PerformanceMetrics> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') {
            resolve({
                fcp: 0,
                lcp: 0,
                fid: 0,
                cls: 0,
                ttfb: 0,
            });
            return;
        }

        const metrics: Partial<PerformanceMetrics> = {};

        // Measure TTFB
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationEntry) {
            metrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        }

        // Measure FCP
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                    metrics.fcp = entry.startTime;
                }
                if (entry.entryType === 'largest-contentful-paint') {
                    metrics.lcp = entry.startTime;
                }
                if (entry.entryType === 'first-input') {
                    metrics.fid = (entry as any).processingStart - entry.startTime;
                }
                if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
                    metrics.cls = (metrics.cls || 0) + (entry as any).value;
                }
            }

            // Check if we have all metrics
            if (Object.keys(metrics).length >= 4) {
                resolve(metrics as PerformanceMetrics);
                observer.disconnect();
            }
        });

        try {
            observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
        } catch (error) {
            // Fallback if performance observer is not supported
            setTimeout(() => {
                resolve({
                    fcp: 0,
                    lcp: 0,
                    fid: 0,
                    cls: 0,
                    ttfb: metrics.ttfb || 0,
                });
            }, 1000);
        }
    });
}

// Critical CSS utilities
export function loadCriticalCSS(cssText: string) {
    if (typeof document === 'undefined') return;

    const style = document.createElement('style');
    style.textContent = cssText;
    document.head.appendChild(style);
}

export function preloadResource(href: string, as: string, type?: string) {
    if (typeof document === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (type) link.type = type;
    document.head.appendChild(link);
}

// Mobile-specific optimizations
export function useMobileOptimizations() {
    const { isMobile, isTablet } = useMobileCapabilities();
    const { isSlowConnection, getOptimalImageQuality } = useNetworkAwareLoading();

    const shouldLazyLoad = (priority: boolean = false) => {
        if (priority) return false;
        return isMobile || isTablet || isSlowConnection();
    };

    const getImageSettings = () => ({
        quality: getOptimalImageQuality(),
        priority: false,
        placeholder: isSlowConnection() ? 'blur' as const : 'empty' as const,
    });

    const shouldPreloadRoute = (route: string) => {
        // Only preload critical routes on fast connections
        const criticalRoutes = ['/', '/search', '/recipe-generator'];
        return !isSlowConnection() && criticalRoutes.includes(route);
    };

    return {
        shouldLazyLoad,
        getImageSettings,
        shouldPreloadRoute,
        isMobile: isMobile || isTablet,
        isSlowConnection: isSlowConnection(),
    };
}

// Debounce utility for performance
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate?: boolean
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };

        const callNow = immediate && !timeout;

        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) func(...args);
    };
}

// Throttle utility for scroll events
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
} 