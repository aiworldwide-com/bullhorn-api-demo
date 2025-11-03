'use client';

import { useState } from 'react';

import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { useApiClient } from '@/hooks/use-api';
import { CDCUnitModel } from '@/lib/api/generated/src/models';
import { Alert, AlertDescription } from '@/registry/new-york-v4/ui/alert';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/registry/new-york-v4/ui/table';
import { useMutation } from '@tanstack/react-query';

import { AlertCircle, ArrowRight, ChevronDown, ChevronRight, Database, MapPin, Radio } from 'lucide-react';

export default function UnitChangesPage() {
    const [changes, setChanges] = useState<CDCUnitModel[]>([]);
    const [currentWatermark, setCurrentWatermark] = useState<number | null>(null);
    const [nextWatermark, setNextWatermark] = useState<number | null>(null);
    const [totalFetched, setTotalFetched] = useState(0);
    const [expandedChanges, setExpandedChanges] = useState<Set<number>>(new Set());

    const apiClient = useApiClient();

    const {
        mutate: fetchChanges,
        isPending,
        isError,
        error
    } = useMutation({
        mutationFn: async (watermark?: number) => {
            console.log('Fetching unit changes with watermark:', watermark);
            const response = await apiClient.units.apiUnitUnitChangeFeedsGet({
                watermark: watermark
            });
            console.log('Unit changes response:', response);

            return response;
        },
        onSuccess: (data) => {
            console.log('Success! Data received:', {
                nextMark: data.nextMark,
                resultsCount: data.results?.length
            });
            setCurrentWatermark(nextWatermark);
            // nextMark is an incrementing ID (int64), not a timestamp
            // Extract it directly from the Date object as milliseconds, or parse if needed
            const nextMarkId = data.nextMark ? new Date(data.nextMark).getTime() : null;
            setNextWatermark(nextMarkId);
            setChanges(data.results || []);
            setTotalFetched((prev) => prev + (data.results?.length || 0));
        },
        onError: (err) => {
            console.error('Error fetching unit changes:', err);
        }
    });

    const handleFetchNext = () => {
        fetchChanges(nextWatermark || undefined);
    };

    const handleReset = () => {
        setChanges([]);
        setCurrentWatermark(null);
        setNextWatermark(null);
        setTotalFetched(0);
        setExpandedChanges(new Set());
        // Start with watermark 0 for the initial request
        fetchChanges(0);
    };

    const toggleChangeExpansion = (index: number) => {
        setExpandedChanges((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }

            return newSet;
        });
    };

    const getOperationBadge = (operation?: string | null) => {
        const op = operation?.toUpperCase();
        switch (op) {
            case 'INSERT':
                return <Badge className='bg-green-600 hover:bg-green-700'>Insert</Badge>;
            case 'UPDATE':
                return <Badge className='bg-blue-600 hover:bg-blue-700'>Update</Badge>;
            case 'DELETE':
                return <Badge className='bg-red-600 hover:bg-red-700'>Delete</Badge>;
            default:
                return <Badge variant='outline'>{operation || 'Unknown'}</Badge>;
        }
    };

    return (
        <DashboardShell>
            <div className='flex-1 space-y-4 p-4 pt-6 md:p-8'>
                {/* Header */}
                <div className='flex items-center justify-between'>
                    <div>
                        <h2 className='text-3xl font-bold tracking-tight'>Unit Changes</h2>
                        <p className='text-muted-foreground'>
                            Change Data Capture (CDC) stream showing unit modifications over time
                        </p>
                    </div>
                </div>

                {/* Error Alert */}
                {isError && (
                    <Alert variant='destructive'>
                        <AlertCircle className='h-4 w-4' />
                        <AlertDescription>
                            Failed to fetch unit changes: {error instanceof Error ? error.message : 'Unknown error'}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Watermark Status */}
                <div className='grid gap-4 md:grid-cols-3'>
                    {/* Control Buttons Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className='text-sm font-medium'>Request Controls</CardTitle>
                        </CardHeader>
                        <CardContent className='flex flex-col gap-2'>
                            <Button variant='outline' onClick={handleReset} disabled={isPending} className='w-full'>
                                <Database className='mr-2 h-4 w-4' />
                                Start from Beginning
                            </Button>
                            <Button onClick={handleFetchNext} disabled={isPending || !nextWatermark} className='w-full'>
                                <ArrowRight className='mr-2 h-4 w-4' />
                                {isPending ? 'Fetching...' : 'Fetch Next'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Combined Watermarks Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className='text-sm font-medium'>Watermarks</CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                            <div className='flex items-center gap-2'>
                                <Database className='text-muted-foreground h-4 w-4 flex-shrink-0' />
                                <div className='flex-1'>
                                    <p className='text-muted-foreground text-xs'>Current Watermark ID</p>
                                    <p className='text-sm font-semibold'>
                                        {currentWatermark !== null ? currentWatermark : '0 (Start)'}
                                    </p>
                                </div>
                            </div>
                            <div className='flex items-center gap-2'>
                                <Radio className='text-muted-foreground h-4 w-4 flex-shrink-0' />
                                <div className='flex-1'>
                                    <p className='text-muted-foreground text-xs'>Next Watermark ID</p>
                                    <p className='text-sm font-semibold'>
                                        {nextWatermark !== null ? nextWatermark : 'Not Set'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* How It Works Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className='text-sm font-medium'>How CDC Works</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol className='text-muted-foreground list-inside list-decimal space-y-1 text-xs'>
                                <li>
                                    <strong>Capture:</strong> Database tracks all unit changes
                                </li>
                                <li>
                                    <strong>Previous/New:</strong> Shows before &amp; after state
                                </li>
                                <li>
                                    <strong>Operations:</strong> INSERT, UPDATE, or DELETE
                                </li>
                                <li>
                                    <strong>Stream:</strong> Paginate through changes with watermarks
                                </li>
                            </ol>
                        </CardContent>
                    </Card>
                </div>

                {/* Changes Grid */}
                <div className='space-y-4'>
                    <div>
                        <h3 className='text-lg font-semibold'>Current Batch</h3>
                        <p className='text-muted-foreground text-sm'>
                            {changes.length > 0
                                ? `Showing ${changes.length} change${changes.length > 1 ? 's' : ''} from the current request`
                                : 'Click "Start from Beginning" or "Fetch Next" to load unit changes'}
                        </p>
                    </div>

                    {changes.length === 0 ? (
                        <Card>
                            <CardContent className='py-12'>
                                <div className='text-muted-foreground flex flex-col items-center justify-center text-center'>
                                    <Radio className='mb-4 h-12 w-12 opacity-20' />
                                    <p className='text-lg font-medium'>No unit changes loaded yet</p>
                                    <p className='text-sm'>Click &quot;Start from Beginning&quot; to begin streaming</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        changes.map((change, index) => {
                            const newVal = change.newValue;
                            const prevVal = change.previousValue;
                            const displayId = newVal?.id || prevVal?.id || index;

                            return (
                                <Card key={index} className='overflow-hidden'>
                                    <CardHeader
                                        className='hover:bg-muted/50 cursor-pointer transition-colors'
                                        onClick={() => toggleChangeExpansion(index)}>
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center gap-3'>
                                                {expandedChanges.has(index) ? (
                                                    <ChevronDown className='h-4 w-4' />
                                                ) : (
                                                    <ChevronRight className='h-4 w-4' />
                                                )}
                                                <div>
                                                    <CardTitle className='text-base'>
                                                        Unit Change #{displayId}
                                                    </CardTitle>
                                                    <div className='text-muted-foreground mt-2 flex items-center gap-4 text-sm'>
                                                        {getOperationBadge(newVal?.operation)}
                                                        <span>
                                                            Serial:{' '}
                                                            {newVal?.serialNumber || prevVal?.serialNumber || '—'}
                                                        </span>
                                                        <span>
                                                            Facility: {newVal?.facilityId || prevVal?.facilityId || '—'}
                                                        </span>
                                                        {(newVal?.latitude || prevVal?.latitude) &&
                                                            (newVal?.longitude || prevVal?.longitude) && (
                                                                <span className='flex items-center gap-1'>
                                                                    <MapPin className='h-3 w-3' />
                                                                    {(newVal?.latitude || prevVal?.latitude)?.toFixed(
                                                                        4
                                                                    )}
                                                                    ,{' '}
                                                                    {(newVal?.longitude || prevVal?.longitude)?.toFixed(
                                                                        4
                                                                    )}
                                                                </span>
                                                            )}
                                                        <span>
                                                            Changed:{' '}
                                                            {newVal?.timeStamp
                                                                ? new Date(newVal.timeStamp).toLocaleString()
                                                                : prevVal?.timeStamp
                                                                  ? new Date(prevVal.timeStamp).toLocaleString()
                                                                  : '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    {expandedChanges.has(index) && (
                                        <CardContent className='pt-0'>
                                            <div className='grid gap-6 md:grid-cols-2'>
                                                {/* Previous Value */}
                                                <div>
                                                    <h4 className='mb-3 text-sm font-semibold'>Previous Value</h4>
                                                    {prevVal ? (
                                                        <div className='bg-muted/50 space-y-2 rounded-lg border p-4'>
                                                            <div className='grid grid-cols-2 gap-2 text-sm'>
                                                                <span className='text-muted-foreground'>ID:</span>
                                                                <span className='font-medium'>{prevVal.id ?? '—'}</span>

                                                                <span className='text-muted-foreground'>
                                                                    Tenant ID:
                                                                </span>
                                                                <span className='font-medium'>
                                                                    {prevVal.tenantId ?? '—'}
                                                                </span>

                                                                <span className='text-muted-foreground'>
                                                                    Tenant Unit ID:
                                                                </span>
                                                                <span className='font-medium'>
                                                                    {prevVal.tenantUnitId ?? '—'}
                                                                </span>

                                                                <span className='text-muted-foreground'>
                                                                    Facility ID:
                                                                </span>
                                                                <span className='font-medium'>
                                                                    {prevVal.facilityId ?? '—'}
                                                                </span>

                                                                <span className='text-muted-foreground'>
                                                                    Serial Number:
                                                                </span>
                                                                <span className='font-medium'>
                                                                    {prevVal.serialNumber ?? '—'}
                                                                </span>

                                                                <span className='text-muted-foreground'>Latitude:</span>
                                                                <span className='font-medium'>
                                                                    {prevVal.latitude?.toFixed(6) ?? '—'}
                                                                </span>

                                                                <span className='text-muted-foreground'>
                                                                    Longitude:
                                                                </span>
                                                                <span className='font-medium'>
                                                                    {prevVal.longitude?.toFixed(6) ?? '—'}
                                                                </span>

                                                                <span className='text-muted-foreground'>
                                                                    Unit Identity:
                                                                </span>
                                                                <span className='font-medium'>
                                                                    {prevVal.unitIdentity ?? '—'}
                                                                </span>

                                                                <span className='text-muted-foreground'>
                                                                    Timestamp:
                                                                </span>
                                                                <span className='font-medium'>
                                                                    {prevVal.timeStamp
                                                                        ? new Date(prevVal.timeStamp).toLocaleString()
                                                                        : '—'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className='text-muted-foreground border-muted bg-muted/20 flex items-center justify-center rounded-lg border border-dashed p-8 text-sm'>
                                                            No previous value (new record)
                                                        </div>
                                                    )}
                                                </div>

                                                {/* New Value */}
                                                <div>
                                                    <h4 className='mb-3 text-sm font-semibold'>New Value</h4>
                                                    {newVal ? (
                                                        <div className='bg-muted/50 space-y-2 rounded-lg border p-4'>
                                                            <div className='grid grid-cols-2 gap-2 text-sm'>
                                                                <span className='text-muted-foreground'>ID:</span>
                                                                <span className='font-medium'>{newVal.id ?? '—'}</span>

                                                                <span className='text-muted-foreground'>
                                                                    Tenant ID:
                                                                </span>
                                                                <span className='font-medium'>
                                                                    {newVal.tenantId ?? '—'}
                                                                </span>

                                                                <span className='text-muted-foreground'>
                                                                    Tenant Unit ID:
                                                                </span>
                                                                <span className='font-medium'>
                                                                    {newVal.tenantUnitId ?? '—'}
                                                                </span>

                                                                <span className='text-muted-foreground'>
                                                                    Facility ID:
                                                                </span>
                                                                <span className='font-medium'>
                                                                    {newVal.facilityId ?? '—'}
                                                                </span>

                                                                <span className='text-muted-foreground'>
                                                                    Serial Number:
                                                                </span>
                                                                <span className='font-medium'>
                                                                    {newVal.serialNumber ?? '—'}
                                                                </span>

                                                                <span className='text-muted-foreground'>Latitude:</span>
                                                                <span className='font-medium'>
                                                                    {newVal.latitude?.toFixed(6) ?? '—'}
                                                                </span>

                                                                <span className='text-muted-foreground'>
                                                                    Longitude:
                                                                </span>
                                                                <span className='font-medium'>
                                                                    {newVal.longitude?.toFixed(6) ?? '—'}
                                                                </span>

                                                                <span className='text-muted-foreground'>
                                                                    Unit Identity:
                                                                </span>
                                                                <span className='font-medium'>
                                                                    {newVal.unitIdentity ?? '—'}
                                                                </span>

                                                                <span className='text-muted-foreground'>
                                                                    Timestamp:
                                                                </span>
                                                                <span className='font-medium'>
                                                                    {newVal.timeStamp
                                                                        ? new Date(newVal.timeStamp).toLocaleString()
                                                                        : '—'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className='text-muted-foreground border-muted bg-muted/20 flex items-center justify-center rounded-lg border border-dashed p-8 text-sm'>
                                                            No new value (deleted record)
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>
        </DashboardShell>
    );
}
