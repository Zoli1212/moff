"use client";

import { Search } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserButton } from '@clerk/nextjs';

function AppHeader() {
    return (
        <div className='w-full bg-white bg-opacity-90 backdrop-blur-sm shadow-sm fixed top-0 left-0 right-0 z-40'>
            <div className="max-w-4xl mx-auto px-6">
                <div className="flex items-center h-16">
                    <SidebarTrigger className="md:hidden flex-shrink-0 mr-3" />
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-full bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base placeholder-gray-500"
                            placeholder="Mit parancsolsz?"
                        />
                    </div>
                    <div className="hidden md:block ml-3 flex-shrink-0">
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AppHeader;

