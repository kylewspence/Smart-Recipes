'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowDownTrayIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { TouchButton } from '@/components/ui/TouchButton';
import { cn, touchOptimized, mobileA11y, triggerHaptic, useMobileCapabilities } from '@/lib/utils/responsive';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

declare global {
    interface WindowEventMap {
        beforeinstallprompt: BeforeInstallPromptEvent;
    }
}

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);
    const { supportsHaptics, isIOS: deviceIsIOS } = useMobileCapabilities();

    useEffect(() => {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check if it's iOS
        setIsIOS(deviceIsIOS);

        // Listen for beforeinstallprompt event (Chrome/Edge)
        const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // Show prompt after a delay (don't be too aggressive)
            setTimeout(() => {
                setShowPrompt(true);
            }, 3000);
        };

        // Listen for app installed event
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, [deviceIsIOS]);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        if (supportsHaptics) {
            triggerHaptic('medium');
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        if (supportsHaptics) {
            triggerHaptic('light');
        }
        setShowPrompt(false);

        // Don't show again for this session
        if (typeof window !== 'undefined') {
            typeof window !== "undefined" && sessionStorage.setItem('pwa-install-dismissed', 'true');
        }
    };

    const handleIOSInstall = () => {
        if (supportsHaptics) {
            triggerHaptic('medium');
        }
        setShowIOSInstructions(true);
    };

    // Don't show if already installed or dismissed this session
    const isDismissed = typeof window !== 'undefined' ? typeof window !== "undefined" && sessionStorage.getItem('pwa-install-dismissed') : false;
    if (isInstalled || isDismissed) {
        return null;
    }

    return (
        <>
            {/* Main Install Prompt */}
            <AnimatePresence>
                {showPrompt && (deferredPrompt || isIOS) && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={cn(
                            'fixed bottom-20 left-4 right-4 z-50 bg-background border rounded-xl shadow-xl',
                            'md:left-auto md:right-4 md:w-80'
                        )}
                    >
                        <div className="p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                        <DevicePhoneMobileIcon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm">Install Smart Recipes</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Get the full app experience
                                        </p>
                                    </div>
                                </div>
                                <button
                                    className={cn(
                                        touchOptimized.button.icon,
                                        mobileA11y.focus.visible,
                                        'rounded-full hover:bg-muted'
                                    )}
                                    onClick={handleDismiss}
                                    aria-label="Dismiss install prompt"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <div className="h-1 w-1 bg-primary rounded-full" />
                                    <span>Works offline</span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <div className="h-1 w-1 bg-primary rounded-full" />
                                    <span>Faster loading</span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <div className="h-1 w-1 bg-primary rounded-full" />
                                    <span>Native app experience</span>
                                </div>
                            </div>

                            <div className="flex space-x-2">
                                <TouchButton
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={handleDismiss}
                                    haptic="light"
                                >
                                    Not now
                                </TouchButton>
                                <TouchButton
                                    variant="default"
                                    size="sm"
                                    className="flex-1"
                                    onClick={isIOS ? handleIOSInstall : handleInstall}
                                    haptic="medium"
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                                    Install
                                </TouchButton>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* iOS Installation Instructions */}
            <AnimatePresence>
                {showIOSInstructions && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center"
                        onClick={() => setShowIOSInstructions(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={cn(
                                'bg-background rounded-t-xl md:rounded-xl md:max-w-md w-full mx-4',
                                touchOptimized.scroll.momentum
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">Install on iOS</h3>
                                    <button
                                        className={cn(
                                            touchOptimized.button.icon,
                                            mobileA11y.focus.visible,
                                            'rounded-full hover:bg-muted'
                                        )}
                                        onClick={() => setShowIOSInstructions(false)}
                                        aria-label="Close instructions"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start space-x-3">
                                        <div className="h-6 w-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs font-semibold text-primary">1</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Tap the Share button</p>
                                            <p className="text-xs text-muted-foreground">
                                                Look for the square with an arrow pointing up in Safari
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start space-x-3">
                                        <div className="h-6 w-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs font-semibold text-primary">2</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Select "Add to Home Screen"</p>
                                            <p className="text-xs text-muted-foreground">
                                                Scroll down in the share menu to find this option
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start space-x-3">
                                        <div className="h-6 w-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs font-semibold text-primary">3</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Tap "Add"</p>
                                            <p className="text-xs text-muted-foreground">
                                                The app will be added to your home screen
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <TouchButton
                                    variant="default"
                                    fullWidth
                                    className="mt-6"
                                    onClick={() => setShowIOSInstructions(false)}
                                    haptic="light"
                                >
                                    Got it
                                </TouchButton>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default PWAInstallPrompt; 