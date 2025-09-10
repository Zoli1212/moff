'use server'

import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import type { User } from '@clerk/nextjs/server'

interface TenantAuthResult {
  user: User
  tenantEmail: string
  originalUserEmail: string
  isSuperUser: boolean
}

export async function getTenantSafeAuth(): Promise<TenantAuthResult> {
  const user = await currentUser()
  if (!user) throw new Error("Not authenticated")

  const userEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress
  if (!userEmail) throw new Error("No email found")

  // Check if user is super user
  const dbUser = await prisma.user.findFirst({
    where: { email: userEmail },
    select: { 
      isSuperUser: true 
    }
  })

  const isSuperUser = dbUser?.isSuperUser || false

  // If super user, check for tenant override from localStorage/store
  let tenantEmail = userEmail

  if (isSuperUser) {
    // Get tenant selection from cookies
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const selectedTenant = cookieStore.get('selected-tenant')?.value
    
    if (selectedTenant) {
      // Verify the selected tenant exists and is valid
      const tenantExists = await prisma.user.findFirst({
        where: { email: selectedTenant },
        select: { email: true }
      })
      
      if (tenantExists) {
        tenantEmail = selectedTenant
      }
    }
  }

  return {
    user,
    tenantEmail,
    originalUserEmail: userEmail,
    isSuperUser
  }
}
