'use client';

import React from 'react';

interface CookingHistoryProps {
    recipeId: number;
    onHistoryUpdate?: (history: any[]) => void;
}

export default function CookingHistory({ recipeId, onHistoryUpdate }: CookingHistoryProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Cooking History</h3>
            <p className="text-gray-600 dark:text-gray-400">
                Cooking history feature coming soon...
            </p>
        </div>
    );
} 