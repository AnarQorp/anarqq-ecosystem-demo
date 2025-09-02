import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ScenarioEngine } from '../services/ScenarioEngine.js';
import { ContentFlowParams } from '../interfaces/ScenarioEngine.js';
import { IPiNetworkIntegration } from '../interfaces/PiNetworkIntegration.js';
import { IQInfinityDataFlow } from '../interfaces/QInfinityDataFlow.js';
import { IModuleIntegration } from '../interfaces/ModuleIntegration.js';
import { IQerberosAuth } from '../interfaces/ModuleCommunication.js';

// Mock implementations
const mockPiNetworkIntegration: IPiNetworkIntegration = {
  authenticateWithPiWallet: vi.fn(),
  linkPiIdentity: vi.fn(),
  executeSmartContract: vi.fn(),
  processTransaction: vi.fn(),
  executeDaoGovernanceVote: vi.fn(),
  validatePiContractGovernance: vi.fn()
};

const mockQInfinityDataFlow: IQInfinityDataFlow = {
  processInput: vi.fn(),
  retrieveOutput: vi.fn(),
  validateIntegrity: vi.fn(),
  getFlowMetrics: vi.fn()
};

const mockModuleIntegration: IModuleIntegration = {
  registerModule: vi.fn(),
  discoverModules: vi.fn(),
  checkModuleHealth: vi.fn(),
  callModuleMethod: vi.fn(),
  recoverModule: vi.fn(),
  getModuleInfo: vi.fn(),
  getAllModules: vi.fn(),
  getModuleMetrics: vi.fn(),
  validateDependencies: vi.fn()
};

const mockQerberosAuth: IQerberosAuth = {
  authenticate: vi.fn(),
  authorize: vi.fn(),
  createAuditEntry: vi.fn(),
  validateSignature: vi.fn(),
  refreshToken: vi.fn(),
  revokeToken: vi.fn()
};

describe('Content Flow Scenario', () => {
  let scenarioEngine: ScenarioEngine;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    scenarioEngine = new ScenarioEngine(
      mockPiNetworkIntegration,
      mockQInfinityDataFlow,
      mockModuleIntegration,
      mockQerberosAuth
    );
  });

  describe('executeContentFlow', () => {
    it('should successfully execute complete content flow with all components', async () => {
      // Arrange
      const params: ContentFlowParams = {
        userId: 'test-user-123',
        contentType: 'text',
        contentSize: 1024,
        enableQInfinityFlow: true,
        ipfsStorage: true
      };

      // Mock successful responses
      (mockModuleIntegration.checkModuleHealth as Mock)
        .mockResolvedValueOnce({
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 50
        })
        .mockResolvedValueOnce({
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 30
        });

      (mockModuleIntegration.callModuleMethod as Mock)
        .mockResolvedValueOnce({
          success: true,
          data: { contentId: 'content-123', uploadSize: 1024 }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { cid: 'QmTestCID123456789' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { content: 'retrieved content', verified: true }
        });

      (mockQInfinityDataFlow.processInput as Mock).mockResolvedValue({
        success: true,
        steps: [
          { name: 'compression', duration: 100, success: true },
          { name: 'encryption', duration: 150, success: true },
          { name: 'indexing', duration: 200, success: true }
        ],
        outputCid: 'QmProcessedCID123'
      });

      (mockQInfinityDataFlow.validateIntegrity as Mock).mockResolvedValue({
        isValid: true,
        score: 1.0,
        errors: []
      });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'audit-content-cid-123',
        signature: 'qerberos-content-signature-123',
        timestamp: new Date().toISOString()
      });

      // Act
      const result = await scenarioEngine.executeContentFlow(params);

      // Assert
      expect(result.status).toBe('success');
      expect(result.scenarioId).toMatch(/^content-flow-\d+$/);
      expect(result.auditCid).toBe('audit-content-cid-123');
      expect(result.qerberosSignature).toBe('qerberos-content-signature-123');
      expect(result.moduleResults).toHaveLength(4); // Qdrive, Q∞, IPFS, Integrity
      
      // Verify Qdrive upload
      const qdriveResult = result.moduleResults.find(r => r.moduleId === 'qdrive');
      expect(qdriveResult).toBeDefined();
      expect(qdriveResult?.status).toBe('active');
      expect(qdriveResult?.metrics?.contentId).toBe('content-123');
      expect(qdriveResult?.metrics?.contentSize).toBe(1024);
      expect(qdriveResult?.metrics?.contentType).toBe('text');
      
      // Verify Q∞ processing
      const qInfinityResult = result.moduleResults.find(r => r.moduleId === 'qinfinity');
      expect(qInfinityResult).toBeDefined();
      expect(qInfinityResult?.status).toBe('active');
      expect(qInfinityResult?.metrics?.pipelineSteps).toBe(3);
      expect(qInfinityResult?.metrics?.integrityScore).toBe(1.0);
      
      // Verify IPFS storage
      const ipfsResult = result.moduleResults.find(r => r.moduleId === 'ipfs');
      expect(ipfsResult).toBeDefined();
      expect(ipfsResult?.status).toBe('active');
      expect(ipfsResult?.metrics?.ipfsCid).toBe('QmTestCID123456789');
      expect(ipfsResult?.metrics?.retrievalVerified).toBe(true);

      // Verify integrity validation
      const integrityResult = result.moduleResults.find(r => r.moduleId === 'integrity-validator');
      expect(integrityResult).toBeDefined();
      expect(integrityResult?.status).toBe('active');
      expect(integrityResult?.metrics?.integrityScore).toBe(1.0);

      // Verify all expected calls were made
      expect(mockModuleIntegration.checkModuleHealth).toHaveBeenCalledWith('qdrive');
      expect(mockModuleIntegration.checkModuleHealth).toHaveBeenCalledWith('ipfs');
      expect(mockModuleIntegration.callModuleMethod).toHaveBeenCalledWith(
        'qdrive',
        'upload',
        expect.objectContaining({ userId: 'test-user-123', contentType: 'text' })
      );
      expect(mockQInfinityDataFlow.processInput).toHaveBeenCalled();
      expect(mockQInfinityDataFlow.validateIntegrity).toHaveBeenCalled();
      expect(mockQerberosAuth.createAuditEntry).toHaveBeenCalled();
    });

    it('should handle Qdrive upload failure gracefully', async () => {
      // Arrange
      const params: ContentFlowParams = {
        userId: 'test-user-123',
        contentType: 'text',
        contentSize: 1024,
        enableQInfinityFlow: false,
        ipfsStorage: false
      };

      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: 5000
      });

      // Act
      const result = await scenarioEngine.executeContentFlow(params);

      // Assert
      expect(result.status).toBe('failure');
      expect(result.moduleResults).toHaveLength(1);
      
      const qdriveResult = result.moduleResults[0];
      expect(qdriveResult.moduleId).toBe('qdrive');
      expect(qdriveResult.status).toBe('error');
      expect(qdriveResult.error).toContain('Qdrive module is not healthy');
    });

    it('should handle Q∞ processing failure', async () => {
      // Arrange
      const params: ContentFlowParams = {
        userId: 'test-user-123',
        contentType: 'image',
        contentSize: 2048,
        enableQInfinityFlow: true,
        ipfsStorage: false
      };

      // Mock successful Qdrive upload
      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 50
      });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { contentId: 'content-456', uploadSize: 2048 }
      });

      // Mock Q∞ processing failure
      (mockQInfinityDataFlow.processInput as Mock).mockResolvedValue({
        success: false,
        error: 'Pipeline compression step failed'
      });

      // Act
      const result = await scenarioEngine.executeContentFlow(params);

      // Assert
      expect(result.status).toBe('failure');
      expect(result.moduleResults).toHaveLength(2); // Qdrive success, Q∞ failure
      
      const qInfinityResult = result.moduleResults.find(r => r.moduleId === 'qinfinity');
      expect(qInfinityResult).toBeDefined();
      expect(qInfinityResult?.status).toBe('error');
      expect(qInfinityResult?.error).toContain('Q∞ processing failed');
    });

    it('should handle IPFS storage failure', async () => {
      // Arrange
      const params: ContentFlowParams = {
        userId: 'test-user-123',
        contentType: 'document',
        contentSize: 4096,
        enableQInfinityFlow: false,
        ipfsStorage: true
      };

      // Mock successful Qdrive upload
      (mockModuleIntegration.checkModuleHealth as Mock)
        .mockResolvedValueOnce({
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 50
        })
        .mockResolvedValueOnce({
          status: 'unhealthy',
          lastCheck: new Date(),
          responseTime: 8000
        });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { contentId: 'content-789', uploadSize: 4096 }
      });

      // Act
      const result = await scenarioEngine.executeContentFlow(params);

      // Assert
      expect(result.status).toBe('failure');
      expect(result.moduleResults).toHaveLength(2); // Qdrive success, IPFS failure
      
      const ipfsResult = result.moduleResults.find(r => r.moduleId === 'ipfs');
      expect(ipfsResult).toBeDefined();
      expect(ipfsResult?.status).toBe('error');
      expect(ipfsResult?.error).toContain('IPFS module is not healthy');
    });

    it('should handle different content types correctly', async () => {
      // Test text content
      const textParams: ContentFlowParams = {
        userId: 'test-user-text',
        contentType: 'text',
        contentSize: 500,
        enableQInfinityFlow: false,
        ipfsStorage: false
      };

      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 50
      });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { contentId: 'text-content-123', uploadSize: 500 }
      });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'audit-text-cid',
        signature: 'text-signature',
        timestamp: new Date().toISOString()
      });

      const textResult = await scenarioEngine.executeContentFlow(textParams);
      
      expect(textResult.status).toBe('success');
      expect(mockModuleIntegration.callModuleMethod).toHaveBeenCalledWith(
        'qdrive',
        'upload',
        expect.objectContaining({
          contentType: 'text',
          content: expect.stringContaining('Lorem ipsum')
        })
      );
    });

    it('should meet performance requirements (≤2s latency)', async () => {
      // Arrange
      const params: ContentFlowParams = {
        userId: 'perf-test-user',
        contentType: 'text',
        contentSize: 512,
        enableQInfinityFlow: true,
        ipfsStorage: true
      };

      // Mock fast responses
      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 10
      });

      (mockModuleIntegration.callModuleMethod as Mock)
        .mockResolvedValueOnce({
          success: true,
          data: { contentId: 'perf-content-123', uploadSize: 512 }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { cid: 'QmPerfCID123' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { content: 'retrieved', verified: true }
        });

      (mockQInfinityDataFlow.processInput as Mock).mockResolvedValue({
        success: true,
        steps: [{ name: 'fast-processing', duration: 50, success: true }],
        outputCid: 'QmFastProcessed'
      });

      (mockQInfinityDataFlow.validateIntegrity as Mock).mockResolvedValue({
        isValid: true,
        score: 1.0,
        errors: []
      });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'audit-perf-cid',
        signature: 'perf-signature',
        timestamp: new Date().toISOString()
      });

      // Act
      const startTime = Date.now();
      const result = await scenarioEngine.executeContentFlow(params);
      const totalTime = Date.now() - startTime;

      // Assert
      expect(result.status).toBe('success');
      expect(totalTime).toBeLessThan(2000); // Must be under 2 seconds
      expect(result.duration).toBeLessThan(2000);
      
      // Verify individual module performance
      result.moduleResults.forEach(moduleResult => {
        expect(moduleResult.duration).toBeLessThan(1000); // Each module should be under 1 second
      });
    });

    it('should validate content integrity across all processing steps', async () => {
      // Arrange
      const params: ContentFlowParams = {
        userId: 'integrity-test-user',
        contentType: 'document',
        contentSize: 1024,
        enableQInfinityFlow: true,
        ipfsStorage: true
      };

      // Mock successful responses
      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 50
      });

      (mockModuleIntegration.callModuleMethod as Mock)
        .mockResolvedValueOnce({
          success: true,
          data: { contentId: 'integrity-content-123', uploadSize: 1024 }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { cid: 'QmIntegrityCID123' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { content: 'verified content', verified: true }
        });

      (mockQInfinityDataFlow.processInput as Mock).mockResolvedValue({
        success: true,
        steps: [
          { name: 'compression', duration: 100, success: true },
          { name: 'encryption', duration: 150, success: true }
        ],
        outputCid: 'QmIntegrityProcessed'
      });

      (mockQInfinityDataFlow.validateIntegrity as Mock).mockResolvedValue({
        isValid: true,
        score: 0.95,
        errors: []
      });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'QmIntegrityAuditCID',
        signature: 'integrity-audit-signature',
        timestamp: new Date().toISOString()
      });

      // Act
      const result = await scenarioEngine.executeContentFlow(params);

      // Assert
      expect(result.status).toBe('success');
      expect(result.auditCid).toBe('QmIntegrityAuditCID');
      
      // Verify integrity validation results
      const integrityResult = result.moduleResults.find(r => r.moduleId === 'integrity-validator');
      expect(integrityResult).toBeDefined();
      expect(integrityResult?.metrics?.integrityScore).toBe(1.0); // All 3 modules passed
      expect(integrityResult?.metrics?.checksTotal).toBe(3);
      expect(integrityResult?.metrics?.checksPassed).toBe(3);
      
      // Verify audit entry creation with integrity data
      expect(mockQerberosAuth.createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'identity-flow-execution',
          data: expect.objectContaining({
            scenarioId: result.scenarioId,
            moduleResults: expect.arrayContaining([
              expect.objectContaining({ moduleId: 'integrity-validator' })
            ])
          })
        })
      );
    });

    it('should handle various file sizes correctly', async () => {
      // Test small file
      const smallParams: ContentFlowParams = {
        userId: 'size-test-user',
        contentType: 'text',
        contentSize: 100,
        enableQInfinityFlow: false,
        ipfsStorage: false
      };

      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 50
      });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { contentId: 'small-content-123', uploadSize: 100 }
      });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'audit-small-cid',
        signature: 'small-signature',
        timestamp: new Date().toISOString()
      });

      const smallResult = await scenarioEngine.executeContentFlow(smallParams);
      
      expect(smallResult.status).toBe('success');
      expect(mockModuleIntegration.callModuleMethod).toHaveBeenCalledWith(
        'qdrive',
        'upload',
        expect.objectContaining({
          contentSize: 100,
          content: expect.any(String)
        })
      );
    });
  });

  describe('validateScenarioParams for content flow', () => {
    it('should validate valid content flow parameters', () => {
      // Arrange
      const params: ContentFlowParams = {
        userId: 'test-user',
        contentType: 'text',
        contentSize: 1024,
        enableQInfinityFlow: true,
        ipfsStorage: true
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('content', params);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject parameters without user ID', () => {
      // Arrange
      const params: ContentFlowParams = {
        userId: '',
        contentType: 'text',
        contentSize: 1024,
        enableQInfinityFlow: true,
        ipfsStorage: true
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('content', params);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID is required for content flow');
    });

    it('should reject invalid content types', () => {
      // Arrange
      const params: ContentFlowParams = {
        userId: 'test-user',
        contentType: 'invalid' as any,
        contentSize: 1024,
        enableQInfinityFlow: true,
        ipfsStorage: true
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('content', params);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content type must be one of: text, image, document');
    });

    it('should reject zero or negative content size', () => {
      // Arrange
      const params: ContentFlowParams = {
        userId: 'test-user',
        contentType: 'text',
        contentSize: 0,
        enableQInfinityFlow: true,
        ipfsStorage: true
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('content', params);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content size must be greater than 0');
    });

    it('should warn about large content size', () => {
      // Arrange
      const params: ContentFlowParams = {
        userId: 'test-user',
        contentType: 'text',
        contentSize: 15 * 1024 * 1024, // 15MB
        enableQInfinityFlow: true,
        ipfsStorage: true
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('content', params);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Large content size may impact performance');
    });

    it('should warn when no processing options are enabled', () => {
      // Arrange
      const params: ContentFlowParams = {
        userId: 'test-user',
        contentType: 'text',
        contentSize: 1024,
        enableQInfinityFlow: false,
        ipfsStorage: false
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('content', params);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Neither Q∞ processing nor IPFS storage is enabled - content will only be uploaded to Qdrive');
    });
  });
});