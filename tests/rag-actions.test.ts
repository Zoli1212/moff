/**
 * RAG Actions Database Tests
 * Tests for auto-rag-sync.ts and rag-context-actions.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { testPrisma, TEST_TENANT_EMAIL, createTestMyWork, createTestOffer, createTestWork } from './setup';
import { autoSyncOfferToRAG, autoSyncWorkToRAG } from '@/actions/auto-rag-sync';
import { addRAGContext, searchRAGContext } from '@/actions/rag-context-actions';

// Mock auth
vi.mock('@/lib/tenant-auth', () => ({
  getTenantSafeAuth: vi.fn().mockResolvedValue({
    user: { id: 'test-user' },
    tenantEmail: TEST_TENANT_EMAIL
  })
}));

describe('RAG Actions Tests', () => {
  describe('addRAGContext', () => {
    it('should add context to knowledge base', async () => {
      const content = 'Test RAG content for knowledge base';
      const category = 'test_category';
      const metadata = { source: 'test', testId: 123 };

      const result = await addRAGContext(content, category, metadata);

      expect(result.success).toBe(true);

      // Verify in database
      const knowledgeEntry = await testPrisma.knowledgeBase.findFirst({
        where: {
          tenantEmail: TEST_TENANT_EMAIL,
          category,
          content
        }
      });

      expect(knowledgeEntry).toBeTruthy();
      expect(knowledgeEntry?.content).toBe(content);
      expect(knowledgeEntry?.category).toBe(category);
      expect(knowledgeEntry?.metadata).toEqual(metadata);
    });

    it('should handle duplicate content gracefully', async () => {
      const content = 'Duplicate test content';
      const category = 'test_duplicate';
      const metadata = { source: 'test' };

      // Add first time
      await addRAGContext(content, category, metadata);
      
      // Add second time (should not create duplicate)
      const result = await addRAGContext(content, category, metadata);

      expect(result.success).toBe(true);

      // Verify only one entry exists
      const entries = await testPrisma.knowledgeBase.findMany({
        where: {
          tenantEmail: TEST_TENANT_EMAIL,
          content
        }
      });

      expect(entries.length).toBe(1);
    });
  });

  describe('searchRAGContext', () => {
    it('should find relevant context', async () => {
      // Add test data
      await addRAGContext('Budapest irodafelújítás 80nm', 'offers', { source: 'test' });
      await addRAGContext('Debrecen lakásfelújítás 60nm', 'offers', { source: 'test' });
      await addRAGContext('Szeged fürdőszoba felújítás', 'offers', { source: 'test' });

      const results = await searchRAGContext('irodafelújítás Budapest');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('Budapest');
      expect(results[0].content).toContain('irodafelújítás');
    });

    it('should respect maxResults parameter', async () => {
      // Add multiple test entries
      for (let i = 0; i < 5; i++) {
        await addRAGContext(`Test content ${i} felújítás`, 'test', { source: 'test', id: i });
      }

      const results = await searchRAGContext('felújítás', 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('autoSyncOfferToRAG', () => {
    it('should sync offer to RAG knowledge base', async () => {
      // Create test data
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: {
          title: 'Test Requirement',
          versionNumber: 1,
          myWorkId: myWork.id
        }
      });
      const offer = await createTestOffer(requirement.id);

      const result = await autoSyncOfferToRAG(offer.id);

      expect(result.success).toBe(true);
      expect(result.syncedItems).toBeGreaterThan(0);

      // Verify knowledge base entries
      const knowledgeEntries = await testPrisma.knowledgeBase.findMany({
        where: {
          tenantEmail: TEST_TENANT_EMAIL,
          metadata: {
            path: ['offerId'],
            equals: offer.id
          }
        }
      });

      expect(knowledgeEntries.length).toBeGreaterThan(0);
      expect(knowledgeEntries[0].content).toContain('Test Offer');
    });

    it('should handle non-existent offer', async () => {
      const result = await autoSyncOfferToRAG(99999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Ajánlat nem található');
    });

    it('should sync offer items if present', async () => {
      // Create offer with items
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: {
          title: 'Test Requirement',
          versionNumber: 1,
          myWorkId: myWork.id
        }
      });
      
      const offerItems = [
        { name: 'Burkolat bontás', quantity: 80, unitPrice: 2000, totalPrice: 160000 },
        { name: 'Festés', quantity: 80, unitPrice: 1500, totalPrice: 120000 }
      ];

      const offer = await testPrisma.offer.create({
        data: {
          title: 'Test Offer with Items',
          totalPrice: 280000,
          requirementId: requirement.id,
          tenantEmail: TEST_TENANT_EMAIL,
          items: offerItems
        }
      });

      const result = await autoSyncOfferToRAG(offer.id);

      expect(result.success).toBe(true);
      expect(result.syncedItems).toBe(3); // 1 offer + 2 items

      // Verify item entries
      const itemEntries = await testPrisma.knowledgeBase.findMany({
        where: {
          tenantEmail: TEST_TENANT_EMAIL,
          category: 'offer_items'
        }
      });

      expect(itemEntries.length).toBe(2);
      expect(itemEntries[0].content).toContain('Burkolat bontás');
      expect(itemEntries[1].content).toContain('Festés');
    });
  });

  describe('autoSyncWorkToRAG', () => {
    it('should sync work to RAG knowledge base', async () => {
      // Create test data
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

      const result = await autoSyncWorkToRAG(work.id);

      expect(result.success).toBe(true);
      expect(result.syncedItems).toBeGreaterThan(0);

      // Verify knowledge base entries
      const knowledgeEntries = await testPrisma.knowledgeBase.findMany({
        where: {
          tenantEmail: TEST_TENANT_EMAIL,
          metadata: {
            path: ['workId'],
            equals: work.id
          }
        }
      });

      expect(knowledgeEntries.length).toBeGreaterThan(0);
      expect(knowledgeEntries[0].content).toContain('Test Work Project');
    });

    it('should handle non-existent work', async () => {
      const result = await autoSyncWorkToRAG(99999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Munka nem található');
    });

    it('should sync work items if present', async () => {
      // Create work with work items
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

      // Add work items
      await testPrisma.workItem.create({
        data: {
          name: 'Bontási munkák',
          description: 'Régi burkolat eltávolítása',
          quantity: 80,
          unit: 'nm',
          unitPrice: 2000,
          totalPrice: 160000,
          workId: work.id,
          tenantEmail: TEST_TENANT_EMAIL
        }
      });

      const result = await autoSyncWorkToRAG(work.id);

      expect(result.success).toBe(true);
      expect(result.syncedItems).toBe(2); // 1 work + 1 work item

      // Verify work item entry
      const itemEntries = await testPrisma.knowledgeBase.findMany({
        where: {
          tenantEmail: TEST_TENANT_EMAIL,
          category: 'work_items'
        }
      });

      expect(itemEntries.length).toBe(1);
      expect(itemEntries[0].content).toContain('Bontási munkák');
    });
  });

  describe('RAG Integration Flow', () => {
    it('should complete full RAG sync workflow', async () => {
      // 1. Create complete data structure
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: {
          title: 'Full Test Requirement',
          versionNumber: 1,
          myWorkId: myWork.id
        }
      });
      const offer = await createTestOffer(requirement.id);
      const work = await createTestWork(offer.id);

      // 2. Sync both offer and work
      const offerResult = await autoSyncOfferToRAG(offer.id);
      const workResult = await autoSyncWorkToRAG(work.id);

      expect(offerResult.success).toBe(true);
      expect(workResult.success).toBe(true);

      // 3. Verify total knowledge base entries
      const totalEntries = await testPrisma.knowledgeBase.count({
        where: { tenantEmail: TEST_TENANT_EMAIL }
      });

      expect(totalEntries).toBeGreaterThanOrEqual(2); // At least offer + work

      // 4. Test search functionality
      const searchResults = await searchRAGContext('Test');
      expect(searchResults.length).toBeGreaterThan(0);
    });
  });
});
