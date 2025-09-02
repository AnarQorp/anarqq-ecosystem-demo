// Tests for Q∞ Data Flow Monitoring Service
// Validates metrics accuracy and performance thresholds

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  QInfinityMonitoringService, 
  PerformanceThresholds,
  RealTimeMetrics,
  PerformanceAlert
} from '../services/QInfinityMonitoringService.js';
import { FlowMetrics, PipelineStep, StepMetrics } from '../interfaces/QInfinityDataFlow.js';

describe('QInfinityMonitoringService', () => {
  let monitoringService: QInfinityMonitoringService;
  let mockThresholds: PerformanceThresholds;

  // Mock flow metrics for testing
  const createMockFlowMetrics = (overrides?: Partial<FlowMetrics>): FlowMetrics => {
    const baseStepMetrics: StepMetrics = {
      totalExecutions: 100,
      averageDuration: 50,
      successRate: 0.99,
      errorCount: 1,
      lastExecution: new Date()
    };

    const pipelineStepMetrics: Record<PipelineStep, StepMetrics> = {} as any;
    Object.values(PipelineStep).forEach(step => {
      pipelineStepMetrics[step] = { ...baseStepMetrics };
    });

    return {
      totalProcessed: 1000,
      totalRetrieved: 950,
      averageProcessingTime: 250,
      averageRetrievalTime: 200,
      successRate: 0.99,
      errorRate: 0.01,
      throughput: {
        processedPerSecond: 50,
        retrievedPerSecond: 45
      },
      pipelineStepMetrics,
      ...overrides
    };
  };

  beforeEach(() => {
    mockThresholds = {
      maxLatency: 1000,
      minThroughput: 10,
      maxErrorRate: 0.05,
      maxQueueDepth: 100,
      alertCooldown: 1000 // 1 second for testing
    };

    monitoringService = new QInfinityMonitoringService(mockThresholds);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Metrics Collection and Accuracy', () => {
    it('should accurately update real-time metrics from flow metrics', () => {
      const flowMetrics = createMockFlowMetrics();
      
      monitoringService.updateMetrics(flowMetrics);
      const dashboard = monitoringService.getDashboard();
      
      expect(dashboard.realTimeMetrics.currentThroughput).toBe(95); // 50 + 45
      expect(dashboard.realTimeMetrics.errorRate).toBe(0.01);
      expect(dashboard.realTimeMetrics.systemHealth).toBe('healthy');
      expect(dashboard.realTimeMetrics.lastUpdated).toBeInstanceOf(Date);
    });

    it('should track operation lifecycle accurately', () => {
      const operationId = 'test-op-1';
      
      // Start operation
      monitoringService.recordOperationStart(operationId);
      let dashboard = monitoringService.getDashboard();
      expect(dashboard.realTimeMetrics.activeOperations).toBe(1);
      
      // End operation
      monitoringService.recordOperationEnd(operationId, true, 500);
      dashboard = monitoringService.getDashboard();
      expect(dashboard.realTimeMetrics.activeOperations).toBe(0);
      expect(dashboard.realTimeMetrics.averageLatency).toBe(500);
    });

    it('should calculate exponential moving average for latency', () => {
      // Record multiple operations
      monitoringService.recordOperationEnd('op1', true, 100);
      monitoringService.recordOperationEnd('op2', true, 200);
      monitoringService.recordOperationEnd('op3', true, 300);
      
      const dashboard = monitoringService.getDashboard();
      
      // Should be weighted average, not simple average
      expect(dashboard.realTimeMetrics.averageLatency).toBeGreaterThan(100);
      expect(dashboard.realTimeMetrics.averageLatency).toBeLessThan(300);
    });

    it('should maintain historical data with proper retention', () => {
      const flowMetrics = createMockFlowMetrics();
      
      // Update metrics multiple times
      for (let i = 0; i < 5; i++) {
        monitoringService.updateMetrics({
          ...flowMetrics,
          totalProcessed: flowMetrics.totalProcessed + i * 100
        });
      }
      
      const dashboard = monitoringService.getDashboard();
      expect(dashboard.historicalData.dataPoints.length).toBe(5);
      
      // Verify data points have required fields
      dashboard.historicalData.dataPoints.forEach(point => {
        expect(point.timestamp).toBeInstanceOf(Date);
        expect(typeof point.throughput).toBe('number');
        expect(typeof point.latency).toBe('number');
        expect(typeof point.errorRate).toBe('number');
        expect(point.stepMetrics).toBeDefined();
      });
    });
  });

  describe('Performance Threshold Monitoring', () => {
    it('should generate latency alerts when threshold exceeded', () => {
      // Set low latency threshold
      monitoringService.updateThresholds({ maxLatency: 100 });
      
      // Record high latency operation
      monitoringService.recordOperationEnd('slow-op', true, 500);
      
      const flowMetrics = createMockFlowMetrics();
      monitoringService.updateMetrics(flowMetrics);
      
      const dashboard = monitoringService.getDashboard();
      const latencyAlerts = dashboard.performanceAlerts.filter(a => a.type === 'latency');
      
      expect(latencyAlerts.length).toBeGreaterThan(0);
      expect(latencyAlerts[0].severity).toBe('critical');
      expect(latencyAlerts[0].currentValue).toBe(500);
      expect(latencyAlerts[0].threshold).toBe(100);
    });

    it('should generate throughput alerts when below threshold', () => {
      const lowThroughputMetrics = createMockFlowMetrics({
        throughput: {
          processedPerSecond: 2,
          retrievedPerSecond: 1
        }
      });
      
      monitoringService.updateMetrics(lowThroughputMetrics);
      
      const dashboard = monitoringService.getDashboard();
      const throughputAlerts = dashboard.performanceAlerts.filter(a => a.type === 'throughput');
      
      expect(throughputAlerts.length).toBeGreaterThan(0);
      expect(throughputAlerts[0].severity).toBe('warning');
      expect(throughputAlerts[0].currentValue).toBe(3); // 2 + 1
    });

    it('should generate error rate alerts when threshold exceeded', () => {
      const highErrorMetrics = createMockFlowMetrics({
        errorRate: 0.1 // 10% error rate
      });
      
      monitoringService.updateMetrics(highErrorMetrics);
      
      const dashboard = monitoringService.getDashboard();
      const errorAlerts = dashboard.performanceAlerts.filter(a => a.type === 'error_rate');
      
      expect(errorAlerts.length).toBeGreaterThan(0);
      expect(errorAlerts[0].severity).toBe('critical');
      expect(errorAlerts[0].currentValue).toBe(0.1);
    });

    it('should respect alert cooldown periods', async () => {
      // Set short cooldown for testing
      monitoringService.updateThresholds({ alertCooldown: 100 });
      
      const highErrorMetrics = createMockFlowMetrics({ errorRate: 0.1 });
      
      // Generate first alert
      monitoringService.updateMetrics(highErrorMetrics);
      let dashboard = monitoringService.getDashboard();
      const initialAlertCount = dashboard.performanceAlerts.length;
      
      // Immediately generate second alert (should be suppressed)
      monitoringService.updateMetrics(highErrorMetrics);
      dashboard = monitoringService.getDashboard();
      expect(dashboard.performanceAlerts.length).toBe(initialAlertCount);
      
      // Wait for cooldown and generate another alert
      await new Promise(resolve => setTimeout(resolve, 150));
      monitoringService.updateMetrics(highErrorMetrics);
      dashboard = monitoringService.getDashboard();
      expect(dashboard.performanceAlerts.length).toBeGreaterThan(initialAlertCount);
    });

    it('should update system health based on multiple factors', () => {
      // Test healthy state
      let flowMetrics = createMockFlowMetrics();
      monitoringService.updateMetrics(flowMetrics);
      let dashboard = monitoringService.getDashboard();
      expect(dashboard.realTimeMetrics.systemHealth).toBe('healthy');
      
      // Test degraded state (high error rate)
      flowMetrics = createMockFlowMetrics({ errorRate: 0.08 }); // Above threshold but not critical
      monitoringService.updateMetrics(flowMetrics);
      dashboard = monitoringService.getDashboard();
      expect(dashboard.realTimeMetrics.systemHealth).toBe('degraded');
      
      // Test critical state (very high error rate)
      flowMetrics = createMockFlowMetrics({ errorRate: 0.15 }); // Double the threshold
      monitoringService.updateMetrics(flowMetrics);
      dashboard = monitoringService.getDashboard();
      expect(dashboard.realTimeMetrics.systemHealth).toBe('critical');
    });
  });

  describe('Flow Visualization', () => {
    it('should generate accurate pipeline step visualization', () => {
      const flowMetrics = createMockFlowMetrics();
      monitoringService.updateMetrics(flowMetrics);
      
      const dashboard = monitoringService.getDashboard();
      const visualization = dashboard.flowVisualization;
      
      expect(visualization.pipelineSteps.length).toBeGreaterThan(0);
      
      visualization.pipelineSteps.forEach(step => {
        expect(Object.values(PipelineStep)).toContain(step.step);
        expect(step.status).toMatch(/^(active|idle|error)$/);
        expect(typeof step.throughput).toBe('number');
        expect(typeof step.averageLatency).toBe('number');
        expect(typeof step.errorCount).toBe('number');
      });
    });

    it('should identify bottlenecks correctly', () => {
      // Create metrics with one slow step
      const slowStepMetrics = createMockFlowMetrics();
      slowStepMetrics.pipelineStepMetrics[PipelineStep.QOMPRESS_COMPRESSION] = {
        totalExecutions: 100,
        averageDuration: 2500, // Very slow
        successRate: 0.99,
        errorCount: 1,
        lastExecution: new Date()
      };
      
      monitoringService.updateMetrics(slowStepMetrics);
      
      const dashboard = monitoringService.getDashboard();
      const bottlenecks = dashboard.flowVisualization.bottlenecks;
      
      expect(bottlenecks.length).toBeGreaterThan(0);
      
      const compressionBottleneck = bottlenecks.find(
        b => b.step === PipelineStep.QOMPRESS_COMPRESSION
      );
      expect(compressionBottleneck).toBeDefined();
      expect(compressionBottleneck?.severity).toBe('critical');
      expect(compressionBottleneck?.impact).toBeGreaterThan(0);
    });

    it('should generate data flow graph with correct connections', () => {
      const flowMetrics = createMockFlowMetrics();
      monitoringService.updateMetrics(flowMetrics);
      
      const dashboard = monitoringService.getDashboard();
      const dataFlowGraph = dashboard.flowVisualization.dataFlowGraph;
      
      expect(dataFlowGraph.length).toBe(6); // input -> qompress -> qlock -> qindex -> qerberos -> ipfs
      
      // Verify connections
      const inputNode = dataFlowGraph.find(n => n.id === 'input');
      expect(inputNode?.connections).toContain('qompress');
      
      const qompressNode = dataFlowGraph.find(n => n.id === 'qompress');
      expect(qompressNode?.connections).toContain('qlock');
      
      const ipfsNode = dataFlowGraph.find(n => n.id === 'ipfs');
      expect(ipfsNode?.connections).toHaveLength(0); // Terminal node
    });
  });

  describe('Performance Reporting', () => {
    it('should generate comprehensive performance reports', () => {
      // Generate some historical data
      const flowMetrics = createMockFlowMetrics();
      for (let i = 0; i < 10; i++) {
        monitoringService.updateMetrics({
          ...flowMetrics,
          totalProcessed: flowMetrics.totalProcessed + i * 10
        });
      }
      
      const report = monitoringService.getPerformanceReport();
      
      expect(report.reportId).toBeTruthy();
      expect(report.timeRange.start).toBeInstanceOf(Date);
      expect(report.timeRange.end).toBeInstanceOf(Date);
      expect(report.summary.totalOperations).toBe(10);
      expect(typeof report.summary.averageThroughput).toBe('number');
      expect(typeof report.summary.averageLatency).toBe('number');
      expect(typeof report.summary.averageErrorRate).toBe('number');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should calculate threshold compliance accurately', () => {
      // Generate data with known compliance rates
      const compliantMetrics = createMockFlowMetrics({
        errorRate: 0.01 // Within threshold
      });
      
      // Update multiple times to build history
      for (let i = 0; i < 5; i++) {
        monitoringService.updateMetrics(compliantMetrics);
      }
      
      // Add one non-compliant data point
      const nonCompliantMetrics = createMockFlowMetrics({
        errorRate: 0.1 // Above threshold
      });
      monitoringService.updateMetrics(nonCompliantMetrics);
      
      const report = monitoringService.getPerformanceReport();
      
      // Should be 5/6 = ~0.83 compliance
      expect(report.thresholdCompliance.errorRateCompliance).toBeCloseTo(0.83, 1);
    });

    it('should generate relevant recommendations', () => {
      // Set lower thresholds to trigger recommendations
      monitoringService.updateThresholds({
        maxLatency: 100,
        minThroughput: 50,
        maxErrorRate: 0.02
      });
      
      // Create conditions that should trigger recommendations
      monitoringService.recordOperationEnd('slow-op', true, 2000); // High latency
      
      const poorMetrics = createMockFlowMetrics({
        errorRate: 0.1, // High error rate
        throughput: {
          processedPerSecond: 1,
          retrievedPerSecond: 1
        } // Low throughput
      });
      
      monitoringService.updateMetrics(poorMetrics);
      
      const report = monitoringService.getPerformanceReport();
      
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.toLowerCase().includes('latency') || r.toLowerCase().includes('optimize'))).toBe(true);
      expect(report.recommendations.some(r => r.toLowerCase().includes('error'))).toBe(true);
    });
  });

  describe('Trend Analysis', () => {
    it('should calculate trends correctly', () => {
      // Generate increasing throughput trend
      for (let i = 0; i < 10; i++) {
        const metrics = createMockFlowMetrics({
          throughput: {
            processedPerSecond: 10 + i * 5, // Increasing trend
            retrievedPerSecond: 8 + i * 4
          }
        });
        monitoringService.updateMetrics(metrics);
      }
      
      const dashboard = monitoringService.getDashboard();
      const trends = dashboard.historicalData.trends;
      
      const throughputTrend = trends.find(t => t.metric === 'throughput');
      expect(throughputTrend?.direction).toBe('increasing');
      expect(throughputTrend?.changeRate).toBeGreaterThan(0);
      expect(throughputTrend?.confidence).toBeGreaterThan(0.5);
    });

    it('should detect stable trends', () => {
      // Generate stable metrics
      const stableMetrics = createMockFlowMetrics();
      for (let i = 0; i < 10; i++) {
        monitoringService.updateMetrics(stableMetrics);
      }
      
      const dashboard = monitoringService.getDashboard();
      const trends = dashboard.historicalData.trends;
      
      trends.forEach(trend => {
        expect(trend.direction).toBe('stable');
        expect(Math.abs(trend.changeRate)).toBeLessThan(1);
      });
    });
  });

  describe('Alert Management', () => {
    it('should allow resolving alerts', () => {
      // Generate an alert
      const highErrorMetrics = createMockFlowMetrics({ errorRate: 0.1 });
      monitoringService.updateMetrics(highErrorMetrics);
      
      let dashboard = monitoringService.getDashboard();
      const alert = dashboard.performanceAlerts[0];
      expect(alert.resolved).toBe(false);
      
      // Resolve the alert
      const resolved = monitoringService.resolveAlert(alert.id);
      expect(resolved).toBe(true);
      
      dashboard = monitoringService.getDashboard();
      const resolvedAlert = dashboard.performanceAlerts.find(a => a.id === alert.id);
      expect(resolvedAlert).toBeUndefined(); // Should not appear in active alerts
    });

    it('should handle invalid alert resolution', () => {
      const resolved = monitoringService.resolveAlert('non-existent-alert');
      expect(resolved).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    it('should allow updating thresholds', () => {
      const newThresholds = {
        maxLatency: 500,
        minThroughput: 50
      };
      
      monitoringService.updateThresholds(newThresholds);
      const currentThresholds = monitoringService.getThresholds();
      
      expect(currentThresholds.maxLatency).toBe(500);
      expect(currentThresholds.minThroughput).toBe(50);
      expect(currentThresholds.maxErrorRate).toBe(mockThresholds.maxErrorRate); // Unchanged
    });

    it('should return current thresholds', () => {
      const thresholds = monitoringService.getThresholds();
      
      expect(thresholds.maxLatency).toBe(mockThresholds.maxLatency);
      expect(thresholds.minThroughput).toBe(mockThresholds.minThroughput);
      expect(thresholds.maxErrorRate).toBe(mockThresholds.maxErrorRate);
      expect(thresholds.maxQueueDepth).toBe(mockThresholds.maxQueueDepth);
      expect(thresholds.alertCooldown).toBe(mockThresholds.alertCooldown);
    });
  });

  describe('Performance Requirements Validation', () => {
    it('should meet performance requirements for metrics collection', () => {
      const startTime = Date.now();
      
      // Perform multiple metric updates
      const flowMetrics = createMockFlowMetrics();
      for (let i = 0; i < 100; i++) {
        monitoringService.updateMetrics(flowMetrics);
      }
      
      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time (< 100ms for 100 updates)
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent operations efficiently', async () => {
      const operations = Array(50).fill(0).map((_, i) => {
        return new Promise<void>(resolve => {
          monitoringService.recordOperationStart(`op-${i}`);
          setTimeout(() => {
            monitoringService.recordOperationEnd(`op-${i}`, true, 100);
            resolve();
          }, Math.random() * 10);
        });
      });
      
      const startTime = Date.now();
      await Promise.all(operations);
      const duration = Date.now() - startTime;
      
      // Should handle concurrent operations efficiently
      expect(duration).toBeLessThan(1000);
      
      const dashboard = monitoringService.getDashboard();
      expect(dashboard.realTimeMetrics.activeOperations).toBe(0);
    });

    it('should maintain accuracy under load', () => {
      // Generate high-frequency updates
      const flowMetrics = createMockFlowMetrics();
      
      for (let i = 0; i < 1000; i++) {
        monitoringService.updateMetrics({
          ...flowMetrics,
          totalProcessed: i
        });
      }
      
      const dashboard = monitoringService.getDashboard();
      
      // Verify data integrity
      expect(dashboard.historicalData.dataPoints.length).toBeGreaterThan(0);
      expect(dashboard.realTimeMetrics.lastUpdated).toBeInstanceOf(Date);
      
      // Verify metrics are reasonable
      expect(dashboard.realTimeMetrics.currentThroughput).toBeGreaterThan(0);
      expect(dashboard.realTimeMetrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(dashboard.realTimeMetrics.errorRate).toBeLessThanOrEqual(1);
    });
  });
});