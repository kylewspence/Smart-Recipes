'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Share2, Copy, Facebook, Twitter, MessageCircle, Mail, Link, Globe, Users, User, Calendar, Trash2, X } from 'lucide-react';

interface Recipe {
    recipeId: number;
    title: string;
    description?: string;
    cuisine?: string;
    difficulty?: string;
    cookingTime?: number;
    prepTime?: number;
    servings?: number;
}

interface RecipeShare {
    shareId: number;
    shareType: 'public' | 'friends' | 'specific';
    permission: 'view' | 'comment' | 'edit';
    shareUrl: string;
    fullShareUrl: string;
    expiresAt?: string;
    createdAt: string;
    title: string;
    description?: string;
    cuisine?: string;
    difficulty?: string;
}

interface RecipeSharingProps {
    recipe: Recipe;
}

const RecipeSharing: React.FC<RecipeSharingProps> = ({ recipe }) => {
    const { user } = useAuth();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [shareType, setShareType] = useState<'public' | 'friends' | 'specific'>('public');
    const [permission, setPermission] = useState<'view' | 'comment' | 'edit'>('view');
    const [sharedWithEmail, setSharedWithEmail] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [existingShares, setExistingShares] = useState<RecipeShare[]>([]);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

    // Load existing shares
    const loadExistingShares = async () => {
        if (!user) return;

        try {
            const response = await fetch(`/api/users/${user.userId}/shares`);
            const data = await response.json();

            if (data.success) {
                // Filter shares for this specific recipe
                const recipeShares = data.data.filter((share: RecipeShare) =>
                    share.title === recipe.title // Simple match by title for now
                );
                setExistingShares(recipeShares);
            }
        } catch (error) {
            console.error('Error loading shares:', error);
        }
    };

    React.useEffect(() => {
        if (isManageDialogOpen) {
            loadExistingShares();
        }
    }, [isManageDialogOpen, user]);

    const handleCreateShare = async () => {
        if (!user) {
            alert('You must be logged in to share recipes');
            return;
        }

        setIsLoading(true);

        try {
            const shareData = {
                userId: user.userId,
                shareType,
                permission,
                ...(shareType === 'specific' && sharedWithEmail && { sharedWithEmail }),
                ...(expiresAt && { expiresAt: new Date(expiresAt).toISOString() })
            };

            const response = await fetch(`/api/recipes/${recipe.recipeId}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(shareData)
            });

            const data = await response.json();

            if (data.success) {
                alert('Recipe shared successfully!');

                // Copy share URL to clipboard
                await navigator.clipboard.writeText(data.shareUrl);
                alert('Share link copied to clipboard!');

                setIsCreateDialogOpen(false);

                // Reset form
                setShareType('public');
                setPermission('view');
                setSharedWithEmail('');
                setExpiresAt('');

                // Refresh shares list if manage dialog is open
                if (isManageDialogOpen) {
                    loadExistingShares();
                }
            } else {
                alert(data.message || 'Failed to share recipe');
            }
        } catch (error) {
            console.error('Error sharing recipe:', error);
            alert('Failed to share recipe');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyUrl = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedUrl(url);
            alert('Link copied to clipboard!');

            // Reset copied state after 2 seconds
            setTimeout(() => setCopiedUrl(null), 2000);
        } catch (error) {
            alert('Failed to copy link');
        }
    };

    const handleSocialShare = (platform: string, url: string) => {
        const text = `Check out this delicious recipe: ${recipe.title}`;
        const encodedText = encodeURIComponent(text);
        const encodedUrl = encodeURIComponent(url);

        let shareUrl = '';

        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
                break;
            case 'email':
                shareUrl = `mailto:?subject=${encodeURIComponent(recipe.title)}&body=${encodedText}%20${encodedUrl}`;
                break;
            default:
                return;
        }

        window.open(shareUrl, '_blank', 'width=600,height=400');
    };

    const handleDeleteShare = async (shareId: number) => {
        if (!user) return;

        try {
            const response = await fetch(`/api/recipes/shares/${shareId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: user.userId })
            });

            const data = await response.json();

            if (data.success) {
                alert('Share deleted successfully');
                loadExistingShares();
            } else {
                alert(data.message || 'Failed to delete share');
            }
        } catch (error) {
            console.error('Error deleting share:', error);
            alert('Failed to delete share');
        }
    };

    const getShareTypeIcon = (type: string) => {
        switch (type) {
            case 'public': return <Globe className="h-4 w-4" />;
            case 'friends': return <Users className="h-4 w-4" />;
            case 'specific': return <User className="h-4 w-4" />;
            default: return <Share2 className="h-4 w-4" />;
        }
    };

    const getShareTypeColor = (type: string) => {
        switch (type) {
            case 'public': return 'bg-green-100 text-green-800';
            case 'friends': return 'bg-blue-100 text-blue-800';
            case 'specific': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="flex gap-2">
            {/* Share Recipe Button */}
            <Button variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Share2 className="h-4 w-4 mr-2" />
                Share Recipe
            </Button>

            {/* Manage Shares Button */}
            <Button variant="outline" size="sm" onClick={() => setIsManageDialogOpen(true)}>
                <Link className="h-4 w-4 mr-2" />
                Manage Shares
            </Button>

            {/* Create Share Modal */}
            <AnimatePresence>
                {isCreateDialogOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setIsCreateDialogOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Share Recipe</h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsCreateDialogOpen(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Share Type
                                    </label>
                                    <select
                                        value={shareType}
                                        onChange={(e) => setShareType(e.target.value as any)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    >
                                        <option value="public">Public - Anyone with the link</option>
                                        <option value="friends">Friends Only</option>
                                        <option value="specific">Specific Person</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Permission Level
                                    </label>
                                    <select
                                        value={permission}
                                        onChange={(e) => setPermission(e.target.value as any)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    >
                                        <option value="view">View Only</option>
                                        <option value="comment">View & Comment</option>
                                        <option value="edit">View & Edit</option>
                                    </select>
                                </div>

                                {shareType === 'specific' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Share With (Email)
                                        </label>
                                        <input
                                            type="email"
                                            value={sharedWithEmail}
                                            onChange={(e) => setSharedWithEmail(e.target.value)}
                                            placeholder="Enter email address"
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Expires At (Optional)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={expiresAt}
                                        onChange={(e) => setExpiresAt(e.target.value)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <Button
                                    onClick={handleCreateShare}
                                    disabled={isLoading || (shareType === 'specific' && !sharedWithEmail)}
                                    className="w-full"
                                >
                                    {isLoading ? 'Creating Share...' : 'Create Share Link'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Manage Shares Modal */}
            <AnimatePresence>
                {isManageDialogOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setIsManageDialogOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Recipe Shares</h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsManageDialogOpen(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {existingShares.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No shares created yet</p>
                                        <p className="text-sm">Create a share to get started</p>
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {existingShares.map((share) => (
                                            <motion.div
                                                key={share.shareId}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                                                            getShareTypeColor(share.shareType)
                                                        )}>
                                                            {getShareTypeIcon(share.shareType)}
                                                            <span className="capitalize">{share.shareType}</span>
                                                        </span>
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800 capitalize">
                                                            {share.permission}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteShare(share.shareId)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mb-3">
                                                    <input
                                                        value={share.fullShareUrl}
                                                        readOnly
                                                        className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleCopyUrl(share.fullShareUrl)}
                                                        className={copiedUrl === share.fullShareUrl ? 'bg-green-50 text-green-700' : ''}
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="flex gap-2 mb-3">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleSocialShare('twitter', share.fullShareUrl)}
                                                    >
                                                        <Twitter className="h-4 w-4 mr-1" />
                                                        Twitter
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleSocialShare('facebook', share.fullShareUrl)}
                                                    >
                                                        <Facebook className="h-4 w-4 mr-1" />
                                                        Facebook
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleSocialShare('whatsapp', share.fullShareUrl)}
                                                    >
                                                        <MessageCircle className="h-4 w-4 mr-1" />
                                                        WhatsApp
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleSocialShare('email', share.fullShareUrl)}
                                                    >
                                                        <Mail className="h-4 w-4 mr-1" />
                                                        Email
                                                    </Button>
                                                </div>

                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        Created: {new Date(share.createdAt).toLocaleDateString()}
                                                    </div>
                                                    {share.expiresAt && (
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-4 w-4" />
                                                            Expires: {new Date(share.expiresAt).toLocaleDateString()}
                                                        </div>
                                                    )}
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

export default RecipeSharing; 