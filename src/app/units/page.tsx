'use client';

import { useEffect, useState } from 'react';

import { useAuthContext } from '@/components/auth/auth-provider';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { useApiClient } from '@/hooks/use-api';
import type { UnitViewModel } from '@/lib/api/generated/src/models';
import { queryKeys } from '@/lib/query-client';
import { Alert, AlertDescription } from '@/registry/new-york-v4/ui/alert';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card';
import { Input } from '@/registry/new-york-v4/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/registry/new-york-v4/ui/select';
import { Skeleton } from '@/registry/new-york-v4/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/registry/new-york-v4/ui/table';
import { useQuery } from '@tanstack/react-query';

import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Download,
    Filter,
    RefreshCw,
    Search,
    X
} from 'lucide-react';

interface UnitsFilters extends Record<string, unknown> {
    unitType?: string;
    unitName?: string;
    facilityId?: string;
    serialNumber?: number;
    unitStatus?: string;
    lastPacketDate?: Date;
    sortColumn?: string;
    sortOrder?: string;
    page: number;
    pageSize: number;
}

export default function UnitsPage() {
    const [filters, setFilters] = useState<UnitsFilters>({
        page: 1,
        pageSize: 100
    });

    const apiClient = useApiClient();
    const { handleAuthError } = useAuthContext();

    // Fetch units with pagination
    const {
        data: unitsResponse,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: queryKeys.units.list(filters),
        queryFn: async () => {
            // Build query parameters, only including defined values
            // Note: API uses 0-based page indexing, but UI uses 1-based
            const params: any = {
                page: filters.page - 1, // Convert from 1-based to 0-based
                pageSize: filters.pageSize
            };

            if (filters.unitType) params.unitType = filters.unitType;
            if (filters.unitName) params.unitName = filters.unitName;
            if (filters.facilityId) params.facilityId = filters.facilityId;
            if (filters.serialNumber) params.serialNumber = filters.serialNumber;
            if (filters.unitStatus) params.unitStatus = filters.unitStatus;
            if (filters.lastPacketDate) params.lastPacketDate = filters.lastPacketDate;
            if (filters.sortColumn) params.sortColumn = filters.sortColumn;
            if (filters.sortOrder) params.sortOrder = filters.sortOrder;

            const response = await apiClient.units.apiUnitGet(params);

            return response;
        },
        staleTime: 2 * 60 * 1000 // 2 minutes
    });

    // Handle authentication errors
    useEffect(() => {
        if (error && (error as any)?.message?.includes('401')) {
            handleAuthError();
        }
    }, [error, handleAuthError]);

    const units: UnitViewModel[] = unitsResponse?.items || [];
    const totalItems = unitsResponse?.totalCount || 0;
    const totalPages = Math.ceil(totalItems / filters.pageSize);

    const updateFilters = (updates: Partial<UnitsFilters>) => {
        setFilters((prev) => ({ ...prev, ...updates, page: 1 })); // Reset to page 1 on filter change
    };

    const changePage = (newPage: number) => {
        setFilters((prev) => ({ ...prev, page: newPage }));
    };

    const handleSort = (column: string) => {
        setFilters((prev) => {
            // If clicking the same column, toggle the order
            if (prev.sortColumn === column) {
                const newOrder = prev.sortOrder === 'asc' ? 'desc' : 'asc';

                return { ...prev, sortOrder: newOrder, page: 1 };
            }
            // If clicking a new column, start with ascending

            return { ...prev, sortColumn: column, sortOrder: 'asc', page: 1 };
        });
    };

    const clearFilters = () => {
        setFilters({
            page: 1,
            pageSize: filters.pageSize // Keep the current page size
        });
    };

    const exportToCSV = () => {
        if (units.length === 0) {
            alert('No data to export');

            return;
        }

        // Create CSV headers
        const headers = [
            'ID',
            'Unit Name',
            'Unit Type',
            'Facility ID',
            'Serial Number',
            'Status',
            'Last Packet Date',
            'Latitude',
            'Longitude',
            'Tenant ID',
            'Tenant Unit ID',
            'Unit Notes'
        ];

        // Create CSV rows
        const csvRows = [
            headers.join(','),
            ...units.map((unit) =>
                [
                    unit.id || '',
                    `"${unit.unitName || ''}"`,
                    `"${unit.unitType || ''}"`,
                    `"${unit.facilityId || ''}"`,
                    unit.serialNumber || '',
                    `"${unit.unitStatus || ''}"`,
                    unit.lastPacketDate ? new Date(unit.lastPacketDate).toISOString() : '',
                    unit.latitude || '',
                    unit.longitude || '',
                    unit.tenantId || '',
                    `"${unit.tenantUnitId || ''}"`,
                    `"${unit.unitNotes || ''}"`
                ].join(',')
            )
        ];

        // Create and download the file
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `units-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getSortIcon = (column: string) => {
        if (filters.sortColumn !== column) {
            return <ArrowUpDown className='ml-2 h-4 w-4' />;
        }

        return filters.sortOrder === 'asc' ? (
            <ArrowUp className='ml-2 h-4 w-4' />
        ) : (
            <ArrowDown className='ml-2 h-4 w-4' />
        );
    };

    if (error) {
        return (
            <DashboardShell>
                <div className='flex-1 space-y-4 p-4 pt-6 md:p-8'>
                    <Alert variant='destructive'>
                        <AlertCircle className='h-4 w-4' />
                        <AlertDescription>
                            Failed to load units: {error instanceof Error ? error.message : 'Unknown error'}
                        </AlertDescription>
                    </Alert>
                    <Button onClick={() => refetch()} variant='outline'>
                        <RefreshCw className='mr-2 h-4 w-4' />
                        Try Again
                    </Button>
                </div>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell>
            <div className='flex-1 space-y-4 p-4 pt-6 md:p-8'>
                {/* Header */}
                <div className='flex items-center justify-between space-y-2'>
                    <div>
                        <h2 className='text-3xl font-bold tracking-tight'>Units</h2>
                        <p className='text-muted-foreground'>Manage and explore units in the system</p>
                    </div>
                    <div className='flex items-center space-x-2'>
                        <Button variant='outline' onClick={clearFilters}>
                            <X className='mr-2 h-4 w-4' />
                            Clear Filters
                        </Button>
                        <Button variant='outline' onClick={() => refetch()}>
                            <RefreshCw className='mr-2 h-4 w-4' />
                            Refresh
                        </Button>
                        <Button variant='outline' onClick={exportToCSV}>
                            <Download className='mr-2 h-4 w-4' />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center'>
                            <Filter className='mr-2 h-4 w-4' />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                            {/* Unit Name */}
                            <div className='space-y-2'>
                                <label className='text-sm font-medium'>Unit Name</label>
                                <div className='relative'>
                                    <Search className='text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4' />
                                    <Input
                                        placeholder='Search by unit name...'
                                        value={filters.unitName || ''}
                                        onChange={(e) => updateFilters({ unitName: e.target.value || undefined })}
                                        className='pl-8'
                                    />
                                </div>
                            </div>

                            {/* Unit Type */}
                            <div className='space-y-2'>
                                <label className='text-sm font-medium'>Unit Type</label>
                                <Input
                                    placeholder='Filter by unit type...'
                                    value={filters.unitType || ''}
                                    onChange={(e) => updateFilters({ unitType: e.target.value || undefined })}
                                />
                            </div>

                            {/* Facility ID */}
                            <div className='space-y-2'>
                                <label className='text-sm font-medium'>Facility ID</label>
                                <Input
                                    placeholder='Filter by facility ID...'
                                    value={filters.facilityId || ''}
                                    onChange={(e) => updateFilters({ facilityId: e.target.value || undefined })}
                                />
                            </div>

                            {/* Unit Status */}
                            <div className='space-y-2'>
                                <label className='text-sm font-medium'>Unit Status</label>
                                <Input
                                    placeholder='Filter by status...'
                                    value={filters.unitStatus || ''}
                                    onChange={(e) => updateFilters({ unitStatus: e.target.value || undefined })}
                                />
                            </div>

                            {/* Serial Number */}
                            <div className='space-y-2'>
                                <label className='text-sm font-medium'>Serial Number</label>
                                <Input
                                    type='number'
                                    placeholder='Filter by serial number...'
                                    value={filters.serialNumber || ''}
                                    onChange={(e) =>
                                        updateFilters({
                                            serialNumber: e.target.value ? parseInt(e.target.value) : undefined
                                        })
                                    }
                                />
                            </div>

                            {/* Last Packet Date */}
                            <div className='space-y-2'>
                                <label className='text-sm font-medium'>Last Packet Date</label>
                                <Input
                                    type='date'
                                    value={
                                        filters.lastPacketDate ? filters.lastPacketDate.toISOString().split('T')[0] : ''
                                    }
                                    onChange={(e) =>
                                        updateFilters({
                                            lastPacketDate: e.target.value ? new Date(e.target.value) : undefined
                                        })
                                    }
                                />
                            </div>

                            {/* Page Size */}
                            <div className='space-y-2'>
                                <label className='text-sm font-medium'>Page Size</label>
                                <Select
                                    value={filters.pageSize.toString()}
                                    onValueChange={(value) => updateFilters({ pageSize: parseInt(value) })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value='10'>10 per page</SelectItem>
                                        <SelectItem value='20'>20 per page</SelectItem>
                                        <SelectItem value='50'>50 per page</SelectItem>
                                        <SelectItem value='100'>100 per page</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Units Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Units List</CardTitle>
                        <div className='text-muted-foreground text-sm'>
                            Showing {(filters.page - 1) * filters.pageSize + 1} to{' '}
                            {Math.min(filters.page * filters.pageSize, totalItems)} of {totalItems} units
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className='space-y-3'>
                                {[...Array(filters.pageSize)].map((_, i) => (
                                    <div key={i} className='flex items-center space-x-4'>
                                        <Skeleton className='h-4 w-[200px]' />
                                        <Skeleton className='h-4 w-[150px]' />
                                        <Skeleton className='h-4 w-[100px]' />
                                        <Skeleton className='h-4 w-[80px]' />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead
                                                className='hover:bg-muted/50 cursor-pointer select-none'
                                                onClick={() => handleSort('id')}>
                                                <div className='flex items-center'>
                                                    ID
                                                    {getSortIcon('id')}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className='hover:bg-muted/50 cursor-pointer select-none'
                                                onClick={() => handleSort('unitName')}>
                                                <div className='flex items-center'>
                                                    Unit Name
                                                    {getSortIcon('unitName')}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className='hover:bg-muted/50 cursor-pointer select-none'
                                                onClick={() => handleSort('unitType')}>
                                                <div className='flex items-center'>
                                                    Unit Type
                                                    {getSortIcon('unitType')}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className='hover:bg-muted/50 cursor-pointer select-none'
                                                onClick={() => handleSort('facilityId')}>
                                                <div className='flex items-center'>
                                                    Facility ID
                                                    {getSortIcon('facilityId')}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className='hover:bg-muted/50 cursor-pointer select-none'
                                                onClick={() => handleSort('serialNumber')}>
                                                <div className='flex items-center'>
                                                    Serial Number
                                                    {getSortIcon('serialNumber')}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className='hover:bg-muted/50 cursor-pointer select-none'
                                                onClick={() => handleSort('unitStatus')}>
                                                <div className='flex items-center'>
                                                    Status
                                                    {getSortIcon('unitStatus')}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className='hover:bg-muted/50 cursor-pointer select-none'
                                                onClick={() => handleSort('lastPacketDate')}>
                                                <div className='flex items-center'>
                                                    Last Packet Date
                                                    {getSortIcon('lastPacketDate')}
                                                </div>
                                            </TableHead>
                                            <TableHead>Location</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {units.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className='text-muted-foreground text-center'>
                                                    No units found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            units.map((unit) => (
                                                <TableRow key={unit.id}>
                                                    <TableCell className='font-medium'>{unit.id}</TableCell>
                                                    <TableCell>{unit.unitName || '—'}</TableCell>
                                                    <TableCell>{unit.unitType || '—'}</TableCell>
                                                    <TableCell>{unit.facilityId || '—'}</TableCell>
                                                    <TableCell>{unit.serialNumber || '—'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={unit.unitStatus ? 'default' : 'secondary'}>
                                                            {unit.unitStatus || 'Unknown'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {unit.lastPacketDate
                                                            ? new Date(unit.lastPacketDate).toLocaleDateString()
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {unit.latitude && unit.longitude
                                                            ? `${unit.latitude.toFixed(4)}, ${unit.longitude.toFixed(4)}`
                                                            : '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className='flex items-center justify-between space-x-2 py-4'>
                                        <div className='text-muted-foreground text-sm'>
                                            Page {filters.page} of {totalPages}
                                        </div>
                                        <div className='flex items-center space-x-2'>
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                onClick={() => changePage(filters.page - 1)}
                                                disabled={filters.page === 1}>
                                                <ChevronLeft className='h-4 w-4' />
                                                Previous
                                            </Button>
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                onClick={() => changePage(filters.page + 1)}
                                                disabled={filters.page === totalPages}>
                                                Next
                                                <ChevronRight className='h-4 w-4' />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardShell>
    );
}
