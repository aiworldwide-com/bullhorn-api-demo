'use client';

import { useMemo } from 'react';

import { useAuthContext } from '@/components/auth/auth-provider';
import { type BullhornApiClient, createBullhornApiClient } from '@/lib/api/client';

/**
 * Custom hook that provides an authenticated API client
 */
export function useApiClient(): BullhornApiClient {
    const { token, handleAuthError } = useAuthContext();

    return useMemo(() => {
        return createBullhornApiClient({
            accessToken: token || undefined,
            onAuthError: handleAuthError
        });
    }, [token, handleAuthError]);
}
