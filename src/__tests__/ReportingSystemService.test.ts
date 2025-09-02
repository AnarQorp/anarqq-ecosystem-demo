import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReportingSystemService } from '../services/ReportingSystemService.js';
import { ScenarioResult, ExecutionStatus } from '../types/index.js';
import { OverallValidationResult } from '../interfaces/ValidationGates.js';

describe('ReportingSystemService', () => {
  let reportingSystem: ReportingSystemService;
  let mockScenarioResults: ScenarioResult[];
  let mockValidationResults: OverallValidationResult;

  beforeEach(() => {
    reportingSystem = new ReportingSystemService();

    mockScenarioResults = [
      {
        scenarioId: 'identity-test-1',
        status: 'success' as ExecutionStatus,
        duration: 1500,
        auditCid: 'test-audit-cid-1',
        qerberosSignature: 'test-signature-1',
        moduleResults: [
          { moduleId: 'squid', status: 'active' as any, duration: 500 },
          { moduleId: 'qwallet', status: 'active' as any, duration: 600 }
        ],
        timestamp: new Date()
      },
      {
        scenarioId: 'content-test-2',
        status: 'success' as ExecutionStatus,
        duration: 2000,
        auditCid: 'test-audit-cid-2',
        qerberosSignature: 'test-signature-2',
        moduleResults: [
          { moduleId: 'qdrive', status: 'active' as any, duration: 800 },
          { moduleId: 'qindex', status: 'active' as any, duration: 700 }
        ],
        timestamp: new Date()
      }
    ];

    mockValidationResults = {
      overallPassed: true,
      overallScore: 0.85,
      gateResults: [
        {
          gateName: 'Performance Gate',
          passed: true,
          score: 0.9,
          violations: [],
          warnings: [],
          metrics: {},
          timestamp: new Date()
        },
        {
          gateName: 'Decentralization Gate',
          passed: true,
          score: 0.8,
          violations: [],
          warnings: [],
          metrics: {},
          timestamp: new Date()
        },
        {
          gateName: 'Integrity Gate',
          passed: true,
          score: 0.85,
          violations: [],
          warnings: [],
          metrics: {},
          timestamp: new Date()
        }
      ],
      criticalViolations: [],
      allWarnings: [],
      executionId: 'test-execution-123',
      timestamp: new Date(),
      recommendation: {
        action: 'proceed',
        priority: 'low',
        message: 'All validation gates passed successfully',
        suggestedFixes: [],
        estimatedImpact: 'None - System performing well'
      }
    };
  });

  afterEach(async () => {
    await reportingSystem.shutdown();
  });

  describe('generateExecutionReport', () => {
    it('should generate comprehensive execution report', async () => {
      const report = await reportingSystem.generateExecutionReport(
        'test-execution-123',
        mockScenarioResults,
        mockValidationResults
      );

      expect(report.reportId).toContain('report_test-execution-123');
      expect(report.executionId).toBe('test-execution-123');
      expect(report.reportType).toBe('comprehensive');
      expect(report.generatedAt).toBeInstanceOf(Date);

      // Executive Summary
      expect(report.executiveSummary.overallStatus).toBe('success');
      expect(report.executiveSummary.overallScore).toBe(85);
      expect(report.executiveSummary.scenariosExecuted).toBe(2);
      expect(report.executiveSummary.scenariosSuccessful).toBe(2);
      expect(report.executiveSummary.criticalIssues).toBe(0);
      expect(report.executiveSummary.keyMetrics).toHaveLength(2);

      // Scenario Analysis
      expect(report.scenarioAnalysis.totalScenarios).toBe(2);
      expect(report.scenarioAnalysis.successfulScenarios).toBe(2);
      expect(report.scenarioAnalysis.failedScenarios).toBe(0);
      expect(report.scenarioAnalysis.scenarioBreakdown).toHaveLength(2);
      expect(report.scenarioAnalysis.modulePerformance.length).toBeGreaterThan(0);

      // Performance Analysis
      expect(report.performanceAnalysis.overallPerformanceScore).toBe(90);
      expect(report.performanceAnalysis.latencyAnalysis.average).toBe(1750);
      expect(report.performanceAnalysis.latencyAnalysis.p50).toBeGreaterThan(0);

      // Validation Analysis
      expect(report.validationAnalysis.gateResults).toHaveLength(3);
      expect(report.validationAnalysis.complianceScore).toBe(85);
      expect(report.validationAnalysis.violations).toHaveLength(0);

      // Audit Trail Analysis
      expect(report.auditTrailAnalysis.auditCompleteness).toBe(100);
      expect(report.auditTrailAnalysis.signatureValidation.validationRate).toBe(100);
      expect(report.auditTrailAnalysis.traceabilityScore).toBe(100);

      // Metadata
      expect(report.metadata.version).toBe('1.0.0');
      expect(report.metadata.generator).toBe('AnarQ&Q Demo Orchestrator');
      expect(report.metadata.dataRetention).toBe(30);
    });

    it('should handle failed scenarios correctly', async () => {
      const failedScenarioResults = [
        {
          ...mockScenarioResults[0],
          status: 'failure' as ExecutionStatus
        },
        mockScenarioResults[1]
      ];

      const failedValidationResults = {
        ...mockValidationResults,
        overallPassed: false,
        criticalViolations: [
          {
            type: 'performance',
            severity: 'critical' as const,
            message: 'Latency exceeded threshold',
            actualValue: 3000,
            expectedValue: 2000,
            threshold: 2000,
            impact: 'User experience degradation'
          }
        ]
      };

      const report = await reportingSystem.generateExecutionReport(
        'test-execution-failed',
        failedScenarioResults,
        failedValidationResults
      );

      expect(report.executiveSummary.overallStatus).toBe('failure');
      expect(report.executiveSummary.criticalIssues).toBe(1);
      expect(report.scenarioAnalysis.failedScenarios).toBe(1);
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations[0].priority).toBe('critical');
    });
  });

  describe('generateDashboardData', () => {
    it('should generate dashboard data after report generation', async () => {
      // First generate a report to populate execution data
      await reportingSystem.generateExecutionReport(
        'test-execution-123',
        mockScenarioResults,
        mockValidationResults
      );

      const dashboardData = await reportingSystem.generateDashboardData('test-execution-123');

      expect(dashboardData.executionId).toBe('test-execution-123');
      expect(dashboardData.lastUpdated).toBeInstanceOf(Date);
      expect(dashboardData.kpis).toHaveLength(2);
      expect(dashboardData.charts).toHaveLength(1);
      expect(dashboardData.statusIndicators).toHaveLength(1);
      expect(dashboardData.realTimeMetrics).toHaveLength(1);
      expect(dashboardData.alerts).toHaveLength(0); // No critical violations

      // Check KPI structure
      const successRateKPI = dashboardData.kpis.find(kpi => kpi.id === 'success-rate');
      expect(successRateKPI).toBeDefined();
      expect(successRateKPI?.title).toBe('Success Rate');
      expect(successRateKPI?.value).toBe('100.0%');
      expect(successRateKPI?.status).toBe('good');

      const latencyKPI = dashboardData.kpis.find(kpi => kpi.id === 'avg-latency');
      expect(latencyKPI).toBeDefined();
      expect(latencyKPI?.title).toBe('Average Latency');
      expect(latencyKPI?.unit).toBe('ms');

      // Check chart structure
      const latencyChart = dashboardData.charts.find(chart => chart.id === 'latency-trend');
      expect(latencyChart).toBeDefined();
      expect(latencyChart?.type).toBe('line');
      expect(latencyChart?.data).toHaveLength(2);

      // Check status indicators
      const healthIndicator = dashboardData.statusIndicators.find(si => si.id === 'system-health');
      expect(healthIndicator).toBeDefined();
      expect(healthIndicator?.status).toBe('online');
    });

    it('should throw error for non-existent execution', async () => {
      await expect(
        reportingSystem.generateDashboardData('non-existent-execution')
      ).rejects.toThrow('No execution data found for: non-existent-execution');
    });
  });

  describe('generateRealTimeStatus', () => {
    it('should generate real-time status', async () => {
      // First generate a report to populate execution data
      await reportingSystem.generateExecutionReport(
        'test-execution-123',
        mockScenarioResults,
        mockValidationResults
      );

      const realTimeStatus = await reportingSystem.generateRealTimeStatus('test-execution-123');

      expect(realTimeStatus.executionId).toBe('test-execution-123');
      expect(realTimeStatus.currentPhase).toBe('Validation & Reporting');
      expect(realTimeStatus.progress).toBe(100);
      expect(realTimeStatus.estimatedCompletion).toBeInstanceOf(Date);
      expect(realTimeStatus.activeModules).toContain('squid');
      expect(realTimeStatus.activeModules).toContain('qwallet');
      expect(realTimeStatus.currentMetrics).toHaveProperty('latency');
      expect(realTimeStatus.currentMetrics).toHaveProperty('throughput');
      expect(realTimeStatus.recentEvents).toHaveLength(1);
      expect(realTimeStatus.healthStatus.overall).toBe('healthy');
    });

    it('should throw error for non-existent execution', async () => {
      await expect(
        reportingSystem.generateRealTimeStatus('non-existent-execution')
      ).rejects.toThrow('No execution data found for: non-existent-execution');
    });
  });

  describe('exportReport', () => {
    let report: any;

    beforeEach(async () => {
      report = await reportingSystem.generateExecutionReport(
        'test-execution-123',
        mockScenarioResults,
        mockValidationResults
      );
    });

    it('should export report in JSON format', async () => {
      const exportedReport = await reportingSystem.exportReport(report, 'json');

      expect(exportedReport.format).toBe('json');
      expect(exportedReport.mimeType).toBe('application/json');
      expect(exportedReport.filename).toBe('report_test-execution-123.json');
      expect(exportedReport.size).toBeGreaterThan(0);
      expect(exportedReport.generatedAt).toBeInstanceOf(Date);
      expect(typeof exportedReport.content).toBe('string');

      // Verify JSON is valid
      const parsedContent = JSON.parse(exportedReport.content as string);
      expect(parsedContent.executionId).toBe('test-execution-123');
    });

    it('should export report in HTML format', async () => {
      const exportedReport = await reportingSystem.exportReport(report, 'html');

      expect(exportedReport.format).toBe('html');
      expect(exportedReport.mimeType).toBe('text/html');
      expect(exportedReport.filename).toBe('report_test-execution-123.html');
      expect(exportedReport.content).toContain('<!DOCTYPE html>');
      expect(exportedReport.content).toContain('Demo Execution Report');
      expect(exportedReport.content).toContain('test-execution-123');
    });

    it('should export report in CSV format', async () => {
      const exportedReport = await reportingSystem.exportReport(report, 'csv');

      expect(exportedReport.format).toBe('csv');
      expect(exportedReport.mimeType).toBe('text/csv');
      expect(exportedReport.filename).toBe('report_test-execution-123.csv');
      expect(exportedReport.content).toContain('Section,Metric,Value');
      expect(exportedReport.content).toContain('Executive Summary');
    });

    it('should export report in Markdown format', async () => {
      const exportedReport = await reportingSystem.exportReport(report, 'markdown');

      expect(exportedReport.format).toBe('markdown');
      expect(exportedReport.mimeType).toBe('text/markdown');
      expect(exportedReport.filename).toBe('report_test-execution-123.md');
      expect(exportedReport.content).toContain('# Demo Execution Report');
      expect(exportedReport.content).toContain('**Execution ID:** test-execution-123');
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        reportingSystem.exportReport(report, 'unsupported' as any)
      ).rejects.toThrow('Unsupported export format: unsupported');
    });
  });

  describe('generateTrendAnalysis', () => {
    it('should generate trend analysis for multiple executions', async () => {
      // Generate multiple reports
      await reportingSystem.generateExecutionReport(
        'execution-1',
        mockScenarioResults,
        mockValidationResults
      );
      
      await reportingSystem.generateExecutionReport(
        'execution-2',
        mockScenarioResults,
        mockValidationResults
      );

      const trendAnalysis = await reportingSystem.generateTrendAnalysis(['execution-1', 'execution-2']);

      expect(trendAnalysis.analysisId).toContain('trend_');
      expect(trendAnalysis.executionCount).toBe(2);
      expect(trendAnalysis.timeRange.start).toBeInstanceOf(Date);
      expect(trendAnalysis.timeRange.end).toBeInstanceOf(Date);
      expect(trendAnalysis.timeRange.duration).toBeGreaterThanOrEqual(0);
      expect(trendAnalysis.performanceTrends).toHaveLength(1);
      expect(trendAnalysis.qualityTrends).toHaveLength(1);
      expect(trendAnalysis.reliabilityTrends).toHaveLength(1);
      expect(trendAnalysis.predictions).toHaveLength(0);
      expect(trendAnalysis.anomalies).toHaveLength(1);

      // Check trend structure
      const performanceTrend = trendAnalysis.performanceTrends[0];
      expect(performanceTrend.metric).toBe('latency');
      expect(performanceTrend.trend).toBe('improving');
      expect(performanceTrend.dataPoints).toHaveLength(2);
    });

    it('should throw error when no execution data found', async () => {
      await expect(
        reportingSystem.generateTrendAnalysis(['non-existent-1', 'non-existent-2'])
      ).rejects.toThrow('No execution data found for trend analysis');
    });
  });

  describe('real-time subscriptions', () => {
    it('should create and manage subscriptions', { timeout: 10000 }, async () => {
      const mockCallback = vi.fn();
      
      const subscription = await reportingSystem.subscribeToUpdates('test-execution-123', mockCallback);

      expect(subscription.subscriptionId).toContain('sub_test-execution-123');
      expect(subscription.executionId).toBe('test-execution-123');
      expect(subscription.isActive).toBe(true);
      expect(subscription.createdAt).toBeInstanceOf(Date);

      // Wait for at least one update (real-time updates happen every 5 seconds)
      await new Promise(resolve => setTimeout(resolve, 5100));

      expect(mockCallback).toHaveBeenCalled();
      const updateCall = mockCallback.mock.calls[0][0];
      expect(updateCall.executionId).toBe('test-execution-123');
      expect(updateCall.updateType).toBe('metrics');
      expect(updateCall.data).toHaveProperty('status');
      expect(updateCall.data).toHaveProperty('progress');
      expect(updateCall.data).toHaveProperty('metrics');

      // Unsubscribe
      await reportingSystem.unsubscribeFromUpdates(subscription);
    });
  });

  describe('error handling', () => {
    it('should handle missing execution data gracefully', async () => {
      await expect(
        reportingSystem.generateDashboardData('missing-execution')
      ).rejects.toThrow('No execution data found for: missing-execution');

      await expect(
        reportingSystem.generateRealTimeStatus('missing-execution')
      ).rejects.toThrow('No execution data found for: missing-execution');
    });

    it('should handle empty scenario results', async () => {
      const emptyScenarioResults: ScenarioResult[] = [];
      
      const report = await reportingSystem.generateExecutionReport(
        'empty-execution',
        emptyScenarioResults,
        mockValidationResults
      );

      expect(report.executiveSummary.scenariosExecuted).toBe(0);
      expect(report.executiveSummary.scenariosSuccessful).toBe(0);
      expect(report.scenarioAnalysis.totalScenarios).toBe(0);
      expect(report.performanceAnalysis.latencyAnalysis.average).toBe(0);
    });
  });

  describe('shutdown', () => {
    it('should cleanup resources on shutdown', async () => {
      const mockCallback = vi.fn();
      
      // Create subscription
      await reportingSystem.subscribeToUpdates('test-execution', mockCallback);
      
      // Generate some data
      await reportingSystem.generateExecutionReport(
        'test-execution',
        mockScenarioResults,
        mockValidationResults
      );

      // Shutdown
      await reportingSystem.shutdown();

      // Verify cleanup
      expect(reportingSystem.listenerCount('update_test-execution')).toBe(0);
    });
  });
});