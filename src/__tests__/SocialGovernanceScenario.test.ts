import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ScenarioEngine } from '../services/ScenarioEngine.js';
import { SocialFlowParams } from '../interfaces/ScenarioEngine.js';
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

describe('Social Governance Scenario', () => {
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

  describe('executeSocialFlow', () => {
    it('should successfully execute complete social governance flow with all components', async () => {
      // Arrange
      const params: SocialFlowParams = {
        userId: 'social-test-user-123',
        communityId: 'community-governance-hub',
        governanceHub: true,
        squidSubIdentities: true,
        qonsentPolicies: true
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
          responseTime: 40
        })
        .mockResolvedValueOnce({
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 45
        })
        .mockResolvedValueOnce({
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 35
        });

      // Mock Qsocial community setup
      (mockModuleIntegration.callModuleMethod as Mock)
        .mockResolvedValueOnce({
          success: true,
          data: { hubId: 'hub-123', status: 'active' }
        })
        // Mock sQuid sub-identity creation (3 calls)
        .mockResolvedValueOnce({
          success: true,
          data: { subIdentityId: 'sub-id-moderator' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { subIdentityId: 'sub-id-contributor' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { subIdentityId: 'sub-id-observer' }
        })
        // Mock governance hub integration
        .mockResolvedValueOnce({
          success: true,
          data: { integrationId: 'integration-456' }
        })
        // Mock community proposal creation
        .mockResolvedValueOnce({
          success: true,
          data: { proposalId: 'community-proposal-789' }
        })
        // Mock Qonsent privacy policy implementation (3 calls)
        .mockResolvedValueOnce({
          success: true,
          data: { policyId: 'policy-data-sharing' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { policyId: 'policy-content-moderation' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { policyId: 'policy-governance-participation' }
        })
        // Mock reputation system update
        .mockResolvedValueOnce({
          success: true,
          data: { reputationId: 'rep-123', updated: true }
        });

      // Mock Q∞ data flow processing for social content
      (mockQInfinityDataFlow.processInput as Mock)
        .mockResolvedValueOnce({
          success: true,
          contentId: 'social-content-1',
          steps: [
            { name: 'compression', duration: 50, success: true },
            { name: 'encryption', duration: 75, success: true }
          ]
        })
        .mockResolvedValueOnce({
          success: true,
          contentId: 'social-content-2',
          steps: [
            { name: 'compression', duration: 100, success: true },
            { name: 'encryption', duration: 125, success: true }
          ]
        })
        .mockResolvedValueOnce({
          success: true,
          contentId: 'social-content-3',
          steps: [
            { name: 'compression', duration: 80, success: true },
            { name: 'encryption', duration: 90, success: true }
          ]
        });

      (mockQInfinityDataFlow.validateIntegrity as Mock).mockResolvedValue({
        isValid: true,
        score: 0.95,
        errors: []
      });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'audit-social-cid-123',
        signature: 'qerberos-social-signature-123',
        timestamp: new Date().toISOString()
      });

      // Act
      const result = await scenarioEngine.executeSocialFlow(params);

      // Assert
      expect(result.status).toBe('success');
      expect(result.scenarioId).toMatch(/^social-flow-\d+$/);
      expect(result.auditCid).toBe('audit-social-cid-123');
      expect(result.qerberosSignature).toBe('qerberos-social-signature-123');
      expect(result.moduleResults).toHaveLength(6); // Qsocial, sQuid, Governance, Qonsent, Q∞, Reputation
      
      // Verify Qsocial community setup
      const qsocialResult = result.moduleResults.find(r => r.moduleId === 'qsocial');
      expect(qsocialResult).toBeDefined();
      expect(qsocialResult?.status).toBe('active');
      expect(qsocialResult?.metrics?.hubId).toBe('hub-123');
      expect(qsocialResult?.metrics?.communityId).toBe('community-governance-hub');
      
      // Verify sQuid sub-identities
      const squidResult = result.moduleResults.find(r => r.moduleId === 'squid-sub-identities');
      expect(squidResult).toBeDefined();
      expect(squidResult?.status).toBe('active');
      expect(squidResult?.metrics?.subIdentitiesCreated).toBe(3);
      
      // Verify governance hub integration
      const governanceResult = result.moduleResults.find(r => r.moduleId === 'governance-hub');
      expect(governanceResult).toBeDefined();
      expect(governanceResult?.status).toBe('active');
      expect(governanceResult?.metrics?.integrationId).toBe('integration-456');
      expect(governanceResult?.metrics?.proposalCreated).toBe(true);

      // Verify Qonsent privacy policies
      const qonsentResult = result.moduleResults.find(r => r.moduleId === 'qonsent');
      expect(qonsentResult).toBeDefined();
      expect(qonsentResult?.status).toBe('active');
      expect(qonsentResult?.metrics?.policiesImplemented).toBe(3);
      expect(qonsentResult?.metrics?.consentRequiredPolicies).toBe(2);

      // Verify Q∞ social content validation
      const qInfinityResult = result.moduleResults.find(r => r.moduleId === 'qinfinity-social');
      expect(qInfinityResult).toBeDefined();
      expect(qInfinityResult?.status).toBe('active');
      expect(qInfinityResult?.metrics?.postsValidated).toBe(3);
      expect(qInfinityResult?.metrics?.averageIntegrityScore).toBeCloseTo(0.95, 2);

      // Verify reputation system integration
      const reputationResult = result.moduleResults.find(r => r.moduleId === 'reputation-system');
      expect(reputationResult).toBeDefined();
      expect(reputationResult?.status).toBe('active');
      expect(reputationResult?.metrics?.reputationScore).toBe(1.0); // All modules active = 70/70 = 1.0
      expect(reputationResult?.metrics?.achievements).toBe(6); // 5 base + 1 bonus

      // Verify all expected calls were made
      expect(mockModuleIntegration.checkModuleHealth).toHaveBeenCalledWith('qsocial');
      expect(mockModuleIntegration.checkModuleHealth).toHaveBeenCalledWith('squid');
      expect(mockModuleIntegration.checkModuleHealth).toHaveBeenCalledWith('dao');
      expect(mockModuleIntegration.checkModuleHealth).toHaveBeenCalledWith('qonsent');
      expect(mockModuleIntegration.callModuleMethod).toHaveBeenCalledWith(
        'qsocial',
        'setupCommunityHub',
        expect.objectContaining({ 
          userId: 'social-test-user-123',
          communityId: 'community-governance-hub',
          hubType: 'governance'
        })
      );
      expect(mockQInfinityDataFlow.processInput).toHaveBeenCalledTimes(3);
      expect(mockQerberosAuth.createAuditEntry).toHaveBeenCalled();
    });

    it('should handle Qsocial module failure gracefully', async () => {
      // Arrange
      const params: SocialFlowParams = {
        userId: 'test-user-123',
        communityId: 'test-community',
        governanceHub: false,
        squidSubIdentities: false,
        qonsentPolicies: false
      };

      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: 8000
      });

      // Act
      const result = await scenarioEngine.executeSocialFlow(params);

      // Assert
      expect(result.status).toBe('failure');
      expect(result.moduleResults).toHaveLength(1);
      
      const qsocialResult = result.moduleResults[0];
      expect(qsocialResult.moduleId).toBe('qsocial');
      expect(qsocialResult.status).toBe('error');
      expect(qsocialResult.error).toContain('Qsocial module is not healthy');
    });

    it('should handle sQuid sub-identities failure', async () => {
      // Arrange
      const params: SocialFlowParams = {
        userId: 'test-user-123',
        communityId: 'test-community',
        governanceHub: false,
        squidSubIdentities: true,
        qonsentPolicies: false
      };

      // Mock successful Qsocial setup
      (mockModuleIntegration.checkModuleHealth as Mock)
        .mockResolvedValueOnce({
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 50
        })
        .mockResolvedValueOnce({
          status: 'unhealthy',
          lastCheck: new Date(),
          responseTime: 9000
        });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { hubId: 'hub-456', status: 'active' }
      });

      // Act
      const result = await scenarioEngine.executeSocialFlow(params);

      // Assert
      expect(result.status).toBe('failure');
      expect(result.moduleResults).toHaveLength(2); // Qsocial success, sQuid failure
      
      const squidResult = result.moduleResults.find(r => r.moduleId === 'squid-sub-identities');
      expect(squidResult).toBeDefined();
      expect(squidResult?.status).toBe('error');
      expect(squidResult?.error).toContain('sQuid module is not healthy');
    });

    it('should handle governance hub integration failure', async () => {
      // Arrange
      const params: SocialFlowParams = {
        userId: 'test-user-123',
        communityId: 'test-community',
        governanceHub: true,
        squidSubIdentities: false,
        qonsentPolicies: false
      };

      // Mock successful Qsocial setup
      (mockModuleIntegration.checkModuleHealth as Mock)
        .mockResolvedValueOnce({
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 50
        })
        .mockResolvedValueOnce({
          status: 'unhealthy',
          lastCheck: new Date(),
          responseTime: 10000
        });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { hubId: 'hub-789', status: 'active' }
      });

      // Act
      const result = await scenarioEngine.executeSocialFlow(params);

      // Assert
      expect(result.status).toBe('failure');
      expect(result.moduleResults).toHaveLength(2); // Qsocial success, Governance failure
      
      const governanceResult = result.moduleResults.find(r => r.moduleId === 'governance-hub');
      expect(governanceResult).toBeDefined();
      expect(governanceResult?.status).toBe('error');
      expect(governanceResult?.error).toContain('DAO module is not healthy');
    });

    it('should handle Qonsent privacy policies failure', async () => {
      // Arrange
      const params: SocialFlowParams = {
        userId: 'test-user-123',
        communityId: 'test-community',
        governanceHub: false,
        squidSubIdentities: false,
        qonsentPolicies: true
      };

      // Mock successful Qsocial setup
      (mockModuleIntegration.checkModuleHealth as Mock)
        .mockResolvedValueOnce({
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 50
        })
        .mockResolvedValueOnce({
          status: 'unhealthy',
          lastCheck: new Date(),
          responseTime: 11000
        });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { hubId: 'hub-qonsent', status: 'active' }
      });

      // Act
      const result = await scenarioEngine.executeSocialFlow(params);

      // Assert
      expect(result.status).toBe('failure');
      expect(result.moduleResults).toHaveLength(2); // Qsocial success, Qonsent failure
      
      const qonsentResult = result.moduleResults.find(r => r.moduleId === 'qonsent');
      expect(qonsentResult).toBeDefined();
      expect(qonsentResult?.status).toBe('error');
      expect(qonsentResult?.error).toContain('Qonsent module is not healthy');
    });

    it('should meet performance requirements (≤2s latency)', async () => {
      // Arrange
      const params: SocialFlowParams = {
        userId: 'perf-test-user',
        communityId: 'perf-community',
        governanceHub: true,
        squidSubIdentities: true,
        qonsentPolicies: true
      };

      // Mock fast responses
      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 10
      });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { 
          hubId: 'perf-hub', 
          subIdentityId: 'perf-sub-id',
          integrationId: 'perf-integration',
          proposalId: 'perf-proposal',
          policyId: 'perf-policy',
          reputationId: 'perf-reputation'
        }
      });

      (mockQInfinityDataFlow.processInput as Mock).mockResolvedValue({
        success: true,
        contentId: 'perf-content',
        steps: [{ name: 'fast-processing', duration: 10, success: true }]
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
      const result = await scenarioEngine.executeSocialFlow(params);
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

    it('should validate Q∞ pipeline compliance for social posts', async () => {
      // Arrange
      const params: SocialFlowParams = {
        userId: 'qinfinity-test-user',
        communityId: 'qinfinity-community',
        governanceHub: false,
        squidSubIdentities: false,
        qonsentPolicies: false
      };

      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 50
      });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { hubId: 'qinfinity-hub', reputationId: 'qinfinity-rep' }
      });

      // Mock Q∞ processing for different content types
      (mockQInfinityDataFlow.processInput as Mock)
        .mockResolvedValueOnce({
          success: true,
          contentId: 'text-post-123',
          steps: [
            { name: 'compression', duration: 50, success: true },
            { name: 'encryption', duration: 75, success: true },
            { name: 'indexing', duration: 100, success: true }
          ]
        })
        .mockResolvedValueOnce({
          success: true,
          contentId: 'image-post-456',
          steps: [
            { name: 'compression', duration: 150, success: true },
            { name: 'encryption', duration: 200, success: true },
            { name: 'indexing', duration: 125, success: true }
          ]
        })
        .mockResolvedValueOnce({
          success: true,
          contentId: 'document-post-789',
          steps: [
            { name: 'compression', duration: 100, success: true },
            { name: 'encryption', duration: 150, success: true },
            { name: 'indexing', duration: 175, success: true }
          ]
        });

      (mockQInfinityDataFlow.validateIntegrity as Mock)
        .mockResolvedValueOnce({
          isValid: true,
          score: 0.98,
          errors: []
        })
        .mockResolvedValueOnce({
          isValid: true,
          score: 0.92,
          errors: []
        })
        .mockResolvedValueOnce({
          isValid: true,
          score: 0.95,
          errors: []
        });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'audit-qinfinity-cid',
        signature: 'qinfinity-signature',
        timestamp: new Date().toISOString()
      });

      // Act
      const result = await scenarioEngine.executeSocialFlow(params);

      // Assert
      expect(result.status).toBe('success');
      
      // Verify Q∞ social content validation
      const qInfinityResult = result.moduleResults.find(r => r.moduleId === 'qinfinity-social');
      expect(qInfinityResult).toBeDefined();
      expect(qInfinityResult?.status).toBe('active');
      expect(qInfinityResult?.metrics?.postsValidated).toBe(3);
      expect(qInfinityResult?.metrics?.averageIntegrityScore).toBeCloseTo(0.95, 2); // (0.98 + 0.92 + 0.95) / 3
      
      // Verify all content types were processed
      const posts = qInfinityResult?.metrics?.posts as any[];
      expect(posts).toHaveLength(3);
      expect(posts.map(p => p.postType)).toEqual(['text', 'image', 'document']);
      expect(posts.every(p => p.integrityValid)).toBe(true);
      
      // Verify Q∞ processing calls
      expect(mockQInfinityDataFlow.processInput).toHaveBeenCalledTimes(3);
      expect(mockQInfinityDataFlow.validateIntegrity).toHaveBeenCalledTimes(3);
    });

    it('should calculate reputation system correctly based on module participation', async () => {
      // Arrange
      const params: SocialFlowParams = {
        userId: 'reputation-test-user',
        communityId: 'reputation-community',
        governanceHub: true,
        squidSubIdentities: true,
        qonsentPolicies: true
      };

      // Mock all modules as healthy and successful
      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 50
      });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { 
          hubId: 'rep-hub',
          subIdentityId: 'rep-sub-id',
          integrationId: 'rep-integration',
          proposalId: 'rep-proposal',
          policyId: 'rep-policy',
          reputationId: 'rep-123'
        }
      });

      (mockQInfinityDataFlow.processInput as Mock).mockResolvedValue({
        success: true,
        contentId: 'rep-content',
        steps: [{ name: 'processing', duration: 50, success: true }]
      });

      (mockQInfinityDataFlow.validateIntegrity as Mock).mockResolvedValue({
        isValid: true,
        score: 1.0,
        errors: []
      });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'audit-rep-cid',
        signature: 'rep-signature',
        timestamp: new Date().toISOString()
      });

      // Act
      const result = await scenarioEngine.executeSocialFlow(params);

      // Assert
      expect(result.status).toBe('success');
      
      // Verify reputation system calculation
      const reputationResult = result.moduleResults.find(r => r.moduleId === 'reputation-system');
      expect(reputationResult).toBeDefined();
      expect(reputationResult?.status).toBe('active');
      
      // All modules active: 10 + 15 + 20 + 10 + 15 = 70 points out of 70 max = 1.0 score
      expect(reputationResult?.metrics?.reputationScore).toBe(1.0);
      expect(reputationResult?.metrics?.totalReputation).toBe(70);
      expect(reputationResult?.metrics?.maxReputation).toBe(70);
      expect(reputationResult?.metrics?.governanceWeight).toBe(1.0); // Min(1.0 * 2, 1.0) = 1.0
      expect(reputationResult?.metrics?.achievements).toBe(6); // 5 base achievements + 1 bonus
      expect(reputationResult?.metrics?.updateSuccessful).toBe(true);
    });

    it('should handle partial feature enablement correctly', async () => {
      // Arrange - Only governance hub enabled
      const params: SocialFlowParams = {
        userId: 'partial-test-user',
        communityId: 'partial-community',
        governanceHub: true,
        squidSubIdentities: false,
        qonsentPolicies: false
      };

      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 50
      });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { 
          hubId: 'partial-hub',
          integrationId: 'partial-integration',
          proposalId: 'partial-proposal',
          reputationId: 'partial-rep'
        }
      });

      (mockQInfinityDataFlow.processInput as Mock).mockResolvedValue({
        success: true,
        contentId: 'partial-content',
        steps: [{ name: 'processing', duration: 50, success: true }]
      });

      (mockQInfinityDataFlow.validateIntegrity as Mock).mockResolvedValue({
        isValid: true,
        score: 0.9,
        errors: []
      });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'audit-partial-cid',
        signature: 'partial-signature',
        timestamp: new Date().toISOString()
      });

      // Act
      const result = await scenarioEngine.executeSocialFlow(params);

      // Assert
      expect(result.status).toBe('success');
      expect(result.moduleResults).toHaveLength(4); // Qsocial, Governance, Q∞, Reputation
      
      // Verify only enabled features are present
      expect(result.moduleResults.find(r => r.moduleId === 'qsocial')).toBeDefined();
      expect(result.moduleResults.find(r => r.moduleId === 'governance-hub')).toBeDefined();
      expect(result.moduleResults.find(r => r.moduleId === 'qinfinity-social')).toBeDefined();
      expect(result.moduleResults.find(r => r.moduleId === 'reputation-system')).toBeDefined();
      
      // Verify disabled features are not present
      expect(result.moduleResults.find(r => r.moduleId === 'squid-sub-identities')).toBeUndefined();
      expect(result.moduleResults.find(r => r.moduleId === 'qonsent')).toBeUndefined();
      
      // Verify reputation calculation with partial features
      const reputationResult = result.moduleResults.find(r => r.moduleId === 'reputation-system');
      expect(reputationResult?.metrics?.reputationScore).toBeCloseTo(0.64, 2); // (10 + 20 + 15) / 70 = 45/70 ≈ 0.64
    });
  });

  describe('validateScenarioParams for social flow', () => {
    it('should validate valid social flow parameters', () => {
      // Arrange
      const params: SocialFlowParams = {
        userId: 'test-user',
        communityId: 'test-community',
        governanceHub: true,
        squidSubIdentities: true,
        qonsentPolicies: true
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('social', params);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject parameters without user ID', () => {
      // Arrange
      const params: SocialFlowParams = {
        userId: '',
        communityId: 'test-community',
        governanceHub: true,
        squidSubIdentities: true,
        qonsentPolicies: true
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('social', params);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID is required for social governance flow');
    });

    it('should reject parameters without community ID', () => {
      // Arrange
      const params: SocialFlowParams = {
        userId: 'test-user',
        communityId: '',
        governanceHub: true,
        squidSubIdentities: true,
        qonsentPolicies: true
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('social', params);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Community ID is required for social governance flow');
    });

    it('should warn when no advanced features are enabled', () => {
      // Arrange
      const params: SocialFlowParams = {
        userId: 'test-user',
        communityId: 'test-community',
        governanceHub: false,
        squidSubIdentities: false,
        qonsentPolicies: false
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('social', params);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('No advanced social features enabled - flow will use basic Qsocial functionality only');
    });

    it('should warn about governance hub without sub-identities', () => {
      // Arrange
      const params: SocialFlowParams = {
        userId: 'test-user',
        communityId: 'test-community',
        governanceHub: true,
        squidSubIdentities: false,
        qonsentPolicies: true
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('social', params);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Governance hub works best with sQuid sub-identities for role-based participation');
    });

    it('should warn about privacy policies without governance hub', () => {
      // Arrange
      const params: SocialFlowParams = {
        userId: 'test-user',
        communityId: 'test-community',
        governanceHub: false,
        squidSubIdentities: true,
        qonsentPolicies: true
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('social', params);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Privacy policies are most effective when combined with governance hub features');
    });
  });
});