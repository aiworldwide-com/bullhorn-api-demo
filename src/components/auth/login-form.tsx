'use client';

import { useState } from 'react';

import { useAuthContext } from '@/components/auth/auth-provider';
import { Alert, AlertDescription } from '@/registry/new-york-v4/ui/alert';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card';
import { Input } from '@/registry/new-york-v4/ui/input';
import { Label } from '@/registry/new-york-v4/ui/label';

import { Loader2 } from 'lucide-react';

export function LoginForm() {
    const [credentials, setCredentials] = useState({
        clientId: '',
        clientSecret: ''
    });

    const { login, isLoading, error } = useAuthContext();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (credentials.clientId && credentials.clientSecret) {
            login(credentials);
        }
    };

    const handleInputChange = (field: 'clientId' | 'clientSecret') => (e: React.ChangeEvent<HTMLInputElement>) => {
        setCredentials((prev) => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    return (
        <div className='bg-background flex min-h-screen items-center justify-center p-4'>
            <Card className='w-full max-w-md'>
                <CardHeader className='space-y-1'>
                    <CardTitle className='text-2xl font-bold'>Bullhorn API Demo</CardTitle>
                    <CardDescription>Enter your client credentials to access the API demo</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='clientId'>Client ID</Label>
                            <Input
                                id='clientId'
                                type='text'
                                placeholder='Enter your client ID'
                                value={credentials.clientId}
                                onChange={handleInputChange('clientId')}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='clientSecret'>Client Secret</Label>
                            <Input
                                id='clientSecret'
                                type='password'
                                placeholder='Enter your client secret'
                                value={credentials.clientSecret}
                                onChange={handleInputChange('clientSecret')}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        {error && (
                            <Alert variant='destructive'>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button
                            type='submit'
                            className='w-full'
                            disabled={isLoading || !credentials.clientId || !credentials.clientSecret}>
                            {isLoading ? (
                                <>
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
