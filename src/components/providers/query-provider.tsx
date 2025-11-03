'use client';

import { ReactNode, useState } from 'react';

import { createQueryClient } from '@/lib/query-client';
import { QueryClientProvider } from '@tanstack/react-query';

interface QueryProviderProps {
    children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
    // Create a stable query client instance
    const [queryClient] = useState(() => createQueryClient());

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
