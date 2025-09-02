import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  PiSmartContractEngine, 
  ContractExecutionParams,
  GovernanceProposal 
} from '../services/PiSmartContractEngine.js';
import { VoteOption } from '../interfaces/PiNetworkIntegration.js';

describe('PiSmartContractEngine', () => {
  let engine: PiSmartContractEngine;
  let mockConfig: any;

  beforeEach(() => {
    engine = new PiSmartContractEngine();
    mockConfig = {
      qflowEndpoint: 'http://localhost:3001/qflow',
      piNetworkConfig: {
        environment: 'testnet',
        apiKey: 'test_api_key',
        appId: 'test_app_id'
      }
    };

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      await expect(engine.initialize(mockConfig)).resolves.not.toThrow();
      
      const health = await engine.validateHealth();
      expect(health.isValid).toBe(true);
    });

    it('should validate health after initialization', async () => {
      await engine.initialize(mockConfig);
      
      const health = await engine.validateHealth();
      expect(health.isValid).toBe(true);
      expect(health.checks).toHaveLength(3);
      expect(health.checks.every(check => check.passed)).toBe(true);
    });

    it('should validate health when not initialized', async () => {
      const health = await engine.validateHealth();
      
      expect(health.isValid).toBe(false);
      expect(health.checks[0].passed).toBe(false); // Initialization check
    });
  });

  describe('Smart Contract Execution through Qflow', () => {
    beforeEach(async () => {
      await engine.initialize(mockConfig);
    });

    it('should execute contract through Qflow successfully', async () => {
      const params: ContractExecutionParams = {
        contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
        method: 'transfer',
        params: ['0xrecipient', 100],
        gasLimit: 100000,
        gasPrice: 20
      };

      const result = await engine.executeContractThroughQflow(params);

      expect(result.success).toBe(true);
      expect(result.contractAddress).toBe(params.contractAddress);
      expect(result.method).toBe(params.method);
      expect(result.transactionHash).toBeDefined();
      expect(result.workflowId).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.auditTrail).toHaveLength(2);
      expect(result.qerberosSignature).toBeDefined();
      expect(result.ipfsHash).toBeDefined();
    });

    it('should handle contract execution with minimal parameters', async () => {
      const params: ContractExecutionParams = {
        contractAddress: 'pi_contract_123',
        method: 'getValue',
        params: []
      };

      const result = await engine.executeContractThroughQflow(params);

      expect(result.success).toBe(true);
      expect(result.contractAddress).toBe(params.contractAddress);
      expect(result.method).toBe(params.method);
    });

    it('should generate proper audit trail for contract execution', async () => {
      const params: ContractExecutionParams = {
        contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
        method: 'approve',
        params: ['0xspender', 1000]
      };

      const result = await engine.executeContractThroughQflow(params);

      expect(result.auditTrail).toHaveLength(2);
      expect(result.auditTrail[0].action).toBe('workflow_initiated');
      expect(result.auditTrail[0].actor).toBe('qflow_engine');
      expect(result.auditTrail[1].action).toBe('contract_execution');
      expect(result.auditTrail[1].actor).toBe('pi_network');
      
      // Verify audit trail structure
      result.auditTrail.forEach(step => {
        expect(step.stepId).toBeDefined();
        expect(step.timestamp).toBeInstanceOf(Date);
        expect(step.signature).toBeDefined();
        expect(step.cid).toBeDefined();
      });
    });

    it('should fail execution when engine not initialized', async () => {
      const uninitializedEngine = new PiSmartContractEngine();
      const params: ContractExecutionParams = {
        contractAddress: '0x123',
        method: 'test',
        params: []
      };

      const result = await uninitializedEngine.executeContractThroughQflow(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pi Smart Contract Engine not initialized');
    });
  });

  describe('DAO Governance Proposals', () => {
    beforeEach(async () => {
      await engine.initialize(mockConfig);
    });

    it('should create governance proposal successfully', async () => {
      const title = 'Test Proposal';
      const description = 'This is a test governance proposal';
      const proposer = 'pi_user_proposer';
      const durationHours = 48;

      const proposal = await engine.createGovernanceProposal(title, description, proposer, durationHours);

      expect(proposal.proposalId).toBeDefined();
      expect(proposal.title).toBe(title);
      expect(proposal.description).toBe(description);
      expect(proposal.proposer).toBe(proposer);
      expect(proposal.status).toBe('active');
      expect(proposal.startTime).toBeInstanceOf(Date);
      expect(proposal.endTime).toBeInstanceOf(Date);
      expect(proposal.endTime.getTime() - proposal.startTime.getTime()).toBe(durationHours * 60 * 60 * 1000);
    });

    it('should create proposal with default duration', async () => {
      const proposal = await engine.createGovernanceProposal(
        'Default Duration Proposal',
        'Testing default duration',
        'pi_user_proposer'
      );

      const expectedDuration = 72 * 60 * 60 * 1000; // 72 hours in milliseconds
      const actualDuration = proposal.endTime.getTime() - proposal.startTime.getTime();
      
      expect(actualDuration).toBe(expectedDuration);
    });

    it('should track active proposals', async () => {
      const proposal1 = await engine.createGovernanceProposal('Proposal 1', 'Description 1', 'proposer1');
      const proposal2 = await engine.createGovernanceProposal('Proposal 2', 'Description 2', 'proposer2');

      const activeProposals = engine.getActiveProposals();
      
      expect(activeProposals).toHaveLength(2);
      expect(activeProposals.map(p => p.proposalId)).toContain(proposal1.proposalId);
      expect(activeProposals.map(p => p.proposalId)).toContain(proposal2.proposalId);
    });

    it('should retrieve proposal by ID', async () => {
      const createdProposal = await engine.createGovernanceProposal('Test', 'Description', 'proposer');
      
      const retrievedProposal = engine.getProposal(createdProposal.proposalId);
      
      expect(retrievedProposal).toBeDefined();
      expect(retrievedProposal?.proposalId).toBe(createdProposal.proposalId);
      expect(retrievedProposal?.title).toBe('Test');
    });

    it('should return undefined for non-existent proposal', () => {
      const proposal = engine.getProposal('non_existent_proposal');
      expect(proposal).toBeUndefined();
    });
  });

  describe('DAO Governance Voting', () => {
    let testProposal: GovernanceProposal;

    beforeEach(async () => {
      await engine.initialize(mockConfig);
      testProposal = await engine.createGovernanceProposal(
        'Test Voting Proposal',
        'Testing voting functionality',
        'pi_user_proposer'
      );
    });

    it('should execute governance vote successfully', async () => {
      const vote: VoteOption = 'yes';
      const voterAddress = 'pi_wallet_voter_123';
      const votingPower = 100;

      const result = await engine.executeGovernanceVote(
        testProposal.proposalId,
        vote,
        voterAddress,
        votingPower
      );

      expect(result.success).toBe(true);
      expect(result.proposalId).toBe(testProposal.proposalId);
      expect(result.vote).toBe(vote);
      expect(result.voterAddress).toBe(voterAddress);
      expect(result.votingPower).toBe(votingPower);
      expect(result.transactionHash).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should support all vote options', async () => {
      const voteOptions: VoteOption[] = ['yes', 'no', 'abstain'];
      const voterAddress = 'pi_wallet_voter';
      const votingPower = 50;

      for (let i = 0; i < voteOptions.length; i++) {
        const vote = voteOptions[i];
        const uniqueVoterAddress = `${voterAddress}_${i}`;
        
        const result = await engine.executeGovernanceVote(
          testProposal.proposalId,
          vote,
          uniqueVoterAddress,
          votingPower
        );

        expect(result.success).toBe(true);
        expect(result.vote).toBe(vote);
      }
    });

    it('should update proposal vote counts', async () => {
      const voterAddress1 = 'pi_wallet_voter_1';
      const voterAddress2 = 'pi_wallet_voter_2';
      const votingPower = 100;

      // Cast yes vote
      await engine.executeGovernanceVote(testProposal.proposalId, 'yes', voterAddress1, votingPower);
      
      // Cast no vote
      await engine.executeGovernanceVote(testProposal.proposalId, 'no', voterAddress2, votingPower);

      const updatedProposal = engine.getProposal(testProposal.proposalId);
      
      expect(updatedProposal?.currentVotes.yes).toBe(votingPower);
      expect(updatedProposal?.currentVotes.no).toBe(votingPower);
      expect(updatedProposal?.currentVotes.abstain).toBe(0);
    });

    it('should fail vote on non-existent proposal', async () => {
      const result = await engine.executeGovernanceVote(
        'non_existent_proposal',
        'yes',
        'voter_address',
        100
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Proposal not found');
    });

    it('should prevent double voting', async () => {
      const voterAddress = 'pi_wallet_voter_double';
      const votingPower = 100;

      // First vote should succeed
      const firstVote = await engine.executeGovernanceVote(
        testProposal.proposalId,
        'yes',
        voterAddress,
        votingPower
      );
      expect(firstVote.success).toBe(true);

      // Second vote should fail
      const secondVote = await engine.executeGovernanceVote(
        testProposal.proposalId,
        'no',
        voterAddress,
        votingPower
      );
      expect(secondVote.success).toBe(false);
      expect(secondVote.error).toBe('User has already voted on this proposal');
    });

    it('should fail vote when engine not initialized', async () => {
      const uninitializedEngine = new PiSmartContractEngine();
      
      const result = await uninitializedEngine.executeGovernanceVote(
        'proposal_id',
        'yes',
        'voter_address',
        100
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pi Smart Contract Engine not initialized');
    });
  });

  describe('Contract Governance Validation', () => {
    beforeEach(async () => {
      await engine.initialize(mockConfig);
    });

    it('should validate contract governance capabilities', async () => {
      const contractAddress = '0x1234567890abcdef1234567890abcdef12345678';

      const result = await engine.validateContractGovernance(contractAddress);

      expect(result.isValid).toBe(true);
      expect(result.contractAddress).toBe(contractAddress);
      expect(result.governanceType).toBe('dao');
      expect(result.votingMechanism).toBe('token-weighted');
      expect(result.participantCount).toBeGreaterThan(0);
      expect(result.quorumThreshold).toBeGreaterThan(0);
      expect(result.currentQuorum).toBeGreaterThanOrEqual(0);
    });

    it('should handle governance validation errors gracefully', async () => {
      // Mock an error in the validation process
      const originalMethod = engine['analyzeContractGovernance'];
      engine['analyzeContractGovernance'] = vi.fn().mockRejectedValue(new Error('Analysis failed'));

      const result = await engine.validateContractGovernance('0x123');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Analysis failed');

      // Restore original method
      engine['analyzeContractGovernance'] = originalMethod;
    });

    it('should fail validation when engine not initialized', async () => {
      const uninitializedEngine = new PiSmartContractEngine();
      
      const result = await uninitializedEngine.validateContractGovernance('0x123');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Pi Smart Contract Engine not initialized');
    });
  });

  describe('Health Monitoring', () => {
    it('should report unhealthy when not initialized', async () => {
      const health = await engine.validateHealth();

      expect(health.isValid).toBe(false);
      expect(health.checks).toHaveLength(3);
      expect(health.checks[0].passed).toBe(false); // Initialization
      expect(health.summary).toContain('issues detected');
    });

    it('should report healthy after successful initialization', async () => {
      await engine.initialize(mockConfig);
      
      const health = await engine.validateHealth();

      expect(health.isValid).toBe(true);
      expect(health.checks).toHaveLength(3);
      expect(health.checks.every(check => check.passed)).toBe(true);
      expect(health.summary).toBe('Smart contract engine healthy');
    });

    it('should include all required health checks', async () => {
      await engine.initialize(mockConfig);
      
      const health = await engine.validateHealth();

      const checkNames = health.checks.map(check => check.name);
      expect(checkNames).toContain('Engine Initialization');
      expect(checkNames).toContain('Qflow Connectivity');
      expect(checkNames).toContain('Pi Network Connectivity');
    });

    it('should handle health check errors gracefully', async () => {
      await engine.initialize(mockConfig);
      
      // Mock a health check failure
      const originalMethod = engine['checkQflowHealth'];
      engine['checkQflowHealth'] = vi.fn().mockRejectedValue(new Error('Health check failed'));

      const health = await engine.validateHealth();

      expect(health.isValid).toBe(false);
      expect(health.summary).toBe('Smart contract engine health check failed');

      // Restore original method
      engine['checkQflowHealth'] = originalMethod;
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await engine.initialize(mockConfig);
    });

    it('should handle Qflow workflow execution errors', async () => {
      // Mock a workflow execution failure
      const originalMethod = engine['executeQflowWorkflow'];
      engine['executeQflowWorkflow'] = vi.fn().mockRejectedValue(new Error('Workflow failed'));

      const params: ContractExecutionParams = {
        contractAddress: '0x123',
        method: 'test',
        params: []
      };

      const result = await engine.executeContractThroughQflow(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Workflow failed');

      // Restore original method
      engine['executeQflowWorkflow'] = originalMethod;
    });

    it('should handle audit trail generation errors', async () => {
      // Mock an audit trail generation failure
      const originalMethod = engine['generateAuditTrail'];
      engine['generateAuditTrail'] = vi.fn().mockRejectedValue(new Error('Audit failed'));

      const params: ContractExecutionParams = {
        contractAddress: '0x123',
        method: 'test',
        params: []
      };

      const result = await engine.executeContractThroughQflow(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Audit failed');

      // Restore original method
      engine['generateAuditTrail'] = originalMethod;
    });

    it('should handle IPFS storage errors', async () => {
      // Mock an IPFS storage failure
      const originalMethod = engine['storeExecutionDataInIPFS'];
      engine['storeExecutionDataInIPFS'] = vi.fn().mockRejectedValue(new Error('IPFS storage failed'));

      const params: ContractExecutionParams = {
        contractAddress: '0x123',
        method: 'test',
        params: []
      };

      const result = await engine.executeContractThroughQflow(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('IPFS storage failed');

      // Restore original method
      engine['storeExecutionDataInIPFS'] = originalMethod;
    });
  });

  describe('Integration with Mock Pi Network Contracts', () => {
    beforeEach(async () => {
      await engine.initialize(mockConfig);
    });

    it('should execute Pi Network specific contract methods', async () => {
      const params: ContractExecutionParams = {
        contractAddress: 'pi_dao_contract_0x123456789abcdef',
        method: 'createProposal',
        params: ['Test Proposal', 'Description', 72]
      };

      const result = await engine.executeContractThroughQflow(params);

      expect(result.success).toBe(true);
      expect(result.contractAddress).toBe(params.contractAddress);
      expect(result.method).toBe(params.method);
    });

    it('should handle Pi Network governance contract interactions', async () => {
      // Create a proposal first
      const proposal = await engine.createGovernanceProposal(
        'Pi Network Integration Test',
        'Testing Pi Network DAO integration',
        'pi_user_proposer'
      );

      // Execute vote on the proposal
      const voteResult = await engine.executeGovernanceVote(
        proposal.proposalId,
        'yes',
        'pi_wallet_voter',
        150
      );

      expect(voteResult.success).toBe(true);
      expect(voteResult.proposalId).toBe(proposal.proposalId);
    });

    it('should validate Pi Network DAO contracts', async () => {
      const piDaoContract = 'pi_dao_contract_governance_123';

      const validation = await engine.validateContractGovernance(piDaoContract);

      expect(validation.isValid).toBe(true);
      expect(validation.contractAddress).toBe(piDaoContract);
      expect(validation.governanceType).toBe('dao');
    });
  });
});