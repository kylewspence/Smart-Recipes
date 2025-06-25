"use client";

import { motion } from "framer-motion";
import React from "react";
import { cn } from "@/lib/utils";

interface BlurFadeProps {
    children: React.ReactNode;
    className?: string;
    variant?: {
        hidden: { y: number; opacity: number; filter: string };
        visible: { y: number; opacity: number; filter: string };
    };
    duration?: number;
    delay?: number;
    yOffset?: number;
    inView?: boolean;
    inViewMargin?: string;
    blur?: string;
}

const BlurFade: React.FC<BlurFadeProps> = ({
    children,
    className,
    variant,
    duration = 0.4,
    delay = 0,
    yOffset = 6,
    inView = false,
    inViewMargin = "-50px",
    blur = "6px",
}) => {
    const defaultVariant = {
        hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
        visible: { y: 0, opacity: 1, filter: "blur(0px)" },
    };

    const combinedVariant = variant || defaultVariant;

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={combinedVariant}
            transition={{
                delay: 0.04 + delay,
                duration,
                ease: "easeOut",
            }}
            className={cn(className)}
        >
            {children}
        </motion.div>
    );
};

export default BlurFade;

// Hook for using with Intersection Observer
export const BlurFadeInView: React.FC<BlurFadeProps> = ({
    children,
    className,
    variant,
    duration = 0.4,
    delay = 0,
    yOffset = 6,
    inViewMargin = "-50px",
    blur = "6px",
}) => {
    const defaultVariant = {
        hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
        visible: { y: 0, opacity: 1, filter: "blur(0px)" },
    };

    const combinedVariant = variant || defaultVariant;

    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: inViewMargin }}
            variants={combinedVariant}
            transition={{
                delay: 0.04 + delay,
                duration,
                ease: "easeOut",
            }}
            className={cn(className)}
        >
            {children}
        </motion.div>
    );
}; 