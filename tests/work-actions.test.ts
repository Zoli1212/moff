/**
 * Work Actions Database Tests
 * Tests for work-actions.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { testPrisma, TEST_TENANT_EMAIL, createTestMyWork, createTestOffer, createTestWork } from './setup';
import { updateWorkWithAIResult } from '@/actions/work-actions';

// Mock auth
vi.mock('@/lib/tenant-auth', () => ({
  getTenantSafeAuth: vi.fn().mockResolvedValue({
    user: { id: 'test-user' },
    tenantEmail: TEST_TENANT_EMAIL
  })
}));

// Mock RAG sync
vi.mock('@/actions/auto-rag-sync', () => ({
  autoSyncWorkToRAG: vi.fn().mockResolvedValue({ success: true, syncedItems: 1 })
}));

describe('Work Actions Tests', () => {
  describe('updateWorkWithAIResult', () => {
    it('should update work with AI analysis results', async () => {
      // Create test work
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: {
          title: 'Test Requirement',
          versionNumber: 1,
          myWorkId: myWork.id
        }
      });
      const offer = await createTestOffer(requirement.id);
      const work = await createTestWork(offer.id);

      const aiResult = {
        location: 'Budapest, Váci út 15',
        totalWorkers: 3,
        totalLaborCost: 150000,
        totalMaterials: 25,
        totalMaterialCost: 75000,
        totalTools: 8,
        workItems: [
          {
            name: 'Bontási munkák',
            description: 'Régi burkolat eltávolítása',
            quantity: 80,
            unit: 'nm',
            unitPrice: 2000,
            totalPrice: 160000,
            category: 'Bontás'
          },
          {
            name: 'Burkolás',
            description: 'Új laminált padló lerakása',
            quantity: 80,
            unit: 'nm',
            unitPrice: 3500,
            totalPrice: 280000,
            category: 'Burkolás'
          }
        ]
      };

      const result = await updateWorkWithAIResult(work.id, aiResult);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Verify work updated
      const updatedWork = await testPrisma.work.findUnique({
        where: { id: work.id },
        include: { workItems: true }
      });

      expect(updatedWork).toBeTruthy();
      expect(updatedWork?.totalWorkers).toBe(3);
      expect(updatedWork?.totalLaborCost).toBe(150000);
      expect(updatedWork?.totalMaterials).toBe(25);
      expect(updatedWork?.totalMaterialCost).toBe(75000);
      expect(updatedWork?.totalTools).toBe(8);

      // Verify work items created
      expect(updatedWork?.workItems).toHaveLength(2);
      expect(updatedWork?.workItems[0].name).toBe('Bontási munkák');
      expect(updatedWork?.workItems[1].name).toBe('Burkolás');
    });

    it('should handle non-existent work', async () => {
      const aiResult = {
        location: 'Test Location',
        totalWorkers: 1,
        totalLaborCost: 50000
      };

      const result = await updateWorkWithAIResult(99999, aiResult);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Work not found for id: 99999');
    });

    it('should handle unauthorized access', async () => {
      // Create work with different tenant
      const work = await testPrisma.work.create({
        data: {
          title: 'Unauthorized Work',
          offerId: 1, // Dummy offer ID
          tenantEmail: 'different@tenant.com'
        }
      });

      const aiResult = {
        location: 'Test Location',
        totalWorkers: 1,
        totalLaborCost: 50000
      };

      const result = await updateWorkWithAIResult(work.id, aiResult);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('should create work items with correct data', async () => {
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: {
          title: 'Test Requirement',
          versionNumber: 1,
          myWorkId: myWork.id
        }
      });
      const offer = await createTestOffer(requirement.id);
      const work = await createTestWork(offer.id);

      const aiResult = {
        workItems: [
          {
            name: 'Komplex munkafázis',
            description: 'Részletes leírás speciális karakterekkel: áéíóöőúüű',
            quantity: 25.5,
            unit: 'm2',
            unitPrice: 3500.75,
            totalPrice: 89269.125,
            category: 'Speciális',
            estimatedDuration: '3 nap',
            difficulty: 'Közepes'
          }
        ]
      };

      const result = await updateWorkWithAIResult(work.id, aiResult);

      expect(result.success).toBe(true);

      // Verify work item details
      const workItems = await testPrisma.workItem.findMany({
        where: { workId: work.id }
      });

      expect(workItems).toHaveLength(1);
      expect(workItems[0].name).toBe('Komplex munkafázis');
      expect(workItems[0].description).toContain('áéíóöőúüű');
      expect(workItems[0].quantity).toBe(25.5);
      expect(workItems[0].unitPrice).toBe(3500.75);
      expect(workItems[0].totalPrice).toBe(89269.125);
    });

    it('should calculate aggregated fields correctly', async () => {
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: {
          title: 'Test Requirement',
          versionNumber: 1,
          myWorkId: myWork.id
        }
      });
      const offer = await createTestOffer(requirement.id);
      const work = await createTestWork(offer.id);

      const aiResult = {
        totalWorkers: 5,
        totalLaborCost: 250000,
        totalMaterials: 15,
        totalMaterialCost: 45000,
        totalTools: 12,
        workItems: [
          {
            name: 'Item 1',
            quantity: 50,
            unitPrice: 2000,
            totalPrice: 100000
          },
          {
            name: 'Item 2',
            quantity: 30,
            unitPrice: 3000,
            totalPrice: 90000
          }
        ]
      };

      const result = await updateWorkWithAIResult(work.id, aiResult);

      expect(result.success).toBe(true);

      // Verify aggregated calculations
      const updatedWork = await testPrisma.work.findUnique({
        where: { id: work.id }
      });

      expect(updatedWork?.totalWorkers).toBe(5);
      expect(updatedWork?.totalLaborCost).toBe(250000);
      expect(updatedWork?.totalMaterials).toBe(15);
      expect(updatedWork?.totalMaterialCost).toBe(45000);
      expect(updatedWork?.totalTools).toBe(12);
    });

    it('should handle empty work items array', async () => {
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: {
          title: 'Test Requirement',
          versionNumber: 1,
          myWorkId: myWork.id
        }
      });
      const offer = await createTestOffer(requirement.id);
      const work = await createTestWork(offer.id);

      const aiResult = {
        location: 'Test Location',
        totalWorkers: 2,
        totalLaborCost: 100000,
        workItems: [] // Empty array
      };

      const result = await updateWorkWithAIResult(work.id, aiResult);

      expect(result.success).toBe(true);

      // Verify no work items created
      const workItems = await testPrisma.workItem.findMany({
        where: { workId: work.id }
      });

      expect(workItems).toHaveLength(0);
    });

    it('should handle missing workItems property', async () => {
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: {
          title: 'Test Requirement',
          versionNumber: 1,
          myWorkId: myWork.id
        }
      });
      const offer = await createTestOffer(requirement.id);
      const work = await createTestWork(offer.id);

      const aiResult = {
        location: 'Test Location',
        totalWorkers: 1,
        totalLaborCost: 50000
        // No workItems property
      };

      const result = await updateWorkWithAIResult(work.id, aiResult);

      expect(result.success).toBe(true);

      // Should still update work basic fields
      const updatedWork = await testPrisma.work.findUnique({
        where: { id: work.id }
      });

      expect(updatedWork?.totalWorkers).toBe(1);
      expect(updatedWork?.totalLaborCost).toBe(50000);
    });

    it('should handle database errors gracefully', async () => {
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: {
          title: 'Test Requirement',
          versionNumber: 1,
          myWorkId: myWork.id
        }
      });
      const offer = await createTestOffer(requirement.id);
      const work = await createTestWork(offer.id);

      // Mock Prisma to throw error during work update
      const originalUpdate = testPrisma.work.update;
      testPrisma.work.update = vi.fn().mockRejectedValue(new Error('Database connection error'));

      const aiResult = {
        location: 'Test Location',
        totalWorkers: 1,
        totalLaborCost: 50000
      };

      const result = await updateWorkWithAIResult(work.id, aiResult);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update Work');

      // Restore original function
      testPrisma.work.update = originalUpdate;
    });
  });
});
