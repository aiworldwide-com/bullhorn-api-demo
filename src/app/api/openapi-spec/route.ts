import { NextResponse } from 'next/server';

import openapiSpec from '../../../../boa-swagger.json';

export async function GET() {
    return NextResponse.json(openapiSpec);
}
