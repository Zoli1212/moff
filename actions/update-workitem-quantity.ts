'use server'

import { prisma } from '@/lib/prisma'
import { getTenantSafeAuth } from '@/lib/tenant-auth'
import { revalidatePath } from 'next/cache'

export async function updateWorkItemQuantity(
  workItemId: number,
  quantity: number
) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth()

    const updatedWorkItem = await prisma.workItem.update({
      where: {
        id: workItemId,
        tenantEmail: tenantEmail, // Ensure tenant can only update their own work items
      },
      data: {
        quantity: quantity,
        updatedAt: new Date(),
      },
    })

    // Revalidate the tasks page to show updated data
    revalidatePath('/tasks')
    revalidatePath(`/tasks/${updatedWorkItem.workId}`)

    return { success: true, data: updatedWorkItem }
  } catch (error) {
    console.error('Error updating work item quantity:', error)
    return { 
      success: false, 
      error: 'Hiba történt a mennyiség frissítése során' 
    }
  }
}
