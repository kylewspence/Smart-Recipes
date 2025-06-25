'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Check,
    X,
    Trash2,
    FolderPlus,
    Heart,
    Bookmark,
    Download,
    Share2,
    Archive
} from 'lucide-react';
import { Recipe } from '@/lib/types/recipe';
import { RecipeCollection } from '@/lib/services/recipe';

interface BulkRecipeActionsProps {
    selectedRecipes: number[];
    recipes: Recipe[];
    collections: RecipeCollection[];
    onSelectAll: () => void;
    onClearSelection: () => void;
    onDeleteSelected: (recipeIds: number[]) => Promise<void>;
    onAddToCollection: (recipeIds: number[], collectionId: number) => Promise<void>;
    onRemoveFromCollection?: (recipeIds: number[]) => Promise<void>;
    onExportSelected: (recipeIds: number[]) => void;
    isInCollection?: boolean;
}

export default function BulkRecipeActions({
    selectedRecipes,
    recipes,
    collections,
    onSelectAll,
    onClearSelection,
    onDeleteSelected,
    onAddToCollection,
    onRemoveFromCollection,
    onExportSelected,
    isInCollection = false
}: BulkRecipeActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showCollectionMenu, setShowCollectionMenu] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const selectedCount = selectedRecipes.length;
    const totalCount = recipes.length;
    const allSelected = selectedCount === totalCount && totalCount > 0;

    const handleDeleteSelected = async () => {
        setIsLoading(true);
        try {
            await onDeleteSelected(selectedRecipes);
            onClearSelection();
            setShowDeleteConfirm(false);
        } catch (error) {
            console.error('Failed to delete recipes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToCollection = async (collectionId: number) => {
        setIsLoading(true);
        try {
            await onAddToCollection(selectedRecipes, collectionId);
            onClearSelection();
            setShowCollectionMenu(false);
        } catch (error) {
            console.error('Failed to add to collection:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveFromCollection = async () => {
        if (!onRemoveFromCollection) return;

        setIsLoading(true);
        try {
            await onRemoveFromCollection(selectedRecipes);
            onClearSelection();
        } catch (error) {
            console.error('Failed to remove from collection:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (selectedCount === 0) {
        return null;
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
            >
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-6 py-4">
                    <div className="flex items-center space-x-4">
                        {/* Selection Info */}
                        <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {selectedCount} selected
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                            {/* Select All / Clear */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={allSelected ? onClearSelection : onSelectAll}
                                disabled={isLoading}
                            >
                                {allSelected ? 'Clear All' : 'Select All'}
                            </Button>

                            {/* Add to Collection */}
                            <div className="relative">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowCollectionMenu(!showCollectionMenu)}
                                    disabled={isLoading}
                                    className="flex items-center"
                                >
                                    <FolderPlus className="w-4 h-4 mr-1" />
                                    Add to Collection
                                </Button>

                                <AnimatePresence>
                                    {showCollectionMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute bottom-full mb-2 left-0 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
                                        >
                                            <div className="p-2 max-h-48 overflow-y-auto">
                                                {collections.length === 0 ? (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 p-2">
                                                        No collections available
                                                    </p>
                                                ) : (
                                                    collections.map((collection) => (
                                                        <button
                                                            key={collection.collectionId}
                                                            onClick={() => handleAddToCollection(collection.collectionId)}
                                                            disabled={isLoading}
                                                            className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                        >
                                                            <div className="font-medium">{collection.name}</div>
                                                            {collection.description && (
                                                                <div className="text-gray-500 dark:text-gray-400 text-xs">
                                                                    {collection.description}
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Remove from Collection (if in collection view) */}
                            {isInCollection && onRemoveFromCollection && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRemoveFromCollection}
                                    disabled={isLoading}
                                    className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <Archive className="w-4 h-4 mr-1" />
                                    Remove from Collection
                                </Button>
                            )}

                            {/* Export */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onExportSelected(selectedRecipes)}
                                disabled={isLoading}
                                className="flex items-center"
                            >
                                <Download className="w-4 h-4 mr-1" />
                                Export
                            </Button>

                            {/* Delete */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={isLoading}
                                className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                            </Button>

                            {/* Clear Selection */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClearSelection}
                                disabled={isLoading}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Delete {selectedCount} Recipe{selectedCount > 1 ? 's' : ''}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Are you sure you want to delete {selectedCount} selected recipe{selectedCount > 1 ? 's' : ''}?
                                This action cannot be undone.
                            </p>
                            <div className="flex space-x-3 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteSelected}
                                    disabled={isLoading}
                                    className="flex items-center"
                                >
                                    {isLoading ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    ) : (
                                        <Trash2 className="w-4 h-4 mr-2" />
                                    )}
                                    Delete
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Collection Menu Backdrop */}
            {showCollectionMenu && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowCollectionMenu(false)}
                />
            )}
        </>
    );
} 