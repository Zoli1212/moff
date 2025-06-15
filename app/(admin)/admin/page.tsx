'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminListWorkflows, adminListUsers, adminListCredentials } from '@/actions/admin.action';
import { GoogleOAuthCredential } from '@prisma/client';

interface User {
  id: number;
  name: string | null;
  email: string;
  role?: string;
}

interface Workflow {
  id: number;
  name: string;
  phases: any[];
}

export default function AdminDashboard() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [credentials, setCredentials] = useState<GoogleOAuthCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // All list functions now return data directly
        const [workflows, users, credentials] = await Promise.all([
          adminListWorkflows(),
          adminListUsers(),
          adminListCredentials(),
        ]);
        
        setWorkflows(workflows);
        setUsers(users);
        setCredentials(credentials);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { name: 'Total Users', value: users.length, href: '/admin/users' },
    { name: 'Workflows', value: workflows.length, href: '/admin/workflows' },
    { name: 'Credentials', value: credentials.length, href: '/admin/credentials' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <a
            key={stat.name}
            href={stat.href}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="text-sm font-medium text-gray-500">{stat.name}</h3>
            <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Recent Users</h3>
          <div className="space-y-4">
            {users.slice(0, 5).map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{user.name || user.email}</p>
                  {user.role && <p className="text-sm text-gray-500">{user.role}</p>}
                </div>
                <a 
                  href={`/admin/users/${user.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View
                </a>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <a href="/admin/users" className="text-sm text-blue-600 hover:underline">
              View all users →
            </a>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Recent Workflows</h3>
          <div className="space-y-4">
            {workflows.slice(0, 5).map((workflow) => (
              <div key={workflow.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{workflow.name}</p>
                  <p className="text-sm text-gray-500">
                    {workflow.phases.length} phases
                  </p>
                </div>
                <a 
                  href={`/admin/workflows/${workflow.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View
                </a>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <a href="/admin/workflows" className="text-sm text-blue-600 hover:underline">
              View all workflows →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
