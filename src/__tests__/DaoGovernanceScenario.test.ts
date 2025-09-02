import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ScenarioEngine } from '../services/ScenarioEngine.js';
import { DaoFlowParams } from '../interfaces/ScenarioEngine.js';
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

describe('DAO Governance Scenario', () => {
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

  describe('executeDaoFlow', () => {
    it('should successfully execute complete DAO governance flow with all components', async () => {
      // Arrange
      const params: DaoFlowParams = {
        userId: 'dao-test-user-123',
        proposalType: 'governance',
        piNetworkIntegration: true,
        qflowExecution: true
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
        });

      // Mock DAO proposal creation
      (mockModuleIntegration.callModuleMethod as Mock)
        .mockResolvedValueOnce({
          success: true,
          data: { proposalId: 'proposal-123', status: 'created' }
        })
        // Mock Qflow workflow execution
        .mockResolvedValueOnce({
          success: true,
          data: { workflowId: 'workflow-456', stepsCompleted: 3 }
        })
        // Mock voting submissions (5 votes)
        .mockResolvedValueOnce({
          success: true,
          data: { voteId: 'vote-1' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { voteId: 'vote-2' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { voteId: 'vote-3' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { voteId: 'vote-4' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { voteId: 'vote-5' }
        })
        // Mock proposal finalization
        .mockResolvedValueOnce({
          success: true,
          data: { status: 'finalized', result: 'approved' }
        })
        // Mock proposal execution
        .mockResolvedValueOnce({
          success: true,
          data: { executionId: 'exec-789', status: 'executed' }
        });

      // Mock Pi Network governance
      (mockPiNetworkIntegration.executeDaoGovernanceVote as Mock).mockResolvedValue({
        success: true,
        transactionId: 'pi-tx-123',
        contractAddress: '0xGovernanceContract123',
        blockNumber: 12345
      });

      (mockPiNetworkIntegration.validatePiContractGovernance as Mock).mockResolvedValue({
        isValid: true,
        score: 0.95,
        errors: []
      });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'audit-dao-cid-123',
        signature: 'qerberos-dao-signature-123',
        timestamp: new Date().toISOString()
      });

      // Act
      const result = await scenarioEngine.executeDaoFlow(params);

      // Assert
      expect(result.status).toBe('success');
      expect(result.scenarioId).toMatch(/^dao-flow-\d+$/);
      expect(result.auditCid).toBe('audit-dao-cid-123');
      expect(result.qerberosSignature).toBe('qerberos-dao-signature-123');
      expect(result.moduleResults).toHaveLength(5); // DAO, Qflow, Pi-governance, Voting, Finalization
      
      // Verify DAO proposal creation
      const daoResult = result.moduleResults.find(r => r.moduleId === 'dao');
      expect(daoResult).toBeDefined();
      expect(daoResult?.status).toBe('active');
      expect(daoResult?.metrics?.proposalId).toBe('proposal-123');
      expect(daoResult?.metrics?.proposalType).toBe('governance');
      
      // Verify Qflow execution
      const qflowResult = result.moduleResults.find(r => r.moduleId === 'qflow');
      expect(qflowResult).toBeDefined();
      expect(qflowResult?.status).toBe('active');
      expect(qflowResult?.metrics?.workflowId).toBe('workflow-456');
      expect(qflowResult?.metrics?.stepsCompleted).toBe(3);
      
      // Verify Pi Network integration
      const piResult = result.moduleResults.find(r => r.moduleId === 'pi-governance');
      expect(piResult).toBeDefined();
      expect(piResult?.status).toBe('active');
      expect(piResult?.metrics?.transactionId).toBe('pi-tx-123');
      expect(piResult?.metrics?.validationScore).toBe(0.95);

      // Verify voting system
      const votingResult = result.moduleResults.find(r => r.moduleId === 'voting-system');
      expect(votingResult).toBeDefined();
      expect(votingResult?.status).toBe('active');
      expect(votingResult?.metrics?.totalVotes).toBe(5);
      expect(votingResult?.metrics?.approveVotes).toBe(3); // 3 approve votes
      expect(votingResult?.metrics?.approvalRate).toBe(0.6); // 60% approval

      // Verify proposal finalization
      const finalizationResult = result.moduleResults.find(r => r.moduleId === 'dao-finalization');
      expect(finalizationResult).toBeDefined();
      expect(finalizationResult?.status).toBe('active');
      expect(finalizationResult?.metrics?.result).toBe('approved');
      expect(finalizationResult?.metrics?.executed).toBe(true);

      // Verify all expected calls were made
      expect(mockModuleIntegration.checkModuleHealth).toHaveBeenCalledWith('dao');
      expect(mockModuleIntegration.checkModuleHealth).toHaveBeenCalledWith('qflow');
      expect(mockModuleIntegration.callModuleMethod).toHaveBeenCalledWith(
        'dao',
        'createProposal',
        expect.objectContaining({ 
          userId: 'dao-test-user-123',
          type: 'governance',
          title: 'Update Governance Parameters'
        })
      );
      expect(mockPiNetworkIntegration.executeDaoGovernanceVote).toHaveBeenCalledWith(
        'proposal-123',
        'approve',
        'dao-test-user-123'
      );
      expect(mockQerberosAuth.createAuditEntry).toHaveBeenCalled();
    });

    it('should handle DAO module failure gracefully', async () => {
      // Arrange
      const params: DaoFlowParams = {
        userId: 'test-user-123',
        proposalType: 'funding',
        piNetworkIntegration: false,
        qflowExecution: false
      };

      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: 8000
      });

      // Act
      const result = await scenarioEngine.executeDaoFlow(params);

      // Assert
      expect(result.status).toBe('failure');
      expect(result.moduleResults).toHaveLength(1);
      
      const daoResult = result.moduleResults[0];
      expect(daoResult.moduleId).toBe('dao');
      expect(daoResult.status).toBe('error');
      expect(daoResult.error).toContain('DAO module is not healthy');
    });

    it('should handle Qflow execution failure', async () => {
      // Arrange
      const params: DaoFlowParams = {
        userId: 'test-user-123',
        proposalType: 'technical',
        piNetworkIntegration: false,
        qflowExecution: true
      };

      // Mock successful DAO proposal creation
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
        data: { proposalId: 'proposal-456', status: 'created' }
      });

      // Act
      const result = await scenarioEngine.executeDaoFlow(params);

      // Assert
      expect(result.status).toBe('failure');
      expect(result.moduleResults).toHaveLength(2); // DAO success, Qflow failure
      
      const qflowResult = result.moduleResults.find(r => r.moduleId === 'qflow');
      expect(qflowResult).toBeDefined();
      expect(qflowResult?.status).toBe('error');
      expect(qflowResult?.error).toContain('Qflow module is not healthy');
    });

    it('should handle Pi Network integration failure', async () => {
      // Arrange
      const params: DaoFlowParams = {
        userId: 'test-user-123',
        proposalType: 'governance',
        piNetworkIntegration: true,
        qflowExecution: false
      };

      // Mock successful DAO proposal creation
      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 50
      });

      (mockModuleIntegration.callModuleMethod as Mock).mockResolvedValue({
        success: true,
        data: { proposalId: 'proposal-789', status: 'created' }
      });

      // Mock Pi Network failure
      (mockPiNetworkIntegration.executeDaoGovernanceVote as Mock).mockResolvedValue({
        success: false,
        error: 'Pi Network connection timeout'
      });

      // Act
      const result = await scenarioEngine.executeDaoFlow(params);

      // Assert
      expect(result.status).toBe('failure');
      expect(result.moduleResults).toHaveLength(2); // DAO success, Pi Network failure
      
      const piResult = result.moduleResults.find(r => r.moduleId === 'pi-governance');
      expect(piResult).toBeDefined();
      expect(piResult?.status).toBe('error');
      expect(piResult?.error).toContain('Pi Network governance vote failed');
    });

    it('should handle different proposal types correctly', async () => {
      // Test funding proposal
      const fundingParams: DaoFlowParams = {
        userId: 'funding-test-user',
        proposalType: 'funding',
        piNetworkIntegration: false,
        qflowExecution: false
      };

      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 50
      });

      (mockModuleIntegration.callModuleMethod as Mock)
        .mockResolvedValueOnce({
          success: true,
          data: { proposalId: 'funding-proposal-123', status: 'created' }
        })
        // Mock voting (all approve for funding)
        .mockResolvedValueOnce({ success: true, data: { voteId: 'vote-1' } })
        .mockResolvedValueOnce({ success: true, data: { voteId: 'vote-2' } })
        .mockResolvedValueOnce({ success: true, data: { voteId: 'vote-3' } })
        .mockResolvedValueOnce({ success: true, data: { voteId: 'vote-4' } })
        .mockResolvedValueOnce({ success: true, data: { voteId: 'vote-5' } })
        // Mock finalization
        .mockResolvedValueOnce({
          success: true,
          data: { status: 'finalized', result: 'approved' }
        })
        // Mock execution
        .mockResolvedValueOnce({
          success: true,
          data: { executionId: 'funding-exec-123', status: 'executed' }
        });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'audit-funding-cid',
        signature: 'funding-signature',
        timestamp: new Date().toISOString()
      });

      const fundingResult = await scenarioEngine.executeDaoFlow(fundingParams);
      
      expect(fundingResult.status).toBe('success');
      expect(mockModuleIntegration.callModuleMethod).toHaveBeenCalledWith(
        'dao',
        'createProposal',
        expect.objectContaining({
          type: 'funding',
          title: 'Community Development Fund Allocation',
          parameters: expect.objectContaining({
            amount: 10000,
            currency: 'Q'
          })
        })
      );
    });

    it('should meet performance requirements (≤2s latency)', async () => {
      // Arrange
      const params: DaoFlowParams = {
        userId: 'perf-test-user',
        proposalType: 'governance',
        piNetworkIntegration: true,
        qflowExecution: true
      };

      // Mock fast responses
      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 10
      });

      (mockModuleIntegration.callModuleMethod as Mock)
        .mockResolvedValue({
          success: true,
          data: { proposalId: 'perf-proposal', workflowId: 'perf-workflow', voteId: 'perf-vote', executionId: 'perf-exec' }
        });

      (mockPiNetworkIntegration.executeDaoGovernanceVote as Mock).mockResolvedValue({
        success: true,
        transactionId: 'perf-pi-tx',
        contractAddress: '0xPerfContract',
        blockNumber: 54321
      });

      (mockPiNetworkIntegration.validatePiContractGovernance as Mock).mockResolvedValue({
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
      const result = await scenarioEngine.executeDaoFlow(params);
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

    it('should validate multi-user voting scenarios correctly', async () => {
      // Arrange
      const params: DaoFlowParams = {
        userId: 'voting-test-user',
        proposalType: 'technical',
        piNetworkIntegration: false,
        qflowExecution: false
      };

      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 50
      });

      (mockModuleIntegration.callModuleMethod as Mock)
        .mockResolvedValueOnce({
          success: true,
          data: { proposalId: 'voting-proposal-123', status: 'created' }
        })
        // Mock voting results (3 approve, 1 reject, 1 abstain)
        .mockResolvedValueOnce({ success: true, data: { voteId: 'vote-1' } })
        .mockResolvedValueOnce({ success: true, data: { voteId: 'vote-2' } })
        .mockResolvedValueOnce({ success: true, data: { voteId: 'vote-3' } })
        .mockResolvedValueOnce({ success: true, data: { voteId: 'vote-4' } })
        .mockResolvedValueOnce({ success: true, data: { voteId: 'vote-5' } })
        // Mock finalization (technical proposals don't auto-execute)
        .mockResolvedValueOnce({
          success: true,
          data: { status: 'finalized', result: 'approved' }
        });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'audit-voting-cid',
        signature: 'voting-signature',
        timestamp: new Date().toISOString()
      });

      // Act
      const result = await scenarioEngine.executeDaoFlow(params);

      // Assert
      expect(result.status).toBe('success');
      
      // Verify voting results
      const votingResult = result.moduleResults.find(r => r.moduleId === 'voting-system');
      expect(votingResult).toBeDefined();
      expect(votingResult?.metrics?.totalVotes).toBe(5);
      expect(votingResult?.metrics?.approveVotes).toBe(3);
      expect(votingResult?.metrics?.rejectVotes).toBe(1);
      expect(votingResult?.metrics?.abstainVotes).toBe(1);
      expect(votingResult?.metrics?.approvalRate).toBe(0.6); // 60% approval
      expect(votingResult?.metrics?.votersCount).toBe(5);

      // Verify finalization (technical proposal approved but not executed)
      const finalizationResult = result.moduleResults.find(r => r.moduleId === 'dao-finalization');
      expect(finalizationResult).toBeDefined();
      expect(finalizationResult?.metrics?.result).toBe('approved');
      expect(finalizationResult?.metrics?.executed).toBe(false); // Technical proposals don't auto-execute
    });

    it('should handle proposal rejection correctly', async () => {
      // Arrange
      const params: DaoFlowParams = {
        userId: 'rejection-test-user',
        proposalType: 'governance',
        piNetworkIntegration: false,
        qflowExecution: false
      };

      (mockModuleIntegration.checkModuleHealth as Mock).mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 50
      });

      // Mock voting with majority rejection (simulate by modifying the voting logic)
      (mockModuleIntegration.callModuleMethod as Mock)
        .mockResolvedValueOnce({
          success: true,
          data: { proposalId: 'rejection-proposal-123', status: 'created' }
        })
        // Mock voting results (1 approve, 3 reject, 1 abstain = 20% approval)
        .mockResolvedValueOnce({ success: true, data: { voteId: 'vote-1' } })
        .mockResolvedValueOnce({ success: true, data: { voteId: 'vote-2' } })
        .mockResolvedValueOnce({ success: true, data: { voteId: 'vote-3' } })
        .mockResolvedValueOnce({ success: true, data: { voteId: 'vote-4' } })
        .mockResolvedValueOnce({ success: true, data: { voteId: 'vote-5' } })
        // Mock finalization with rejection
        .mockResolvedValueOnce({
          success: true,
          data: { status: 'finalized', result: 'rejected' }
        });

      (mockQerberosAuth.createAuditEntry as Mock).mockResolvedValue({
        cid: 'audit-rejection-cid',
        signature: 'rejection-signature',
        timestamp: new Date().toISOString()
      });

      // Act
      const result = await scenarioEngine.executeDaoFlow(params);

      // Assert
      expect(result.status).toBe('success');
      
      // Verify finalization shows rejection
      const finalizationResult = result.moduleResults.find(r => r.moduleId === 'dao-finalization');
      expect(finalizationResult).toBeDefined();
      expect(finalizationResult?.metrics?.result).toBe('rejected');
      expect(finalizationResult?.metrics?.executed).toBe(false);
      
      // Verify no execution call was made (only 7 calls: create + 5 votes + finalize)
      expect(mockModuleIntegration.callModuleMethod).toHaveBeenCalledTimes(7);
    });
  });

  describe('validateScenarioParams for DAO flow', () => {
    it('should validate valid DAO flow parameters', () => {
      // Arrange
      const params: DaoFlowParams = {
        userId: 'test-user',
        proposalType: 'governance',
        piNetworkIntegration: true,
        qflowExecution: true
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('dao', params);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject parameters without user ID', () => {
      // Arrange
      const params: DaoFlowParams = {
        userId: '',
        proposalType: 'governance',
        piNetworkIntegration: true,
        qflowExecution: true
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('dao', params);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID is required for DAO governance flow');
    });

    it('should reject invalid proposal types', () => {
      // Arrange
      const params: DaoFlowParams = {
        userId: 'test-user',
        proposalType: 'invalid' as any,
        piNetworkIntegration: true,
        qflowExecution: true
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('dao', params);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Proposal type must be one of: governance, funding, technical');
    });

    it('should warn when no advanced features are enabled', () => {
      // Arrange
      const params: DaoFlowParams = {
        userId: 'test-user',
        proposalType: 'governance',
        piNetworkIntegration: false,
        qflowExecution: false
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('dao', params);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Neither Qflow execution nor Pi Network integration is enabled - proposal will use basic DAO functionality only');
    });

    it('should warn about technical proposals with Pi Network integration', () => {
      // Arrange
      const params: DaoFlowParams = {
        userId: 'test-user',
        proposalType: 'technical',
        piNetworkIntegration: true,
        qflowExecution: false
      };

      // Act
      const result = scenarioEngine.validateScenarioParams('dao', params);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Technical proposals may have limited Pi Network integration capabilities');
    });
  });
});