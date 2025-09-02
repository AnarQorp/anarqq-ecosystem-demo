/**
 * Consensus Simulator Tests
 * Comprehensive test suite for consensus mechanism simulation under Byzantine conditions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConsensusSimulatorImpl } from '../services/ConsensusSimulator.js';

describe('ConsensusSimulatorImpl', () => {
  let simulator: ConsensusSimulatorImpl;

  beforeEach(() => {
    simulator = new ConsensusSimulatorImpl();
  });

  describe('Initialization', () => {
    it('should initialize PBFT consensus with specified parameters', async () => {
      await simulator.initializeConsensus(7, 'pbft', 2);

      const nodeStatus = simulator.getNodeStatus();
      const byzantineNodes = simulator.getByzantineNodes();

      expect(nodeStatus).toHaveLength(7);
      expect(byzantineNodes).toHaveLength(2);

      // Verify node properties
      nodeStatus.forEach(node => {
        expect(node.nodeId).toMatch(/^consensus-node-\d+$/);
        expect(node.address).toMatch(/^192\.168\.1\.\d+$/);
        expect(node.port).toBeGreaterThanOrEqual(9000);
        expect(node.region).toBeDefined();
        expect(['honest', 'byzantine']).toContain(node.status);
        expect(node.consensusParticipation).toBe(true);
      });

      // Verify Byzantine nodes have lower trust scores
      const byzantineNodeObjects = nodeStatus.filter(node => 
        byzantineNodes.includes(node.nodeId)
      );
      byzantineNodeObjects.forEach(node => {
        expect(node.status).toBe('byzantine');
        expect(node.trustScore).toBeLessThan(100);
        expect(node.behaviorType).not.toBe('honest');
      });
    });

    it('should initialize different consensus types', async () => {
      const consensusTypes = ['pbft', 'raft', 'pos', 'pow'] as const;

      for (const consensusType of consensusTypes) {
        await simulator.initializeConsensus(5, consensusType, 1);
        
        const nodeStatus = simulator.getNodeStatus();
        expect(nodeStatus).toHaveLength(5);
        
        const byzantineNodes = simulator.getByzantineNodes();
        expect(byzantineNodes).toHaveLength(1);
      }
    });

    it('should handle edge cases in initialization', async () => {
      // Test with zero Byzantine nodes
      await simulator.initializeConsensus(4, 'pbft', 0);
      expect(simulator.getByzantineNodes()).toHaveLength(0);

      // Test with all nodes Byzantine (should be limited to total nodes)
      await simulator.initializeConsensus(3, 'pbft', 10);
      expect(simulator.getByzantineNodes()).toHaveLength(3);
    });
  });

  describe('PBFT Consensus', () => {
    beforeEach(async () => {
      await simulator.initializeConsensus(7, 'pbft', 2);
    });

    it('should reach consensus with Byzantine nodes below threshold', async () => {
      const proposedValue = 'test-value-1';
      const result = await simulator.executeConsensusRound(proposedValue);

      expect(result).toBeDefined();
      expect(result.consensusRound).toBe(1);
      expect(result.participatingNodes).toHaveLength(7);
      expect(result.byzantineNodes).toHaveLength(2);
      expect(result.proposedValue).toBe(proposedValue);
      expect(result.consensusReached).toBe(true); // 2 Byzantine out of 7 should succeed
      expect(result.finalValue).toBe(proposedValue);
      expect(result.consensusTime).toBeGreaterThan(0);
      expect(result.safetyViolation).toBe(false);
    });

    it('should fail consensus with Byzantine nodes above threshold', async () => {
      // Reinitialize with more Byzantine nodes (3 out of 7 = 42.8%, above 1/3 threshold)
      await simulator.initializeConsensus(7, 'pbft', 3);
      
      const proposedValue = 'test-value-2';
      const result = await simulator.executeConsensusRound(proposedValue);

      expect(result.consensusReached).toBe(false);
      expect(result.byzantineNodes).toHaveLength(3);
      expect(result.finalValue).not.toBe(proposedValue);
      expect(result.finalValue).toContain('byzantine-interference');
    });

    it('should detect Byzantine behavior during consensus', async () => {
      const proposedValue = 'test-value-3';
      const result = await simulator.executeConsensusRound(proposedValue);

      expect(result.byzantineDetected).toBeInstanceOf(Array);
      // Detection rate should be reasonable (not 0% or 100% always)
      expect(result.byzantineDetected.length).toBeLessThanOrEqual(result.byzantineNodes.length);
    });

    it('should handle multiple consensus rounds', async () => {
      const rounds = 5;
      const results = [];

      for (let i = 0; i < rounds; i++) {
        const result = await simulator.executeConsensusRound(`value-${i}`);
        results.push(result);
        expect(result.consensusRound).toBe(i + 1);
      }

      const statistics = await simulator.getConsensusStatistics();
      expect(statistics.totalRounds).toBe(rounds);
      expect(statistics.successfulRounds).toBeGreaterThan(0);
      expect(statistics.averageConsensusTime).toBeGreaterThan(0);
      expect(statistics.byzantineDetectionRate).toBeGreaterThanOrEqual(0);
      expect(statistics.byzantineDetectionRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Raft Consensus', () => {
    beforeEach(async () => {
      await simulator.initializeConsensus(5, 'raft', 1);
    });

    it('should reach consensus with honest majority', async () => {
      const proposedValue = 'raft-test-value';
      const result = await simulator.executeConsensusRound(proposedValue);

      expect(result.consensusReached).toBe(true); // 4 honest out of 5 = majority
      expect(result.finalValue).toBe(proposedValue);
    });

    it('should fail with Byzantine majority', async () => {
      await simulator.initializeConsensus(5, 'raft', 3); // 3 Byzantine out of 5
      
      const proposedValue = 'raft-test-value-2';
      const result = await simulator.executeConsensusRound(proposedValue);

      expect(result.consensusReached).toBe(false);
    });

    it('should handle Byzantine leader scenario', async () => {
      // Multiple rounds to test different leader scenarios
      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = await simulator.executeConsensusRound(`raft-value-${i}`);
        results.push(result);
      }

      // At least some rounds should succeed with honest leaders
      const successfulRounds = results.filter(r => r.consensusReached);
      expect(successfulRounds.length).toBeGreaterThan(0);
    });
  });

  describe('Proof of Stake Consensus', () => {
    beforeEach(async () => {
      await simulator.initializeConsensus(6, 'pos', 2);
    });

    it('should reach consensus with sufficient honest stake', async () => {
      const proposedValue = 'pos-test-value';
      const result = await simulator.executeConsensusRound(proposedValue);

      // 4 honest nodes out of 6 = 66.7% stake, should reach consensus
      expect(result.consensusReached).toBe(true);
      expect(result.finalValue).toBe(proposedValue);
    });

    it('should fail with insufficient honest stake', async () => {
      await simulator.initializeConsensus(6, 'pos', 3); // 50% Byzantine stake
      
      const proposedValue = 'pos-test-value-2';
      const result = await simulator.executeConsensusRound(proposedValue);

      expect(result.consensusReached).toBe(false);
    });
  });

  describe('Proof of Work Consensus', () => {
    beforeEach(async () => {
      await simulator.initializeConsensus(5, 'pow', 2);
    });

    it('should reach consensus with honest majority hash power', async () => {
      const proposedValue = 'pow-test-value';
      const result = await simulator.executeConsensusRound(proposedValue);

      // 3 honest out of 5 = 60% hash power, should reach consensus
      expect(result.consensusReached).toBe(true);
      expect(result.finalValue).toBe(proposedValue);
      expect(result.consensusTime).toBeGreaterThan(1000); // PoW should take longer
    });

    it('should fail with Byzantine majority hash power', async () => {
      await simulator.initializeConsensus(5, 'pow', 3); // 60% Byzantine hash power
      
      const proposedValue = 'pow-test-value-2';
      const result = await simulator.executeConsensusRound(proposedValue);

      expect(result.consensusReached).toBe(false);
      expect(result.finalValue).toContain('pow-attack');
    });
  });

  describe('Network Partitions', () => {
    beforeEach(async () => {
      await simulator.initializeConsensus(9, 'pbft', 2);
    });

    it('should handle network partition', async () => {
      const partitionGroups = [
        ['consensus-node-1', 'consensus-node-2', 'consensus-node-3', 'consensus-node-4', 'consensus-node-5'],
        ['consensus-node-6', 'consensus-node-7'],
        ['consensus-node-8', 'consensus-node-9']
      ];

      await simulator.simulateNetworkPartition(partitionGroups);

      const nodeStatus = simulator.getNodeStatus();
      const participatingNodes = nodeStatus.filter(node => node.consensusParticipation);
      
      // Only nodes in the largest partition should participate
      expect(participatingNodes).toHaveLength(5);

      const result = await simulator.executeConsensusRound('partition-test-value');
      expect(result.participatingNodes).toHaveLength(5);
      expect(result.consensusTime).toBeGreaterThan(500); // Should have additional delay
    });

    it('should heal network partition', async () => {
      const partitionGroups = [
        ['consensus-node-1', 'consensus-node-2', 'consensus-node-3'],
        ['consensus-node-4', 'consensus-node-5', 'consensus-node-6'],
        ['consensus-node-7', 'consensus-node-8', 'consensus-node-9']
      ];

      await simulator.simulateNetworkPartition(partitionGroups);
      await simulator.healNetworkPartition();

      const nodeStatus = simulator.getNodeStatus();
      const participatingNodes = nodeStatus.filter(node => 
        node.consensusParticipation && node.status === 'honest'
      );
      
      // All honest nodes should be able to participate again
      expect(participatingNodes.length).toBeGreaterThan(5);

      const result = await simulator.executeConsensusRound('healed-partition-value');
      expect(result.participatingNodes).toHaveLength(9);
    });
  });

  describe('Node Management', () => {
    beforeEach(async () => {
      await simulator.initializeConsensus(5, 'pbft', 1);
    });

    it('should simulate node failure and recovery', async () => {
      const nodeId = 'consensus-node-1';
      
      // Simulate failure
      await simulator.simulateNodeFailure(nodeId);
      
      let nodeStatus = simulator.getNodeStatus();
      const failedNode = nodeStatus.find(node => node.nodeId === nodeId);
      expect(failedNode?.status).toBe('offline');
      expect(failedNode?.consensusParticipation).toBe(false);

      // Test consensus with failed node
      const result1 = await simulator.executeConsensusRound('failure-test-1');
      expect(result1.participatingNodes).not.toContain(nodeId);

      // Simulate recovery
      await simulator.simulateNodeRecovery(nodeId);
      
      nodeStatus = simulator.getNodeStatus();
      const recoveredNode = nodeStatus.find(node => node.nodeId === nodeId);
      expect(recoveredNode?.status).not.toBe('offline');
      expect(recoveredNode?.consensusParticipation).toBe(true);

      // Test consensus with recovered node
      const result2 = await simulator.executeConsensusRound('recovery-test-1');
      expect(result2.participatingNodes).toContain(nodeId);
    });

    it('should add new nodes dynamically', async () => {
      const initialNodeCount = simulator.getNodeStatus().length;
      
      // Add honest node
      await simulator.addNode('new-honest-node', false);
      
      let nodeStatus = simulator.getNodeStatus();
      expect(nodeStatus).toHaveLength(initialNodeCount + 1);
      
      const newHonestNode = nodeStatus.find(node => node.nodeId === 'new-honest-node');
      expect(newHonestNode?.status).toBe('honest');
      expect(newHonestNode?.behaviorType).toBe('honest');
      expect(newHonestNode?.trustScore).toBe(100);

      // Add Byzantine node
      await simulator.addNode('new-byzantine-node', true);
      
      nodeStatus = simulator.getNodeStatus();
      expect(nodeStatus).toHaveLength(initialNodeCount + 2);
      
      const newByzantineNode = nodeStatus.find(node => node.nodeId === 'new-byzantine-node');
      expect(newByzantineNode?.status).toBe('byzantine');
      expect(newByzantineNode?.behaviorType).not.toBe('honest');
      expect(newByzantineNode?.trustScore).toBeLessThan(100);

      // Test consensus with new nodes
      const result = await simulator.executeConsensusRound('new-nodes-test');
      expect(result.participatingNodes).toContain('new-honest-node');
      expect(result.participatingNodes).toContain('new-byzantine-node');
    });

    it('should remove nodes dynamically', async () => {
      const initialNodeCount = simulator.getNodeStatus().length;
      const nodeToRemove = 'consensus-node-1';
      
      await simulator.removeNode(nodeToRemove);
      
      const nodeStatus = simulator.getNodeStatus();
      expect(nodeStatus).toHaveLength(initialNodeCount - 1);
      expect(nodeStatus.find(node => node.nodeId === nodeToRemove)).toBeUndefined();

      // Test consensus without removed node
      const result = await simulator.executeConsensusRound('removed-node-test');
      expect(result.participatingNodes).not.toContain(nodeToRemove);
    });

    it('should handle node management errors', async () => {
      // Try to add duplicate node
      await expect(simulator.addNode('consensus-node-1', false))
        .rejects.toThrow('already exists');

      // Try to remove non-existent node
      await expect(simulator.removeNode('non-existent-node'))
        .rejects.toThrow('does not exist');

      // Try to recover node that's not offline
      const activeNodeId = 'consensus-node-2';
      await simulator.simulateNodeRecovery(activeNodeId); // Should not throw
      
      const nodeStatus = simulator.getNodeStatus();
      const node = nodeStatus.find(n => n.nodeId === activeNodeId);
      expect(node?.consensusParticipation).toBe(true);
    });
  });

  describe('Consensus Statistics', () => {
    beforeEach(async () => {
      await simulator.initializeConsensus(7, 'pbft', 2);
    });

    it('should track consensus statistics accurately', async () => {
      const rounds = 10;
      
      for (let i = 0; i < rounds; i++) {
        await simulator.executeConsensusRound(`stats-test-${i}`);
      }

      const statistics = await simulator.getConsensusStatistics();
      
      expect(statistics.totalRounds).toBe(rounds);
      expect(statistics.successfulRounds).toBeGreaterThan(0);
      expect(statistics.successfulRounds).toBeLessThanOrEqual(rounds);
      expect(statistics.averageConsensusTime).toBeGreaterThan(0);
      expect(statistics.byzantineDetectionRate).toBeGreaterThanOrEqual(0);
      expect(statistics.byzantineDetectionRate).toBeLessThanOrEqual(100);

      // With 2 Byzantine out of 7 nodes, most rounds should succeed
      expect(statistics.successfulRounds / statistics.totalRounds).toBeGreaterThan(0.7);
    });

    it('should provide accurate detection rates', async () => {
      const rounds = 20;
      
      for (let i = 0; i < rounds; i++) {
        await simulator.executeConsensusRound(`detection-test-${i}`);
      }

      const statistics = await simulator.getConsensusStatistics();
      const history = simulator.getConsensusHistory();
      
      // Manually calculate detection rate
      const totalByzantineInstances = history.reduce(
        (sum, round) => sum + round.byzantineNodes.length, 0
      );
      const totalDetectedInstances = history.reduce(
        (sum, round) => sum + round.byzantineDetected.length, 0
      );
      
      const expectedDetectionRate = totalByzantineInstances > 0 ? 
        (totalDetectedInstances / totalByzantineInstances) * 100 : 100;
      
      expect(statistics.byzantineDetectionRate).toBeCloseTo(expectedDetectionRate, 1);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large-scale consensus efficiently', async () => {
      const nodeCount = 50;
      const byzantineCount = 15; // 30% Byzantine nodes
      
      const startTime = Date.now();
      await simulator.initializeConsensus(nodeCount, 'pbft', byzantineCount);
      const initTime = Date.now() - startTime;
      
      expect(initTime).toBeLessThan(1000); // Should initialize within 1 second
      
      const nodeStatus = simulator.getNodeStatus();
      expect(nodeStatus).toHaveLength(nodeCount);
      
      const byzantineNodes = simulator.getByzantineNodes();
      expect(byzantineNodes).toHaveLength(byzantineCount);

      // Test consensus performance with large network
      const consensusStartTime = Date.now();
      const result = await simulator.executeConsensusRound('large-scale-test');
      const consensusTime = Date.now() - consensusStartTime;
      
      expect(consensusTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.participatingNodes).toHaveLength(nodeCount);
      expect(result.byzantineNodes).toHaveLength(byzantineCount);
    });

    it('should maintain performance under network stress', async () => {
      await simulator.initializeConsensus(20, 'pbft', 6);
      
      // Create complex network partition
      const partitionGroups = [
        Array.from({length: 8}, (_, i) => `consensus-node-${i + 1}`),
        Array.from({length: 7}, (_, i) => `consensus-node-${i + 9}`),
        Array.from({length: 5}, (_, i) => `consensus-node-${i + 16}`)
      ];
      
      await simulator.simulateNetworkPartition(partitionGroups);
      
      // Test multiple rounds under partition stress
      const results = [];
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        const result = await simulator.executeConsensusRound(`stress-test-${i}`);
        const roundTime = Date.now() - startTime;
        
        results.push({ result, roundTime });
        expect(roundTime).toBeLessThan(15000); // Should complete within 15 seconds even under stress
      }
      
      // Heal partition and verify recovery
      await simulator.healNetworkPartition();
      
      const recoveryResult = await simulator.executeConsensusRound('recovery-verification');
      expect(recoveryResult.participatingNodes).toHaveLength(20);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle consensus with single node', async () => {
      await simulator.initializeConsensus(1, 'pbft', 0);
      
      const result = await simulator.executeConsensusRound('single-node-test');
      expect(result.consensusReached).toBe(true);
      expect(result.participatingNodes).toHaveLength(1);
      expect(result.byzantineNodes).toHaveLength(0);
    });

    it('should handle all-Byzantine network', async () => {
      await simulator.initializeConsensus(3, 'pbft', 3);
      
      const result = await simulator.executeConsensusRound('all-byzantine-test');
      expect(result.consensusReached).toBe(false);
      expect(result.byzantineNodes).toHaveLength(3);
      expect(result.safetyViolation).toBe(false); // No consensus means no safety violation
    });

    it('should handle rapid consensus rounds', async () => {
      await simulator.initializeConsensus(5, 'pbft', 1);
      
      // Execute many rounds rapidly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(simulator.executeConsensusRound(`rapid-test-${i}`));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.consensusRound).toBe(index + 1);
        expect(result.consensusReached).toBeDefined();
      });
      
      const statistics = await simulator.getConsensusStatistics();
      expect(statistics.totalRounds).toBe(10);
    });
  });
});