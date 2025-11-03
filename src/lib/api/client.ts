import {
    PacketApi,
    ReadingsApi,
    TenantApi,
    TokenApi,
    UnitApi,
    UnitDataPointApi,
    UnitGroupApi
} from './generated/src/apis';
import { Configuration, ConfigurationParameters } from './generated/src/runtime';

import { getClientApiBaseUrl } from './config';

/**
 * Configuration for the Bullhorn API client
 */
export interface BullhornApiConfig {
    basePath?: string;
    accessToken?: string;
    onAuthError?: () => void;
}

/**
 * Creates a configured API client for the Bullhorn API
 */
export function createBullhornApiClient(config: BullhornApiConfig = {}) {
    const configuration = new Configuration({
        basePath: config.basePath || '/api/proxy',
        accessToken: config.accessToken,
        middleware: [
            {
                pre: async (context) => {
                    // Add authorization header if token is available
                    if (config.accessToken) {
                        context.init.headers = {
                            ...context.init.headers,
                            Authorization: `Bearer ${config.accessToken}`
                        };
                    }

                    return context;
                },
                post: async (context) => {
                    // Handle authentication errors
                    if (context.response.status === 401 || context.response.status === 403) {
                        if (config.onAuthError) {
                            config.onAuthError();
                        }
                    }

                    return context.response;
                }
            }
        ]
    });

    return {
        readings: new ReadingsApi(configuration),
        units: new UnitApi(configuration),
        unitGroups: new UnitGroupApi(configuration),
        unitDataPoints: new UnitDataPointApi(configuration),
        tenants: new TenantApi(configuration),
        packets: new PacketApi(configuration),
        token: new TokenApi(configuration)
    };
}

/**
 * Type for the complete API client
 */
export type BullhornApiClient = ReturnType<typeof createBullhornApiClient>;

/**
 * Default API client instance (without authentication)
 */
export const defaultApiClient = createBullhornApiClient();
