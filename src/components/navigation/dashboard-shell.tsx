'use client';

import { ReactNode } from 'react';

import { ModeSwitcher } from '@/components/mode-switcher';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/registry/new-york-v4/ui/breadcrumb';
import { Separator } from '@/registry/new-york-v4/ui/separator';
import { SidebarInset, SidebarProvider } from '@/registry/new-york-v4/ui/sidebar';
import { SidebarTrigger } from '@/registry/new-york-v4/ui/sidebar';

import { AppSidebar } from './app-sidebar';

interface DashboardShellProps {
    children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className='flex h-16 shrink-0 items-center gap-2 border-b px-4'>
                    <SidebarTrigger className='-ml-1' />
                    <Separator orientation='vertical' className='mr-2 h-4' />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbPage className='accent-highlight font-semibold'>
                                    Bullhorn API Demo
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <div className='ml-auto'>
                        <ModeSwitcher />
                    </div>
                </header>
                <div className='flex flex-1 flex-col gap-4 p-4'>{children}</div>
            </SidebarInset>
        </SidebarProvider>
    );
}
