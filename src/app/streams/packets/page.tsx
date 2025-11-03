'use client';

import { useState } from 'react';

import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { useApiClient } from '@/hooks/use-api';
import { PacketViewModel } from '@/lib/api/generated/src/models';
import { Alert, AlertDescription } from '@/registry/new-york-v4/ui/alert';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/registry/new-york-v4/ui/table';
import { useMutation } from '@tanstack/react-query';

import {
    AlertCircle,
    ArrowRight,
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Database,
    MapPin,
    Radio
} from 'lucide-react';

export default function PacketStreamPage() {
    const [packets, setPackets] = useState<PacketViewModel[]>([]);
    const [currentWatermark, setCurrentWatermark] = useState<Date | null>(null);
    const [nextWatermark, setNextWatermark] = useState<Date | null>(null);
    const [totalFetched, setTotalFetched] = useState(0);
    const [expandedPackets, setExpandedPackets] = useState<Set<number>>(new Set());

    const apiClient = useApiClient();

    // Check if we've reached the end of the stream (nextWatermark is epoch/invalid date)
    const isEndOfStream = nextWatermark && nextWatermark.getFullYear() < 1900;

    const {
        mutate: fetchPackets,
        isPending,
        isError,
        error
    } = useMutation({
        mutationFn: async (watermark?: Date) => {
            const response = await apiClient.packets.apiPacketGet({
                watermark: watermark
            });

            return response;
        },
        onSuccess: (data) => {
            // Only update currentWatermark if we're not at end of stream
            // When at end of stream, keep reusing the same currentWatermark
            const newNextMark = data.nextMark || null;
            const isNewEndOfStream = newNextMark && newNextMark.getFullYear() < 1900;

            if (!isEndOfStream) {
                setCurrentWatermark(nextWatermark);
            }
            setNextWatermark(newNextMark);
            setPackets(data.results || []);
            setTotalFetched((prev) => prev + (data.results?.length || 0));
        }
    });

    const handleFetchNext = () => {
        // When at end of stream, re-use current watermark instead of next
        const watermarkToUse = isEndOfStream ? currentWatermark : nextWatermark;
        fetchPackets(watermarkToUse || undefined);
    };

    const handleReset = () => {
        setPackets([]);
        setCurrentWatermark(null);
        setNextWatermark(null);
        setTotalFetched(0);
        setExpandedPackets(new Set());
        fetchPackets(undefined);
    };

    const togglePacketExpansion = (packetId: number) => {
        setExpandedPackets((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(packetId)) {
                newSet.delete(packetId);
            } else {
                newSet.add(packetId);
            }

            return newSet;
        });
    };

    return (
        <DashboardShell>
            <div className='flex-1 space-y-4 p-4 pt-6 md:p-8'>
                {/* Header */}
                <div className='flex items-center justify-between'>
                    <div>
                        <h2 className='text-3xl font-bold tracking-tight'>Packet Stream</h2>
                        <p className='text-muted-foreground'>
                            Watermark-based pagination demo for streaming packet data
                        </p>
                    </div>
                </div>

                {/* Error Alert */}
                {isError && (
                    <Alert variant='destructive'>
                        <AlertCircle className='h-4 w-4' />
                        <AlertDescription>
                            Failed to fetch packets: {error instanceof Error ? error.message : 'Unknown error'}
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
                                <Calendar className='text-muted-foreground h-4 w-4 flex-shrink-0' />
                                <div className='flex-1'>
                                    <p className='text-muted-foreground text-xs'>Current Watermark</p>
                                    <p className='text-sm font-semibold'>
                                        {currentWatermark ? currentWatermark.toLocaleString() : 'Start'}
                                    </p>
                                </div>
                            </div>
                            <div className='flex items-center gap-2'>
                                <Radio className='text-muted-foreground h-4 w-4 flex-shrink-0' />
                                <div className='flex-1'>
                                    <p className='text-muted-foreground text-xs'>Next Watermark</p>
                                    <p className='text-sm font-semibold'>
                                        {isEndOfStream
                                            ? 'End of Stream'
                                            : nextWatermark
                                              ? nextWatermark.toLocaleString()
                                              : 'Not Set'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* How It Works Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className='text-sm font-medium'>How Watermark Pagination Works</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol className='text-muted-foreground list-inside list-decimal space-y-1 text-xs'>
                                <li>
                                    <strong>Initial Request:</strong> Start with no watermark
                                </li>
                                <li>
                                    <strong>Response:</strong> Includes{' '}
                                    <code className='bg-muted rounded px-1 py-0.5'>nextMark</code>
                                </li>
                                <li>
                                    <strong>Next Request:</strong> Use{' '}
                                    <code className='bg-muted rounded px-1 py-0.5'>nextMark</code> as watermark
                                </li>
                                <li>
                                    <strong>Continue:</strong> Keep fetching with latest watermark
                                </li>
                            </ol>
                        </CardContent>
                    </Card>
                </div>

                {/* Packets Grid */}
                <div className='space-y-4'>
                    <div>
                        <h3 className='text-lg font-semibold'>Current Batch</h3>
                        <p className='text-muted-foreground text-sm'>
                            {packets.length > 0
                                ? `Showing ${packets.length} packet${packets.length > 1 ? 's' : ''} from the current request`
                                : 'Click "Start from Beginning" or "Fetch Next" to load packets'}
                        </p>
                    </div>

                    {packets.length === 0 ? (
                        <Card>
                            <CardContent className='py-12'>
                                <div className='text-muted-foreground flex flex-col items-center justify-center text-center'>
                                    <Radio className='mb-4 h-12 w-12 opacity-20' />
                                    <p className='text-lg font-medium'>No packets loaded yet</p>
                                    <p className='text-sm'>Click &quot;Start from Beginning&quot; to begin streaming</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        packets.map((packet) => (
                            <Card key={packet.id} className='overflow-hidden'>
                                <CardHeader
                                    className='hover:bg-muted/50 cursor-pointer transition-colors'
                                    onClick={() => togglePacketExpansion(packet.id || 0)}>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-3'>
                                            {expandedPackets.has(packet.id || 0) ? (
                                                <ChevronDown className='h-4 w-4' />
                                            ) : (
                                                <ChevronRight className='h-4 w-4' />
                                            )}
                                            <div>
                                                <CardTitle className='text-base'>
                                                    Packet #{packet.id} - Unit {packet.unitId || '—'}
                                                </CardTitle>
                                                <div className='text-muted-foreground mt-2 flex items-center gap-4 text-sm'>
                                                    <Badge variant='outline'>{packet.packetType || 'Unknown'}</Badge>
                                                    <span>Serial: {packet.serialNumber || '—'}</span>
                                                    <span>Facility: {packet.facilityId || '—'}</span>
                                                    {packet.latitude && packet.longitude && (
                                                        <span className='flex items-center gap-1'>
                                                            <MapPin className='h-3 w-3' />
                                                            {packet.latitude.toFixed(4)}, {packet.longitude.toFixed(4)}
                                                        </span>
                                                    )}
                                                    <span>
                                                        Received:{' '}
                                                        {packet.receivedDate
                                                            ? new Date(packet.receivedDate).toLocaleString()
                                                            : '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant='secondary'>{packet.data?.length || 0} datapoints</Badge>
                                    </div>
                                </CardHeader>

                                {expandedPackets.has(packet.id || 0) && packet.data && packet.data.length > 0 && (
                                    <CardContent className='pt-0'>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Data Point Name</TableHead>
                                                    <TableHead>Default Name</TableHead>
                                                    <TableHead>Engineering Label</TableHead>
                                                    <TableHead>Value</TableHead>
                                                    <TableHead>Measurement</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {packet.data.map((dataPoint, index) => (
                                                    <TableRow key={dataPoint.id || index}>
                                                        <TableCell className='font-medium'>
                                                            {dataPoint.dataPointName || '—'}
                                                        </TableCell>
                                                        <TableCell>{dataPoint.defaultName || '—'}</TableCell>
                                                        <TableCell>{dataPoint.engineeringLabel || '—'}</TableCell>
                                                        <TableCell>{dataPoint.value ?? '—'}</TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={
                                                                    dataPoint.isMeasurement ? 'default' : 'secondary'
                                                                }>
                                                                {dataPoint.isMeasurement ? 'Yes' : 'No'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                )}
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </DashboardShell>
    );
}
