"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MagicCardProps {
    children: React.ReactNode;
    className?: string;
    gradientSize?: number;
    gradientColor?: string;
    gradientOpacity?: number;
}

export const MagicCard: React.FC<MagicCardProps> = ({
    children,
    className,
    gradientSize = 200,
    gradientColor = "#262626",
    gradientOpacity = 0.8,
}) => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    }, []);

    const handleMouseEnter = useCallback(() => {
        setIsHovering(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovering(false);
    }, []);

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-md transition-all duration-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-950",
                className
            )}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="relative z-10">{children}</div>
            <motion.div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(${gradientSize}px circle at ${mousePosition.x}px ${mousePosition.y}px, ${gradientColor}, transparent 100%)`,
                    opacity: isHovering ? gradientOpacity : 0,
                }}
                animate={{
                    opacity: isHovering ? gradientOpacity : 0,
                }}
                transition={{ duration: 0.3 }}
            />
            <div
                className={cn(
                    "absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-300",
                    isHovering && "opacity-100"
                )}
                style={{
                    background: `radial-gradient(${gradientSize}px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.1), transparent 100%)`,
                }}
            />
        </div>
    );
};

export default MagicCard; 