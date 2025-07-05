'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import {
    AuthState,
    AuthContextType,
    LoginCredentials,
    RegisterData,
    User,
    AuthTokens
} from '../types/auth';
import {
    authService,
    getStoredToken,
    getStoredRefreshToken,
    isTokenExpired,
    clearStoredAuth,
    storeAuthTokens
} from '../services/auth';

// Initial authentication state
const initialState: AuthState = {
    user: null,
    tokens: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
};

// Auth action types
type AuthAction =
    | { type: 'AUTH_START' }
    | { type: 'AUTH_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
    | { type: 'AUTH_FAILURE'; payload: string }
    | { type: 'AUTH_LOGOUT' }
    | { type: 'CLEAR_ERROR' }
    | { type: 'UPDATE_USER'; payload: Partial<User> }
    | { type: 'SET_LOADING'; payload: boolean };

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case 'AUTH_START':
            return {
                ...state,
                isLoading: true,
                error: null,
            };

        case 'AUTH_SUCCESS':
            // Store tokens in localStorage for API requests
            if (action.payload.tokens) {
                storeAuthTokens(action.payload.tokens);
            }

            return {
                ...state,
                user: action.payload.user,
                tokens: action.payload.tokens,
                isLoading: false,
                isAuthenticated: true,
                error: null,
            };

        case 'AUTH_FAILURE':
            return {
                ...state,
                user: null,
                tokens: null,
                isAuthenticated: false,
                isLoading: false,
                error: action.payload,
            };

        case 'AUTH_LOGOUT':
            clearStoredAuth();
            return {
                ...state,
                user: null,
                tokens: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            };

        case 'CLEAR_ERROR':
            return {
                ...state,
                error: null,
            };

        case 'UPDATE_USER':
            return {
                ...state,
                user: state.user ? { ...state.user, ...action.payload } : null,
            };

        case 'SET_LOADING':
            return {
                ...state,
                isLoading: action.payload,
            };

        default:
            return state;
    }
};

// Create the Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider component
interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // Initialize authentication state from stored data
    const initializeAuth = useCallback(async () => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true });

            const token = getStoredToken();
            const refreshToken = getStoredRefreshToken();

            if (!token) {
                dispatch({ type: 'AUTH_LOGOUT' });
                return;
            }

            // Check if token is expired
            if (isTokenExpired()) {
                if (refreshToken) {
                    try {
                        const newToken = await authService.refreshToken();
                        const user = await authService.getCurrentUser();

                        dispatch({
                            type: 'AUTH_SUCCESS',
                            payload: {
                                user,
                                tokens: {
                                    accessToken: newToken,
                                    refreshToken: refreshToken || undefined,
                                    expiresAt: Date.now() + (3600 * 1000), // 1 hour default
                                },
                            },
                        });
                    } catch (error) {
                        clearStoredAuth();
                        dispatch({ type: 'AUTH_LOGOUT' });
                    }
                } else {
                    clearStoredAuth();
                    dispatch({ type: 'AUTH_LOGOUT' });
                }
            } else {
                // Token is valid, get user data
                try {
                    const storedUserData = localStorage.getItem('user_data');
                    let user: User;

                    if (storedUserData) {
                        user = JSON.parse(storedUserData);
                    } else {
                        user = await authService.getCurrentUser();
                    }

                    dispatch({
                        type: 'AUTH_SUCCESS',
                        payload: {
                            user,
                            tokens: {
                                accessToken: token,
                                refreshToken: refreshToken || undefined,
                                expiresAt: parseInt(localStorage.getItem('token_expires_at') || '0'),
                            },
                        },
                    });
                } catch (error) {
                    clearStoredAuth();
                    dispatch({ type: 'AUTH_LOGOUT' });
                }
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            clearStoredAuth();
            dispatch({ type: 'AUTH_LOGOUT' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    // Login function
    const login = useCallback(async (credentials: LoginCredentials) => {
        try {
            console.log('AuthContext: Starting login process');
            dispatch({ type: 'AUTH_START' });

            console.log('AuthContext: Calling authService.login');
            const authData = await authService.login(credentials);
            console.log('AuthContext: Login successful, dispatching AUTH_SUCCESS');

            dispatch({
                type: 'AUTH_SUCCESS',
                payload: {
                    user: authData.user,
                    tokens: {
                        accessToken: authData.token,
                        refreshToken: authData.refreshToken,
                        expiresAt: Date.now() + (authData.expiresIn * 1000),
                    },
                },
            });
            console.log('AuthContext: Login complete');
        } catch (error: any) {
            console.error('AuthContext: Login failed:', error);
            dispatch({
                type: 'AUTH_FAILURE',
                payload: error.message || 'Login failed',
            });
            throw error;
        }
    }, []);

    // Register function
    const register = useCallback(async (data: RegisterData) => {
        try {
            dispatch({ type: 'AUTH_START' });

            const authData = await authService.register(data);

            dispatch({
                type: 'AUTH_SUCCESS',
                payload: {
                    user: authData.user,
                    tokens: {
                        accessToken: authData.token,
                        refreshToken: authData.refreshToken,
                        expiresAt: Date.now() + (authData.expiresIn * 1000),
                    },
                },
            });
        } catch (error: any) {
            dispatch({
                type: 'AUTH_FAILURE',
                payload: error.message || 'Registration failed',
            });
            throw error;
        }
    }, []);

    // Guest login function
    const guestLogin = useCallback(async () => {
        try {
            dispatch({ type: 'AUTH_START' });

            const authData = await authService.guestLogin();

            dispatch({
                type: 'AUTH_SUCCESS',
                payload: {
                    user: authData.user,
                    tokens: {
                        accessToken: authData.token,
                        refreshToken: authData.refreshToken,
                        expiresAt: Date.now() + (authData.expiresIn * 1000),
                    },
                },
            });
        } catch (error: any) {
            dispatch({
                type: 'AUTH_FAILURE',
                payload: error.message || 'Guest login failed',
            });
            throw error;
        }
    }, []);

    // Logout function
    const logout = useCallback(async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            dispatch({ type: 'AUTH_LOGOUT' });
        }
    }, []);

    // Refresh token function
    const refreshToken = useCallback(async () => {
        try {
            const newToken = await authService.refreshToken();
            const user = await authService.getCurrentUser();

            dispatch({
                type: 'AUTH_SUCCESS',
                payload: {
                    user,
                    tokens: {
                        accessToken: newToken,
                        refreshToken: getStoredRefreshToken() || undefined,
                        expiresAt: Date.now() + (3600 * 1000), // 1 hour
                    },
                },
            });
        } catch (error) {
            clearStoredAuth();
            dispatch({ type: 'AUTH_LOGOUT' });
            throw error;
        }
    }, []);

    // Clear error function
    const clearError = useCallback(() => {
        dispatch({ type: 'CLEAR_ERROR' });
    }, []);

    // Update user function
    const updateUser = useCallback((userData: Partial<User>) => {
        dispatch({ type: 'UPDATE_USER', payload: userData });
    }, []);

    // Auto-refresh token before it expires
    useEffect(() => {
        if (!state.isAuthenticated || !state.tokens) return;

        const timeUntilExpiry = state.tokens.expiresAt - Date.now();
        const refreshTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 60000); // Refresh 5 minutes before expiry, minimum 1 minute

        const refreshTimer = setTimeout(async () => {
            try {
                await refreshToken();
            } catch (error) {
                console.error('Auto-refresh failed:', error);
            }
        }, refreshTime);

        return () => clearTimeout(refreshTimer);
    }, [state.isAuthenticated, state.tokens, refreshToken]);

    // Initialize auth on mount
    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);

    // Context value
    const contextValue: AuthContextType = {
        ...state,
        login,
        register,
        guestLogin,
        logout,
        refreshToken,
        clearError,
        updateUser,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the Auth Context
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Hook for checking authentication status
export const useRequireAuth = () => {
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            window.location.href = '/login';
        }
    }, [isAuthenticated, isLoading]);

    return { isAuthenticated, isLoading };
}; 