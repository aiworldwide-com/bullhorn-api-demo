'use client';

import { ReactNode, createContext, useContext } from 'react';

import { type AuthState, useAuth } from '@/hooks/use-auth';

interface AuthContextType extends AuthState {
    login: (credentials: { clientId: string; clientSecret: string }) => void;
    logout: () => void;
    handleAuthError: () => void;
    initializeAuth: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const auth = useAuth();

    // Note: useAuth hook already initializes auth state on mount
    // No need to call initializeAuth here to avoid duplicate initialization

    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}
