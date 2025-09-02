import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  PiTransactionProcessor,
  QwalletConfig,
  TransactionValidationRules
} from '../services/PiTransactionProcessor.js';
import { PiTransaction } from '../interfaces/PiNetworkIntegration.js';

describe('PiTransactionProcessor', () => {
  let processor: PiTransactionProcessor;
  let mockConfig: QwalletConfig;

  beforeEach(() => {
    processor = new PiTransactionProcessor();
    mockConfig = {
      endpoint: 'http://localhost:3002/qwallet',
      apiKey: 'test_qwallet_key',
      network: 'testnet',
      timeout: 30000
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
      await expect(processor.initialize(mockConfig)).resolves.not.toThrow();
      
      const health = await processor.validateHealth();
      expect(health.isValid).toBe(true);
    });

    it('should validate health after initialization', async () => {
      await processor.initialize(mockConfig);
      
      const health = await processor.validateHealth();
      expect(health.isValid).toBe(true);
      expect(health.checks).toHaveLength(3);
      expect(health.checks.every(check => check.passed)).toBe(true);
    });

    it('should validate health when not initialized', async () => {
      const health = await processor.validateHealth();
      
      expect(health.isValid).toBe(false);
      expect(health.checks[0].passed).toBe(false); // Initialization check
    });
  });

  describe('Transaction Validation', () => {
    beforeEach(async () => {
      await processor.initialize(mockConfig);
    });

    it('should validate valid transaction successfully', async () => {
      const transaction: PiTransaction = {
        transactionId: 'tx_test_123',
        fromAddress: 'pi_wallet_sender_123',
        toAddress: 'pi_wallet_recipient_456',
        amount: 10.5,
        memo: 'Test payment',
        metadata: { purpose: 'demo' }
      };

      const result = await processor.validateTransaction(transaction);

      expect(result.isValid).toBe(true);
      expect(result.checks.length).toBeGreaterThanOrEqual(7);
      expect(result.checks.every(check => check.passed)).toBe(true);
      expect(result.summary).toBe('Transaction validation passed');
    });

    it('should fail validation for missing required fields', async () => {
      const transaction: PiTransaction = {
        transactionId: '',
        fromAddress: 'sender',
        toAddress: '',
        amount: 10
      };

      const result = await processor.validateTransaction(transaction);

      expect(result.isValid).toBe(false);
      expect(result.summary).toBe('Transaction validation failed');
      
      // Check that required field validations failed
      const requiredFieldChecks = result.checks.filter(check => 
        check.name.startsWith('Required field:')
      );
      expect(requiredFieldChecks.some(check => !check.passed)).toBe(true);
    });

    it('should fail validation for invalid amount', async () => {
      const transaction: PiTransaction = {
        transactionId: 'tx_test',
        fromAddress: 'pi_wallet_sender',
        toAddress: 'pi_wallet_recipient',
        amount: -5 // Invalid negative amount
      };

      const result = await processor.validateTransaction(transaction);

      expect(result.isValid).toBe(false);
      
      const amountCheck = result.checks.find(check => check.name === 'Amount validation');
      expect(amountCheck?.passed).toBe(false);
    });

    it('should fail validation for amount exceeding maximum', async () => {
      const transaction: PiTransaction = {
        transactionId: 'tx_test',
        fromAddress: 'pi_wallet_sender',
        toAddress: 'pi_wallet_recipient',
        amount: 50000 // Exceeds default max of 10000
      };

      const result = await processor.validateTransaction(transaction);

      expect(result.isValid).toBe(false);
      
      const amountCheck = result.checks.find(check => check.name === 'Amount validation');
      expect(amountCheck?.passed).toBe(false);
    });

    it('should fail validation for memo exceeding length limit', async () => {
      const longMemo = 'a'.repeat(300); // Exceeds default limit of 256
      const transaction: PiTransaction = {
        transactionId: 'tx_test',
        fromAddress: 'pi_wallet_sender',
        toAddress: 'pi_wallet_recipient',
        amount: 10,
        memo: longMemo
      };

      const result = await processor.validateTransaction(transaction);

      expect(result.isValid).toBe(false);
      
      const memoCheck = result.checks.find(check => check.name === 'Memo validation');
      expect(memoCheck?.passed).toBe(false);
    });

    it('should validate different Pi address formats', async () => {
      const validAddresses = [
        'pi_wallet_user_123',
        '0x1234567890abcdef1234567890abcdef12345678',
        'user_address_456'
      ];

      for (const address of validAddresses) {
        const transaction: PiTransaction = {
          transactionId: `tx_test_${address}`,
          fromAddress: address,
          toAddress: 'pi_wallet_recipient',
          amount: 10
        };

        const result = await processor.validateTransaction(transaction);
        
        const fromAddressCheck = result.checks.find(check => check.name === 'From address format');
        expect(fromAddressCheck?.passed).toBe(true);
      }
    });

    it('should fail validation for invalid address formats', async () => {
      const invalidAddresses = ['', 'x', '123'];

      for (const address of invalidAddresses) {
        const transaction: PiTransaction = {
          transactionId: `tx_test_${Math.random()}`,
          fromAddress: address,
          toAddress: 'pi_wallet_recipient',
          amount: 10
        };

        const result = await processor.validateTransaction(transaction);
        
        const fromAddressCheck = result.checks.find(check => check.name === 'From address format');
        expect(fromAddressCheck?.passed).toBe(false);
      }
    });

    it('should detect duplicate transaction IDs', async () => {
      const transaction1: PiTransaction = {
        transactionId: 'tx_duplicate',
        fromAddress: 'pi_wallet_sender',
        toAddress: 'pi_wallet_recipient',
        amount: 10
      };

      const transaction2: PiTransaction = {
        transactionId: 'tx_duplicate', // Same ID
        fromAddress: 'pi_wallet_sender2',
        toAddress: 'pi_wallet_recipient2',
        amount: 20
      };

      // Process first transaction
      await processor.processTransaction(transaction1);

      // Validate second transaction with same ID
      const result = await processor.validateTransaction(transaction2);

      expect(result.isValid).toBe(false);
      
      const duplicateCheck = result.checks.find(check => check.name === 'Duplicate transaction check');
      expect(duplicateCheck?.passed).toBe(false);
    });
  });

  describe('Transaction Processing', () => {
    beforeEach(async () => {
      await processor.initialize(mockConfig);
    });

    it('should process valid transaction successfully', async () => {
      const transaction: PiTransaction = {
        transactionId: 'tx_process_test_123',
        fromAddress: 'pi_wallet_sender_123',
        toAddress: 'pi_wallet_recipient_456',
        amount: 25.75,
        memo: 'Test payment processing',
        metadata: { purpose: 'integration_test' }
      };

      const result = await processor.processTransaction(transaction);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe(transaction.transactionId);
      expect(result.transactionHash).toBeDefined();
      expect(result.confirmations).toBeGreaterThan(0);
      expect(result.status).toBe('confirmed');
      expect(result.auditCid).toBeDefined();
      expect(result.qerberosSignature).toBeDefined();
    });

    it('should fail processing for invalid transaction', async () => {
      const invalidTransaction: PiTransaction = {
        transactionId: '',
        fromAddress: '',
        toAddress: '',
        amount: -10
      };

      const result = await processor.processTransaction(invalidTransaction);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction validation failed');
    });

    it('should track transaction status correctly', async () => {
      const transaction: PiTransaction = {
        transactionId: 'tx_status_test',
        fromAddress: 'pi_wallet_sender',
        toAddress: 'pi_wallet_recipient',
        amount: 15
      };

      // Initially not found
      expect(processor.getTransactionStatus(transaction.transactionId)).toBe('not_found');

      // Process transaction
      const result = await processor.processTransaction(transaction);
      expect(result.success).toBe(true);

      // Should be completed after processing
      expect(processor.getTransactionStatus(transaction.transactionId)).toBe('completed');

      // Should be able to retrieve result
      const retrievedResult = processor.getTransactionResult(transaction.transactionId);
      expect(retrievedResult).toBeDefined();
      expect(retrievedResult?.transactionId).toBe(transaction.transactionId);
    });

    it('should handle processing errors gracefully', async () => {
      // Mock a processing failure
      const originalMethod = processor['submitToNetwork'];
      processor['submitToNetwork'] = vi.fn().mockResolvedValue({
        stepId: 'submit_test',
        stepName: 'Network Submission',
        timestamp: new Date(),
        status: 'failed',
        data: {},
        duration: 100,
        error: 'Network error'
      });

      const transaction: PiTransaction = {
        transactionId: 'tx_error_test',
        fromAddress: 'pi_wallet_sender',
        toAddress: 'pi_wallet_recipient',
        amount: 10
      };

      const result = await processor.processTransaction(transaction);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network submission failed');

      // Restore original method
      processor['submitToNetwork'] = originalMethod;
    });

    it('should fail processing when processor not initialized', async () => {
      const uninitializedProcessor = new PiTransactionProcessor();
      
      const transaction: PiTransaction = {
        transactionId: 'tx_test',
        fromAddress: 'sender',
        toAddress: 'recipient',
        amount: 10
      };

      const result = await uninitializedProcessor.processTransaction(transaction);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pi Transaction Processor not initialized');
    });
  });

  describe('Validation Rules Management', () => {
    beforeEach(async () => {
      await processor.initialize(mockConfig);
    });

    it('should allow updating validation rules', () => {
      const newRules: Partial<TransactionValidationRules> = {
        minAmount: 1,
        maxAmount: 5000,
        allowedMemoLength: 128
      };

      processor.updateValidationRules(newRules);

      // Test with transaction that would fail old rules but pass new ones
      const transaction: PiTransaction = {
        transactionId: 'tx_rules_test',
        fromAddress: 'pi_wallet_sender',
        toAddress: 'pi_wallet_recipient',
        amount: 0.5 // Below new minimum
      };

      // This should now fail with the new rules
      processor.validateTransaction(transaction).then(result => {
        const amountCheck = result.checks.find(check => check.name === 'Amount validation');
        expect(amountCheck?.passed).toBe(false);
      });
    });

    it('should respect blacklisted addresses', async () => {
      const blacklistedAddress = 'pi_wallet_blacklisted';
      
      processor.updateValidationRules({
        blacklistedAddresses: [blacklistedAddress]
      });

      const transaction: PiTransaction = {
        transactionId: 'tx_blacklist_test',
        fromAddress: blacklistedAddress,
        toAddress: 'pi_wallet_recipient',
        amount: 10
      };

      const result = await processor.validateTransaction(transaction);

      expect(result.isValid).toBe(false);
      
      const blacklistCheck = result.checks.find(check => check.name === 'Address blacklist check');
      expect(blacklistCheck?.passed).toBe(false);
    });
  });

  describe('Transaction Statistics', () => {
    beforeEach(async () => {
      await processor.initialize(mockConfig);
    });

    it('should track pending and completed transaction counts', async () => {
      expect(processor.getPendingTransactionsCount()).toBe(0);
      expect(processor.getCompletedTransactionsCount()).toBe(0);

      // Process a few transactions
      const transactions: PiTransaction[] = [
        {
          transactionId: 'tx_stats_1',
          fromAddress: 'pi_wallet_sender1',
          toAddress: 'pi_wallet_recipient1',
          amount: 10
        },
        {
          transactionId: 'tx_stats_2',
          fromAddress: 'pi_wallet_sender2',
          toAddress: 'pi_wallet_recipient2',
          amount: 20
        }
      ];

      for (const tx of transactions) {
        await processor.processTransaction(tx);
      }

      expect(processor.getPendingTransactionsCount()).toBe(0);
      expect(processor.getCompletedTransactionsCount()).toBe(2);
    });

    it('should handle transaction not found correctly', () => {
      const result = processor.getTransactionResult('non_existent_tx');
      expect(result).toBeUndefined();

      const status = processor.getTransactionStatus('non_existent_tx');
      expect(status).toBe('not_found');
    });
  });

  describe('Health Monitoring', () => {
    it('should report unhealthy when not initialized', async () => {
      const health = await processor.validateHealth();

      expect(health.isValid).toBe(false);
      expect(health.checks).toHaveLength(1);
      expect(health.checks[0].passed).toBe(false); // Initialization
      expect(health.summary).toContain('issues detected');
    });

    it('should report healthy after successful initialization', async () => {
      await processor.initialize(mockConfig);
      
      const health = await processor.validateHealth();

      expect(health.isValid).toBe(true);
      expect(health.checks).toHaveLength(3);
      expect(health.checks.every(check => check.passed)).toBe(true);
      expect(health.summary).toBe('Transaction processor healthy');
    });

    it('should include all required health checks', async () => {
      await processor.initialize(mockConfig);
      
      const health = await processor.validateHealth();

      const checkNames = health.checks.map(check => check.name);
      expect(checkNames).toContain('Processor Initialization');
      expect(checkNames).toContain('Qwallet Connectivity');
      expect(checkNames).toContain('Pi Network Connectivity');
    });

    it('should handle health check errors gracefully', async () => {
      await processor.initialize(mockConfig);
      
      // Mock a health check failure
      const originalMethod = processor['checkQwalletHealth'];
      processor['checkQwalletHealth'] = vi.fn().mockRejectedValue(new Error('Health check failed'));

      const health = await processor.validateHealth();

      expect(health.isValid).toBe(false);
      expect(health.summary).toBe('Transaction processor health check failed');

      // Restore original method
      processor['checkQwalletHealth'] = originalMethod;
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await processor.initialize(mockConfig);
    });

    it('should handle transaction preparation errors', async () => {
      // Mock a preparation failure
      const originalMethod = processor['prepareTransaction'];
      processor['prepareTransaction'] = vi.fn().mockResolvedValue({
        stepId: 'prepare_test',
        stepName: 'Transaction Preparation',
        timestamp: new Date(),
        status: 'failed',
        data: {},
        duration: 100,
        error: 'Preparation failed'
      });

      const transaction: PiTransaction = {
        transactionId: 'tx_prep_error',
        fromAddress: 'pi_wallet_sender',
        toAddress: 'pi_wallet_recipient',
        amount: 10
      };

      const result = await processor.processTransaction(transaction);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction preparation failed');

      // Restore original method
      processor['prepareTransaction'] = originalMethod;
    });

    it('should handle confirmation errors', async () => {
      // Mock a confirmation failure
      const originalMethod = processor['waitForConfirmation'];
      processor['waitForConfirmation'] = vi.fn().mockResolvedValue({
        stepId: 'confirm_test',
        stepName: 'Confirmation Waiting',
        timestamp: new Date(),
        status: 'failed',
        data: { confirmations: 0 },
        duration: 100,
        error: 'Confirmation timeout'
      });

      const transaction: PiTransaction = {
        transactionId: 'tx_confirm_error',
        fromAddress: 'pi_wallet_sender',
        toAddress: 'pi_wallet_recipient',
        amount: 10
      };

      const result = await processor.processTransaction(transaction);

      expect(result.success).toBe(true); // Should still succeed even if confirmation fails
      expect(result.status).toBe('pending'); // But status should be pending

      // Restore original method
      processor['waitForConfirmation'] = originalMethod;
    });

    it('should handle validation errors gracefully', async () => {
      // Mock a validation error
      const originalMethod = processor['validatePiAddress'];
      processor['validatePiAddress'] = vi.fn().mockRejectedValue(new Error('Address validation failed'));

      const transaction: PiTransaction = {
        transactionId: 'tx_validation_error',
        fromAddress: 'pi_wallet_sender',
        toAddress: 'pi_wallet_recipient',
        amount: 10
      };

      const result = await processor.validateTransaction(transaction);

      expect(result.isValid).toBe(false);
      expect(result.summary).toBe('Transaction validation error');

      // Restore original method
      processor['validatePiAddress'] = originalMethod;
    });
  });

  describe('Integration with Qwallet', () => {
    beforeEach(async () => {
      await processor.initialize(mockConfig);
    });

    it('should configure for testnet environment', async () => {
      const health = await processor.validateHealth();
      
      expect(health.isValid).toBe(true);
      // Verify testnet configuration is working
      expect(health.checks.find(check => check.name === 'Qwallet Connectivity')?.passed).toBe(true);
    });

    it('should handle different transaction types', async () => {
      const transactionTypes = [
        {
          transactionId: 'tx_payment',
          fromAddress: 'pi_wallet_sender',
          toAddress: 'pi_wallet_recipient',
          amount: 10,
          memo: 'Payment transaction'
        },
        {
          transactionId: 'tx_transfer',
          fromAddress: 'pi_wallet_sender',
          toAddress: 'pi_wallet_recipient',
          amount: 5.5,
          metadata: { type: 'transfer' }
        },
        {
          transactionId: 'tx_micropayment',
          fromAddress: 'pi_wallet_sender',
          toAddress: 'pi_wallet_recipient',
          amount: 0.01 // Minimum amount
        }
      ];

      for (const tx of transactionTypes) {
        const result = await processor.processTransaction(tx);
        expect(result.success).toBe(true);
        expect(result.transactionId).toBe(tx.transactionId);
      }
    });

    it('should generate proper audit trails', async () => {
      const transaction: PiTransaction = {
        transactionId: 'tx_audit_test',
        fromAddress: 'pi_wallet_sender',
        toAddress: 'pi_wallet_recipient',
        amount: 15.25,
        memo: 'Audit trail test'
      };

      const result = await processor.processTransaction(transaction);

      expect(result.success).toBe(true);
      expect(result.auditCid).toBeDefined();
      expect(result.qerberosSignature).toBeDefined();
      expect(result.auditCid).toContain('audit_');
      expect(result.qerberosSignature).toContain('qerberos_sig_');
    });
  });
});