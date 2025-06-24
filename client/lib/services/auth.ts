import axios, { AxiosError } from 'axios';
import {
    LoginCredentials,
    RegisterData,
    AuthResponse,
    ApiError,
    PasswordResetRequest,
    PasswordResetData,
    EmailVerificationRequest,
    ResendVerificationRequest,
    User
} from '../types/auth';

// Configure axios instance
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const authApi = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 seconds
});

// Request interceptor to add auth token
authApi.interceptors.request.use(
    (config) => {
        const token = getStoredToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
authApi.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle 401 errors - token expired or invalid
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                await refreshAuthToken();
                const newToken = getStoredToken();
                if (newToken && originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }
                return authApi(originalRequest);
            } catch (refreshError) {
                // Refresh failed, redirect to login
                clearStoredAuth();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(createApiError(error));
    }
);

// Helper functions for token storage
export const getStoredToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
};

export const getStoredRefreshToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
};

export const storeAuthTokens = (tokens: { accessToken: string; refreshToken?: string; expiresAt: number }) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', tokens.accessToken);
    localStorage.setItem('token_expires_at', tokens.expiresAt.toString());
    if (tokens.refreshToken) {
        localStorage.setItem('refresh_token', tokens.refreshToken);
    }
};

export const clearStoredAuth = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('user_data');
};

export const isTokenExpired = (): boolean => {
    if (typeof window === 'undefined') return true;
    const expiresAt = localStorage.getItem('token_expires_at');
    if (!expiresAt) return true;
    return Date.now() >= parseInt(expiresAt);
};

// Helper function to create API errors
const createApiError = (error: AxiosError): ApiError => {
    const response = error.response;
    const responseData = response?.data as Record<string, unknown>;
    const message = (responseData?.message as string) || error.message || 'An unexpected error occurred';
    const status = response?.status || 500;
    const details = (responseData?.details as Record<string, unknown>) || {};

    return {
        message,
        status,
        details,
    };
};

// Auth API functions
export const authService = {
    // Login user
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        try {
            const response = await authApi.post<AuthResponse>('/auth/login', credentials);
            const authData = response.data;

            // Store tokens
            const expiresAt = Date.now() + (authData.expiresIn * 1000);
            storeAuthTokens({
                accessToken: authData.token,
                refreshToken: authData.refreshToken,
                expiresAt,
            });

            // Store user data
            if (typeof window !== 'undefined') {
                localStorage.setItem('user_data', JSON.stringify(authData.user));
            }

            return authData;
        } catch (error) {
            throw createApiError(error as AxiosError);
        }
    },

    // Register new user
    async register(data: RegisterData): Promise<AuthResponse> {
        try {
            // Remove confirmPassword before sending to API
            const { confirmPassword, ...registerData } = data;
            const response = await authApi.post<AuthResponse>('/auth/register', registerData);
            const authData = response.data;

            // Store tokens
            const expiresAt = Date.now() + (authData.expiresIn * 1000);
            storeAuthTokens({
                accessToken: authData.token,
                refreshToken: authData.refreshToken,
                expiresAt,
            });

            // Store user data
            if (typeof window !== 'undefined') {
                localStorage.setItem('user_data', JSON.stringify(authData.user));
            }

            return authData;
        } catch (error) {
            throw createApiError(error as AxiosError);
        }
    },

    // Logout user
    async logout(): Promise<void> {
        try {
            const refreshToken = getStoredRefreshToken();
            if (refreshToken) {
                await authApi.post('/auth/logout', { refreshToken });
            }
        } catch (error) {
            // Log error but don't throw - we still want to clear local storage
            console.error('Logout API call failed:', error);
        } finally {
            clearStoredAuth();
        }
    },

    // Refresh access token
    async refreshToken(): Promise<string> {
        const refreshToken = getStoredRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await authApi.post<{ token: string; expiresIn: number }>('/auth/refresh', {
                refreshToken,
            });

            const { token, expiresIn } = response.data;
            const expiresAt = Date.now() + (expiresIn * 1000);

            storeAuthTokens({
                accessToken: token,
                refreshToken,
                expiresAt,
            });

            return token;
        } catch (error) {
            clearStoredAuth();
            throw createApiError(error as AxiosError);
        }
    },

    // Get current user profile
    async getCurrentUser(): Promise<User> {
        try {
            const response = await authApi.get<User>('/auth/me');
            const userData = response.data;

            // Update stored user data
            if (typeof window !== 'undefined') {
                localStorage.setItem('user_data', JSON.stringify(userData));
            }

            return userData;
        } catch (error) {
            throw createApiError(error as AxiosError);
        }
    },

    // Password reset request
    async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
        try {
            await authApi.post('/auth/forgot-password', data);
        } catch (error) {
            throw createApiError(error as AxiosError);
        }
    },

    // Password reset confirmation
    async resetPassword(data: PasswordResetData): Promise<void> {
        try {
            await authApi.post('/auth/reset-password', data);
        } catch (error) {
            throw createApiError(error as AxiosError);
        }
    },

    // Email verification
    async verifyEmail(data: EmailVerificationRequest): Promise<void> {
        try {
            await authApi.post('/auth/verify-email', data);
        } catch (error) {
            throw createApiError(error as AxiosError);
        }
    },

    // Resend email verification
    async resendVerification(data: ResendVerificationRequest): Promise<void> {
        try {
            await authApi.post('/auth/resend-verification', data);
        } catch (error) {
            throw createApiError(error as AxiosError);
        }
    },
};

// Export the refresh function for use in interceptors
export const refreshAuthToken = authService.refreshToken; 