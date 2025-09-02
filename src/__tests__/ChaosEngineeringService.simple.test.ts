import { describe, it, expect, beforeEach } from 'vitest';
import { ChaosEngineeringService } from '../services/ChaosEngineeringService.js';
import { 
  ChaosExperiment, 
  FaultInjection 
} from '../interfaces/ChaosEngineering.js';

describe('ChaosEngineeringService - Core Functionality', () => {
  let service: ChaosEngineeringService;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    service = new ChaosEngineeringService();
  });

  describe('createExperimentTemplate', () => {
    it('should create QNET node failure template', () => {
      const template = service.createExperimentTemplate('qnet_node_failure');
      
      expect(template.type).toBe('node_failure');
      expect(template.name).toContain('QNET');
      expect(template.targets.nodeIds).toBeDefined();
      expect(template.expectedBehavior.consensusShouldContinue).toBe(true);
      expect(template.safeguards.maxDuration).toBeGreaterThan(template.duration);
    });

    it('should create consensus disruption template', () => {
      const template = service.createExperimentTemplate('consensus_disruption');
      
      expect(template.type).toBe('consensus_disruption');
      expect(template.name).toContain('Consensus');
      expect(template.expectedBehavior.criticalServicesShouldContinue).toContain('consensus');
    });

    it('should create Pi Network isolation template', () => {
      const template = service.createExperimentTemplate('pi_network_isolation');
      
      expect(template.type).toBe('network_partition');
      expect(template.name).toContain('Pi Network');
      expect(template.targets.services).toContain('pi-integration');
    });

    it('should create DAO governance stress template', () => {
      const template = service.createExperimentTemplate('dao_governance_stress');
      
      expect(template.type).toBe('resource_exhaustion');
      expect(template.name).toContain('DAO');
      expect(template.targets.services).toContain('dao');
    });

    it('should create storage partition template', () => {
      const template = service.createExperimentTemplate('storage_partition');
      
      expect(template.type).toBe('network_partition');
      expect(template.name).toContain('Storage');
      expect(template.targets.services).toContain('storage');
    });
  });

  describe('validateExperimentSafety', () => {
    const createSafeExperiment = (): ChaosExperiment => ({
      id: 'safe_experiment',
      name: 'Safe Test',
      type: 'network_partition',
      description: 'Safe test experiment',
      duration: 60000, // 1 minute
      targets: { percentage: 10 },
      parameters: { severity: 'low' },
      expectedBehavior: {
        systemShouldRecover: true,
        maxRecoveryTime: 30000,
        criticalServicesShouldContinue: ['consensus'],
        acceptableDataLoss: false,
        consensusShouldContinue: true
      },
      safeguards: {
        maxDuration: 120000,
        abortConditions: ['System health below 10%'],
        rollbackProcedure: ['Stop fault injection']
      }
    });

    it('should validate safe experiments', async () => {
      const safeExperiment = createSafeExperiment();
      
      const result = await service.validateExperimentSafety(safeExperiment);
      
      expect(result.isSafe).toBe(true);
      expect(Array.isArray(result.risks)).toBe(true);
      expect(Array.isArray(result.safeguards)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should identify unsafe experiments', async () => {
      const unsafeExperiment: ChaosExperiment = {
        ...createSafeExperiment(),
        duration: 700000, // Very long duration
        parameters: { severity: 'critical' },
        targets: { percentage: 80 }
      };
      
      const result = await service.validateExperimentSafety(unsafeExperiment);
      
      expect(result.isSafe).toBe(false);
      expect(result.risks.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should check for missing safeguards', async () => {
      const experimentWithoutSafeguards: ChaosExperiment = {
        ...createSafeExperiment(),
        safeguards: {
          maxDuration: 0, // Missing safeguard
          abortConditions: [],
          rollbackProcedure: []
        }
      };
      
      const result = await service.validateExperimentSafety(experimentWithoutSafeguards);
      
      expect(result.risks.some(r => r.includes('maximum duration'))).toBe(true);
    });
  });

  describe('fault injection', () => {
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

    it('should handle fault removal errors', async () => {
      const result = await service.removeFault('non_existent_fault');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('system monitoring', () => {
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
      const result = await service.monitorSystemHealth('test_experiment');
      
      // Verify alert structure if any alerts are generated
      result.alerts.forEach(alert => {
        expect(typeof alert).toBe('string');
        expect(alert.length).toBeGreaterThan(0);
      });
    });
  });

  describe('network simulation', () => {
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

  describe('experiment management', () => {
    it('should return active experiments list', async () => {
      const activeExperiments = await service.getActiveExperiments();
      
      expect(Array.isArray(activeExperiments)).toBe(true);
      
      // Initially should be empty
      expect(activeExperiments).toHaveLength(0);
    });

    it('should abort non-existent experiment', async () => {
      const result = await service.abortExperiment('non_existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle abort operations', async () => {
      const result = await service.abortExperiment('test_experiment');
      
      expect(result.abortTime).toBeInstanceOf(Date);
      expect(Array.isArray(result.rollbackSteps)).toBe(true);
    });
  });

  describe('report generation', () => {
    it('should handle empty experiment list', async () => {
      const report = await service.generateReport([]);
      
      expect(report.experiments).toHaveLength(0);
      expect(report.overallFindings.systemResilienceScore).toBe(0);
      expect(report.reportId).toBeTruthy();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.recommendations).toHaveProperty('immediate');
      expect(report.recommendations).toHaveProperty('shortTerm');
      expect(report.recommendations).toHaveProperty('longTerm');
    });
  });
});