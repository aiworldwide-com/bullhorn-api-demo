/**
 * Centralized API configuration
 * 
 * Default API base URL for the Bullhorn API demo.
 * Can be overridden via environment variables:
 * - API_BASE_URL (server-side)
 * - NEXT_PUBLIC_API_BASE_URL (client-side)
 */

export const DEFAULT_API_BASE_URL = 'https://api.bullhornsys.com';

/**
 * Get the API base URL for server-side code
 * Uses API_BASE_URL env var or falls back to default
 */
export function getApiBaseUrl(): string {
    return process.env.API_BASE_URL || DEFAULT_API_BASE_URL;
}

/**
 * Get the API base URL for client-side code
 * Uses NEXT_PUBLIC_API_BASE_URL env var or falls back to default
 */
export function getClientApiBaseUrl(): string {
    return process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
}

