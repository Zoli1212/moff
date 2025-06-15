'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { prisma } from '@/lib/prisma';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoaded) return;
      
      if (!userId) {
        router.push('/sign-in');
        return;
      }

      try {
        const response = await fetch(`/api/admin/check-auth`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Not authorized');
        }
        
        setIsAuthorized(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthorized(false);
      }
    };

    checkAuth();
  }, [isLoaded, userId, router]);

  if (isAuthorized === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">404</h1>
          <p className="mt-2">Page not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <nav className="mt-4 flex space-x-4 border-b">
          <a href="/admin" className="px-4 py-2 hover:bg-gray-100 rounded-t">
            Dashboard
          </a>
          <a href="/admin/users" className="px-4 py-2 hover:bg-gray-100 rounded-t">
            Users
          </a>
          <a href="/admin/workflows" className="px-4 py-2 hover:bg-gray-100 rounded-t">
            Workflows
          </a>
          <a href="/admin/credentials" className="px-4 py-2 hover:bg-gray-100 rounded-t">
            Credentials
          </a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
