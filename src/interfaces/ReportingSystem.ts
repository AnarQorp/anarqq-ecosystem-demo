import { 
  ScenarioResult, 
  ValidationResult, 
  DemoReport, 
  PerformanceMetrics, 
  DecentralizationMetrics 
} from '../types/index.js';
import { OverallValidationResult } from './ValidationGates.js';

/**
 * Comprehensive reporting system interface
 * Generates reports with execution metrics and audit data
 */
export interface IReportingSystem {
  /**
   * Generate comprehensive execution report
   * @param executionId - Unique execution identifier
   * @param scenarioResults - Results from scenario execution
   * @param validationResults - Validation gate results
   * @returns Promise resolving to comprehensive report
   */
  generateExecutionReport(
    executionId: string,
    scenarioResults: ScenarioResult[],
    validationResults: OverallValidationResult
  ): Promise<ComprehensiveReport>;

  /**
   * Generate visual dashboard data
   * @param executionId - Unique execution identifier
   * @returns Promise resolving to dashboard data
   */
  generateDashboardData(executionId: string): Promise<DashboardData>;

  /**
   * Generate real-time status updates
   * @param executionId - Unique execution identifier
   * @returns Promise resolving to real-time status
   */
  generateRealTimeStatus(executionId: string): Promise<RealTimeStatus>;

  /**
   * Export report in various formats
   * @param report - Report to export
   * @param format - Export format
   * @returns Promise resolving to exported report content
   */
  exportReport(report: ComprehensiveReport, format: ReportFormat): Promise<ExportedReport>;

  /**
   * Generate historical trend analysis
   * @param executionIds - List of execution IDs for trend analysis
   * @returns Promise resolving to trend analysis
   */
  generateTrendAnalysis(executionIds: string[]): Promise<TrendAnalysis>;

  /**
   * Subscribe to real-time updates
   * @param executionId - Execution ID to monitor
   * @param callback - Callback for updates
   * @returns Subscription handle
   */
  subscribeToUpdates(executionId: string, callback: ReportUpdateCallback): Promise<ReportSubscription>;

  /**
   * Unsubscribe from real-time updates
   * @param subscription - Subscription to cancel
   * @returns Promise resolving when unsubscribed
   */
  unsubscribeFromUpdates(subscription: ReportSubscription): Promise<void>;
}

/**
 * Comprehensive execution report
 */
export interface ComprehensiveReport {
  reportId: string;
  executionId: string;
  generatedAt: Date;
  reportType: 'execution' | 'validation' | 'performance' | 'comprehensive';
  
  // Executive Summary
  executiveSummary: ExecutiveSummary;
  
  // Detailed Sections
  scenarioAnalysis: ScenarioAnalysis;
  performanceAnalysis: PerformanceAnalysis;
  validationAnalysis: ValidationAnalysis;
  auditTrailAnalysis: AuditTrailAnalysis;
  
  // Recommendations and Actions
  recommendations: ReportRecommendation[];
  actionItems: ActionItem[];
  
  // Metadata
  metadata: ReportMetadata;
}

/**
 * Executive summary section
 */
export interface ExecutiveSummary {
  overallStatus: 'success' | 'failure' | 'partial' | 'warning';
  overallScore: number; // 0-100
  executionDuration: number;
  scenariosExecuted: number;
  scenariosSuccessful: number;
  criticalIssues: number;
  keyMetrics: KeyMetric[];
  riskAssessment: RiskAssessment;
}

/**
 * Scenario analysis section
 */
export interface ScenarioAnalysis {
  totalScenarios: number;
  successfulScenarios: number;
  failedScenarios: number;
  partialScenarios: number;
  scenarioBreakdown: ScenarioBreakdown[];
  modulePerformance: ModulePerformanceAnalysis[];
  criticalPath: CriticalPathAnalysis;
}

/**
 * Performance analysis section
 */
export interface PerformanceAnalysis {
  overallPerformanceScore: number;
  latencyAnalysis: LatencyAnalysis;
  throughputAnalysis: ThroughputAnalysis;
  errorAnalysis: ErrorAnalysis;
  availabilityAnalysis: AvailabilityAnalysis;
  resourceUtilization: ResourceUtilizationAnalysis;
  bottleneckAnalysis: BottleneckAnalysis[];
}

/**
 * Validation analysis section
 */
export interface ValidationAnalysis {
  gateResults: ValidationGateAnalysis[];
  complianceScore: number;
  securityScore: number;
  decentralizationScore: number;
  integrityScore: number;
  violations: ViolationAnalysis[];
  recommendations: ValidationRecommendation[];
}

/**
 * Audit trail analysis section
 */
export interface AuditTrailAnalysis {
  auditCompleteness: number; // 0-100
  signatureValidation: SignatureValidationAnalysis;
  dataIntegrity: DataIntegrityAnalysis;
  traceabilityScore: number; // 0-100
  auditEvents: AuditEventAnalysis[];
  complianceChecks: ComplianceCheckResult[];
}

/**
 * Dashboard data for visual representation
 */
export interface DashboardData {
  executionId: string;
  lastUpdated: Date;
  
  // Key Performance Indicators
  kpis: KPIWidget[];
  
  // Charts and Graphs
  charts: ChartWidget[];
  
  // Status Indicators
  statusIndicators: StatusIndicator[];
  
  // Real-time Metrics
  realTimeMetrics: RealTimeMetric[];
  
  // Alerts and Notifications
  alerts: AlertWidget[];
}

/**
 * Real-time status information
 */
export interface RealTimeStatus {
  executionId: string;
  currentPhase: string;
  progress: number; // 0-100
  estimatedCompletion: Date;
  activeModules: string[];
  currentMetrics: CurrentMetrics;
  recentEvents: RecentEvent[];
  healthStatus: HealthStatusIndicator;
}

/**
 * Report formats for export
 */
export type ReportFormat = 'json' | 'html' | 'pdf' | 'csv' | 'xml' | 'markdown';

/**
 * Exported report content
 */
export interface ExportedReport {
  format: ReportFormat;
  content: string | Buffer;
  filename: string;
  mimeType: string;
  size: number;
  generatedAt: Date;
}

/**
 * Trend analysis data
 */
export interface TrendAnalysis {
  analysisId: string;
  timeRange: TimeRange;
  executionCount: number;
  
  // Performance Trends
  performanceTrends: PerformanceTrend[];
  
  // Quality Trends
  qualityTrends: QualityTrend[];
  
  // Reliability Trends
  reliabilityTrends: ReliabilityTrend[];
  
  // Predictions and Forecasts
  predictions: TrendPrediction[];
  
  // Anomaly Detection
  anomalies: AnomalyDetection[];
}

/**
 * Report update callback
 */
export type ReportUpdateCallback = (update: ReportUpdate) => void;

/**
 * Report subscription handle
 */
export interface ReportSubscription {
  subscriptionId: string;
  executionId: string;
  createdAt: Date;
  isActive: boolean;
}

/**
 * Report update data
 */
export interface ReportUpdate {
  executionId: string;
  updateType: 'status' | 'metrics' | 'completion' | 'error';
  timestamp: Date;
  data: any;
}

// Supporting interfaces

export interface KeyMetric {
  name: string;
  value: number | string;
  unit?: string;
  trend: 'up' | 'down' | 'stable';
  significance: 'critical' | 'important' | 'informational';
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
}

export interface RiskFactor {
  category: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  probability: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface ScenarioBreakdown {
  scenarioType: string;
  status: 'success' | 'failure' | 'partial';
  duration: number;
  moduleResults: number;
  errorCount: number;
  warningCount: number;
}

export interface ModulePerformanceAnalysis {
  moduleId: string;
  averageLatency: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  reliability: number;
}

export interface CriticalPathAnalysis {
  totalDuration: number;
  criticalSteps: CriticalStep[];
  bottlenecks: string[];
  optimizationOpportunities: string[];
}

export interface CriticalStep {
  stepName: string;
  duration: number;
  percentageOfTotal: number;
  dependencies: string[];
}

export interface LatencyAnalysis {
  p50: number;
  p95: number;
  p99: number;
  average: number;
  distribution: LatencyDistribution[];
}

export interface ThroughputAnalysis {
  requestsPerSecond: number;
  dataProcessedPerSecond: number;
  peakThroughput: number;
  averageThroughput: number;
  throughputDistribution: ThroughputDistribution[];
}

export interface ErrorAnalysis {
  totalErrors: number;
  errorRate: number;
  errorCategories: ErrorCategory[];
  errorTrends: ErrorTrend[];
  topErrors: TopError[];
}

export interface AvailabilityAnalysis {
  overallAvailability: number;
  uptime: number;
  downtime: number;
  availabilityByModule: ModuleAvailability[];
}

export interface ResourceUtilizationAnalysis {
  cpu: ResourceMetric;
  memory: ResourceMetric;
  network: ResourceMetric;
  storage: ResourceMetric;
}

export interface ResourceMetric {
  average: number;
  peak: number;
  utilization: number; // 0-100
  efficiency: number; // 0-100
}

export interface BottleneckAnalysis {
  component: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
  recommendation: string;
}

export interface ValidationGateAnalysis {
  gateName: string;
  passed: boolean;
  score: number;
  violations: number;
  warnings: number;
  trend: 'improving' | 'degrading' | 'stable';
}

export interface ViolationAnalysis {
  type: string;
  severity: string;
  count: number;
  impact: string;
  resolution: string;
}

export interface ValidationRecommendation {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  action: string;
  estimatedEffort: string;
}

export interface SignatureValidationAnalysis {
  totalSignatures: number;
  validSignatures: number;
  invalidSignatures: number;
  validationRate: number;
}

export interface DataIntegrityAnalysis {
  integrityChecks: number;
  passedChecks: number;
  failedChecks: number;
  integrityScore: number;
}

export interface AuditEventAnalysis {
  eventType: string;
  count: number;
  severity: string;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ComplianceCheckResult {
  checkName: string;
  status: 'passed' | 'failed' | 'warning';
  details: string;
  recommendation?: string;
}

export interface KPIWidget {
  id: string;
  title: string;
  value: number | string;
  unit?: string;
  trend: number; // percentage change
  status: 'good' | 'warning' | 'critical';
  target?: number;
}

export interface ChartWidget {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'gauge' | 'heatmap';
  title: string;
  data: ChartDataPoint[];
  config: ChartConfig;
}

export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
}

export interface ChartConfig {
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  colors?: string[];
  thresholds?: ThresholdLine[];
}

export interface AxisConfig {
  label: string;
  type: 'linear' | 'logarithmic' | 'time' | 'category';
  min?: number;
  max?: number;
}

export interface ThresholdLine {
  value: number;
  label: string;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface StatusIndicator {
  id: string;
  label: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  details?: string;
  lastUpdated: Date;
}

export interface RealTimeMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  updateFrequency: number; // seconds
  history: MetricDataPoint[];
}

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

export interface AlertWidget {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  actionRequired?: string;
}

export interface CurrentMetrics {
  latency: number;
  throughput: number;
  errorRate: number;
  availability: number;
  activeConnections: number;
}

export interface RecentEvent {
  timestamp: Date;
  type: 'info' | 'warning' | 'error';
  source: string;
  message: string;
  details?: any;
}

export interface HealthStatusIndicator {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: ComponentHealth[];
  lastCheck: Date;
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
  duration: number; // milliseconds
}

export interface PerformanceTrend {
  metric: string;
  trend: 'improving' | 'degrading' | 'stable';
  changeRate: number; // percentage
  dataPoints: TrendDataPoint[];
}

export interface QualityTrend {
  aspect: string;
  score: number; // 0-100
  trend: 'improving' | 'degrading' | 'stable';
  dataPoints: TrendDataPoint[];
}

export interface ReliabilityTrend {
  component: string;
  reliability: number; // 0-100
  trend: 'improving' | 'degrading' | 'stable';
  dataPoints: TrendDataPoint[];
}

export interface TrendDataPoint {
  timestamp: Date;
  value: number;
}

export interface TrendPrediction {
  metric: string;
  predictedValue: number;
  confidence: number; // 0-100
  timeHorizon: number; // days
  methodology: string;
}

export interface AnomalyDetection {
  timestamp: Date;
  metric: string;
  expectedValue: number;
  actualValue: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface ReportRecommendation {
  id: string;
  category: 'performance' | 'security' | 'reliability' | 'optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  dueDate?: Date;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  dependencies?: string[];
}

export interface ReportMetadata {
  version: string;
  generator: string;
  environment: string;
  configuration: any;
  executionContext: any;
  dataRetention: number; // days
}

// Additional supporting interfaces for specific analyses

export interface LatencyDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface ThroughputDistribution {
  timeWindow: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ErrorCategory {
  category: string;
  count: number;
  percentage: number;
  severity: 'low' | 'medium' | 'high';
}

export interface ErrorTrend {
  timeWindow: string;
  errorCount: number;
  errorRate: number;
}

export interface TopError {
  error: string;
  count: number;
  impact: string;
  firstSeen: Date;
  lastSeen: Date;
}

export interface ModuleAvailability {
  moduleId: string;
  availability: number;
  uptime: number;
  downtime: number;
  incidents: number;
}