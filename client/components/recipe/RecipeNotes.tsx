import React from 'react';

interface RecipeNotesProps {
    recipeId: number;
    onNotesUpdate?: (notes: any[]) => void;
}

export default function RecipeNotes({ recipeId, onNotesUpdate }: RecipeNotesProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Recipe Notes</h3>
            <p className="text-gray-600 dark:text-gray-400">
                Notes feature coming soon...
            </p>
        </div>
    );
} 