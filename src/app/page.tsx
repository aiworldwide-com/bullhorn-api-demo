'use client';

import { useState } from 'react';

import { useAuthContext } from '@/components/auth/auth-provider';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { useApiClient } from '@/hooks/use-api';
import { decodeJwtToken, formatJwtDate } from '@/lib/jwt-utils';
import { queryKeys } from '@/lib/query-client';
import { Alert, AlertDescription } from '@/registry/new-york-v4/ui/alert';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card';
// Removed Input import as search UI is being removed
// import { Input } from '@/registry/new-york-v4/ui/input';
import { Skeleton } from '@/registry/new-york-v4/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/registry/new-york-v4/ui/table';
import { useQuery } from '@tanstack/react-query';

import { AlertCircle, Building2, Clock, Key, Shield, User } from 'lucide-react';

export default function HomePage() {
    // Removed tenants search term state
    // const [searchTerm, setSearchTerm] = useState('');
    const apiClient = useApiClient();
    const { token } = useAuthContext();

    // Fetch tenants
    const {
        data: tenants,
        isLoading: tenantsLoading,
        error: tenantsError
    } = useQuery({
        queryKey: queryKeys.tenants.list(),
        queryFn: async () => {
            const response = await apiClient.tenants.apiTenantGet();

            return response;
        },
        staleTime: 5 * 60 * 1000 // 5 minutes
    });

    // Filter tenants based on search term
    const filteredTenants = tenants || [];

    // Decode JWT token if available
    const jwtInfo = token ? decodeJwtToken(token) : null;

    return (
        <DashboardShell>
            <div className='flex-1 space-y-4 p-4 pt-6 md:p-8'>
                <div className='flex items-center justify-between space-y-2'>
                    <div>
                        <h2 className='accent-highlight text-3xl font-bold tracking-tight'>Home</h2>
                        <p className='text-muted-foreground'>Welcome to the Bullhorn API Demo</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className='grid gap-4 md:grid-cols-2'>
                    {/* Search and Tenants Table */}
                    <Card className='border-l-ai-yellow border-l-4'>
                        <CardHeader>
                            <div className='flex items-center justify-between'>
                                <div>
                                    <CardTitle className='ai-blue'>Tenants</CardTitle>
                                    <CardDescription>Manage and explore tenant configurations</CardDescription>
                                </div>
                                {/* Search UI removed as requested */}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {tenantsError ? (
                                <Alert variant='destructive'>
                                    <AlertCircle className='h-4 w-4' />
                                    <AlertDescription>
                                        Failed to load tenants:{' '}
                                        {tenantsError instanceof Error ? tenantsError.message : 'Unknown error'}
                                    </AlertDescription>
                                </Alert>
                            ) : tenantsLoading ? (
                                <div className='space-y-3'>
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className='flex items-center space-x-4'>
                                            <Skeleton className='h-4 w-[200px]' />
                                            <Skeleton className='h-4 w-[100px]' />
                                            <Skeleton className='h-4 w-[80px]' />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Code</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTenants.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={2} className='text-muted-foreground text-center'>
                                                    No tenants found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredTenants.map((tenant) => (
                                                <TableRow key={tenant.tenantId}>
                                                    <TableCell className='font-medium'>{tenant.tenantName}</TableCell>
                                                    <TableCell>{tenant.tenantCode}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* JWT Details Card */}
                    <Card className='border-l-ai-yellow border-l-4'>
                        <CardHeader>
                            <div className='flex items-center space-x-2'>
                                <Shield className='ai-blue h-5 w-5' />
                                <div>
                                    <CardTitle className='ai-blue'>JWT Token Details</CardTitle>
                                    <CardDescription>Authentication token information</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!token ? (
                                <Alert>
                                    <AlertCircle className='h-4 w-4' />
                                    <AlertDescription>No authentication token available</AlertDescription>
                                </Alert>
                            ) : jwtInfo?.error ? (
                                <Alert variant='destructive'>
                                    <AlertCircle className='h-4 w-4' />
                                    <AlertDescription>Invalid token: {jwtInfo.error}</AlertDescription>
                                </Alert>
                            ) : (
                                <div className='space-y-4'>
                                    {/* Token Status */}
                                    <div className='flex items-center justify-between'>
                                        <span className='text-sm font-medium'>Status:</span>
                                        <Badge variant={jwtInfo?.isExpired ? 'destructive' : 'default'}>
                                            {jwtInfo?.isExpired ? 'Expired' : 'Valid'}
                                        </Badge>
                                    </div>

                                    {/* Subject */}
                                    {jwtInfo?.payload.sub && (
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center space-x-2'>
                                                <User className='text-muted-foreground h-4 w-4' />
                                                <span className='text-sm font-medium'>Subject:</span>
                                            </div>
                                            <span className='text-muted-foreground text-sm'>{jwtInfo.payload.sub}</span>
                                        </div>
                                    )}

                                    {/* Client ID */}
                                    {jwtInfo?.payload.client_id && (
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center space-x-2'>
                                                <Key className='text-muted-foreground h-4 w-4' />
                                                <span className='text-sm font-medium'>Client ID:</span>
                                            </div>
                                            <span className='text-muted-foreground text-sm'>
                                                {jwtInfo.payload.client_id}
                                            </span>
                                        </div>
                                    )}

                                    {/* Issuer */}
                                    {jwtInfo?.payload.iss && (
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center space-x-2'>
                                                <Building2 className='text-muted-foreground h-4 w-4' />
                                                <span className='text-sm font-medium'>Issuer:</span>
                                            </div>
                                            <span className='text-muted-foreground text-sm'>{jwtInfo.payload.iss}</span>
                                        </div>
                                    )}

                                    {/* Expiration */}
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center space-x-2'>
                                            <Clock className='text-muted-foreground h-4 w-4' />
                                            <span className='text-sm font-medium'>Expires:</span>
                                        </div>
                                        <div className='text-right'>
                                            <div className='text-muted-foreground text-sm'>
                                                {formatJwtDate(jwtInfo?.payload.exp)}
                                            </div>
                                            {jwtInfo?.timeUntilExpiry && (
                                                <div className='text-muted-foreground text-xs'>
                                                    {jwtInfo.timeUntilExpiry}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Issued At */}
                                    {jwtInfo?.payload.iat && (
                                        <div className='flex items-center justify-between'>
                                            <span className='text-sm font-medium'>Issued:</span>
                                            <span className='text-muted-foreground text-sm'>
                                                {formatJwtDate(jwtInfo.payload.iat)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Scope */}
                                    {jwtInfo?.payload.scope && (
                                        <div className='flex items-center justify-between'>
                                            <span className='text-sm font-medium'>Scope:</span>
                                            <span className='text-muted-foreground text-sm'>
                                                {jwtInfo.payload.scope}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardShell>
    );
}
