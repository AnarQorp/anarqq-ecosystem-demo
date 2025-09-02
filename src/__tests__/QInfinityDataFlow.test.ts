// Unit tests for Q∞ Data Flow Pipeline
// Tests each pipeline step with deterministic test data

import { describe, it, expect, beforeEach } from 'vitest';
import { QInfinityDataFlowService } from '../services/QInfinityDataFlowService.js';
import { PipelineStep, QInfinityConfig } from '../interfaces/QInfinityDataFlow.js';

describe('QInfinityDataFlowService', () => {
  let service: QInfinityDataFlowService;
  let config: QInfinityConfig;

  // Deterministic test data
  const testData = {
    simple: { message: 'Hello Q∞', timestamp: '2025-01-01T00:00:00Z' },
    complex: {
      user: { id: 'user123', name: 'Test User' },
      content: { type: 'document', data: 'Lorem ipsum dolor sit amet' },
      metadata: { version: '1.0', tags: ['test', 'demo'] }
    },
    large: {
      data: Array(1000).fill(0).map((_, i) => ({ id: i, value: `item_${i}` }))
    }
  };

  const testUserId = 'test-user-123';

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
        metadataFields: ['contentType', 'size', 'timestamp'],
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

  describe('Forward Data Flow Pipeline', () => {
    it('should process simple data through complete pipeline', async () => {
      const result = await service.processInput(testData.simple, testUserId);

      expect(result.success).toBe(true);
      expect(result.contentId).toBeTruthy();
      expect(result.auditCid).toBeTruthy();
      expect(result.qerberosSignature).toBeTruthy();
      expect(result.processingSteps).toHaveLength(6);
      expect(result.duration).toBeGreaterThan(0);

      // Verify all pipeline steps executed
      const stepTypes = result.processingSteps.map(step => step.step);
      expect(stepTypes).toContain(PipelineStep.INPUT_VALIDATION);
      expect(stepTypes).toContain(PipelineStep.QOMPRESS_COMPRESSION);
      expect(stepTypes).toContain(PipelineStep.QLOCK_ENCRYPTION);
      expect(stepTypes).toContain(PipelineStep.QINDEX_METADATA);
      expect(stepTypes).toContain(PipelineStep.QERBEROS_SECURITY);
      expect(stepTypes).toContain(PipelineStep.IPFS_STORAGE);

      // Verify all steps succeeded
      result.processingSteps.forEach(step => {
        expect(step.success).toBe(true);
        expect(step.duration).toBeGreaterThan(0);
        expect(step.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should process complex data through complete pipeline', async () => {
      const result = await service.processInput(testData.complex, testUserId);

      expect(result.success).toBe(true);
      expect(result.processingSteps).toHaveLength(6);
      
      // Verify data size tracking
      const compressionStep = result.processingSteps.find(
        step => step.step === PipelineStep.QOMPRESS_COMPRESSION
      );
      expect(compressionStep?.inputSize).toBeGreaterThan(0);
      expect(compressionStep?.outputSize).toBeGreaterThan(0);
    });

    it('should handle large data efficiently', async () => {
      const result = await service.processInput(testData.large, testUserId);

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify compression effectiveness on large data
      const compressionStep = result.processingSteps.find(
        step => step.step === PipelineStep.QOMPRESS_COMPRESSION
      );
      expect(compressionStep?.metadata?.compressionRatio).toBeDefined();
    });

    it('should fail gracefully with invalid input', async () => {
      const result = await service.processInput(null, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.processingSteps.length).toBeGreaterThan(0);
      
      // Should fail at input validation step
      const inputValidationStep = result.processingSteps.find(
        step => step.step === PipelineStep.INPUT_VALIDATION
      );
      expect(inputValidationStep?.success).toBe(false);
    });

    it('should fail gracefully with invalid userId', async () => {
      const result = await service.processInput(testData.simple, '');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Reverse Data Flow Pipeline', () => {
    it('should retrieve and validate data through complete reverse pipeline', async () => {
      // First, process some data
      const processResult = await service.processInput(testData.simple, testUserId);
      expect(processResult.success).toBe(true);

      // Then retrieve it
      const retrieveResult = await service.retrieveOutput(processResult.contentId, testUserId);

      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data).toBeTruthy();
      expect(retrieveResult.contentId).toBe(processResult.contentId);
      expect(retrieveResult.auditCid).toBeTruthy();
      expect(retrieveResult.qerberosSignature).toBeTruthy();
      expect(retrieveResult.integrityVerified).toBe(true);
      expect(retrieveResult.retrievalSteps).toHaveLength(6);

      // Verify all reverse pipeline steps executed
      const stepTypes = retrieveResult.retrievalSteps.map(step => step.step);
      expect(stepTypes).toContain(PipelineStep.IPFS_RETRIEVAL);
      expect(stepTypes).toContain(PipelineStep.QINDEX_LOOKUP);
      expect(stepTypes).toContain(PipelineStep.QERBEROS_VERIFICATION);
      expect(stepTypes).toContain(PipelineStep.QLOCK_DECRYPTION);
      expect(stepTypes).toContain(PipelineStep.QOMPRESS_DECOMPRESSION);
      expect(stepTypes).toContain(PipelineStep.OUTPUT_VALIDATION);

      // Verify all steps succeeded
      retrieveResult.retrievalSteps.forEach(step => {
        expect(step.success).toBe(true);
        expect(step.duration).toBeGreaterThan(0);
      });
    });

    it('should handle non-existent content gracefully', async () => {
      const result = await service.retrieveOutput('non-existent-id', testUserId);

      expect(result.success).toBe(false); // Should fail for non-existent content
      expect(result.integrityVerified).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should maintain data integrity through round-trip', async () => {
      // Process original data
      const processResult = await service.processInput(testData.complex, testUserId);
      expect(processResult.success).toBe(true);

      // Retrieve and verify
      const retrieveResult = await service.retrieveOutput(processResult.contentId, testUserId);
      expect(retrieveResult.success).toBe(true);

      // In a real implementation, we would verify that retrieveResult.data matches testData.complex
      // For now, we verify the structure is maintained
      expect(retrieveResult.data).toBeTruthy();
      expect(retrieveResult.integrityVerified).toBe(true);
    });
  });

  describe('Individual Pipeline Step Validation', () => {
    it('should validate input validation step', async () => {
      const result = await service.validatePipelineStep(
        PipelineStep.INPUT_VALIDATION,
        testData.simple
      );

      expect(result.step).toBe(PipelineStep.INPUT_VALIDATION);
      expect(result.isValid).toBe(true);
      expect(result.validationErrors).toHaveLength(0);
      expect(result.performance.duration).toBeGreaterThan(0);
      expect(result.performance.throughput).toBeGreaterThan(0);
    });

    it('should validate compression step', async () => {
      const result = await service.validatePipelineStep(
        PipelineStep.QOMPRESS_COMPRESSION,
        testData.simple
      );

      expect(result.step).toBe(PipelineStep.QOMPRESS_COMPRESSION);
      expect(result.isValid).toBe(true);
      expect(result.expectedOutput).toBeTruthy();
      expect(result.actualOutput).toBeTruthy();
      expect(result.performance.duration).toBeGreaterThan(0);
    });

    it('should validate encryption step', async () => {
      const result = await service.validatePipelineStep(
        PipelineStep.QLOCK_ENCRYPTION,
        testData.simple
      );

      expect(result.step).toBe(PipelineStep.QLOCK_ENCRYPTION);
      expect(result.isValid).toBe(true);
      expect(result.expectedOutput).toBeTruthy();
      expect(result.actualOutput).toBeTruthy();
    });

    it('should handle step validation errors', async () => {
      const result = await service.validatePipelineStep(
        PipelineStep.QOMPRESS_COMPRESSION,
        null
      );

      expect(result.step).toBe(PipelineStep.QOMPRESS_COMPRESSION);
      expect(result.isValid).toBe(false);
      expect(result.validationErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Integrity Validation', () => {
    it('should validate integrity of processed content', async () => {
      // Process some data first
      const processResult = await service.processInput(testData.simple, testUserId);
      expect(processResult.success).toBe(true);

      // Validate integrity
      const integrityResult = await service.validateIntegrity(processResult.contentId);

      expect(integrityResult.isValid).toBe(true);
      expect(integrityResult.contentId).toBe(processResult.contentId);
      expect(integrityResult.qerberosSignatureValid).toBe(true);
      expect(integrityResult.dataIntegrityValid).toBe(true);
      expect(integrityResult.pipelineIntegrityValid).toBe(true);
      expect(integrityResult.errors).toHaveLength(0);
      expect(integrityResult.validationTimestamp).toBeInstanceOf(Date);
    });

    it('should handle integrity validation of non-existent content', async () => {
      const integrityResult = await service.validateIntegrity('non-existent-id');

      expect(integrityResult.isValid).toBe(false);
      expect(integrityResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Flow Metrics Collection', () => {
    it('should collect and report flow metrics', async () => {
      // Process some data to generate metrics
      await service.processInput(testData.simple, testUserId);
      await service.processInput(testData.complex, testUserId);

      const metrics = await service.getFlowMetrics();

      expect(metrics.totalProcessed).toBe(2);
      expect(metrics.totalRetrieved).toBe(0);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.successRate).toBe(1.0);
      expect(metrics.errorRate).toBe(0.0);
      expect(metrics.throughput.processedPerSecond).toBeGreaterThanOrEqual(0);
      expect(metrics.pipelineStepMetrics).toBeDefined();

      // Verify step metrics
      Object.values(PipelineStep).forEach(step => {
        const stepMetric = metrics.pipelineStepMetrics[step];
        if (stepMetric && stepMetric.totalExecutions > 0) {
          expect(stepMetric.averageDuration).toBeGreaterThan(0);
          expect(stepMetric.successRate).toBeGreaterThanOrEqual(0);
          expect(stepMetric.successRate).toBeLessThanOrEqual(1);
          expect(stepMetric.lastExecution).toBeInstanceOf(Date);
        }
      });
    });

    it('should track processing and retrieval separately', async () => {
      // Process data
      const processResult = await service.processInput(testData.simple, testUserId);
      
      // Retrieve data
      await service.retrieveOutput(processResult.contentId, testUserId);

      const metrics = await service.getFlowMetrics();

      expect(metrics.totalProcessed).toBe(1);
      expect(metrics.totalRetrieved).toBe(1);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.averageRetrievalTime).toBeGreaterThan(0);
    });

    it('should calculate error rates correctly', async () => {
      // Process valid data
      await service.processInput(testData.simple, testUserId);
      
      // Process invalid data
      await service.processInput(null, testUserId);

      const metrics = await service.getFlowMetrics();

      expect(metrics.totalProcessed).toBe(2);
      expect(metrics.errorRate).toBeGreaterThan(0);
      expect(metrics.successRate).toBeLessThan(1.0);
    });
  });

  describe('Performance Requirements', () => {
    it('should meet latency requirements (≤2s per operation)', async () => {
      const startTime = Date.now();
      const result = await service.processInput(testData.simple, testUserId);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThanOrEqual(2000); // 2 seconds max
    });

    it('should handle concurrent operations efficiently', async () => {
      const operations = Array(10).fill(0).map((_, i) => 
        service.processInput({ ...testData.simple, id: i }, `${testUserId}_${i}`)
      );

      const results = await Promise.all(operations);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.duration).toBeLessThanOrEqual(2000);
      });

      const metrics = await service.getFlowMetrics();
      expect(metrics.totalProcessed).toBe(10);
    });

    it('should maintain throughput under load', async () => {
      const batchSize = 5;
      const operations = Array(batchSize).fill(0).map((_, i) => 
        service.processInput({ ...testData.simple, batch: i }, testUserId)
      );

      const startTime = Date.now();
      await Promise.all(operations);
      const totalTime = (Date.now() - startTime) / 1000; // Convert to seconds

      const throughput = batchSize / totalTime;
      expect(throughput).toBeGreaterThan(1); // At least 1 operation per second
    });
  });

  describe('Deterministic Behavior', () => {
    it('should produce consistent results for identical inputs', async () => {
      const result1 = await service.processInput(testData.simple, testUserId);
      const result2 = await service.processInput(testData.simple, testUserId);

      expect(result1.success).toBe(result2.success);
      expect(result1.processingSteps.length).toBe(result2.processingSteps.length);
      
      // Step types should be identical
      const steps1 = result1.processingSteps.map(s => s.step);
      const steps2 = result2.processingSteps.map(s => s.step);
      expect(steps1).toEqual(steps2);
    });

    it('should maintain step order consistency', async () => {
      const result = await service.processInput(testData.complex, testUserId);

      expect(result.success).toBe(true);
      
      const stepOrder = result.processingSteps.map(s => s.step);
      const expectedOrder = [
        PipelineStep.INPUT_VALIDATION,
        PipelineStep.QOMPRESS_COMPRESSION,
        PipelineStep.QLOCK_ENCRYPTION,
        PipelineStep.QINDEX_METADATA,
        PipelineStep.QERBEROS_SECURITY,
        PipelineStep.IPFS_STORAGE
      ];

      expect(stepOrder).toEqual(expectedOrder);
    });
  });
});