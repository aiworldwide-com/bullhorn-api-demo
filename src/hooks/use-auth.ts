'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createBullhornApiClient } from '@/lib/api/client';
import { decodeJwtToken } from '@/lib/jwt-utils';
import { useMutation } from '@tanstack/react-query';

export interface AuthState {
    isAuthenticated: boolean;
    token: string | null;
    isLoading: boolean;
    error: string | null;
}

export interface LoginCredentials {
    clientId: string;
    clientSecret: string;
}

/**
 * Custom hook for managing authentication state
 */
export function useAuth() {
    const [authState, setAuthState] = useState<AuthState>({
        isAuthenticated: false,
        token: null,
        isLoading: false,
        error: null
    });

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: async (credentials: LoginCredentials) => {
            // Use the Next.js API route proxy to avoid CORS issues
            const response = await fetch('/api/auth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientId: credentials.clientId,
                    clientSecret: credentials.clientSecret
                })
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status}`);
            }

            const data = await response.text();

            // Parse the token from the response
            let tokenData;
            try {
                tokenData = JSON.parse(data);
            } catch {
                // If it's not JSON, treat the whole response as the token
                tokenData = { accessToken: data };
            }

            const token = tokenData.accessToken || tokenData.access_token || tokenData.token || data;

            if (!token) {
                throw new Error('No token received from server');
            }

            return {
                token: token,
                expiresIn: tokenData.expiresIn || tokenData.expires_in || 3600
            };
        },
        onMutate: () => {
            setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
        },
        onSuccess: (data) => {
            const token = data.token;

            // Store token in localStorage (in production, consider httpOnly cookies)
            localStorage.setItem('bullhorn_token', token);

            setAuthState({
                isAuthenticated: true,
                token,
                isLoading: false,
                error: null
            });
        },
        onError: (error) => {
            setAuthState((prev) => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Login failed'
            }));
        }
    });

    // Login function
    const login = useCallback(
        (credentials: LoginCredentials) => {
            loginMutation.mutate(credentials);
        },
        [loginMutation]
    );

    // Logout function
    const logout = useCallback(() => {
        localStorage.removeItem('bullhorn_token');
        setAuthState({
            isAuthenticated: false,
            token: null,
            isLoading: false,
            error: null
        });
    }, []);

    // Handle auth errors (token expiration, etc.)
    const handleAuthError = useCallback(() => {
        localStorage.removeItem('bullhorn_token');
        setAuthState({
            isAuthenticated: false,
            token: null,
            isLoading: false,
            error: 'Session expired. Please login again.'
        });
    }, []);

    // Initialize authentication state from localStorage
    const initializeAuth = useCallback(() => {
        const token = localStorage.getItem('bullhorn_token');
        if (token) {
            // Validate the token - check if it's expired or invalid
            const decoded = decodeJwtToken(token);
            if (decoded.isExpired || decoded.error) {
                // Token is expired or invalid, remove it and require login
                localStorage.removeItem('bullhorn_token');
                setAuthState({
                    isAuthenticated: false,
                    token: null,
                    isLoading: false,
                    error: null
                });
            } else {
                // Token is valid
                setAuthState({
                    isAuthenticated: true,
                    token,
                    isLoading: false,
                    error: null
                });
            }
        } else {
            // No token found
            setAuthState({
                isAuthenticated: false,
                token: null,
                isLoading: false,
                error: null
            });
        }
    }, []);

    // Initialize auth state on mount
    useEffect(() => {
        // Set loading state initially
        setAuthState((prev) => ({ ...prev, isLoading: true }));
        // Then initialize auth (which will set isLoading to false)
        initializeAuth();
    }, [initializeAuth]);

    return useMemo(
        () => ({
            ...authState,
            login,
            logout,
            handleAuthError,
            initializeAuth
        }),
        [authState, login, logout, handleAuthError, initializeAuth]
    );
}
