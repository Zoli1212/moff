'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { adminCreateCredential } from '@/actions/admin.action';

type CredentialFormData = {
  client_id: string;
  project_id: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_secret: string;
  redirect_uris: string;
  tenantEmail: string;
};

type FormState = {
  success: boolean;
  message?: string;
  data?: CredentialFormData;
};

export default function NewCredentialPage() {
  const router = useRouter();

  const [state, formAction] = useActionState<FormState, FormData>(
    adminCreateCredential,
    { success: false } as FormState
  );

  if (state?.success) {
    router.push('/admin/credentials');
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Add New Google OAuth Credentials</h2>

      {state?.message && (
        <div className={`p-4 mb-4 rounded-md ${state.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {state.message}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">
              Client ID *
            </label>
            <input
              type="text"
              name="client_id"
              id="client_id"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="project_id" className="block text-sm font-medium text-gray-700">
              Project ID *
            </label>
            <input
              type="text"
              name="project_id"
              id="project_id"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="auth_uri" className="block text-sm font-medium text-gray-700">
              Auth URI
            </label>
            <input
              type="text"
              name="auth_uri"
              id="auth_uri"
              defaultValue="https://accounts.google.com/o/oauth2/auth"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="token_uri" className="block text-sm font-medium text-gray-700">
              Token URI
            </label>
            <input
              type="text"
              name="token_uri"
              id="token_uri"
              defaultValue="https://oauth2.googleapis.com/token"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="auth_provider_x509_cert_url" className="block text-sm font-medium text-gray-700">
            Auth Provider x509 Cert URL
          </label>
          <input
            type="text"
            name="auth_provider_x509_cert_url"
            id="auth_provider_x509_cert_url"
            defaultValue="https://www.googleapis.com/oauth2/v1/certs"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="client_secret" className="block text-sm font-medium text-gray-700">
              Client Secret *
            </label>
            <input
              type="password"
              name="client_secret"
              id="client_secret"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="tenantEmail" className="block text-sm font-medium text-gray-700">
              Tenant Email *
            </label>
            <input
              type="email"
              name="tenantEmail"
              id="tenantEmail"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="redirect_uris" className="block text-sm font-medium text-gray-700">
            Redirect URIs (JSON array) *
          </label>
          <textarea
            name="redirect_uris"
            id="redirect_uris"
            rows={3}
            defaultValue='["http://localhost:3000/api/auth/callback/google"]'
            required
            className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder='["http://localhost:3000/api/auth/callback"]'
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter valid JSON array of redirect URIs, e.g. [&quot;http://localhost:3000/api/auth/callback&quot;]
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.push('/admin/credentials')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={state?.success}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex justify-center px-4 py-2 ml-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={state?.success}
          >
            {state?.success ? (
              <>
                <svg className="w-5 h-5 mr-2 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
