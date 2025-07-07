'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, Menu } from 'lucide-react';
import Link from 'next/link';

interface PageHeaderProps {
    title?: string;
    subtitle?: string;
    showBack?: boolean;
    showBreadcrumb?: boolean;
    breadcrumbItems?: Array<{ label: string; href?: string }>;
    actions?: React.ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    subtitle,
    showBack = true,
    showBreadcrumb = true,
    breadcrumbItems = [{ label: 'Dashboard', href: '/dashboard' }],
    actions,
    className = '',
}: PageHeaderProps) {
    const router = useRouter();

    return (
        <div className={`flex items-center justify-between mb-6 ${className}`}>
            <div className="flex items-center space-x-4">
                {showBack && (
                    <button
                        onClick={() => router.back()}
                        className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline">Back</span>
                    </button>
                )}

                {showBreadcrumb && (
                    <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        {breadcrumbItems.map((item, index) => (
                            <React.Fragment key={index}>
                                {item.href ? (
                                    <button
                                        onClick={() => router.push(item.href!)}
                                        className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                    >
                                        {index === 0 && <Home className="w-4 h-4" />}
                                        <span className="hidden sm:inline">{item.label}</span>
                                    </button>
                                ) : (
                                    <span className="text-gray-900 dark:text-white font-medium">
                                        {item.label}
                                    </span>
                                )}
                                {index < breadcrumbItems.length - 1 && <span>/</span>}
                            </React.Fragment>
                        ))}
                    </nav>
                )}

                {title && !showBreadcrumb && (
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                {subtitle}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {actions && (
                <div className="flex items-center space-x-2">
                    {actions}
                </div>
            )}
        </div>
    );
} 