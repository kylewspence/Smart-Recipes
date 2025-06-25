'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn, touchOptimized } from '@/lib/utils/responsive';
import { throttle } from '@/lib/utils/performance';

interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    containerHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    className?: string;
    overscan?: number;
    onScroll?: (scrollTop: number) => void;
    onEndReached?: () => void;
    endReachedThreshold?: number;
    keyExtractor?: (item: T, index: number) => string;
}

export function VirtualList<T>({
    items,
    itemHeight,
    containerHeight,
    renderItem,
    className,
    overscan = 5,
    onScroll,
    onEndReached,
    endReachedThreshold = 0.8,
    keyExtractor = (_, index) => index.toString(),
}: VirtualListProps<T>) {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const endReachedRef = useRef(false);

    // Calculate visible range
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
        visibleStart + Math.ceil(containerHeight / itemHeight),
        items.length - 1
    );

    // Add overscan
    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(items.length - 1, visibleEnd + overscan);

    // Throttled scroll handler for better performance
    const handleScroll = useCallback(
        throttle((event: React.UIEvent<HTMLDivElement>) => {
            const scrollTop = event.currentTarget.scrollTop;
            setScrollTop(scrollTop);
            onScroll?.(scrollTop);

            // Check if we've reached the end
            const scrollHeight = event.currentTarget.scrollHeight;
            const clientHeight = event.currentTarget.clientHeight;
            const scrollProgress = (scrollTop + clientHeight) / scrollHeight;

            if (scrollProgress >= endReachedThreshold && !endReachedRef.current) {
                endReachedRef.current = true;
                onEndReached?.();
            } else if (scrollProgress < endReachedThreshold) {
                endReachedRef.current = false;
            }
        }, 16), // ~60fps
        [onScroll, onEndReached, endReachedThreshold]
    );

    // Reset end reached flag when items change
    useEffect(() => {
        endReachedRef.current = false;
    }, [items.length]);

    // Calculate total height
    const totalHeight = items.length * itemHeight;

    // Generate visible items
    const visibleItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
        if (items[i]) {
            visibleItems.push({
                item: items[i],
                index: i,
                key: keyExtractor(items[i], i),
            });
        }
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                'overflow-auto',
                touchOptimized.scroll.momentum,
                'scrollbar-hide',
                className
            )}
            style={{ height: containerHeight }}
            onScroll={handleScroll}
        >
            {/* Total height container */}
            <div style={{ height: totalHeight, position: 'relative' }}>
                {/* Visible items */}
                {visibleItems.map(({ item, index, key }) => (
                    <div
                        key={key}
                        style={{
                            position: 'absolute',
                            top: index * itemHeight,
                            left: 0,
                            right: 0,
                            height: itemHeight,
                        }}
                        className="will-change-transform"
                    >
                        {renderItem(item, index)}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Hook for dynamic item heights (more complex but better for varied content)
export function useDynamicVirtualList<T>({
    items,
    estimatedItemHeight = 100,
    containerHeight,
    overscan = 5,
}: {
    items: T[];
    estimatedItemHeight?: number;
    containerHeight: number;
    overscan?: number;
}) {
    const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
    const [scrollTop, setScrollTop] = useState(0);

    const getItemHeight = useCallback((index: number) => {
        return itemHeights.get(index) ?? estimatedItemHeight;
    }, [itemHeights, estimatedItemHeight]);

    const getItemOffset = useCallback((index: number) => {
        let offset = 0;
        for (let i = 0; i < index; i++) {
            offset += getItemHeight(i);
        }
        return offset;
    }, [getItemHeight]);

    const getTotalHeight = useCallback(() => {
        return getItemOffset(items.length);
    }, [getItemOffset, items.length]);

    const getVisibleRange = useCallback(() => {
        let startIndex = 0;
        let endIndex = 0;
        let accumulatedHeight = 0;

        // Find start index
        for (let i = 0; i < items.length; i++) {
            if (accumulatedHeight + getItemHeight(i) > scrollTop) {
                startIndex = i;
                break;
            }
            accumulatedHeight += getItemHeight(i);
        }

        // Find end index
        accumulatedHeight = getItemOffset(startIndex);
        for (let i = startIndex; i < items.length; i++) {
            if (accumulatedHeight > scrollTop + containerHeight) {
                endIndex = i;
                break;
            }
            accumulatedHeight += getItemHeight(i);
            endIndex = i;
        }

        return {
            startIndex: Math.max(0, startIndex - overscan),
            endIndex: Math.min(items.length - 1, endIndex + overscan),
        };
    }, [scrollTop, containerHeight, items.length, getItemHeight, getItemOffset, overscan]);

    const setItemHeight = useCallback((index: number, height: number) => {
        setItemHeights(prev => {
            const newMap = new Map(prev);
            newMap.set(index, height);
            return newMap;
        });
    }, []);

    return {
        scrollTop,
        setScrollTop,
        getItemHeight,
        getItemOffset,
        getTotalHeight,
        getVisibleRange,
        setItemHeight,
    };
}

export default VirtualList; 