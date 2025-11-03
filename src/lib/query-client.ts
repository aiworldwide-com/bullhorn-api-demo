import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a new TanStack Query client with optimized settings for the Bullhorn API
 */
export function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // Consider data stale after 5 minutes
                staleTime: 5 * 60 * 1000,
                // Keep data in cache for 10 minutes
                gcTime: 10 * 60 * 1000,
                // Retry failed requests 3 times
                retry: 3,
                // Don't refetch on window focus by default
                refetchOnWindowFocus: false,
                // Enable experimental prefetch in render for Suspense
                experimental_prefetchInRender: true
            },
            mutations: {
                // Retry failed mutations once
                retry: 1
            }
        }
    });
}

/**
 * Query key factory for the Bullhorn API
 * Provides a structured approach to query keys for better cache management
 */
export const queryKeys = {
    // Authentication
    auth: ['auth'] as const,

    // Tenants
    tenants: {
        all: ['tenants'] as const,
        list: () => [...queryKeys.tenants.all, 'list'] as const
    },

    // Units
    units: {
        all: ['units'] as const,
        lists: () => [...queryKeys.units.all, 'list'] as const,
        list: (filters?: Record<string, unknown>) => [...queryKeys.units.lists(), filters] as const,
        details: () => [...queryKeys.units.all, 'detail'] as const,
        detail: (id: number) => [...queryKeys.units.details(), id] as const
    },

    // Unit Groups
    unitGroups: {
        all: ['unitGroups'] as const,
        lists: () => [...queryKeys.unitGroups.all, 'list'] as const,
        list: (active?: boolean) => [...queryKeys.unitGroups.lists(), { active }] as const,
        mapping: (unitGroupIds: number[]) => [...queryKeys.unitGroups.all, 'mapping', unitGroupIds] as const
    },

    // Unit Data Points
    unitDataPoints: {
        all: ['unitDataPoints'] as const,
        lists: () => [...queryKeys.unitDataPoints.all, 'list'] as const,
        list: (filters?: Record<string, unknown>) => [...queryKeys.unitDataPoints.lists(), filters] as const,
        details: () => [...queryKeys.unitDataPoints.all, 'detail'] as const,
        detail: (id: number) => [...queryKeys.unitDataPoints.details(), id] as const
    },

    // Readings
    readings: {
        all: ['readings'] as const,
        lists: () => [...queryKeys.readings.all, 'list'] as const,
        list: (filters?: Record<string, unknown>) => [...queryKeys.readings.lists(), filters] as const
    },

    // Streaming endpoints (Change Feeds and Packets)
    streams: {
        all: ['streams'] as const,
        unitChanges: (watermark?: string) => [...queryKeys.streams.all, 'units', watermark] as const,
        dataPointChanges: (watermark?: string) => [...queryKeys.streams.all, 'dataPoints', watermark] as const,
        packets: (watermark?: string) => [...queryKeys.streams.all, 'packets', watermark] as const
    }
} as const;

/**
 * Default query client instance
 */
export const queryClient = createQueryClient();
