/**
 * Types of chaos experiments
 */
export type ChaosExperimentType = 
  | 'network_partition' 
  | 'node_failure' 
  | 'resource_exhaustion' 
  | 'latency_injection' 
  | 'packet_loss' 
  | 'byzantine_failure'
  | 'storage_failure'
  | 'consensus_disruption';

/**
 * Chaos experiment configuration
 */
export interface ChaosExperiment {
  id: string;
  name: string;
  type: ChaosExperimentType;
  description: string;
  duration: number; // Duration in milliseconds
  targets: {
    nodeIds?: string[];
    moduleIds?: string[];
    services?: string[];
    percentage?: number; // Percentage of targets to affect
  };
  parameters: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    [key: string]: any; // Experiment-specific parameters
  };
  expectedBehavior: {
    systemShouldRecover: boolean;
    maxRecoveryTime: number; // Maximum acceptable recovery time in ms
    criticalServicesShouldContinue: string[];
    acceptableDataLoss: boolean;
    consensusShouldContinue: boolean;
  };
  safeguards: {
    maxDuration: number; // Maximum duration before auto-abort
    abortConditions: string[];
    rollbackProcedure: string[];
  };
}

/**
 * Chaos experiment execution result
 */
export interface ChaosExperimentResult {
  experimentId: string;
  status: 'success' | 'failure' | 'partial' | 'aborted';
  startTime: Date;
  endTime: Date;
  actualDuration: number;
  actualBehavior: {
    systemRecovered: boolean;
    recoveryTime: number;
    servicesAffected: string[];
    servicesContinued: string[];
    dataLossOccurred: boolean;
    consensusContinued: boolean;
  };
  metrics: {
    performanceImpact: {
      latencyIncrease: number; // Percentage increase
      throughputDecrease: number; // Percentage decrease
      errorRateIncrease: number; // Percentage increase
    };
    systemHealth: {
      beforeExperiment: number; // Health score 0-1
      duringExperiment: number;
      afterRecovery: number;
    };
    networkMetrics: {
      partitionedNodes: string[];
      isolatedServices: string[];
      connectivityLoss: number; // Percentage
    };
  };
  violations: string[];
  lessons: string[];
  recommendations: string[];
}

/**
 * Fault injection configuration
 */
export interface FaultInjection {
  id: string;
  type: 'network' | 'cpu' | 'memory' | 'disk' | 'process' | 'consensus';
  target: string; // Node ID, service name, etc.
  parameters: {
    intensity: number; // 0-1 scale
    pattern: 'constant' | 'intermittent' | 'gradual' | 'spike';
    [key: string]: any;
  };
  duration: number;
  autoRevert: boolean;
}

/**
 * System recovery validation
 */
export interface RecoveryValidation {
  experimentId: string;
  recoveryStartTime: Date;
  recoveryEndTime?: Date;
  recoverySteps: {
    step: string;
    timestamp: Date;
    success: boolean;
    duration: number;
    details: string;
  }[];
  finalState: {
    allNodesHealthy: boolean;
    allServicesOperational: boolean;
    dataIntegrityMaintained: boolean;
    consensusRestored: boolean;
    performanceRestored: boolean;
  };
  issues: string[];
  manualInterventionRequired: boolean;
}

/**
 * Resilience test suite
 */
export interface ResilienceTestSuite {
  id: string;
  name: string;
  description: string;
  experiments: ChaosExperiment[];
  executionOrder: 'sequential' | 'parallel' | 'random';
  cooldownBetweenExperiments: number; // Milliseconds
  abortOnFirstFailure: boolean;
  successCriteria: {
    minSuccessRate: number; // Percentage of experiments that must succeed
    maxTotalDuration: number; // Maximum total execution time
    requiredRecoveryRate: number; // Percentage of experiments that must recover
  };
}

/**
 * Resilience test suite result
 */
export interface ResilienceTestSuiteResult {
  suiteId: string;
  status: 'success' | 'failure' | 'partial' | 'aborted';
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  experimentResults: ChaosExperimentResult[];
  overallMetrics: {
    successRate: number;
    recoveryRate: number;
    averageRecoveryTime: number;
    systemResilienceScore: number; // 0-1 scale
  };
  criticalFindings: string[];
  improvementRecommendations: string[];
}

/**
 * Core interface for chaos engineering validation
 * Implements automated fault injection for network partitions and node failures
 */
export interface IChaosEngineering {
  /**
   * Execute a single chaos experiment
   * @param experiment - Chaos experiment configuration
   * @returns Promise resolving to experiment result
   */
  executeExperiment(experiment: ChaosExperiment): Promise<ChaosExperimentResult>;

  /**
   * Execute a resilience test suite
   * @param suite - Test suite configuration
   * @returns Promise resolving to suite result
   */
  executeTestSuite(suite: ResilienceTestSuite): Promise<ResilienceTestSuiteResult>;

  /**
   * Inject specific fault into the system
   * @param fault - Fault injection configuration
   * @returns Promise resolving to injection result
   */
  injectFault(fault: FaultInjection): Promise<{
    injectionId: string;
    success: boolean;
    startTime: Date;
    error?: string;
  }>;

  /**
   * Remove injected fault from the system
   * @param injectionId - ID of the fault injection to remove
   * @returns Promise resolving to removal result
   */
  removeFault(injectionId: string): Promise<{
    success: boolean;
    endTime: Date;
    error?: string;
  }>;

  /**
   * Validate system recovery after chaos experiment
   * @param experimentId - ID of the experiment to validate recovery for
   * @returns Promise resolving to recovery validation result
   */
  validateRecovery(experimentId: string): Promise<RecoveryValidation>;

  /**
   * Simulate network partition between specified nodes
   * @param nodeIds - Nodes to partition
   * @param duration - Partition duration in milliseconds
   * @returns Promise resolving to partition simulation result
   */
  simulateNetworkPartition(nodeIds: string[], duration: number): Promise<{
    partitionId: string;
    affectedNodes: string[];
    startTime: Date;
    expectedEndTime: Date;
  }>;

  /**
   * Simulate node failure
   * @param nodeId - Node to fail
   * @param failureType - Type of failure to simulate
   * @param duration - Failure duration in milliseconds
   * @returns Promise resolving to failure simulation result
   */
  simulateNodeFailure(
    nodeId: string, 
    failureType: 'crash' | 'hang' | 'byzantine' | 'resource_exhaustion',
    duration: number
  ): Promise<{
    failureId: string;
    nodeId: string;
    failureType: string;
    startTime: Date;
    expectedRecoveryTime: Date;
  }>;

  /**
   * Test Byzantine fault tolerance
   * @param byzantineNodeCount - Number of nodes to make Byzantine
   * @param duration - Test duration in milliseconds
   * @returns Promise resolving to Byzantine fault tolerance test result
   */
  testByzantineFaultTolerance(
    byzantineNodeCount: number, 
    duration: number
  ): Promise<{
    testId: string;
    byzantineNodes: string[];
    consensusContinued: boolean;
    networkStability: number; // 0-1 scale
    dataIntegrityMaintained: boolean;
    recoverySuccessful: boolean;
  }>;

  /**
   * Monitor system health during chaos experiments
   * @param experimentId - ID of the experiment to monitor
   * @returns Promise resolving to health monitoring data
   */
  monitorSystemHealth(experimentId: string): Promise<{
    timestamp: Date;
    overallHealth: number; // 0-1 scale
    nodeHealth: Record<string, number>;
    serviceHealth: Record<string, number>;
    networkHealth: number;
    consensusHealth: number;
    alerts: string[];
  }>;

  /**
   * Generate chaos engineering report
   * @param experimentIds - IDs of experiments to include in report
   * @returns Promise resolving to comprehensive report
   */
  generateReport(experimentIds: string[]): Promise<{
    reportId: string;
    generatedAt: Date;
    experiments: ChaosExperimentResult[];
    overallFindings: {
      systemResilienceScore: number;
      criticalVulnerabilities: string[];
      strengthAreas: string[];
      improvementPriorities: string[];
    };
    recommendations: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
    };
  }>;

  /**
   * Create predefined chaos experiment templates
   * @param scenarioType - Type of scenario to create template for
   * @returns Chaos experiment template
   */
  createExperimentTemplate(scenarioType: 
    | 'qnet_node_failure' 
    | 'consensus_disruption' 
    | 'storage_partition' 
    | 'pi_network_isolation'
    | 'dao_governance_stress'
  ): ChaosExperiment;

  /**
   * Validate experiment safety before execution
   * @param experiment - Experiment to validate
   * @returns Promise resolving to safety validation result
   */
  validateExperimentSafety(experiment: ChaosExperiment): Promise<{
    isSafe: boolean;
    risks: string[];
    safeguards: string[];
    recommendations: string[];
  }>;

  /**
   * Abort running experiment
   * @param experimentId - ID of experiment to abort
   * @returns Promise resolving to abort result
   */
  abortExperiment(experimentId: string): Promise<{
    success: boolean;
    abortTime: Date;
    rollbackSteps: string[];
    error?: string;
  }>;

  /**
   * Get active experiments
   * @returns Promise resolving to list of active experiments
   */
  getActiveExperiments(): Promise<{
    experimentId: string;
    type: ChaosExperimentType;
    startTime: Date;
    expectedEndTime: Date;
    status: 'running' | 'recovering' | 'monitoring';
  }[]>;
}