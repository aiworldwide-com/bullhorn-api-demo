import type { ReactNode } from 'react';

import type { Metadata } from 'next';
// Import Google Fonts for Proxima Nova alternative (using Inter as fallback since Proxima Nova requires license)
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';

import { ThemeProvider } from 'next-themes';

import '@/app/globals.css';
import { AuthProvider } from '@/components/auth/auth-provider';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/registry/new-york-v4/ui/sonner';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap'
});

const geistSans = localFont({
    src: './fonts/GeistVF.woff',
    variable: '--font-geist-sans',
    weight: '100 900'
});
const geistMono = localFont({
    src: './fonts/GeistMonoVF.woff',
    variable: '--font-geist-mono',
    weight: '100 900'
});

export const metadata: Metadata = {
    title: 'Bullhorn API Demo',
    description: 'Interactive demo for the Bullhorn Open API'
};

const Layout = ({ children }: Readonly<{ children: ReactNode }>) => {
    return (
        // ? https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
        // ? https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors
        <html suppressHydrationWarning lang='en'>
            <body
                className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} bg-background text-foreground overscroll-none font-sans antialiased`}>
                <QueryProvider>
                    <AuthProvider>
                        <ThemeProvider attribute='class'>
                            <ProtectedRoute>{children}</ProtectedRoute>
                            <Toaster />
                        </ThemeProvider>
                    </AuthProvider>
                </QueryProvider>
            </body>
        </html>
    );
};

export default Layout;
