'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MicrophoneIcon,
    StopIcon,
    XMarkIcon,
    CheckIcon,
    SpeakerWaveIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { cn, touchOptimized } from '@/lib/utils/responsive';
import { usePerformanceMonitor } from '@/lib/utils/performance-monitor';

interface VoiceInputProps {
    isOpen: boolean;
    onClose: () => void;
    onResult: (transcript: string, confidence?: number) => void;
    placeholder?: string;
    language?: string;
    continuous?: boolean;
    className?: string;
}

interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResult {
    transcript: string;
    confidence: number;
}

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export function VoiceInput({
    isOpen,
    onClose,
    onResult,
    placeholder = "Speak your message...",
    language = "en-US",
    continuous = false,
    className
}: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [confidence, setConfidence] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);
    const [volume, setVolume] = useState(0);

    const recognitionRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameRef = useRef<number>();

    const { markInteraction, markCustomMetric } = usePerformanceMonitor();

    // Initialize speech recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            setIsSupported(true);

            const recognition = new SpeechRecognition();
            recognition.continuous = continuous;
            recognition.interimResults = true;
            recognition.lang = language;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                setIsListening(true);
                setError(null);
                markInteraction('voice-input-start');
            };

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let finalTranscript = '';
                let interimText = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    const transcript = result[0].transcript;
                    const confidence = result[0].confidence;

                    if (result.isFinal) {
                        finalTranscript += transcript;
                        setConfidence(confidence);
                    } else {
                        interimText += transcript;
                    }
                }

                if (finalTranscript) {
                    setTranscript(prev => prev + finalTranscript);
                }
                setInterimTranscript(interimText);
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setError(getSpeechErrorMessage(event.error));
                setIsListening(false);
                markCustomMetric('voice-input-error', 1);
            };

            recognition.onend = () => {
                setIsListening(false);
                setInterimTranscript('');
                markInteraction('voice-input-end');
            };

            recognitionRef.current = recognition;
        } else {
            setIsSupported(false);
            setError('Speech recognition is not supported in this browser');
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            cleanup();
        };
    }, [language, continuous, markInteraction, markCustomMetric]);

    // Initialize audio visualization
    useEffect(() => {
        if (isListening && isSupported) {
            initializeAudioVisualization();
        } else {
            cleanup();
        }
    }, [isListening, isSupported]);

    const initializeAudioVisualization = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);

            analyserRef.current.fftSize = 256;
            microphoneRef.current.connect(analyserRef.current);

            updateVolume();
        } catch (err) {
            console.error('Audio visualization error:', err);
        }
    }, []);

    const updateVolume = useCallback(() => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setVolume(average / 255);

        if (isListening) {
            animationFrameRef.current = requestAnimationFrame(updateVolume);
        }
    }, [isListening]);

    const cleanup = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (analyserRef.current) {
            analyserRef.current = null;
        }
        if (microphoneRef.current) {
            microphoneRef.current = null;
        }
    }, []);

    const startListening = useCallback(() => {
        if (!isSupported || !recognitionRef.current) return;

        try {
            setTranscript('');
            setInterimTranscript('');
            setError(null);
            recognitionRef.current.start();
        } catch (err) {
            console.error('Start listening error:', err);
            setError('Failed to start voice recognition');
        }
    }, [isSupported]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    const confirmTranscript = useCallback(() => {
        const finalText = transcript.trim();
        if (finalText) {
            onResult(finalText, confidence);
            markCustomMetric('voice-input-success', 1);
        }
        onClose();
    }, [transcript, confidence, onResult, onClose, markCustomMetric]);

    const clearTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
        setConfidence(0);
    }, []);

    const getSpeechErrorMessage = (error: string): string => {
        switch (error) {
            case 'no-speech':
                return 'No speech detected. Please try again.';
            case 'audio-capture':
                return 'Microphone access denied or unavailable.';
            case 'not-allowed':
                return 'Microphone permission denied.';
            case 'network':
                return 'Network error. Please check your connection.';
            case 'service-not-allowed':
                return 'Speech recognition service unavailable.';
            default:
                return 'Speech recognition error. Please try again.';
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={cn(
                    "fixed inset-x-4 bottom-safe-area-bottom z-50",
                    "bg-white dark:bg-gray-800 rounded-2xl shadow-2xl",
                    "border border-gray-200 dark:border-gray-700",
                    className
                )}
            >
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Voice Input
                        </h3>
                        <button
                            onClick={onClose}
                            className={cn(
                                "p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                                touchOptimized.base,
                                touchOptimized.feedback.scale
                            )}
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-start gap-2">
                                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Not supported message */}
                    {!isSupported && (
                        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                Voice input is not supported in this browser. Please try a different browser or use the keyboard.
                            </p>
                        </div>
                    )}

                    {/* Voice visualization */}
                    <div className="mb-6">
                        <div className="relative h-32 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            {isListening ? (
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="w-2 bg-blue-500 rounded-full"
                                            animate={{
                                                height: [8, 32 * (1 + volume), 8],
                                            }}
                                            transition={{
                                                duration: 0.5,
                                                repeat: Infinity,
                                                delay: i * 0.1,
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center">
                                    <MicrophoneIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {transcript ? 'Voice input complete' : placeholder}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Transcript display */}
                    <div className="mb-6">
                        <div className="min-h-[60px] p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            {transcript || interimTranscript ? (
                                <div>
                                    <p className="text-gray-900 dark:text-white">
                                        {transcript}
                                        <span className="text-gray-500 dark:text-gray-400 italic">
                                            {interimTranscript}
                                        </span>
                                    </p>
                                    {confidence > 0 && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Confidence: {Math.round(confidence * 100)}%
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 italic">
                                    Your speech will appear here...
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between gap-3">
                        {/* Clear button */}
                        <button
                            onClick={clearTranscript}
                            disabled={!transcript}
                            className={cn(
                                "px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300",
                                "bg-gray-100 dark:bg-gray-600 rounded-lg",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                touchOptimized.base,
                                touchOptimized.feedback.scale
                            )}
                        >
                            Clear
                        </button>

                        {/* Microphone button */}
                        <button
                            onClick={isListening ? stopListening : startListening}
                            disabled={!isSupported}
                            className={cn(
                                "flex items-center justify-center w-16 h-16 rounded-full",
                                isListening
                                    ? "bg-red-500 hover:bg-red-600"
                                    : "bg-blue-500 hover:bg-blue-600",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                touchOptimized.base,
                                touchOptimized.feedback.scale
                            )}
                        >
                            {isListening ? (
                                <StopIcon className="w-8 h-8 text-white" />
                            ) : (
                                <MicrophoneIcon className="w-8 h-8 text-white" />
                            )}
                        </button>

                        {/* Confirm button */}
                        <button
                            onClick={confirmTranscript}
                            disabled={!transcript.trim()}
                            className={cn(
                                "px-6 py-2 text-sm font-medium text-white",
                                "bg-green-500 hover:bg-green-600 rounded-lg",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                touchOptimized.base,
                                touchOptimized.feedback.scale
                            )}
                        >
                            Use Text
                        </button>
                    </div>

                    {/* Instructions */}
                    <div className="mt-4 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {isListening
                                ? "Listening... Speak clearly into your microphone"
                                : "Tap the microphone to start voice input"
                            }
                        </p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// Hook for voice input functionality
export function useVoiceInput() {
    const [isOpen, setIsOpen] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        // Check if speech recognition is supported
        setIsSupported(
            'SpeechRecognition' in window ||
            'webkitSpeechRecognition' in window
        );
    }, []);

    const openVoiceInput = useCallback(() => {
        if (isSupported) {
            setIsOpen(true);
        }
    }, [isSupported]);

    const closeVoiceInput = useCallback(() => {
        setIsOpen(false);
    }, []);

    return {
        isOpen,
        isSupported,
        openVoiceInput,
        closeVoiceInput,
    };
} 