import { 
  ValidationResult, 
  PerformanceMetrics, 
  DecentralizationMetrics, 
  ScenarioResult 
} from '../types/index.js';

/**
 * Validation gate configuration
 */
export interface ValidationGates {
  performanceGate: {
    maxLatency: number; // milliseconds
    minThroughput: number; // requests per second
    maxErrorRate: number; // percentage (0-1)
  };
  decentralizationGate: {
    minNodes: number;
    maxSinglePointFailures: number;
    minGeographicDistribution: number;
    dynamicNodeScaling: boolean;
    qnetPhase2ScalingThresholds: {
      cpuThreshold: number;
      memoryThreshold: number;
      networkLatencyThreshold: number;
    };
  };
  integrityGate: {
    dataIntegrityCheck: boolean;
    auditTrailCompleteness: boolean;
    qerberosSignatureValidation: boolean;
  };
}

/**
 * Integrity validation result
 */
export interface IntegrityResult {
  dataIntegrity: boolean;
  auditTrailComplete: boolean;
  qerberosSignatureValid: boolean;
  contentId?: string;
  auditCid?: string;
  errors: string[];
}

/**
 * Core interface for validation management
 * Monitors performance metrics and validates outputs
 */
export interface IValidationManager {
  /**
   * Validate scenario execution against all gates
   * @param scenarioResult - Result of scenario execution
   * @returns Promise resolving to validation result
   */
  validateScenarioExecution(scenarioResult: ScenarioResult): Promise<ValidationResult>;

  /**
   * Validate performance metrics against thresholds
   * @param metrics - Performance metrics to validate
   * @returns Promise resolving to validation result
   */
  validatePerformanceMetrics(metrics: PerformanceMetrics): Promise<ValidationResult>;

  /**
   * Validate decentralization requirements
   * @param metrics - Decentralization metrics to validate
   * @returns Promise resolving to validation result
   */
  validateDecentralization(metrics: DecentralizationMetrics): Promise<ValidationResult>;

  /**
   * Validate data integrity and audit trails
   * @param contentId - Content identifier to validate
   * @param auditCid - Audit trail CID to verify
   * @returns Promise resolving to integrity validation result
   */
  validateIntegrity(contentId: string, auditCid: string): Promise<IntegrityResult>;

  /**
   * Validate Qerberos signatures
   * @param signature - Qerberos signature to validate
   * @param data - Original data that was signed
   * @returns Promise resolving to signature validation result
   */
  validateQerberosSignature(signature: string, data: any): Promise<boolean>;

  /**
   * Get current validation gate configuration
   * @returns Current validation gates
   */
  getValidationGates(): ValidationGates;

  /**
   * Update validation gate configuration
   * @param gates - New validation gate configuration
   * @returns Promise resolving when update is complete
   */
  updateValidationGates(gates: Partial<ValidationGates>): Promise<void>;

  /**
   * Collect real-time performance metrics
   * @returns Promise resolving to current performance metrics
   */
  collectPerformanceMetrics(): Promise<PerformanceMetrics>;

  /**
   * Collect decentralization metrics
   * @returns Promise resolving to current decentralization metrics
   */
  collectDecentralizationMetrics(): Promise<DecentralizationMetrics>;

  /**
   * Start continuous monitoring
   * @param intervalMs - Monitoring interval in milliseconds
   * @returns Promise resolving when monitoring starts
   */
  startMonitoring(intervalMs: number): Promise<void>;

  /**
   * Stop continuous monitoring
   * @returns Promise resolving when monitoring stops
   */
  stopMonitoring(): Promise<void>;
}