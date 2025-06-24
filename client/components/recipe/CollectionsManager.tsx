'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/contexts/AuthContext';
import { recipeService, RecipeCollection, CreateCollectionRequest } from '@/lib/services/recipe';
import { Recipe } from '@/lib/types/recipe';
import {
    Plus,
    FolderOpen,
    Edit,
    Trash2,
    BookOpen,
    Lock,
    Globe,
    X,
    Save,
    ChefHat,
    Heart,
    Clock,
    Users
} from 'lucide-react';

interface CollectionsManagerProps {
    className?: string;
    onCollectionSelect?: (collection: RecipeCollection) => void;
    selectedRecipe?: Recipe; // For adding a recipe to collection
    showCreateButton?: boolean;
}

interface CreateCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (collection: RecipeCollection) => void;
    editingCollection?: RecipeCollection;
}

const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    editingCollection
}) => {
    const [formData, setFormData] = useState<CreateCollectionRequest>({
        name: '',
        description: '',
        isPublic: false
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editingCollection) {
            setFormData({
                name: editingCollection.name,
                description: editingCollection.description || '',
                isPublic: editingCollection.isPublic
            });
        } else {
            setFormData({
                name: '',
                description: '',
                isPublic: false
            });
        }
        setError(null);
    }, [editingCollection, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError('Collection name is required');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            let result: RecipeCollection;
            if (editingCollection) {
                result = await recipeService.updateCollection(editingCollection.collectionId, formData);
            } else {
                result = await recipeService.createCollection(formData);
            }
            onSave(result);
            onClose();
        } catch (error: any) {
            setError(error.response?.data?.message || 'Failed to save collection');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {editingCollection ? 'Edit Collection' : 'Create New Collection'}
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="p-1"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Collection Name *
                            </label>
                            <input
                                value={formData.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Healthy Meals, Quick Dinners..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors duration-200"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Description (Optional)
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Describe your collection..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors duration-200 resize-none"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                id="isPublic"
                                checked={formData.isPublic}
                                onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                disabled={isLoading}
                            />
                            <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                                {formData.isPublic ? (
                                    <Globe className="w-4 h-4 mr-2 text-blue-500" />
                                ) : (
                                    <Lock className="w-4 h-4 mr-2 text-gray-500" />
                                )}
                                Make this collection public
                            </label>
                        </div>

                        {error && (
                            <div className="text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex space-x-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={isLoading || !formData.name.trim()}
                            >
                                {isLoading ? (
                                    <div className="flex items-center">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                        Saving...
                                    </div>
                                ) : (
                                    <div className="flex items-center">
                                        <Save className="w-4 h-4 mr-2" />
                                        {editingCollection ? 'Update' : 'Create'}
                                    </div>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </motion.div>
    );
};

const CollectionCard: React.FC<{
    collection: RecipeCollection;
    onEdit: () => void;
    onDelete: () => void;
    onSelect: () => void;
}> = ({ collection, onEdit, onDelete, onSelect }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
            onClick={onSelect}
        >
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center mb-2">
                            <FolderOpen className="w-5 h-5 text-orange-500 mr-2" />
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                                {collection.name}
                            </h3>
                            {collection.isPublic && (
                                <Globe className="w-4 h-4 text-blue-500 ml-2" />
                            )}
                        </div>
                        {collection.description && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-3">
                                {collection.description}
                            </p>
                        )}
                    </div>
                    <div className="flex space-x-1 ml-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                            className="p-1"
                        >
                            <Edit className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="p-1 hover:text-red-500"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center">
                            <BookOpen className="w-4 h-4 mr-1" />
                            {collection.recipeCount} recipe{collection.recipeCount !== 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {new Date(collection.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                    <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        collection.isPublic
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    )}>
                        {collection.isPublic ? 'Public' : 'Private'}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

export default function CollectionsManager({
    className,
    onCollectionSelect,
    selectedRecipe,
    showCreateButton = true
}: CollectionsManagerProps) {
    const { user } = useAuth();
    const [collections, setCollections] = useState<RecipeCollection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCollection, setEditingCollection] = useState<RecipeCollection | undefined>();

    useEffect(() => {
        if (user) {
            loadCollections();
        }
    }, [user]);

    const loadCollections = async () => {
        if (!user) return;

        setIsLoading(true);
        setError(null);

        try {
            const userCollections = await recipeService.getCollections(user.id);
            setCollections(userCollections);
        } catch (error: any) {
            setError('Failed to load collections');
            console.error('Failed to load collections:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCollection = () => {
        setEditingCollection(undefined);
        setShowCreateModal(true);
    };

    const handleEditCollection = (collection: RecipeCollection) => {
        setEditingCollection(collection);
        setShowCreateModal(true);
    };

    const handleDeleteCollection = async (collection: RecipeCollection) => {
        if (!confirm(`Are you sure you want to delete "${collection.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await recipeService.deleteCollection(collection.collectionId);
            setCollections(prev => prev.filter(c => c.collectionId !== collection.collectionId));
        } catch (error: any) {
            alert('Failed to delete collection');
            console.error('Failed to delete collection:', error);
        }
    };

    const handleSaveCollection = (savedCollection: RecipeCollection) => {
        if (editingCollection) {
            setCollections(prev => prev.map(c =>
                c.collectionId === savedCollection.collectionId ? savedCollection : c
            ));
        } else {
            setCollections(prev => [savedCollection, ...prev]);
        }
    };

    const handleSelectCollection = (collection: RecipeCollection) => {
        onCollectionSelect?.(collection);
    };

    if (!user) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">
                    Please log in to manage your recipe collections.
                </p>
            </div>
        );
    }

    return (
        <div className={cn('space-y-6', className)}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        My Collections
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Organize your favorite recipes into collections
                    </p>
                </div>
                {showCreateButton && (
                    <Button onClick={handleCreateCollection} className="flex items-center">
                        <Plus className="w-4 h-4 mr-2" />
                        New Collection
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-gray-200 dark:bg-gray-800 rounded-xl h-40 animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-8">
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <Button onClick={loadCollections} variant="outline">
                        Try Again
                    </Button>
                </div>
            ) : collections.length === 0 ? (
                <div className="text-center py-12">
                    <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        No collections yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        Create your first collection to organize your favorite recipes by theme, cuisine, or any way you like.
                    </p>
                    <Button onClick={handleCreateCollection} className="flex items-center">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Collection
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {collections.map((collection) => (
                            <CollectionCard
                                key={collection.collectionId}
                                collection={collection}
                                onEdit={() => handleEditCollection(collection)}
                                onDelete={() => handleDeleteCollection(collection)}
                                onSelect={() => handleSelectCollection(collection)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <AnimatePresence>
                <CreateCollectionModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSave={handleSaveCollection}
                    editingCollection={editingCollection}
                />
            </AnimatePresence>
        </div>
    );
} 