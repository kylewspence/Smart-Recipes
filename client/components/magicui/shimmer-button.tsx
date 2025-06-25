"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps {
    children: React.ReactNode;
    className?: string;
    shimmerColor?: string;
    shimmerSize?: string;
    borderRadius?: string;
    shimmerDuration?: string;
    background?: string;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
}

export const ShimmerButton: React.FC<ShimmerButtonProps> = ({
    children,
    className,
    shimmerColor = "#ffffff",
    shimmerSize = "150px",
    borderRadius = "8px",
    shimmerDuration = "3s",
    background = "linear-gradient(45deg, #FF6B6B, #4ECDC4)",
    onClick,
    disabled = false,
    type = "button",
}) => {
    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "group relative inline-flex items-center justify-center overflow-hidden rounded-lg px-6 py-3 font-medium text-white transition-all duration-300 ease-out hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed",
                className
            )}
            style={{
                background,
                borderRadius,
            }}
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
        >
            <span className="absolute inset-0 h-full w-full">
                <span
                    className="absolute inset-0 h-full w-full animate-pulse opacity-30"
                    style={{
                        background: `linear-gradient(45deg, transparent 30%, ${shimmerColor} 50%, transparent 70%)`,
                        backgroundSize: shimmerSize,
                        animation: `shimmer ${shimmerDuration} infinite`,
                    }}
                />
            </span>
            <span className="relative z-10 flex items-center gap-2">
                {children}
            </span>

            <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
        </motion.button>
    );
};

export default ShimmerButton; 