import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

// Types for analytics events
export interface AnalyticsEvent {
    action: string;
    category: string;
    label?: string;
    value?: number;
    userId?: string;
    sessionId?: string;
    timestamp?: number;
}

export interface PerformanceMetric {
    name: string;
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
    url: string;
    userId?: string;
}

// Analytics service
class AnalyticsService {
    private isInitialized = false;
    private userId: string | null = null;
    private sessionId: string;

    constructor() {
        this.sessionId = this.generateSessionId();
    }

    // Initialize analytics
    init(userId?: string) {
        this.userId = userId || null;
        this.isInitialized = true;

        // Initialize Web Vitals tracking
        this.initWebVitals();

        // Track page view
        this.trackPageView();

        console.log('Analytics initialized', { userId, sessionId: this.sessionId });
    }

    // Generate unique session ID
    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Track custom events
    trackEvent(event: Omit<AnalyticsEvent, 'timestamp' | 'userId' | 'sessionId'>) {
        if (!this.isInitialized) return;

        const fullEvent: AnalyticsEvent = {
            ...event,
            userId: this.userId || undefined,
            sessionId: this.sessionId,
            timestamp: Date.now(),
        };

        // Send to analytics endpoint
        this.sendToAnalytics('event', fullEvent);
    }

    // Track page views
    trackPageView(path?: string) {
        if (!this.isInitialized) return;

        const pageView = {
            action: 'page_view',
            category: 'navigation',
            label: path || window.location.pathname,
            userId: this.userId || undefined,
            sessionId: this.sessionId,
            timestamp: Date.now(),
        };

        this.sendToAnalytics('pageview', pageView);
    }

    // Track user actions
    trackUserAction(action: string, category: string, label?: string, value?: number) {
        this.trackEvent({ action, category, label, value });
    }

    // Track recipe interactions
    trackRecipeInteraction(action: 'generate' | 'save' | 'share' | 'cook', recipeId?: string) {
        this.trackEvent({
            action: `recipe_${action}`,
            category: 'recipe',
            label: recipeId,
        });
    }

    // Track search interactions
    trackSearch(query: string, resultsCount: number) {
        this.trackEvent({
            action: 'search',
            category: 'search',
            label: query,
            value: resultsCount,
        });
    }

    // Track authentication events
    trackAuth(action: 'login' | 'register' | 'logout') {
        this.trackEvent({
            action,
            category: 'auth',
        });
    }

    // Track errors
    trackError(error: Error, context?: string) {
        this.trackEvent({
            action: 'error',
            category: 'error',
            label: `${context || 'unknown'}: ${error.message}`,
        });
    }

    // Initialize Web Vitals tracking
    private initWebVitals() {
        const sendMetric = (metric: any) => {
            const performanceMetric: PerformanceMetric = {
                name: metric.name,
                value: metric.value,
                rating: metric.rating,
                timestamp: Date.now(),
                url: window.location.href,
                userId: this.userId || undefined,
            };

            this.sendToAnalytics('performance', performanceMetric);
        };

        // Track all Web Vitals (INP replaces FID in newer versions)
        onCLS(sendMetric);
        onFCP(sendMetric);
        onINP(sendMetric);
        onLCP(sendMetric);
        onTTFB(sendMetric);
    }

    // Send data to analytics endpoint
    private async sendToAnalytics(type: string, data: any) {
        try {
            // In development, just log to console
            if (process.env.NODE_ENV === 'development') {
                console.log(`Analytics [${type}]:`, data);
                return;
            }

            // Send to backend analytics endpoint
            await fetch('/api/analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type,
                    data,
                    timestamp: Date.now(),
                }),
            });
        } catch (error) {
            console.error('Failed to send analytics:', error);
        }
    }

    // Update user ID (when user logs in)
    setUserId(userId: string) {
        this.userId = userId;
    }

    // Clear user ID (when user logs out)
    clearUserId() {
        this.userId = null;
    }
}

// Create singleton instance
export const analytics = new AnalyticsService();

// React hook for analytics
export function useAnalytics() {
    return {
        trackEvent: analytics.trackEvent.bind(analytics),
        trackPageView: analytics.trackPageView.bind(analytics),
        trackUserAction: analytics.trackUserAction.bind(analytics),
        trackRecipeInteraction: analytics.trackRecipeInteraction.bind(analytics),
        trackSearch: analytics.trackSearch.bind(analytics),
        trackAuth: analytics.trackAuth.bind(analytics),
        trackError: analytics.trackError.bind(analytics),
        setUserId: analytics.setUserId.bind(analytics),
        clearUserId: analytics.clearUserId.bind(analytics),
    };
}

// Error boundary analytics helper
export function trackErrorBoundary(error: Error, errorInfo: any) {
    analytics.trackEvent({
        action: 'error_boundary',
        category: 'error',
        label: `${error.message} - ${errorInfo.componentStack}`,
    });
} 