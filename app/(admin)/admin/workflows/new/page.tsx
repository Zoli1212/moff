'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { adminCreateWorkflow } from '@/actions/admin.action';

type WorkflowState = {
  success: boolean;
  message?: string;
};

const initialState: WorkflowState = {
  success: false
};

export default function NewWorkflowPage() {
  const router = useRouter();
  const [state, formAction] = useActionState<WorkflowState, FormData>(adminCreateWorkflow, initialState);
  const isSubmitting = state.success === false && state.message === undefined;
  
  if (state.success) {
    router.push('/admin/workflows');
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 border-b border-gray-200 pb-5">
        <h2 className="text-2xl font-semibold text-gray-900">Create New Workflow</h2>
        <p className="mt-1 text-sm text-gray-500">
          Create a new workflow to automate your processes.
        </p>
      </div>
      
      {!state.success && state.message && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{state.message}</p>
            </div>
          </div>
        </div>
      )}
      
      <form action={formAction} className="space-y-6" onSubmit={(e) => {
        if (isSubmitting) {
          e.preventDefault();
        }
      }}>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name *
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            name="description"
            id="description"
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            disabled={isSubmitting}
          />
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.push('/admin/workflows')}
            className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Workflow'}
          </button>
        </div>
      </form>
    </div>
  );
}
