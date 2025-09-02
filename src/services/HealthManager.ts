/**
 * Health Manager Implementation
 * Monitors and manages node health across QNET Phase 2
 */

import {
  HealthManager,
  HealthEvent,
  QNETNode
} from '../interfaces/QNETScaling.js';

export class HealthManagerImpl implements HealthManager {
  private healthHistory: Map<string, HealthEvent[]> = new Map();
  private healthThresholds = {
    critical: 30,
    warning: 50,
    healthy: 70
  };
  private maxHistorySize = 1000;
  private failoverInProgress: Set<string> = new Set();

  constructor() {
    // Initialize health manager
  }

  async checkNodeHealth(nodeId: string): Promise<number> {
    try {
      // Simulate health check by analyzing various metrics
      const healthScore = await this.performHealthCheck(nodeId);
      
      // Record health event
      await this.recordHealthEvent(nodeId, healthScore);
      
      return healthScore;
    } catch (error) {
      console.error(`Health check failed for node ${nodeId}:`, error);
      
      // Record failure event
      await this.recordHealthEvent(nodeId, 0, ['Health check failed'], ['Mark node as unhealthy']);
      
      return 0;
    }
  }

  private async performHealthCheck(nodeId: string): Promise<number> {
    // Simulate comprehensive health check
    let healthScore = 100;
    const issues: string[] = [];

    // Simulate various health checks
    const checks = [
      { name: 'CPU Health', weight: 25, threshold: 90 },
      { name: 'Memory Health', weight: 25, threshold: 95 },
      { name: 'Network Health', weight: 20, threshold: 500 }, // latency in ms
      { name: 'Disk Health', weight: 15, threshold: 95 },
      { name: 'Service Health', weight: 15, threshold: 0 } // error rate
    ];

    for (const check of checks) {
      const value = this.simulateMetricValue(check.name);
      let checkScore = 100;

      switch (check.name) {
        case 'CPU Health':
          if (value > check.threshold) {
            checkScore = Math.max(0, 100 - (value - check.threshold) * 2);
            if (checkScore < 50) issues.push(`High CPU usage: ${value.toFixed(1)}%`);
          }
          break;
        case 'Memory Health':
          if (value > check.threshold) {
            checkScore = Math.max(0, 100 - (value - check.threshold) * 3);
            if (checkScore < 50) issues.push(`High memory usage: ${value.toFixed(1)}%`);
          }
          break;
        case 'Network Health':
          if (value > check.threshold) {
            checkScore = Math.max(0, 100 - (value - check.threshold) / 10);
            if (checkScore < 50) issues.push(`High network latency: ${value.toFixed(0)}ms`);
          }
          break;
        case 'Disk Health':
          if (value > check.threshold) {
            checkScore = Math.max(0, 100 - (value - check.threshold) * 4);
            if (checkScore < 50) issues.push(`High disk usage: ${value.toFixed(1)}%`);
          }
          break;
        case 'Service Health':
          if (value > 5) { // Error rate > 5%
            checkScore = Math.max(0, 100 - value * 10);
            if (checkScore < 50) issues.push(`High error rate: ${value.toFixed(1)}%`);
          }
          break;
      }

      healthScore -= (100 - checkScore) * (check.weight / 100);
    }

    return Math.max(0, Math.min(100, healthScore));
  }

  private simulateMetricValue(metricName: string): number {
    // Simulate realistic metric values
    switch (metricName) {
      case 'CPU Health':
        return Math.random() * 100; // 0-100%
      case 'Memory Health':
        return Math.random() * 100; // 0-100%
      case 'Network Health':
        return 20 + Math.random() * 480; // 20-500ms
      case 'Disk Health':
        return Math.random() * 100; // 0-100%
      case 'Service Health':
        return Math.random() * 10; // 0-10% error rate
      default:
        return Math.random() * 100;
    }
  }

  async checkAllNodesHealth(): Promise<Record<string, number>> {
    const healthResults: Record<string, number> = {};
    
    // Get all nodes from health history (active nodes)
    const nodeIds = Array.from(this.healthHistory.keys());
    
    // Perform health checks in parallel
    const healthPromises = nodeIds.map(async (nodeId) => {
      const health = await this.checkNodeHealth(nodeId);
      return { nodeId, health };
    });

    const results = await Promise.all(healthPromises);
    
    for (const { nodeId, health } of results) {
      healthResults[nodeId] = health;
    }

    return healthResults;
  }

  async handleFailover(unhealthyNodeId: string): Promise<boolean> {
    try {
      // Prevent concurrent failovers for the same node
      if (this.failoverInProgress.has(unhealthyNodeId)) {
        console.log(`Failover already in progress for node ${unhealthyNodeId}`);
        return false;
      }

      this.failoverInProgress.add(unhealthyNodeId);

      // Get current health score
      const healthScore = await this.checkNodeHealth(unhealthyNodeId);
      
      if (healthScore > this.healthThresholds.critical) {
        // Node is not critically unhealthy, no failover needed
        this.failoverInProgress.delete(unhealthyNodeId);
        return false;
      }

      // Perform failover steps
      const failoverSteps = [
        'Mark node as unhealthy',
        'Drain existing connections',
        'Redirect traffic to healthy nodes',
        'Notify monitoring systems',
        'Schedule health recovery checks'
      ];

      const actions: string[] = [];
      
      for (const step of failoverSteps) {
        try {
          await this.executeFailoverStep(unhealthyNodeId, step);
          actions.push(`Completed: ${step}`);
        } catch (error) {
          actions.push(`Failed: ${step} - ${error}`);
          console.error(`Failover step failed for ${unhealthyNodeId}:`, step, error);
        }
      }

      // Record failover event
      await this.recordHealthEvent(
        unhealthyNodeId, 
        healthScore, 
        [`Automated failover triggered - health score: ${healthScore}`],
        actions
      );

      this.failoverInProgress.delete(unhealthyNodeId);
      return true;

    } catch (error) {
      console.error(`Failover failed for node ${unhealthyNodeId}:`, error);
      this.failoverInProgress.delete(unhealthyNodeId);
      return false;
    }
  }

  private async executeFailoverStep(nodeId: string, step: string): Promise<void> {
    // Simulate failover step execution
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    switch (step) {
      case 'Mark node as unhealthy':
        // Mark node status
        break;
      case 'Drain existing connections':
        // Gracefully close connections
        break;
      case 'Redirect traffic to healthy nodes':
        // Update load balancer
        break;
      case 'Notify monitoring systems':
        // Send alerts
        break;
      case 'Schedule health recovery checks':
        // Set up recovery monitoring
        break;
    }
  }

  async getHealthHistory(nodeId?: string): Promise<HealthEvent[]> {
    if (nodeId) {
      return this.healthHistory.get(nodeId) || [];
    }

    // Return all health events
    const allEvents: HealthEvent[] = [];
    for (const events of this.healthHistory.values()) {
      allEvents.push(...events);
    }

    // Sort by timestamp (most recent first)
    return allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private async recordHealthEvent(
    nodeId: string, 
    healthScore: number, 
    issues: string[] = [], 
    actions: string[] = []
  ): Promise<void> {
    const event: HealthEvent = {
      eventId: `health-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nodeId,
      timestamp: new Date(),
      healthScore,
      issues,
      actions
    };

    // Get or create health history for node
    let nodeHistory = this.healthHistory.get(nodeId);
    if (!nodeHistory) {
      nodeHistory = [];
      this.healthHistory.set(nodeId, nodeHistory);
    }

    // Add event to history
    nodeHistory.push(event);

    // Maintain history size limit
    if (nodeHistory.length > this.maxHistorySize) {
      nodeHistory.splice(0, nodeHistory.length - this.maxHistorySize);
    }
  }

  // Additional utility methods

  /**
   * Get health status summary for all nodes
   */
  getHealthSummary(): {
    healthy: number;
    warning: number;
    critical: number;
    total: number;
  } {
    const summary = { healthy: 0, warning: 0, critical: 0, total: 0 };
    
    for (const events of this.healthHistory.values()) {
      if (events.length === 0) continue;
      
      const latestEvent = events[events.length - 1];
      summary.total++;
      
      if (latestEvent.healthScore >= this.healthThresholds.healthy) {
        summary.healthy++;
      } else if (latestEvent.healthScore >= this.healthThresholds.warning) {
        summary.warning++;
      } else {
        summary.critical++;
      }
    }
    
    return summary;
  }

  /**
   * Get nodes that need attention
   */
  getUnhealthyNodes(): { nodeId: string; healthScore: number; issues: string[] }[] {
    const unhealthyNodes: { nodeId: string; healthScore: number; issues: string[] }[] = [];
    
    for (const [nodeId, events] of this.healthHistory) {
      if (events.length === 0) continue;
      
      const latestEvent = events[events.length - 1];
      if (latestEvent.healthScore < this.healthThresholds.warning) {
        unhealthyNodes.push({
          nodeId,
          healthScore: latestEvent.healthScore,
          issues: latestEvent.issues
        });
      }
    }
    
    return unhealthyNodes.sort((a, b) => a.healthScore - b.healthScore);
  }

  /**
   * Update health thresholds
   */
  updateHealthThresholds(thresholds: Partial<typeof this.healthThresholds>): void {
    this.healthThresholds = { ...this.healthThresholds, ...thresholds };
  }

  /**
   * Clear health history for a node
   */
  clearNodeHistory(nodeId: string): void {
    this.healthHistory.delete(nodeId);
  }

  /**
   * Get average health score across all nodes
   */
  getAverageHealth(): number {
    let totalHealth = 0;
    let nodeCount = 0;
    
    for (const events of this.healthHistory.values()) {
      if (events.length === 0) continue;
      
      const latestEvent = events[events.length - 1];
      totalHealth += latestEvent.healthScore;
      nodeCount++;
    }
    
    return nodeCount > 0 ? totalHealth / nodeCount : 0;
  }

  /**
   * Simulate node recovery (for testing)
   */
  async simulateNodeRecovery(nodeId: string): Promise<void> {
    const recoveryScore = 80 + Math.random() * 20; // 80-100
    await this.recordHealthEvent(
      nodeId, 
      recoveryScore, 
      [], 
      ['Node recovered', 'Health checks passing']
    );
  }
}