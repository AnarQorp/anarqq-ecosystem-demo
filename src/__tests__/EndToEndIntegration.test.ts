import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { DemoOrchestratorService } from '../services/DemoOrchestratorService.js';
import { ScenarioEngine } from '../services/ScenarioEngine.js';
import { PerformanceMetricsService } from '../services/PerformanceMetricsService.js';
import { ModuleRegistry } from '../services/ModuleRegistry.js';
import { ErrorHandlerService } from '../services/ErrorHandlerService.js';
import { BaseConfig } from '../config/index.js';
import { QInfinityDataFlow } from '../services/QInfinityDataFlow.js';
import { PiNetworkIntegration } from '../services/PiNetworkIntegration.js';
import { ModuleIntegration } from '../services/ModuleIntegration.js';
import { QerberosAuth } from '../services/QerberosAuth.js';
import { Environment, ScenarioType } from '../types/index.js';

/**
 * End-to-End Integration Tests
 * 
 * Tests complete system integration across all modules
 * Validates Q∞ data flow integrity with real-world data scenarios
 * Tests Pi Network integration with comprehensive authentication and transaction flows
 * 
 * Requirements: 1.1, 2.1, 4.1
 */
describe('End-to-End Integration Tests', () => {
  let orchestrator: DemoOrchestratorService;
  let scenarioEngine: ScenarioEngine;
  let qInfinityDataFlow: QInfinityDataFlow;
  let piNetworkIntegration: PiNetworkIntegration;
  let moduleIntegration: ModuleIntegration;
  let qerberosAuth: QerberosAuth;
  let config: BaseConfig;

  // Test data for real-world scenarios
  const testData = {
    identity: {
      userId: 'test-user-001',
      piUserId: 'pi-user-12345',
      email: 'test@example.com',
      squidId: 'squid-identity-001'
    },
    content: {
      textContent: 'This is a test document for Q∞ data flow validation',
      binaryContent: Buffer.from('Binary test data for compression and encryption'),
      metadata: {
        title: 'Test Document',
        author: 'Integration Test',
        tags: ['test', 'integration', 'q-infinity']
      }
    },
    dao: {
      proposalId: 'proposal-001',
      title: 'Test Governance Proposal',
      description: 'Integration test proposal for DAO governance validation',
      votingOptions: ['approve', 'reject', 'abstain']
    },
    social: {
      postContent: 'Test social post for governance integration',
      communityId: 'test-community-001',
      governanceTopicId: 'governance-topic-001'
    }
  };

  beforeAll(async () => {
    // Initialize all services with real implementations
    config = new BaseConfig();
    
    // Initialize core services
    qInfinityDataFlow = new QInfinityDataFlow();
    piNetworkIntegration = new PiNetworkIntegration();
    moduleIntegration = new ModuleIntegration();
    qerberosAuth = new QerberosAuth();
    
    // Initialize orchestrator components
    const performanceMetrics = new PerformanceMetricsService();
    const moduleRegistry = new ModuleRegistry();
    const errorHandler = new ErrorHandlerService();
    
    scenarioEngine = new ScenarioEngine(
      piNetworkIntegration,
      qInfinityDataFlow,
      moduleIntegration,
      qerberosAuth
    );

    orchestrator = new DemoOrchestratorService(
      config,
      scenarioEngine,
      performanceMetrics,
      moduleRegistry,
      errorHandler
    );

    // Initialize the orchestrator for local environment
    await orchestrator.initialize('local');
  });

  afterAll(async () => {
    if (orchestrator) {
      await orchestrator.shutdown();
    }
  });

  beforeEach(() => {
    // Reset any mocks or state between tests
    vi.clearAllMocks();
  });

  describe('Complete System Integration', () => {
    it('should integrate all 14 core modules successfully', async () => {
      // Requirement 1.1: All 14 core modules integration
      const expectedModules = [
        'sQuid', 'Qlock', 'Qonsent', 'Qindex', 'Qerberos', 
        'Qwallet', 'Qflow', 'QNET', 'Qdrive', 'QpiC', 
        'Qmarket', 'Qmail', 'Qchat', 'Qsocial'
      ];

      // Check module registry
      const registeredModules = await moduleIntegration.getRegisteredModules();
      
      expect(registeredModules).toBeDefined();
      expect(registeredModules.length).toBeGreaterThanOrEqual(expectedModules.length);
      
      // Verify each expected module is registered
      for (const expectedModule of expectedModules) {
        const module = registeredModules.find(m => m.moduleId === expectedModule);
        expect(module, `Module ${expectedModule} should be registered`).toBeDefined();
        expect(module?.status, `Module ${expectedModule} should be active`).toBe('active');
      }

      // Test module health checks
      const healthResults = await Promise.all(
        registeredModules.map(module => moduleIntegration.checkModuleHealth(module.moduleId))
      );

      healthResults.forEach((health, index) => {
        expect(health.isHealthy, `Module ${registeredModules[index].moduleId} should be healthy`).toBe(true);
      });
    });

    it('should demonstrate clear data flow visualization between components', async () => {
      // Requirement 1.1: Clear data flow visualization
      const testContent = testData.content.textContent;
      
      // Process data through Q∞ pipeline
      const flowResult = await qInfinityDataFlow.processInput(testContent, testData.identity.userId);
      
      expect(flowResult).toBeDefined();
      expect(flowResult.flowId).toBeDefined();
      expect(flowResult.processingSteps).toBeDefined();
      expect(flowResult.processingSteps.length).toBeGreaterThan(0);
      
      // Verify each step in the pipeline is documented
      const expectedSteps = ['qompress', 'qlock', 'qindex', 'qerberos', 'ipfs'];
      const actualSteps = flowResult.processingSteps.map(step => step.stepName.toLowerCase());
      
      for (const expectedStep of expectedSteps) {
        expect(actualSteps, `Pipeline should include ${expectedStep} step`).toContain(expectedStep);
      }

      // Verify step-by-step data transformation logging
      flowResult.processingSteps.forEach(step => {
        expect(step.inputSize, `Step ${step.stepName} should log input size`).toBeGreaterThan(0);
        expect(step.outputSize, `Step ${step.stepName} should log output size`).toBeGreaterThan(0);
        expect(step.duration, `Step ${step.stepName} should log processing duration`).toBeGreaterThan(0);
        expect(step.status, `Step ${step.stepName} should have success status`).toBe('success');
      });
    });

    it('should provide clear error messaging and fallback options for module failures', async () => {
      // Requirement 1.1: Error handling and fallback options
      
      // Simulate module failure by temporarily disabling a module
      const testModuleId = 'Qindex';
      
      // Disable module
      await moduleIntegration.disableModule(testModuleId);
      
      try {
        // Attempt to process data with disabled module
        const result = await qInfinityDataFlow.processInput(
          testData.content.textContent, 
          testData.identity.userId
        );
        
        // Should either succeed with fallback or provide clear error
        if (result.status === 'error') {
          expect(result.error).toBeDefined();
          expect(result.error?.message).toContain(testModuleId);
          expect(result.fallbackOptions).toBeDefined();
          expect(result.fallbackOptions?.length).toBeGreaterThan(0);
        } else {
          // If successful, should indicate fallback was used
          expect(result.usedFallback).toBe(true);
          expect(result.fallbackDetails).toBeDefined();
        }
      } finally {
        // Re-enable module
        await moduleIntegration.enableModule(testModuleId);
      }
    });
  });

  describe('Q∞ Data Flow Validation', () => {
    it('should follow exact forward data flow pipeline', async () => {
      // Requirement 2.1: Exact forward flow validation
      const testContent = testData.content.binaryContent;
      
      const result = await qInfinityDataFlow.processInput(testContent, testData.identity.userId);
      
      expect(result.status).toBe('success');
      expect(result.processingSteps).toBeDefined();
      
      // Verify exact flow sequence: data → Qompress → Qlock → Qindex → Qerberos → IPFS
      const stepNames = result.processingSteps.map(step => step.stepName);
      const expectedSequence = ['Qompress', 'Qlock', 'Qindex', 'Qerberos', 'IPFS'];
      
      expect(stepNames).toEqual(expectedSequence);
      
      // Verify each step processes data correctly
      for (let i = 0; i < result.processingSteps.length; i++) {
        const step = result.processingSteps[i];
        expect(step.status).toBe('success');
        expect(step.inputHash).toBeDefined();
        expect(step.outputHash).toBeDefined();
        
        // Verify data transformation occurred (except for indexing steps)
        if (!['Qindex'].includes(step.stepName)) {
          expect(step.inputHash).not.toBe(step.outputHash);
        }
      }
    });

    it('should follow exact reverse data flow pipeline', async () => {
      // Requirement 2.1: Exact reverse flow validation
      
      // First, store some data
      const originalContent = testData.content.textContent;
      const storeResult = await qInfinityDataFlow.processInput(originalContent, testData.identity.userId);
      
      expect(storeResult.status).toBe('success');
      expect(storeResult.contentId).toBeDefined();
      
      // Now retrieve it
      const retrieveResult = await qInfinityDataFlow.retrieveOutput(
        storeResult.contentId!, 
        testData.identity.userId
      );
      
      expect(retrieveResult.status).toBe('success');
      expect(retrieveResult.processingSteps).toBeDefined();
      
      // Verify exact reverse flow: IPFS → Qindex → Qerberos → Qlock → Qompress → user
      const stepNames = retrieveResult.processingSteps.map(step => step.stepName);
      const expectedSequence = ['IPFS', 'Qindex', 'Qerberos', 'Qlock', 'Qompress'];
      
      expect(stepNames).toEqual(expectedSequence);
      
      // Verify data integrity - retrieved content should match original
      expect(retrieveResult.outputData).toBe(originalContent);
    });

    it('should log and display transformation for validation at each step', async () => {
      // Requirement 2.1: Step-by-step transformation logging
      const testContent = testData.content.metadata;
      
      const result = await qInfinityDataFlow.processInput(
        JSON.stringify(testContent), 
        testData.identity.userId
      );
      
      expect(result.status).toBe('success');
      
      // Verify detailed logging for each step
      result.processingSteps.forEach((step, index) => {
        expect(step.stepName).toBeDefined();
        expect(step.startTime).toBeDefined();
        expect(step.endTime).toBeDefined();
        expect(step.duration).toBeGreaterThan(0);
        expect(step.inputSize).toBeGreaterThan(0);
        expect(step.outputSize).toBeGreaterThan(0);
        expect(step.inputHash).toBeDefined();
        expect(step.outputHash).toBeDefined();
        
        // Verify transformation details are logged
        expect(step.transformationDetails).toBeDefined();
        
        if (step.stepName === 'Qompress') {
          expect(step.transformationDetails.compressionRatio).toBeDefined();
        } else if (step.stepName === 'Qlock') {
          expect(step.transformationDetails.encryptionAlgorithm).toBeDefined();
        } else if (step.stepName === 'Qindex') {
          expect(step.transformationDetails.indexEntries).toBeDefined();
        } else if (step.stepName === 'Qerberos') {
          expect(step.transformationDetails.signatureHash).toBeDefined();
        } else if (step.stepName === 'IPFS') {
          expect(step.transformationDetails.ipfsHash).toBeDefined();
        }
      });
    });

    it('should verify data integrity at each checkpoint', async () => {
      // Requirement 2.1: Data integrity verification
      const testContent = testData.content.binaryContent;
      
      const result = await qInfinityDataFlow.processInput(testContent, testData.identity.userId);
      
      expect(result.status).toBe('success');
      expect(result.integrity).toBeDefined();
      expect(result.integrity.isValid).toBe(true);
      
      // Verify integrity checkpoints
      expect(result.integrity.checkpoints).toBeDefined();
      expect(result.integrity.checkpoints.length).toBe(result.processingSteps.length);
      
      result.integrity.checkpoints.forEach((checkpoint, index) => {
        expect(checkpoint.stepName).toBe(result.processingSteps[index].stepName);
        expect(checkpoint.integrityHash).toBeDefined();
        expect(checkpoint.isValid).toBe(true);
        expect(checkpoint.validationTime).toBeDefined();
      });
      
      // Verify overall integrity validation
      const integrityResult = await qInfinityDataFlow.validateIntegrity(result.contentId!);
      expect(integrityResult.isValid).toBe(true);
      expect(integrityResult.validationDetails).toBeDefined();
    });

    it('should halt processing and provide detailed error diagnostics on failure', async () => {
      // Requirement 2.1: Error handling and diagnostics
      
      // Create invalid data that should cause processing failure
      const invalidData = null;
      
      const result = await qInfinityDataFlow.processInput(invalidData as any, testData.identity.userId);
      
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBeDefined();
      expect(result.error?.code).toBeDefined();
      expect(result.error?.step).toBeDefined();
      
      // Verify detailed diagnostics
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics.failedStep).toBeDefined();
      expect(result.diagnostics.errorContext).toBeDefined();
      expect(result.diagnostics.suggestedResolution).toBeDefined();
      
      // Verify processing was halted at the correct step
      const completedSteps = result.processingSteps.filter(step => step.status === 'success');
      const failedStep = result.processingSteps.find(step => step.status === 'error');
      
      expect(failedStep).toBeDefined();
      expect(result.diagnostics.failedStep).toBe(failedStep?.stepName);
    });
  });

  describe('Pi Network Integration', () => {
    it('should support Pi Wallet authentication as primary method', async () => {
      // Requirement 4.1: Pi Wallet authentication
      const piUserId = testData.identity.piUserId;
      
      const authResult = await piNetworkIntegration.authenticateWithPiWallet(piUserId);
      
      expect(authResult).toBeDefined();
      expect(authResult.success).toBe(true);
      expect(authResult.authToken).toBeDefined();
      expect(authResult.walletAddress).toBeDefined();
      expect(authResult.expiresAt).toBeDefined();
      
      // Verify authentication token is valid
      expect(authResult.authToken.length).toBeGreaterThan(0);
      expect(authResult.walletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/); // Ethereum-style address
      expect(authResult.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should securely link Pi identity with sQuid integration', async () => {
      // Requirement 4.1: Secure Pi identity linking
      const piUserId = testData.identity.piUserId;
      const squidId = testData.identity.squidId;
      
      const linkResult = await piNetworkIntegration.linkPiIdentity(piUserId, squidId);
      
      expect(linkResult).toBeDefined();
      expect(linkResult.success).toBe(true);
      expect(linkResult.linkId).toBeDefined();
      expect(linkResult.piUserId).toBe(piUserId);
      expect(linkResult.squidId).toBe(squidId);
      expect(linkResult.linkHash).toBeDefined();
      
      // Verify secure linking with cryptographic proof
      expect(linkResult.cryptographicProof).toBeDefined();
      expect(linkResult.cryptographicProof.signature).toBeDefined();
      expect(linkResult.cryptographicProof.publicKey).toBeDefined();
      
      // Verify link can be validated
      const validationResult = await piNetworkIntegration.validateIdentityLink(linkResult.linkId);
      expect(validationResult.isValid).toBe(true);
    });

    it('should run smart contracts through Qflow with Pi Network compatibility', async () => {
      // Requirement 4.1: Smart contract execution
      const contractAddress = '0x1234567890123456789012345678901234567890';
      const method = 'vote';
      const params = [testData.dao.proposalId, 'approve'];
      
      const executionResult = await piNetworkIntegration.executeSmartContract(
        contractAddress,
        method,
        params
      );
      
      expect(executionResult).toBeDefined();
      expect(executionResult.success).toBe(true);
      expect(executionResult.transactionHash).toBeDefined();
      expect(executionResult.gasUsed).toBeGreaterThan(0);
      expect(executionResult.blockNumber).toBeGreaterThan(0);
      
      // Verify Qflow integration
      expect(executionResult.qflowWorkflowId).toBeDefined();
      expect(executionResult.qflowExecutionSteps).toBeDefined();
      expect(executionResult.qflowExecutionSteps.length).toBeGreaterThan(0);
      
      // Verify Pi Network compatibility
      expect(executionResult.piNetworkCompatible).toBe(true);
      expect(executionResult.piNetworkVersion).toBeDefined();
    });

    it('should process Pi transactions through integrated Qwallet system', async () => {
      // Requirement 4.1: Pi transaction processing
      const transaction = {
        from: testData.identity.piUserId,
        to: 'recipient-pi-user',
        amount: 10.5,
        currency: 'PI',
        memo: 'Integration test transaction'
      };
      
      const processResult = await piNetworkIntegration.processTransaction(transaction);
      
      expect(processResult).toBeDefined();
      expect(processResult.success).toBe(true);
      expect(processResult.transactionId).toBeDefined();
      expect(processResult.qwalletTransactionId).toBeDefined();
      expect(processResult.status).toBe('completed');
      
      // Verify Qwallet integration
      expect(processResult.qwalletIntegration).toBeDefined();
      expect(processResult.qwalletIntegration.walletId).toBeDefined();
      expect(processResult.qwalletIntegration.balanceAfter).toBeDefined();
      
      // Verify transaction audit trail
      expect(processResult.auditTrail).toBeDefined();
      expect(processResult.auditTrail.length).toBeGreaterThan(0);
      expect(processResult.auditTrail[0].action).toBe('transaction_initiated');
    });

    it('should provide alternative authentication methods when Pi Network is unavailable', async () => {
      // Requirement 4.1: Alternative authentication fallback
      
      // Simulate Pi Network unavailability
      vi.spyOn(piNetworkIntegration, 'isPiNetworkAvailable').mockResolvedValue(false);
      
      const authResult = await piNetworkIntegration.authenticateWithFallback(testData.identity.userId);
      
      expect(authResult).toBeDefined();
      expect(authResult.success).toBe(true);
      expect(authResult.method).not.toBe('pi_wallet');
      expect(authResult.fallbackMethod).toBeDefined();
      expect(authResult.message).toContain('Pi Network unavailable');
      
      // Verify alternative methods are available
      const availableMethods = await piNetworkIntegration.getAvailableAuthMethods();
      expect(availableMethods.length).toBeGreaterThan(1);
      expect(availableMethods).toContain('squid_identity');
      expect(availableMethods).toContain('qerberos_auth');
    });
  });

  describe('Comprehensive Authentication and Transaction Flows', () => {
    it('should execute complete identity flow with Pi integration', async () => {
      // Execute identity scenario with Pi Network integration
      const identityResult = await scenarioEngine.executeIdentityFlow({
        userId: testData.identity.userId,
        piUserId: testData.identity.piUserId,
        email: testData.identity.email,
        enablePiIntegration: true
      });
      
      expect(identityResult.status).toBe('success');
      expect(identityResult.duration).toBeGreaterThan(0);
      expect(identityResult.auditCid).toBeDefined();
      expect(identityResult.qerberosSignature).toBeDefined();
      
      // Verify Pi integration steps
      const piSteps = identityResult.moduleResults.filter(r => r.moduleId.includes('Pi'));
      expect(piSteps.length).toBeGreaterThan(0);
      
      piSteps.forEach(step => {
        expect(step.status).toBe('success');
        expect(step.duration).toBeGreaterThan(0);
      });
    });

    it('should execute complete content flow with Q∞ pipeline', async () => {
      // Execute content scenario with full Q∞ data flow
      const contentResult = await scenarioEngine.executeContentFlow({
        userId: testData.identity.userId,
        content: testData.content.textContent,
        metadata: testData.content.metadata,
        enableQInfinityFlow: true
      });
      
      expect(contentResult.status).toBe('success');
      expect(contentResult.duration).toBeGreaterThan(0);
      expect(contentResult.auditCid).toBeDefined();
      
      // Verify Q∞ pipeline execution
      const qInfinitySteps = contentResult.moduleResults.filter(r => 
        ['Qompress', 'Qlock', 'Qindex', 'Qerberos', 'IPFS'].includes(r.moduleId)
      );
      expect(qInfinitySteps.length).toBe(5);
      
      qInfinitySteps.forEach(step => {
        expect(step.status).toBe('success');
        expect(step.duration).toBeGreaterThan(0);
      });
    });

    it('should execute complete DAO governance flow with Pi contracts', async () => {
      // Execute DAO scenario with Pi Network smart contract integration
      const daoResult = await scenarioEngine.executeDaoFlow({
        userId: testData.identity.userId,
        proposalId: testData.dao.proposalId,
        title: testData.dao.title,
        description: testData.dao.description,
        enablePiContracts: true
      });
      
      expect(daoResult.status).toBe('success');
      expect(daoResult.duration).toBeGreaterThan(0);
      expect(daoResult.auditCid).toBeDefined();
      
      // Verify Pi contract integration
      const piContractSteps = daoResult.moduleResults.filter(r => 
        r.moduleId.includes('Pi') || r.moduleId === 'Qflow'
      );
      expect(piContractSteps.length).toBeGreaterThan(0);
      
      piContractSteps.forEach(step => {
        expect(step.status).toBe('success');
        expect(step.duration).toBeGreaterThan(0);
      });
    });

    it('should execute complete social governance flow', async () => {
      // Execute social scenario with governance integration
      const socialResult = await scenarioEngine.executeSocialFlow({
        userId: testData.identity.userId,
        postContent: testData.social.postContent,
        communityId: testData.social.communityId,
        governanceTopicId: testData.social.governanceTopicId,
        enableGovernanceIntegration: true
      });
      
      expect(socialResult.status).toBe('success');
      expect(socialResult.duration).toBeGreaterThan(0);
      expect(socialResult.auditCid).toBeDefined();
      
      // Verify social governance integration
      const socialSteps = socialResult.moduleResults.filter(r => 
        ['Qsocial', 'sQuid', 'Qonsent'].includes(r.moduleId)
      );
      expect(socialSteps.length).toBeGreaterThan(0);
      
      socialSteps.forEach(step => {
        expect(step.status).toBe('success');
        expect(step.duration).toBeGreaterThan(0);
      });
    });
  });

  describe('Real-World Data Scenarios', () => {
    it('should handle large binary files through Q∞ pipeline', async () => {
      // Test with large binary data
      const largeData = Buffer.alloc(1024 * 1024, 'test'); // 1MB test data
      
      const result = await qInfinityDataFlow.processInput(largeData, testData.identity.userId);
      
      expect(result.status).toBe('success');
      expect(result.processingSteps.length).toBe(5);
      
      // Verify compression effectiveness
      const compressStep = result.processingSteps.find(s => s.stepName === 'Qompress');
      expect(compressStep).toBeDefined();
      expect(compressStep!.outputSize).toBeLessThan(compressStep!.inputSize);
      
      // Verify retrieval works
      const retrieveResult = await qInfinityDataFlow.retrieveOutput(
        result.contentId!,
        testData.identity.userId
      );
      
      expect(retrieveResult.status).toBe('success');
      expect(Buffer.compare(retrieveResult.outputData, largeData)).toBe(0);
    });

    it('should handle complex JSON metadata through pipeline', async () => {
      // Test with complex structured data
      const complexMetadata = {
        document: {
          id: 'doc-001',
          title: 'Complex Test Document',
          authors: ['Author 1', 'Author 2'],
          sections: [
            { id: 1, title: 'Introduction', content: 'Lorem ipsum...' },
            { id: 2, title: 'Methods', content: 'Detailed methods...' }
          ],
          metadata: {
            created: new Date().toISOString(),
            version: '1.0.0',
            tags: ['research', 'test', 'integration'],
            permissions: {
              read: ['public'],
              write: ['author'],
              admin: ['owner']
            }
          }
        }
      };
      
      const result = await qInfinityDataFlow.processInput(
        JSON.stringify(complexMetadata),
        testData.identity.userId
      );
      
      expect(result.status).toBe('success');
      
      // Verify indexing captured structure
      const indexStep = result.processingSteps.find(s => s.stepName === 'Qindex');
      expect(indexStep).toBeDefined();
      expect(indexStep!.transformationDetails.indexEntries).toBeGreaterThan(0);
      
      // Verify retrieval preserves structure
      const retrieveResult = await qInfinityDataFlow.retrieveOutput(
        result.contentId!,
        testData.identity.userId
      );
      
      expect(retrieveResult.status).toBe('success');
      const retrievedData = JSON.parse(retrieveResult.outputData);
      expect(retrievedData).toEqual(complexMetadata);
    });

    it('should handle concurrent data processing requests', async () => {
      // Test concurrent processing
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
        content: `Concurrent test content ${i}`,
        userId: `${testData.identity.userId}-${i}`
      }));
      
      const results = await Promise.all(
        concurrentRequests.map(req => 
          qInfinityDataFlow.processInput(req.content, req.userId)
        )
      );
      
      // Verify all requests succeeded
      results.forEach((result, index) => {
        expect(result.status, `Request ${index} should succeed`).toBe('success');
        expect(result.contentId, `Request ${index} should have content ID`).toBeDefined();
      });
      
      // Verify unique content IDs
      const contentIds = results.map(r => r.contentId);
      const uniqueIds = new Set(contentIds);
      expect(uniqueIds.size).toBe(contentIds.length);
    });
  });
});