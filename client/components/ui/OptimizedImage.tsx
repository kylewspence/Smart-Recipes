'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils/responsive';
import { useLazyLoading, useMobileOptimizations, getOptimizedImageUrl } from '@/lib/utils/performance';

interface OptimizedImageProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    priority?: boolean;
    fill?: boolean;
    sizes?: string;
    quality?: number;
    placeholder?: 'blur' | 'empty';
    blurDataURL?: string;
    fallbackSrc?: string;
    lazy?: boolean;
    onLoad?: () => void;
    onError?: () => void;
}

export function OptimizedImage({
    src,
    alt,
    width,
    height,
    className,
    priority = false,
    fill = false,
    sizes,
    quality,
    placeholder,
    blurDataURL,
    fallbackSrc,
    lazy = true,
    onLoad,
    onError,
    ...props
}: OptimizedImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [shouldLoad, setShouldLoad] = useState(!lazy || priority);
    const imageRef = useRef<HTMLDivElement>(null);

    const { observeElement } = useLazyLoading();
    const { getImageSettings, shouldLazyLoad, isSlowConnection } = useMobileOptimizations();

    // Get mobile-optimized settings
    const mobileSettings = getImageSettings();
    const finalQuality = quality || mobileSettings.quality;
    const finalPlaceholder = placeholder || mobileSettings.placeholder;
    const shouldUseLazy = lazy && shouldLazyLoad(priority);

    // Set up lazy loading
    useEffect(() => {
        if (!shouldUseLazy || shouldLoad) return;

        const element = imageRef.current;
        if (!element) return;

        const cleanup = observeElement(element, (entry) => {
            if (entry.isIntersecting) {
                setShouldLoad(true);
            }
        });

        return cleanup;
    }, [shouldUseLazy, shouldLoad, observeElement]);

    const handleLoad = () => {
        setIsLoaded(true);
        onLoad?.();
    };

    const handleError = () => {
        setHasError(true);
        onError?.();
    };

    // Generate responsive sizes if not provided
    const responsiveSizes = sizes || (
        fill
            ? '100vw'
            : width
                ? `(max-width: 768px) 100vw, (max-width: 1200px) 50vw, ${width}px`
                : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
    );

    // Use fallback image if there's an error
    const imageSrc = hasError && fallbackSrc ? fallbackSrc : src;

    // Create blur data URL for slow connections
    const defaultBlurDataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';

    return (
        <div
            ref={imageRef}
            className={cn(
                'relative overflow-hidden',
                !isLoaded && 'animate-pulse bg-muted',
                className
            )}
            style={!fill && width && height ? { width, height } : undefined}
        >
            {shouldLoad ? (
                <>
                    <Image
                        src={imageSrc}
                        alt={alt}
                        width={!fill ? width : undefined}
                        height={!fill ? height : undefined}
                        fill={fill}
                        sizes={responsiveSizes}
                        quality={finalQuality}
                        priority={priority}
                        placeholder={finalPlaceholder}
                        blurDataURL={blurDataURL || (finalPlaceholder === 'blur' ? defaultBlurDataURL : undefined)}
                        className={cn(
                            'transition-opacity duration-300',
                            isLoaded ? 'opacity-100' : 'opacity-0',
                            fill ? 'object-cover' : ''
                        )}
                        onLoad={handleLoad}
                        onError={handleError}
                        {...props}
                    />

                    {/* Loading placeholder */}
                    {!isLoaded && (
                        <div className={cn(
                            'absolute inset-0 flex items-center justify-center bg-muted',
                            'animate-pulse'
                        )}>
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                    )}
                </>
            ) : (
                // Lazy loading placeholder
                <div className={cn(
                    'absolute inset-0 flex items-center justify-center bg-muted',
                    isSlowConnection && 'bg-muted/50'
                )}>
                    <div className="text-xs text-muted-foreground">Loading...</div>
                </div>
            )}

            {/* Error fallback */}
            {hasError && !fallbackSrc && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="text-center">
                        <div className="text-2xl mb-2">📷</div>
                        <div className="text-xs text-muted-foreground">Image unavailable</div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OptimizedImage; 