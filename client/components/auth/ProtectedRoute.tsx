'use client';

import React, { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

interface ProtectedRouteProps {
    children: ReactNode;
    redirectTo?: string;
    requireAuth?: boolean;
    requireRole?: 'User' | 'Moderator' | 'Admin';
    fallback?: ReactNode;
}

export function ProtectedRoute({
    children,
    redirectTo = '/auth/login',
    requireAuth = true,
    requireRole,
    fallback
}: ProtectedRouteProps) {
    const { user, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (requireAuth && !isAuthenticated) {
                // Store the intended destination for redirect after login
                const currentPath = window.location.pathname + window.location.search;
                sessionStorage.setItem('redirectAfterLogin', currentPath);
                router.push(redirectTo);
                return;
            }

            if (requireRole && user && !hasRequiredRole(user.role, requireRole)) {
                // User doesn't have the required role
                router.push('/unauthorized');
                return;
            }
        }
    }, [isLoading, isAuthenticated, user, router, redirectTo, requireAuth, requireRole]);

    // Show loading state while checking authentication
    if (isLoading) {
        return fallback || <LoadingSpinner />;
    }

    // Show nothing while redirecting
    if (requireAuth && !isAuthenticated) {
        return null;
    }

    // Check role requirements
    if (requireRole && user && !hasRequiredRole(user.role, requireRole)) {
        return null;
    }

    return <>{children}</>;
}

// Helper function to check role hierarchy
function hasRequiredRole(userRole: string, requiredRole: string): boolean {
    const roleHierarchy = {
        'User': 1,
        'Moderator': 2,
        'Admin': 3
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
}

// Loading spinner component
function LoadingSpinner() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
        </div>
    );
}

// Hook for easy protection of pages
export function useRequireAuth(redirectTo?: string) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            const currentPath = window.location.pathname + window.location.search;
            sessionStorage.setItem('redirectAfterLogin', currentPath);
            router.push(redirectTo || '/auth/login');
        }
    }, [isAuthenticated, isLoading, router, redirectTo]);

    return { isAuthenticated, isLoading };
} 