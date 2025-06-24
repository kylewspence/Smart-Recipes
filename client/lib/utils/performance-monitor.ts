'use client';

import { getCLS, getFCP, getFID, getLCP, getTTFB, Metric } from 'web-vitals';

// Performance monitoring configuration
const PERFORMANCE_CONFIG = {
    // Core Web Vitals thresholds (in milliseconds)
    thresholds: {
        LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
        FID: { good: 100, poor: 300 },  // First Input Delay
        CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
        FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
        TTFB: { good: 800, poor: 1800 }, // Time to First Byte
    },
    // Sampling rate for performance monitoring
    sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Buffer size for batching metrics
    bufferSize: 10,
    // Flush interval in milliseconds
    flushInterval: 30000,
} as const;

// Performance metric types
interface PerformanceMetric {
    name: string;
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
    url: string;
    userAgent: string;
    connection?: {
        effectiveType: string;
        downlink: number;
        rtt: number;
    };
}

interface UserInteractionMetric {
    type: 'click' | 'scroll' | 'navigation' | 'form-submit';
    element?: string;
    duration?: number;
    timestamp: number;
    url: string;
}

interface ResourceMetric {
    name: string;
    type: string;
    size: number;
    duration: number;
    timestamp: number;
}

class PerformanceMonitor {
    private metrics: PerformanceMetric[] = [];
    private interactions: UserInteractionMetric[] = [];
    private resources: ResourceMetric[] = [];
    private observers: PerformanceObserver[] = [];
    private flushTimer?: NodeJS.Timeout;
    private isInitialized = false;

    constructor() {
        if (typeof window !== 'undefined') {
            this.initialize();
        }
    }

    private initialize() {
        if (this.isInitialized) return;

        // Sample based on configuration
        if (Math.random() > PERFORMANCE_CONFIG.sampleRate) {
            return;
        }

        this.isInitialized = true;
        this.setupWebVitals();
        this.setupResourceMonitoring();
        this.setupUserInteractionMonitoring();
        this.setupNavigationMonitoring();
        this.startFlushTimer();

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.flush();
            }
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.flush();
        });
    }

    private setupWebVitals() {
        // Monitor Core Web Vitals
        const handleMetric = (metric: Metric) => {
            const rating = this.getRating(metric.name, metric.value);
            const connection = this.getConnectionInfo();

            this.addMetric({
                name: metric.name,
                value: metric.value,
                rating,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                connection,
            });
        };

        getCLS(handleMetric);
        getFCP(handleMetric);
        getFID(handleMetric);
        getLCP(handleMetric);
        getTTFB(handleMetric);
    }

    private setupResourceMonitoring() {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'resource') {
                    const resourceEntry = entry as PerformanceResourceTiming;

                    this.addResource({
                        name: resourceEntry.name,
                        type: this.getResourceType(resourceEntry.name),
                        size: resourceEntry.transferSize || 0,
                        duration: resourceEntry.duration,
                        timestamp: Date.now(),
                    });
                }
            }
        });

        observer.observe({ entryTypes: ['resource'] });
        this.observers.push(observer);
    }

    private setupUserInteractionMonitoring() {
        // Monitor clicks
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            this.addInteraction({
                type: 'click',
                element: this.getElementSelector(target),
                timestamp: Date.now(),
                url: window.location.href,
            });
        });

        // Monitor scroll performance
        let scrollStartTime = 0;
        let scrollTimer: NodeJS.Timeout;

        document.addEventListener('scroll', () => {
            if (!scrollStartTime) {
                scrollStartTime = performance.now();
            }

            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                const duration = performance.now() - scrollStartTime;
                this.addInteraction({
                    type: 'scroll',
                    duration,
                    timestamp: Date.now(),
                    url: window.location.href,
                });
                scrollStartTime = 0;
            }, 150);
        });

        // Monitor form submissions
        document.addEventListener('submit', (event) => {
            const target = event.target as HTMLFormElement;
            this.addInteraction({
                type: 'form-submit',
                element: this.getElementSelector(target),
                timestamp: Date.now(),
                url: window.location.href,
            });
        });
    }

    private setupNavigationMonitoring() {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'navigation') {
                    const navEntry = entry as PerformanceNavigationTiming;

                    // Track key navigation metrics
                    const metrics = [
                        { name: 'DNS', value: navEntry.domainLookupEnd - navEntry.domainLookupStart },
                        { name: 'TCP', value: navEntry.connectEnd - navEntry.connectStart },
                        { name: 'Request', value: navEntry.responseStart - navEntry.requestStart },
                        { name: 'Response', value: navEntry.responseEnd - navEntry.responseStart },
                        { name: 'DOM', value: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart },
                        { name: 'Load', value: navEntry.loadEventEnd - navEntry.loadEventStart },
                    ];

                    metrics.forEach(metric => {
                        if (metric.value > 0) {
                            this.addMetric({
                                name: `Navigation-${metric.name}`,
                                value: metric.value,
                                rating: this.getRating(`Navigation-${metric.name}`, metric.value),
                                timestamp: Date.now(),
                                url: window.location.href,
                                userAgent: navigator.userAgent,
                                connection: this.getConnectionInfo(),
                            });
                        }
                    });
                }
            }
        });

        observer.observe({ entryTypes: ['navigation'] });
        this.observers.push(observer);
    }

    private getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
        const thresholds = PERFORMANCE_CONFIG.thresholds[metricName as keyof typeof PERFORMANCE_CONFIG.thresholds];

        if (!thresholds) {
            // Default thresholds for custom metrics
            if (value < 1000) return 'good';
            if (value < 3000) return 'needs-improvement';
            return 'poor';
        }

        if (value <= thresholds.good) return 'good';
        if (value <= thresholds.poor) return 'needs-improvement';
        return 'poor';
    }

    private getConnectionInfo() {
        if ('connection' in navigator) {
            const connection = (navigator as any).connection;
            return {
                effectiveType: connection.effectiveType || 'unknown',
                downlink: connection.downlink || 0,
                rtt: connection.rtt || 0,
            };
        }
        return undefined;
    }

    private getResourceType(url: string): string {
        if (url.includes('.js')) return 'script';
        if (url.includes('.css')) return 'stylesheet';
        if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
        if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
        if (url.includes('/api/')) return 'api';
        return 'other';
    }

    private getElementSelector(element: HTMLElement): string {
        if (element.id) return `#${element.id}`;
        if (element.className) return `.${element.className.split(' ')[0]}`;
        return element.tagName.toLowerCase();
    }

    private addMetric(metric: PerformanceMetric) {
        this.metrics.push(metric);
        this.checkFlushCondition();
    }

    private addInteraction(interaction: UserInteractionMetric) {
        this.interactions.push(interaction);
        this.checkFlushCondition();
    }

    private addResource(resource: ResourceMetric) {
        this.resources.push(resource);
        this.checkFlushCondition();
    }

    private checkFlushCondition() {
        const totalItems = this.metrics.length + this.interactions.length + this.resources.length;
        if (totalItems >= PERFORMANCE_CONFIG.bufferSize) {
            this.flush();
        }
    }

    private startFlushTimer() {
        this.flushTimer = setInterval(() => {
            this.flush();
        }, PERFORMANCE_CONFIG.flushInterval);
    }

    private async flush() {
        if (this.metrics.length === 0 && this.interactions.length === 0 && this.resources.length === 0) {
            return;
        }

        const payload = {
            metrics: [...this.metrics],
            interactions: [...this.interactions],
            resources: [...this.resources],
            timestamp: Date.now(),
            sessionId: this.getSessionId(),
            userId: this.getUserId(),
        };

        // Clear buffers
        this.metrics = [];
        this.interactions = [];
        this.resources = [];

        try {
            // Send to analytics endpoint
            await this.sendToAnalytics(payload);
        } catch (error) {
            console.warn('Failed to send performance metrics:', error);
        }
    }

    private async sendToAnalytics(payload: any) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        try {
            await fetch(`${apiUrl}/api/analytics/performance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
        } catch (error) {
            // Fallback: store in localStorage for later retry
            this.storeForRetry(payload);
        }
    }

    private storeForRetry(payload: any) {
        try {
            const stored = localStorage.getItem('performance_metrics_queue') || '[]';
            const queue = JSON.parse(stored);
            queue.push(payload);

            // Keep only last 10 entries to avoid storage bloat
            if (queue.length > 10) {
                queue.splice(0, queue.length - 10);
            }

            localStorage.setItem('performance_metrics_queue', JSON.stringify(queue));
        } catch (error) {
            console.warn('Failed to store performance metrics for retry:', error);
        }
    }

    private getSessionId(): string {
        let sessionId = sessionStorage.getItem('performance_session_id');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('performance_session_id', sessionId);
        }
        return sessionId;
    }

    private getUserId(): string | null {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.userId?.toString() || null;
            }
        } catch (error) {
            // Ignore token parsing errors
        }
        return null;
    }

    // Public methods
    public getMetrics() {
        return {
            metrics: [...this.metrics],
            interactions: [...this.interactions],
            resources: [...this.resources],
        };
    }

    public markInteraction(name: string, duration?: number) {
        this.addInteraction({
            type: 'navigation',
            element: name,
            duration,
            timestamp: Date.now(),
            url: window.location.href,
        });
    }

    public markCustomMetric(name: string, value: number) {
        this.addMetric({
            name: `Custom-${name}`,
            value,
            rating: this.getRating(name, value),
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            connection: this.getConnectionInfo(),
        });
    }

    public destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];

        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = undefined;
        }

        this.flush();
    }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
    const markInteraction = (name: string, duration?: number) => {
        performanceMonitor.markInteraction(name, duration);
    };

    const markCustomMetric = (name: string, value: number) => {
        performanceMonitor.markCustomMetric(name, value);
    };

    const getMetrics = () => {
        return performanceMonitor.getMetrics();
    };

    return {
        markInteraction,
        markCustomMetric,
        getMetrics,
    };
}

// Performance measurement decorator
export function measurePerformance(name: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const startTime = performance.now();

            try {
                const result = await originalMethod.apply(this, args);
                const duration = performance.now() - startTime;
                performanceMonitor.markCustomMetric(name, duration);
                return result;
            } catch (error) {
                const duration = performance.now() - startTime;
                performanceMonitor.markCustomMetric(`${name}-error`, duration);
                throw error;
            }
        };

        return descriptor;
    };
}

// Performance timing utilities
export const performanceUtils = {
    // Measure function execution time
    measure: async <T>(name: string, fn: () => Promise<T> | T): Promise<T> => {
        const startTime = performance.now();

        try {
            const result = await fn();
            const duration = performance.now() - startTime;
            performanceMonitor.markCustomMetric(name, duration);
            return result;
        } catch (error) {
            const duration = performance.now() - startTime;
            performanceMonitor.markCustomMetric(`${name}-error`, duration);
            throw error;
        }
    },

    // Create performance mark
    mark: (name: string) => {
        if ('performance' in window && 'mark' in performance) {
            performance.mark(name);
        }
    },

    // Measure between two marks
    measureBetween: (startMark: string, endMark: string, name: string) => {
        if ('performance' in window && 'measure' in performance) {
            try {
                performance.measure(name, startMark, endMark);
                const measure = performance.getEntriesByName(name, 'measure')[0];
                if (measure) {
                    performanceMonitor.markCustomMetric(name, measure.duration);
                }
            } catch (error) {
                console.warn('Failed to measure performance:', error);
            }
        }
    },
};