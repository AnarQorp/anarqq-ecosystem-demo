import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationGatesService } from '../services/ValidationGatesService.js';
import { 
  ValidationGateConfig, 
  ExecutionValidationData,
  ValidationViolation 
} from '../interfaces/ValidationGates.js';
import { PerformanceMetrics, DecentralizationMetrics } from '../types/index.js';

describe('ValidationGatesService', () => {
  let validationGates: ValidationGatesService;
  let mockPerformanceMetrics: PerformanceMetrics;
  let mockDecentralizationMetrics: DecentralizationMetrics;
  let mockExecutionData: ExecutionValidationData;

  beforeEach(() => {
    validationGates = new ValidationGatesService();

    mockPerformanceMetrics = {
      latency: { p50: 100, p95: 200, p99: 300 },
      throughput: { requestsPerSecond: 150, dataProcessedPerSecond: 1000 },
      errorRate: 0.005,
      availability: 0.999
    };

    mockDecentralizationMetrics = {
      nodeCount: 7,
      geographicDistribution: ['us-east', 'eu-west', 'asia-pacific'],
      consensusHealth: 0.95,
      networkPartitionTolerance: true,
      singlePointsOfFailure: []
    };

    mockExecutionData = {
      executionId: 'test-execution-123',
      performanceMetrics: mockPerformanceMetrics,
      decentralizationMetrics: mockDecentralizationMetrics,
      auditCid: 'test-audit-cid',
      qerberosSignature: 'test-qerberos-signature',
      moduleResults: [
        { moduleId: 'squid', status: 'active', duration: 500 },
        { moduleId: 'qwallet', status: 'active', duration: 600 }
      ],
      environment: 'local',
      scenarioType: 'identity',
      duration: 1500
    };
  });

  describe('validatePerformanceGate', () => {
    it('should pass when all performance metrics meet thresholds', async () => {
      const result = await validationGates.validatePerformanceGate(mockPerformanceMetrics);

      expect(result.gateName).toBe('Performance Gate');
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.7);
      expect(result.violations).toHaveLength(0);
      expect(result.metrics).toHaveProperty('latencyScore');
      expect(result.metrics).toHaveProperty('throughputScore');
      expect(result.metrics).toHaveProperty('errorRateScore');
      expect(result.metrics).toHaveProperty('availabilityScore');
    });

    it('should fail when latency exceeds threshold', async () => {
      const badMetrics = {
        ...mockPerformanceMetrics,
        latency: { p50: 1000, p95: 3000, p99: 5000 } // Exceeds 2000ms threshold
      };

      const result = await validationGates.validatePerformanceGate(badMetrics);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('performance');
      expect(result.violations[0].severity).toBe('critical');
      expect(result.violations[0].message).toContain('P95 latency exceeds threshold');
    });

    it('should fail when throughput is below threshold', async () => {
      const badMetrics = {
        ...mockPerformanceMetrics,
        throughput: { requestsPerSecond: 50, dataProcessedPerSecond: 500 } // Below 100 RPS threshold
      };

      const result = await validationGates.validatePerformanceGate(badMetrics);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('performance');
      expect(result.violations[0].severity).toBe('major');
      expect(result.violations[0].message).toContain('Throughput below minimum threshold');
    });

    it('should fail when error rate exceeds threshold', async () => {
      const badMetrics = {
        ...mockPerformanceMetrics,
        errorRate: 0.02 // Exceeds 0.01 threshold
      };

      const result = await validationGates.validatePerformanceGate(badMetrics);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('performance');
      expect(result.violations[0].severity).toBe('critical');
      expect(result.violations[0].message).toContain('Error rate exceeds threshold');
    });

    it('should fail when availability is below threshold', async () => {
      const badMetrics = {
        ...mockPerformanceMetrics,
        availability: 0.95 // Below 0.99 threshold
      };

      const result = await validationGates.validatePerformanceGate(badMetrics);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('performance');
      expect(result.violations[0].severity).toBe('critical');
      expect(result.violations[0].message).toContain('Availability below minimum threshold');
    });

    it('should generate warnings when metrics approach thresholds', async () => {
      const warningMetrics = {
        ...mockPerformanceMetrics,
        latency: { p50: 800, p95: 1700, p99: 2200 }, // Close to 2000ms threshold
        throughput: { requestsPerSecond: 110, dataProcessedPerSecond: 800 } // Close to 100 RPS threshold
      };

      const result = await validationGates.validatePerformanceGate(warningMetrics);

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.message.includes('latency approaching threshold'))).toBe(true);
    });
  });

  describe('validateDecentralizationGate', () => {
    it('should pass when all decentralization metrics meet thresholds', async () => {
      const result = await validationGates.validateDecentralizationGate(mockDecentralizationMetrics);

      expect(result.gateName).toBe('Decentralization Gate');
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.7);
      expect(result.violations).toHaveLength(0);
      expect(result.metrics).toHaveProperty('nodeCountScore');
      expect(result.metrics).toHaveProperty('spofScore');
      expect(result.metrics).toHaveProperty('geoScore');
      expect(result.metrics).toHaveProperty('consensusScore');
    });

    it('should fail when node count is below threshold', async () => {
      const badMetrics = {
        ...mockDecentralizationMetrics,
        nodeCount: 3 // Below 5 minimum
      };

      const result = await validationGates.validateDecentralizationGate(badMetrics);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('decentralization');
      expect(result.violations[0].severity).toBe('critical');
      expect(result.violations[0].message).toContain('Node count below minimum threshold');
    });

    it('should fail when there are single points of failure', async () => {
      const badMetrics = {
        ...mockDecentralizationMetrics,
        singlePointsOfFailure: ['central-server', 'main-db'] // Above 0 maximum
      };

      const result = await validationGates.validateDecentralizationGate(badMetrics);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('decentralization');
      expect(result.violations[0].severity).toBe('major');
      expect(result.violations[0].message).toContain('Too many single points of failure');
    });

    it('should fail when network partition tolerance is not achieved', async () => {
      const badMetrics = {
        ...mockDecentralizationMetrics,
        networkPartitionTolerance: false
      };

      const result = await validationGates.validateDecentralizationGate(badMetrics);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('decentralization');
      expect(result.violations[0].severity).toBe('major');
      expect(result.violations[0].message).toContain('Network partition tolerance not achieved');
    });

    it('should fail when consensus health is below threshold', async () => {
      const badMetrics = {
        ...mockDecentralizationMetrics,
        consensusHealth: 0.8 // Below 0.9 threshold
      };

      const result = await validationGates.validateDecentralizationGate(badMetrics);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('decentralization');
      expect(result.violations[0].severity).toBe('major');
      expect(result.violations[0].message).toContain('Consensus health below threshold');
    });

    it('should generate warnings for geographic distribution', async () => {
      const warningMetrics = {
        ...mockDecentralizationMetrics,
        geographicDistribution: ['us-east'] // Below 3 recommended
      };

      const result = await validationGates.validateDecentralizationGate(warningMetrics);

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.message.includes('Geographic distribution below recommended'))).toBe(true);
    });
  });

  describe('validateIntegrityGate', () => {
    it('should pass when all integrity requirements are met', async () => {
      const result = await validationGates.validateIntegrityGate(
        'test-audit-cid',
        'test-qerberos-signature',
        mockExecutionData.moduleResults
      );

      expect(result.gateName).toBe('Integrity Gate');
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.violations).toHaveLength(0);
      expect(result.metrics).toHaveProperty('auditCidScore');
      expect(result.metrics).toHaveProperty('qerberosScore');
      expect(result.metrics).toHaveProperty('moduleFailureScore');
      expect(result.metrics).toHaveProperty('dataIntegrityScore');
    });

    it('should fail when audit CID is missing', async () => {
      const result = await validationGates.validateIntegrityGate(
        '', // Missing audit CID
        'test-qerberos-signature',
        mockExecutionData.moduleResults
      );

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('integrity');
      expect(result.violations[0].severity).toBe('critical');
      expect(result.violations[0].message).toContain('Audit CID missing');
    });

    it('should fail when Qerberos signature is missing', async () => {
      const result = await validationGates.validateIntegrityGate(
        'test-audit-cid',
        '', // Missing Qerberos signature
        mockExecutionData.moduleResults
      );

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('integrity');
      expect(result.violations[0].severity).toBe('critical');
      expect(result.violations[0].message).toContain('Qerberos signature missing');
    });

    it('should fail when there are too many module failures', async () => {
      const failedModuleResults = [
        { moduleId: 'squid', status: 'error', duration: 500, error: 'Connection failed' },
        { moduleId: 'qwallet', status: 'error', duration: 600, error: 'Timeout' }
      ];

      const result = await validationGates.validateIntegrityGate(
        'test-audit-cid',
        'test-qerberos-signature',
        failedModuleResults
      );

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('integrity');
      expect(result.violations[0].severity).toBe('major');
      expect(result.violations[0].message).toContain('Too many module failures');
    });

    it('should generate warnings for some module failures', async () => {
      const mixedModuleResults = [
        { moduleId: 'squid', status: 'active', duration: 500 },
        { moduleId: 'qwallet', status: 'error', duration: 600, error: 'Minor issue' }
      ];

      // Update config to allow 1 module failure
      const config = validationGates.getConfiguration();
      config.integrityGate.maxModuleFailures = 1;
      await validationGates.updateConfiguration(config);

      const result = await validationGates.validateIntegrityGate(
        'test-audit-cid',
        'test-qerberos-signature',
        mixedModuleResults
      );

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.message.includes('Some modules failed'))).toBe(true);
    });
  });

  describe('validateAllGates', () => {
    it('should pass when all gates pass', async () => {
      const result = await validationGates.validateAllGates(mockExecutionData);

      expect(result.overallPassed).toBe(true);
      expect(result.overallScore).toBeGreaterThan(0.8);
      expect(result.gateResults).toHaveLength(3);
      expect(result.criticalViolations).toHaveLength(0);
      expect(result.executionId).toBe('test-execution-123');
      expect(result.recommendation.action).toBe('proceed');
    });

    it('should fail when any gate fails', async () => {
      const badExecutionData = {
        ...mockExecutionData,
        performanceMetrics: {
          ...mockPerformanceMetrics,
          latency: { p50: 1000, p95: 3000, p99: 5000 } // Exceeds threshold
        }
      };

      const result = await validationGates.validateAllGates(badExecutionData);

      expect(result.overallPassed).toBe(false);
      expect(result.criticalViolations.length).toBeGreaterThan(0);
      expect(result.recommendation.action).toBe('fix_critical');
      expect(result.recommendation.priority).toBe('critical');
    });

    it('should calculate weighted overall score correctly', async () => {
      const result = await validationGates.validateAllGates(mockExecutionData);

      // Score should be weighted average: 40% performance + 30% decentralization + 30% integrity
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
      
      const performanceGate = result.gateResults.find(g => g.gateName === 'Performance Gate');
      const decentralizationGate = result.gateResults.find(g => g.gateName === 'Decentralization Gate');
      const integrityGate = result.gateResults.find(g => g.gateName === 'Integrity Gate');

      expect(performanceGate).toBeDefined();
      expect(decentralizationGate).toBeDefined();
      expect(integrityGate).toBeDefined();
    });

    it('should generate appropriate recommendations', async () => {
      // Test with marginal performance
      const marginalExecutionData = {
        ...mockExecutionData,
        performanceMetrics: {
          ...mockPerformanceMetrics,
          latency: { p50: 800, p95: 1800, p99: 2200 }, // Close to threshold
          throughput: { requestsPerSecond: 110, dataProcessedPerSecond: 800 }
        }
      };

      const result = await validationGates.validateAllGates(marginalExecutionData);

      if (result.overallScore < 0.8) {
        expect(result.recommendation.action).toBe('optimize');
        expect(result.recommendation.priority).toBe('medium');
      } else {
        expect(result.recommendation.action).toBe('proceed');
      }
    });
  });

  describe('configuration management', () => {
    it('should update configuration correctly', async () => {
      const newConfig: ValidationGateConfig = {
        performanceGate: {
          maxLatency: 3000,
          minThroughput: 200,
          maxErrorRate: 0.02,
          minAvailability: 0.95
        },
        decentralizationGate: {
          minNodes: 10,
          maxSinglePointFailures: 1,
          minGeographicDistribution: 5,
          requireNetworkPartitionTolerance: false,
          minConsensusHealth: 0.95
        },
        integrityGate: {
          requireAuditCid: false,
          requireQerberosSignature: false,
          maxModuleFailures: 2,
          requireDataIntegrityCheck: false
        },
        qnetPhase2Gate: {
          minDynamicNodes: 5,
          maxScalingLatency: 10000,
          minResourceUtilization: 0.2,
          maxResourceUtilization: 0.9
        }
      };

      await validationGates.updateConfiguration(newConfig);
      const retrievedConfig = validationGates.getConfiguration();

      expect(retrievedConfig.performanceGate.maxLatency).toBe(3000);
      expect(retrievedConfig.decentralizationGate.minNodes).toBe(10);
      expect(retrievedConfig.integrityGate.maxModuleFailures).toBe(2);
      expect(retrievedConfig.qnetPhase2Gate.minDynamicNodes).toBe(5);
    });

    it('should use default configuration when not provided', async () => {
      const defaultGates = new ValidationGatesService();
      const config = defaultGates.getConfiguration();

      expect(config.performanceGate.maxLatency).toBe(2000);
      expect(config.performanceGate.minThroughput).toBe(100);
      expect(config.performanceGate.maxErrorRate).toBe(0.01);
      expect(config.decentralizationGate.minNodes).toBe(5);
      expect(config.integrityGate.requireAuditCid).toBe(true);
    });

    it('should merge partial configuration with defaults', async () => {
      const partialConfig = {
        performanceGate: {
          maxLatency: 5000,
          minThroughput: 50,
          maxErrorRate: 0.05,
          minAvailability: 0.98
        }
      };

      const customGates = new ValidationGatesService(partialConfig);
      const config = customGates.getConfiguration();

      // Should use custom performance settings
      expect(config.performanceGate.maxLatency).toBe(5000);
      expect(config.performanceGate.minThroughput).toBe(50);
      
      // Should use default decentralization settings
      expect(config.decentralizationGate.minNodes).toBe(5);
      expect(config.integrityGate.requireAuditCid).toBe(true);
    });
  });

  describe('scoring algorithms', () => {
    it('should calculate scores correctly for edge cases', async () => {
      // Test perfect metrics
      const perfectMetrics: PerformanceMetrics = {
        latency: { p50: 50, p95: 100, p99: 150 }, // Very low latency
        throughput: { requestsPerSecond: 500, dataProcessedPerSecond: 5000 }, // High throughput
        errorRate: 0, // No errors
        availability: 1.0 // Perfect availability
      };

      const result = await validationGates.validatePerformanceGate(perfectMetrics);
      expect(result.score).toBeCloseTo(1.0, 1);

      // Test worst case metrics
      const worstMetrics: PerformanceMetrics = {
        latency: { p50: 5000, p95: 10000, p99: 15000 }, // Very high latency
        throughput: { requestsPerSecond: 10, dataProcessedPerSecond: 50 }, // Low throughput
        errorRate: 0.5, // 50% error rate
        availability: 0.5 // 50% availability
      };

      const worstResult = await validationGates.validatePerformanceGate(worstMetrics);
      expect(worstResult.score).toBeLessThan(0.2);
    });
  });
});