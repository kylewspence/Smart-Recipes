'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/contexts/AuthContext';
import { recipeService, CookingSession, CookingSessionData, CookingStats } from '@/lib/services/recipe';
import { cn } from '@/lib/utils';
import {
    ChefHat,
    Clock,
    Users,
    Star,
    CheckCircle,
    XCircle,
    ThumbsUp,
    ThumbsDown,
    Calendar,
    TrendingUp,
    Award,
    Plus,
    Save,
    X
} from 'lucide-react';

interface CookingHistoryProps {
    recipeId: number;
    className?: string;
}

interface CookingSessionFormData {
    rating: number;
    notes: string;
    actualCookingTime: number;
    actualServings: number;
    success: boolean;
    wouldCookAgain: boolean;
    modifications: string;
}

export default function CookingHistory({ recipeId, className }: CookingHistoryProps) {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<CookingSession[]>([]);
    const [stats, setStats] = useState<CookingStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRecordingSession, setIsRecordingSession] = useState(false);
    const [sessionForm, setSessionForm] = useState<CookingSessionFormData>({
        rating: 5,
        notes: '',
        actualCookingTime: 0,
        actualServings: 4,
        success: true,
        wouldCookAgain: true,
        modifications: ''
    });

    // Load cooking history on component mount
    useEffect(() => {
        if (user?.userId) {
            loadCookingData();
        }
    }, [recipeId, user?.userId]);

    const loadCookingData = async () => {
        if (!user?.userId) return;

        try {
            setIsLoading(true);
            const [historyData, statsData] = await Promise.all([
                recipeService.getCookingHistory(user.userId, recipeId),
                recipeService.getCookingStats(user.userId)
            ]);
            setSessions(historyData);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load cooking data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecordSession = async () => {
        if (!user?.userId) return;

        try {
            const sessionData: CookingSessionData = {
                rating: sessionForm.rating,
                notes: sessionForm.notes.trim() || undefined,
                cookingTime: sessionForm.actualCookingTime || undefined,
                servings: sessionForm.actualServings,
                success: sessionForm.success,
                wouldCookAgain: sessionForm.wouldCookAgain,
                modifications: sessionForm.modifications.trim() ? JSON.parse(`{"notes": "${sessionForm.modifications.trim()}"}`) : undefined
            };

            const newSession = await recipeService.recordCookingSession(recipeId, sessionData);
            setSessions(prev => [newSession, ...prev]);
            setIsRecordingSession(false);

            // Reset form
            setSessionForm({
                rating: 5,
                notes: '',
                actualCookingTime: 0,
                actualServings: 4,
                success: true,
                wouldCookAgain: true,
                modifications: ''
            });

            // Reload stats
            if (user?.userId) {
                const updatedStats = await recipeService.getCookingStats(user.userId);
                setStats(updatedStats);
            }
        } catch (error) {
            console.error('Failed to record cooking session:', error);
        }
    };

    const updateSessionForm = (updates: Partial<CookingSessionFormData>) => {
        setSessionForm(prev => ({ ...prev, ...updates }));
    };

    if (!user) {
        return (
            <div className={cn("p-6 text-center text-gray-500", className)}>
                Please log in to track your cooking history.
            </div>
        );
    }

    return (
        <div className={cn("space-y-6", className)}>
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Cooking History
                </h3>
                <Button
                    onClick={() => setIsRecordingSession(true)}
                    className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={isRecordingSession}
                >
                    <Plus className="w-4 h-4" />
                    <span>Record Session</span>
                </Button>
            </div>

            {/* Cooking Stats Summary */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-2 mb-2">
                            <ChefHat className="w-5 h-5 text-orange-500" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sessions</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.stats.totalCookingSessions}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-2 mb-2">
                            <Star className="w-5 h-5 text-yellow-500" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Rating</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.stats.averageRating || 'N/A'}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.stats.totalCookingSessions > 0
                                ? Math.round((stats.stats.successfulCooks / stats.stats.totalCookingSessions) * 100)
                                : 0}%
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-2 mb-2">
                            <Clock className="w-5 h-5 text-blue-500" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Time</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.stats.averageCookingTime || 'N/A'}m
                        </p>
                    </div>
                </div>
            )}

            {/* Record New Session Modal */}
            <AnimatePresence>
                {isRecordingSession && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Record Cooking Session</h4>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsRecordingSession(false)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Rating */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    How did it turn out? (1-5 stars)
                                </label>
                                <div className="flex space-x-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => updateSessionForm({ rating: star })}
                                            className="p-1"
                                        >
                                            <Star
                                                className={cn(
                                                    'w-6 h-6 transition-colors',
                                                    sessionForm.rating >= star
                                                        ? 'fill-yellow-400 text-yellow-400'
                                                        : 'text-gray-300 dark:text-gray-600'
                                                )}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Success */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Did the recipe work well?
                                </label>
                                <div className="flex space-x-2">
                                    <Button
                                        variant={sessionForm.success ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => updateSessionForm({ success: true })}
                                        className="flex items-center space-x-1"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Yes</span>
                                    </Button>
                                    <Button
                                        variant={!sessionForm.success ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => updateSessionForm({ success: false })}
                                        className="flex items-center space-x-1"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        <span>No</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Cooking Time */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Actual cooking time (minutes)
                                </label>
                                <input
                                    type="number"
                                    value={sessionForm.actualCookingTime}
                                    onChange={(e) => updateSessionForm({ actualCookingTime: parseInt(e.target.value) || 0 })}
                                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-background text-foreground"
                                    placeholder="e.g., 45"
                                />
                            </div>

                            {/* Servings */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Actual servings made
                                </label>
                                <input
                                    type="number"
                                    value={sessionForm.actualServings}
                                    onChange={(e) => updateSessionForm({ actualServings: parseInt(e.target.value) || 4 })}
                                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-background text-foreground"
                                    placeholder="e.g., 4"
                                />
                            </div>

                            {/* Would Cook Again */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Would you cook this again?
                                </label>
                                <div className="flex space-x-2">
                                    <Button
                                        variant={sessionForm.wouldCookAgain ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => updateSessionForm({ wouldCookAgain: true })}
                                        className="flex items-center space-x-1"
                                    >
                                        <ThumbsUp className="w-4 h-4" />
                                        <span>Yes</span>
                                    </Button>
                                    <Button
                                        variant={!sessionForm.wouldCookAgain ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => updateSessionForm({ wouldCookAgain: false })}
                                        className="flex items-center space-x-1"
                                    >
                                        <ThumbsDown className="w-4 h-4" />
                                        <span>No</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Cooking notes (optional)
                            </label>
                            <textarea
                                value={sessionForm.notes}
                                onChange={(e) => updateSessionForm({ notes: e.target.value })}
                                placeholder="How did it go? Any tips for next time?"
                                className="w-full h-20 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-background text-foreground resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>

                        {/* Modifications */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                What did you change? (optional)
                            </label>
                            <textarea
                                value={sessionForm.modifications}
                                onChange={(e) => updateSessionForm({ modifications: e.target.value })}
                                placeholder="Any ingredient substitutions, technique changes, etc."
                                className="w-full h-20 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-background text-foreground resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>

                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsRecordingSession(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleRecordSession}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Session
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cooking Sessions History */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        </div>
                    ))}
                </div>
            ) : sessions.length > 0 ? (
                <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Recent Sessions</h4>
                    {sessions.map((session) => (
                        <motion.div
                            key={session.historyId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={cn(
                                                    'w-4 h-4',
                                                    (session.rating || 0) >= star
                                                        ? 'fill-yellow-400 text-yellow-400'
                                                        : 'text-gray-300 dark:text-gray-600'
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                        {session.success ? (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-500" />
                                        )}
                                        <span>{session.success ? 'Success' : 'Had issues'}</span>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500">
                                    {new Date(session.cookedAt).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                                {session.cookingTime && (
                                    <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                                        <Clock className="w-4 h-4" />
                                        <span>{session.cookingTime}m</span>
                                    </div>
                                )}
                                {session.servings && (
                                    <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                                        <Users className="w-4 h-4" />
                                        <span>{session.servings} servings</span>
                                    </div>
                                )}
                                <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                                    {session.wouldCookAgain ? (
                                        <>
                                            <ThumbsUp className="w-4 h-4 text-green-500" />
                                            <span>Would cook again</span>
                                        </>
                                    ) : (
                                        <>
                                            <ThumbsDown className="w-4 h-4 text-red-500" />
                                            <span>Wouldn't repeat</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {session.notes && (
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-2">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {session.notes}
                                    </p>
                                </div>
                            )}

                            {session.modifications && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                                    <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-1">
                                        Modifications:
                                    </p>
                                    <p className="text-sm text-orange-700 dark:text-orange-400">
                                        {typeof session.modifications === 'string'
                                            ? session.modifications
                                            : JSON.stringify(session.modifications)}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <ChefHat className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium mb-1">No cooking sessions yet</p>
                    <p className="text-sm">Record your first cooking session to start tracking your progress!</p>
                </div>
            )}
        </div>
    );
} 