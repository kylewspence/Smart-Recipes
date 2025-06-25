'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, Sparkles, X, Lightbulb, Utensils, Timer } from 'lucide-react';

interface RecipeGenerationLoadingProps {
    onCancel?: () => void;
    estimatedTime?: number; // in seconds
    recipeType?: string;
}

// Cooking tips that rotate during loading
const COOKING_TIPS = [
    "💡 Always taste your food as you cook - seasoning can make or break a dish!",
    "🔥 Let your pan heat up before adding oil for better non-stick results",
    "🧂 Salt your pasta water - it should taste like the sea!",
    "🥄 Mise en place: prepare all ingredients before you start cooking",
    "🌡️ Use a meat thermometer for perfectly cooked proteins every time",
    "🧄 Crush garlic with the flat side of your knife for easier peeling",
    "🍋 Add acid (lemon, vinegar) at the end to brighten up flavors",
    "🔪 Keep your knives sharp - a sharp knife is a safe knife",
    "🧅 Cry less when cutting onions by chilling them first",
    "🍳 Don't overcrowd your pan - give ingredients room to breathe",
    "🧈 Room temperature butter creams better for baking",
    "🥩 Let meat rest after cooking to redistribute juices"
];

const GENERATION_STAGES = [
    { label: "Analyzing preferences", icon: "🔍", duration: 15 },
    { label: "Finding perfect ingredients", icon: "🥕", duration: 25 },
    { label: "Crafting cooking method", icon: "👨‍🍳", duration: 30 },
    { label: "Perfecting the recipe", icon: "✨", duration: 30 }
];

export default function RecipeGenerationLoading({
    onCancel,
    estimatedTime = 45,
    recipeType = "recipe"
}: RecipeGenerationLoadingProps) {
    const [currentStage, setCurrentStage] = useState(0);
    const [progress, setProgress] = useState(0);
    const [currentTip, setCurrentTip] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(estimatedTime);
    const [showCancel, setShowCancel] = useState(false);

    // Progress simulation
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                const newProgress = prev + (100 / (estimatedTime * 10)); // Update every 100ms

                // Update stage based on progress
                const stageProgress = newProgress / 100 * GENERATION_STAGES.length;
                setCurrentStage(Math.min(Math.floor(stageProgress), GENERATION_STAGES.length - 1));

                return Math.min(newProgress, 95); // Cap at 95% until actual completion
            });
        }, 100);

        return () => clearInterval(interval);
    }, [estimatedTime]);

    // Time remaining countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeRemaining(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Rotate cooking tips
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTip(prev => (prev + 1) % COOKING_TIPS.length);
        }, 4000); // Change tip every 4 seconds

        return () => clearInterval(interval);
    }, []);

    // Show cancel button after 10 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowCancel(true);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 relative overflow-hidden"
        >
            {/* Background Animation */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-orange-500/5 to-red-600/5 rounded-full animate-spin"
                    style={{ animationDuration: '20s' }} />
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-yellow-500/5 to-orange-600/5 rounded-full animate-spin"
                    style={{ animationDuration: '25s', animationDirection: 'reverse' }} />
            </div>

            {/* Cancel Button */}
            <AnimatePresence>
                {showCancel && onCancel && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={onCancel}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
                        title="Cancel generation"
                    >
                        <X className="w-5 h-5" />
                    </motion.button>
                )}
            </AnimatePresence>

            <div className="relative z-10">
                {/* Main Animation */}
                <div className="text-center mb-8">
                    <motion.div
                        className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center relative"
                        animate={{
                            rotate: [0, 360],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{
                            rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                            scale: { duration: 2, repeat: Infinity }
                        }}
                    >
                        <ChefHat className="w-10 h-10 text-white" />
                        <motion.div
                            className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center"
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            <Sparkles className="w-3 h-3 text-yellow-800" />
                        </motion.div>
                    </motion.div>

                    <motion.h3
                        className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        Crafting Your Perfect {recipeType}
                    </motion.h3>

                    <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400">
                        <Timer className="w-4 h-4" />
                        <span>Estimated time: {formatTime(timeRemaining)}</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {GENERATION_STAGES[currentStage]?.label}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {Math.round(progress)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-orange-500 to-red-600 rounded-full relative"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        >
                            <motion.div
                                className="absolute inset-0 bg-white/30"
                                animate={{ x: [-100, 200] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            />
                        </motion.div>
                    </div>
                </div>

                {/* Current Stage Indicator */}
                <div className="flex justify-center space-x-4 mb-8">
                    {GENERATION_STAGES.map((stage, index) => (
                        <motion.div
                            key={index}
                            className={`flex flex-col items-center space-y-2 ${index <= currentStage ? 'opacity-100' : 'opacity-40'
                                }`}
                            animate={{
                                scale: index === currentStage ? [1, 1.1, 1] : 1,
                                opacity: index <= currentStage ? 1 : 0.4
                            }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${index <= currentStage
                                    ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                }`}>
                                {stage.icon}
                            </div>
                            <span className="text-xs text-center text-gray-600 dark:text-gray-400 max-w-16">
                                {stage.label.split(' ').slice(0, 2).join(' ')}
                            </span>
                        </motion.div>
                    ))}
                </div>

                {/* Cooking Tip */}
                <motion.div
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800"
                    key={currentTip}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Lightbulb className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                                Cooking Tip
                            </h4>
                            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                {COOKING_TIPS[currentTip]}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Fun Loading Messages */}
                <div className="mt-6 text-center">
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
                    >
                        <Utensils className="w-4 h-4" />
                        <span>Our AI chef is carefully selecting the perfect ingredients...</span>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
} 