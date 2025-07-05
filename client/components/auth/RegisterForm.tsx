'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, Check } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { RegisterData } from '@/lib/types/auth';
import { useRouter } from 'next/navigation';

// Enhanced validation schema
const registerSchema = z.object({
    firstName: z
        .string()
        .min(1, 'First name is required')
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name must be less than 50 characters')
        .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces'),
    lastName: z
        .string()
        .min(1, 'Last name is required')
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name must be less than 50 characters')
        .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces'),
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address')
        .max(255, 'Email must be less than 255 characters'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be less than 128 characters')
        .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
        .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
        .regex(/^(?=.*\d)/, 'Password must contain at least one number')
        .regex(/^(?=.*[@$!%*?&])/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    terms: z.boolean().refine(val => val === true, {
        message: 'You must accept the terms and conditions',
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
    onSuccess?: () => void;
    redirectTo?: string;
}

// Password strength indicator
const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score, label: 'Fair', color: 'bg-yellow-500' };
    if (score <= 4) return { score, label: 'Good', color: 'bg-blue-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
};

export function RegisterForm({ onSuccess, redirectTo }: RegisterFormProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { register: registerUser, isLoading, error } = useAuth();
    const router = useRouter();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: '',
            terms: false,
        },
    });

    const password = watch('password');
    const passwordStrength = password ? getPasswordStrength(password) : null;

    const onSubmit = async (data: RegisterFormData) => {
        try {
            await registerUser(data as RegisterData);
            onSuccess?.();

            // Redirect new users to onboarding flow instead of dashboard
            // This ensures they set up their preferences before accessing the app
            if (redirectTo) {
                window.location.href = redirectTo;
            } else {
                router.push('/onboarding');
            }
        } catch (err: any) {
            // Handle specific error cases
            if (err.status === 409) {
                setError('email', {
                    type: 'manual',
                    message: 'An account with this email already exists.',
                });
            } else if (err.status === 429) {
                setError('root', {
                    type: 'manual',
                    message: 'Too many registration attempts. Please try again later.',
                });
            } else {
                setError('root', {
                    type: 'manual',
                    message: err.message || 'Registration failed. Please try again.',
                });
            }
        }
    };

    const isFormLoading = isLoading || isSubmitting;

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Create Account
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Join Smart Recipes and discover your perfect meals
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
                    {/* First Name Field */}
                    <div>
                        <label
                            htmlFor="firstName"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                            First Name
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                {...register('firstName')}
                                id="firstName"
                                type="text"
                                autoComplete="given-name"
                                className={`
                  block w-full pl-10 pr-3 py-3 border rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-all duration-200 ease-in-out
                  ${errors.firstName
                                        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                    }
                  text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                `}
                                placeholder="Enter your first name"
                                disabled={isFormLoading}
                            />
                        </div>
                        {errors.firstName && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                {errors.firstName.message}
                            </p>
                        )}
                    </div>

                    {/* Last Name Field */}
                    <div>
                        <label
                            htmlFor="lastName"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                            Last Name
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                {...register('lastName')}
                                id="lastName"
                                type="text"
                                autoComplete="family-name"
                                className={`
                  block w-full pl-10 pr-3 py-3 border rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-all duration-200 ease-in-out
                  ${errors.lastName
                                        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                    }
                  text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                `}
                                placeholder="Enter your last name"
                                disabled={isFormLoading}
                            />
                        </div>
                        {errors.lastName && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                {errors.lastName.message}
                            </p>
                        )}
                    </div>

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
                                autoComplete="new-password"
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
                                placeholder="Create a strong password"
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

                        {/* Password Strength Indicator */}
                        {password && passwordStrength && (
                            <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                        Password strength:
                                    </span>
                                    <span className={`text-xs font-medium ${passwordStrength.score <= 2 ? 'text-red-500' :
                                        passwordStrength.score <= 3 ? 'text-yellow-500' :
                                            passwordStrength.score <= 4 ? 'text-blue-500' : 'text-green-500'
                                        }`}>
                                        {passwordStrength.label}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {errors.password && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    {/* Confirm Password Field */}
                    <div>
                        <label
                            htmlFor="confirmPassword"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                            Confirm Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                {...register('confirmPassword')}
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                className={`
                  block w-full pl-10 pr-12 py-3 border rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-all duration-200 ease-in-out
                  ${errors.confirmPassword
                                        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                    }
                  text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                `}
                                placeholder="Confirm your password"
                                disabled={isFormLoading}
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={isFormLoading}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                ) : (
                                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                )}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                {errors.confirmPassword.message}
                            </p>
                        )}
                    </div>

                    {/* Terms and Conditions */}
                    <div>
                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    {...register('terms')}
                                    id="terms"
                                    type="checkbox"
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    disabled={isFormLoading}
                                />
                            </div>
                            <div className="ml-3">
                                <label htmlFor="terms" className="text-sm text-gray-700 dark:text-gray-300">
                                    I agree to the{' '}
                                    <Link
                                        href="/terms"
                                        className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                                        target="_blank"
                                    >
                                        Terms of Service
                                    </Link>
                                    {' '}and{' '}
                                    <Link
                                        href="/privacy"
                                        className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                                        target="_blank"
                                    >
                                        Privacy Policy
                                    </Link>
                                </label>
                            </div>
                        </div>
                        {errors.terms && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                {errors.terms.message}
                            </p>
                        )}
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
                                Creating Account...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Already have an account?{' '}
                        <Link
                            href="/login"
                            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                            Sign in here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
} 