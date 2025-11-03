'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAuthContext } from '@/components/auth/auth-provider';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { useApiClient } from '@/hooks/use-api';
import { UnitDataPointRequestDTO, UnitDataPointViewModel, UnitGroupViewModel } from '@/lib/api/generated/src/models';
import { queryKeys } from '@/lib/query-client';
import { Alert, AlertDescription } from '@/registry/new-york-v4/ui/alert';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card';
import { Checkbox } from '@/registry/new-york-v4/ui/checkbox';
import { Input } from '@/registry/new-york-v4/ui/input';
import { Label } from '@/registry/new-york-v4/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/registry/new-york-v4/ui/select';
import { Skeleton } from '@/registry/new-york-v4/ui/skeleton';
import { Switch } from '@/registry/new-york-v4/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/registry/new-york-v4/ui/table';
import { useQuery } from '@tanstack/react-query';

import {
    AlertCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Filter,
    Folder,
    FolderOpen,
    RefreshCw,
    Search
} from 'lucide-react';

interface DataPointFilters {
    search: string;
    unitGroupIds: number[];
    isHidden?: boolean;
    isExcluded?: boolean;
    isMeasurement?: boolean;
    unitType: string;
    unitStatus: string;
    page: number;
    pageSize: number;
    sortColumn: string;
    sortDirection: string;
}

// Interface for hierarchical data structure
interface UnitGroup {
    unitId: number;
    unitName: string;
    unitType: string;
    unitStatus: string;
    facilityId: string;
    serialNumber: number;
    lastPacketDate: Date | null;
    dataPoints: UnitDataPointViewModel[];
    isExpanded?: boolean;
}

// Tree node interface
interface TreeNode extends UnitGroupViewModel {
    children: TreeNode[];
    level: number;
}

// Helper function to check if any children are selected
function checkChildrenSelected(node: TreeNode, selectedIds: Set<number>): boolean {
    return node.children.some((child) => selectedIds.has(child.id || 0) || checkChildrenSelected(child, selectedIds));
}

// Helper function to check if all children are selected
function checkAllChildrenSelected(node: TreeNode, selectedIds: Set<number>): boolean {
    if (node.children.length === 0) return false;
    return node.children.every(
        (child) =>
            selectedIds.has(child.id || 0) &&
            (child.children.length === 0 || checkAllChildrenSelected(child, selectedIds))
    );
}

// Helper function to collect all descendant IDs
function collectAllDescendantIds(node: TreeNode): number[] {
    const ids: number[] = [];
    if (node.id) ids.push(node.id);
    node.children.forEach((child) => {
        ids.push(...collectAllDescendantIds(child));
    });
    return ids;
}

// Tree component with checkboxes
interface UnitGroupTreeNodeProps {
    node: TreeNode;
    selectedIds: Set<number>;
    expandedNodes: Set<number>;
    onToggleExpand: (nodeId: number) => void;
    onToggleSelect: (nodeId: number, recursive: boolean) => void;
}

function UnitGroupTreeNode({
    node,
    selectedIds,
    expandedNodes,
    onToggleExpand,
    onToggleSelect
}: UnitGroupTreeNodeProps) {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id || 0);
    const isSelected = selectedIds.has(node.id || 0);

    // Check if any children are selected (for indeterminate state)
    const hasSelectedChildren =
        hasChildren &&
        node.children.some((child) => selectedIds.has(child.id || 0) || checkChildrenSelected(child, selectedIds));
    const allChildrenSelected =
        hasChildren &&
        node.children.every((child) => selectedIds.has(child.id || 0) && checkAllChildrenSelected(child, selectedIds));

    return (
        <div className='select-none'>
            <div
                className={`hover:bg-muted/50 flex items-center gap-2 rounded-md p-2 ${node.level > 0 ? 'ml-4' : ''}`}
                style={{ paddingLeft: `${node.level * 16 + 8}px` }}>
                <Checkbox
                    checked={isSelected || allChildrenSelected}
                    onCheckedChange={() => onToggleSelect(node.id || 0, true)}
                    onClick={(e) => e.stopPropagation()}
                    className='data-[state=checked]:border-primary data-[state=checked]:bg-primary border-2'
                />

                <div
                    className='flex flex-1 cursor-pointer items-center gap-2'
                    onClick={() => hasChildren && onToggleExpand(node.id || 0)}>
                    {hasChildren ? (
                        isExpanded ? (
                            <ChevronDown className='text-muted-foreground h-4 w-4' />
                        ) : (
                            <ChevronRight className='text-muted-foreground h-4 w-4' />
                        )
                    ) : (
                        <div className='w-4' />
                    )}

                    {hasChildren ? (
                        isExpanded ? (
                            <FolderOpen className='h-4 w-4 text-yellow-500' />
                        ) : (
                            <Folder className='h-4 w-4 text-yellow-500' />
                        )
                    ) : (
                        <Folder className='h-4 w-4 text-yellow-500' />
                    )}

                    <span className={`text-sm ${!node.active ? 'text-muted-foreground' : ''}`}>
                        {node.unitGroupName}
                    </span>

                    {node.isAllUnits && (
                        <Badge variant='outline' className='text-xs'>
                            All Units
                        </Badge>
                    )}

                    {!node.active && (
                        <Badge variant='secondary' className='text-xs'>
                            Inactive
                        </Badge>
                    )}
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className='mt-1'>
                    {node.children.map((child) => (
                        <UnitGroupTreeNode
                            key={child.id}
                            node={child}
                            selectedIds={selectedIds}
                            expandedNodes={expandedNodes}
                            onToggleExpand={onToggleExpand}
                            onToggleSelect={onToggleSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function buildTree(unitGroups: UnitGroupViewModel[]): TreeNode[] {
    const nodeMap = new Map<number, TreeNode>();

    // Create all nodes
    unitGroups.forEach((group) => {
        if (group.id) {
            nodeMap.set(group.id, {
                ...group,
                children: [],
                level: 0
            });
        }
    });

    const rootNodes: TreeNode[] = [];

    // Build the tree structure
    unitGroups.forEach((group) => {
        if (group.id) {
            const node = nodeMap.get(group.id);
            if (node) {
                if (group.parentGroupId && nodeMap.has(group.parentGroupId)) {
                    const parent = nodeMap.get(group.parentGroupId);
                    if (parent) {
                        node.level = parent.level + 1;
                        parent.children.push(node);
                    }
                } else {
                    rootNodes.push(node);
                }
            }
        }
    });

    return rootNodes;
}

export default function DataPointsPage() {
    const [filters, setFilters] = useState<DataPointFilters>({
        search: '',
        unitGroupIds: [],
        isHidden: undefined,
        isExcluded: undefined,
        isMeasurement: undefined,
        unitType: 'all',
        unitStatus: 'all',
        page: 1,
        pageSize: 100,
        sortColumn: 'unitName',
        sortDirection: 'asc'
    });

    const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set());
    const [expandedTreeNodes, setExpandedTreeNodes] = useState<Set<number>>(new Set());
    const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());

    const apiClient = useApiClient();
    const { isAuthenticated, token } = useAuthContext();

    // Fetch unit groups for tree navigation
    const { data: unitGroupsData } = useQuery({
        queryKey: queryKeys.unitGroups.list(),
        queryFn: async () => {
            const response = await apiClient.unitGroups.apiUnitGroupGet({ active: true });
            return response;
        },
        staleTime: 5 * 60 * 1000 // 5 minutes
    });

    // Build tree structure
    const treeData = useMemo(() => {
        if (!unitGroupsData) return [];
        return buildTree(unitGroupsData);
    }, [unitGroupsData]);

    // Auto-expand tree on initial load
    useEffect(() => {
        if (unitGroupsData && unitGroupsData.length > 0 && expandedTreeNodes.size === 0) {
            const allIds = new Set(unitGroupsData.map((g) => g.id).filter(Boolean) as number[]);
            setExpandedTreeNodes(allIds);
        }
    }, [unitGroupsData]);

    // Update filters when selected groups change
    useEffect(() => {
        setFilters((prev) => ({
            ...prev,
            unitGroupIds: Array.from(selectedGroupIds),
            page: 1
        }));
    }, [selectedGroupIds]);

    // Fetch data points with filtering
    const {
        data: dataPointsResponse,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: queryKeys.unitDataPoints.list(filters),
        queryFn: async () => {
            const requestDto: UnitDataPointRequestDTO = {
                unitGroupIds: filters.unitGroupIds.length > 0 ? filters.unitGroupIds : undefined,
                isHidden: filters.isHidden,
                isExcluded: filters.isExcluded,
                isMeasurement: filters.isMeasurement,
                unitType: filters.unitType && filters.unitType !== 'all' ? filters.unitType : undefined,
                unitStatus: filters.unitStatus && filters.unitStatus !== 'all' ? filters.unitStatus : undefined,
                unitName: filters.search || undefined,
                sortColumn: filters.sortColumn,
                sortOrder: filters.sortDirection,
                page: filters.page,
                pageSize: filters.pageSize
            };

            const response = await apiClient.unitDataPoints.apiUnitDataPointPost({
                unitDataPointRequestDTO: requestDto
            });
            return response;
        },
        staleTime: 2 * 60 * 1000 // 2 minutes
    });

    const dataPoints = dataPointsResponse?.items || [];
    const totalItems = dataPointsResponse?.totalCount || 0;
    const totalPages = Math.ceil(totalItems / filters.pageSize);

    // Extract distinct unit types and statuses from API data
    const distinctUnitTypes = useMemo(() => {
        if (!dataPoints.length) return [];
        const types = new Set<string>();
        dataPoints.forEach((dp) => {
            if (dp.unitType) types.add(dp.unitType);
        });
        return Array.from(types).sort();
    }, [dataPoints]);

    const distinctUnitStatuses = useMemo(() => {
        if (!dataPoints.length) return [];
        const statuses = new Set<string>();
        dataPoints.forEach((dp) => {
            if (dp.unitStatus) statuses.add(dp.unitStatus);
        });
        return Array.from(statuses).sort();
    }, [dataPoints]);

    // Transform flat data into hierarchical structure grouped by unit
    const unitGroups = useMemo(() => {
        if (!dataPoints.length) return [];

        const groups = new Map<number, UnitGroup>();

        dataPoints.forEach((dataPoint) => {
            if (!dataPoint.unitId) return;

            if (!groups.has(dataPoint.unitId)) {
                groups.set(dataPoint.unitId, {
                    unitId: dataPoint.unitId,
                    unitName: dataPoint.unitName || 'Unknown Unit',
                    unitType: dataPoint.unitType || 'Unknown',
                    unitStatus: dataPoint.unitStatus || 'Unknown',
                    facilityId: dataPoint.facilityId || '—',
                    serialNumber: dataPoint.serialNumber || 0,
                    lastPacketDate: dataPoint.lastPacketDate ? new Date(dataPoint.lastPacketDate) : null,
                    dataPoints: [],
                    isExpanded: expandedUnits.has(dataPoint.unitId)
                });
            }

            groups.get(dataPoint.unitId)!.dataPoints.push(dataPoint);
        });

        return Array.from(groups.values()).sort((a, b) => a.unitName.localeCompare(b.unitName));
    }, [dataPoints, expandedUnits]);

    const updateFilters = (updates: Partial<DataPointFilters>) => {
        setFilters((prev) => ({ ...prev, ...updates, page: 1 }));
    };

    const toggleUnitExpansion = (unitId: number) => {
        setExpandedUnits((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(unitId)) {
                newSet.delete(unitId);
            } else {
                newSet.add(unitId);
            }
            return newSet;
        });
    };

    const toggleTreeNodeExpansion = (nodeId: number) => {
        setExpandedTreeNodes((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    };

    // Helper to find node in tree
    const findNodeInTree = (nodes: TreeNode[], nodeId: number): TreeNode | null => {
        for (const node of nodes) {
            if (node.id === nodeId) return node;
            const found = findNodeInTree(node.children, nodeId);
            if (found) return found;
        }
        return null;
    };

    const toggleGroupSelection = (nodeId: number, recursive: boolean = false) => {
        setSelectedGroupIds((prev) => {
            const newSet = new Set(prev);
            const isCurrentlySelected = newSet.has(nodeId);

            if (recursive) {
                // Find the node in the tree
                const node = findNodeInTree(treeData, nodeId);

                if (node) {
                    // Get all descendant IDs
                    const allIds = collectAllDescendantIds(node);

                    if (isCurrentlySelected) {
                        // Remove this node and all descendants
                        allIds.forEach((id) => newSet.delete(id));
                    } else {
                        // Add this node and all descendants
                        allIds.forEach((id) => newSet.add(id));
                    }
                }
            } else {
                // Non-recursive: just toggle the single node
                if (isCurrentlySelected) {
                    newSet.delete(nodeId);
                } else {
                    newSet.add(nodeId);
                }
            }

            return newSet;
        });
    };

    const changePage = (newPage: number) => {
        setFilters((prev) => ({ ...prev, page: newPage }));
    };

    if (error) {
        return (
            <DashboardShell>
                <div className='flex-1 space-y-4 p-4 pt-6 md:p-8'>
                    <Alert variant='destructive'>
                        <AlertCircle className='h-4 w-4' />
                        <AlertDescription>
                            Failed to load data points: {error instanceof Error ? error.message : 'Unknown error'}
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
                        <h2 className='text-3xl font-bold tracking-tight'>Data Points</h2>
                        <p className='text-muted-foreground'>
                            Manage unit data points with advanced filtering and configuration
                        </p>
                    </div>
                    <div className='flex items-center space-x-2'>
                        <Button variant='outline' onClick={() => refetch()}>
                            <RefreshCw className='mr-2 h-4 w-4' />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Filters - Full Width Above */}
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center text-base'>
                            <Filter className='mr-2 h-4 w-4' />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='space-y-4'>
                            {/* Search and Basic Filters Row */}
                            <div className='grid gap-4 md:grid-cols-3'>
                                {/* Search */}
                                <div className='space-y-2'>
                                    <Label>Search Units</Label>
                                    <div className='relative'>
                                        <Search className='text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4' />
                                        <Input
                                            placeholder='Unit name...'
                                            value={filters.search}
                                            onChange={(e) => updateFilters({ search: e.target.value })}
                                            className='pl-8'
                                        />
                                    </div>
                                </div>

                                {/* Unit Type */}
                                <div className='space-y-2'>
                                    <Label>Unit Type</Label>
                                    <Select
                                        value={filters.unitType}
                                        onValueChange={(value) => updateFilters({ unitType: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder='All Types' />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value='all'>All Types</SelectItem>
                                            {distinctUnitTypes.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Unit Status */}
                                <div className='space-y-2'>
                                    <Label>Unit Status</Label>
                                    <Select
                                        value={filters.unitStatus}
                                        onValueChange={(value) => updateFilters({ unitStatus: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder='All Status' />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value='all'>All Status</SelectItem>
                                            {distinctUnitStatuses.map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Toggle Filters Row */}
                            <div className='flex flex-wrap gap-6'>
                                <div className='flex items-center space-x-2'>
                                    <Switch
                                        id='show-hidden'
                                        checked={filters.isHidden === true}
                                        onCheckedChange={(checked) =>
                                            updateFilters({ isHidden: checked ? true : undefined })
                                        }
                                    />
                                    <Label htmlFor='show-hidden'>Show Hidden Only</Label>
                                </div>

                                <div className='flex items-center space-x-2'>
                                    <Switch
                                        id='show-excluded'
                                        checked={filters.isExcluded === true}
                                        onCheckedChange={(checked) =>
                                            updateFilters({ isExcluded: checked ? true : undefined })
                                        }
                                    />
                                    <Label htmlFor='show-excluded'>Show Excluded Only</Label>
                                </div>

                                <div className='flex items-center space-x-2'>
                                    <Switch
                                        id='measurements-only'
                                        checked={filters.isMeasurement === true}
                                        onCheckedChange={(checked) =>
                                            updateFilters({ isMeasurement: checked ? true : undefined })
                                        }
                                    />
                                    <Label htmlFor='measurements-only'>Measurements Only</Label>
                                </div>
                            </div>

                            {/* Page Size Selection */}
                            <div className='flex items-center space-x-4'>
                                <Label>Page Size:</Label>
                                <Select
                                    value={filters.pageSize.toString()}
                                    onValueChange={(value) => updateFilters({ pageSize: parseInt(value) })}>
                                    <SelectTrigger className='w-40'>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value='25'>25 per page</SelectItem>
                                        <SelectItem value='50'>50 per page</SelectItem>
                                        <SelectItem value='100'>100 per page</SelectItem>
                                        <SelectItem value='200'>200 per page</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Layout: Tree Sidebar (25%) + Content (75%) */}
                <div className='flex gap-4'>
                    {/* Left Sidebar - Unit Groups Tree */}
                    <div className='w-1/4'>
                        <Card className='h-[calc(100vh-22rem)] overflow-hidden'>
                            <CardHeader>
                                <CardTitle className='text-base'>Unit Groups</CardTitle>
                                <p className='text-muted-foreground text-xs'>
                                    {selectedGroupIds.size > 0
                                        ? `${selectedGroupIds.size} group${selectedGroupIds.size > 1 ? 's' : ''} selected`
                                        : 'Select groups to filter'}
                                </p>
                            </CardHeader>
                            <CardContent className='h-[calc(100%-5rem)] overflow-y-auto'>
                                {!unitGroupsData ? (
                                    <div className='space-y-2'>
                                        {[...Array(8)].map((_, i) => (
                                            <Skeleton key={i} className='h-8 w-full' />
                                        ))}
                                    </div>
                                ) : treeData.length === 0 ? (
                                    <div className='text-muted-foreground py-8 text-center text-sm'>
                                        No unit groups found
                                    </div>
                                ) : (
                                    <div className='space-y-1'>
                                        {treeData.map((node) => (
                                            <UnitGroupTreeNode
                                                key={node.id}
                                                node={node}
                                                selectedIds={selectedGroupIds}
                                                expandedNodes={expandedTreeNodes}
                                                onToggleExpand={toggleTreeNodeExpansion}
                                                onToggleSelect={toggleGroupSelection}
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Content - Data Points Results */}
                    <div className='flex-1'>
                        {/* Data Points Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle className='text-base'>Data Points</CardTitle>
                                <div className='text-muted-foreground text-sm'>
                                    Showing {(filters.page - 1) * filters.pageSize + 1} to{' '}
                                    {Math.min(filters.page * filters.pageSize, totalItems)} of {totalItems} data points
                                </div>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className='space-y-3'>
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className='flex items-center space-x-4'>
                                                <Skeleton className='h-4 w-[200px]' />
                                                <Skeleton className='h-4 w-[150px]' />
                                                <Skeleton className='h-4 w-[100px]' />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <div className='space-y-4'>
                                            {unitGroups.length === 0 ? (
                                                <div className='text-muted-foreground py-8 text-center'>
                                                    No data points found
                                                    {selectedGroupIds.size > 0 && ' for selected unit groups'}
                                                </div>
                                            ) : (
                                                unitGroups.map((unitGroup) => (
                                                    <Card key={unitGroup.unitId} className='overflow-hidden'>
                                                        <CardHeader
                                                            className='hover:bg-muted/50 cursor-pointer transition-colors'
                                                            onClick={() => toggleUnitExpansion(unitGroup.unitId)}>
                                                            <div className='flex items-center justify-between'>
                                                                <div className='flex items-center gap-3'>
                                                                    {expandedUnits.has(unitGroup.unitId) ? (
                                                                        <ChevronDown className='h-4 w-4' />
                                                                    ) : (
                                                                        <ChevronRight className='h-4 w-4' />
                                                                    )}
                                                                    <div>
                                                                        <CardTitle className='text-base'>
                                                                            {unitGroup.unitName}
                                                                        </CardTitle>
                                                                        <div className='text-muted-foreground mt-2 flex items-center gap-4 text-sm'>
                                                                            <Badge variant='outline'>
                                                                                {unitGroup.unitType}
                                                                            </Badge>
                                                                            <Badge
                                                                                variant={
                                                                                    unitGroup.unitStatus === 'Active'
                                                                                        ? 'default'
                                                                                        : 'secondary'
                                                                                }>
                                                                                {unitGroup.unitStatus}
                                                                            </Badge>
                                                                            <span>
                                                                                Facility: {unitGroup.facilityId}
                                                                            </span>
                                                                            <span>
                                                                                Serial: {unitGroup.serialNumber}
                                                                            </span>
                                                                            <span>
                                                                                Last Packet:{' '}
                                                                                {unitGroup.lastPacketDate
                                                                                    ? new Date(
                                                                                          unitGroup.lastPacketDate
                                                                                      ).toLocaleDateString()
                                                                                    : '—'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <Badge variant='secondary'>
                                                                    {unitGroup.dataPoints.length} datapoints
                                                                </Badge>
                                                            </div>
                                                        </CardHeader>

                                                        {expandedUnits.has(unitGroup.unitId) && (
                                                            <CardContent className='pt-0'>
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead>Default Name</TableHead>
                                                                            <TableHead>Data Point Name</TableHead>
                                                                            <TableHead>Engineering Label</TableHead>
                                                                            <TableHead>Current Value</TableHead>
                                                                            <TableHead>Previous Value</TableHead>
                                                                            <TableHead>Measurement</TableHead>
                                                                            <TableHead>In Alarm</TableHead>
                                                                            <TableHead>Enabled</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {unitGroup.dataPoints.map((dataPoint) => (
                                                                            <TableRow key={dataPoint.unitDataPointId}>
                                                                                <TableCell>
                                                                                    {dataPoint.defaultName || '—'}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    {dataPoint.dataPointName || '—'}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    {dataPoint.engineeringLabel || '—'}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    {dataPoint.currentValue || '—'}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    {dataPoint.previousValue || '—'}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <Badge
                                                                                        variant={
                                                                                            dataPoint.isMeasurement
                                                                                                ? 'default'
                                                                                                : 'secondary'
                                                                                        }>
                                                                                        {dataPoint.isMeasurement
                                                                                            ? 'Yes'
                                                                                            : 'No'}
                                                                                    </Badge>
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <Badge
                                                                                        variant={
                                                                                            dataPoint.isInAlarm
                                                                                                ? 'destructive'
                                                                                                : 'secondary'
                                                                                        }>
                                                                                        {dataPoint.isInAlarm
                                                                                            ? 'Yes'
                                                                                            : 'No'}
                                                                                    </Badge>
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <Badge
                                                                                        variant={
                                                                                            dataPoint.enabled
                                                                                                ? 'default'
                                                                                                : 'secondary'
                                                                                        }>
                                                                                        {dataPoint.enabled
                                                                                            ? 'Yes'
                                                                                            : 'No'}
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
                </div>
            </div>
        </DashboardShell>
    );
}
