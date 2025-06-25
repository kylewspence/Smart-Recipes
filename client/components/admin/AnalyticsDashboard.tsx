'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { BarChart3, Users, Eye, Activity, Clock, TrendingUp, RefreshCw } from 'lucide-react';

interface AnalyticsData {
    summary: {
        totalUsers: number;
        totalSessions: number;
        totalPageviews: number;
        totalEvents: number;
    };
    performance: {
        averages: Array<{
            metric_name: string;
            avg_value: number;
            sample_size: number;
        }>;
        byRating: Array<{
            metric_name: string;
            rating: 'good' | 'needs-improvement' | 'poor';
            count: number;
            avg_value: number;
        }>;
    };
    topPages: Array<{
        path: string;
        views: number;
    }>;
    topEvents: Array<{
        action: string;
        category: string;
        occurrences: number;
    }>;
}

const AnalyticsDashboard: React.FC = () => {
    const { user } = useAuth();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/analytics/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch analytics data');
            }

            const analyticsData = await response.json();
            setData(analyticsData);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchAnalytics();
        }
    }, [user]);

    const getPerformanceRatingColor = (rating: string) => {
        switch (rating) {
            case 'good':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'needs-improvement':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'poor':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    const formatMetricName = (name: string) => {
        const nameMap: Record<string, string> = {
            'CLS': 'Cumulative Layout Shift',
            'FCP': 'First Contentful Paint',
            'LCP': 'Largest Contentful Paint',
            'INP': 'Interaction to Next Paint',
            'TTFB': 'Time to First Byte',
        };
        return nameMap[name] || name;
    };

    const formatMetricValue = (name: string, value: number) => {
        if (name === 'CLS') {
            return value.toFixed(3);
        }
        return `${Math.round(value)}ms`;
    };

    if (!user || user.role !== 'admin') {
        return (
            <div className="p-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h2>
                <p className="text-gray-600 dark:text-gray-400">You need admin privileges to view analytics.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
                    <div className="animate-spin">
                        <RefreshCw className="h-6 w-6" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error Loading Analytics</h2>
                <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                <button
                    onClick={fetchAnalytics}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </button>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Data Available</h2>
                <p className="text-gray-600 dark:text-gray-400">Analytics data is not available yet.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Last 30 days • Updated {lastUpdated?.toLocaleTimeString()}
                    </p>
                </div>
                <button
                    onClick={fetchAnalytics}
                    className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                        <div className="p-3 rounded-lg bg-blue-500">
                            <Users className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.totalUsers.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                        <div className="p-3 rounded-lg bg-green-500">
                            <Activity className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sessions</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.totalSessions.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                        <div className="p-3 rounded-lg bg-purple-500">
                            <Eye className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Page Views</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.totalPageviews.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                        <div className="p-3 rounded-lg bg-orange-500">
                            <BarChart3 className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Events</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.totalEvents.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center mb-6">
                        <Clock className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Performance Metrics</h2>
                    </div>
                    <div className="space-y-4">
                        {data.performance.averages.map((metric) => (
                            <div key={metric.metric_name} className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{formatMetricName(metric.metric_name)}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{metric.sample_size} samples</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900 dark:text-white">{formatMetricValue(metric.metric_name, metric.avg_value)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center mb-6">
                        <TrendingUp className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Performance Distribution</h2>
                    </div>
                    <div className="space-y-3">
                        {data.performance.byRating.map((metric, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatMetricName(metric.metric_name)}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPerformanceRatingColor(metric.rating)}`}>
                                        {metric.rating}
                                    </span>
                                </div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{metric.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Pages and Events */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Top Pages</h2>
                    <div className="space-y-3">
                        {data.topPages.slice(0, 10).map((page, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1 mr-2">{page.path}</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">{page.views.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Top Events</h2>
                    <div className="space-y-3">
                        {data.topEvents.slice(0, 10).map((event, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex-1 mr-2">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{event.action}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">{event.category}</p>
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">{event.occurrences.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard; 