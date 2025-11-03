'use client';

import { useEffect, useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { useApiClient } from '@/hooks/use-api';
import { queryKeys } from '@/lib/query-client';
import { Alert, AlertDescription } from '@/registry/new-york-v4/ui/alert';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Calendar } from '@/registry/new-york-v4/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card';
import { ResponsiveContainer } from '@/registry/new-york-v4/ui/chart';
import { Input } from '@/registry/new-york-v4/ui/input';
import { Label } from '@/registry/new-york-v4/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/registry/new-york-v4/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/registry/new-york-v4/ui/select';
import { Skeleton } from '@/registry/new-york-v4/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/registry/new-york-v4/ui/table';
import { useQuery } from '@tanstack/react-query';

import { addMonths, endOfMonth, format, isValid, startOfMonth, subDays, subMonths } from 'date-fns';
import {
    Activity,
    AlertCircle,
    BarChart3,
    Calendar as CalendarIcon,
    Filter,
    Gauge,
    Map,
    Minus,
    RefreshCw,
    TrendingDown,
    TrendingUp
} from 'lucide-react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

// Dynamically import map components to avoid SSR issues
const LeafletMap = dynamic(() => import('../../components/LeafletMap'), {
    ssr: false,
    loading: () => (
        <div className='flex h-full items-center justify-center bg-gray-50'>
            <div className='text-center'>
                <RefreshCw className='text-muted-foreground mx-auto mb-2 h-8 w-8 animate-spin' />
                <p className='text-muted-foreground text-sm'>Loading map...</p>
            </div>
        </div>
    )
});

interface ReadingsFilters {
    startDate: Date;
    endDate: Date;
    filterOption: number;
    facilityType: number;
}

const FILTER_OPTIONS = [
    { value: 1, label: 'All Records' },
    { value: 2, label: 'Non-Alarm Records' },
    { value: 3, label: 'Alarm Records' }
];

const FACILITY_TYPES = [
    { value: 0, label: 'All Types' },
    { value: 1, label: 'Rectifier' },
    { value: 2, label: 'Test Station' },
    { value: 3, label: 'AC Monitor' },
    { value: 4, label: 'Meter Reader' },
    { value: 5, label: 'Other' }
];

export default function ReadingsPage() {
    const [filters, setFilters] = useState<ReadingsFilters>({
        startDate: subDays(new Date(), 7), // Last 7 days
        endDate: new Date(),
        filterOption: 1, // All records
        facilityType: 0 // All types
    });

    const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
    const [isMounted, setIsMounted] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    // Generate last 18 months for dropdown
    const monthOptions = useMemo(() => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 18; i++) {
            const date = subMonths(now, i);
            options.push({
                value: format(date, 'yyyy-MM'),
                label: format(date, 'MMMM yyyy'),
                date: date
            });
        }

        return options;
    }, []);

    const apiClient = useApiClient();

    // Fetch readings data
    const {
        data: readingsData,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: queryKeys.readings.list(filters as any),
        queryFn: async () => {
            const response = await apiClient.readings.apiReadingsGet({
                startDate: filters.startDate,
                endDate: filters.endDate,
                filterOption: filters.filterOption,
                facilityType: filters.facilityType || undefined
            });

            return response;
        },
        staleTime: 2 * 60 * 1000 // 2 minutes
    });

    // Process data for charts and analysis
    const processedData = useMemo(() => {
        if (!readingsData || readingsData.length === 0) {
            return {
                chartData: [],
                numericColumns: [],
                totalRecords: 0,
                alarmCount: 0,
                avgValues: {},
                trends: {},
                groupedData: {}
            };
        }

        // Get all column names and identify numeric columns
        const allColumns = Object.keys(readingsData[0] || {});
        const numericColumns = allColumns.filter((col) => {
            if (
                [
                    'id',
                    'timestamp',
                    'date',
                    'time',
                    'facilityType',
                    'facilityId',
                    'unitName',
                    'unitType',
                    'serialNumber',
                    'latitude',
                    'longitude'
                ].some((skip) => col.toLowerCase().includes(skip.toLowerCase()))
            ) {
                return false;
            }

            return readingsData.some((row) => {
                const value = row[col];

                return (
                    typeof value === 'number' ||
                    (typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(parseFloat(value)))
                );
            });
        });

        // Group data by unit - first let's check what fields we actually have
        console.log('Sample row:', readingsData[0]);
        console.log('All keys:', Object.keys(readingsData[0]));

        // Let's debug the actual field values to see what we're working with
        console.log(
            'First 3 rows unit identification fields:',
            readingsData.slice(0, 3).map((row) => ({
                facilityId: row.facilityId,
                FacilityID: row.FacilityID,
                facility_id: row.facility_id,
                unitId: row.unitId,
                UnitID: row.UnitID,
                unit_id: row.unit_id,
                id: row.id,
                unitName: row.UnitName,
                serialNumber: row.SerialNumber
            }))
        );

        // Group data by unit using the correct API field names (PascalCase)
        const groupedData = readingsData.reduce((acc, row, index) => {
            // Use the correct field names from the API response
            let unitId;

            // Primary: Use FacilityId as the main grouping key (as identified by user)
            if (row.FacilityId && row.FacilityId !== '') {
                unitId = row.FacilityId;
            }
            // Secondary: Fall back to UnitId if available
            else if (row.UnitId && row.UnitId !== '') {
                unitId = row.UnitId;
            }
            // Tertiary: Use SerialNumber as unique identifier
            else if (row.SerialNumber && row.SerialNumber !== '') {
                unitId = `serial-${row.SerialNumber}`;
            }
            // Quaternary: Use UnitName if it's unique enough
            else if (row.UnitName && row.UnitName !== '') {
                unitId = `name-${row.UnitName}`;
            }
            // Last resort: Create artificial groups
            else {
                unitId = `unit-group-${Math.floor(index / 500)}`;
            }

            // Convert to string and clean up
            unitId = String(unitId).trim();

            if (!acc[unitId]) {
                acc[unitId] = {
                    unitInfo: {
                        UnitName: row.UnitName || `Unit ${unitId}`,
                        UnitType: row.UnitType || 'Sensor Unit',
                        SerialNumber: row.SerialNumber || `SN-${unitId}`,
                        FacilityID: row.FacilityId || unitId,
                        FacilityType: row.FacilityType || 'Monitoring Station',
                        UnitId: row.UnitId || unitId
                    },
                    readings: [],
                    chartData: []
                };
            }
            acc[unitId].readings.push(row);

            return acc;
        }, {});

        console.log('Grouped data:', Object.keys(groupedData), 'Total groups:', Object.keys(groupedData).length);
        console.log(
            'Group details:',
            Object.entries(groupedData).map(([id, data]: [string, any]) => ({
                groupId: id,
                unitName: data.unitInfo.UnitName,
                serialNumber: data.unitInfo.SerialNumber,
                facilityId: data.unitInfo.FacilityID,
                readingsCount: data.readings.length
            }))
        );
        console.log('Numeric columns found:', numericColumns);
        console.log(
            'Sample numeric values:',
            numericColumns.map((col) => ({
                column: col,
                sampleValue: readingsData[0]?.[col],
                type: typeof readingsData[0]?.[col]
            }))
        );

        // Process chart data for each group
        for (const unitId in groupedData) {
            const unitReadings = groupedData[unitId].readings;
            const maxDataPoints = 100;
            const step = Math.max(1, Math.floor(unitReadings.length / maxDataPoints));

            groupedData[unitId].chartData = unitReadings
                .filter((_: any, index: number) => index % step === 0)
                .map((row: any, index: number) => {
                    // Try multiple timestamp field names and formats
                    let timestamp;
                    const timestampValue = row.TransmissionDateTime || row.timestamp || row.date || row.time;

                    if (timestampValue) {
                        timestamp = new Date(timestampValue).getTime();
                        if (isNaN(timestamp)) {
                            // Try parsing as different formats
                            timestamp = Date.parse(timestampValue);
                        }
                    }

                    // If still no valid timestamp, use distributed time across the filter range
                    if (!timestamp || isNaN(timestamp)) {
                        const totalMinutes = (filters.endDate.getTime() - filters.startDate.getTime()) / (1000 * 60);
                        const minuteOffset = (index / unitReadings.length) * totalMinutes;
                        timestamp = filters.startDate.getTime() + minuteOffset * 60 * 1000;
                    }

                    const chartPoint = {
                        timestamp,
                        originalIndex: index,
                        ...numericColumns.reduce(
                            (acc, col) => ({
                                ...acc,
                                [col]: parseFloat(row[col]) || 0
                            }),
                            {}
                        )
                    };

                    return chartPoint;
                })
                .sort((a: any, b: any) => a.timestamp - b.timestamp); // Sort by timestamp

            console.log(`Unit ${unitId} chart data sample:`, groupedData[unitId].chartData.slice(0, 3));
        }

        // Calculate statistics
        const totalRecords = readingsData.length;
        const alarmCount = readingsData.filter((row) =>
            Object.values(row).some((val) => typeof val === 'string' && val.toLowerCase().includes('alarm'))
        ).length;

        // Calculate averages for numeric columns
        const avgValues: Record<string, number> = {};
        numericColumns.forEach((col) => {
            const values = readingsData
                .map((row) => parseFloat(row[col]))
                .filter((val) => !isNaN(val) && isFinite(val));

            if (values.length > 0) {
                avgValues[col] = values.reduce((sum, val) => sum + val, 0) / values.length;
            }
        });

        // Calculate trends (simple comparison of first vs last quarter)
        const trends: Record<string, 'up' | 'down' | 'stable'> = {};
        if (readingsData.length >= 4) {
            const quarterSize = Math.floor(readingsData.length / 4);

            numericColumns.forEach((col) => {
                const firstQuarter = readingsData
                    .slice(0, quarterSize)
                    .map((row) => parseFloat(row[col]))
                    .filter((val) => !isNaN(val));

                const lastQuarter = readingsData
                    .slice(-quarterSize)
                    .map((row) => parseFloat(row[col]))
                    .filter((val) => !isNaN(val));

                if (firstQuarter.length > 0 && lastQuarter.length > 0) {
                    const firstAvg = firstQuarter.reduce((sum, val) => sum + val, 0) / firstQuarter.length;
                    const lastAvg = lastQuarter.reduce((sum, val) => sum + val, 0) / lastQuarter.length;
                    const change = Math.abs(lastAvg - firstAvg) / firstAvg;

                    if (change < 0.05) trends[col] = 'stable';
                    else if (lastAvg > firstAvg) trends[col] = 'up';
                    else trends[col] = 'down';
                }
            });
        }

        // Process data for calendar heatmap
        const heatmapData = readingsData.map((row, index) => {
            // Try multiple timestamp field names (using correct API field names)
            const timestamp = row.TransmissionDateTime || row.timestamp || row.date || row.time;
            let date;

            if (timestamp) {
                date = new Date(timestamp);
                if (isNaN(date.getTime())) {
                    date = new Date(Date.parse(timestamp));
                }
            }

            // If still no valid date, distribute records across the date range with some randomness
            if (!date || isNaN(date.getTime())) {
                const daysBetween = Math.ceil(
                    (filters.endDate.getTime() - filters.startDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                const baseOffset = Math.floor((index / readingsData.length) * daysBetween);
                // Add some hourly variation to spread data points within each day
                const hourOffset = (index % 24) * 60 * 60 * 1000; // 0-23 hours
                const minuteOffset = ((index * 7) % 60) * 60 * 1000; // Some minute variation
                date = new Date(
                    filters.startDate.getTime() + baseOffset * 24 * 60 * 60 * 1000 + hourOffset + minuteOffset
                );
            }

            // Count 1 reading per row (not sum of values)
            return {
                date: format(date, 'yyyy-MM-dd'),
                count: 1 // Each row represents 1 reading
            };
        });

        // Aggregate by date (sum counts for same dates)
        const heatmapAggregated = heatmapData.reduce(
            (acc, { date, count }) => {
                if (acc[date]) {
                    acc[date] += count;
                } else {
                    acc[date] = count;
                }

                return acc;
            },
            {} as Record<string, number>
        );

        const heatmapValues = Object.entries(heatmapAggregated).map(([date, count]) => ({
            date,
            count
        }));

        // Process data for geographic heatmap
        const geoHeatmapData = readingsData
            .filter((row) => {
                const lat = parseFloat(row.Latitude || '0');
                const lng = parseFloat(row.Longitude || '0');

                return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
            })
            .map((row) => {
                const lat = parseFloat(row.Latitude || '0');
                const lng = parseFloat(row.Longitude || '0');

                // Calculate intensity based on numeric values
                const intensity = numericColumns.reduce((sum, col) => {
                    const value = parseFloat(row[col]) || 0;

                    return sum + Math.abs(value);
                }, 0);

                return [lat, lng, Math.min(intensity / 100, 1)]; // Normalize intensity to 0-1
            });

        return {
            chartData: [], // This is no longer the main chart data
            numericColumns,
            totalRecords,
            alarmCount,
            avgValues,
            trends,
            groupedData,
            heatmapValues: heatmapValues || [],
            geoHeatmapData: geoHeatmapData || []
        };
    }, [readingsData]);

    // Avoid rendering ResponsiveContainer on SSR to prevent null props errors
    useEffect(() => {
        setIsMounted(true);
        setIsClient(true);
    }, []);

    const updateFilters = (updates: Partial<ReadingsFilters>) => {
        setFilters((prev) => ({ ...prev, ...updates }));
    };

    const handleMonthSelection = (monthValue: string) => {
        const [year, month] = monthValue.split('-');
        const newMonth = new Date(parseInt(year), parseInt(month) - 1);
        const startDate = startOfMonth(newMonth);
        const endDate = endOfMonth(newMonth);

        setSelectedMonth(newMonth);
        updateFilters({ startDate, endDate });
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
        setSelectedMonth((currentMonth) => {
            const newMonth = direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1);

            // Check if the new month is within the 18-month limit
            const now = new Date();
            const monthsBack = Math.round((now.getTime() - newMonth.getTime()) / (1000 * 60 * 60 * 24 * 30));

            // Don't allow going beyond 17 months back or future months
            if (monthsBack < 0 || monthsBack > 17) {
                return currentMonth; // Don't change if outside limits
            }

            const startDate = startOfMonth(newMonth);
            const endDate = endOfMonth(newMonth);
            updateFilters({ startDate, endDate });

            return newMonth;
        });
    };

    useEffect(() => {
        const startDate = startOfMonth(selectedMonth);
        const endDate = endOfMonth(selectedMonth);
        updateFilters({ startDate, endDate });
    }, [selectedMonth]);

    const handleQuickDateRange = (days: number) => {
        const endDate = new Date();
        const startDate = subDays(endDate, days);
        updateFilters({ startDate, endDate });
    };

    const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
        switch (trend) {
            case 'up':
                return <TrendingUp className='h-4 w-4 text-green-600' />;
            case 'down':
                return <TrendingDown className='h-4 w-4 text-red-600' />;
            case 'stable':
                return <Minus className='h-4 w-4 text-gray-600' />;
        }
    };

    if (error) {
        return (
            <DashboardShell>
                <div className='flex-1 space-y-4 p-4 pt-6 md:p-8'>
                    <Alert variant='destructive'>
                        <AlertCircle className='h-4 w-4' />
                        <AlertDescription>
                            Failed to load readings: {error instanceof Error ? error.message : 'Unknown error'}
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
                        <h2 className='text-3xl font-bold tracking-tight'>Readings Dashboard</h2>
                        <p className='text-muted-foreground'>
                            Historical data analysis with dynamic engineering columns
                        </p>
                    </div>
                    <div className='flex items-center space-x-2'>
                        <Button variant='outline' onClick={() => refetch()}>
                            <RefreshCw className='mr-2 h-4 w-4' />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className='flex items-center justify-between space-y-2 rounded-lg border p-4'>
                    <div className='flex items-center space-x-4'>
                        <h3 className='text-lg font-medium'>Month</h3>
                        <div className='flex items-center space-x-2'>
                            <Button
                                variant='outline'
                                size='icon'
                                onClick={() => handleMonthChange('prev')}
                                disabled={
                                    subMonths(new Date(), 17).getMonth() === selectedMonth.getMonth() &&
                                    subMonths(new Date(), 17).getFullYear() === selectedMonth.getFullYear()
                                }>
                                &lt;
                            </Button>
                            <Select value={format(selectedMonth, 'yyyy-MM')} onValueChange={handleMonthSelection}>
                                <SelectTrigger className='w-48'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant='outline'
                                size='icon'
                                onClick={() => handleMonthChange('next')}
                                disabled={
                                    selectedMonth.getMonth() === new Date().getMonth() &&
                                    selectedMonth.getFullYear() === new Date().getFullYear()
                                }>
                                &gt;
                            </Button>
                        </div>
                    </div>
                    <div className='flex items-center space-x-4'>
                        {/* Filter Option */}
                        <div className='flex items-center space-x-2'>
                            <Label>Record Type</Label>
                            <Select
                                value={filters.filterOption.toString()}
                                onValueChange={(value) => updateFilters({ filterOption: parseInt(value) })}>
                                <SelectTrigger className='w-48'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FILTER_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value.toString()}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Facility Type */}
                        <div className='flex items-center space-x-2'>
                            <Label>Facility Type</Label>
                            <Select
                                value={filters.facilityType.toString()}
                                onValueChange={(value) => updateFilters({ facilityType: parseInt(value) })}>
                                <SelectTrigger className='w-48'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FACILITY_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value.toString()}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Stats Cards - optional, keep minimal */}
                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                            <CardTitle className='text-sm font-medium'>Total Records</CardTitle>
                            <Activity className='text-muted-foreground h-4 w-4' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold'>
                                {isLoading ? (
                                    <Skeleton className='h-7 w-20' />
                                ) : (
                                    processedData.totalRecords.toLocaleString()
                                )}
                            </div>
                            <p className='text-muted-foreground text-xs'>
                                {format(filters.startDate, 'MMM d')} - {format(filters.endDate, 'MMM d')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                            <CardTitle className='text-sm font-medium'>Alarm Records</CardTitle>
                            <AlertCircle className='text-muted-foreground h-4 w-4' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold'>
                                {isLoading ? <Skeleton className='h-7 w-16' /> : processedData.alarmCount}
                            </div>
                            <p className='text-muted-foreground text-xs'>
                                {processedData.totalRecords > 0
                                    ? `${((processedData.alarmCount / processedData.totalRecords) * 100).toFixed(1)}% of total`
                                    : 'No data'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                            <CardTitle className='text-sm font-medium'>Data Columns</CardTitle>
                            <BarChart3 className='text-muted-foreground h-4 w-4' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold'>
                                {isLoading ? <Skeleton className='h-7 w-16' /> : processedData.numericColumns.length}
                            </div>
                            <p className='text-muted-foreground text-xs'>Numeric columns available</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                            <CardTitle className='text-sm font-medium'>Date Range</CardTitle>
                            <CalendarIcon className='text-muted-foreground h-4 w-4' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold'>
                                {Math.ceil(
                                    (filters.endDate.getTime() - filters.startDate.getTime()) / (1000 * 60 * 60 * 24)
                                )}
                            </div>
                            <p className='text-muted-foreground text-xs'>Days selected</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Heatmap Section */}
                {processedData.totalRecords > 0 && (
                    <div className='space-y-6'>
                        {/* Calendar Heatmap */}
                        <Card>
                            <CardHeader>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <CardTitle className='flex items-center gap-2'>
                                            <Activity className='h-5 w-5' />
                                            Reading Activity Timeline
                                        </CardTitle>
                                        <p className='text-muted-foreground mt-1 text-sm'>
                                            Daily reading count over time - darker squares indicate more readings per
                                            day
                                        </p>
                                    </div>
                                    <Badge variant='secondary'>{(processedData.heatmapValues || []).length} days</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className='w-full overflow-x-auto'>
                                    {isLoading ? (
                                        <div className='flex h-32 items-center justify-center'>
                                            <div className='flex items-center space-x-2'>
                                                <RefreshCw className='h-4 w-4 animate-spin' />
                                                <span>Loading heatmap...</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className='heatmap-container-centered'>
                                            <CalendarHeatmap
                                                startDate={filters.startDate}
                                                endDate={filters.endDate}
                                                values={processedData.heatmapValues || []}
                                                classForValue={(value: any) => {
                                                    if (!value || value.count === 0) {
                                                        return 'color-empty';
                                                    }
                                                    const maxCount = Math.max(
                                                        ...(processedData.heatmapValues || []).map((v: any) => v.count)
                                                    );
                                                    const intensity = value.count / maxCount;
                                                    if (intensity <= 0.25) return 'color-scale-1';
                                                    if (intensity <= 0.5) return 'color-scale-2';
                                                    if (intensity <= 0.75) return 'color-scale-3';

                                                    return 'color-scale-4';
                                                }}
                                                titleForValue={(value: any) =>
                                                    value
                                                        ? `${value.date}: ${value.count} reading${value.count !== 1 ? 's' : ''}`
                                                        : 'No readings'
                                                }
                                                showWeekdayLabels={true}
                                                showMonthLabels={true}
                                                horizontal={false}
                                                gutterSize={4}
                                                onClick={(value: any) => {
                                                    if (value && value.date) {
                                                        const date = new Date(value.date);
                                                        updateFilters({
                                                            startDate: date,
                                                            endDate: date
                                                        });
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className='text-muted-foreground mt-4 flex items-center justify-between text-sm'>
                                    <div className='flex items-center space-x-4'>
                                        <span>Less</span>
                                        <div className='flex items-center space-x-1'>
                                            <div className='h-3 w-3 rounded-sm border bg-gray-100'></div>
                                            <div className='h-3 w-3 rounded-sm bg-emerald-200'></div>
                                            <div className='h-3 w-3 rounded-sm bg-emerald-400'></div>
                                            <div className='h-3 w-3 rounded-sm bg-emerald-600'></div>
                                            <div className='h-3 w-3 rounded-sm bg-emerald-800'></div>
                                        </div>
                                        <span>More</span>
                                    </div>
                                    <div className='flex items-center space-x-2 text-xs'>
                                        <span>Click any square to filter to that day</span>
                                        {filters.startDate.toDateString() === filters.endDate.toDateString() && (
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                onClick={() => {
                                                    const startDate = startOfMonth(selectedMonth);
                                                    const endDate = endOfMonth(selectedMonth);
                                                    updateFilters({ startDate, endDate });
                                                }}
                                                className='h-6 px-2 text-xs'>
                                                Reset to Full Month
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Geographic Heatmap */}
                        {(processedData.geoHeatmapData || []).length > 0 && (
                            <Card>
                                <CardHeader>
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <CardTitle className='flex items-center gap-2'>
                                                <Map className='h-5 w-5' />
                                                Geographic Distribution
                                            </CardTitle>
                                            <p className='text-muted-foreground mt-1 text-sm'>
                                                Heatmap showing reading intensity by location
                                            </p>
                                        </div>
                                        <Badge variant='secondary'>
                                            {(processedData.geoHeatmapData || []).length} Readings
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className='h-96 w-full overflow-hidden rounded-lg border'>
                                        {isMounted && isClient ? (
                                            <LeafletMap geoHeatmapData={processedData.geoHeatmapData || []} />
                                        ) : (
                                            <div className='flex h-full items-center justify-center bg-gray-50'>
                                                <div className='text-center'>
                                                    <Map className='text-muted-foreground mx-auto mb-2 h-8 w-8' />
                                                    <p className='text-muted-foreground text-sm'>
                                                        Loading geographic heatmap...
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Chart Section */}
                {isMounted && isClient && processedData.totalRecords > 0 && (
                    <div className='space-y-6'>
                        {Object.entries(processedData.groupedData).map(([unitId, unitData]: [string, any]) => (
                            <Card key={unitId}>
                                <CardHeader>
                                    <div className='flex items-start justify-between'>
                                        {/* Left side: Facility information */}
                                        <div className='flex-1'>
                                            {/* Facility ID as main prominent header */}
                                            <div className='mb-2'>
                                                <CardTitle className='text-primary text-2xl font-bold'>
                                                    {unitData.unitInfo.FacilityID || unitId}
                                                </CardTitle>
                                                {/* Facility Type in small text below */}
                                                <p className='text-muted-foreground text-sm font-medium'>
                                                    {unitData.unitInfo.FacilityType}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right side: Unit name and details */}
                                        <div className='text-right'>
                                            {/* Unit Name in medium text */}
                                            <div className='mb-2'>
                                                <h3 className='text-foreground text-lg font-semibold'>
                                                    {unitData.unitInfo.UnitName}
                                                </h3>
                                            </div>

                                            {/* Unit details in one row */}
                                            <div className='text-muted-foreground flex justify-end gap-x-4 text-sm'>
                                                <span>
                                                    <strong>Type:</strong> {unitData.unitInfo.UnitType}
                                                </span>
                                                <span>
                                                    <strong>Serial:</strong> {unitData.unitInfo.SerialNumber}
                                                </span>
                                                {unitData.unitInfo.UnitId &&
                                                    unitData.unitInfo.UnitId !== unitData.unitInfo.FacilityID && (
                                                        <span>
                                                            <strong>Unit ID:</strong> {unitData.unitInfo.UnitId}
                                                        </span>
                                                    )}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className='h-40'>
                                        <ResponsiveContainer width='100%' height='100%'>
                                            <LineChart data={unitData.chartData}>
                                                <CartesianGrid strokeDasharray='3 3' />
                                                <XAxis
                                                    dataKey='timestamp'
                                                    type='number'
                                                    scale='time'
                                                    domain={[filters.startDate.getTime(), filters.endDate.getTime()]}
                                                    tickFormatter={(unixTime) => {
                                                        try {
                                                            return typeof unixTime === 'number' && !isNaN(unixTime)
                                                                ? format(new Date(unixTime), 'MM/dd HH:mm')
                                                                : unixTime?.toString() || '';
                                                        } catch {
                                                            return '';
                                                        }
                                                    }}
                                                />
                                                <YAxis />
                                                <Tooltip
                                                    labelFormatter={(label) =>
                                                        typeof label === 'number'
                                                            ? new Date(label).toLocaleString()
                                                            : label
                                                    }
                                                />
                                                <Legend />
                                                {processedData.numericColumns.slice(0, 5).map((column, index) => (
                                                    <Line
                                                        key={column}
                                                        type='monotone'
                                                        dataKey={column}
                                                        stroke={`hsl(${index * 60}, 70%, 50%)`}
                                                        strokeWidth={2}
                                                        dot={{
                                                            fill: `hsl(${index * 60}, 70%, 50%)`,
                                                            strokeWidth: 2,
                                                            r: 3
                                                        }}
                                                        connectNulls={false}
                                                    />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
