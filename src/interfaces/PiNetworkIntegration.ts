import { ValidationResult } from '../types/index.js';

/**
 * Pi Network authentication result
 */
export interface AuthResult {
  success: boolean;
  piUserId: string;
  accessToken: string;
  walletAddress?: string;
  expiresAt: Date;
  error?: string;
}

/**
 * Pi identity linking result
 */
export interface LinkResult {
  success: boolean;
  piUserId: string;
  squidId: string;
  linkId: string;
  linkedAt: Date;
  error?: string;
}

/**
 * Smart contract execution result
 */
export interface ExecutionResult {
  success: boolean;
  transactionHash: string;
  contractAddress: string;
  method: string;
  gasUsed: number;
  result: any;
  error?: string;
}

/**
 * Pi Network transaction
 */
export interface PiTransaction {
  transactionId: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  memo?: string;
  metadata?: Record<string, any>;
}

/**
 * Pi transaction processing result
 */
export interface TransactionResult {
  success: boolean;
  transactionId: string;
  transactionHash: string;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
  auditCid?: string;
  qerberosSignature?: string;
  error?: string;
}

/**
 * DAO governance vote options
 */
export type VoteOption = 'yes' | 'no' | 'abstain';

/**
 * DAO governance result
 */
export interface GovernanceResult {
  success: boolean;
  proposalId: string;
  vote: VoteOption;
  voterAddress: string;
  transactionHash: string;
  votingPower: number;
  timestamp: Date;
  error?: string;
}

/**
 * Governance validation result
 */
export interface GovernanceValidation {
  isValid: boolean;
  contractAddress: string;
  governanceType: 'dao' | 'multisig' | 'timelock';
  votingMechanism: string;
  participantCount: number;
  quorumThreshold: number;
  currentQuorum: number;
  error?: string;
}

/**
 * Pi Network authentication credentials
 */
export interface PiAuthCredentials {
  apiKey: string;
  appId: string;
  environment: 'sandbox' | 'production';
  walletPrivateKey?: string;
}

/**
 * Pi Wallet authentication parameters
 */
export interface PiWalletAuthParams {
  scopes: string[];
  onIncompletePaymentFound?: (payment: any) => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Core interface for Pi Network integration
 * Handles Pi Wallet authentication, identity linking, and smart contract execution
 */
export interface IPiNetworkIntegration {
  /**
   * Authenticate user with Pi Wallet
   * @param piUserId - Pi Network user identifier
   * @param authParams - Authentication parameters
   * @returns Promise resolving to authentication result
   */
  authenticateWithPiWallet(piUserId: string, authParams?: PiWalletAuthParams): Promise<AuthResult>;

  /**
   * Link Pi Network identity with sQuid identity
   * @param piUserId - Pi Network user identifier
   * @param squidId - sQuid identity identifier
   * @returns Promise resolving to linking result
   */
  linkPiIdentity(piUserId: string, squidId: string): Promise<LinkResult>;

  /**
   * Execute smart contract on Pi Network
   * @param contractAddress - Smart contract address
   * @param method - Contract method to execute
   * @param params - Method parameters
   * @returns Promise resolving to execution result
   */
  executeSmartContract(contractAddress: string, method: string, params: any[]): Promise<ExecutionResult>;

  /**
   * Process Pi Network transaction through Qwallet
   * @param transaction - Transaction to process
   * @returns Promise resolving to transaction result
   */
  processTransaction(transaction: PiTransaction): Promise<TransactionResult>;

  /**
   * Execute DAO governance vote on Pi Network
   * @param proposalId - Governance proposal identifier
   * @param vote - Vote option
   * @param piUserId - Pi Network user identifier
   * @returns Promise resolving to governance result
   */
  executeDaoGovernanceVote(proposalId: string, vote: VoteOption, piUserId: string): Promise<GovernanceResult>;

  /**
   * Validate Pi Network contract governance capabilities
   * @param contractAddress - Contract address to validate
   * @returns Promise resolving to governance validation
   */
  validatePiContractGovernance(contractAddress: string): Promise<GovernanceValidation>;

  /**
   * Initialize Pi Network integration with credentials
   * @param credentials - Pi Network API credentials
   * @returns Promise resolving when initialization is complete
   */
  initialize(credentials: PiAuthCredentials): Promise<void>;

  /**
   * Get current Pi Network connection status
   * @returns Promise resolving to connection status
   */
  getConnectionStatus(): Promise<{ connected: boolean; network: string; blockHeight?: number }>;

  /**
   * Validate Pi Network integration health
   * @returns Promise resolving to validation result
   */
  validateHealth(): Promise<ValidationResult>;
}