import { PerformanceMetrics, DecentralizationMetrics } from '../types/index.js';

/**
 * Validation gate configuration interface
 * Defines configurable performance thresholds for pass/fail determination
 */
export interface IValidationGates {
  /**
   * Validate performance metrics against configured thresholds
   * @param metrics - Performance metrics to validate
   * @returns Promise resolving to validation gate result
   */
  validatePerformanceGate(metrics: PerformanceMetrics): Promise<ValidationGateResult>;

  /**
   * Validate decentralization metrics against configured thresholds
   * @param metrics - Decentralization metrics to validate
   * @returns Promise resolving to validation gate result
   */
  validateDecentralizationGate(metrics: DecentralizationMetrics): Promise<ValidationGateResult>;

  /**
   * Validate integrity requirements
   * @param auditCid - Audit trail CID
   * @param qerberosSignature - Qerberos signature
   * @param moduleResults - Module execution results
   * @returns Promise resolving to validation gate result
   */
  validateIntegrityGate(
    auditCid: string, 
    qerberosSignature: string, 
    moduleResults: any[]
  ): Promise<ValidationGateResult>;

  /**
   * Run all validation gates and determine overall pass/fail status
   * @param executionData - Complete execution data for validation
   * @returns Promise resolving to overall validation result
   */
  validateAllGates(executionData: ExecutionValidationData): Promise<OverallValidationResult>;

  /**
   * Update validation gate configuration
   * @param config - New validation gate configuration
   * @returns Promise resolving when configuration is updated
   */
  updateConfiguration(config: ValidationGateConfig): Promise<void>;

  /**
   * Get current validation gate configuration
   * @returns Current validation gate configuration
   */
  getConfiguration(): ValidationGateConfig;
}

/**
 * Validation gate configuration
 */
export interface ValidationGateConfig {
  performanceGate: {
    maxLatency: number; // milliseconds
    minThroughput: number; // requests per second
    maxErrorRate: number; // percentage (0-1)
    minAvailability: number; // percentage (0-1)
  };
  
  decentralizationGate: {
    minNodes: number;
    maxSinglePointFailures: number;
    minGeographicDistribution: number;
    requireNetworkPartitionTolerance: boolean;
    minConsensusHealth: number; // percentage (0-1)
  };
  
  integrityGate: {
    requireAuditCid: boolean;
    requireQerberosSignature: boolean;
    maxModuleFailures: number;
    requireDataIntegrityCheck: boolean;
  };
  
  // QNET Phase 2 specific thresholds
  qnetPhase2Gate: {
    minDynamicNodes: number;
    maxScalingLatency: number; // milliseconds
    minResourceUtilization: number; // percentage (0-1)
    maxResourceUtilization: number; // percentage (0-1)
  };
}

/**
 * Individual validation gate result
 */
export interface ValidationGateResult {
  gateName: string;
  passed: boolean;
  score: number; // 0-1, where 1 is perfect
  violations: ValidationViolation[];
  warnings: ValidationWarning[];
  metrics: Record<string, number>;
  timestamp: Date;
}

/**
 * Overall validation result combining all gates
 */
export interface OverallValidationResult {
  overallPassed: boolean;
  overallScore: number; // 0-1, weighted average of all gates
  gateResults: ValidationGateResult[];
  criticalViolations: ValidationViolation[];
  allWarnings: ValidationWarning[];
  executionId: string;
  timestamp: Date;
  recommendation: ValidationRecommendation;
}

/**
 * Validation violation details
 */
export interface ValidationViolation {
  type: 'performance' | 'decentralization' | 'integrity' | 'qnet-scaling';
  severity: 'critical' | 'major' | 'minor';
  message: string;
  actualValue: number | string | boolean;
  expectedValue: number | string | boolean;
  threshold: number | string | boolean;
  impact: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  type: 'performance' | 'decentralization' | 'integrity' | 'qnet-scaling';
  message: string;
  suggestion: string;
  actualValue: number | string | boolean;
  recommendedValue: number | string | boolean;
}

/**
 * Validation recommendation
 */
export interface ValidationRecommendation {
  action: 'proceed' | 'investigate' | 'fix_critical' | 'optimize';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestedFixes: string[];
  estimatedImpact: string;
}

/**
 * Execution data for validation
 */
export interface ExecutionValidationData {
  executionId: string;
  performanceMetrics: PerformanceMetrics;
  decentralizationMetrics: DecentralizationMetrics;
  auditCid: string;
  qerberosSignature: string;
  moduleResults: any[];
  environment: string;
  scenarioType: string;
  duration: number;
}