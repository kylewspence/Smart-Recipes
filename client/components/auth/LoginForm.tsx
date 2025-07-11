'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { LoginCredentials } from '@/lib/types/auth';

// Validation schema
const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address'),
    password: z
        .string()
        .min(1, 'Password is required')
        .min(6, 'Password must be at least 6 characters'),
    rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
    onSuccess?: () => void;
    redirectTo?: string;
}

export function LoginForm({ onSuccess, redirectTo }: LoginFormProps) {
    const [showPassword, setShowPassword] = useState(false);
    const { login, guestLogin, isLoading, error } = useAuth();
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
            rememberMe: false,
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            console.log('LoginForm: Starting login with data:', { email: data.email });
            await login(data as LoginCredentials);
            console.log('LoginForm: Login successful, calling onSuccess');
            onSuccess?.();

            // Use window.location for more reliable redirect
            console.log('LoginForm: About to redirect, redirectTo:', redirectTo);
            if (redirectTo) {
                console.log('LoginForm: Redirecting to:', redirectTo);
                window.location.href = redirectTo;
            } else {
                console.log('LoginForm: Redirecting to dashboard');
                window.location.href = '/dashboard';
            }
        } catch (err: unknown) {
            // Handle specific error cases
            const errorObj = err as { status?: number; message?: string };
            if (errorObj.status === 401) {
                setError('root', {
                    type: 'manual',
                    message: 'Invalid email or password. Please try again.',
                });
            } else if (errorObj.status === 429) {
                setError('root', {
                    type: 'manual',
                    message: 'Too many login attempts. Please try again later.',
                });
            } else {
                setError('root', {
                    type: 'manual',
                    message: errorObj.message || 'Login failed. Please try again.',
                });
            }
        }
    };

    const handleGuestLogin = async () => {
        try {
            await guestLogin();

            // For guest users, always redirect to onboarding
            if (redirectTo) {
                window.location.href = redirectTo;
            } else {
                // Default redirect for guest users to onboarding
                router.push('/onboarding');
            }

            onSuccess?.();
        } catch (err: unknown) {
            const errorObj = err as { status?: number; message?: string };
            setError('root', {
                type: 'manual',
                message: errorObj.message || 'Guest login failed. Please try again.',
            });
        }
    };

    const isFormLoading = isLoading || isSubmitting;

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Sign in to your account to continue
                    </p>
                </div>

                {/* Error Display */}
                {(error || errors.root) && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-400">
                            {error || errors.root?.message}
                        </p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Email Field */}
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                            Email Address
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                {...register('email')}
                                id="email"
                                type="email"
                                autoComplete="email"
                                className={`
                  block w-full pl-10 pr-3 py-3 border rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-all duration-200 ease-in-out
                  ${errors.email
                                        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                    }
                  text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                `}
                                placeholder="Enter your email"
                                disabled={isFormLoading}
                            />
                        </div>
                        {errors.email && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    {/* Password Field */}
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                            Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                {...register('password')}
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                className={`
                  block w-full pl-10 pr-12 py-3 border rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-all duration-200 ease-in-out
                  ${errors.password
                                        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                    }
                  text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                `}
                                placeholder="Enter your password"
                                disabled={isFormLoading}
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isFormLoading}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                ) : (
                                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                )}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                {...register('rememberMe')}
                                id="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                disabled={isFormLoading}
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                Remember me
                            </label>
                        </div>
                        <Link
                            href="/auth/forgot-password"
                            className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isFormLoading}
                        className={`
              w-full flex justify-center items-center py-3 px-4 border border-transparent 
              rounded-xl text-sm font-medium text-white transition-all duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              ${isFormLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:scale-[1.02] active:scale-[0.98]'
                            }
            `}
                    >
                        {isFormLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                Signing In...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                                Or
                            </span>
                        </div>
                    </div>

                    {/* Guest Login Button */}
                    <button
                        type="button"
                        onClick={handleGuestLogin}
                        disabled={isFormLoading}
                        className={`
              w-full flex justify-center items-center py-3 px-4 border-2 border-gray-300 dark:border-gray-600
              rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-all duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
              ${isFormLoading
                                ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                                : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transform hover:scale-[1.02] active:scale-[0.98]'
                            }
            `}
                    >
                        {isFormLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400 mr-2"></div>
                                Loading...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Continue as Guest
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Don&apos;t have an account?{' '}
                        <Link
                            href="/auth/register"
                            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                            Sign up here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
} 