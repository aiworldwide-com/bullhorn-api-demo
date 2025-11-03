import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/lib/api/config';

const API_BASE_URL = getApiBaseUrl();

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;

    return proxyRequest(request, resolvedParams.path, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;

    return proxyRequest(request, resolvedParams.path, 'POST');
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;

    return proxyRequest(request, resolvedParams.path, 'PUT');
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;

    return proxyRequest(request, resolvedParams.path, 'DELETE');
}

export async function OPTIONS(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}

async function proxyRequest(request: NextRequest, pathSegments: string[], method: string) {
    try {
        const path = pathSegments.join('/');
        const url = new URL(request.url);
        const searchParams = url.searchParams.toString();
        const targetUrl = `${API_BASE_URL}/${path}${searchParams ? `?${searchParams}` : ''}`;

        console.log(`Proxying ${method} request to: ${targetUrl}`);

        // Get request headers, excluding some that shouldn't be forwarded
        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => {
            if (!['host', 'origin', 'referer'].includes(key.toLowerCase())) {
                headers[key] = value;
            }
        });

        // Log important headers for debugging
        console.log('Authorization header:', headers['authorization'] || 'NOT PRESENT');
        console.log('Content-Type header:', headers['content-type'] || 'NOT PRESENT');

        // Add Content-Type if not present for POST/PUT
        if (['POST', 'PUT'].includes(method) && !headers['content-type']) {
            headers['Content-Type'] = 'application/json';
        }

        let body: string | undefined;
        if (['POST', 'PUT'].includes(method)) {
            body = await request.text();
            console.log('Request body:', body?.substring(0, 200) + (body && body.length > 200 ? '...' : ''));
        }

        // Retry logic for connection failures
        let lastError: Error | null = null;
        let response: Response | null = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`Attempt ${attempt} for ${method} ${targetUrl}`);

                response = await fetch(targetUrl, {
                    method,
                    headers,
                    body,
                    // Add timeout and better error handling
                    signal: AbortSignal.timeout(30000) // 30 second timeout
                });

                // If we get here, the request succeeded
                break;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                console.log(`Attempt ${attempt} failed:`, lastError.message);

                // If it's a connection error and we have retries left, wait and retry
                if (
                    attempt < 3 &&
                    (lastError.message.includes('ECONNRESET') || lastError.message.includes('fetch failed'))
                ) {
                    console.log(`Retrying in ${attempt * 1000}ms...`);
                    await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
                    continue;
                }

                // If it's not a connection error or we're out of retries, throw
                throw lastError;
            }
        }

        if (!response) {
            throw lastError || new Error('Failed to get response after retries');
        }

        const responseData = await response.text();

        return new NextResponse(responseData, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    } catch (error) {
        console.error('Proxy error:', error);

        // More specific error handling
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                console.error('Request timeout');

                return NextResponse.json({ error: 'Request timeout' }, { status: 408 });
            }
            if (error.message.includes('ECONNRESET') || error.message.includes('fetch failed')) {
                console.error('Connection error:', error.message);

                return NextResponse.json({ error: 'Connection to API server failed' }, { status: 503 });
            }
        }

        return NextResponse.json(
            {
                error: 'Proxy request failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
