/**
 * Byzantine Fault Tolerance Testing Interfaces
 * Provides fault injection and adversarial security testing capabilities
 */

export interface ByzantineNode {
  nodeId: string;
  address: string;
  port: number;
  region: string;
  status: 'honest' | 'byzantine' | 'offline' | 'recovering';
  behaviorType: ByzantineBehaviorType;
  compromisedSince?: Date;
  maliciousActions: MaliciousAction[];
  consensusParticipation: boolean;
  trustScore: number; // 0-100, decreases with malicious behavior
}

export type ByzantineBehaviorType = 
  | 'honest'
  | 'silent' // Stops responding
  | 'lying' // Sends false information
  | 'equivocating' // Sends different messages to different nodes
  | 'delaying' // Delays responses
  | 'flooding' // Sends excessive messages
  | 'selfish' // Only acts in self-interest
  | 'random' // Random malicious behavior
  | 'coordinated'; // Coordinates with other byzantine nodes

export interface MaliciousAction {
  actionId: string;
  timestamp: Date;
  type: 'false_vote' | 'double_spend' | 'message_delay' | 'message_drop' | 'fake_consensus' | 'data_corruption';
  target?: string; // Target node or transaction
  impact: 'low' | 'medium' | 'high' | 'critical';
  detected: boolean;
  mitigated: boolean;
  description: string;
}

export interface FaultInjectionScenario {
  scenarioId: string;
  name: string;
  description: string;
  byzantineNodeCount: number;
  totalNodeCount: number;
  byzantinePercentage: number;
  duration: number; // milliseconds
  behaviors: ByzantineBehaviorType[];
  expectedOutcome: 'system_resilient' | 'partial_degradation' | 'system_failure';
  consensusType: 'pbft' | 'raft' | 'pos' | 'pow';
}

export interface ConsensusValidation {
  consensusRound: number;
  timestamp: Date;
  participatingNodes: string[];
  byzantineNodes: string[];
  proposedValue: any;
  finalValue: any;
  consensusReached: boolean;
  consensusTime: number; // milliseconds
  byzantineDetected: string[];
  safetyViolation: boolean;
  livenessViolation: boolean;
}

export interface ByzantineFaultToleranceResult {
  scenarioId: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalNodes: number;
  byzantineNodes: number;
  byzantinePercentage: number;
  consensusRounds: ConsensusValidation[];
  maliciousActions: MaliciousAction[];
  systemResilience: {
    safetyMaintained: boolean;
    livenessMaintained: boolean;
    consensusAchieved: boolean;
    byzantineDetectionRate: number; // percentage
    falsePositiveRate: number; // percentage
  };
  performanceImpact: {
    latencyIncrease: number; // percentage
    throughputDecrease: number; // percentage
    resourceOverhead: number; // percentage
  };
  securityMetrics: {
    attacksDetected: number;
    attacksMitigated: number;
    dataIntegrityMaintained: boolean;
    networkPartitionTolerance: boolean;
  };
  recommendations: string[];
  error?: string;
}

export interface AdversarialSecurityTest {
  testId: string;
  name: string;
  attackType: AttackType;
  attackVector: AttackVector;
  sophistication: 'basic' | 'intermediate' | 'advanced' | 'nation_state';
  targetNodes: string[];
  attackDuration: number;
  expectedDetectionTime: number;
  expectedMitigationTime: number;
}

export type AttackType = 
  | 'sybil_attack'
  | 'eclipse_attack'
  | 'long_range_attack'
  | 'nothing_at_stake'
  | 'grinding_attack'
  | 'selfish_mining'
  | 'double_spending'
  | 'consensus_delay'
  | 'network_partition'
  | 'ddos_attack';

export type AttackVector = 
  | 'network_layer'
  | 'consensus_layer'
  | 'application_layer'
  | 'economic_incentives'
  | 'social_engineering'
  | 'cryptographic_weakness';

export interface AdversarialTestResult {
  testId: string;
  attackType: AttackType;
  success: boolean;
  detectionTime?: number;
  mitigationTime?: number;
  systemCompromised: boolean;
  dataLoss: boolean;
  serviceDisruption: number; // percentage
  economicImpact: number; // estimated cost
  lessonsLearned: string[];
  mitigationStrategies: string[];
}

/**
 * Byzantine Fault Tolerance Testing Interface
 * Manages fault injection and adversarial security testing
 */
export interface ByzantineFaultToleranceTesting {
  /**
   * Create and execute a Byzantine fault injection scenario
   */
  executeFaultInjectionScenario(scenario: FaultInjectionScenario): Promise<ByzantineFaultToleranceResult>;

  /**
   * Compromise specific nodes with Byzantine behavior
   */
  compromiseNodes(nodeIds: string[], behaviorType: ByzantineBehaviorType): Promise<boolean>;

  /**
   * Restore compromised nodes to honest behavior
   */
  restoreNodes(nodeIds: string[]): Promise<boolean>;

  /**
   * Execute adversarial security test
   */
  executeAdversarialTest(test: AdversarialSecurityTest): Promise<AdversarialTestResult>;

  /**
   * Validate consensus under Byzantine conditions
   */
  validateConsensusUnderAttack(
    byzantineNodes: string[], 
    consensusRounds: number
  ): Promise<ConsensusValidation[]>;

  /**
   * Simulate coordinated Byzantine attack
   */
  simulateCoordinatedAttack(
    attackingNodes: string[], 
    attackType: AttackType, 
    duration: number
  ): Promise<ByzantineFaultToleranceResult>;

  /**
   * Get current Byzantine node status
   */
  getByzantineNodeStatus(): Promise<ByzantineNode[]>;

  /**
   * Detect Byzantine behavior in the network
   */
  detectByzantineBehavior(): Promise<{
    suspiciousNodes: string[];
    detectionConfidence: number;
    evidenceCollected: MaliciousAction[];
  }>;

  /**
   * Generate comprehensive Byzantine fault tolerance report
   */
  generateBFTReport(timeRange?: { start: Date; end: Date }): Promise<BFTReport>;
}

export interface BFTReport {
  reportId: string;
  generatedAt: Date;
  timeRange: { start: Date; end: Date };
  summary: {
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    averageResilienceScore: number;
  };
  scenarios: ByzantineFaultToleranceResult[];
  adversarialTests: AdversarialTestResult[];
  systemResilience: {
    overallSafetyScore: number;
    overallLivenessScore: number;
    byzantineToleranceThreshold: number;
    actualToleranceAchieved: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  riskAssessment: {
    highRiskVulnerabilities: string[];
    mediumRiskVulnerabilities: string[];
    lowRiskVulnerabilities: string[];
  };
}

/**
 * Consensus Simulator Interface
 * Simulates various consensus mechanisms under Byzantine conditions
 */
export interface ConsensusSimulator {
  /**
   * Initialize consensus with specified parameters
   */
  initializeConsensus(
    nodeCount: number, 
    consensusType: 'pbft' | 'raft' | 'pos' | 'pow',
    byzantineCount: number
  ): Promise<void>;

  /**
   * Execute consensus round
   */
  executeConsensusRound(proposedValue: any): Promise<ConsensusValidation>;

  /**
   * Simulate network partition
   */
  simulateNetworkPartition(partitionGroups: string[][]): Promise<void>;

  /**
   * Heal network partition
   */
  healNetworkPartition(): Promise<void>;

  /**
   * Get consensus statistics
   */
  getConsensusStatistics(): Promise<{
    totalRounds: number;
    successfulRounds: number;
    averageConsensusTime: number;
    byzantineDetectionRate: number;
  }>;
}