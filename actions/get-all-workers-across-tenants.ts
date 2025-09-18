'use server'

import { prisma } from '@/lib/prisma'

export interface WorkerAcrossTenants {
  id: number
  name: string | null
  email: string | null
  phone: string | null
  role: string | null
  tenantEmail: string
  workId: number | null
  workItemId: number | null
  quantity: number
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
  // Additional fields from related models
  workTitle?: string
  workItemName?: string
}

export async function getAllWorkersAcrossTenants(): Promise<WorkerAcrossTenants[]> {
  try {
    const workers = await prisma.workItemWorker.findMany({
      include: {
        work: {
          select: {
            title: true
          }
        },
        workItem: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { tenantEmail: 'asc' },
        { name: 'asc' }
      ]
    })

    // Transform the data to include work and workItem titles
    const transformedWorkers: WorkerAcrossTenants[] = workers.map((worker: any) => ({
      id: worker.id,
      name: worker.name,
      email: worker.email,
      phone: worker.phone,
      role: worker.role,
      tenantEmail: worker.tenantEmail,
      workId: worker.workId,
      workItemId: worker.workItemId,
      quantity: worker.quantity,
      avatarUrl: worker.avatarUrl,
      createdAt: worker.createdAt,
      updatedAt: worker.updatedAt,
      workTitle: worker.work?.title,
      workItemName: worker.workItem?.name
    }))

    // Deduplicate by name and email combination within each tenant
    const deduplicatedWorkers = transformedWorkers.reduce((acc, worker) => {
      const key = `${worker.tenantEmail}-${worker.name}-${worker.email}`
      
      // If we haven't seen this worker before, add them
      if (!acc.some(existing => 
        existing.tenantEmail === worker.tenantEmail && 
        existing.name === worker.name && 
        existing.email === worker.email
      )) {
        acc.push(worker)
      }
      
      return acc
    }, [] as WorkerAcrossTenants[])

    return deduplicatedWorkers
  } catch (error) {
    console.error('Error fetching workers across tenants:', error)
    throw new Error('Failed to fetch workers across tenants')
  }
}
