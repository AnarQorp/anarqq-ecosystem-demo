import { DecentralizationMetrics } from '../types/index.js';

/**
 * QNET Phase 2 node information
 */
export interface QNETNode {
  id: string;
  address: string;
  location: {
    country: string;
    region: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  status: 'active' | 'inactive' | 'degraded' | 'unreachable';
  resources: {
    cpu: number; // CPU usage percentage (0-100)
    memory: number; // Memory usage percentage (0-100)
    network: {
      latency: number; // Network latency in ms
      bandwidth: number; // Available bandwidth in Mbps
    };
  };
  consensus: {
    participationRate: number; // Consensus participation rate (0-1)
    lastHeartbeat: Date;
    blockHeight: number;
  };
  capabilities: string[]; // List of supported capabilities
  version: string;
}

/**
 * Network partition information
 */
export interface NetworkPartition {
  id: string;
  nodes: string[]; // Node IDs in this partition
  isolatedAt: Date;
  duration: number; // Duration in milliseconds
  resolved: boolean;
  impact: {
    affectedServices: string[];
    dataLoss: boolean;
    consensusImpact: number; // Impact on consensus (0-1)
  };
}

/**
 * Scaling trigger configuration
 */
export interface ScalingTrigger {
  type: 'cpu' | 'memory' | 'network' | 'consensus' | 'manual';
  threshold: number;
  action: 'scale_up' | 'scale_down' | 'redistribute';
  cooldownMs: number; // Minimum time between scaling actions
}

/**
 * Scaling action result
 */
export interface ScalingResult {
  triggerId: string;
  action: 'scale_up' | 'scale_down' | 'redistribute';
  nodesAdded: QNETNode[];
  nodesRemoved: string[];
  nodesRebalanced: string[];
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * Decentralization health assessment
 */
export interface DecentralizationHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  nodeDistribution: {
    total: number;
    active: number;
    geographic: {
      countries: number;
      regions: number;
      minNodesPerRegion: number;
    };
  };
  consensus: {
    health: number; // 0-1 scale
    participationRate: number;
    faultTolerance: number; // Byzantine fault tolerance capacity
  };
  network: {
    connectivity: number; // Overall network connectivity (0-1)
    partitions: NetworkPartition[];
    averageLatency: number;
  };
  singlePointsOfFailure: {
    count: number;
    critical: string[]; // List of critical single points
    mitigations: string[];
  };
}

/**
 * Network partition tolerance test configuration
 */
export interface PartitionToleranceTest {
  id: string;
  type: 'random' | 'geographic' | 'targeted' | 'byzantine';
  duration: number; // Test duration in milliseconds
  affectedNodes: string[]; // Nodes to partition/isolate
  expectedBehavior: {
    consensusContinues: boolean;
    dataAvailability: boolean;
    serviceAvailability: string[]; // Services that should remain available
  };
}

/**
 * Partition tolerance test result
 */
export interface PartitionToleranceResult {
  testId: string;
  success: boolean;
  duration: number;
  actualBehavior: {
    consensusContinued: boolean;
    dataWasAvailable: boolean;
    servicesAvailable: string[];
    recoveryTime: number; // Time to recover after partition resolved
  };
  metrics: {
    consensusHealth: number[];
    networkLatency: number[];
    errorRate: number[];
  };
  violations: string[];
}

/**
 * Core interface for decentralization validation
 * Monitors node health and validates network partition tolerance
 */
export interface IDecentralizationValidation {
  /**
   * Discover and register QNET Phase 2 nodes
   * @returns Promise resolving to discovered nodes
   */
  discoverNodes(): Promise<QNETNode[]>;

  /**
   * Monitor health of all registered nodes
   * @returns Promise resolving to current node health status
   */
  monitorNodeHealth(): Promise<QNETNode[]>;

  /**
   * Collect decentralization metrics
   * @returns Promise resolving to decentralization metrics
   */
  collectDecentralizationMetrics(): Promise<DecentralizationMetrics>;

  /**
   * Assess overall decentralization health
   * @returns Promise resolving to health assessment
   */
  assessDecentralizationHealth(): Promise<DecentralizationHealth>;

  /**
   * Validate network partition tolerance
   * @param test - Partition tolerance test configuration
   * @returns Promise resolving to test result
   */
  testPartitionTolerance(test: PartitionToleranceTest): Promise<PartitionToleranceResult>;

  /**
   * Simulate network partition
   * @param nodeIds - Nodes to partition/isolate
   * @param duration - Partition duration in milliseconds
   * @returns Promise resolving to partition information
   */
  simulateNetworkPartition(nodeIds: string[], duration: number): Promise<NetworkPartition>;

  /**
   * Resolve network partition
   * @param partitionId - Partition ID to resolve
   * @returns Promise resolving when partition is resolved
   */
  resolveNetworkPartition(partitionId: string): Promise<void>;

  /**
   * Trigger dynamic node scaling
   * @param trigger - Scaling trigger configuration
   * @returns Promise resolving to scaling result
   */
  triggerScaling(trigger: ScalingTrigger): Promise<ScalingResult>;

  /**
   * Validate QNET Phase 2 distributed operation
   * @param minNodes - Minimum required nodes
   * @param maxLatency - Maximum acceptable latency
   * @returns Promise resolving to validation result
   */
  validateDistributedOperation(
    minNodes: number, 
    maxLatency: number
  ): Promise<{
    isValid: boolean;
    nodeCount: number;
    averageLatency: number;
    violations: string[];
  }>;

  /**
   * Detect single points of failure
   * @returns Promise resolving to single points of failure analysis
   */
  detectSinglePointsOfFailure(): Promise<{
    count: number;
    critical: string[];
    recommendations: string[];
  }>;

  /**
   * Start continuous decentralization monitoring
   * @param intervalMs - Monitoring interval in milliseconds
   * @returns Promise resolving when monitoring starts
   */
  startMonitoring(intervalMs: number): Promise<void>;

  /**
   * Stop decentralization monitoring
   * @returns Promise resolving when monitoring stops
   */
  stopMonitoring(): Promise<void>;

  /**
   * Get current scaling configuration
   * @returns Current scaling triggers
   */
  getScalingTriggers(): ScalingTrigger[];

  /**
   * Update scaling configuration
   * @param triggers - New scaling triggers
   * @returns Promise resolving when updated
   */
  updateScalingTriggers(triggers: ScalingTrigger[]): Promise<void>;
}