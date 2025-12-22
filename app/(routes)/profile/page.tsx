import { UserProfile } from '@clerk/nextjs'
import React from 'react'
import { getCurrentUserData } from '@/actions/user-actions'
import AddressForm from './_components/AddressForm'
import Link from 'next/link'

async function Profile() {
  const userData = await getCurrentUserData();
  const isTenant = userData.isTenant ?? true;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Link
          href="/dashboard"
          style={{
            border: 'none',
            background: 'none',
            fontSize: 14,
            cursor: 'pointer',
            fontWeight: 'bold',
            textDecoration: 'none',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 26 26"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >
            <polyline points="18,4 7,13 18,22" fill="none" />
          </svg>
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Profil</h1>
      </div>

      {/* Clerk User Profile */}
      <div style={{ marginBottom: '40px' }}>
        <UserProfile />
      </div>

      {/* Address Form - only for tenants */}
      {isTenant && (
        <div style={{ marginTop: '40px' }}>
          <AddressForm />
        </div>
      )}
    </div>
  )
}

export default Profile
