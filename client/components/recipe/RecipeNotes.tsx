'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/contexts/AuthContext';
import { recipeService, RecipeNote, NoteType } from '@/lib/services/recipe';
import { cn } from '@/lib/utils';
import {
    MessageCircle,
    Edit3,
    Lightbulb,
    Star,
    Plus,
    Trash2,
    Save,
    X,
    Lock,
    Unlock
} from 'lucide-react';

interface RecipeNotesProps {
    recipeId: number;
    className?: string;
}

const NOTE_TYPES: Array<{
    type: NoteType;
    label: string;
    icon: React.ReactNode;
    description: string;
    color: string;
}> = [
        {
            type: 'personal',
            label: 'Personal Notes',
            icon: <MessageCircle className="w-4 h-4" />,
            description: 'Your personal thoughts and observations',
            color: 'bg-blue-500'
        },
        {
            type: 'modification',
            label: 'Modifications',
            icon: <Edit3 className="w-4 h-4" />,
            description: 'Changes you made to the recipe',
            color: 'bg-orange-500'
        },
        {
            type: 'tip',
            label: 'Tips & Tricks',
            icon: <Lightbulb className="w-4 h-4" />,
            description: 'Helpful tips for making this recipe',
            color: 'bg-yellow-500'
        },
        {
            type: 'review',
            label: 'Review',
            icon: <Star className="w-4 h-4" />,
            description: 'Your overall review and rating notes',
            color: 'bg-green-500'
        }
    ];

export default function RecipeNotes({ recipeId, className }: RecipeNotesProps) {
    const { user } = useAuth();
    const [notes, setNotes] = useState<RecipeNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingNote, setEditingNote] = useState<{ type: NoteType; content: string; isPrivate: boolean } | null>(null);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [selectedNoteType, setSelectedNoteType] = useState<NoteType>('personal');

    // Load notes on component mount
    useEffect(() => {
        if (user?.userId) {
            loadNotes();
        }
    }, [recipeId, user?.userId]);

    const loadNotes = async () => {
        if (!user?.userId) return;

        try {
            setIsLoading(true);
            const userNotes = await recipeService.getRecipeNotes(recipeId, user.userId);
            setNotes(userNotes);
        } catch (error) {
            console.error('Failed to load notes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!user?.userId || !newNoteContent.trim()) return;

        try {
            const newNote = await recipeService.addRecipeNote(
                recipeId,
                newNoteContent.trim(),
                selectedNoteType,
                true // default to private
            );
            setNotes(prev => [...prev, newNote]);
            setNewNoteContent('');
            setIsAddingNote(false);
        } catch (error) {
            console.error('Failed to add note:', error);
        }
    };

    const handleEditNote = (note: RecipeNote) => {
        setEditingNote({
            type: note.noteType,
            content: note.note,
            isPrivate: note.isPrivate
        });
    };

    const handleSaveEdit = async (noteType: NoteType) => {
        if (!user?.userId || !editingNote) return;

        try {
            const updatedNote = await recipeService.addRecipeNote(
                recipeId,
                editingNote.content,
                noteType,
                editingNote.isPrivate
            );
            setNotes(prev => prev.map(note =>
                note.noteType === noteType ? updatedNote : note
            ));
            setEditingNote(null);
        } catch (error) {
            console.error('Failed to update note:', error);
        }
    };

    const handleDeleteNote = async (noteId: number) => {
        try {
            await recipeService.deleteRecipeNote(recipeId, noteId);
            setNotes(prev => prev.filter(note => note.noteId !== noteId));
        } catch (error) {
            console.error('Failed to delete note:', error);
        }
    };

    const getNoteByType = (type: NoteType) => {
        return notes.find(note => note.noteType === type);
    };

    if (!user) {
        return (
            <div className={cn("p-6 text-center text-gray-500", className)}>
                Please log in to add notes to this recipe.
            </div>
        );
    }

    return (
        <div className={cn("space-y-6", className)}>
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Recipe Notes
                </h3>
                <Button
                    onClick={() => setIsAddingNote(true)}
                    className="flex items-center space-x-2"
                    disabled={isAddingNote}
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Note</span>
                </Button>
            </div>

            {/* Add New Note Modal */}
            <AnimatePresence>
                {isAddingNote && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900 dark:text-white">Add New Note</h4>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsAddingNote(false)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Note Type Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Note Type
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {NOTE_TYPES.map(({ type, label, icon, color }) => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedNoteType(type)}
                                        className={cn(
                                            'flex items-center space-x-2 p-3 rounded-lg border transition-colors',
                                            selectedNoteType === type
                                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        )}
                                    >
                                        <div className={cn('w-2 h-2 rounded-full', color)} />
                                        {icon}
                                        <span className="text-sm font-medium">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Note Content */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Note Content
                            </label>
                            <textarea
                                value={newNoteContent}
                                onChange={(e) => setNewNoteContent(e.target.value)}
                                placeholder={`Add your ${NOTE_TYPES.find(t => t.type === selectedNoteType)?.label.toLowerCase()}...`}
                                className="w-full h-24 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-background text-foreground resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>

                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsAddingNote(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddNote}
                                disabled={!newNoteContent.trim()}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Note
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notes Display */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {NOTE_TYPES.map(({ type, label, icon, description, color }) => {
                        const note = getNoteByType(type);
                        const isEditing = editingNote?.type === type;

                        return (
                            <motion.div
                                key={type}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                        <div className={cn('w-3 h-3 rounded-full', color)} />
                                        {icon}
                                        <h4 className="font-semibold text-gray-900 dark:text-white">{label}</h4>
                                        {note && (
                                            <div className="flex items-center text-xs text-gray-500">
                                                {note.isPrivate ? (
                                                    <Lock className="w-3 h-3" />
                                                ) : (
                                                    <Unlock className="w-3 h-3" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {note && !isEditing && (
                                        <div className="flex space-x-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditNote(note)}
                                                className="h-8 w-8"
                                            >
                                                <Edit3 className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteNote(note.noteId)}
                                                className="h-8 w-8 text-red-500 hover:text-red-600"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {isEditing ? (
                                    <div className="space-y-3">
                                        <textarea
                                            value={editingNote.content}
                                            onChange={(e) => setEditingNote(prev =>
                                                prev ? { ...prev, content: e.target.value } : null
                                            )}
                                            className="w-full h-24 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-background text-foreground resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                        <div className="flex justify-end space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setEditingNote(null)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleSaveEdit(type)}
                                                className="bg-orange-500 hover:bg-orange-600 text-white"
                                            >
                                                Save
                                            </Button>
                                        </div>
                                    </div>
                                ) : note ? (
                                    <div className="space-y-2">
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                            {note.note}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(note.updatedAt).toLocaleDateString()} at{' '}
                                            {new Date(note.updatedAt).toLocaleTimeString()}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 text-sm italic">
                                        {description}. Click "Add Note" to get started.
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {notes.length === 0 && !isLoading && !isAddingNote && (
                <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium mb-1">No notes yet</p>
                    <p className="text-sm">Add your first note to keep track of your thoughts and modifications.</p>
                </div>
            )}
        </div>
    );
} 