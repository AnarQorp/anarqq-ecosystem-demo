import { 
  IValidationGates,
  ValidationGateConfig,
  ValidationGateResult,
  OverallValidationResult,
  ExecutionValidationData,
  ValidationViolation,
  ValidationWarning,
  ValidationRecommendation
} from '../interfaces/ValidationGates.js';
import { PerformanceMetrics, DecentralizationMetrics } from '../types/index.js';

/**
 * Validation Gates Service implementation
 * Enforces configurable performance thresholds with pass/fail determination
 */
export class ValidationGatesService implements IValidationGates {
  private config: ValidationGateConfig;

  constructor(initialConfig?: Partial<ValidationGateConfig>) {
    this.config = this.getDefaultConfiguration();
    
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
    }
  }

  /**
   * Validate performance metrics against configured thresholds
   */
  async validatePerformanceGate(metrics: PerformanceMetrics): Promise<ValidationGateResult> {
    const violations: ValidationViolation[] = [];
    const warnings: ValidationWarning[] = [];
    const gateMetrics: Record<string, number> = {};

    // Latency validation
    const latencyScore = this.calculateLatencyScore(metrics.latency.p95);
    gateMetrics.latencyScore = latencyScore;
    
    if (metrics.latency.p95 > this.config.performanceGate.maxLatency) {
      violations.push({
        type: 'performance',
        severity: 'critical',
        message: `P95 latency exceeds threshold`,
        actualValue: metrics.latency.p95,
        expectedValue: `≤ ${this.config.performanceGate.maxLatency}`,
        threshold: this.config.performanceGate.maxLatency,
        impact: 'User experience degradation, potential SLA violations'
      });
    } else if (metrics.latency.p95 > this.config.performanceGate.maxLatency * 0.8) {
      warnings.push({
        type: 'performance',
        message: `P95 latency approaching threshold`,
        suggestion: 'Consider performance optimization',
        actualValue: metrics.latency.p95,
        recommendedValue: this.config.performanceGate.maxLatency * 0.6
      });
    }

    // Throughput validation
    const throughputScore = this.calculateThroughputScore(metrics.throughput.requestsPerSecond);
    gateMetrics.throughputScore = throughputScore;
    
    if (metrics.throughput.requestsPerSecond < this.config.performanceGate.minThroughput) {
      violations.push({
        type: 'performance',
        severity: 'major',
        message: `Throughput below minimum threshold`,
        actualValue: metrics.throughput.requestsPerSecond,
        expectedValue: `≥ ${this.config.performanceGate.minThroughput}`,
        threshold: this.config.performanceGate.minThroughput,
        impact: 'Reduced system capacity, potential bottlenecks'
      });
    } else if (metrics.throughput.requestsPerSecond < this.config.performanceGate.minThroughput * 1.2) {
      warnings.push({
        type: 'performance',
        message: `Throughput close to minimum threshold`,
        suggestion: 'Monitor for capacity planning',
        actualValue: metrics.throughput.requestsPerSecond,
        recommendedValue: this.config.performanceGate.minThroughput * 1.5
      });
    }

    // Error rate validation
    const errorRateScore = this.calculateErrorRateScore(metrics.errorRate);
    gateMetrics.errorRateScore = errorRateScore;
    
    if (metrics.errorRate > this.config.performanceGate.maxErrorRate) {
      violations.push({
        type: 'performance',
        severity: 'critical',
        message: `Error rate exceeds threshold`,
        actualValue: metrics.errorRate,
        expectedValue: `≤ ${this.config.performanceGate.maxErrorRate}`,
        threshold: this.config.performanceGate.maxErrorRate,
        impact: 'System reliability issues, user experience degradation'
      });
    } else if (metrics.errorRate > this.config.performanceGate.maxErrorRate * 0.7) {
      warnings.push({
        type: 'performance',
        message: `Error rate elevated`,
        suggestion: 'Investigate error patterns and root causes',
        actualValue: metrics.errorRate,
        recommendedValue: this.config.performanceGate.maxErrorRate * 0.3
      });
    }

    // Availability validation
    const availabilityScore = this.calculateAvailabilityScore(metrics.availability);
    gateMetrics.availabilityScore = availabilityScore;
    
    if (metrics.availability < this.config.performanceGate.minAvailability) {
      violations.push({
        type: 'performance',
        severity: 'critical',
        message: `Availability below minimum threshold`,
        actualValue: metrics.availability,
        expectedValue: `≥ ${this.config.performanceGate.minAvailability}`,
        threshold: this.config.performanceGate.minAvailability,
        impact: 'Service unavailability, SLA violations'
      });
    }

    // Calculate overall performance score
    const overallScore = (latencyScore + throughputScore + errorRateScore + availabilityScore) / 4;
    const passed = violations.length === 0;

    return {
      gateName: 'Performance Gate',
      passed,
      score: overallScore,
      violations,
      warnings,
      metrics: gateMetrics,
      timestamp: new Date()
    };
  }

  /**
   * Validate decentralization metrics against configured thresholds
   */
  async validateDecentralizationGate(metrics: DecentralizationMetrics): Promise<ValidationGateResult> {
    const violations: ValidationViolation[] = [];
    const warnings: ValidationWarning[] = [];
    const gateMetrics: Record<string, number> = {};

    // Node count validation
    const nodeCountScore = this.calculateNodeCountScore(metrics.nodeCount);
    gateMetrics.nodeCountScore = nodeCountScore;
    
    if (metrics.nodeCount < this.config.decentralizationGate.minNodes) {
      violations.push({
        type: 'decentralization',
        severity: 'critical',
        message: `Node count below minimum threshold`,
        actualValue: metrics.nodeCount,
        expectedValue: `≥ ${this.config.decentralizationGate.minNodes}`,
        threshold: this.config.decentralizationGate.minNodes,
        impact: 'Centralization risk, reduced fault tolerance'
      });
    } else if (metrics.nodeCount < this.config.decentralizationGate.minNodes * 1.2) {
      warnings.push({
        type: 'decentralization',
        message: `Node count close to minimum`,
        suggestion: 'Consider adding more nodes for better decentralization',
        actualValue: metrics.nodeCount,
        recommendedValue: this.config.decentralizationGate.minNodes * 1.5
      });
    }

    // Single points of failure validation
    const spofScore = this.calculateSPOFScore(metrics.singlePointsOfFailure.length);
    gateMetrics.spofScore = spofScore;
    
    if (metrics.singlePointsOfFailure.length > this.config.decentralizationGate.maxSinglePointFailures) {
      violations.push({
        type: 'decentralization',
        severity: 'major',
        message: `Too many single points of failure`,
        actualValue: metrics.singlePointsOfFailure.length,
        expectedValue: `≤ ${this.config.decentralizationGate.maxSinglePointFailures}`,
        threshold: this.config.decentralizationGate.maxSinglePointFailures,
        impact: 'System vulnerability to component failures'
      });
    }

    // Geographic distribution validation
    const geoScore = this.calculateGeographicScore(metrics.geographicDistribution.length);
    gateMetrics.geoScore = geoScore;
    
    if (metrics.geographicDistribution.length < this.config.decentralizationGate.minGeographicDistribution) {
      warnings.push({
        type: 'decentralization',
        message: `Geographic distribution below recommended`,
        suggestion: 'Deploy nodes across more geographic regions',
        actualValue: metrics.geographicDistribution.length,
        recommendedValue: this.config.decentralizationGate.minGeographicDistribution
      });
    }

    // Network partition tolerance validation
    if (this.config.decentralizationGate.requireNetworkPartitionTolerance && !metrics.networkPartitionTolerance) {
      violations.push({
        type: 'decentralization',
        severity: 'major',
        message: `Network partition tolerance not achieved`,
        actualValue: false,
        expectedValue: true,
        threshold: true,
        impact: 'System may fail during network partitions'
      });
    }

    // Consensus health validation
    const consensusScore = metrics.consensusHealth;
    gateMetrics.consensusScore = consensusScore;
    
    if (metrics.consensusHealth < this.config.decentralizationGate.minConsensusHealth) {
      violations.push({
        type: 'decentralization',
        severity: 'major',
        message: `Consensus health below threshold`,
        actualValue: metrics.consensusHealth,
        expectedValue: `≥ ${this.config.decentralizationGate.minConsensusHealth}`,
        threshold: this.config.decentralizationGate.minConsensusHealth,
        impact: 'Consensus mechanism degradation, potential forks'
      });
    }

    // Calculate overall decentralization score
    const overallScore = (nodeCountScore + spofScore + geoScore + consensusScore) / 4;
    const passed = violations.length === 0;

    return {
      gateName: 'Decentralization Gate',
      passed,
      score: overallScore,
      violations,
      warnings,
      metrics: gateMetrics,
      timestamp: new Date()
    };
  }

  /**
   * Validate integrity requirements
   */
  async validateIntegrityGate(
    auditCid: string, 
    qerberosSignature: string, 
    moduleResults: any[]
  ): Promise<ValidationGateResult> {
    const violations: ValidationViolation[] = [];
    const warnings: ValidationWarning[] = [];
    const gateMetrics: Record<string, number> = {};

    // Audit CID validation
    if (this.config.integrityGate.requireAuditCid && !auditCid) {
      violations.push({
        type: 'integrity',
        severity: 'critical',
        message: `Audit CID missing`,
        actualValue: false,
        expectedValue: true,
        threshold: true,
        impact: 'No audit trail available for verification'
      });
    }

    const auditCidScore = auditCid ? 1.0 : 0.0;
    gateMetrics.auditCidScore = auditCidScore;

    // Qerberos signature validation
    if (this.config.integrityGate.requireQerberosSignature && !qerberosSignature) {
      violations.push({
        type: 'integrity',
        severity: 'critical',
        message: `Qerberos signature missing`,
        actualValue: false,
        expectedValue: true,
        threshold: true,
        impact: 'No cryptographic proof of execution integrity'
      });
    }

    const qerberosScore = qerberosSignature ? 1.0 : 0.0;
    gateMetrics.qerberosScore = qerberosScore;

    // Module failure validation
    const failedModules = moduleResults.filter(result => result.status === 'error');
    const moduleFailureScore = this.calculateModuleFailureScore(failedModules.length, moduleResults.length);
    gateMetrics.moduleFailureScore = moduleFailureScore;
    
    if (failedModules.length > this.config.integrityGate.maxModuleFailures) {
      violations.push({
        type: 'integrity',
        severity: 'major',
        message: `Too many module failures`,
        actualValue: failedModules.length,
        expectedValue: `≤ ${this.config.integrityGate.maxModuleFailures}`,
        threshold: this.config.integrityGate.maxModuleFailures,
        impact: 'System functionality compromised'
      });
    } else if (failedModules.length > 0) {
      warnings.push({
        type: 'integrity',
        message: `Some modules failed`,
        suggestion: 'Investigate module failures and improve reliability',
        actualValue: failedModules.length,
        recommendedValue: 0
      });
    }

    // Data integrity check (simulated)
    const dataIntegrityScore = this.simulateDataIntegrityCheck();
    gateMetrics.dataIntegrityScore = dataIntegrityScore;
    
    if (this.config.integrityGate.requireDataIntegrityCheck && dataIntegrityScore < 0.95) {
      violations.push({
        type: 'integrity',
        severity: 'major',
        message: `Data integrity check failed`,
        actualValue: dataIntegrityScore,
        expectedValue: '≥ 0.95',
        threshold: 0.95,
        impact: 'Data corruption or tampering detected'
      });
    }

    // Calculate overall integrity score
    const overallScore = (auditCidScore + qerberosScore + moduleFailureScore + dataIntegrityScore) / 4;
    const passed = violations.length === 0;

    return {
      gateName: 'Integrity Gate',
      passed,
      score: overallScore,
      violations,
      warnings,
      metrics: gateMetrics,
      timestamp: new Date()
    };
  }

  /**
   * Run all validation gates and determine overall pass/fail status
   */
  async validateAllGates(executionData: ExecutionValidationData): Promise<OverallValidationResult> {
    console.log(`[ValidationGates] Running all validation gates for execution: ${executionData.executionId}`);

    // Run all individual gates
    const performanceResult = await this.validatePerformanceGate(executionData.performanceMetrics);
    const decentralizationResult = await this.validateDecentralizationGate(executionData.decentralizationMetrics);
    const integrityResult = await this.validateIntegrityGate(
      executionData.auditCid,
      executionData.qerberosSignature,
      executionData.moduleResults
    );

    const gateResults = [performanceResult, decentralizationResult, integrityResult];

    // Determine overall pass/fail
    const overallPassed = gateResults.every(result => result.passed);
    
    // Calculate weighted overall score
    const weights = { performance: 0.4, decentralization: 0.3, integrity: 0.3 };
    const overallScore = (
      performanceResult.score * weights.performance +
      decentralizationResult.score * weights.decentralization +
      integrityResult.score * weights.integrity
    );

    // Collect all violations and warnings
    const criticalViolations = gateResults
      .flatMap(result => result.violations)
      .filter(violation => violation.severity === 'critical');
    
    const allWarnings = gateResults.flatMap(result => result.warnings);

    // Generate recommendation
    const recommendation = this.generateRecommendation(overallPassed, overallScore, criticalViolations, allWarnings);

    const result: OverallValidationResult = {
      overallPassed,
      overallScore,
      gateResults,
      criticalViolations,
      allWarnings,
      executionId: executionData.executionId,
      timestamp: new Date(),
      recommendation
    };

    console.log(`[ValidationGates] ✓ Validation completed: ${overallPassed ? 'PASSED' : 'FAILED'} (Score: ${(overallScore * 100).toFixed(1)}%)`);
    
    return result;
  }

  /**
   * Update validation gate configuration
   */
  async updateConfiguration(config: ValidationGateConfig): Promise<void> {
    this.config = { ...config };
    console.log('[ValidationGates] Configuration updated');
  }

  /**
   * Get current validation gate configuration
   */
  getConfiguration(): ValidationGateConfig {
    return { ...this.config };
  }

  /**
   * Calculate latency score (0-1, where 1 is best)
   */
  private calculateLatencyScore(latency: number): number {
    const threshold = this.config.performanceGate.maxLatency;
    if (latency <= threshold * 0.5) return 1.0;
    if (latency >= threshold) return 0.0;
    return 1.0 - ((latency - threshold * 0.5) / (threshold * 0.5));
  }

  /**
   * Calculate throughput score (0-1, where 1 is best)
   */
  private calculateThroughputScore(throughput: number): number {
    const threshold = this.config.performanceGate.minThroughput;
    if (throughput >= threshold * 2) return 1.0;
    if (throughput <= threshold) return 0.0;
    return (throughput - threshold) / threshold;
  }

  /**
   * Calculate error rate score (0-1, where 1 is best)
   */
  private calculateErrorRateScore(errorRate: number): number {
    const threshold = this.config.performanceGate.maxErrorRate;
    if (errorRate <= 0) return 1.0;
    if (errorRate >= threshold) return 0.0;
    return 1.0 - (errorRate / threshold);
  }

  /**
   * Calculate availability score (0-1, where 1 is best)
   */
  private calculateAvailabilityScore(availability: number): number {
    const threshold = this.config.performanceGate.minAvailability;
    if (availability >= 1.0) return 1.0;
    if (availability <= threshold) return 0.0;
    return (availability - threshold) / (1.0 - threshold);
  }

  /**
   * Calculate node count score (0-1, where 1 is best)
   */
  private calculateNodeCountScore(nodeCount: number): number {
    const threshold = this.config.decentralizationGate.minNodes;
    if (nodeCount >= threshold * 2) return 1.0;
    if (nodeCount <= threshold) return 0.0;
    return (nodeCount - threshold) / threshold;
  }

  /**
   * Calculate single points of failure score (0-1, where 1 is best)
   */
  private calculateSPOFScore(spofCount: number): number {
    const threshold = this.config.decentralizationGate.maxSinglePointFailures;
    if (spofCount <= 0) return 1.0;
    if (spofCount >= threshold * 2) return 0.0;
    return Math.max(0, 1.0 - (spofCount / threshold));
  }

  /**
   * Calculate geographic distribution score (0-1, where 1 is best)
   */
  private calculateGeographicScore(geoCount: number): number {
    const threshold = this.config.decentralizationGate.minGeographicDistribution;
    if (geoCount >= threshold * 1.5) return 1.0;
    if (geoCount <= threshold * 0.5) return 0.0;
    return (geoCount - threshold * 0.5) / (threshold);
  }

  /**
   * Calculate module failure score (0-1, where 1 is best)
   */
  private calculateModuleFailureScore(failedCount: number, totalCount: number): number {
    if (totalCount === 0) return 1.0;
    const failureRate = failedCount / totalCount;
    return Math.max(0, 1.0 - failureRate * 2); // Penalize failures heavily
  }

  /**
   * Simulate data integrity check
   */
  private simulateDataIntegrityCheck(): number {
    // In real implementation, this would perform actual integrity checks
    return 0.98; // Simulate high integrity score
  }

  /**
   * Generate recommendation based on validation results
   */
  private generateRecommendation(
    passed: boolean, 
    score: number, 
    criticalViolations: ValidationViolation[], 
    warnings: ValidationWarning[]
  ): ValidationRecommendation {
    if (criticalViolations.length > 0) {
      return {
        action: 'fix_critical',
        priority: 'critical',
        message: `Critical issues must be resolved before proceeding`,
        suggestedFixes: criticalViolations.map(v => v.impact),
        estimatedImpact: 'High - System reliability at risk'
      };
    }

    if (!passed) {
      return {
        action: 'investigate',
        priority: 'high',
        message: `Validation failed - investigation required`,
        suggestedFixes: ['Review performance metrics', 'Check system configuration', 'Analyze error patterns'],
        estimatedImpact: 'Medium - Performance or reliability issues'
      };
    }

    if (score < 0.8) {
      return {
        action: 'optimize',
        priority: 'medium',
        message: `Validation passed but performance could be improved`,
        suggestedFixes: warnings.map(w => w.suggestion),
        estimatedImpact: 'Low - Optimization opportunities available'
      };
    }

    return {
      action: 'proceed',
      priority: 'low',
      message: `All validation gates passed successfully`,
      suggestedFixes: [],
      estimatedImpact: 'None - System performing well'
    };
  }

  /**
   * Get default validation gate configuration
   */
  private getDefaultConfiguration(): ValidationGateConfig {
    return {
      performanceGate: {
        maxLatency: 2000, // 2 seconds
        minThroughput: 100, // 100 RPS
        maxErrorRate: 0.01, // 1%
        minAvailability: 0.99 // 99%
      },
      
      decentralizationGate: {
        minNodes: 5,
        maxSinglePointFailures: 0,
        minGeographicDistribution: 3,
        requireNetworkPartitionTolerance: true,
        minConsensusHealth: 0.9 // 90%
      },
      
      integrityGate: {
        requireAuditCid: true,
        requireQerberosSignature: true,
        maxModuleFailures: 0,
        requireDataIntegrityCheck: true
      },
      
      qnetPhase2Gate: {
        minDynamicNodes: 3,
        maxScalingLatency: 5000, // 5 seconds
        minResourceUtilization: 0.3, // 30%
        maxResourceUtilization: 0.8 // 80%
      }
    };
  }
}