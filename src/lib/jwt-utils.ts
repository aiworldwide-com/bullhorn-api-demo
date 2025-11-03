export interface JwtPayload {
    sub?: string;
    exp?: number;
    iat?: number;
    iss?: string;
    aud?: string | string[];
    client_id?: string;
    scope?: string;
    [key: string]: any;
}

export interface DecodedJwtInfo {
    payload: JwtPayload;
    isExpired: boolean;
    timeUntilExpiry?: string;
    error?: string;
}

function base64UrlDecode(str: string): string {
    // Replace URL-safe characters and add padding if necessary
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
        str += '=';
    }
    return atob(str);
}

export function decodeJwtToken(token: string): DecodedJwtInfo {
    try {
        // Split the token into parts
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT format');
        }

        // Decode the payload (second part)
        const payload = JSON.parse(base64UrlDecode(parts[1])) as JwtPayload;

        const now = Math.floor(Date.now() / 1000);
        const isExpired = payload.exp ? payload.exp < now : false;

        let timeUntilExpiry: string | undefined;
        if (payload.exp) {
            const timeLeft = payload.exp - now;
            if (timeLeft > 0) {
                const hours = Math.floor(timeLeft / 3600);
                const minutes = Math.floor((timeLeft % 3600) / 60);
                const seconds = timeLeft % 60;

                if (hours > 0) {
                    timeUntilExpiry = `${hours}h ${minutes}m`;
                } else if (minutes > 0) {
                    timeUntilExpiry = `${minutes}m ${seconds}s`;
                } else {
                    timeUntilExpiry = `${seconds}s`;
                }
            } else {
                timeUntilExpiry = 'Expired';
            }
        }

        return {
            payload,
            isExpired,
            timeUntilExpiry
        };
    } catch (error) {
        return {
            payload: {},
            isExpired: true,
            error: error instanceof Error ? error.message : 'Invalid token'
        };
    }
}

export function formatJwtDate(timestamp?: number): string {
    if (!timestamp) return '—';
    return new Date(timestamp * 1000).toLocaleString();
}
