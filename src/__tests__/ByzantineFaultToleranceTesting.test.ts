/**
 * Byzantine Fault Tolerance Testing Service Tests
 * Comprehensive test suite for Byzantine fault injection and adversarial security testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ByzantineFaultToleranceTestingImpl } from '../services/ByzantineFaultToleranceTesting.js';
import {
  FaultInjectionScenario,
  AdversarialSecurityTest,
  ByzantineBehaviorType,
  AttackType
} from '../interfaces/ByzantineFaultTolerance.js';

describe('ByzantineFaultToleranceTestingImpl', () => {
  let bftTesting: ByzantineFaultToleranceTestingImpl;

  beforeEach(() => {
    bftTesting = new ByzantineFaultToleranceTestingImpl();
  });

  describe('Fault Injection Scenarios', () => {
    it('should execute basic Byzantine fault injection scenario', async () => {
      const scenario: FaultInjectionScenario = {
        scenarioId: 'basic-bft-test',
        name: 'Basic Byzantine Fault Test',
        description: 'Test system resilience with 1 Byzantine node out of 4',
        byzantineNodeCount: 1,
        totalNodeCount: 4,
        byzantinePercentage: 25,
        duration: 5000,
        behaviors: ['lying'],
        expectedOutcome: 'system_resilient',
        consensusType: 'pbft'
      };

      const result = await bftTesting.executeFaultInjectionScenario(scenario);

      expect(result).toBeDefined();
      expect(result.scenarioId).toBe(scenario.scenarioId);
      expect(result.success).toBe(true); // Should succeed with 25% Byzantine nodes
      expect(result.totalNodes).toBe(4);
      expect(result.byzantineNodes).toBe(1);
      expect(result.byzantinePercentage).toBe(25);
      expect(result.consensusRounds.length).toBeGreaterThan(0);
      expect(result.systemResilience.safetyMaintained).toBe(true);
      expect(result.systemResilience.livenessMaintained).toBe(true);
    });

    it('should handle Byzantine fault injection above tolerance threshold', async () => {
      const scenario: FaultInjectionScenario = {
        scenarioId: 'high-bft-test',
        name: 'High Byzantine Fault Test',
        description: 'Test system with Byzantine nodes above 1/3 threshold',
        byzantineNodeCount: 2,
        totalNodeCount: 4,
        byzantinePercentage: 50,
        duration: 3000,
        behaviors: ['lying', 'equivocating'],
        expectedOutcome: 'system_failure',
        consensusType: 'pbft'
      };

      const result = await bftTesting.executeFaultInjectionScenario(scenario);

      expect(result).toBeDefined();
      expect(result.scenarioId).toBe(scenario.scenarioId);
      expect(result.success).toBe(false); // Should fail with 50% Byzantine nodes
      expect(result.byzantinePercentage).toBe(50);
      expect(result.systemResilience.safetyMaintained).toBe(false);
    });

    it('should test multiple Byzantine behavior types', async () => {
      const behaviors: ByzantineBehaviorType[] = ['silent', 'lying', 'equivocating', 'delaying', 'flooding'];
      
      for (const behavior of behaviors) {
        const scenario: FaultInjectionScenario = {
          scenarioId: `behavior-test-${behavior}`,
          name: `${behavior} Behavior Test`,
          description: `Test system resilience against ${behavior} Byzantine behavior`,
          byzantineNodeCount: 1,
          totalNodeCount: 7,
          byzantinePercentage: 14.3,
          duration: 2000,
          behaviors: [behavior],
          expectedOutcome: 'system_resilient',
          consensusType: 'pbft'
        };

        const result = await bftTesting.executeFaultInjectionScenario(scenario);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.maliciousActions.length).toBeGreaterThan(0);
        
        // Verify behavior-specific malicious actions
        const behaviorActions = result.maliciousActions.filter(action => 
          action.description.includes(behavior)
        );
        expect(behaviorActions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Node Compromise and Recovery', () => {
    it('should compromise nodes with specified behavior', async () => {
      const behaviorType: ByzantineBehaviorType = 'lying';

      // First initialize some nodes
      const scenario: FaultInjectionScenario = {
        scenarioId: 'init-test',
        name: 'Initialize Test',
        description: 'Initialize nodes for compromise test',
        byzantineNodeCount: 0,
        totalNodeCount: 5,
        byzantinePercentage: 0,
        duration: 1000,
        behaviors: [],
        expectedOutcome: 'system_resilient',
        consensusType: 'pbft'
      };
      
      await bftTesting.executeFaultInjectionScenario(scenario);

      // Get actual node IDs from the initialized nodes
      const allNodes = await bftTesting.getByzantineNodeStatus();
      const nodeIds = [allNodes[0].nodeId, allNodes[1].nodeId];

      const result = await bftTesting.compromiseNodes(nodeIds, behaviorType);
      expect(result).toBe(true);

      const nodeStatus = await bftTesting.getByzantineNodeStatus();
      const compromisedNodes = nodeStatus.filter(node => 
        nodeIds.includes(node.nodeId) && node.status === 'byzantine'
      );
      
      expect(compromisedNodes).toHaveLength(2);
      compromisedNodes.forEach(node => {
        expect(node.behaviorType).toBe(behaviorType);
        expect(node.compromisedSince).toBeDefined();
        expect(node.trustScore).toBeLessThan(100);
      });
    });

    it('should restore compromised nodes to honest behavior', async () => {
      // First initialize and compromise nodes
      const scenario: FaultInjectionScenario = {
        scenarioId: 'restore-test',
        name: 'Restore Test',
        description: 'Initialize nodes for restore test',
        byzantineNodeCount: 2,
        totalNodeCount: 5,
        byzantinePercentage: 40,
        duration: 1000,
        behaviors: ['lying'],
        expectedOutcome: 'partial_degradation',
        consensusType: 'pbft'
      };
      
      await bftTesting.executeFaultInjectionScenario(scenario);

      // Get Byzantine node IDs
      const allNodes = await bftTesting.getByzantineNodeStatus();
      const byzantineNodes = allNodes.filter(node => node.status === 'byzantine');
      const nodeIds = byzantineNodes.slice(0, 2).map(node => node.nodeId);

      const restoreResult = await bftTesting.restoreNodes(nodeIds);
      expect(restoreResult).toBe(true);

      const nodeStatus = await bftTesting.getByzantineNodeStatus();
      const restoredNodes = nodeStatus.filter(node => 
        nodeIds.includes(node.nodeId) && node.status === 'honest'
      );
      
      expect(restoredNodes.length).toBeGreaterThan(0);
      restoredNodes.forEach(node => {
        expect(node.behaviorType).toBe('honest');
        expect(node.compromisedSince).toBeUndefined();
        expect(node.consensusParticipation).toBe(true);
      });
    });
  });

  describe('Adversarial Security Testing', () => {
    it('should execute Sybil attack test', async () => {
      const test: AdversarialSecurityTest = {
        testId: 'sybil-attack-test',
        name: 'Sybil Attack Test',
        attackType: 'sybil_attack',
        attackVector: 'network_layer',
        sophistication: 'intermediate',
        targetNodes: ['target-node-1', 'target-node-2'],
        attackDuration: 30000,
        expectedDetectionTime: 5000,
        expectedMitigationTime: 10000
      };

      const result = await bftTesting.executeAdversarialTest(test);

      expect(result).toBeDefined();
      expect(result.testId).toBe(test.testId);
      expect(result.attackType).toBe('sybil_attack');
      expect(result.detectionTime).toBeDefined();
      expect(result.mitigationTime).toBeDefined();
      expect(result.lessonsLearned.length).toBeGreaterThan(0);
      expect(result.mitigationStrategies.length).toBeGreaterThan(0);
    });

    it('should test different attack sophistication levels', async () => {
      const sophisticationLevels = ['basic', 'intermediate', 'advanced', 'nation_state'] as const;
      
      for (const sophistication of sophisticationLevels) {
        const test: AdversarialSecurityTest = {
          testId: `sophistication-test-${sophistication}`,
          name: `${sophistication} Attack Test`,
          attackType: 'eclipse_attack',
          attackVector: 'network_layer',
          sophistication,
          targetNodes: ['target-node-1'],
          attackDuration: 10000,
          expectedDetectionTime: 2000,
          expectedMitigationTime: 5000
        };

        const result = await bftTesting.executeAdversarialTest(test);

        expect(result).toBeDefined();
        expect(result.detectionTime).toBeGreaterThan(0);
        
        // Higher sophistication should generally mean longer detection times
        if (sophistication === 'nation_state') {
          expect(result.detectionTime).toBeGreaterThan(1000);
        }
      }
    });

    it('should test various attack types', async () => {
      const attackTypes: AttackType[] = [
        'sybil_attack',
        'eclipse_attack',
        'long_range_attack',
        'double_spending',
        'consensus_delay',
        'ddos_attack'
      ];

      for (const attackType of attackTypes) {
        const test: AdversarialSecurityTest = {
          testId: `attack-type-test-${attackType}`,
          name: `${attackType} Test`,
          attackType,
          attackVector: 'consensus_layer',
          sophistication: 'intermediate',
          targetNodes: ['target-node-1'],
          attackDuration: 5000,
          expectedDetectionTime: 2000,
          expectedMitigationTime: 4000
        };

        const result = await bftTesting.executeAdversarialTest(test);

        expect(result).toBeDefined();
        expect(result.attackType).toBe(attackType);
        expect(result.lessonsLearned).toContain(
          expect.stringContaining(attackType)
        );
      }
    });
  });

  describe('Consensus Validation Under Attack', () => {
    it('should validate consensus with Byzantine nodes present', async () => {
      // Initialize scenario first
      const scenario: FaultInjectionScenario = {
        scenarioId: 'consensus-validation-test',
        name: 'Consensus Validation Test',
        description: 'Test consensus validation under Byzantine conditions',
        byzantineNodeCount: 1,
        totalNodeCount: 7,
        byzantinePercentage: 14.3,
        duration: 3000,
        behaviors: ['lying'],
        expectedOutcome: 'system_resilient',
        consensusType: 'pbft'
      };
      
      await bftTesting.executeFaultInjectionScenario(scenario);

      const byzantineNodes = ['bft-node-1'];
      const consensusRounds = 5;

      const validations = await bftTesting.validateConsensusUnderAttack(
        byzantineNodes, 
        consensusRounds
      );

      expect(validations).toHaveLength(consensusRounds);
      
      validations.forEach((validation, index) => {
        expect(validation.consensusRound).toBe(index);
        expect(validation.participatingNodes.length).toBeGreaterThan(0);
        expect(validation.byzantineNodes).toContain('bft-node-1');
        expect(validation.proposedValue).toBeDefined();
        expect(validation.consensusTime).toBeGreaterThan(0);
      });

      // Most rounds should reach consensus with only 1 Byzantine node out of 7
      const successfulRounds = validations.filter(v => v.consensusReached);
      expect(successfulRounds.length).toBeGreaterThan(consensusRounds * 0.7);
    });

    it('should detect Byzantine behavior during consensus', async () => {
      // Initialize scenario with Byzantine nodes
      const scenario: FaultInjectionScenario = {
        scenarioId: 'detection-test',
        name: 'Byzantine Detection Test',
        description: 'Test Byzantine behavior detection',
        byzantineNodeCount: 2,
        totalNodeCount: 10,
        byzantinePercentage: 20,
        duration: 5000,
        behaviors: ['lying', 'equivocating'],
        expectedOutcome: 'system_resilient',
        consensusType: 'pbft'
      };
      
      await bftTesting.executeFaultInjectionScenario(scenario);

      const detection = await bftTesting.detectByzantineBehavior();

      expect(detection).toBeDefined();
      expect(detection.suspiciousNodes.length).toBeGreaterThan(0);
      expect(detection.detectionConfidence).toBeGreaterThan(0);
      expect(detection.evidenceCollected.length).toBeGreaterThan(0);

      // Verify evidence contains relevant malicious actions
      const evidenceTypes = detection.evidenceCollected.map(action => action.type);
      expect(evidenceTypes).toContain('false_vote');
    });
  });

  describe('Coordinated Attack Simulation', () => {
    it('should simulate coordinated Byzantine attack', async () => {
      // Initialize nodes first
      const scenario: FaultInjectionScenario = {
        scenarioId: 'coordinated-attack-init',
        name: 'Coordinated Attack Init',
        description: 'Initialize nodes for coordinated attack test',
        byzantineNodeCount: 0,
        totalNodeCount: 10,
        byzantinePercentage: 0,
        duration: 1000,
        behaviors: [],
        expectedOutcome: 'system_resilient',
        consensusType: 'pbft'
      };
      
      await bftTesting.executeFaultInjectionScenario(scenario);

      const attackingNodes = ['bft-node-1', 'bft-node-2', 'bft-node-3'];
      const attackType: AttackType = 'consensus_delay';
      const duration = 2000; // Reduced duration for faster tests

      const result = await bftTesting.simulateCoordinatedAttack(
        attackingNodes,
        attackType,
        duration
      );

      expect(result).toBeDefined();
      expect(result.scenarioId).toContain('coordinated-attack');
      expect(result.byzantineNodes).toBe(attackingNodes.length);
      expect(result.byzantinePercentage).toBe(30); // 3 out of 10 nodes
      expect(result.duration).toBeGreaterThanOrEqual(duration);
      expect(result.recommendations.length).toBeGreaterThan(0);

      // With 30% Byzantine nodes, system should still be resilient
      expect(result.success).toBe(true);
    }, 15000); // 15 second timeout

    it('should handle coordinated attack above Byzantine threshold', async () => {
      // Initialize nodes first
      const scenario: FaultInjectionScenario = {
        scenarioId: 'coordinated-attack-threshold',
        name: 'Coordinated Attack Threshold Test',
        description: 'Test coordinated attack above Byzantine threshold',
        byzantineNodeCount: 0,
        totalNodeCount: 6,
        byzantinePercentage: 0,
        duration: 1000,
        behaviors: [],
        expectedOutcome: 'system_resilient',
        consensusType: 'pbft'
      };
      
      await bftTesting.executeFaultInjectionScenario(scenario);

      const attackingNodes = ['bft-node-1', 'bft-node-2', 'bft-node-3'];
      const attackType: AttackType = 'double_spending';
      const duration = 2000; // Reduced duration

      const result = await bftTesting.simulateCoordinatedAttack(
        attackingNodes,
        attackType,
        duration
      );

      expect(result).toBeDefined();
      expect(result.byzantinePercentage).toBe(50); // 3 out of 6 nodes
      
      // With 50% Byzantine nodes, system should fail
      expect(result.success).toBe(false);
      expect(result.recommendations.some(rec => rec.includes('Critical'))).toBe(true);
    }, 15000); // 15 second timeout
  });

  describe('BFT Report Generation', () => {
    it('should generate comprehensive BFT report', async () => {
      // Execute several test scenarios first
      const scenarios = [
        {
          scenarioId: 'report-test-1',
          name: 'Report Test 1',
          description: 'First test for report generation',
          byzantineNodeCount: 1,
          totalNodeCount: 4,
          byzantinePercentage: 25,
          duration: 2000,
          behaviors: ['lying'] as ByzantineBehaviorType[],
          expectedOutcome: 'system_resilient' as const,
          consensusType: 'pbft' as const
        },
        {
          scenarioId: 'report-test-2',
          name: 'Report Test 2',
          description: 'Second test for report generation',
          byzantineNodeCount: 2,
          totalNodeCount: 7,
          byzantinePercentage: 28.6,
          duration: 3000,
          behaviors: ['equivocating'] as ByzantineBehaviorType[],
          expectedOutcome: 'system_resilient' as const,
          consensusType: 'pbft' as const
        }
      ];

      for (const scenario of scenarios) {
        await bftTesting.executeFaultInjectionScenario(scenario);
      }

      const report = await bftTesting.generateBFTReport();

      expect(report).toBeDefined();
      expect(report.reportId).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.timeRange).toBeDefined();
      
      expect(report.summary.totalTests).toBeGreaterThanOrEqual(2);
      expect(report.summary.averageResilienceScore).toBeGreaterThan(0);
      
      expect(report.scenarios.length).toBeGreaterThanOrEqual(2);
      expect(report.systemResilience).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.riskAssessment).toBeDefined();

      // Verify report structure
      expect(report.recommendations.immediate).toBeInstanceOf(Array);
      expect(report.recommendations.shortTerm).toBeInstanceOf(Array);
      expect(report.recommendations.longTerm).toBeInstanceOf(Array);
      
      expect(report.riskAssessment.highRiskVulnerabilities).toBeInstanceOf(Array);
      expect(report.riskAssessment.mediumRiskVulnerabilities).toBeInstanceOf(Array);
      expect(report.riskAssessment.lowRiskVulnerabilities).toBeInstanceOf(Array);
    });

    it('should generate report with custom time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const timeRange = {
        start: oneHourAgo,
        end: now
      };

      const report = await bftTesting.generateBFTReport(timeRange);

      expect(report).toBeDefined();
      expect(report.timeRange.start).toEqual(oneHourAgo);
      expect(report.timeRange.end).toEqual(now);
    });
  });

  describe('Error Handling', () => {
    it('should handle scenario execution errors gracefully', async () => {
      const invalidScenario: FaultInjectionScenario = {
        scenarioId: 'invalid-scenario',
        name: 'Invalid Scenario',
        description: 'Scenario designed to cause errors',
        byzantineNodeCount: -1, // Invalid negative count
        totalNodeCount: 0, // Invalid zero count
        byzantinePercentage: 150, // Invalid percentage > 100
        duration: -1000, // Invalid negative duration
        behaviors: ['invalid_behavior' as any],
        expectedOutcome: 'system_failure',
        consensusType: 'pbft'
      };

      const result = await bftTesting.executeFaultInjectionScenario(invalidScenario);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.recommendations).toContain(
        expect.stringContaining('investigate')
      );
    });

    it('should handle adversarial test errors gracefully', async () => {
      const invalidTest: AdversarialSecurityTest = {
        testId: 'invalid-test',
        name: 'Invalid Test',
        attackType: 'invalid_attack' as any,
        attackVector: 'invalid_vector' as any,
        sophistication: 'invalid_level' as any,
        targetNodes: [],
        attackDuration: -1000,
        expectedDetectionTime: -500,
        expectedMitigationTime: -1000
      };

      const result = await bftTesting.executeAdversarialTest(invalidTest);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.lessonsLearned).toContain(
        expect.stringContaining('failed')
      );
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large-scale Byzantine fault injection', async () => {
      const largeScaleScenario: FaultInjectionScenario = {
        scenarioId: 'large-scale-test',
        name: 'Large Scale Byzantine Test',
        description: 'Test with many nodes to verify scalability',
        byzantineNodeCount: 10,
        totalNodeCount: 100,
        byzantinePercentage: 10,
        duration: 5000,
        behaviors: ['lying', 'equivocating', 'delaying'],
        expectedOutcome: 'system_resilient',
        consensusType: 'pbft'
      };

      const startTime = Date.now();
      const result = await bftTesting.executeFaultInjectionScenario(largeScaleScenario);
      const executionTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.totalNodes).toBe(100);
      expect(result.byzantineNodes).toBe(10);
      
      // Execution should complete within reasonable time (30 seconds)
      expect(executionTime).toBeLessThan(30000);
      
      // Should generate substantial consensus rounds and malicious actions
      expect(result.consensusRounds.length).toBeGreaterThan(5);
      expect(result.maliciousActions.length).toBeGreaterThan(0);
    });

    it('should maintain performance under sustained Byzantine attacks', async () => {
      const sustainedAttackScenario: FaultInjectionScenario = {
        scenarioId: 'sustained-attack-test',
        name: 'Sustained Byzantine Attack Test',
        description: 'Test system performance under prolonged Byzantine attack',
        byzantineNodeCount: 5,
        totalNodeCount: 20,
        byzantinePercentage: 25,
        duration: 15000, // 15 seconds of sustained attack
        behaviors: ['coordinated'],
        expectedOutcome: 'system_resilient',
        consensusType: 'pbft'
      };

      const result = await bftTesting.executeFaultInjectionScenario(sustainedAttackScenario);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(1000); // At least 1 second
      
      // Performance impact should be measurable but not catastrophic
      expect(result.performanceImpact.latencyIncrease).toBeLessThan(200); // Less than 200% increase
      expect(result.performanceImpact.throughputDecrease).toBeLessThan(50); // Less than 50% decrease
      
      // System should maintain consensus throughout the attack
      const consensusSuccessRate = result.consensusRounds.filter(round => 
        round.consensusReached
      ).length / result.consensusRounds.length;
      
      expect(consensusSuccessRate).toBeGreaterThan(0.8); // At least 80% success rate
    });
  });
});