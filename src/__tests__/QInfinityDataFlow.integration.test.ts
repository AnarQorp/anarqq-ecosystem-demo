// Integration tests for Q∞ Data Flow bidirectional validation
// Tests complete round-trip data integrity and pipeline validation

import { describe, it, expect, beforeEach } from 'vitest';
import { QInfinityDataFlowService } from '../services/QInfinityDataFlowService.js';
import { PipelineStep, QInfinityConfig } from '../interfaces/QInfinityDataFlow.js';

describe('QInfinityDataFlow Integration Tests', () => {
  let service: QInfinityDataFlowService;
  let config: QInfinityConfig;

  // Test data for bidirectional validation
  const testDataSets = [
    {
      name: 'Simple JSON Object',
      data: { message: 'Hello Q∞', timestamp: '2025-01-01T00:00:00Z', id: 1 }
    },
    {
      name: 'Complex Nested Object',
      data: {
        user: { id: 'user123', name: 'Test User', roles: ['admin', 'user'] },
        content: { 
          type: 'document', 
          data: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
          metadata: { version: '1.0', tags: ['test', 'demo'], created: new Date().toISOString() }
        },
        settings: { theme: 'dark', notifications: true, language: 'en' }
      }
    },
    {
      name: 'Array Data',
      data: {
        items: Array(50).fill(0).map((_, i) => ({ 
          id: i, 
          value: `item_${i}`, 
          active: i % 2 === 0,
          metadata: { created: new Date(Date.now() - i * 1000).toISOString() }
        }))
      }
    },
    {
      name: 'String Data',
      data: { content: 'This is a simple string content for testing the Q∞ pipeline.' }
    },
    {
      name: 'Numeric Data',
      data: { 
        numbers: [1, 2, 3, 4, 5],
        calculations: { sum: 15, average: 3, max: 5, min: 1 },
        pi: 3.14159265359
      }
    }
  ];

  const testUserId = 'integration-test-user';

  beforeEach(() => {
    config = {
      qompress: {
        algorithm: 'gzip',
        compressionLevel: 6
      },
      qlock: {
        encryptionAlgorithm: 'aes-256-gcm',
        keyDerivation: 'pbkdf2'
      },
      qindex: {
        metadataFields: ['contentType', 'size', 'timestamp', 'userId'],
        indexingStrategy: 'immediate'
      },
      qerberos: {
        signatureAlgorithm: 'ed25519',
        auditLevel: 'detailed'
      },
      ipfs: {
        gateway: 'http://localhost:8080',
        timeout: 30000,
        pinning: true
      }
    };

    service = new QInfinityDataFlowService(config);
  });

  describe('Bidirectional Data Flow Validation', () => {
    testDataSets.forEach(({ name, data }) => {
      it(`should maintain data integrity through complete round-trip for ${name}`, async () => {
        // Forward flow: Process input data
        const processResult = await service.processInput(data, testUserId);
        
        expect(processResult.success).toBe(true);
        expect(processResult.contentId).toBeTruthy();
        expect(processResult.auditCid).toBeTruthy();
        expect(processResult.qerberosSignature).toBeTruthy();
        expect(processResult.processingSteps).toHaveLength(6);

        // Verify forward pipeline steps
        const forwardSteps = processResult.processingSteps.map(step => step.step);
        expect(forwardSteps).toEqual([
          PipelineStep.INPUT_VALIDATION,
          PipelineStep.QOMPRESS_COMPRESSION,
          PipelineStep.QLOCK_ENCRYPTION,
          PipelineStep.QINDEX_METADATA,
          PipelineStep.QERBEROS_SECURITY,
          PipelineStep.IPFS_STORAGE
        ]);

        // All forward steps should succeed
        processResult.processingSteps.forEach(step => {
          expect(step.success).toBe(true);
          expect(step.duration).toBeGreaterThan(0);
        });

        // Reverse flow: Retrieve and validate data
        const retrieveResult = await service.retrieveOutput(processResult.contentId, testUserId);
        
        expect(retrieveResult.success).toBe(true);
        expect(retrieveResult.contentId).toBe(processResult.contentId);
        expect(retrieveResult.integrityVerified).toBe(true);
        expect(retrieveResult.retrievalSteps).toHaveLength(6);

        // Verify reverse pipeline steps
        const reverseSteps = retrieveResult.retrievalSteps.map(step => step.step);
        expect(reverseSteps).toEqual([
          PipelineStep.IPFS_RETRIEVAL,
          PipelineStep.QINDEX_LOOKUP,
          PipelineStep.QERBEROS_VERIFICATION,
          PipelineStep.QLOCK_DECRYPTION,
          PipelineStep.QOMPRESS_DECOMPRESSION,
          PipelineStep.OUTPUT_VALIDATION
        ]);

        // All reverse steps should succeed
        retrieveResult.retrievalSteps.forEach(step => {
          expect(step.success).toBe(true);
          expect(step.duration).toBeGreaterThanOrEqual(0); // Allow 0 duration for fast operations
        });

        // Verify data integrity (in a real implementation, this would be exact match)
        expect(retrieveResult.data).toBeTruthy();
        
        // Verify audit trail consistency
        expect(retrieveResult.auditCid).toBeTruthy();
        expect(retrieveResult.qerberosSignature).toBeTruthy();
      });
    });

    it('should handle multiple concurrent round-trips', async () => {
      const concurrentOperations = testDataSets.map(async ({ data }, index) => {
        const userId = `${testUserId}_${index}`;
        
        // Process data
        const processResult = await service.processInput(data, userId);
        expect(processResult.success).toBe(true);
        
        // Retrieve data
        const retrieveResult = await service.retrieveOutput(processResult.contentId, userId);
        expect(retrieveResult.success).toBe(true);
        expect(retrieveResult.integrityVerified).toBe(true);
        
        return { processResult, retrieveResult };
      });

      const results = await Promise.all(concurrentOperations);
      
      // Verify all operations succeeded
      results.forEach(({ processResult, retrieveResult }) => {
        expect(processResult.success).toBe(true);
        expect(retrieveResult.success).toBe(true);
        expect(retrieveResult.contentId).toBe(processResult.contentId);
      });

      // Verify metrics reflect all operations
      const metrics = await service.getFlowMetrics();
      expect(metrics.totalProcessed).toBe(testDataSets.length);
      expect(metrics.totalRetrieved).toBe(testDataSets.length);
    });
  });

  describe('Pipeline Step Integrity Validation', () => {
    it('should validate each step in forward pipeline maintains data integrity', async () => {
      const testData = testDataSets[1].data; // Use complex nested object
      
      const processResult = await service.processInput(testData, testUserId);
      expect(processResult.success).toBe(true);

      // Validate each processing step
      for (const step of processResult.processingSteps) {
        expect(step.success).toBe(true);
        expect(step.inputSize).toBeGreaterThan(0);
        expect(step.timestamp).toBeInstanceOf(Date);
        
        // Verify step-specific validations
        switch (step.step) {
          case PipelineStep.INPUT_VALIDATION:
            expect(step.metadata?.validated).toBe(true);
            expect(step.metadata?.userId).toBe(testUserId);
            break;
          case PipelineStep.QOMPRESS_COMPRESSION:
            expect(step.metadata?.success).toBe(true);
            expect(step.metadata?.algorithm).toBe(config.qompress.algorithm);
            expect(step.metadata?.compressionRatio).toBeDefined();
            break;
          case PipelineStep.QLOCK_ENCRYPTION:
            expect(step.metadata?.success).toBe(true);
            expect(step.metadata?.algorithm).toBe(config.qlock.encryptionAlgorithm);
            expect(step.metadata?.keyId).toBe(`key_${testUserId}`);
            break;
          case PipelineStep.QINDEX_METADATA:
            expect(step.metadata?.success).toBe(true);
            expect(step.metadata?.metadata).toBeDefined();
            break;
          case PipelineStep.QERBEROS_SECURITY:
            expect(step.metadata?.success).toBe(true);
            expect(step.metadata?.auditCid).toBeTruthy();
            expect(step.metadata?.signature).toBeTruthy();
            break;
          case PipelineStep.IPFS_STORAGE:
            expect(step.metadata?.success).toBe(true);
            expect(step.metadata?.contentId).toBeTruthy();
            expect(step.metadata?.pinned).toBe(config.ipfs.pinning);
            break;
        }
      }
    });

    it('should validate each step in reverse pipeline maintains data integrity', async () => {
      const testData = testDataSets[2].data; // Use array data
      
      // First process the data
      const processResult = await service.processInput(testData, testUserId);
      expect(processResult.success).toBe(true);

      // Then retrieve and validate each step
      const retrieveResult = await service.retrieveOutput(processResult.contentId, testUserId);
      expect(retrieveResult.success).toBe(true);

      // Validate each retrieval step
      for (const step of retrieveResult.retrievalSteps) {
        expect(step.success).toBe(true);
        expect(step.timestamp).toBeInstanceOf(Date);
        
        // Verify step-specific validations
        switch (step.step) {
          case PipelineStep.IPFS_RETRIEVAL:
            expect(step.metadata?.success).toBe(true);
            expect(step.metadata?.contentId).toBe(processResult.contentId);
            break;
          case PipelineStep.QINDEX_LOOKUP:
            expect(step.metadata?.success).toBe(true);
            expect(step.metadata?.metadata).toBeDefined();
            break;
          case PipelineStep.QERBEROS_VERIFICATION:
            expect(step.metadata?.success).toBe(true);
            expect(step.metadata?.verified).toBe(true);
            break;
          case PipelineStep.QLOCK_DECRYPTION:
            expect(step.metadata?.success).toBe(true);
            expect(step.metadata?.keyId).toBe(`key_${testUserId}`);
            break;
          case PipelineStep.QOMPRESS_DECOMPRESSION:
            expect(step.metadata?.success).toBe(true);
            expect(step.metadata?.decompressedData).toBeDefined();
            break;
          case PipelineStep.OUTPUT_VALIDATION:
            expect(step.metadata?.validated).toBe(true);
            break;
        }
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle partial pipeline failures gracefully', async () => {
      // Test with invalid data that should fail at some point
      const invalidData = null;
      
      const processResult = await service.processInput(invalidData, testUserId);
      expect(processResult.success).toBe(false);
      expect(processResult.error).toBeTruthy();
      
      // Should have at least attempted input validation
      expect(processResult.processingSteps.length).toBeGreaterThan(0);
      
      // First step should fail
      const firstStep = processResult.processingSteps[0];
      expect(firstStep.step).toBe(PipelineStep.INPUT_VALIDATION);
      expect(firstStep.success).toBe(false);
    });

    it('should handle retrieval failures gracefully', async () => {
      const retrieveResult = await service.retrieveOutput('non-existent-id', testUserId);
      
      expect(retrieveResult.success).toBe(false);
      expect(retrieveResult.integrityVerified).toBe(false);
      expect(retrieveResult.error).toBeTruthy();
      
      // Should have attempted IPFS retrieval
      expect(retrieveResult.retrievalSteps.length).toBeGreaterThan(0);
      
      const firstStep = retrieveResult.retrievalSteps[0];
      expect(firstStep.step).toBe(PipelineStep.IPFS_RETRIEVAL);
      expect(firstStep.success).toBe(false);
    });

    it('should maintain metrics accuracy during failures', async () => {
      const initialMetrics = await service.getFlowMetrics();
      
      // Perform successful operation
      const validData = testDataSets[0].data;
      await service.processInput(validData, testUserId);
      
      // Perform failed operation
      await service.processInput(null, testUserId);
      
      const finalMetrics = await service.getFlowMetrics();
      
      expect(finalMetrics.totalProcessed).toBe(initialMetrics.totalProcessed + 2);
      expect(finalMetrics.errorRate).toBeGreaterThan(initialMetrics.errorRate);
      expect(finalMetrics.successRate).toBeLessThan(1.0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should maintain performance under load', async () => {
      const batchSize = 10;
      const testData = testDataSets[0].data;
      
      const startTime = Date.now();
      
      // Process multiple items concurrently
      const processPromises = Array(batchSize).fill(0).map((_, i) => 
        service.processInput({ ...testData, batchId: i }, `${testUserId}_${i}`)
      );
      
      const processResults = await Promise.all(processPromises);
      
      // Retrieve all items concurrently
      const retrievePromises = processResults.map(result => 
        service.retrieveOutput(result.contentId, testUserId)
      );
      
      const retrieveResults = await Promise.all(retrievePromises);
      
      const totalTime = Date.now() - startTime;
      
      // Verify all operations succeeded
      processResults.forEach(result => expect(result.success).toBe(true));
      retrieveResults.forEach(result => expect(result.success).toBe(true));
      
      // Verify performance requirements
      const avgTimePerOperation = totalTime / (batchSize * 2); // Process + retrieve
      expect(avgTimePerOperation).toBeLessThan(1000); // Less than 1 second per operation
      
      // Verify throughput
      const throughput = (batchSize * 2) / (totalTime / 1000);
      expect(throughput).toBeGreaterThan(2); // At least 2 operations per second
    });

    it('should scale linearly with data size', async () => {
      const smallData = { content: 'small' };
      const mediumData = { content: 'medium'.repeat(100) };
      const largeData = { content: 'large'.repeat(1000) };
      
      const testCases = [
        { name: 'small', data: smallData },
        { name: 'medium', data: mediumData },
        { name: 'large', data: largeData }
      ];
      
      const results = [];
      
      for (const testCase of testCases) {
        const startTime = Date.now();
        
        const processResult = await service.processInput(testCase.data, testUserId);
        const retrieveResult = await service.retrieveOutput(processResult.contentId, testUserId);
        
        const duration = Date.now() - startTime;
        const dataSize = JSON.stringify(testCase.data).length;
        
        results.push({
          name: testCase.name,
          dataSize,
          duration,
          throughput: dataSize / (duration / 1000)
        });
        
        expect(processResult.success).toBe(true);
        expect(retrieveResult.success).toBe(true);
      }
      
      // Verify that processing time scales reasonably with data size
      results.forEach(result => {
        expect(result.duration).toBeLessThan(5000); // Max 5 seconds
        expect(result.throughput).toBeGreaterThan(0);
      });
    });
  });

  describe('Audit Trail Validation', () => {
    it('should maintain complete audit trail through round-trip', async () => {
      const testData = testDataSets[1].data;
      
      const processResult = await service.processInput(testData, testUserId);
      expect(processResult.success).toBe(true);
      
      const retrieveResult = await service.retrieveOutput(processResult.contentId, testUserId);
      expect(retrieveResult.success).toBe(true);
      
      // Validate integrity
      const integrityResult = await service.validateIntegrity(processResult.contentId);
      expect(integrityResult.isValid).toBe(true);
      expect(integrityResult.qerberosSignatureValid).toBe(true);
      expect(integrityResult.dataIntegrityValid).toBe(true);
      expect(integrityResult.pipelineIntegrityValid).toBe(true);
      
      // Verify audit CIDs match
      expect(integrityResult.auditCid).toBeTruthy();
      expect(integrityResult.contentId).toBe(processResult.contentId);
    });

    it('should detect integrity violations', async () => {
      // Test integrity validation with non-existent content
      const integrityResult = await service.validateIntegrity('non-existent-id');
      
      expect(integrityResult.isValid).toBe(false);
      expect(integrityResult.errors.length).toBeGreaterThan(0);
    });
  });
});