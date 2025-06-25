"use client"

import { SidebarProvider } from '@/components/ui/sidebar';
import { AppHeader } from '../_components/AppHeader';
import { AppSidebar } from '../_components/AppSidebar';

function DashboardProvider({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
                <AppSidebar />
                <div className="flex-1 flex flex-col min-w-0">
                    <AppHeader />
                    <main className="flex-1 overflow-y-auto pt-16">
                        <div className="h-full">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}

export default DashboardProvider;