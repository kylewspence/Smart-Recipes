"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { preferencesService } from '@/lib/services/preferences';
import { UserPreferences } from '@/lib/types/preferences';
import { Button } from '@/components/ui/button';
import {
    downloadPreferences,
    parseImportFile,
    validateImportedPreferences,
    applyPresetTemplate,
    generateShareableLink,
    copyToClipboard,
    PREFERENCE_TEMPLATES,
    PreferenceTemplate
} from '@/lib/utils/preference-import-export';

interface PreferenceChanges {
    dietary: boolean;
    cooking: boolean;
    ingredients: boolean;
}

export default function PreferenceManager() {
    const { user } = useAuth();

    // State management
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);
    const [originalPreferences, setOriginalPreferences] = useState<UserPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changes, setChanges] = useState<PreferenceChanges>({
        dietary: false,
        cooking: false,
        ingredients: false
    });
    const [activeTab, setActiveTab] = useState<'dietary' | 'cooking' | 'ingredients' | 'import-export'>('dietary');
    const [message, setMessage] = useState<string>('');

    // Import/Export state
    const [importPreview, setImportPreview] = useState<UserPreferences | null>(null);
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [shareLink, setShareLink] = useState<string>('');
    const [selectedTemplate, setSelectedTemplate] = useState<PreferenceTemplate | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load user preferences
    const loadPreferences = useCallback(async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            const userPrefs = await preferencesService.getUserPreferences(user.userId.toString());
            setPreferences(userPrefs);
            setOriginalPreferences(JSON.parse(JSON.stringify(userPrefs))); // Deep copy
            setChanges({ dietary: false, cooking: false, ingredients: false });
        } catch (error: any) {
            console.error('Failed to load preferences:', error);
            setMessage('Failed to load your preferences. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadPreferences();
    }, [loadPreferences]);

    // Track changes
    const trackChanges = useCallback(() => {
        if (!preferences || !originalPreferences) return;

        const newChanges = {
            dietary: (
                JSON.stringify(preferences.dietaryRestrictions) !== JSON.stringify(originalPreferences.dietaryRestrictions) ||
                JSON.stringify(preferences.allergies) !== JSON.stringify(originalPreferences.allergies)
            ),
            cooking: (
                JSON.stringify(preferences.cuisinePreferences) !== JSON.stringify(originalPreferences.cuisinePreferences) ||
                preferences.spiceLevel !== originalPreferences.spiceLevel ||
                preferences.maxCookingTime !== originalPreferences.maxCookingTime ||
                preferences.servingSize !== originalPreferences.servingSize
            ),
            ingredients: (
                JSON.stringify(preferences.ingredientPreferences) !== JSON.stringify(originalPreferences.ingredientPreferences)
            )
        };

        setChanges(newChanges);
    }, [preferences, originalPreferences]);

    useEffect(() => {
        trackChanges();
    }, [trackChanges]);

    // Check if there are any changes
    const hasChanges = changes.dietary || changes.cooking || changes.ingredients;

    // Save preferences
    const savePreferences = async () => {
        if (!user?.id || !preferences) return;

        try {
            setSaving(true);
            setMessage('');

            // Save basic preferences if dietary or cooking changed
            if (changes.dietary || changes.cooking) {
                await preferencesService.updateUserPreferences(user.userId.toString(), {
                    dietaryRestrictions: preferences.dietaryRestrictions,
                    allergies: preferences.allergies,
                    cuisinePreferences: preferences.cuisinePreferences,
                    spiceLevel: preferences.spiceLevel,
                    maxCookingTime: preferences.maxCookingTime,
                    servingSize: preferences.servingSize
                });
            }

            // Save ingredient preferences if changed
            if (changes.ingredients && preferences.ingredientPreferences) {
                await preferencesService.bulkUpdateIngredientPreferences(
                    user.userId.toString(),
                    preferences.ingredientPreferences
                );
            }

            // Update original preferences to reflect saved state
            setOriginalPreferences(JSON.parse(JSON.stringify(preferences)));
            setChanges({ dietary: false, cooking: false, ingredients: false });
            setMessage('Your preferences have been saved successfully!');
        } catch (error: any) {
            console.error('Failed to save preferences:', error);
            setMessage('Failed to save your preferences. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Reset preferences
    const resetPreferences = () => {
        if (originalPreferences) {
            setPreferences(JSON.parse(JSON.stringify(originalPreferences)));
            setChanges({ dietary: false, cooking: false, ingredients: false });
            setMessage('Your preferences have been reset to the last saved state.');
        }
    };

    // Update specific preference fields
    const updateDietaryRestrictions = (restrictions: string[]) => {
        if (preferences) {
            setPreferences({ ...preferences, dietaryRestrictions: restrictions });
        }
    };

    const updateAllergies = (allergies: string[]) => {
        if (preferences) {
            setPreferences({ ...preferences, allergies: allergies });
        }
    };

    const updateCuisinePreferences = (cuisines: string[]) => {
        if (preferences) {
            setPreferences({ ...preferences, cuisinePreferences: cuisines });
        }
    };

    const updateSpiceLevel = (level: 'mild' | 'medium' | 'hot') => {
        if (preferences) {
            setPreferences({ ...preferences, spiceLevel: level });
        }
    };

    const updateCookingTime = (time: number) => {
        if (preferences) {
            setPreferences({ ...preferences, maxCookingTime: time });
        }
    };

    const updateServingSize = (size: number) => {
        if (preferences) {
            setPreferences({ ...preferences, servingSize: size });
        }
    };

    // Import/Export handlers
    const handleExport = () => {
        if (preferences && user?.userId) {
            downloadPreferences(preferences, user.userId.toString());
            setMessage('Your preferences have been exported successfully!');
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsImporting(true);
            setImportErrors([]);
            setImportPreview(null);

            const data = await parseImportFile(file);
            const validation = validateImportedPreferences(data);

            if (validation.isValid && validation.preferences) {
                setImportPreview(validation.preferences);
                setMessage('File imported successfully! Review the preview below and click "Apply Import" to save.');
            } else {
                setImportErrors(validation.errors);
                setMessage('Import failed. Please check the errors below and fix your file.');
            }
        } catch (error: any) {
            setImportErrors([error.message || 'Failed to read file']);
            setMessage('Failed to import file. Please ensure it\'s a valid JSON file.');
        } finally {
            setIsImporting(false);
            // Clear the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleApplyImport = async () => {
        if (!importPreview || !user?.id) return;

        try {
            setSaving(true);
            setMessage('');

            // Apply the imported preferences
            await preferencesService.updateUserPreferences(user.id.toString(), importPreview);

            if (importPreview.ingredientPreferences?.length) {
                await preferencesService.bulkUpdateIngredientPreferences(
                    user.id.toString(),
                    importPreview.ingredientPreferences
                );
            }

            // Reload preferences to reflect changes
            await loadPreferences();

            // Clear import state
            setImportPreview(null);
            setImportErrors([]);
            setMessage('Preferences imported and saved successfully!');
        } catch (error: any) {
            console.error('Failed to apply imported preferences:', error);
            setMessage('Failed to save imported preferences. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelImport = () => {
        setImportPreview(null);
        setImportErrors([]);
        setMessage('');
    };

    const handleApplyTemplate = async (template: PreferenceTemplate) => {
        if (!preferences) return;

        const updatedPreferences = applyPresetTemplate(template, preferences);
        setPreferences(updatedPreferences);
        setSelectedTemplate(null);
        setMessage(`"${template.name}" template applied! Don't forget to save your changes.`);
    };

    const handleGenerateShareLink = () => {
        if (preferences) {
            const link = generateShareableLink(preferences);
            setShareLink(link);
            setMessage('Share link generated! Copy the link below to share your preferences.');
        }
    };

    const handleCopyShareLink = async () => {
        if (shareLink) {
            const success = await copyToClipboard(shareLink);
            if (success) {
                setMessage('Share link copied to clipboard!');
            } else {
                setMessage('Failed to copy link. Please copy it manually.');
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading your preferences...</p>
                </div>
            </div>
        );
    }

    if (!preferences) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">No Preferences Found</h2>
                        <p className="text-muted-foreground mb-6">
                            You haven&apos;t set up your preferences yet. Complete the onboarding flow first.
                        </p>
                        <Button
                            onClick={() => window.location.href = '/preferences'}
                            className="w-full"
                        >
                            Set Up Preferences
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Manage Preferences</h1>
                            <p className="text-muted-foreground mt-2">
                                Update your dietary restrictions, cooking preferences, and ingredient choices
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            {hasChanges && (
                                <span className="text-sm bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-full">
                                    Unsaved Changes
                                </span>
                            )}

                            <Button
                                variant="outline"
                                onClick={resetPreferences}
                                disabled={!hasChanges || saving}
                            >
                                Reset
                            </Button>

                            <Button
                                onClick={savePreferences}
                                disabled={!hasChanges || saving}
                                className="min-w-[120px]"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Message Display */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg ${message.includes('success') || message.includes('saved') || message.includes('reset')
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>
                        {message}
                    </div>
                )}

                {/* Change Status Indicators */}
                {hasChanges && (
                    <div className="mb-6 p-4 border border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-orange-800 dark:text-orange-200">
                                You have unsaved changes
                            </span>
                        </div>
                        <div className="flex gap-2 text-sm">
                            {changes.dietary && <span className="bg-orange-200 dark:bg-orange-800 px-2 py-1 rounded text-xs">Dietary</span>}
                            {changes.cooking && <span className="bg-orange-200 dark:bg-orange-800 px-2 py-1 rounded text-xs">Cooking</span>}
                            {changes.ingredients && <span className="bg-orange-200 dark:bg-orange-800 px-2 py-1 rounded text-xs">Ingredients</span>}
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="mb-6">
                    <div className="flex border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setActiveTab('dietary')}
                            className={`px-4 py-2 border-b-2 font-medium text-sm ${activeTab === 'dietary'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } flex items-center gap-2`}
                        >
                            {changes.dietary && <div className="w-2 h-2 bg-orange-500 rounded-full" />}
                            Dietary
                        </button>
                        <button
                            onClick={() => setActiveTab('cooking')}
                            className={`px-4 py-2 border-b-2 font-medium text-sm ${activeTab === 'cooking'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } flex items-center gap-2`}
                        >
                            {changes.cooking && <div className="w-2 h-2 bg-orange-500 rounded-full" />}
                            Cooking
                        </button>
                        <button
                            onClick={() => setActiveTab('ingredients')}
                            className={`px-4 py-2 border-b-2 font-medium text-sm ${activeTab === 'ingredients'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } flex items-center gap-2`}
                        >
                            {changes.ingredients && <div className="w-2 h-2 bg-orange-500 rounded-full" />}
                            Ingredients
                        </button>
                        <button
                            onClick={() => setActiveTab('import-export')}
                            className={`px-4 py-2 border-b-2 font-medium text-sm ${activeTab === 'import-export'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } flex items-center gap-2`}
                        >
                            Import/Export
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    {activeTab === 'dietary' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Dietary Restrictions & Allergies</h3>
                                <p className="text-muted-foreground mb-4">
                                    Update your dietary restrictions and allergies to get personalized recipes
                                </p>
                            </div>

                            {/* Dietary Restrictions */}
                            <div>
                                <h4 className="font-medium mb-3">Dietary Restrictions</h4>
                                <div className="space-y-2">
                                    {preferences.dietaryRestrictions?.map((restriction, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <span>{restriction}</span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const updated = preferences.dietaryRestrictions?.filter((_, i) => i !== index) || [];
                                                    updateDietaryRestrictions(updated);
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                    {(!preferences.dietaryRestrictions || preferences.dietaryRestrictions.length === 0) && (
                                        <p className="text-gray-500 italic">No dietary restrictions set</p>
                                    )}
                                </div>
                            </div>

                            {/* Allergies */}
                            <div>
                                <h4 className="font-medium mb-3">Allergies</h4>
                                <div className="space-y-2">
                                    {preferences.allergies?.map((allergy, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <span>{allergy}</span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const updated = preferences.allergies?.filter((_, i) => i !== index) || [];
                                                    updateAllergies(updated);
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                    {(!preferences.allergies || preferences.allergies.length === 0) && (
                                        <p className="text-gray-500 italic">No allergies set</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'cooking' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Cooking Preferences</h3>
                                <p className="text-muted-foreground mb-4">
                                    Adjust your cuisine preferences, spice level, and cooking constraints
                                </p>
                            </div>

                            {/* Cuisine Preferences */}
                            <div>
                                <h4 className="font-medium mb-3">Cuisine Preferences</h4>
                                <div className="space-y-2">
                                    {preferences.cuisinePreferences?.map((cuisine, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <span>{cuisine}</span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const updated = preferences.cuisinePreferences?.filter((_, i) => i !== index) || [];
                                                    updateCuisinePreferences(updated);
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                    {(!preferences.cuisinePreferences || preferences.cuisinePreferences.length === 0) && (
                                        <p className="text-gray-500 italic">No cuisine preferences set</p>
                                    )}
                                </div>
                            </div>

                            {/* Spice Level */}
                            <div>
                                <h4 className="font-medium mb-3">Spice Level</h4>
                                <div className="flex gap-2">
                                    {(['mild', 'medium', 'hot'] as const).map((level) => (
                                        <Button
                                            key={level}
                                            variant={preferences.spiceLevel === level ? "default" : "outline"}
                                            onClick={() => updateSpiceLevel(level)}
                                        >
                                            {level.charAt(0).toUpperCase() + level.slice(1)}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Cooking Time */}
                            <div>
                                <h4 className="font-medium mb-3">Max Cooking Time (minutes)</h4>
                                <input
                                    type="number"
                                    min="15"
                                    max="300"
                                    value={preferences.maxCookingTime || 60}
                                    onChange={(e) => updateCookingTime(parseInt(e.target.value) || 60)}
                                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                                />
                            </div>

                            {/* Serving Size */}
                            <div>
                                <h4 className="font-medium mb-3">Serving Size</h4>
                                <input
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={preferences.servingSize || 4}
                                    onChange={(e) => updateServingSize(parseInt(e.target.value) || 4)}
                                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'ingredients' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Ingredient Preferences</h3>
                                <p className="text-muted-foreground mb-4">
                                    Manage your ingredient preferences to fine-tune recipe suggestions
                                </p>
                            </div>

                            <div className="space-y-4">
                                {preferences.ingredientPreferences?.map((pref, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span>{pref.name}</span>
                                            <span className={`px-2 py-1 rounded-full text-xs ${pref.preference === 'like' ? 'bg-green-100 text-green-800' :
                                                pref.preference === 'dislike' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {pref.preference}
                                            </span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const updated = preferences.ingredientPreferences?.filter((_, i) => i !== index) || [];
                                                setPreferences({ ...preferences, ingredientPreferences: updated });
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                                {(!preferences.ingredientPreferences || preferences.ingredientPreferences.length === 0) && (
                                    <p className="text-gray-500 italic">No ingredient preferences set</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'import-export' && (
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Import/Export & Sharing</h3>
                                <p className="text-muted-foreground mb-4">
                                    Backup your preferences, apply preset templates, or share your settings with others
                                </p>
                            </div>

                            {/* Export Section */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                    📤 Export Preferences
                                </h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Download your current preferences as a JSON file for backup or sharing.
                                </p>
                                <Button onClick={handleExport} className="w-full sm:w-auto">
                                    Download Preferences
                                </Button>
                            </div>

                            {/* Import Section */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                    📥 Import Preferences
                                </h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Upload a preferences file to restore your settings or apply someone else's preferences.
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".json"
                                            onChange={handleFileUpload}
                                            className="block w-full text-sm text-gray-500 dark:text-gray-400
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-lg file:border-0
                                                file:text-sm file:font-medium
                                                file:bg-primary file:text-primary-foreground
                                                hover:file:bg-primary/90
                                                file:cursor-pointer cursor-pointer"
                                            disabled={isImporting}
                                        />
                                    </div>

                                    {/* Import Errors */}
                                    {importErrors.length > 0 && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                            <h5 className="font-medium text-red-800 dark:text-red-200 mb-2">Import Errors:</h5>
                                            <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                                                {importErrors.map((error, index) => (
                                                    <li key={index}>{error}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Import Preview */}
                                    {importPreview && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                            <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-3">Preview Imported Preferences:</h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <strong>Dietary Restrictions:</strong>
                                                    <p className="text-muted-foreground">
                                                        {importPreview.dietaryRestrictions?.length ?
                                                            importPreview.dietaryRestrictions.join(', ') : 'None'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <strong>Allergies:</strong>
                                                    <p className="text-muted-foreground">
                                                        {importPreview.allergies?.length ?
                                                            importPreview.allergies.join(', ') : 'None'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <strong>Cuisines:</strong>
                                                    <p className="text-muted-foreground">
                                                        {importPreview.cuisinePreferences?.length ?
                                                            importPreview.cuisinePreferences.join(', ') : 'None'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <strong>Settings:</strong>
                                                    <p className="text-muted-foreground">
                                                        Spice: {importPreview.spiceLevel},
                                                        Time: {importPreview.maxCookingTime}min,
                                                        Serves: {importPreview.servingSize}
                                                    </p>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <strong>Ingredient Preferences:</strong>
                                                    <p className="text-muted-foreground">
                                                        {importPreview.ingredientPreferences?.length || 0} preferences
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-4">
                                                <Button
                                                    onClick={handleApplyImport}
                                                    disabled={saving}
                                                    className="flex-1 sm:flex-none"
                                                >
                                                    {saving ? 'Applying...' : 'Apply Import'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={handleCancelImport}
                                                    disabled={saving}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Preset Templates */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                    🎯 Preset Templates
                                </h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Quick-start with common dietary preference templates.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {PREFERENCE_TEMPLATES.map((template) => (
                                        <div
                                            key={template.id}
                                            className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                                            onClick={() => setSelectedTemplate(template)}
                                        >
                                            <h5 className="font-medium mb-2">{template.name}</h5>
                                            <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {template.tags.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleApplyTemplate(template);
                                                }}
                                            >
                                                Apply Template
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Sharing Section */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                    🔗 Share Preferences
                                </h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Generate a shareable link to your preferences for family members or friends.
                                </p>

                                <div className="space-y-4">
                                    <Button
                                        onClick={handleGenerateShareLink}
                                        variant="outline"
                                        className="w-full sm:w-auto"
                                    >
                                        Generate Share Link
                                    </Button>

                                    {shareLink && (
                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                            <label className="text-sm font-medium mb-2 block">
                                                Share Link (Copy this URL):
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={shareLink}
                                                    readOnly
                                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={handleCopyShareLink}
                                                >
                                                    Copy
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Note: This is a demo link. In production, this would create a secure shareable link.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 