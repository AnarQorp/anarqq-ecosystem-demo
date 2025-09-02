/**
 * Load Balancer Tests
 * Tests for dynamic load balancing across QNET Phase 2 nodes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LoadBalancerImpl } from '../services/LoadBalancer.js';
import { QNETNode, ResourceMetrics } from '../interfaces/QNETScaling.js';

describe('LoadBalancer', () => {
  let loadBalancer: LoadBalancerImpl;

  beforeEach(() => {
    loadBalancer = new LoadBalancerImpl();
  });

  const createMockNode = (
    nodeId: string, 
    healthScore: number = 90, 
    cpuUsage: number = 50,
    memoryUsage: number = 60,
    latency: number = 100
  ): QNETNode => {
    const resources: ResourceMetrics = {
      nodeId,
      timestamp: new Date(),
      cpu: {
        usage: cpuUsage,
        cores: 4,
        loadAverage: [1.0, 1.2, 1.5]
      },
      memory: {
        usage: memoryUsage,
        total: 8589934592,
        available: 4294967296,
        used: 4294967296
      },
      network: {
        latency,
        bandwidth: {
          incoming: 1000000,
          outgoing: 1000000
        },
        connections: 100
      },
      disk: {
        usage: 40,
        total: 107374182400,
        available: 64424509440,
        iops: 500
      }
    };

    return {
      nodeId,
      address: `10.0.0.${Math.floor(Math.random() * 255)}`,
      port: 8080,
      region: 'us-east-1',
      status: 'active',
      capabilities: ['compute', 'storage'],
      resources,
      healthScore,
      lastSeen: new Date()
    };
  };

  describe('Load Distribution', () => {
    it('should distribute load to healthy nodes', async () => {
      const nodes = [
        createMockNode('node1', 90, 30, 40, 50),
        createMockNode('node2', 85, 60, 70, 80),
        createMockNode('node3', 95, 20, 30, 40)
      ];

      const request = { type: 'test', data: 'sample' };
      const selectedNode = await loadBalancer.distributeLoad(request, nodes);

      expect(selectedNode).toBeDefined();
      expect(nodes.some(n => n.nodeId === selectedNode.nodeId)).toBe(true);
      expect(selectedNode.status).toBe('active');
      expect(selectedNode.healthScore).toBeGreaterThan(50);
    });

    it('should prefer nodes with better performance metrics', async () => {
      const highPerformanceNode = createMockNode('high-perf', 95, 20, 30, 40);
      const lowPerformanceNode = createMockNode('low-perf', 60, 80, 90, 200);
      
      const nodes = [lowPerformanceNode, highPerformanceNode];
      
      // Test multiple requests to see distribution pattern
      const selections: string[] = [];
      for (let i = 0; i < 10; i++) {
        const request = { type: 'test', data: `request-${i}` };
        const selectedNode = await loadBalancer.distributeLoad(request, nodes);
        selections.push(selectedNode.nodeId);
      }

      // High performance node should be selected more often
      const highPerfSelections = selections.filter(id => id === 'high-perf').length;
      expect(highPerfSelections).toBeGreaterThan(5); // Should be selected more than 50% of the time
    });

    it('should exclude unhealthy nodes from distribution', async () => {
      const healthyNode = createMockNode('healthy', 80);
      const unhealthyNode = createMockNode('unhealthy', 30); // Below threshold
      
      const nodes = [healthyNode, unhealthyNode];
      
      const request = { type: 'test', data: 'sample' };
      const selectedNode = await loadBalancer.distributeLoad(request, nodes);

      expect(selectedNode.nodeId).toBe('healthy');
      expect(selectedNode.healthScore).toBeGreaterThan(50);
    });

    it('should handle case with no available nodes', async () => {
      const nodes: QNETNode[] = [];
      const request = { type: 'test', data: 'sample' };

      await expect(loadBalancer.distributeLoad(request, nodes))
        .rejects.toThrow('No available nodes for load distribution');
    });

    it('should handle case with no healthy nodes', async () => {
      const unhealthyNodes = [
        createMockNode('unhealthy1', 30),
        createMockNode('unhealthy2', 20)
      ];

      const request = { type: 'test', data: 'sample' };

      await expect(loadBalancer.distributeLoad(request, unhealthyNodes))
        .rejects.toThrow('No healthy nodes available for load distribution');
    });
  });

  describe('Node Weight Management', () => {
    it('should update node weights based on performance metrics', async () => {
      const nodes = [
        createMockNode('node1', 90, 30, 40, 50),
        createMockNode('node2', 70, 80, 85, 150)
      ];

      await loadBalancer.updateNodeWeights(nodes);

      const weight1 = loadBalancer.getNodeWeight('node1');
      const weight2 = loadBalancer.getNodeWeight('node2');

      expect(weight1).toBeGreaterThan(weight2); // Better performance should have higher weight
      expect(weight1).toBeGreaterThan(0);
      expect(weight2).toBeGreaterThan(0);
    });

    it('should clean up weights for removed nodes', async () => {
      const initialNodes = [
        createMockNode('node1', 90),
        createMockNode('node2', 85)
      ];

      await loadBalancer.updateNodeWeights(initialNodes);
      expect(loadBalancer.getNodeWeight('node1')).toBeGreaterThan(0);
      expect(loadBalancer.getNodeWeight('node2')).toBeGreaterThan(0);

      // Update with only one node
      const updatedNodes = [createMockNode('node1', 90)];
      await loadBalancer.updateNodeWeights(updatedNodes);

      expect(loadBalancer.getNodeWeight('node1')).toBeGreaterThan(0);
      expect(loadBalancer.getNodeWeight('node2')).toBe(0); // Should be cleaned up
    });
  });

  describe('Node Failure Handling', () => {
    it('should handle node failure and redistribute connections', async () => {
      // Setup initial state with connections
      const nodes = [
        createMockNode('node1', 90),
        createMockNode('node2', 85),
        createMockNode('node3', 80)
      ];

      await loadBalancer.updateNodeWeights(nodes);

      // Simulate connections to node1
      for (let i = 0; i < 10; i++) {
        await loadBalancer.distributeLoad({ type: 'test' }, [nodes[0]]);
      }

      const result = await loadBalancer.handleNodeFailure('node1');

      expect(result.success).toBe(true);
      expect(result.redistributedConnections).toBeGreaterThan(0);
      expect(result.activeNodes.length).toBeGreaterThan(0);
      expect(result.activeNodes).not.toContain('node1');
      expect(typeof result.averageLatency).toBe('number');
    });

    it('should handle failure when no other nodes are available', async () => {
      const result = await loadBalancer.handleNodeFailure('only-node');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No remaining nodes available');
      expect(result.redistributedConnections).toBe(0);
      expect(result.activeNodes).toHaveLength(0);
    });
  });

  describe('Load Distribution Tracking', () => {
    it('should track and return load distribution', async () => {
      const nodes = [
        createMockNode('node1', 90),
        createMockNode('node2', 85)
      ];

      // Distribute some load
      for (let i = 0; i < 10; i++) {
        await loadBalancer.distributeLoad({ type: 'test' }, nodes);
      }

      const distribution = await loadBalancer.getLoadDistribution();

      expect(typeof distribution).toBe('object');
      
      // Should have entries for nodes that received connections
      const totalPercentage = Object.values(distribution).reduce((sum, pct) => sum + pct, 0);
      if (Object.keys(distribution).length > 0) {
        expect(totalPercentage).toBeCloseTo(100, 1);
      }
    });

    it('should return empty distribution when no connections exist', async () => {
      const distribution = await loadBalancer.getLoadDistribution();
      expect(distribution).toEqual({});
    });
  });

  describe('Connection Management', () => {
    it('should track connection counts per node', async () => {
      const node = createMockNode('test-node', 90);
      
      // Initial count should be 0
      expect(loadBalancer.getNodeConnections('test-node')).toBe(0);

      // Distribute some load
      await loadBalancer.distributeLoad({ type: 'test' }, [node]);
      expect(loadBalancer.getNodeConnections('test-node')).toBe(1);

      await loadBalancer.distributeLoad({ type: 'test' }, [node]);
      expect(loadBalancer.getNodeConnections('test-node')).toBe(2);
    });

    it('should handle connection completion', async () => {
      const node = createMockNode('test-node', 90);
      
      // Add connections
      await loadBalancer.distributeLoad({ type: 'test' }, [node]);
      await loadBalancer.distributeLoad({ type: 'test' }, [node]);
      expect(loadBalancer.getNodeConnections('test-node')).toBe(2);

      // Complete a connection
      loadBalancer.completeConnection('test-node');
      expect(loadBalancer.getNodeConnections('test-node')).toBe(1);

      // Complete another connection
      loadBalancer.completeConnection('test-node');
      expect(loadBalancer.getNodeConnections('test-node')).toBe(0);

      // Should not go below 0
      loadBalancer.completeConnection('test-node');
      expect(loadBalancer.getNodeConnections('test-node')).toBe(0);
    });

    it('should reset connections when requested', async () => {
      const nodes = [
        createMockNode('node1', 90),
        createMockNode('node2', 85)
      ];

      // Add some connections
      for (let i = 0; i < 5; i++) {
        await loadBalancer.distributeLoad({ type: 'test' }, nodes);
      }

      // Verify connections exist
      expect(loadBalancer.getNodeConnections('node1') + loadBalancer.getNodeConnections('node2')).toBeGreaterThan(0);

      // Reset connections
      loadBalancer.resetConnections();

      // Verify all connections are reset
      expect(loadBalancer.getNodeConnections('node1')).toBe(0);
      expect(loadBalancer.getNodeConnections('node2')).toBe(0);
    });
  });

  describe('Load Balancing Statistics', () => {
    it('should provide accurate statistics', async () => {
      const nodes = [
        createMockNode('node1', 90),
        createMockNode('node2', 85),
        createMockNode('node3', 80)
      ];

      // Distribute load unevenly
      for (let i = 0; i < 6; i++) {
        await loadBalancer.distributeLoad({ type: 'test' }, [nodes[0]]); // 6 to node1
      }
      for (let i = 0; i < 3; i++) {
        await loadBalancer.distributeLoad({ type: 'test' }, [nodes[1]]); // 3 to node2
      }
      for (let i = 0; i < 1; i++) {
        await loadBalancer.distributeLoad({ type: 'test' }, [nodes[2]]); // 1 to node3
      }

      const stats = loadBalancer.getStatistics();

      expect(stats.totalConnections).toBe(10);
      expect(stats.nodeCount).toBe(3);
      expect(stats.averageConnectionsPerNode).toBeCloseTo(3.33, 1);
      expect(stats.loadVariance).toBeGreaterThan(0); // Should have variance due to uneven distribution
    });

    it('should handle empty statistics', async () => {
      const stats = loadBalancer.getStatistics();

      expect(stats.totalConnections).toBe(0);
      expect(stats.nodeCount).toBe(0);
      expect(stats.averageConnectionsPerNode).toBe(0);
      expect(stats.loadVariance).toBe(0);
    });
  });

  describe('Various Failure Scenarios', () => {
    it('should handle network partition scenarios', async () => {
      const nodes = [
        createMockNode('node1', 90, 30, 40, 50),   // Good performance
        createMockNode('node2', 85, 50, 60, 100),  // Medium performance
        createMockNode('node3', 70, 80, 85, 300)   // Poor performance (high latency)
      ];

      // Simulate network partition affecting node3
      nodes[2].resources.network.latency = 1000; // Very high latency
      nodes[2].healthScore = 40; // Reduced health

      await loadBalancer.updateNodeWeights(nodes);

      // Test load distribution - should avoid the partitioned node
      const selections: string[] = [];
      for (let i = 0; i < 20; i++) {
        const selectedNode = await loadBalancer.distributeLoad({ type: 'test' }, nodes);
        selections.push(selectedNode.nodeId);
      }

      // Should rarely select the partitioned node
      const partitionedSelections = selections.filter(id => id === 'node3').length;
      expect(partitionedSelections).toBeLessThan(5); // Less than 25% of selections
    });

    it('should handle cascading failures', async () => {
      const nodes = [
        createMockNode('node1', 90),
        createMockNode('node2', 85),
        createMockNode('node3', 80)
      ];

      await loadBalancer.updateNodeWeights(nodes);

      // Simulate connections
      for (let i = 0; i < 15; i++) {
        await loadBalancer.distributeLoad({ type: 'test' }, nodes);
      }

      // First failure
      const result1 = await loadBalancer.handleNodeFailure('node1');
      expect(result1.success).toBe(true);
      expect(result1.activeNodes).toHaveLength(2);

      // Second failure
      const result2 = await loadBalancer.handleNodeFailure('node2');
      expect(result2.success).toBe(true);
      expect(result2.activeNodes).toHaveLength(1);

      // Final failure - should handle gracefully
      const result3 = await loadBalancer.handleNodeFailure('node3');
      expect(result3.success).toBe(false);
      expect(result3.error).toContain('No remaining nodes available');
    });

    it('should handle rapid scaling scenarios', async () => {
      let nodes = [createMockNode('node1', 90)];

      // Start with one node
      await loadBalancer.updateNodeWeights(nodes);

      // Rapidly add nodes (simulating scale-up)
      for (let i = 2; i <= 5; i++) {
        nodes.push(createMockNode(`node${i}`, 85 + Math.random() * 10));
        await loadBalancer.updateNodeWeights(nodes);
      }

      // Distribute load across all nodes
      for (let i = 0; i < 20; i++) {
        await loadBalancer.distributeLoad({ type: 'test' }, nodes);
      }

      const distribution = await loadBalancer.getLoadDistribution();
      expect(Object.keys(distribution).length).toBeGreaterThan(1);

      // Rapidly remove nodes (simulating scale-down)
      for (let i = 5; i >= 3; i--) {
        await loadBalancer.handleNodeFailure(`node${i}`);
        nodes = nodes.filter(n => n.nodeId !== `node${i}`);
        await loadBalancer.updateNodeWeights(nodes);
      }

      const finalStats = loadBalancer.getStatistics();
      expect(finalStats.nodeCount).toBeLessThanOrEqual(2);
    });
  });
});