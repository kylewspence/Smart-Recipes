"use client";

import React, { ReactElement, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface AnimatedListProps {
    className?: string;
    children: React.ReactNode;
    delay?: number;
}

export const AnimatedList = React.memo<AnimatedListProps>(
    ({ className, children, delay = 1000 }) => {
        const [index, setIndex] = useState(0);
        const childrenArray = React.Children.toArray(children);

        useEffect(() => {
            const interval = setInterval(() => {
                setIndex((prevIndex) => (prevIndex + 1) % childrenArray.length);
            }, delay);

            return () => clearInterval(interval);
        }, [childrenArray.length, delay]);

        const itemsToShow = useMemo(
            () => childrenArray.slice(0, index + 1).reverse(),
            [index, childrenArray]
        );

        return (
            <div className={cn("flex flex-col items-center gap-4", className)}>
                <AnimatePresence>
                    {itemsToShow.map((item, idx) => (
                        <AnimatedListItem key={idx} index={idx}>
                            {item}
                        </AnimatedListItem>
                    ))}
                </AnimatePresence>
            </div>
        );
    }
);

AnimatedList.displayName = "AnimatedList";

export function AnimatedListItem({
    children,
    index,
}: {
    children: React.ReactNode;
    index: number;
}) {
    const animations = {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: 1, opacity: 1, transition: { type: "spring" } },
        exit: { scale: 0, opacity: 0 },
        transition: { type: "spring", stiffness: 350, damping: 40 },
    };

    return (
        <motion.div {...animations} layout className="mx-auto w-full">
            {children}
        </motion.div>
    );
}

// Simple list component for static animated lists
export interface SimpleAnimatedListProps {
    className?: string;
    children: React.ReactNode;
    staggerDelay?: number;
}

export const SimpleAnimatedList: React.FC<SimpleAnimatedListProps> = ({
    className,
    children,
    staggerDelay = 0.1,
}) => {
    const childrenArray = React.Children.toArray(children);

    return (
        <div className={cn("flex flex-col gap-4", className)}>
            {childrenArray.map((child, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.5,
                        delay: index * staggerDelay,
                        ease: "easeOut",
                    }}
                >
                    {child}
                </motion.div>
            ))}
        </div>
    );
};

export default AnimatedList; 