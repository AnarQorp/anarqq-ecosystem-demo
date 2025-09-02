import { ScenarioResult, ValidationResult } from '../types/index.js';

/**
 * Parameters for identity flow scenario execution
 */
export interface IdentityFlowParams {
  userId?: string;
  piWalletEnabled: boolean;
  squidRegistration: boolean;
  qerberosValidation: boolean;
}

/**
 * Parameters for content flow scenario execution
 */
export interface ContentFlowParams {
  userId: string;
  contentType: 'text' | 'image' | 'document';
  contentSize: number;
  enableQInfinityFlow: boolean;
  ipfsStorage: boolean;
}

/**
 * Parameters for DAO flow scenario execution
 */
export interface DaoFlowParams {
  userId: string;
  proposalType: 'governance' | 'funding' | 'technical';
  piNetworkIntegration: boolean;
  qflowExecution: boolean;
}

/**
 * Parameters for social flow scenario execution
 */
export interface SocialFlowParams {
  userId: string;
  communityId: string;
  governanceHub: boolean;
  squidSubIdentities: boolean;
  qonsentPolicies: boolean;
}

/**
 * Core interface for scenario execution engine
 * Handles execution of predefined demo scenarios with validation
 */
export interface IScenarioEngine {
  /**
   * Execute identity flow scenario
   * Demonstrates user registration, Pi Wallet auth, and identity verification
   * @param params - Identity flow parameters
   * @returns Promise resolving to scenario result
   */
  executeIdentityFlow(params: IdentityFlowParams): Promise<ScenarioResult>;

  /**
   * Execute content flow scenario
   * Demonstrates content upload, Q∞ processing, and IPFS storage
   * @param params - Content flow parameters
   * @returns Promise resolving to scenario result
   */
  executeContentFlow(params: ContentFlowParams): Promise<ScenarioResult>;

  /**
   * Execute DAO flow scenario
   * Demonstrates governance proposal, voting, and execution
   * @param params - DAO flow parameters
   * @returns Promise resolving to scenario result
   */
  executeDaoFlow(params: DaoFlowParams): Promise<ScenarioResult>;

  /**
   * Execute social flow scenario
   * Demonstrates Qsocial community interaction and governance
   * @param params - Social flow parameters
   * @returns Promise resolving to scenario result
   */
  executeSocialFlow(params: SocialFlowParams): Promise<ScenarioResult>;

  /**
   * Get available scenarios and their descriptions
   * @returns Array of scenario metadata
   */
  getAvailableScenarios(): ScenarioMetadata[];

  /**
   * Validate scenario parameters before execution
   * @param scenarioType - Type of scenario to validate
   * @param params - Parameters to validate
   * @returns Validation result
   */
  validateScenarioParams(scenarioType: string, params: any): ValidationResult;
}

/**
 * Metadata for available scenarios
 */
export interface ScenarioMetadata {
  type: string;
  name: string;
  description: string;
  estimatedDuration: number;
  requiredModules: string[];
  supportedEnvironments: string[];
}