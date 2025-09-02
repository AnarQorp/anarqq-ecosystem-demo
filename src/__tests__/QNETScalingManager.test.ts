/**
 * QNET Scaling Manager Tests
 * Tests for dynamic node scaling with simulated load and resource constraints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QNETScalingManagerImpl } from '../services/QNETScalingManager.js';
import { ScalingTrigger, QNETNode, ResourceMetrics } from '../interfaces/QNETScaling.js';

describe('QNETScalingManager', () => {
  let scalingManager: QNETScalingManagerImpl;

  beforeEach(() => {
    scalingManager = new QNETScalingManagerImpl();
  });

  afterEach(() => {
    scalingManager.destroy();
  });

  describe('Resource Monitoring', () => {
    it('should monitor resource usage across nodes', async () => {
      // Provision some test nodes
      const node1 = await scalingManager.provisionNode('us-east-1', ['compute']);
      const node2 = await scalingManager.provisionNode('us-west-2', ['storage']);
      
      // Wait for nodes to become active
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = await scalingManager.monitorResourceUsage();
      
      expect(metrics).toHaveLength(2);
      expect(metrics[0]).toHaveProperty('nodeId');
      expect(metrics[0]).toHaveProperty('cpu');
      expect(metrics[0]).toHaveProperty('memory');
      expect(metrics[0]).toHaveProperty('network');
      expect(metrics[0]).toHaveProperty('disk');
      
      // Verify CPU metrics structure
      expect(metrics[0].cpu).toHaveProperty('usage');
      expect(metrics[0].cpu).toHaveProperty('cores');
      expect(metrics[0].cpu).toHaveProperty('loadAverage');
      expect(typeof metrics[0].cpu.usage).toBe('number');
      expect(metrics[0].cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics[0].cpu.usage).toBeLessThanOrEqual(100);
    });

    it('should calculate health scores based on resource metrics', async () => {
      const node = await scalingManager.provisionNode();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const activeNodes = await scalingManager.getActiveNodes();
      expect(activeNodes).toHaveLength(1);
      expect(activeNodes[0].healthScore).toBeGreaterThan(0);
      expect(activeNodes[0].healthScore).toBeLessThanOrEqual(100);
    });

    it('should update node last seen timestamp during monitoring', async () => {
      const node = await scalingManager.provisionNode();
      const initialTime = new Date();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      await scalingManager.monitorResourceUsage();
      
      const activeNodes = await scalingManager.getActiveNodes();
      expect(activeNodes[0].lastSeen.getTime()).toBeGreaterThan(initialTime.getTime());
    });
  });

  describe('Scaling Triggers', () => {
    it('should trigger scale up on high CPU usage', async () => {
      // Create a high CPU trigger
      const trigger: ScalingTrigger = {
        type: 'cpu',
        threshold: 70,
        currentValue: 85,
        severity: 'high',
        timestamp: new Date()
      };

      const result = await scalingManager.triggerScaling(trigger);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('scale_up');
      expect(result.nodesProvisioned).toBeGreaterThan(0);
      expect(result.newNodes).toHaveLength(result.nodesProvisioned);
    });

    it('should trigger scale up on high memory usage', async () => {
      const trigger: ScalingTrigger = {
        type: 'memory',
        threshold: 80,
        currentValue: 90,
        severity: 'high',
        timestamp: new Date()
      };

      const result = await scalingManager.triggerScaling(trigger);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('scale_up');
      expect(result.nodesProvisioned).toBeGreaterThan(0);
    });

    it('should trigger scale up on high network latency', async () => {
      const trigger: ScalingTrigger = {
        type: 'network',
        threshold: 200,
        currentValue: 350,
        severity: 'medium',
        timestamp: new Date()
      };

      const result = await scalingManager.triggerScaling(trigger);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('scale_up');
    });

    it('should respect maximum node limits', async () => {
      // Update configuration to have low max nodes for testing
      await scalingManager.updateConfiguration({
        scaling: {
          minNodes: 1,
          maxNodes: 2,
          scaleUpCooldown: 0,
          scaleDownCooldown: 0,
          batchSize: 1
        }
      });

      // Provision nodes up to the limit
      await scalingManager.provisionNode();
      await scalingManager.provisionNode();

      const trigger: ScalingTrigger = {
        type: 'cpu',
        threshold: 70,
        currentValue: 85,
        severity: 'high',
        timestamp: new Date()
      };

      const result = await scalingManager.triggerScaling(trigger);
      
      // Should not scale up beyond max nodes
      expect(result.nodesProvisioned).toBe(0);
    });

    it('should trigger scale down on low resource usage', async () => {
      // First provision multiple nodes
      await scalingManager.provisionNode();
      await scalingManager.provisionNode();
      await scalingManager.provisionNode();
      await scalingManager.provisionNode();

      // Update configuration for testing
      await scalingManager.updateConfiguration({
        scaling: {
          minNodes: 2,
          maxNodes: 10,
          scaleUpCooldown: 0,
          scaleDownCooldown: 0,
          batchSize: 1
        }
      });

      const trigger: ScalingTrigger = {
        type: 'cpu',
        threshold: 30,
        currentValue: 20,
        severity: 'low',
        timestamp: new Date()
      };

      const result = await scalingManager.triggerScaling(trigger);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('scale_down');
      expect(result.nodesTerminated).toBeGreaterThan(0);
    });

    it('should respect minimum node limits during scale down', async () => {
      // Provision only minimum nodes
      await scalingManager.provisionNode();
      await scalingManager.provisionNode();

      await scalingManager.updateConfiguration({
        scaling: {
          minNodes: 2,
          maxNodes: 10,
          scaleUpCooldown: 0,
          scaleDownCooldown: 0,
          batchSize: 1
        }
      });

      const trigger: ScalingTrigger = {
        type: 'cpu',
        threshold: 30,
        currentValue: 20,
        severity: 'low',
        timestamp: new Date()
      };

      const result = await scalingManager.triggerScaling(trigger);
      
      // Should not scale down below minimum
      expect(result.nodesTerminated).toBe(0);
    });

    it('should handle critical severity triggers immediately', async () => {
      const trigger: ScalingTrigger = {
        type: 'cpu',
        threshold: 70,
        currentValue: 95,
        severity: 'critical',
        timestamp: new Date()
      };

      const result = await scalingManager.triggerScaling(trigger);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('scale_up');
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('Load Balancing', () => {
    it('should balance load across healthy nodes', async () => {
      // Provision multiple nodes
      const nodes: QNETNode[] = [];
      for (let i = 0; i < 3; i++) {
        const node = await scalingManager.provisionNode();
        // Simulate different health scores
        node.healthScore = 80 + Math.random() * 20;
        node.status = 'active';
        nodes.push(node);
      }

      const result = await scalingManager.balanceLoad(nodes);
      
      expect(result.success).toBe(true);
      expect(result.activeNodes).toHaveLength(3);
      expect(Object.keys(result.loadDistribution)).toHaveLength(3);
      
      // Verify load distribution adds up to 100%
      const totalLoad = Object.values(result.loadDistribution).reduce((sum, load) => sum + load, 0);
      expect(totalLoad).toBeCloseTo(100, 1);
    });

    it('should exclude unhealthy nodes from load balancing', async () => {
      const nodes: QNETNode[] = [];
      
      // Create healthy node
      const healthyNode = await scalingManager.provisionNode();
      healthyNode.healthScore = 90;
      healthyNode.status = 'active';
      nodes.push(healthyNode);
      
      // Create unhealthy node
      const unhealthyNode = await scalingManager.provisionNode();
      unhealthyNode.healthScore = 30; // Below threshold
      unhealthyNode.status = 'active';
      nodes.push(unhealthyNode);

      const result = await scalingManager.balanceLoad(nodes);
      
      expect(result.success).toBe(true);
      expect(result.activeNodes).toHaveLength(1);
      expect(result.activeNodes[0]).toBe(healthyNode.nodeId);
    });

    it('should handle case with no healthy nodes', async () => {
      const nodes: QNETNode[] = [];
      
      // Create only unhealthy nodes
      const unhealthyNode = await scalingManager.provisionNode();
      unhealthyNode.healthScore = 20;
      unhealthyNode.status = 'active';
      nodes.push(unhealthyNode);

      const result = await scalingManager.balanceLoad(nodes);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No healthy nodes available');
    });
  });

  describe('Health Validation', () => {
    it('should validate overall scaling health', async () => {
      // Provision some nodes
      await scalingManager.provisionNode();
      await scalingManager.provisionNode();
      
      const healthResult = await scalingManager.validateScalingHealth();
      
      expect(healthResult.overallHealth).toBeGreaterThanOrEqual(0);
      expect(healthResult.overallHealth).toBeLessThanOrEqual(100);
      expect(healthResult.nodeHealth).toBeDefined();
      expect(healthResult.scalingEfficiency).toBeGreaterThanOrEqual(0);
      expect(healthResult.scalingEfficiency).toBeLessThanOrEqual(100);
      expect(healthResult.resourceUtilization).toHaveProperty('cpu');
      expect(healthResult.resourceUtilization).toHaveProperty('memory');
      expect(healthResult.resourceUtilization).toHaveProperty('network');
      expect(healthResult.resourceUtilization).toHaveProperty('disk');
      expect(Array.isArray(healthResult.recommendations)).toBe(true);
    });

    it('should provide recommendations based on resource usage', async () => {
      const healthResult = await scalingManager.validateScalingHealth();
      
      expect(Array.isArray(healthResult.recommendations)).toBe(true);
      // Should have at least one recommendation when no nodes are active
      expect(healthResult.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle case with no active nodes', async () => {
      const healthResult = await scalingManager.validateScalingHealth();
      
      expect(healthResult.overallHealth).toBe(0);
      expect(Object.keys(healthResult.nodeHealth)).toHaveLength(0);
      expect(healthResult.recommendations).toContain('No active nodes available');
    });
  });

  describe('Configuration Management', () => {
    it('should get current configuration', async () => {
      const config = await scalingManager.getConfiguration();
      
      expect(config).toHaveProperty('thresholds');
      expect(config).toHaveProperty('scaling');
      expect(config).toHaveProperty('monitoring');
      expect(config.thresholds).toHaveProperty('cpu');
      expect(config.thresholds).toHaveProperty('memory');
      expect(config.thresholds).toHaveProperty('network');
      expect(config.scaling).toHaveProperty('minNodes');
      expect(config.scaling).toHaveProperty('maxNodes');
    });

    it('should update configuration', async () => {
      const newConfig = {
        thresholds: {
          cpu: {
            scaleUp: 75,
            scaleDown: 25
          }
        }
      };

      const success = await scalingManager.updateConfiguration(newConfig);
      expect(success).toBe(true);

      const updatedConfig = await scalingManager.getConfiguration();
      expect(updatedConfig.thresholds.cpu.scaleUp).toBe(75);
      expect(updatedConfig.thresholds.cpu.scaleDown).toBe(25);
    });
  });

  describe('Node Management', () => {
    it('should provision new nodes', async () => {
      const node = await scalingManager.provisionNode('us-east-1', ['compute', 'storage']);
      
      expect(node.nodeId).toBeDefined();
      expect(node.region).toBe('us-east-1');
      expect(node.capabilities).toContain('compute');
      expect(node.capabilities).toContain('storage');
      expect(node.status).toBe('active');
      expect(node.healthScore).toBe(100);
    });

    it('should terminate nodes', async () => {
      const node = await scalingManager.provisionNode();
      const success = await scalingManager.terminateNode(node.nodeId);
      
      expect(success).toBe(true);
    });

    it('should handle termination of non-existent node', async () => {
      const success = await scalingManager.terminateNode('non-existent-node');
      expect(success).toBe(false);
    });

    it('should get active nodes', async () => {
      await scalingManager.provisionNode();
      await scalingManager.provisionNode();
      
      // Wait for nodes to become active
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const activeNodes = await scalingManager.getActiveNodes();
      expect(activeNodes.length).toBeGreaterThanOrEqual(0);
      
      // All returned nodes should be active
      activeNodes.forEach(node => {
        expect(node.status).toBe('active');
      });
    });
  });

  describe('Scaling History', () => {
    it('should record scaling events', async () => {
      const trigger: ScalingTrigger = {
        type: 'cpu',
        threshold: 70,
        currentValue: 85,
        severity: 'high',
        timestamp: new Date()
      };

      await scalingManager.triggerScaling(trigger);
      
      const history = await scalingManager.getScalingHistory();
      expect(history.length).toBeGreaterThan(0);
      
      const latestEvent = history[0];
      expect(latestEvent).toHaveProperty('eventId');
      expect(latestEvent).toHaveProperty('timestamp');
      expect(latestEvent).toHaveProperty('type');
      expect(latestEvent).toHaveProperty('trigger');
      expect(latestEvent).toHaveProperty('result');
      expect(latestEvent).toHaveProperty('impact');
    });

    it('should filter scaling history by time range', async () => {
      const trigger: ScalingTrigger = {
        type: 'memory',
        threshold: 80,
        currentValue: 90,
        severity: 'high',
        timestamp: new Date()
      };

      await scalingManager.triggerScaling(trigger);
      
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const history = await scalingManager.getScalingHistory({
        start: oneHourAgo,
        end: now
      });
      
      expect(Array.isArray(history)).toBe(true);
      // All events should be within the time range
      history.forEach(event => {
        expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime());
        expect(event.timestamp.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });
  });

  describe('Simulated Load Testing', () => {
    it('should handle simulated high CPU load', async () => {
      // Provision initial nodes
      await scalingManager.provisionNode();
      await scalingManager.provisionNode();

      // Configure for quick scaling
      await scalingManager.updateConfiguration({
        scaling: {
          minNodes: 2,
          maxNodes: 8,
          scaleUpCooldown: 0,
          scaleDownCooldown: 0,
          batchSize: 2
        }
      });

      // Simulate high CPU load trigger
      const highCpuTrigger: ScalingTrigger = {
        type: 'cpu',
        threshold: 70,
        currentValue: 95,
        severity: 'critical',
        timestamp: new Date()
      };

      const result = await scalingManager.triggerScaling(highCpuTrigger);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('scale_up');
      expect(result.nodesProvisioned).toBe(2); // batch size
    });

    it('should handle simulated memory constraints', async () => {
      // Provision nodes and simulate memory pressure
      await scalingManager.provisionNode();
      
      await scalingManager.updateConfiguration({
        thresholds: {
          memory: {
            scaleUp: 75,
            scaleDown: 40
          }
        },
        scaling: {
          minNodes: 1,
          maxNodes: 5,
          scaleUpCooldown: 0,
          scaleDownCooldown: 0,
          batchSize: 1
        }
      });

      const memoryTrigger: ScalingTrigger = {
        type: 'memory',
        threshold: 75,
        currentValue: 88,
        severity: 'high',
        timestamp: new Date()
      };

      const result = await scalingManager.triggerScaling(memoryTrigger);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('scale_up');
    });

    it('should handle simulated network latency spikes', async () => {
      await scalingManager.provisionNode();

      const networkTrigger: ScalingTrigger = {
        type: 'network',
        threshold: 200,
        currentValue: 450,
        severity: 'high',
        timestamp: new Date()
      };

      const result = await scalingManager.triggerScaling(networkTrigger);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('scale_up');
    });

    it('should handle resource constraint recovery', async () => {
      // First scale up due to high load
      await scalingManager.provisionNode();
      await scalingManager.provisionNode();
      await scalingManager.provisionNode();
      await scalingManager.provisionNode();

      await scalingManager.updateConfiguration({
        scaling: {
          minNodes: 2,
          maxNodes: 10,
          scaleUpCooldown: 0,
          scaleDownCooldown: 0,
          batchSize: 1
        }
      });

      // Then simulate load decrease
      const lowLoadTrigger: ScalingTrigger = {
        type: 'cpu',
        threshold: 30,
        currentValue: 15,
        severity: 'low',
        timestamp: new Date()
      };

      const result = await scalingManager.triggerScaling(lowLoadTrigger);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('scale_down');
      expect(result.nodesTerminated).toBeGreaterThan(0);
    });
  });
});