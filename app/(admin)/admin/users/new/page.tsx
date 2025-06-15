'use client';

import { useRouter } from 'next/navigation';
import { adminCreateUser } from '@/actions/admin.action';

export default function NewUserPage() {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const role = formData.get('role') as string || 'USER';
    
    if (!name || !email) return;
    
    try {
      await adminCreateUser({
        name,
        email,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      router.push('/admin/users');
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Add New User</h2>
      
      <form action={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Full Name *
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email *
          </label>
          <input
            type="email"
            name="email"
            id="email"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            id="role"
            name="role"
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            defaultValue="USER"
          >
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.push('/admin/users')}
            className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create User
          </button>
        </div>
      </form>
    </div>
  );
}
