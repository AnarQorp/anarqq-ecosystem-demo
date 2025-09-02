import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ScenarioEngine } from '../services/ScenarioEngine.js';
import { IdentityFlowParams } from '../interfaces/ScenarioEngine.js';
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

describe('Identity Flow Scenario', () => {
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

  describe('executeIdentityFlow', () => {
    it('should successfully execute complete identity flow with all components', async () => {
      // Arrange
      const params: IdentityFlowParams = {
        userId: 'test-user-123',
        piWalletEnabled: true,
        squidRegistration: true,
        qerberosValidation: true
      };

      // Mock successful responses
      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 50
      });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { userId: 'test-user-123', registrationId: 'reg-123' }
      });

      (mockPiNetworkIntegration.authenticateWithPiWallet as Mock).mockResolvedValue({
        success: true,
        token: 'pi-token-123',
        walletAddress: '0x123...abc',
        expiresAt: new Date(Date.now() + 3600000)
      });

      (mockPiNetworkIntegration.linkPiIdentity as Mock).mockResolvedValue({
        success: true,
        linkId: 'link-123',
        squidId: 'squid-test-user-123'
      });

      (mockQerberosAuth.authenticate as Mock).mockResolvedValue({
        success: true,
        token: 'qerberos-token-123',
        expiresAt: new Date(Date.now() + 3600000)
      });

      (mockQerberosAuth.authorize as Mock).mockResolvedValue({
        authorized: true,
        permissions: ['identity:verify']
      });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'audit-cid-123',
        signature: 'qerberos-signature-123',
        timestamp: new Date().toISOString()
      });

      // Act
      const result = await scenarioEngine.executeIdentityFlow(params);

      // Assert
      expect(result.status).toBe('success');
      expect(result.scenarioId).toMatch(/^identity-flow-\d+$/);
      expect(result.auditCid).toBe('audit-cid-123');
      expect(result.qerberosSignature).toBe('qerberos-signature-123');
      expect(result.moduleResults).toHaveLength(3);
      
      // Verify sQuid registration
      const squidResult = result.moduleResults.find(r => r.moduleId === 'squid');
      expect(squidResult).toBeDefined();
      expect(squidResult?.status).toBe('active');
      expect(squidResult?.metrics?.userId).toBe('test-user-123');
      
      // Verify Pi Wallet authentication
      const piWalletResult = result.moduleResults.find(r => r.moduleId === 'pi-wallet');
      expect(piWalletResult).toBeDefined();
      expect(piWalletResult?.status).toBe('active');
      expect(piWalletResult?.metrics?.walletAddress).toBe('0x123...abc');
      
      // Verify Qerberos verification
      const qerberosResult = result.moduleResults.find(r => r.moduleId === 'qerberos');
      expect(qerberosResult).toBeDefined();
      expect(qerberosResult?.status).toBe('active');
      expect(qerberosResult?.metrics?.authToken).toBe('qerberos-token-123');

      // Verify all expected calls were made
      expect(mockModuleIntegration.checkModuleHealth).toHaveBeenCalledWith('squid');
      expect(mockModuleIntegration.callModuleMethod).toHaveBeenCalledWith(
        'squid',
        'register',
        expect.objectContaining({ userId: 'test-user-123' })
      );
      expect(mockPiNetworkIntegration.authenticateWithPiWallet).toHaveBeenCalledWith('test-user-123');
      expect(mockPiNetworkIntegration.linkPiIdentity).toHaveBeenCalledWith('test-user-123', 'squid-test-user-123');
      expect(mockQerberosAuth.authenticate).toHaveBeenCalled();
      expect(mockQerberosAuth.authorize).toHaveBeenCalledWith('test-user-123', 'identity', 'verify');
      expect(mockQerberosAuth.createAuditEntry).toHaveBeenCalled();
    });

    it('should handle sQuid registration failure gracefully', async () => {
      // Arrange
      const params: IdentityFlowParams = {
        userId: 'test-user-123',
        piWalletEnabled: false,
        squidRegistration: true,
        qerberosValidation: false
      };

      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: 5000
      });

      // Act
      const result = await scenarioEngine.executeIdentityFlow(params);

      // Assert
      expect(result.status).toBe('failure');
      expect(result.moduleResults).toHaveLength(1);
      
      const squidResult = result.moduleResults[0];
      expect(squidResult.moduleId).toBe('squid');
      expect(squidResult.status).toBe('error');
      expect(squidResult.error).toContain('sQuid module is not healthy');
    });

    it('should handle Pi Wallet authentication failure', async () => {
      // Arrange
      const params: IdentityFlowParams = {
        userId: 'test-user-123',
        piWalletEnabled: true,
        squidRegistration: false,
        qerberosValidation: false
      };

      (mockPiNetworkIntegration.authenticateWithPiWallet as Mock).mockResolvedValue({
        success: false,
        error: 'Pi Wallet connection failed'
      });

      // Act
      const result = await scenarioEngine.executeIdentityFlow(params);

      // Assert
      expect(result.status).toBe('failure');
      expect(result.moduleResults).toHaveLength(1);
      
      const piWalletResult = result.moduleResults[0];
      expect(piWalletResult.moduleId).toBe('pi-wallet');
      expect(piWalletResult.status).toBe('error');
      expect(piWalletResult.error).toContain('Pi Wallet authentication failed');
    });

    it('should handle Qerberos verification failure', async () => {
      // Arrange
      const params: IdentityFlowParams = {
        userId: 'test-user-123',
        piWalletEnabled: false,
        squidRegistration: false,
        qerberosValidation: true
      };

      (mockQerberosAuth.authenticate as Mock).mockResolvedValue({
        success: false,
        error: 'Authentication token expired'
      });

      // Act
      const result = await scenarioEngine.executeIdentityFlow(params);

      // Assert
      expect(result.status).toBe('failure');
      expect(result.moduleResults).toHaveLength(1);
      
      const qerberosResult = result.moduleResults[0];
      expect(qerberosResult.moduleId).toBe('qerberos');
      expect(qerberosResult.status).toBe('error');
      expect(qerberosResult.error).toContain('Qerberos authentication failed');
    });

    it('should generate user ID when not provided', async () => {
      // Arrange
      const params: IdentityFlowParams = {
        piWalletEnabled: false,
        squidRegistration: true,
        qerberosValidation: false
      };

      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 50
      });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { registrationId: 'reg-123' }
      });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'audit-cid-123',
        signature: 'qerberos-signature-123',
        timestamp: new Date().toISOString()
      });

      // Act
      const result = await scenarioEngine.executeIdentityFlow(params);

      // Assert
      expect(result.status).toBe('success');
      expect(result.moduleResults).toHaveLength(1);
      
      const squidResult = result.moduleResults[0];
      expect(squidResult.metrics?.userId).toMatch(/^user-\d+$/);
    });

    it('should meet performance requirements (≤2s latency)', async () => {
      // Arrange
      const params: IdentityFlowParams = {
        userId: 'perf-test-user',
        piWalletEnabled: true,
        squidRegistration: true,
        qerberosValidation: true
      };

      // Mock fast responses
      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 10
      });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { userId: 'perf-test-user', registrationId: 'reg-perf' }
      });

      (mockPiNetworkIntegration.authenticateWithPiWallet as Mock).mockResolvedValue({
        success: true,
        token: 'pi-token-perf',
        walletAddress: '0xperf...test',
        expiresAt: new Date(Date.now() + 3600000)
      });

      (mockPiNetworkIntegration.linkPiIdentity as Mock).mockResolvedValue({
        success: true,
        linkId: 'link-perf',
        squidId: 'squid-perf-test-user'
      });

      (mockQerberosAuth.authenticate as Mock).mockResolvedValue({
        success: true,
        token: 'qerberos-token-perf',
        expiresAt: new Date(Date.now() + 3600000)
      });

      (mockQerberosAuth.authorize as Mock).mockResolvedValue({
        authorized: true,
        permissions: ['identity:verify']
      });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'audit-cid-perf',
        signature: 'qerberos-signature-perf',
        timestamp: new Date().toISOString()
      });

      // Act
      const startTime = Date.now();
      const result = await scenarioEngine.executeIdentityFlow(params);
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

    it('should validate audit trail generation', async () => {
      // Arrange
      const params: IdentityFlowParams = {
        userId: 'audit-test-user',
        piWalletEnabled: true,
        squidRegistration: true,
        qerberosValidation: true
      };

      // Mock successful responses
      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 50
      });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { userId: 'audit-test-user', registrationId: 'reg-audit' }
      });

      (mockPiNetworkIntegration.authenticateWithPiWallet as Mock).mockResolvedValue({
        success: true,
        token: 'pi-token-audit',
        walletAddress: '0xaudit...test',
        expiresAt: new Date(Date.now() + 3600000)
      });

      (mockPiNetworkIntegration.linkPiIdentity as Mock).mockResolvedValue({
        success: true,
        linkId: 'link-audit',
        squidId: 'squid-audit-test-user'
      });

      (mockQerberosAuth.authenticate as Mock).mockResolvedValue({
        success: true,
        token: 'qerberos-token-audit',
        expiresAt: new Date(Date.now() + 3600000)
      });

      (mockQerberosAuth.authorize as Mock).mockResolvedValue({
        authorized: true,
        permissions: ['identity:verify']
      });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'QmAuditCID123456789',
        signature: 'qerberos-audit-signature-123',
        timestamp: new Date().toISOString()
      });

      // Act
      const result = await scenarioEngine.executeIdentityFlow(params);

      // Assert
      expect(result.status).toBe('success');
      expect(result.auditCid).toBe('QmAuditCID123456789');
      expect(result.qerberosSignature).toBe('qerberos-audit-signature-123');
      
      // Verify audit entry creation was called with correct parameters
      expect(mockQerberosAuth.createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'identity-flow-execution',
          userId: 'system',
          data: expect.objectContaining({
            scenarioId: result.scenarioId,
            moduleResults: expect.any(Array),
            integrity: expect.objectContaining({
              checksum: expect.any(String),
              version: '1.0'
            })
          }),
          metadata: expect.objectContaining({
            scenarioType: 'identity',
            moduleCount: 3
          })
        })
      );
    });
  });

  describe('validateScenarioParams', () => {
    it('should validate valid identity flow parameters', () => {
      // Arrange
      const params: IdentityFlowParams = {
        userId: 'test-user',
        piWalletEnabled: true,
        squidRegistration: true,
        qerberosValidation: true
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('identity', params);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject parameters with no verification methods enabled', () => {
      // Arrange
      const params: IdentityFlowParams = {
        piWalletEnabled: false,
        squidRegistration: false,
        qerberosValidation: false
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('identity', params);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one identity verification method must be enabled');
    });

    it('should warn when Pi Wallet is enabled without sQuid registration', () => {
      // Arrange
      const params: IdentityFlowParams = {
        piWalletEnabled: true,
        squidRegistration: false,
        qerberosValidation: true
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('identity', params);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Pi Wallet authentication works best with sQuid registration enabled');
    });

    it('should reject unknown scenario types', () => {
      // Act
      const result = scenarioEngine.validateScenarioParams('unknown', {});

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unknown scenario type: unknown');
    });
  });

  describe('getAvailableScenarios', () => {
    it('should return all available scenarios with metadata', () => {
      // Act
      const scenarios = scenarioEngine.getAvailableScenarios();

      // Assert
      expect(scenarios).toHaveLength(4);
      
      const identityScenario = scenarios.find(s => s.type === 'identity');
      expect(identityScenario).toBeDefined();
      expect(identityScenario?.name).toBe('Identity Flow');
      expect(identityScenario?.requiredModules).toContain('squid');
      expect(identityScenario?.requiredModules).toContain('pi-wallet');
      expect(identityScenario?.requiredModules).toContain('qerberos');
      expect(identityScenario?.estimatedDuration).toBe(5000);
    });
  });
});