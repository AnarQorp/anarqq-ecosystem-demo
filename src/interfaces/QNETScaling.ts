/**
 * QNET Phase 2 Scaling Management Interfaces
 * Provides dynamic node scaling, resource monitoring, and load balancing capabilities
 */

export interface ResourceMetrics {
  nodeId: string;
  timestamp: Date;
  cpu: {
    usage: number; // percentage 0-100
    cores: number;
    loadAverage: number[];
  };
  memory: {
    usage: number; // percentage 0-100
    total: number; // bytes
    available: number; // bytes
    used: number; // bytes
  };
  network: {
    latency: number; // milliseconds
    bandwidth: {
      incoming: number; // bytes/sec
      outgoing: number; // bytes/sec
    };
    connections: number;
  };
  disk: {
    usage: number; // percentage 0-100
    total: number; // bytes
    available: number; // bytes
    iops: number;
  };
}

export interface ScalingTrigger {
  type: 'cpu' | 'memory' | 'network' | 'disk' | 'error_rate' | 'manual';
  threshold: number;
  currentValue: number;
  nodeId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export interface QNETNode {
  nodeId: string;
  address: string;
  port: number;
  region: string;
  status: 'active' | 'inactive' | 'provisioning' | 'terminating' | 'error';
  capabilities: string[];
  resources: ResourceMetrics;
  healthScore: number; // 0-100
  lastSeen: Date;
}

export interface ScalingResult {
  success: boolean;
  action: 'scale_up' | 'scale_down' | 'no_action';
  nodesProvisioned: number;
  nodesTerminated: number;
  newNodes: QNETNode[];
  terminatedNodes: string[];
  duration: number; // milliseconds
  error?: string;
}

export interface LoadBalancingResult {
  success: boolean;
  redistributedConnections: number;
  activeNodes: string[];
  loadDistribution: Record<string, number>; // nodeId -> load percentage
  averageLatency: number;
  error?: string;
}

export interface ScalingHealthResult {
  overallHealth: number; // 0-100
  nodeHealth: Record<string, number>; // nodeId -> health score
  scalingEfficiency: number; // 0-100
  resourceUtilization: {
    cpu: number;
    memory: number;
    network: number;
    disk: number;
  };
  recommendations: string[];
}

export interface ScalingConfiguration {
  thresholds: {
    cpu: {
      scaleUp: number; // percentage
      scaleDown: number; // percentage
    };
    memory: {
      scaleUp: number; // percentage
      scaleDown: number; // percentage
    };
    network: {
      latencyThreshold: number; // milliseconds
      bandwidthThreshold: number; // bytes/sec
    };
    errorRate: {
      threshold: number; // percentage
    };
  };
  scaling: {
    minNodes: number;
    maxNodes: number;
    scaleUpCooldown: number; // seconds
    scaleDownCooldown: number; // seconds
    batchSize: number;
  };
  monitoring: {
    interval: number; // seconds
    retentionPeriod: number; // seconds
  };
}

/**
 * QNETScalingManager Interface
 * Manages dynamic node scaling for QNET Phase 2 infrastructure
 */
export interface QNETScalingManager {
  /**
   * Monitor resource usage across all QNET nodes
   */
  monitorResourceUsage(): Promise<ResourceMetrics[]>;

  /**
   * Trigger scaling based on resource thresholds or manual request
   */
  triggerScaling(trigger: ScalingTrigger): Promise<ScalingResult>;

  /**
   * Balance load across available QNET nodes
   */
  balanceLoad(nodes: QNETNode[]): Promise<LoadBalancingResult>;

  /**
   * Validate scaling system health and performance
   */
  validateScalingHealth(): Promise<ScalingHealthResult>;

  /**
   * Get current scaling configuration
   */
  getConfiguration(): Promise<ScalingConfiguration>;

  /**
   * Update scaling configuration
   */
  updateConfiguration(config: Partial<ScalingConfiguration>): Promise<boolean>;

  /**
   * Get all active QNET nodes
   */
  getActiveNodes(): Promise<QNETNode[]>;

  /**
   * Provision new QNET node
   */
  provisionNode(region?: string, capabilities?: string[]): Promise<QNETNode>;

  /**
   * Terminate QNET node
   */
  terminateNode(nodeId: string): Promise<boolean>;

  /**
   * Get scaling history and metrics
   */
  getScalingHistory(timeRange?: { start: Date; end: Date }): Promise<ScalingEvent[]>;
}

export interface ScalingEvent {
  eventId: string;
  timestamp: Date;
  type: 'scale_up' | 'scale_down' | 'node_failure' | 'load_balance';
  trigger: ScalingTrigger;
  result: ScalingResult;
  duration: number;
  impact: {
    performanceImprovement: number; // percentage
    costChange: number; // percentage
    reliabilityChange: number; // percentage
  };
}

/**
 * Load Balancer Interface
 * Manages traffic distribution across QNET nodes
 */
export interface LoadBalancer {
  /**
   * Distribute incoming requests across available nodes
   */
  distributeLoad(request: any, availableNodes: QNETNode[]): Promise<QNETNode>;

  /**
   * Update node weights based on performance metrics
   */
  updateNodeWeights(nodes: QNETNode[]): Promise<void>;

  /**
   * Handle node failure and redistribute traffic
   */
  handleNodeFailure(failedNodeId: string): Promise<LoadBalancingResult>;

  /**
   * Get current load distribution
   */
  getLoadDistribution(): Promise<Record<string, number>>;
}

/**
 * Health Manager Interface
 * Monitors and manages node health across QNET Phase 2
 */
export interface HealthManager {
  /**
   * Perform health check on specific node
   */
  checkNodeHealth(nodeId: string): Promise<number>;

  /**
   * Perform health check on all nodes
   */
  checkAllNodesHealth(): Promise<Record<string, number>>;

  /**
   * Handle automated failover for unhealthy nodes
   */
  handleFailover(unhealthyNodeId: string): Promise<boolean>;

  /**
   * Get health history for analysis
   */
  getHealthHistory(nodeId?: string): Promise<HealthEvent[]>;
}

export interface HealthEvent {
  eventId: string;
  nodeId: string;
  timestamp: Date;
  healthScore: number;
  issues: string[];
  actions: string[];
}