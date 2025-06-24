'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Plus, Minus, Clock, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MagicCard, ShimmerButton, NumberTicker } from '@/components/magicui';

interface Timer {
    id: string;
    name: string;
    duration: number; // in seconds
    remaining: number; // in seconds
    isRunning: boolean;
    isCompleted: boolean;
}

interface CookingTimerProps {
    className?: string;
    onTimerComplete?: (timerName: string) => void;
    presetTimers?: Array<{ name: string; duration: number }>;
}

const DEFAULT_PRESETS = [
    { name: 'Soft Boiled Egg', duration: 360 }, // 6 minutes
    { name: 'Hard Boiled Egg', duration: 720 }, // 12 minutes
    { name: 'Pasta Al Dente', duration: 480 }, // 8 minutes
    { name: 'Rice Cooking', duration: 1080 }, // 18 minutes
    { name: 'Bread Rising', duration: 3600 }, // 1 hour
    { name: 'Quick Rest', duration: 300 }, // 5 minutes
];

export default function CookingTimer({
    className,
    onTimerComplete,
    presetTimers = DEFAULT_PRESETS
}: CookingTimerProps) {
    const [timers, setTimers] = useState<Timer[]>([]);
    const [newTimerName, setNewTimerName] = useState('');
    const [newTimerMinutes, setNewTimerMinutes] = useState(10);
    const [showAddTimer, setShowAddTimer] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Update timers every second
        intervalRef.current = setInterval(() => {
            setTimers(prevTimers => {
                return prevTimers.map(timer => {
                    if (timer.isRunning && timer.remaining > 0) {
                        const newRemaining = timer.remaining - 1;
                        if (newRemaining === 0) {
                            // Timer completed
                            onTimerComplete?.(timer.name);
                            // Play notification sound (browser API)
                            if ('Notification' in window && Notification.permission === 'granted') {
                                new Notification(`Timer Complete: ${timer.name}`, {
                                    icon: '/favicon.ico',
                                    body: 'Your cooking timer has finished!'
                                });
                            }
                            return { ...timer, remaining: 0, isRunning: false, isCompleted: true };
                        }
                        return { ...timer, remaining: newRemaining };
                    }
                    return timer;
                });
            });
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [onTimerComplete]);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const addTimer = (name: string, duration: number) => {
        const newTimer: Timer = {
            id: Date.now().toString(),
            name,
            duration,
            remaining: duration,
            isRunning: false,
            isCompleted: false
        };
        setTimers(prev => [...prev, newTimer]);
        setNewTimerName('');
        setNewTimerMinutes(10);
        setShowAddTimer(false);
    };

    const startPauseTimer = (id: string) => {
        setTimers(prev => prev.map(timer =>
            timer.id === id
                ? { ...timer, isRunning: !timer.isRunning, isCompleted: false }
                : timer
        ));
    };

    const resetTimer = (id: string) => {
        setTimers(prev => prev.map(timer =>
            timer.id === id
                ? { ...timer, remaining: timer.duration, isRunning: false, isCompleted: false }
                : timer
        ));
    };

    const removeTimer = (id: string) => {
        setTimers(prev => prev.filter(timer => timer.id !== id));
    };

    const getTimerProgress = (timer: Timer): number => {
        return ((timer.duration - timer.remaining) / timer.duration) * 100;
    };

    const getTimerColor = (timer: Timer): string => {
        if (timer.isCompleted) return '#10b981'; // green
        if (timer.remaining <= 60) return '#ef4444'; // red for last minute
        if (timer.remaining <= 300) return '#f59e0b'; // yellow for last 5 minutes
        return '#3b82f6'; // blue for normal
    };

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Cooking Timers
                </h3>
                <ShimmerButton
                    onClick={() => setShowAddTimer(!showAddTimer)}
                    className="px-4 py-2"
                    background="linear-gradient(45deg, #3b82f6, #1d4ed8)"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Timer
                </ShimmerButton>
            </div>

            {/* Add new timer form */}
            <AnimatePresence>
                {showAddTimer && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <MagicCard className="p-4" gradientColor="#3b82f6" gradientOpacity={0.1}>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={newTimerName}
                                    onChange={(e) => setNewTimerName(e.target.value)}
                                    placeholder="Timer name (e.g., 'Pasta cooking')"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                                />
                                <div className="flex items-center space-x-3">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Minutes:
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setNewTimerMinutes(Math.max(1, newTimerMinutes - 1))}
                                            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <NumberTicker
                                            value={newTimerMinutes}
                                            className="w-12 text-center font-mono text-lg"
                                        />
                                        <button
                                            onClick={() => setNewTimerMinutes(newTimerMinutes + 1)}
                                            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <ShimmerButton
                                        onClick={() => addTimer(newTimerName || 'Timer', newTimerMinutes * 60)}
                                        className="flex-1"
                                        background="linear-gradient(45deg, #10b981, #059669)"
                                    >
                                        Create Timer
                                    </ShimmerButton>
                                    <button
                                        onClick={() => setShowAddTimer(false)}
                                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </MagicCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Preset timers */}
            {timers.length === 0 && !showAddTimer && (
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Quick start with preset timers:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {presetTimers.map((preset) => (
                            <button
                                key={preset.name}
                                onClick={() => addTimer(preset.name, preset.duration)}
                                className="p-3 text-left bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                            >
                                <div className="font-medium text-sm text-gray-900 dark:text-white">
                                    {preset.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatTime(preset.duration)}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Active timers */}
            <div className="space-y-3">
                <AnimatePresence>
                    {timers.map((timer) => (
                        <motion.div
                            key={timer.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            layout
                        >
                            <MagicCard
                                className="p-4"
                                gradientColor={getTimerColor(timer)}
                                gradientOpacity={timer.isCompleted ? 0.2 : 0.1}
                            >
                                <div className="space-y-3">
                                    {/* Timer header */}
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                            {timer.name}
                                        </h4>
                                        <button
                                            onClick={() => removeTimer(timer.id)}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                            ×
                                        </button>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: getTimerColor(timer) }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${getTimerProgress(timer)}%` }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>

                                    {/* Time display */}
                                    <div className="text-center">
                                        <div className={cn(
                                            'text-3xl font-mono font-bold',
                                            timer.isCompleted
                                                ? 'text-green-600 dark:text-green-400'
                                                : timer.remaining <= 60
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : 'text-gray-900 dark:text-white'
                                        )}>
                                            {timer.isCompleted ? (
                                                <div className="flex items-center justify-center">
                                                    <Bell className="w-8 h-8 mr-2" />
                                                    Done!
                                                </div>
                                            ) : (
                                                formatTime(timer.remaining)
                                            )}
                                        </div>
                                        {!timer.isCompleted && (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                of {formatTime(timer.duration)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Controls */}
                                    <div className="flex justify-center space-x-3">
                                        <motion.button
                                            onClick={() => startPauseTimer(timer.id)}
                                            className={cn(
                                                'p-3 rounded-full transition-colors duration-200',
                                                timer.isRunning
                                                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                            )}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            disabled={timer.isCompleted}
                                        >
                                            {timer.isRunning ? (
                                                <Pause className="w-5 h-5" />
                                            ) : (
                                                <Play className="w-5 h-5" />
                                            )}
                                        </motion.button>
                                        <motion.button
                                            onClick={() => resetTimer(timer.id)}
                                            className="p-3 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-colors duration-200"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <RotateCcw className="w-5 h-5" />
                                        </motion.button>
                                    </div>
                                </div>
                            </MagicCard>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
} 