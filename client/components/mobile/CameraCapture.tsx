'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CameraIcon,
    XMarkIcon,
    CheckIcon,
    PhotoIcon,
    ArrowPathIcon,
    FlashIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { cn, touchOptimized } from '@/lib/utils/responsive';
import { usePerformanceMonitor } from '@/lib/utils/performance-monitor';

interface CameraCaptureProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (imageData: string, analysisResults?: any) => void;
    mode?: 'ingredient' | 'dish' | 'general';
    className?: string;
}

interface CameraConstraints {
    video: {
        facingMode: 'environment' | 'user';
        width: { ideal: number };
        height: { ideal: number };
    };
}

export function CameraCapture({
    isOpen,
    onClose,
    onCapture,
    mode = 'general',
    className
}: CameraCaptureProps) {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [flashEnabled, setFlashEnabled] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { markInteraction, markCustomMetric } = usePerformanceMonitor();

    // Initialize camera when component opens
    useEffect(() => {
        if (isOpen) {
            initializeCamera();
        } else {
            cleanup();
        }

        return cleanup;
    }, [isOpen, facingMode]);

    const initializeCamera = useCallback(async () => {
        try {
            setError(null);
            markInteraction('camera-initialize');

            const constraints: CameraConstraints = {
                video: {
                    facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
            };

            // Add flash constraint if supported and enabled
            if (flashEnabled && 'torch' in navigator.mediaDevices.getSupportedConstraints()) {
                (constraints.video as any).torch = true;
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                await videoRef.current.play();
            }
        } catch (err) {
            console.error('Camera initialization error:', err);
            setError('Unable to access camera. Please check permissions.');
            markCustomMetric('camera-error', 1);
        }
    }, [facingMode, flashEnabled, markInteraction, markCustomMetric]);

    const cleanup = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setCapturedImage(null);
        setError(null);
    }, [stream]);

    const captureImage = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        try {
            setIsCapturing(true);
            markInteraction('camera-capture');

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (!context) return;

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw video frame to canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to base64
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(imageData);

            // Add haptic feedback if available
            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }

            // Analyze image if in ingredient or dish mode
            if (mode !== 'general') {
                await analyzeImage(imageData);
            }
        } catch (err) {
            console.error('Capture error:', err);
            setError('Failed to capture image');
            markCustomMetric('capture-error', 1);
        } finally {
            setIsCapturing(false);
        }
    }, [mode, markInteraction, markCustomMetric]);

    const analyzeImage = useCallback(async (imageData: string) => {
        if (mode === 'general') return;

        try {
            setIsAnalyzing(true);
            markInteraction('image-analysis');

            // Simulate AI analysis (replace with actual AI service)
            const analysisPromise = new Promise(resolve => {
                setTimeout(() => {
                    if (mode === 'ingredient') {
                        resolve({
                            ingredients: ['tomatoes', 'onions', 'garlic'],
                            confidence: 0.85,
                            suggestions: ['Add basil for better flavor', 'These look fresh!']
                        });
                    } else {
                        resolve({
                            dishName: 'Pasta with Tomato Sauce',
                            cuisine: 'Italian',
                            estimatedCalories: 450,
                            confidence: 0.78
                        });
                    }
                }, 2000);
            });

            const results = await analysisPromise;
            markCustomMetric('image-analysis-success', 1);
            return results;
        } catch (err) {
            console.error('Analysis error:', err);
            markCustomMetric('image-analysis-error', 1);
            return null;
        } finally {
            setIsAnalyzing(false);
        }
    }, [mode, markInteraction, markCustomMetric]);

    const confirmCapture = useCallback(async () => {
        if (!capturedImage) return;

        let analysisResults = null;
        if (mode !== 'general' && !isAnalyzing) {
            analysisResults = await analyzeImage(capturedImage);
        }

        onCapture(capturedImage, analysisResults);
        onClose();
    }, [capturedImage, mode, isAnalyzing, analyzeImage, onCapture, onClose]);

    const retakePhoto = useCallback(() => {
        setCapturedImage(null);
        setError(null);
    }, []);

    const switchCamera = useCallback(() => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
        markInteraction('camera-switch');
    }, [markInteraction]);

    const toggleFlash = useCallback(() => {
        setFlashEnabled(prev => !prev);
        markInteraction('flash-toggle');
    }, [markInteraction]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                    "fixed inset-0 z-50 bg-black",
                    className
                )}
            >
                {/* Camera view or captured image */}
                <div className="relative w-full h-full">
                    {!capturedImage ? (
                        <>
                            <video
                                ref={videoRef}
                                className="w-full h-full object-cover"
                                playsInline
                                muted
                                autoPlay
                            />
                            <canvas
                                ref={canvasRef}
                                className="hidden"
                            />

                            {/* Camera overlay */}
                            <div className="absolute inset-0 pointer-events-none">
                                {/* Viewfinder */}
                                <div className="absolute inset-4 border-2 border-white/30 rounded-lg">
                                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg" />
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg" />
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg" />
                                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg" />
                                </div>

                                {/* Mode indicator */}
                                <div className="absolute top-safe-area-top left-4 right-4">
                                    <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                                        <p className="text-white text-sm font-medium text-center">
                                            {mode === 'ingredient' && 'Point camera at ingredients'}
                                            {mode === 'dish' && 'Point camera at your dish'}
                                            {mode === 'general' && 'Take a photo'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="relative w-full h-full">
                            <img
                                src={capturedImage}
                                alt="Captured"
                                className="w-full h-full object-cover"
                            />

                            {/* Analysis overlay */}
                            {isAnalyzing && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div className="bg-white rounded-lg p-6 mx-4 text-center">
                                        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                                        <p className="text-gray-800 font-medium">
                                            {mode === 'ingredient' ? 'Identifying ingredients...' : 'Analyzing dish...'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="absolute top-safe-area-top left-4 right-4">
                            <div className="bg-red-500 text-white px-4 py-3 rounded-lg">
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Controls */}
                    <div className="absolute bottom-safe-area-bottom left-0 right-0 p-6">
                        {!capturedImage ? (
                            <div className="flex items-center justify-between">
                                {/* Close button */}
                                <button
                                    onClick={onClose}
                                    className={cn(
                                        "p-3 bg-black/50 backdrop-blur-sm rounded-full",
                                        touchOptimized.base,
                                        touchOptimized.feedback.scale
                                    )}
                                >
                                    <XMarkIcon className="w-6 h-6 text-white" />
                                </button>

                                {/* Capture button */}
                                <button
                                    onClick={captureImage}
                                    disabled={isCapturing || !stream}
                                    className={cn(
                                        "relative p-4 bg-white rounded-full",
                                        touchOptimized.base,
                                        touchOptimized.feedback.scale,
                                        isCapturing && "opacity-50"
                                    )}
                                >
                                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                                        {isCapturing ? (
                                            <div className="w-6 h-6 bg-white rounded-sm" />
                                        ) : (
                                            <CameraIcon className="w-8 h-8 text-white" />
                                        )}
                                    </div>
                                </button>

                                {/* Camera options */}
                                <div className="flex flex-col gap-2">
                                    {/* Switch camera */}
                                    <button
                                        onClick={switchCamera}
                                        className={cn(
                                            "p-3 bg-black/50 backdrop-blur-sm rounded-full",
                                            touchOptimized.base,
                                            touchOptimized.feedback.scale
                                        )}
                                    >
                                        <ArrowPathIcon className="w-6 h-6 text-white" />
                                    </button>

                                    {/* Flash toggle */}
                                    <button
                                        onClick={toggleFlash}
                                        className={cn(
                                            "p-3 backdrop-blur-sm rounded-full",
                                            flashEnabled ? "bg-yellow-500" : "bg-black/50",
                                            touchOptimized.base,
                                            touchOptimized.feedback.scale
                                        )}
                                    >
                                        <FlashIcon className={cn(
                                            "w-6 h-6",
                                            flashEnabled ? "text-black" : "text-white"
                                        )} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                {/* Retake button */}
                                <button
                                    onClick={retakePhoto}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-3 bg-black/50 backdrop-blur-sm rounded-full",
                                        touchOptimized.base,
                                        touchOptimized.feedback.scale
                                    )}
                                >
                                    <ArrowPathIcon className="w-5 h-5 text-white" />
                                    <span className="text-white font-medium">Retake</span>
                                </button>

                                {/* Confirm button */}
                                <button
                                    onClick={confirmCapture}
                                    disabled={isAnalyzing}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-3 bg-green-500 rounded-full",
                                        touchOptimized.base,
                                        touchOptimized.feedback.scale,
                                        isAnalyzing && "opacity-50"
                                    )}
                                >
                                    <CheckIcon className="w-5 h-5 text-white" />
                                    <span className="text-white font-medium">
                                        {isAnalyzing ? 'Analyzing...' : 'Use Photo'}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// Hook for camera capture functionality
export function useCameraCapture() {
    const [isOpen, setIsOpen] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        // Check if camera is supported
        setIsSupported(
            'mediaDevices' in navigator &&
            'getUserMedia' in navigator.mediaDevices
        );
    }, []);

    const openCamera = useCallback(() => {
        if (isSupported) {
            setIsOpen(true);
        }
    }, [isSupported]);

    const closeCamera = useCallback(() => {
        setIsOpen(false);
    }, []);

    return {
        isOpen,
        isSupported,
        openCamera,
        closeCamera,
    };
} 