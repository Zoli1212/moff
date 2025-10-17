/**
 * WorkItemWorkers Actions Tests
 * Tests for get-workitemworkers-for-work.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { testPrisma, TEST_TENANT_EMAIL, createTestWork, createTestOffer, createTestMyWork, createTestWorker } from './setup';
import { getWorkItemWorkersForWork } from '@/actions/get-workitemworkers-for-work';

// Mock auth
vi.mock('@/lib/tenant-auth', () => ({
  getTenantSafeAuth: vi.fn().mockResolvedValue({
    user: { id: 'test-user' },
    tenantEmail: TEST_TENANT_EMAIL
  })
}));

describe('WorkItemWorkers Actions Tests', () => {
  describe('getWorkItemWorkersForWork', () => {
    it('should get all workItemWorkers for a work', async () => {
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: { title: 'Test Requirement', versionNumber: 1, myWorkId: myWork.id }
      });
      const offer = await createTestOffer(requirement.id);
      const work = await createTestWork(offer.id);
      
      const workItem = await testPrisma.workItem.create({
        data: { 
          workId: work.id, 
          name: 'Test Work Item', 
          quantity: 100, 
          unit: 'm2',
          unitPrice: 1000,
          totalPrice: 100000,
          tenantEmail: TEST_TENANT_EMAIL 
        }
      });
      
      const worker1 = await createTestWorker();
      const worker2 = await testPrisma.workforceRegistry.create({
        data: { name: 'Test Worker 2', role: 'Builder', dailyRate: 28000, tenantEmail: TEST_TENANT_EMAIL }
      });
      
      // Create Worker records first
      const workerRecord1 = await testPrisma.worker.create({
        data: { name: worker1.name, role: worker1.role, workId: work.id, tenantEmail: TEST_TENANT_EMAIL }
      });
      const workerRecord2 = await testPrisma.worker.create({
        data: { name: worker2.name, role: worker2.role, workId: work.id, tenantEmail: TEST_TENANT_EMAIL }
      });
      
      await testPrisma.workItemWorker.createMany({
        data: [
          { workId: work.id, workItemId: workItem.id, workerId: workerRecord1.id, workforceRegistryId: worker1.id, tenantEmail: TEST_TENANT_EMAIL },
          { workId: work.id, workItemId: workItem.id, workerId: workerRecord2.id, workforceRegistryId: worker2.id, tenantEmail: TEST_TENANT_EMAIL }
        ]
      });
      
      const result = await getWorkItemWorkersForWork(work.id);
      
      expect(result).toHaveLength(2);
      expect(result[0].workId).toBe(work.id);
      expect(result[0].tenantEmail).toBe(TEST_TENANT_EMAIL);
    });

    it('should return empty array for work with no workers', async () => {
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: { title: 'Test Requirement', versionNumber: 1, myWorkId: myWork.id }
      });
      const offer = await createTestOffer(requirement.id);
      const work = await createTestWork(offer.id);
      
      const result = await getWorkItemWorkersForWork(work.id);
      
      expect(result).toHaveLength(0);
    });

    it('should filter by tenant email', async () => {
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: { title: 'Test Requirement', versionNumber: 1, myWorkId: myWork.id }
      });
      const offer = await createTestOffer(requirement.id);
      const work = await createTestWork(offer.id);
      
      const workItem = await testPrisma.workItem.create({
        data: { 
          workId: work.id, 
          name: 'Test Work Item', 
          quantity: 100, 
          unit: 'm2',
          unitPrice: 1000,
          totalPrice: 100000,
          tenantEmail: TEST_TENANT_EMAIL 
        }
      });
      
      const worker = await createTestWorker();
      
      // Create Worker record
      const workerRecord = await testPrisma.worker.create({
        data: { name: worker.name, role: worker.role, workId: work.id, tenantEmail: TEST_TENANT_EMAIL }
      });
      
      await testPrisma.workItemWorker.create({
        data: {
          workId: work.id,
          workItemId: workItem.id,
          workerId: workerRecord.id,
          workforceRegistryId: worker.id,
          tenantEmail: 'different@tenant.com'
        }
      });
      
      const result = await getWorkItemWorkersForWork(work.id);
      
      expect(result).toHaveLength(0);
    });
  });
});
