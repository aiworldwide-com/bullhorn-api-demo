import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/lib/api/config';

const API_BASE_URL = getApiBaseUrl();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Forward the request to the actual API
        const response = await fetch(`${API_BASE_URL}/api/Token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // Add any other headers the API requires
            },
            body: JSON.stringify(body)
        });

        const data = await response.text();

        // Return the response with proper CORS headers
        return new NextResponse(data, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                // Enable CORS for your frontend
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    } catch (error) {
        console.error('Proxy error:', error);

        return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 });
    }
}

// Handle preflight requests
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}
