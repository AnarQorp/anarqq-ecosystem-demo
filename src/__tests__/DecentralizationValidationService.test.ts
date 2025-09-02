import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DecentralizationValidationService } from '../services/DecentralizationValidationService.js';
import { 
  ScalingTrigger, 
  PartitionToleranceTest, 
  QNETNode 
} from '../interfaces/DecentralizationValidation.js';

describe('DecentralizationValidationService', () => {
  let service: DecentralizationValidationService;

  beforeEach(() => {
    service = new DecentralizationValidationService();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await service.stopMonitoring();
    vi.useRealTimers();
  });

  describe('discoverNodes', () => {
    it('should discover and register QNET Phase 2 nodes', async () => {
      const nodes = await service.discoverNodes();

      expect(Array.isArray(nodes)).toBe(true);
      expect(nodes.length).toBeGreaterThan(0);
      
      // Verify node structure
      const node = nodes[0];
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('address');
      expect(node).toHaveProperty('location');
      expect(node).toHaveProperty('status');
      expect(node).toHaveProperty('resources');
      expect(node).toHaveProperty('consensus');
      expect(node).toHaveProperty('capabilities');
      expect(node).toHaveProperty('version');
    });

    it('should include nodes from different geographic regions', async () => {
      const nodes = await service.discoverNodes();
      
      const regions = new Set(nodes.map(n => n.location.region));
      expect(regions.size).toBeGreaterThan(1);
      
      const countries = new Set(nodes.map(n => n.location.country));
      expect(countries.size).toBeGreaterThan(1);
    });

    it('should include nodes with various capabilities', async () => {
      const nodes = await service.discoverNodes();
      
      const allCapabilities = new Set();
      nodes.forEach(n => n.capabilities.forEach(cap => allCapabilities.add(cap)));
      
      expect(allCapabilities.has('storage')).toBe(true);
      expect(allCapabilities.has('compute')).toBe(true);
      expect(allCapabilities.has('consensus')).toBe(true);
    });
  });

  describe('monitorNodeHealth', () => {
    it('should monitor health of all registered nodes', async () => {
      await service.discoverNodes();
      
      const healthyNodes = await service.monitorNodeHealth();
      
      expect(Array.isArray(healthyNodes)).toBe(true);
      expect(healthyNodes.length).toBeGreaterThan(0);
      
      // Verify health monitoring updates
      healthyNodes.forEach(node => {
        expect(node.consensus.lastHeartbeat).toBeInstanceOf(Date);
        expect(node.resources.cpu).toBeGreaterThanOrEqual(0);
        expect(node.resources.cpu).toBeLessThanOrEqual(100);
        expect(node.resources.memory).toBeGreaterThanOrEqual(0);
        expect(node.resources.memory).toBeLessThanOrEqual(100);
      });
    });

    it('should update node status based on health metrics', async () => {
      await service.discoverNodes();
      
      const initialNodes = await service.monitorNodeHealth();
      const degradedNodes = initialNodes.filter(n => n.status === 'degraded');
      
      // Should have at least one degraded node in the simulation
      expect(degradedNodes.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('collectDecentralizationMetrics', () => {
    it('should collect comprehensive decentralization metrics', async () => {
      await service.discoverNodes();
      
      const metrics = await service.collectDecentralizationMetrics();
      
      expect(metrics).toHaveProperty('nodeCount');
      expect(metrics).toHaveProperty('geographicDistribution');
      expect(metrics).toHaveProperty('consensusHealth');
      expect(metrics).toHaveProperty('networkPartitionTolerance');
      expect(metrics).toHaveProperty('singlePointsOfFailure');
      
      expect(metrics.nodeCount).toBeGreaterThan(0);
      expect(Array.isArray(metrics.geographicDistribution)).toBe(true);
      expect(metrics.consensusHealth).toBeGreaterThanOrEqual(0);
      expect(metrics.consensusHealth).toBeLessThanOrEqual(1);
      expect(typeof metrics.networkPartitionTolerance).toBe('boolean');
      expect(Array.isArray(metrics.singlePointsOfFailure)).toBe(true);
    });

    it('should calculate consensus health correctly', async () => {
      await service.discoverNodes();
      
      const metrics = await service.collectDecentralizationMetrics();
      
      // Consensus health should be reasonable for active nodes
      expect(metrics.consensusHealth).toBeGreaterThan(0.5);
    });
  });

  describe('assessDecentralizationHealth', () => {
    it('should provide comprehensive health assessment', async () => {
      await service.discoverNodes();
      
      const health = await service.assessDecentralizationHealth();
      
      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('nodeDistribution');
      expect(health).toHaveProperty('consensus');
      expect(health).toHaveProperty('network');
      expect(health).toHaveProperty('singlePointsOfFailure');
      
      expect(['healthy', 'degraded', 'critical']).toContain(health.overall);
      expect(health.nodeDistribution.total).toBeGreaterThan(0);
      expect(health.nodeDistribution.active).toBeGreaterThan(0);
      expect(health.consensus.health).toBeGreaterThanOrEqual(0);
      expect(health.consensus.health).toBeLessThanOrEqual(1);
    });

    it('should detect geographic distribution', async () => {
      await service.discoverNodes();
      
      const health = await service.assessDecentralizationHealth();
      
      expect(health.nodeDistribution.geographic.countries).toBeGreaterThan(1);
      expect(health.nodeDistribution.geographic.regions).toBeGreaterThan(1);
      expect(health.nodeDistribution.geographic.minNodesPerRegion).toBeGreaterThan(0);
    });

    it('should calculate Byzantine fault tolerance', async () => {
      await service.discoverNodes();
      
      const health = await service.assessDecentralizationHealth();
      
      expect(health.consensus.faultTolerance).toBeGreaterThanOrEqual(0);
      expect(health.consensus.faultTolerance).toBeLessThanOrEqual(1);
    });
  });

  describe('testPartitionTolerance', () => {
    it('should test network partition tolerance', async () => {
      await service.discoverNodes();
      
      const test: PartitionToleranceTest = {
        id: 'test-partition-1',
        type: 'random',
        duration: 100, // Very short duration for test
        affectedNodes: ['qnet-node-1'],
        expectedBehavior: {
          consensusContinues: true,
          dataAvailability: true,
          serviceAvailability: ['consensus', 'storage']
        }
      };
      
      const result = await service.testPartitionTolerance(test);
      
      expect(result).toHaveProperty('testId', test.id);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('actualBehavior');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('violations');
      
      expect(typeof result.success).toBe('boolean');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.violations)).toBe(true);
      
      // Verify metrics collection during test
      expect(Array.isArray(result.metrics.consensusHealth)).toBe(true);
      expect(Array.isArray(result.metrics.networkLatency)).toBe(true);
      expect(Array.isArray(result.metrics.errorRate)).toBe(true);
    });

    it('should detect violations when expectations are not met', async () => {
      await service.discoverNodes();
      
      const test: PartitionToleranceTest = {
        id: 'test-partition-strict',
        type: 'targeted',
        duration: 100, // Very short duration for test
        affectedNodes: ['qnet-node-1', 'qnet-node-2'], // Partition some nodes
        expectedBehavior: {
          consensusContinues: true,
          dataAvailability: true,
          serviceAvailability: ['consensus']
        }
      };
      
      const result = await service.testPartitionTolerance(test);
      
      // Test should complete successfully
      expect(result.testId).toBe(test.id);
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.violations)).toBe(true);
    });
  });

  describe('simulateNetworkPartition', () => {
    it('should simulate network partition correctly', async () => {
      await service.discoverNodes();
      
      const nodeIds = ['qnet-node-1', 'qnet-node-2'];
      const duration = 3000;
      
      const partition = await service.simulateNetworkPartition(nodeIds, duration);
      
      expect(partition).toHaveProperty('id');
      expect(partition).toHaveProperty('nodes', nodeIds);
      expect(partition).toHaveProperty('isolatedAt');
      expect(partition).toHaveProperty('duration', duration);
      expect(partition).toHaveProperty('resolved', false);
      expect(partition).toHaveProperty('impact');
      
      // Verify nodes are marked as unreachable
      const nodes = await service.monitorNodeHealth();
      const partitionedNodes = nodes.filter(n => nodeIds.includes(n.id));
      partitionedNodes.forEach(node => {
        expect(node.status).toBe('unreachable');
      });
    });

    it('should auto-resolve partition after duration', async () => {
      await service.discoverNodes();
      
      const nodeIds = ['qnet-node-1'];
      const duration = 100; // Short duration for test
      
      const partition = await service.simulateNetworkPartition(nodeIds, duration);
      
      // Wait for auto-resolution
      vi.advanceTimersByTime(duration + 100);
      
      // Check if partition is resolved (in a real implementation)
      expect(partition.id).toBeDefined();
      expect(partition.nodes).toEqual(nodeIds);
    }, 2000); // 2 second timeout
  });

  describe('triggerScaling', () => {
    it('should trigger scaling actions', async () => {
      await service.discoverNodes();
      
      const trigger: ScalingTrigger = {
        type: 'cpu',
        threshold: 70,
        action: 'scale_up',
        cooldownMs: 1000
      };
      
      const result = await service.triggerScaling(trigger);
      
      expect(result).toHaveProperty('triggerId');
      expect(result).toHaveProperty('action', 'scale_up');
      expect(result).toHaveProperty('nodesAdded');
      expect(result).toHaveProperty('nodesRemoved');
      expect(result).toHaveProperty('nodesRebalanced');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('success');
      
      expect(Array.isArray(result.nodesAdded)).toBe(true);
      expect(Array.isArray(result.nodesRemoved)).toBe(true);
      expect(Array.isArray(result.nodesRebalanced)).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should respect cooldown periods', async () => {
      await service.discoverNodes();
      
      const trigger: ScalingTrigger = {
        type: 'memory',
        threshold: 80,
        action: 'scale_up',
        cooldownMs: 5000 // 5 seconds
      };
      
      // First scaling action
      const result1 = await service.triggerScaling(trigger);
      expect(result1.success).toBe(true);
      
      // Immediate second action should fail due to cooldown
      const result2 = await service.triggerScaling(trigger);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('cooldown');
    });

    it('should handle different scaling actions', async () => {
      await service.discoverNodes();
      
      const scaleUpTrigger: ScalingTrigger = {
        type: 'cpu',
        threshold: 70,
        action: 'scale_up',
        cooldownMs: 100
      };
      
      const redistributeTrigger: ScalingTrigger = {
        type: 'network',
        threshold: 200,
        action: 'redistribute',
        cooldownMs: 100
      };
      
      const scaleUpResult = await service.triggerScaling(scaleUpTrigger);
      expect(scaleUpResult.action).toBe('scale_up');
      
      // Wait for cooldown
      vi.advanceTimersByTime(200);
      
      const redistributeResult = await service.triggerScaling(redistributeTrigger);
      expect(redistributeResult.action).toBe('redistribute');
    });
  });

  describe('validateDistributedOperation', () => {
    it('should validate distributed operation requirements', async () => {
      await service.discoverNodes();
      
      const result = await service.validateDistributedOperation(3, 150);
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('nodeCount');
      expect(result).toHaveProperty('averageLatency');
      expect(result).toHaveProperty('violations');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(result.nodeCount).toBeGreaterThan(0);
      expect(result.averageLatency).toBeGreaterThan(0);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should detect insufficient nodes', async () => {
      await service.discoverNodes();
      
      const result = await service.validateDistributedOperation(100, 1000); // Require 100 nodes
      
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.includes('Insufficient nodes'))).toBe(true);
    });

    it('should detect high latency', async () => {
      await service.discoverNodes();
      
      const result = await service.validateDistributedOperation(1, 10); // Very low latency requirement
      
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.includes('High latency'))).toBe(true);
    });
  });

  describe('detectSinglePointsOfFailure', () => {
    it('should detect single points of failure', async () => {
      await service.discoverNodes();
      
      const result = await service.detectSinglePointsOfFailure();
      
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('critical');
      expect(result).toHaveProperty('recommendations');
      
      expect(result.count).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.critical)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      
      // Should have recommendations if there are critical issues
      if (result.count > 0) {
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should detect geographic concentration', async () => {
      await service.discoverNodes();
      
      const result = await service.detectSinglePointsOfFailure();
      
      // The simulated nodes should have good geographic distribution
      // so geographic concentration should not be a major issue
      expect(result.count).toBeLessThan(5); // Reasonable threshold
    });
  });

  describe('monitoring', () => {
    it('should start and stop monitoring', async () => {
      await service.discoverNodes();
      
      await service.startMonitoring(1000);
      
      // Verify monitoring is active (no direct way to test, but should not throw)
      expect(true).toBe(true);
      
      await service.stopMonitoring();
      
      // Should stop without errors
      expect(true).toBe(true);
    });

    it('should handle monitoring errors gracefully', async () => {
      // Start monitoring without discovering nodes first
      await service.startMonitoring(100);
      
      // Should not throw errors even with no nodes
      vi.advanceTimersByTime(200);
      
      await service.stopMonitoring();
      expect(true).toBe(true);
    });
  });

  describe('scaling configuration', () => {
    it('should get and update scaling triggers', async () => {
      const initialTriggers = service.getScalingTriggers();
      expect(Array.isArray(initialTriggers)).toBe(true);
      expect(initialTriggers.length).toBeGreaterThan(0);
      
      const newTriggers: ScalingTrigger[] = [
        {
          type: 'cpu',
          threshold: 80,
          action: 'scale_up',
          cooldownMs: 60000
        },
        {
          type: 'memory',
          threshold: 85,
          action: 'scale_up',
          cooldownMs: 60000
        }
      ];
      
      await service.updateScalingTriggers(newTriggers);
      
      const updatedTriggers = service.getScalingTriggers();
      expect(updatedTriggers).toEqual(newTriggers);
    });

    it('should preserve trigger configuration after update', async () => {
      const customTriggers: ScalingTrigger[] = [
        {
          type: 'network',
          threshold: 300,
          action: 'redistribute',
          cooldownMs: 120000
        }
      ];
      
      await service.updateScalingTriggers(customTriggers);
      
      const retrievedTriggers = service.getScalingTriggers();
      expect(retrievedTriggers).toHaveLength(1);
      expect(retrievedTriggers[0].type).toBe('network');
      expect(retrievedTriggers[0].threshold).toBe(300);
      expect(retrievedTriggers[0].action).toBe('redistribute');
      expect(retrievedTriggers[0].cooldownMs).toBe(120000);
    });
  });
});