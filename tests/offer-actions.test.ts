/**
 * Offer Actions Database Tests
 * Tests for offer-actions.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { testPrisma, TEST_TENANT_EMAIL, createTestMyWork } from './setup';
import { saveOfferWithRequirements } from '@/actions/offer-actions';

// Mock auth
vi.mock('@/lib/tenant-auth', () => ({
  getTenantSafeAuth: vi.fn().mockResolvedValue({
    user: { id: 'test-user' },
    tenantEmail: TEST_TENANT_EMAIL
  })
}));

// Mock RAG sync
vi.mock('@/actions/auto-rag-sync', () => ({
  autoSyncOfferToRAG: vi.fn().mockResolvedValue({ success: true, syncedItems: 1 })
}));

describe('Offer Actions Tests', () => {
  describe('saveOfferWithRequirements', () => {
    it('should create new offer with requirements', async () => {
      const offerData = {
        recordId: 'test-record-123',
        demandText: 'Budapest irodafelújítás 80nm, burkolat csere, festés',
        offerContent: JSON.stringify([
          {
            name: 'Burkolat bontás',
            description: 'Régi burkolat eltávolítása',
            quantity: 80,
            unit: 'nm',
            unitPrice: 2000,
            totalPrice: 160000,
            category: 'Bontás'
          },
          {
            name: 'Festés',
            description: 'Falak festése fehérre',
            quantity: 80,
            unit: 'nm',
            unitPrice: 1500,
            totalPrice: 120000,
            category: 'Festés'
          }
        ]),
        title: 'Irodafelújítás Budapest',
        customerName: 'Test Ügyfél Kft',
        estimatedTime: '5 nap',
        totalPrice: 280000
      };

      const result = await saveOfferWithRequirements(offerData);

      expect(result.success).toBe(true);
      expect(result.offerId).toBeDefined();
      expect(result.workId).toBeDefined();
      expect(result.requirementId).toBeDefined();

      // Verify MyWork created
      const myWork = await testPrisma.myWork.findFirst({
        where: {
          title: offerData.title,
          tenantEmail: TEST_TENANT_EMAIL
        }
      });

      expect(myWork).toBeTruthy();
      expect(myWork?.customerName).toBe(offerData.customerName);
      expect(myWork?.totalPrice).toBe(offerData.totalPrice);

      // Verify Requirement created
      const requirement = await testPrisma.requirement.findFirst({
        where: {
          myWorkId: myWork?.id,
          title: `Követelmény - ${offerData.title}`
        }
      });

      expect(requirement).toBeTruthy();
      expect(requirement?.versionNumber).toBe(1);

      // Verify Offer created
      const offer = await testPrisma.offer.findFirst({
        where: {
          requirementId: requirement?.id,
          tenantEmail: TEST_TENANT_EMAIL
        }
      });

      expect(offer).toBeTruthy();
      expect(offer?.title).toBe(offerData.title);
      expect(offer?.totalPrice).toBe(offerData.totalPrice);
      expect(offer?.recordId).toBe(offerData.recordId);

      // Verify offer items
      const offerItems = JSON.parse(offer?.items as string);
      expect(offerItems).toHaveLength(2);
      expect(offerItems[0].name).toBe('Burkolat bontás');
      expect(offerItems[1].name).toBe('Festés');
    });

    it('should update existing work if title matches', async () => {
      // Create existing work
      const existingWork = await createTestMyWork();
      await testPrisma.myWork.update({
        where: { id: existingWork.id },
        data: { title: 'Existing Work Title' }
      });

      const offerData = {
        recordId: 'test-record-456',
        demandText: 'Updated demand text',
        offerContent: JSON.stringify([]),
        title: 'Existing Work Title', // Same title
        customerName: 'Updated Customer',
        estimatedTime: '3 nap',
        totalPrice: 150000
      };

      const result = await saveOfferWithRequirements(offerData);

      expect(result.success).toBe(true);

      // Verify work was updated, not created new
      const works = await testPrisma.myWork.findMany({
        where: {
          title: 'Existing Work Title',
          tenantEmail: TEST_TENANT_EMAIL
        }
      });

      expect(works).toHaveLength(1);
      expect(works[0].totalPrice).toBe(150000); // Updated price
    });

    it('should handle requirement versioning', async () => {
      const myWork = await createTestMyWork();

      // Create first requirement
      await testPrisma.requirement.create({
        data: {
          title: `Követelmény - ${myWork.title}`,
          versionNumber: 1,
          myWorkId: myWork.id
        }
      });

      const offerData = {
        recordId: 'test-record-789',
        demandText: 'New version of requirements',
        offerContent: JSON.stringify([]),
        title: myWork.title,
        customerName: 'Test Customer',
        estimatedTime: '2 nap',
        totalPrice: 100000
      };

      const result = await saveOfferWithRequirements(offerData);

      expect(result.success).toBe(true);

      // Verify new version created
      const requirements = await testPrisma.requirement.findMany({
        where: {
          myWorkId: myWork.id,
          title: `Követelmény - ${myWork.title}`
        },
        orderBy: { versionNumber: 'desc' }
      });

      expect(requirements).toHaveLength(2);
      expect(requirements[0].versionNumber).toBe(2); // Latest version
      expect(requirements[1].versionNumber).toBe(1); // Previous version
    });

    it('should handle missing required fields', async () => {
      const invalidOfferData = {
        recordId: '',
        demandText: '',
        offerContent: '',
        title: '',
        customerName: '',
        estimatedTime: '',
        totalPrice: 0
      };

      const result = await saveOfferWithRequirements(invalidOfferData);

      // Should still succeed but create with default values
      expect(result.success).toBe(true);

      // Verify work created with UUID title (fallback)
      const works = await testPrisma.myWork.findMany({
        where: { tenantEmail: TEST_TENANT_EMAIL }
      });

      expect(works).toHaveLength(1);
      expect(works[0].title).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    it('should parse and store offer content correctly', async () => {
      const complexOfferContent = [
        {
          name: 'Komplex munka',
          description: 'Részletes leírás speciális karakterekkel: áéíóöőúüű',
          quantity: 25.5,
          unit: 'm2',
          unitPrice: 3500.75,
          totalPrice: 89269.125,
          category: 'Speciális',
          notes: 'Extra megjegyzések'
        }
      ];

      const offerData = {
        recordId: 'complex-test-001',
        demandText: 'Komplex igény leírása',
        offerContent: JSON.stringify(complexOfferContent),
        title: 'Komplex Ajánlat',
        customerName: 'Komplex Ügyfél',
        estimatedTime: '10 munkanap',
        totalPrice: 89269.125
      };

      const result = await saveOfferWithRequirements(offerData);

      expect(result.success).toBe(true);

      // Verify complex data stored correctly
      const offer = await testPrisma.offer.findFirst({
        where: {
          recordId: offerData.recordId,
          tenantEmail: TEST_TENANT_EMAIL
        }
      });

      expect(offer).toBeTruthy();
      
      const storedItems = JSON.parse(offer?.items as string);
      expect(storedItems).toHaveLength(1);
      expect(storedItems[0].name).toBe('Komplex munka');
      expect(storedItems[0].quantity).toBe(25.5);
      expect(storedItems[0].unitPrice).toBe(3500.75);
      expect(storedItems[0].description).toContain('áéíóöőúüű');
    });

    it('should handle database transaction rollback on error', async () => {
      // Mock Prisma to throw error during offer creation
      const originalCreate = testPrisma.offer.create;
      testPrisma.offer.create = vi.fn().mockRejectedValue(new Error('Database error'));

      const offerData = {
        recordId: 'error-test-001',
        demandText: 'This should fail',
        offerContent: JSON.stringify([]),
        title: 'Error Test',
        customerName: 'Error Customer',
        estimatedTime: '1 nap',
        totalPrice: 50000
      };

      const result = await saveOfferWithRequirements(offerData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Verify no partial data was created
      const works = await testPrisma.myWork.findMany({
        where: {
          title: 'Error Test',
          tenantEmail: TEST_TENANT_EMAIL
        }
      });

      // Restore original function
      testPrisma.offer.create = originalCreate;

      // Should have no works created due to transaction rollback
      expect(works).toHaveLength(0);
    });
  });
});
