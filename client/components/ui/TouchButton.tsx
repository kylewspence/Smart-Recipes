'use client';

import React, { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn, touchOptimized, mobileA11y, triggerHaptic, useMobileCapabilities } from '@/lib/utils/responsive';

const touchButtonVariants = cva(
    cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium',
        'transition-all duration-200 ease-in-out',
        touchOptimized.target.medium,
        mobileA11y.focus.visible,
        mobileA11y.motion.safe,
        'disabled:pointer-events-none disabled:opacity-50'
    ),
    {
        variants: {
            variant: {
                default: cn(
                    'bg-primary text-primary-foreground shadow',
                    touchOptimized.button.primary,
                    'hover:bg-primary/90'
                ),
                destructive: cn(
                    'bg-destructive text-destructive-foreground shadow-sm',
                    touchOptimized.button.primary,
                    'hover:bg-destructive/90'
                ),
                outline: cn(
                    'border border-input bg-background shadow-sm',
                    touchOptimized.button.secondary,
                    'hover:bg-accent hover:text-accent-foreground'
                ),
                secondary: cn(
                    'bg-secondary text-secondary-foreground shadow-sm',
                    touchOptimized.button.secondary,
                    'hover:bg-secondary/80'
                ),
                ghost: cn(
                    touchOptimized.button.secondary,
                    'hover:bg-accent hover:text-accent-foreground'
                ),
                link: 'text-primary underline-offset-4 hover:underline',
                floating: cn(
                    'bg-primary text-primary-foreground shadow-lg',
                    touchOptimized.button.floating,
                    'hover:bg-primary/90 hover:shadow-xl'
                ),
            },
            size: {
                default: 'h-12 px-6 py-3',
                sm: 'h-10 px-4 py-2 text-sm',
                lg: 'h-14 px-8 py-4 text-base',
                xl: 'h-16 px-10 py-5 text-lg',
                icon: cn(touchOptimized.target.medium, 'p-0'),
                'icon-sm': cn(touchOptimized.target.small, 'p-0'),
                'icon-lg': cn(touchOptimized.target.large, 'p-0'),
            },
            haptic: {
                none: '',
                light: '',
                medium: '',
                heavy: '',
                selection: '',
            },
            fullWidth: {
                true: 'w-full',
                false: '',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
            haptic: 'light',
            fullWidth: false,
        },
    }
);

export interface TouchButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof touchButtonVariants> {
    asChild?: boolean;
    loading?: boolean;
    loadingText?: string;
}

const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
    ({
        className,
        variant,
        size,
        haptic = 'light',
        fullWidth,
        asChild = false,
        loading = false,
        loadingText,
        children,
        onClick,
        onTouchStart,
        disabled,
        ...props
    }, ref) => {
        const Comp = asChild ? Slot : 'button';
        const { supportsHaptics } = useMobileCapabilities();

        const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
            if (supportsHaptics && haptic && haptic !== 'none' && !disabled && !loading) {
                triggerHaptic(haptic);
            }
            onTouchStart?.(e);
        };

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            if (!disabled && !loading) {
                onClick?.(e);
            }
        };

        const isDisabled = disabled || loading;

        return (
            <Comp
                className={cn(
                    touchButtonVariants({ variant, size, fullWidth, className }),
                    loading && 'cursor-wait',
                    isDisabled && 'cursor-not-allowed'
                )}
                ref={ref}
                disabled={isDisabled}
                onClick={handleClick}
                onTouchStart={handleTouchStart}
                aria-disabled={isDisabled}
                {...props}
            >
                {loading && (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {loading && loadingText ? loadingText : children}
            </Comp>
        );
    }
);

TouchButton.displayName = 'TouchButton';

export { TouchButton, touchButtonVariants }; 