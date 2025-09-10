'use server'

import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'

export async function checkIsSuperUser() {
  try {
    const user = await currentUser()
    if (!user) return { success: false, isSuperUser: false }
    
    const tenantEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress
    if (!tenantEmail) return { success: false, isSuperUser: false }

    const dbUser = await prisma.user.findFirst({
      where: { email: tenantEmail },
      select: { 
        email: true,
        isSuperUser: true 
      }
    })

    return { 
      success: true, 
      isSuperUser: dbUser?.isSuperUser || false
    }

  } catch (error) {
    console.error('Hiba a superuser ellenőrzéskor:', error)
    return { 
      success: false, 
      isSuperUser: false
    }
  }
}

export async function getAllUserEmails() {
  try {
    const user = await currentUser()
    if (!user) return { success: false, error: 'Nincs bejelentkezve' }
    
    const tenantEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress
    if (!tenantEmail) return { success: false, error: 'Nincs email cím' }

    // Get current user to check if they're a super user
    const dbUser = await prisma.user.findFirst({
      where: { email: tenantEmail },
      select: { 
        email: true,
        isSuperUser: true 
      }
    })

    if (!dbUser?.isSuperUser) {
      return { success: false, error: 'Nincs jogosultságod ehhez a művelethez' }
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true
      },
      orderBy: {
        email: 'asc'
      }
    })

    // Filter out current user and collect only users with email addresses
    const filteredUsers = users.filter(u => u.email && u.email !== dbUser.email)

    return { 
      success: true, 
      users: filteredUsers,
      emails: filteredUsers.map(u => u.email).filter(Boolean) // Collect all email addresses
    }

  } catch (error) {
    console.error('Hiba a felhasználók betöltésekor:', error)
    return { 
      success: false, 
      error: 'Hiba történt a felhasználók betöltésekor' 
    }
  }
}
