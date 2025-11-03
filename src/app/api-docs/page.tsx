'use client';

import { useEffect, useState } from 'react';

import { useTheme } from 'next-themes';

import { useAuthContext } from '@/components/auth/auth-provider';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { Skeleton } from '@/registry/new-york-v4/ui/skeleton';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

export default function ScalarApiDocsPage() {
    const [spec, setSpec] = useState(null);
    const { theme, systemTheme } = useTheme();
    const { token } = useAuthContext();
    const [mounted, setMounted] = useState(false);

    // Determine the actual theme (handles 'system' theme)
    const currentTheme = theme === 'system' ? systemTheme : theme;

    useEffect(() => {
        setMounted(true);
        // Fetch the OpenAPI spec
        fetch('/api/openapi-spec')
            .then((res) => res.json())
            .then((data) => setSpec(data))
            .catch((err) => console.error('Error loading OpenAPI spec:', err));
    }, []);

    if (!mounted || !spec) {
        return (
            <DashboardShell>
                <div className='flex-1 space-y-4'>
                    <div className='space-y-2'>
                        <Skeleton className='h-8 w-[400px]' />
                        <Skeleton className='h-4 w-[600px]' />
                    </div>
                    <div className='bg-card rounded-lg border p-8'>
                        <div className='space-y-4'>
                            <Skeleton className='h-6 w-full' />
                            <Skeleton className='h-6 w-full' />
                            <Skeleton className='h-6 w-3/4' />
                        </div>
                    </div>
                </div>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell>
            <div className='flex flex-1 flex-col' style={{ height: 'calc(100vh - 6.5rem)' }}>
                {/* Scalar Container - Full height */}
                <div className='w-full flex-1 overflow-hidden rounded-lg border'>
                    <ApiReferenceReact
                        key={currentTheme}
                        configuration={{
                            content: spec,
                            // Use 'default' theme - darkMode boolean handles light/dark switching
                            theme: 'default',
                            layout: 'classic',
                            darkMode: currentTheme === 'dark',
                            hideDarkModeToggle: true,
                            showSidebar: true,
                            showToolbar: 'never',
                            // Override server URL to use Next.js proxy
                            servers: [
                                {
                                    url: '/api/proxy',
                                    description: 'API (via proxy)'
                                }
                            ],
                            // Pass authentication token
                            ...(token && {
                                authentication: {
                                    preferredSecurityScheme: 'Bearer',
                                    securitySchemes: {
                                        Bearer: {
                                            token: token
                                        }
                                    }
                                }
                            }),
                            customCss: `
                                /* Ensure sidebar stays fixed */
                                .scalar-api-reference__sidebar {
                                    position: sticky !important;
                                    top: 0 !important;
                                    height: 100vh !important;
                                    overflow-y: auto !important;
                                }
                            `
                        }}
                    />
                </div>
            </div>
        </DashboardShell>
    );
}
