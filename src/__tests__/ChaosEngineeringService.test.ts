import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChaosEngineeringService } from '../services/ChaosEngineeringService.js';
import { 
  ChaosExperiment, 
  FaultInjection, 
  ResilienceTestSuite 
} from '../interfaces/ChaosEngineering.js';

describe('ChaosEngineeringService', () => {
  let service: ChaosEngineeringService;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    service = new ChaosEngineeringService();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.NODE_ENV;
  });

  // Helper function to create a basic chaos experiment
  const createBasicExperiment = (overrides: Partial<ChaosExperiment> = {}): ChaosExperiment => ({
    id: 'test_experiment_1',
    name: 'Test Network Partition',
    type: 'network_partition',
    description: 'Test system resilience during network partition',
    duration: 5000, // 5 seconds for testing
    targets: {
      nodeIds: ['node1', 'node2'],
      percentage: 20
    },
    parameters: {
      severity: 'medium'
    },
    expectedBehavior: {
      systemShouldRecover: true,
      maxRecoveryTime: 3000,
      criticalServicesShouldContinue: ['consensus', 'storage'],
      acceptableDataLoss: false,
      consensusShouldContinue: true
    },
    safeguards: {
      maxDuration: 10000,
      abortConditions: ['System health below 10%'],
      rollbackProcedure: ['Stop fault injection', 'Restart services']
    },
    ...overrides
  });

  describe('executeExperiment', () => {
    it('should execute a chaos experiment successfully', async () => {
      const experiment = createBasicExperiment({ duration: 10 }); // Very short duration
      
      const result = await service.executeExperiment(experiment);
      
      expect(result.experimentId).toBe(experiment.id);
      expect(result.status).toBe('success');
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.actualDuration).toBeGreaterThanOrEqual(0);
      expect(result.actualBehavior.systemRecovered).toBe(true);
      expect(result.metrics).toHaveProperty('performanceImpact');
      expect(result.metrics).toHaveProperty('systemHealth');
      expect(result.metrics).toHaveProperty('networkMetrics');
    }, 10000);

    it('should handle experiment safety validation failure', async () => {
      const unsafeExperiment = createBasicExperiment({
        parameters: { severity: 'critical' },
        duration: 700000 // Very long duration
      });
      
      const result = await service.executeExperiment(unsafeExperiment);
      
      expect(result.status).toBe('failure');
      expect(result.violations.some(v => v.includes('Safety validation failed'))).toBe(true);
    });

    it('should handle different experiment types', async () => {
      const nodeFailureExperiment = createBasicExperiment({
        type: 'node_failure',
        targets: { nodeIds: ['node1'] },
        duration: 10
      });
      
      const result = await service.executeExperiment(nodeFailureExperiment);
      
      expect(result.experimentId).toBe(nodeFailureExperiment.id);
      expect(result.status).toBe('success');
    }, 10000);

    it('should track experiment metrics correctly', async () => {
      const experiment = createBasicExperiment();
      
      const result = await service.executeExperiment(experiment);
      
      expect(result.metrics.performanceImpact.latencyIncrease).toBeGreaterThanOrEqual(0);
      expect(result.metrics.performanceImpact.throughputDecrease).toBeGreaterThanOrEqual(0);
      expect(result.metrics.performanceImpact.errorRateIncrease).toBeGreaterThanOrEqual(0);
      expect(result.metrics.systemHealth.beforeExperiment).toBeGreaterThan(0);
      expect(result.metrics.systemHealth.duringExperiment).toBeGreaterThanOrEqual(0);
      expect(result.metrics.systemHealth.afterRecovery).toBeGreaterThanOrEqual(0);
    });
  });

  describe('executeTestSuite', () => {
    it('should execute a resilience test suite', async () => {
      const suite: ResilienceTestSuite = {
        id: 'test_suite_1',
        name: 'Basic Resilience Suite',
        description: 'Test basic system resilience',
        experiments: [
          createBasicExperiment({ id: 'exp1' }),
          createBasicExperiment({ id: 'exp2', type: 'node_failure' })
        ],
        executionOrder: 'sequential',
        cooldownBetweenExperiments: 1000,
        abortOnFirstFailure: false,
        successCriteria: {
          minSuccessRate: 80,
          maxTotalDuration: 60000,
          requiredRecoveryRate: 90
        }
      };
      
      const result = await service.executeTestSuite(suite);
      
      expect(result.suiteId).toBe(suite.id);
      expect(result.status).toBe('success');
      expect(result.experimentResults).toHaveLength(2);
      expect(result.overallMetrics.successRate).toBeGreaterThanOrEqual(0);
      expect(result.overallMetrics.recoveryRate).toBeGreaterThanOrEqual(0);
      expect(result.overallMetrics.systemResilienceScore).toBeGreaterThanOrEqual(0);
    });

    it('should abort on first failure when configured', async () => {
      const suite: ResilienceTestSuite = {
        id: 'abort_suite',
        name: 'Abort on Failure Suite',
        description: 'Test suite that aborts on first failure',
        experiments: [
          createBasicExperiment({ 
            id: 'failing_exp',
            parameters: { severity: 'critical' } // This should fail safety validation
          }),
          createBasicExperiment({ id: 'second_exp' })
        ],
        executionOrder: 'sequential',
        cooldownBetweenExperiments: 0,
        abortOnFirstFailure: true,
        successCriteria: {
          minSuccessRate: 100,
          maxTotalDuration: 60000,
          requiredRecoveryRate: 100
        }
      };
      
      const result = await service.executeTestSuite(suite);
      
      expect(result.status).toBe('aborted');
      expect(result.experimentResults).toHaveLength(1); // Only first experiment should run
    });

    it('should calculate overall metrics correctly', async () => {
      const suite: ResilienceTestSuite = {
        id: 'metrics_suite',
        name: 'Metrics Test Suite',
        description: 'Test suite for metrics calculation',
        experiments: [
          createBasicExperiment({ id: 'exp1' }),
          createBasicExperiment({ id: 'exp2' }),
          createBasicExperiment({ id: 'exp3' })
        ],
        executionOrder: 'sequential',
        cooldownBetweenExperiments: 0,
        abortOnFirstFailure: false,
        successCriteria: {
          minSuccessRate: 50,
          maxTotalDuration: 60000,
          requiredRecoveryRate: 50
        }
      };
      
      const result = await service.executeTestSuite(suite);
      
      expect(result.overallMetrics.successRate).toBeGreaterThanOrEqual(0);
      expect(result.overallMetrics.successRate).toBeLessThanOrEqual(100);
      expect(result.overallMetrics.recoveryRate).toBeGreaterThanOrEqual(0);
      expect(result.overallMetrics.recoveryRate).toBeLessThanOrEqual(100);
      expect(result.overallMetrics.averageRecoveryTime).toBeGreaterThanOrEqual(0);
      expect(result.overallMetrics.systemResilienceScore).toBeGreaterThanOrEqual(0);
      expect(result.overallMetrics.systemResilienceScore).toBeLessThanOrEqual(1);
    });
  });

  describe('injectFault and removeFault', () => {
    it('should inject and remove faults successfully', async () => {
      const fault: FaultInjection = {
        id: 'test_fault',
        type: 'network',
        target: 'node1',
        parameters: {
          intensity: 0.5,
          pattern: 'constant'
        },
        duration: 5000,
        autoRevert: false
      };
      
      const injectionResult = await service.injectFault(fault);
      
      expect(injectionResult.success).toBe(true);
      expect(injectionResult.injectionId).toBeTruthy();
      expect(injectionResult.startTime).toBeInstanceOf(Date);
      
      const removalResult = await service.removeFault(injectionResult.injectionId);
      
      expect(removalResult.success).toBe(true);
      expect(removalResult.endTime).toBeInstanceOf(Date);
    });

    it('should handle auto-revert faults', async () => {
      const fault: FaultInjection = {
        id: 'auto_revert_fault',
        type: 'cpu',
        target: 'node1',
        parameters: {
          intensity: 0.8,
          pattern: 'constant'
        },
        duration: 100, // Very short for testing
        autoRevert: true
      };
      
      const injectionResult = await service.injectFault(fault);
      
      expect(injectionResult.success).toBe(true);
      
      // Wait for auto-revert
      vi.advanceTimersByTime(150);
      
      // Fault should be auto-removed (in a real implementation)
      expect(injectionResult.injectionId).toBeTruthy();
    });

    it('should handle fault removal errors', async () => {
      const result = await service.removeFault('non_existent_fault');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('validateRecovery', () => {
    it('should validate system recovery', async () => {
      const result = await service.validateRecovery('test_experiment');
      
      expect(result.experimentId).toBe('test_experiment');
      expect(result.recoveryStartTime).toBeInstanceOf(Date);
      expect(result.recoveryEndTime).toBeInstanceOf(Date);
      expect(Array.isArray(result.recoverySteps)).toBe(true);
      expect(result.recoverySteps.length).toBeGreaterThan(0);
      expect(result.finalState).toHaveProperty('allNodesHealthy');
      expect(result.finalState).toHaveProperty('allServicesOperational');
      expect(result.finalState).toHaveProperty('dataIntegrityMaintained');
      expect(result.finalState).toHaveProperty('consensusRestored');
      expect(result.finalState).toHaveProperty('performanceRestored');
    });

    it('should track recovery steps with timing', async () => {
      const result = await service.validateRecovery('test_experiment');
      
      result.recoverySteps.forEach(step => {
        expect(step).toHaveProperty('step');
        expect(step).toHaveProperty('timestamp');
        expect(step).toHaveProperty('success');
        expect(step).toHaveProperty('duration');
        expect(step).toHaveProperty('details');
        expect(step.timestamp).toBeInstanceOf(Date);
        expect(typeof step.success).toBe('boolean');
        expect(step.duration).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('simulateNetworkPartition', () => {
    it('should simulate network partition', async () => {
      const nodeIds = ['node1', 'node2'];
      const duration = 5000;
      
      const result = await service.simulateNetworkPartition(nodeIds, duration);
      
      expect(result.partitionId).toBeTruthy();
      expect(result.affectedNodes).toEqual(nodeIds);
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.expectedEndTime).toBeInstanceOf(Date);
      expect(result.expectedEndTime.getTime() - result.startTime.getTime()).toBe(duration);
    });
  });

  describe('simulateNodeFailure', () => {
    it('should simulate different types of node failures', async () => {
      const nodeId = 'test_node';
      const duration = 3000;
      
      const crashResult = await service.simulateNodeFailure(nodeId, 'crash', duration);
      expect(crashResult.failureId).toBeTruthy();
      expect(crashResult.nodeId).toBe(nodeId);
      expect(crashResult.failureType).toBe('crash');
      
      const byzantineResult = await service.simulateNodeFailure(nodeId, 'byzantine', duration);
      expect(byzantineResult.failureType).toBe('byzantine');
      
      const hangResult = await service.simulateNodeFailure(nodeId, 'hang', duration);
      expect(hangResult.failureType).toBe('hang');
    });
  });

  describe('testByzantineFaultTolerance', () => {
    it('should test Byzantine fault tolerance', async () => {
      const byzantineNodeCount = 2;
      const duration = 2000;
      
      const result = await service.testByzantineFaultTolerance(byzantineNodeCount, duration);
      
      expect(result.testId).toBeTruthy();
      expect(result.byzantineNodes).toHaveLength(byzantineNodeCount);
      expect(typeof result.consensusContinued).toBe('boolean');
      expect(result.networkStability).toBeGreaterThanOrEqual(0);
      expect(result.networkStability).toBeLessThanOrEqual(1);
      expect(typeof result.dataIntegrityMaintained).toBe('boolean');
      expect(typeof result.recoverySuccessful).toBe('boolean');
    });

    it('should handle different Byzantine node counts', async () => {
      const smallResult = await service.testByzantineFaultTolerance(1, 1000);
      expect(smallResult.byzantineNodes).toHaveLength(1);
      
      const largeResult = await service.testByzantineFaultTolerance(5, 1000);
      expect(largeResult.byzantineNodes).toHaveLength(5);
      
      // With more Byzantine nodes, consensus should be less likely to continue
      // (assuming total nodes = 10, Byzantine fault tolerance = (n-1)/3)
      if (largeResult.byzantineNodes.length > 3) {
        expect(largeResult.consensusContinued).toBe(false);
      }
    });
  });

  describe('monitorSystemHealth', () => {
    it('should monitor system health during experiments', async () => {
      const result = await service.monitorSystemHealth('test_experiment');
      
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.overallHealth).toBeGreaterThanOrEqual(0);
      expect(result.overallHealth).toBeLessThanOrEqual(1);
      expect(typeof result.nodeHealth).toBe('object');
      expect(typeof result.serviceHealth).toBe('object');
      expect(result.networkHealth).toBeGreaterThanOrEqual(0);
      expect(result.networkHealth).toBeLessThanOrEqual(1);
      expect(result.consensusHealth).toBeGreaterThanOrEqual(0);
      expect(result.consensusHealth).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.alerts)).toBe(true);
    });

    it('should generate alerts for unhealthy components', async () => {
      // This test depends on the random health generation in the service
      // In a real implementation, we would inject specific health conditions
      const result = await service.monitorSystemHealth('test_experiment');
      
      // Verify alert structure if any alerts are generated
      result.alerts.forEach(alert => {
        expect(typeof alert).toBe('string');
        expect(alert.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive chaos engineering report', async () => {
      // First execute some experiments to have data for the report
      const experiment1 = createBasicExperiment({ id: 'report_exp1' });
      const experiment2 = createBasicExperiment({ id: 'report_exp2', type: 'node_failure' });
      
      await service.executeExperiment(experiment1);
      await service.executeExperiment(experiment2);
      
      const report = await service.generateReport(['report_exp1', 'report_exp2']);
      
      expect(report.reportId).toBeTruthy();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.experiments).toHaveLength(2);
      expect(report.overallFindings).toHaveProperty('systemResilienceScore');
      expect(report.overallFindings).toHaveProperty('criticalVulnerabilities');
      expect(report.overallFindings).toHaveProperty('strengthAreas');
      expect(report.overallFindings).toHaveProperty('improvementPriorities');
      expect(report.recommendations).toHaveProperty('immediate');
      expect(report.recommendations).toHaveProperty('shortTerm');
      expect(report.recommendations).toHaveProperty('longTerm');
    });

    it('should handle empty experiment list', async () => {
      const report = await service.generateReport([]);
      
      expect(report.experiments).toHaveLength(0);
      expect(report.overallFindings.systemResilienceScore).toBe(0);
    });
  });

  describe('createExperimentTemplate', () => {
    it('should create QNET node failure template', async () => {
      const template = service.createExperimentTemplate('qnet_node_failure');
      
      expect(template.type).toBe('node_failure');
      expect(template.name).toContain('QNET');
      expect(template.targets.nodeIds).toBeDefined();
      expect(template.expectedBehavior.consensusShouldContinue).toBe(true);
      expect(template.safeguards.maxDuration).toBeGreaterThan(template.duration);
    });

    it('should create consensus disruption template', async () => {
      const template = service.createExperimentTemplate('consensus_disruption');
      
      expect(template.type).toBe('consensus_disruption');
      expect(template.name).toContain('Consensus');
      expect(template.expectedBehavior.criticalServicesShouldContinue).toContain('consensus');
    });

    it('should create Pi Network isolation template', async () => {
      const template = service.createExperimentTemplate('pi_network_isolation');
      
      expect(template.type).toBe('network_partition');
      expect(template.name).toContain('Pi Network');
      expect(template.targets.services).toContain('pi-integration');
    });

    it('should create DAO governance stress template', async () => {
      const template = service.createExperimentTemplate('dao_governance_stress');
      
      expect(template.type).toBe('resource_exhaustion');
      expect(template.name).toContain('DAO');
      expect(template.targets.services).toContain('dao');
    });
  });

  describe('validateExperimentSafety', () => {
    it('should validate safe experiments', async () => {
      const safeExperiment = createBasicExperiment({
        duration: 60000, // 1 minute
        parameters: { severity: 'low' },
        targets: { percentage: 10 }
      });
      
      const result = await service.validateExperimentSafety(safeExperiment);
      
      expect(result.isSafe).toBe(true);
      expect(Array.isArray(result.risks)).toBe(true);
      expect(Array.isArray(result.safeguards)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should identify unsafe experiments', async () => {
      const unsafeExperiment = createBasicExperiment({
        duration: 700000, // Very long duration
        parameters: { severity: 'critical' },
        targets: { percentage: 80 }
      });
      
      const result = await service.validateExperimentSafety(unsafeExperiment);
      
      expect(result.isSafe).toBe(false);
      expect(result.risks.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should check for missing safeguards', async () => {
      const experimentWithoutSafeguards = createBasicExperiment({
        safeguards: {
          maxDuration: 0, // Missing safeguard
          abortConditions: [],
          rollbackProcedure: []
        }
      });
      
      const result = await service.validateExperimentSafety(experimentWithoutSafeguards);
      
      expect(result.risks.some(r => r.includes('maximum duration'))).toBe(true);
    });
  });

  describe('abortExperiment', () => {
    it('should abort non-existent experiment', async () => {
      const result = await service.abortExperiment('non_existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle abort operations', async () => {
      // This test would require a running experiment to abort
      // For now, we test the error case
      const result = await service.abortExperiment('test_experiment');
      
      expect(result.abortTime).toBeInstanceOf(Date);
      expect(Array.isArray(result.rollbackSteps)).toBe(true);
    });
  });

  describe('getActiveExperiments', () => {
    it('should return active experiments list', async () => {
      const activeExperiments = await service.getActiveExperiments();
      
      expect(Array.isArray(activeExperiments)).toBe(true);
      
      // Initially should be empty
      expect(activeExperiments).toHaveLength(0);
    });

    it('should track active experiments during execution', async () => {
      // This would require testing during actual experiment execution
      // For now, we verify the structure
      const activeExperiments = await service.getActiveExperiments();
      
      activeExperiments.forEach(exp => {
        expect(exp).toHaveProperty('experimentId');
        expect(exp).toHaveProperty('type');
        expect(exp).toHaveProperty('startTime');
        expect(exp).toHaveProperty('expectedEndTime');
        expect(exp).toHaveProperty('status');
        expect(['running', 'recovering', 'monitoring']).toContain(exp.status);
      });
    });
  });
});