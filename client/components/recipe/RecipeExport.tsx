'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Download, FileText, Code, Printer, FileImage, Calendar, Eye, X } from 'lucide-react';

interface Recipe {
    recipeId: number;
    title: string;
    description?: string;
    cuisine?: string;
    difficulty?: string;
    cookingTime?: number;
    prepTime?: number;
    servings?: number;
    ingredients?: string[];
    instructions?: string[];
    tags?: string[];
}

interface RecipeExport {
    exportId: number;
    exportType: 'personal' | 'share';
    exportFormat: 'json' | 'text' | 'html' | 'pdf-data';
    createdAt: string;
    title: string;
    exportData?: any;
}

interface RecipeExportProps {
    recipe: Recipe;
}

const RecipeExport: React.FC<RecipeExportProps> = ({ recipe }) => {
    const { user } = useAuth();
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [exportFormat, setExportFormat] = useState<'json' | 'text' | 'html' | 'pdf-data'>('json');
    const [exportHistory, setExportHistory] = useState<RecipeExport[]>([]);

    // Load export history
    const loadExportHistory = async () => {
        if (!user) return;

        try {
            const response = await fetch(`/api/users/${user.userId}/exports`);
            const data = await response.json();

            if (data.success) {
                // Filter exports for this specific recipe
                const recipeExports = data.data.filter((exp: RecipeExport) =>
                    exp.title === recipe.title // Simple match by title for now
                );
                setExportHistory(recipeExports);
            }
        } catch (error) {
            console.error('Error loading export history:', error);
        }
    };

    React.useEffect(() => {
        if (isHistoryDialogOpen) {
            loadExportHistory();
        }
    }, [isHistoryDialogOpen, user]);

    const handleExport = async () => {
        if (!user) {
            alert('You must be logged in to export recipes');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`/api/recipes/${recipe.recipeId}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: user.userId,
                    exportType: 'personal',
                    exportFormat
                })
            });

            const data = await response.json();

            if (data.success) {
                const exportData = data.exportData;

                // Create download based on format
                let blob: Blob;
                let filename: string;

                switch (exportFormat) {
                    case 'json':
                        blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                        filename = `${recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
                        break;

                    case 'text':
                        blob = new Blob([exportData], { type: 'text/plain' });
                        filename = `${recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
                        break;

                    case 'html':
                        blob = new Blob([exportData], { type: 'text/html' });
                        filename = `${recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
                        break;

                    case 'pdf-data':
                        // For PDF data, we'll create a JSON file with the structured data
                        blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                        filename = `${recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_pdf_data.json`;
                        break;

                    default:
                        throw new Error('Unsupported export format');
                }

                // Create download link
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                alert(`Recipe exported as ${exportFormat.toUpperCase()}!`);
                setIsExportDialogOpen(false);

                // Refresh export history if dialog is open
                if (isHistoryDialogOpen) {
                    loadExportHistory();
                }
            } else {
                alert(data.message || 'Failed to export recipe');
            }
        } catch (error) {
            console.error('Error exporting recipe:', error);
            alert('Failed to export recipe');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrintRecipe = async () => {
        if (!user) {
            alert('You must be logged in to print recipes');
            return;
        }

        try {
            const response = await fetch(`/api/recipes/${recipe.recipeId}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: user.userId,
                    exportType: 'personal',
                    exportFormat: 'html'
                })
            });

            const data = await response.json();

            if (data.success) {
                // Open print-friendly HTML in new window
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(data.exportData);
                    printWindow.document.close();
                    printWindow.focus();
                    printWindow.print();
                }

                alert('Recipe opened for printing!');
            } else {
                alert(data.message || 'Failed to prepare recipe for printing');
            }
        } catch (error) {
            console.error('Error preparing recipe for print:', error);
            alert('Failed to prepare recipe for printing');
        }
    };

    const getFormatIcon = (format: string) => {
        switch (format) {
            case 'json': return <Code className="h-4 w-4" />;
            case 'text': return <FileText className="h-4 w-4" />;
            case 'html': return <Eye className="h-4 w-4" />;
            case 'pdf-data': return <FileImage className="h-4 w-4" />;
            default: return <Download className="h-4 w-4" />;
        }
    };

    const getFormatColor = (format: string) => {
        switch (format) {
            case 'json': return 'bg-blue-100 text-blue-800';
            case 'text': return 'bg-gray-100 text-gray-800';
            case 'html': return 'bg-green-100 text-green-800';
            case 'pdf-data': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getFormatDescription = (format: string) => {
        switch (format) {
            case 'json': return 'Machine-readable format with all recipe data';
            case 'text': return 'Simple text format for easy reading';
            case 'html': return 'Web page format for viewing and printing';
            case 'pdf-data': return 'Structured data ready for PDF generation';
            default: return 'Export format';
        }
    };

    return (
        <div className="flex gap-2">
            {/* Export Recipe Button */}
            <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Export Recipe
            </Button>

            {/* Export History Button */}
            <Button variant="outline" size="sm" onClick={() => setIsHistoryDialogOpen(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Export History
            </Button>

            {/* Export Modal */}
            <AnimatePresence>
                {isExportDialogOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setIsExportDialogOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Export Recipe</h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsExportDialogOpen(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Export Format
                                    </label>
                                    <select
                                        value={exportFormat}
                                        onChange={(e) => setExportFormat(e.target.value as any)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    >
                                        <option value="json">JSON Format - Machine-readable data</option>
                                        <option value="text">Text Format - Simple readable text</option>
                                        <option value="html">HTML Format - Web page format</option>
                                        <option value="pdf-data">PDF Data - Structured for PDF</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {getFormatDescription(exportFormat)}
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleExport}
                                        disabled={isLoading}
                                        className="flex-1"
                                    >
                                        {isLoading ? 'Exporting...' : 'Download Export'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handlePrintRecipe}
                                        className="flex items-center gap-2"
                                    >
                                        <Printer className="h-4 w-4" />
                                        Print
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Export History Modal */}
            <AnimatePresence>
                {isHistoryDialogOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setIsHistoryDialogOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Export History</h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsHistoryDialogOpen(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {exportHistory.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No exports created yet</p>
                                        <p className="text-sm">Export a recipe to get started</p>
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {exportHistory.map((exportItem) => (
                                            <motion.div
                                                key={exportItem.exportId}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                                                            getFormatColor(exportItem.exportFormat)
                                                        )}>
                                                            {getFormatIcon(exportItem.exportFormat)}
                                                            <span className="uppercase">{exportItem.exportFormat}</span>
                                                        </span>
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800 capitalize">
                                                            {exportItem.exportType}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {new Date(exportItem.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium">{exportItem.title}</p>
                                                        <p className="text-sm text-gray-500">
                                                            {getFormatDescription(exportItem.exportFormat)}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <Calendar className="h-4 w-4" />
                                                        {new Date(exportItem.createdAt).toLocaleString()}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RecipeExport; 