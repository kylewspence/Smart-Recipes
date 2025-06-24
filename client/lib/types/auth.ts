export interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: 'User' | 'Moderator' | 'Admin';
    isEmailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    profile?: {
        bio?: string;
        avatar?: string;
        preferences?: {
            theme: 'light' | 'dark' | 'system';
            notifications: boolean;
            privacy: 'public' | 'private';
        };
    };
}

export interface LoginCredentials {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface RegisterData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    confirmPassword: string;
    terms: boolean;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
}

export interface AuthState {
    user: User | null;
    tokens: AuthTokens | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;
}

export interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<void>;
    clearError: () => void;
    updateUser: (userData: Partial<User>) => void;
}

export interface ApiError {
    message: string;
    status: number;
    details?: Record<string, unknown>;
}

export interface AuthResponse {
    user: User;
    token: string;
    refreshToken?: string;
    expiresIn: number;
}

// Password reset types
export interface PasswordResetRequest {
    email: string;
}

export interface PasswordResetData {
    token: string;
    password: string;
    confirmPassword: string;
}

// Email verification types
export interface EmailVerificationRequest {
    token: string;
}

export interface ResendVerificationRequest {
    email: string;
} 