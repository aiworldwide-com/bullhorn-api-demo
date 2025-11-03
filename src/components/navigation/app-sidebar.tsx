'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuthContext } from '@/components/auth/auth-provider';
import { Button } from '@/registry/new-york-v4/ui/button';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from '@/registry/new-york-v4/ui/sidebar';

import { Activity, BarChart3, Database, FileText, Home, Layers, LogOut, Plug, Radio } from 'lucide-react';

const navigation = [
    {
        title: 'Overview',
        items: [{ name: 'Home', href: '/', icon: Home }]
    },
    {
        title: 'Unit Data',
        items: [
            { name: 'Units', href: '/units', icon: Database },
            { name: 'Data Points', href: '/data-points', icon: Activity },
            { name: 'Readings', href: '/readings', icon: BarChart3 }
        ]
    },
    {
        title: 'Data Streams',
        items: [
            { name: 'Packet Stream', href: '/streams/packets', icon: Radio },
            { name: 'Unit Changes', href: '/streams/units', icon: Radio },
            { name: 'Data Point Changes', href: '/streams/data-points', icon: Radio }
        ]
    },
    {
        title: 'Documentation',
        items: [
            { name: 'API Docs', href: '/api-docs', icon: FileText }
        ]
    }
];

export function AppSidebar() {
    const pathname = usePathname();
    const { logout } = useAuthContext();

    return (
        <Sidebar>
            <SidebarHeader className='border-b'>
                <div className='flex items-center gap-3 px-3 py-2'>
                    <div className='bg-ai-blue relative flex h-8 w-8 items-center justify-center rounded-lg text-white'>
                        <Plug className='h-4 w-4' />
                        <div className='bg-ai-yellow absolute -top-1 -right-1 h-3 w-3 rounded-full'></div>
                    </div>
                    <div className='flex flex-col'>
                        <span className='text-sm font-semibold'>Bullhorn API</span>
                        <span className='text-muted-foreground text-xs'>Demo Interface</span>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                {navigation.map((group) => (
                    <SidebarGroup key={group.title}>
                        <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => (
                                    <SidebarMenuItem key={item.name}>
                                        <SidebarMenuButton asChild isActive={pathname === item.href}>
                                            <Link href={item.href}>
                                                <item.icon className='h-4 w-4' />
                                                <span>{item.name}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter className='border-t'>
                <div className='flex items-center justify-between px-3 py-2'>
                    <Button variant='ghost' size='sm' onClick={logout} className='text-red-600'>
                        <LogOut className='mr-2 h-4 w-4' />
                        Sign out
                    </Button>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
