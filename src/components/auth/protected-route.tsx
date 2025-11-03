'use client';

import { ReactNode } from 'react';

import { useAuthContext } from './auth-provider';
import { LoginForm } from './login-form';

interface ProtectedRouteProps {
    children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuthContext();

    if (isLoading) {
        return (
            <div className='flex min-h-screen items-center justify-center'>
                <div className='text-center'>
                    <div className='border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2'></div>
                    <p className='text-muted-foreground mt-2 text-sm'>Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginForm />;
    }

    return <>{children}</>;
}
