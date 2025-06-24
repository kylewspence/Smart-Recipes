'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { cn, touchOptimized, mobileA11y, triggerHaptic, useMobileCapabilities } from '@/lib/utils/responsive';

interface MobileTopBarProps {
    title?: string;
    showBack?: boolean;
    backHref?: string;
    onBack?: () => void;
    actions?: React.ReactNode;
    transparent?: boolean;
    className?: string;
}

export function MobileTopBar({
    title,
    showBack = false,
    backHref,
    onBack,
    actions,
    transparent = false,
    className,
}: MobileTopBarProps) {
    const router = useRouter();
    const { supportsHaptics } = useMobileCapabilities();

    const handleBack = () => {
        if (supportsHaptics) {
            triggerHaptic('light');
        }

        if (onBack) {
            onBack();
        } else if (backHref) {
            router.push(backHref);
        } else {
            router.back();
        }
    };

    return (
        <header
            className={cn(
                touchOptimized.navigation.topBar,
                'h-14 px-4 flex items-center justify-between',
                transparent
                    ? 'bg-transparent border-none'
                    : 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b',
                className
            )}
        >
            {/* Left Side - Back Button */}
            <div className="flex items-center">
                {showBack && (
                    <button
                        className={cn(
                            touchOptimized.button.icon,
                            mobileA11y.focus.visible,
                            'mr-2 rounded-full hover:bg-muted'
                        )}
                        onClick={handleBack}
                        aria-label="Go back"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Center - Title */}
            <div className="flex-1 flex justify-center">
                {title && (
                    <h1 className="text-lg font-semibold text-center truncate px-4">
                        {title}
                    </h1>
                )}
            </div>

            {/* Right Side - Actions */}
            <div className="flex items-center space-x-2">
                {actions || (
                    <div className={cn(touchOptimized.button.icon)}>
                        {/* Placeholder to maintain layout balance */}
                    </div>
                )}
            </div>
        </header>
    );
}

export default MobileTopBar; 