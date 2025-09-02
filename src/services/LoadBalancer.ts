/**
 * Load Balancer Implementation
 * Manages traffic distribution across QNET Phase 2 nodes
 */

import {
  LoadBalancer,
  QNETNode,
  LoadBalancingResult
} from '../interfaces/QNETScaling.js';

export class LoadBalancerImpl implements LoadBalancer {
  private nodeWeights: Map<string, number> = new Map();
  private connectionCounts: Map<string, number> = new Map();
  private lastBalanceTime: Date = new Date();
  private roundRobinIndex: number = 0;

  constructor() {
    // Initialize with default weights
  }

  async distributeLoad(request: any, availableNodes: QNETNode[]): Promise<QNETNode> {
    if (availableNodes.length === 0) {
      throw new Error('No available nodes for load distribution');
    }

    // Filter healthy nodes (health score > 50)
    const healthyNodes = availableNodes.filter(node => 
      node.status === 'active' && node.healthScore > 50
    );

    if (healthyNodes.length === 0) {
      throw new Error('No healthy nodes available for load distribution');
    }

    // Select node based on weighted round-robin algorithm
    const selectedNode = this.selectNodeByWeight(healthyNodes);
    
    // Update connection count
    const currentConnections = this.connectionCounts.get(selectedNode.nodeId) || 0;
    this.connectionCounts.set(selectedNode.nodeId, currentConnections + 1);

    return selectedNode;
  }

  private selectNodeByWeight(nodes: QNETNode[]): QNETNode {
    // Calculate weights based on node capacity and health
    const weightedNodes = nodes.map(node => ({
      node,
      weight: this.calculateNodeWeight(node)
    }));

    // Sort by weight (higher is better)
    weightedNodes.sort((a, b) => b.weight - a.weight);

    // Use weighted round-robin selection
    const totalWeight = weightedNodes.reduce((sum, wn) => sum + wn.weight, 0);
    
    if (totalWeight === 0) {
      // Fallback to simple round-robin if all weights are 0
      this.roundRobinIndex = (this.roundRobinIndex + 1) % nodes.length;
      return nodes[this.roundRobinIndex];
    }

    // Select based on weight distribution
    let randomWeight = Math.random() * totalWeight;
    
    for (const weightedNode of weightedNodes) {
      randomWeight -= weightedNode.weight;
      if (randomWeight <= 0) {
        return weightedNode.node;
      }
    }

    // Fallback to first node
    return weightedNodes[0].node;
  }

  private calculateNodeWeight(node: QNETNode): number {
    // Base weight calculation considering multiple factors
    const healthWeight = node.healthScore / 100; // 0-1
    
    // CPU capacity (inverse of usage)
    const cpuCapacity = Math.max(0, 100 - node.resources.cpu.usage) / 100;
    
    // Memory capacity (inverse of usage)
    const memoryCapacity = Math.max(0, 100 - node.resources.memory.usage) / 100;
    
    // Network capacity (inverse of latency, normalized)
    const networkCapacity = Math.max(0, 1 - (node.resources.network.latency / 1000));
    
    // Current load (inverse of connections)
    const currentConnections = this.connectionCounts.get(node.nodeId) || 0;
    const loadCapacity = Math.max(0, 1 - (currentConnections / 1000)); // Assume max 1000 connections
    
    // Weighted combination of all factors
    const weight = (
      healthWeight * 0.3 +
      cpuCapacity * 0.25 +
      memoryCapacity * 0.25 +
      networkCapacity * 0.1 +
      loadCapacity * 0.1
    );

    return Math.max(0, weight);
  }

  async updateNodeWeights(nodes: QNETNode[]): Promise<void> {
    // Update weights for all nodes
    for (const node of nodes) {
      const weight = this.calculateNodeWeight(node);
      this.nodeWeights.set(node.nodeId, weight);
    }

    // Clean up weights for nodes that no longer exist
    const activeNodeIds = new Set(nodes.map(n => n.nodeId));
    for (const [nodeId] of this.nodeWeights) {
      if (!activeNodeIds.has(nodeId)) {
        this.nodeWeights.delete(nodeId);
        this.connectionCounts.delete(nodeId);
      }
    }
  }

  async handleNodeFailure(failedNodeId: string): Promise<LoadBalancingResult> {
    try {
      // Get current connections for the failed node
      const failedNodeConnections = this.connectionCounts.get(failedNodeId) || 0;
      
      // Remove failed node from tracking
      this.nodeWeights.delete(failedNodeId);
      this.connectionCounts.delete(failedNodeId);
      
      // Get remaining healthy nodes
      const remainingNodes = Array.from(this.nodeWeights.keys());
      
      if (remainingNodes.length === 0) {
        return {
          success: false,
          redistributedConnections: 0,
          activeNodes: [],
          loadDistribution: {},
          averageLatency: 0,
          error: 'No remaining nodes available for failover'
        };
      }

      // Redistribute connections from failed node
      const connectionsPerNode = Math.ceil(failedNodeConnections / remainingNodes.length);
      
      let redistributedConnections = 0;
      const loadDistribution: Record<string, number> = {};
      
      for (const nodeId of remainingNodes) {
        const currentConnections = this.connectionCounts.get(nodeId) || 0;
        const newConnections = currentConnections + connectionsPerNode;
        this.connectionCounts.set(nodeId, newConnections);
        
        redistributedConnections += connectionsPerNode;
        loadDistribution[nodeId] = newConnections;
      }

      // Calculate average latency (simulated)
      const averageLatency = 50 + Math.random() * 100; // 50-150ms

      return {
        success: true,
        redistributedConnections,
        activeNodes: remainingNodes,
        loadDistribution,
        averageLatency
      };

    } catch (error) {
      return {
        success: false,
        redistributedConnections: 0,
        activeNodes: [],
        loadDistribution: {},
        averageLatency: 0,
        error: error instanceof Error ? error.message : 'Unknown error during failover'
      };
    }
  }

  async getLoadDistribution(): Promise<Record<string, number>> {
    const distribution: Record<string, number> = {};
    
    // Calculate total connections
    const totalConnections = Array.from(this.connectionCounts.values())
      .reduce((sum, count) => sum + count, 0);
    
    if (totalConnections === 0) {
      return distribution;
    }

    // Calculate percentage distribution
    for (const [nodeId, connections] of this.connectionCounts) {
      distribution[nodeId] = (connections / totalConnections) * 100;
    }

    return distribution;
  }

  // Additional utility methods
  
  /**
   * Get current connection count for a node
   */
  getNodeConnections(nodeId: string): number {
    return this.connectionCounts.get(nodeId) || 0;
  }

  /**
   * Get current weight for a node
   */
  getNodeWeight(nodeId: string): number {
    return this.nodeWeights.get(nodeId) || 0;
  }

  /**
   * Reset connection counts (useful for testing)
   */
  resetConnections(): void {
    this.connectionCounts.clear();
  }

  /**
   * Simulate connection completion (decrease count)
   */
  completeConnection(nodeId: string): void {
    const currentConnections = this.connectionCounts.get(nodeId) || 0;
    if (currentConnections > 0) {
      this.connectionCounts.set(nodeId, currentConnections - 1);
    }
  }

  /**
   * Get load balancing statistics
   */
  getStatistics(): {
    totalConnections: number;
    nodeCount: number;
    averageConnectionsPerNode: number;
    loadVariance: number;
  } {
    const connections = Array.from(this.connectionCounts.values());
    const totalConnections = connections.reduce((sum, count) => sum + count, 0);
    const nodeCount = connections.length;
    const averageConnectionsPerNode = nodeCount > 0 ? totalConnections / nodeCount : 0;
    
    // Calculate variance in load distribution
    const variance = nodeCount > 0 ? 
      connections.reduce((sum, count) => sum + Math.pow(count - averageConnectionsPerNode, 2), 0) / nodeCount : 0;

    return {
      totalConnections,
      nodeCount,
      averageConnectionsPerNode,
      loadVariance: Math.sqrt(variance)
    };
  }
}