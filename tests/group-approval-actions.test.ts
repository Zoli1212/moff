/**
 * Group Approval Actions Tests
 * Tests for group-approval-actions.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { testPrisma, TEST_TENANT_EMAIL, createTestWork, createTestOffer, createTestMyWork } from './setup';
import { updateGroupApproval, getGroupApprovalStatus } from '@/actions/group-approval-actions';

// Mock auth
vi.mock('@/lib/tenant-auth', () => ({
  getTenantSafeAuth: vi.fn().mockResolvedValue({
    user: { id: 'test-user' },
    tenantEmail: TEST_TENANT_EMAIL
  })
}));

describe('Group Approval Actions Tests', () => {
  describe('updateGroupApproval', () => {
    it('should approve all items in a group', async () => {
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
      
      const workDiary = await testPrisma.workDiary.create({
        data: {
          workId: work.id,
          tenantEmail: TEST_TENANT_EMAIL,
          date: new Date()
        }
      });
      
      const groupNo = 1;
      
      // Create multiple diary items with same groupNo
      await testPrisma.workDiaryItem.createMany({
        data: [
          {
            workDiaryId: workDiary.id,
            workId: work.id,
            groupNo,
            name: 'Worker 1',
            date: new Date(),
            workHours: 8,
            accepted: false,
            tenantEmail: TEST_TENANT_EMAIL
          },
          {
            workDiaryId: workDiary.id,
            workId: work.id,
            groupNo,
            name: 'Worker 2',
            date: new Date(),
            workHours: 8,
            accepted: false,
            tenantEmail: TEST_TENANT_EMAIL
          }
        ]
      });
      
      const result = await updateGroupApproval(groupNo, true);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Csoportos jóváhagyás sikeres');
      expect(result.updatedCount).toBe(2);
      
      // Verify all items are approved
      const items = await testPrisma.workDiaryItem.findMany({
        where: { groupNo, tenantEmail: TEST_TENANT_EMAIL }
      });
      
      expect(items.every(item => item.accepted === true)).toBe(true);
    });

    it('should revoke approval for all items in a group', async () => {
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
      
      const workDiary = await testPrisma.workDiary.create({
        data: {
          workId: work.id,
          tenantEmail: TEST_TENANT_EMAIL,
          date: new Date()
        }
      });
      
      const groupNo = 2;
      
      // Create approved items
      await testPrisma.workDiaryItem.createMany({
        data: [
          {
            workDiaryId: workDiary.id,
            workId: work.id,
            groupNo,
            name: 'Worker 1',
            date: new Date(),
            workHours: 8,
            accepted: true,
            tenantEmail: TEST_TENANT_EMAIL
          },
          {
            workDiaryId: workDiary.id,
            workId: work.id,
            groupNo,
            name: 'Worker 2',
            date: new Date(),
            workHours: 8,
            accepted: true,
            tenantEmail: TEST_TENANT_EMAIL
          }
        ]
      });
      
      const result = await updateGroupApproval(groupNo, false);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Csoportos jóváhagyás visszavonva');
      expect(result.updatedCount).toBe(2);
      
      // Verify all items are not approved
      const items = await testPrisma.workDiaryItem.findMany({
        where: { groupNo, tenantEmail: TEST_TENANT_EMAIL }
      });
      
      expect(items.every(item => item.accepted === false)).toBe(true);
    });

    it('should handle non-existent group', async () => {
      const result = await updateGroupApproval(99999, true);
      
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
    });
  });

  describe('getGroupApprovalStatus', () => {
    it('should get approval status for a group with all approved', async () => {
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
      
      const workDiary = await testPrisma.workDiary.create({
        data: {
          workId: work.id,
          tenantEmail: TEST_TENANT_EMAIL,
          date: new Date()
        }
      });
      
      const groupNo = 3;
      
      await testPrisma.workDiaryItem.createMany({
        data: [
          {
            workDiaryId: workDiary.id,
            workId: work.id,
            groupNo,
            name: 'Worker 1',
            date: new Date(),
            workHours: 8,
            accepted: true,
            tenantEmail: TEST_TENANT_EMAIL
          },
          {
            workDiaryId: workDiary.id,
            workId: work.id,
            groupNo,
            name: 'Worker 2',
            date: new Date(),
            workHours: 8,
            accepted: true,
            tenantEmail: TEST_TENANT_EMAIL
          }
        ]
      });
      
      const result = await getGroupApprovalStatus(groupNo);
      
      expect(result.success).toBe(true);
      expect(result.allApproved).toBe(true);
      expect(result.someApproved).toBe(true);
      expect(result.totalItems).toBe(2);
      expect(result.approvedItems).toBe(2);
    });

    it('should get approval status for a group with partial approval', async () => {
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
      
      const workDiary = await testPrisma.workDiary.create({
        data: {
          workId: work.id,
          tenantEmail: TEST_TENANT_EMAIL,
          date: new Date()
        }
      });
      
      const groupNo = 4;
      
      await testPrisma.workDiaryItem.createMany({
        data: [
          {
            workDiaryId: workDiary.id,
            workId: work.id,
            groupNo,
            name: 'Worker 1',
            date: new Date(),
            workHours: 8,
            accepted: true,
            tenantEmail: TEST_TENANT_EMAIL
          },
          {
            workDiaryId: workDiary.id,
            workId: work.id,
            groupNo,
            name: 'Worker 2',
            date: new Date(),
            workHours: 8,
            accepted: false,
            tenantEmail: TEST_TENANT_EMAIL
          }
        ]
      });
      
      const result = await getGroupApprovalStatus(groupNo);
      
      expect(result.success).toBe(true);
      expect(result.allApproved).toBe(false);
      expect(result.someApproved).toBe(true);
      expect(result.totalItems).toBe(2);
      expect(result.approvedItems).toBe(1);
    });

    it('should get approval status for a group with no approval', async () => {
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
      
      const workDiary = await testPrisma.workDiary.create({
        data: {
          workId: work.id,
          tenantEmail: TEST_TENANT_EMAIL,
          date: new Date()
        }
      });
      
      const groupNo = 5;
      
      await testPrisma.workDiaryItem.createMany({
        data: [
          {
            workDiaryId: workDiary.id,
            workId: work.id,
            groupNo,
            name: 'Worker 1',
            date: new Date(),
            workHours: 8,
            accepted: false,
            tenantEmail: TEST_TENANT_EMAIL
          },
          {
            workDiaryId: workDiary.id,
            workId: work.id,
            groupNo,
            name: 'Worker 2',
            date: new Date(),
            workHours: 8,
            accepted: false,
            tenantEmail: TEST_TENANT_EMAIL
          }
        ]
      });
      
      const result = await getGroupApprovalStatus(groupNo);
      
      expect(result.success).toBe(true);
      expect(result.allApproved).toBe(false);
      expect(result.someApproved).toBe(false);
      expect(result.totalItems).toBe(2);
      expect(result.approvedItems).toBe(0);
    });

    it('should handle non-existent group', async () => {
      const result = await getGroupApprovalStatus(99999);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Nem találhatók bejegyzések');
    });
  });
});
