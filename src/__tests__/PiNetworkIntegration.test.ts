import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PiNetworkIntegrationService } from '../services/PiNetworkIntegrationService.js';
import {
  PiAuthCredentials,
  PiWalletAuthParams,
  PiTransaction,
  VoteOption
} from '../interfaces/PiNetworkIntegration.js';

describe('PiNetworkIntegrationService', () => {
  let piService: PiNetworkIntegrationService;
  let mockCredentials: PiAuthCredentials;

  beforeEach(() => {
    piService = new PiNetworkIntegrationService();
    mockCredentials = {
      apiKey: 'test_api_key_123',
      appId: 'test_app_id_456',
      environment: 'sandbox',
      walletPrivateKey: 'test_private_key_789'
    };

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid credentials', async () => {
      await expect(piService.initialize(mockCredentials)).resolves.not.toThrow();
      
      const status = await piService.getConnectionStatus();
      expect(status.connected).toBe(true);
      expect(status.network).toBe('sandbox');
    });

    it('should fail initialization with missing API key', async () => {
      const invalidCredentials = { ...mockCredentials, apiKey: '' };
      
      await expect(piService.initialize(invalidCredentials))
        .rejects.toThrow('Missing required Pi Network credentials');
    });

    it('should fail initialization with missing app ID', async () => {
      const invalidCredentials = { ...mockCredentials, appId: '' };
      
      await expect(piService.initialize(invalidCredentials))
        .rejects.toThrow('Missing required Pi Network credentials');
    });

    it('should validate health after successful initialization', async () => {
      await piService.initialize(mockCredentials);
      
      const health = await piService.validateHealth();
      expect(health.isValid).toBe(true);
      expect(health.checks).toHaveLength(3);
      expect(health.checks.every(check => check.passed)).toBe(true);
    });
  });

  describe('Pi Wallet Authentication', () => {
    beforeEach(async () => {
      await piService.initialize(mockCredentials);
    });

    it('should authenticate user with Pi Wallet successfully', async () => {
      const piUserId = 'pi_user_test_123';
      const authParams: PiWalletAuthParams = {
        scopes: ['payments', 'username']
      };

      const result = await piService.authenticateWithPiWallet(piUserId, authParams);

      expect(result.success).toBe(true);
      expect(result.piUserId).toBe(piUserId);
      expect(result.accessToken).toContain('pi_token_');
      expect(result.walletAddress).toContain('pi_wallet_');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should fail authentication with empty user ID', async () => {
      const result = await piService.authenticateWithPiWallet('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pi user ID is required');
    });

    it('should handle authentication without auth parameters', async () => {
      const piUserId = 'pi_user_test_456';

      const result = await piService.authenticateWithPiWallet(piUserId);

      expect(result.success).toBe(true);
      expect(result.piUserId).toBe(piUserId);
    });

    it('should fail authentication when service not initialized', async () => {
      const uninitializedService = new PiNetworkIntegrationService();
      
      const result = await uninitializedService.authenticateWithPiWallet('test_user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pi Network integration not initialized');
    });
  });

  describe('Pi Identity Linking', () => {
    beforeEach(async () => {
      await piService.initialize(mockCredentials);
    });

    it('should link Pi identity with sQuid identity successfully', async () => {
      const piUserId = 'pi_user_test_123';
      const squidId = 'squid_identity_456';

      const result = await piService.linkPiIdentity(piUserId, squidId);

      expect(result.success).toBe(true);
      expect(result.piUserId).toBe(piUserId);
      expect(result.squidId).toBe(squidId);
      expect(result.linkId).toContain('link_');
      expect(result.linkedAt).toBeInstanceOf(Date);
    });

    it('should fail linking with empty Pi user ID', async () => {
      const result = await piService.linkPiIdentity('', 'squid_test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Both Pi user ID and sQuid ID are required');
    });

    it('should fail linking with empty sQuid ID', async () => {
      const result = await piService.linkPiIdentity('pi_user_test', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Both Pi user ID and sQuid ID are required');
    });

    it('should fail linking with invalid Pi user', async () => {
      const result = await piService.linkPiIdentity('x', 'squid_test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or unauthenticated Pi user');
    });

    it('should fail linking with invalid sQuid identity', async () => {
      const result = await piService.linkPiIdentity('pi_user_test', 'x');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid sQuid identity');
    });
  });

  describe('Smart Contract Execution', () => {
    beforeEach(async () => {
      await piService.initialize(mockCredentials);
    });

    it('should execute smart contract successfully', async () => {
      const contractAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const method = 'transfer';
      const params = ['0xrecipient', 100];

      const result = await piService.executeSmartContract(contractAddress, method, params);

      expect(result.success).toBe(true);
      expect(result.contractAddress).toBe(contractAddress);
      expect(result.method).toBe(method);
      expect(result.transactionHash).toContain('tx_');
      expect(result.gasUsed).toBeGreaterThan(21000);
      expect(result.result).toBeDefined();
    });

    it('should fail execution with invalid contract address', async () => {
      const result = await piService.executeSmartContract('invalid', 'method', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid contract address');
    });

    it('should fail execution with empty method', async () => {
      const contractAddress = '0x1234567890abcdef1234567890abcdef12345678';
      
      const result = await piService.executeSmartContract(contractAddress, '', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contract method is required');
    });

    it('should handle Pi Network contract addresses', async () => {
      const contractAddress = 'pi_contract_123456789';
      const method = 'vote';
      const params = ['proposal_1', 'yes'];

      const result = await piService.executeSmartContract(contractAddress, method, params);

      expect(result.success).toBe(true);
      expect(result.contractAddress).toBe(contractAddress);
    });
  });

  describe('Transaction Processing', () => {
    beforeEach(async () => {
      await piService.initialize(mockCredentials);
    });

    it('should process Pi transaction successfully', async () => {
      const transaction: PiTransaction = {
        transactionId: 'tx_test_123',
        fromAddress: 'pi_wallet_sender',
        toAddress: 'pi_wallet_recipient',
        amount: 10.5,
        memo: 'Test payment',
        metadata: { purpose: 'demo' }
      };

      const result = await piService.processTransaction(transaction);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe(transaction.transactionId);
      expect(result.transactionHash).toContain('tx_hash_');
      expect(result.confirmations).toBeGreaterThan(0);
      expect(result.status).toBe('confirmed');
      expect(result.auditCid).toContain('audit_');
      expect(result.qerberosSignature).toContain('qerberos_sig_');
    });

    it('should fail processing with missing transaction ID', async () => {
      const transaction: PiTransaction = {
        transactionId: '',
        fromAddress: 'sender',
        toAddress: 'recipient',
        amount: 10
      };

      const result = await piService.processTransaction(transaction);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction ID is required');
    });

    it('should fail processing with missing addresses', async () => {
      const transaction: PiTransaction = {
        transactionId: 'tx_test',
        fromAddress: '',
        toAddress: 'recipient',
        amount: 10
      };

      const result = await piService.processTransaction(transaction);

      expect(result.success).toBe(false);
      expect(result.error).toBe('From and to addresses are required');
    });

    it('should fail processing with invalid amount', async () => {
      const transaction: PiTransaction = {
        transactionId: 'tx_test',
        fromAddress: 'sender',
        toAddress: 'recipient',
        amount: -5
      };

      const result = await piService.processTransaction(transaction);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction amount must be positive');
    });
  });

  describe('DAO Governance', () => {
    beforeEach(async () => {
      await piService.initialize(mockCredentials);
    });

    it('should execute DAO governance vote successfully', async () => {
      const proposalId = 'proposal_test_123';
      const vote: VoteOption = 'yes';
      const piUserId = 'pi_user_voter';

      const result = await piService.executeDaoGovernanceVote(proposalId, vote, piUserId);

      expect(result.success).toBe(true);
      expect(result.proposalId).toBe(proposalId);
      expect(result.vote).toBe(vote);
      expect(result.voterAddress).toContain('pi_wallet_');
      expect(result.transactionHash).toContain('vote_tx_');
      expect(result.votingPower).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should fail governance vote with missing parameters', async () => {
      const result = await piService.executeDaoGovernanceVote('', 'yes', 'user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('All governance parameters are required');
    });

    it('should support all vote options', async () => {
      const proposalId = 'proposal_test';
      const piUserId = 'pi_user_voter';
      const voteOptions: VoteOption[] = ['yes', 'no', 'abstain'];

      for (const vote of voteOptions) {
        const result = await piService.executeDaoGovernanceVote(proposalId, vote, piUserId);
        expect(result.success).toBe(true);
        expect(result.vote).toBe(vote);
      }
    });

    it('should validate Pi contract governance capabilities', async () => {
      const contractAddress = '0x1234567890abcdef1234567890abcdef12345678';

      const result = await piService.validatePiContractGovernance(contractAddress);

      expect(result.isValid).toBe(true);
      expect(result.contractAddress).toBe(contractAddress);
      expect(result.governanceType).toBe('dao');
      expect(result.votingMechanism).toBe('token-weighted');
      expect(result.participantCount).toBeGreaterThan(0);
      expect(result.quorumThreshold).toBeGreaterThan(0);
      expect(result.currentQuorum).toBeGreaterThanOrEqual(0);
    });

    it('should fail governance validation with invalid contract address', async () => {
      const result = await piService.validatePiContractGovernance('invalid');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid contract address');
    });
  });

  describe('Connection Status and Health', () => {
    it('should return disconnected status when not initialized', async () => {
      const status = await piService.getConnectionStatus();

      expect(status.connected).toBe(false);
      expect(status.network).toBe('unknown');
      expect(status.blockHeight).toBeUndefined();
    });

    it('should return connected status after initialization', async () => {
      await piService.initialize(mockCredentials);
      
      const status = await piService.getConnectionStatus();

      expect(status.connected).toBe(true);
      expect(status.network).toBe('sandbox');
      expect(status.blockHeight).toBeGreaterThan(0);
    });

    it('should validate health when not initialized', async () => {
      const health = await piService.validateHealth();

      expect(health.isValid).toBe(false);
      expect(health.checks).toHaveLength(3);
      expect(health.checks[0].passed).toBe(false); // Initialization check
      expect(health.summary).toContain('issues detected');
    });

    it('should validate health after initialization', async () => {
      await piService.initialize(mockCredentials);
      
      const health = await piService.validateHealth();

      expect(health.isValid).toBe(true);
      expect(health.checks).toHaveLength(3);
      expect(health.checks.every(check => check.passed)).toBe(true);
      expect(health.summary).toBe('Pi Network integration healthy');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await piService.initialize(mockCredentials);
    });

    it('should handle authentication errors gracefully', async () => {
      // Mock an authentication failure
      const originalMethod = piService['performPiWalletAuth'];
      piService['performPiWalletAuth'] = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await piService.authenticateWithPiWallet('test_user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');

      // Restore original method
      piService['performPiWalletAuth'] = originalMethod;
    });

    it('should handle contract execution errors gracefully', async () => {
      // Mock a contract execution failure
      const originalMethod = piService['executeContractThroughQflow'];
      piService['executeContractThroughQflow'] = vi.fn().mockRejectedValue(new Error('Contract error'));

      // Use a valid contract address to bypass validation
      const result = await piService.executeSmartContract('0x1234567890abcdef1234567890abcdef12345678', 'method', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contract error');

      // Restore original method
      piService['executeContractThroughQflow'] = originalMethod;
    });

    it('should handle transaction processing errors gracefully', async () => {
      // Mock a transaction processing failure
      const originalMethod = piService['processTransactionThroughQwallet'];
      piService['processTransactionThroughQwallet'] = vi.fn().mockRejectedValue(new Error('Transaction error'));

      const transaction: PiTransaction = {
        transactionId: 'tx_test',
        fromAddress: 'sender',
        toAddress: 'recipient',
        amount: 10
      };

      const result = await piService.processTransaction(transaction);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction error');

      // Restore original method
      piService['processTransactionThroughQwallet'] = originalMethod;
    });
  });

  describe('Integration with Pi Network Testnet', () => {
    beforeEach(async () => {
      // Initialize with testnet configuration
      const testnetCredentials: PiAuthCredentials = {
        ...mockCredentials,
        environment: 'sandbox'
      };
      await piService.initialize(testnetCredentials);
    });

    it('should configure for testnet environment', async () => {
      const status = await piService.getConnectionStatus();
      
      expect(status.network).toBe('sandbox');
      expect(status.connected).toBe(true);
    });

    it('should handle testnet-specific authentication flow', async () => {
      const piUserId = 'testnet_user_123';
      const authParams: PiWalletAuthParams = {
        scopes: ['payments', 'username'],
        onIncompletePaymentFound: vi.fn(),
        onCancel: vi.fn(),
        onError: vi.fn()
      };

      const result = await piService.authenticateWithPiWallet(piUserId, authParams);

      expect(result.success).toBe(true);
      expect(result.piUserId).toBe(piUserId);
      expect(result.accessToken).toBeDefined();
    });

    it('should simulate testnet contract interactions', async () => {
      const testnetContract = 'pi_testnet_contract_123';
      const method = 'testMethod';
      const params = ['test_param'];

      const result = await piService.executeSmartContract(testnetContract, method, params);

      expect(result.success).toBe(true);
      expect(result.contractAddress).toBe(testnetContract);
      expect(result.transactionHash).toBeDefined();
    });

    it('should validate testnet governance contracts', async () => {
      const testnetGovernanceContract = 'pi_testnet_dao_456';

      const result = await piService.validatePiContractGovernance(testnetGovernanceContract);

      expect(result.isValid).toBe(true);
      expect(result.contractAddress).toBe(testnetGovernanceContract);
      expect(result.governanceType).toBeDefined();
    });
  });
});