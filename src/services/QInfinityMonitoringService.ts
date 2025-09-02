// Q∞ Data Flow Monitoring Service
// Provides real-time monitoring dashboard and performance tracking

import { 
  FlowMetrics, 
  StepMetrics, 
  PipelineStep,
  ProcessingStepResult 
} from '../interfaces/QInfinityDataFlow.js';

export interface MonitoringDashboard {
  realTimeMetrics: RealTimeMetrics;
  performanceAlerts: PerformanceAlert[];
  flowVisualization: FlowVisualization;
  historicalData: HistoricalMetrics;
}

export interface RealTimeMetrics {
  currentThroughput: number;
  averageLatency: number;
  errorRate: number;
  activeOperations: number;
  queueDepth: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  lastUpdated: Date;
}

export interface PerformanceAlert {
  id: string;
  type: 'latency' | 'throughput' | 'error_rate' | 'system_health';
  severity: 'warning' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
}

export interface FlowVisualization {
  pipelineSteps: PipelineStepVisualization[];
  dataFlowGraph: DataFlowNode[];
  bottlenecks: Bottleneck[];
}

export interface PipelineStepVisualization {
  step: PipelineStep;
  status: 'active' | 'idle' | 'error';
  throughput: number;
  averageLatency: number;
  errorCount: number;
  queueSize: number;
}

export interface DataFlowNode {
  id: string;
  name: string;
  type: 'input' | 'processing' | 'storage' | 'output';
  connections: string[];
  metrics: {
    processed: number;
    errors: number;
    averageTime: number;
  };
}

export interface Bottleneck {
  step: PipelineStep;
  severity: 'minor' | 'major' | 'critical';
  description: string;
  impact: number; // Percentage impact on overall throughput
  recommendation: string;
}

export interface HistoricalMetrics {
  timeRange: {
    start: Date;
    end: Date;
  };
  dataPoints: MetricDataPoint[];
  trends: MetricTrend[];
}

export interface MetricDataPoint {
  timestamp: Date;
  throughput: number;
  latency: number;
  errorRate: number;
  stepMetrics: Record<PipelineStep, number>;
}

export interface MetricTrend {
  metric: 'throughput' | 'latency' | 'error_rate';
  direction: 'increasing' | 'decreasing' | 'stable';
  changeRate: number; // Percentage change per hour
  confidence: number; // 0-1 confidence in trend
}

export interface PerformanceThresholds {
  maxLatency: number; // milliseconds
  minThroughput: number; // operations per second
  maxErrorRate: number; // percentage (0-1)
  maxQueueDepth: number;
  alertCooldown: number; // milliseconds between alerts
}

export class QInfinityMonitoringService {
  private metrics: FlowMetrics | null = null;
  private realTimeData: RealTimeMetrics;
  private alerts: PerformanceAlert[] = [];
  private historicalData: MetricDataPoint[] = [];
  private thresholds: PerformanceThresholds;
  private activeOperations: Set<string> = new Set();
  private alertCooldowns: Map<string, number> = new Map();

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      maxLatency: 2000, // 2 seconds
      minThroughput: 100, // 100 ops/sec
      maxErrorRate: 0.01, // 1%
      maxQueueDepth: 1000,
      alertCooldown: 60000, // 1 minute
      ...thresholds
    };

    this.realTimeData = {
      currentThroughput: 0,
      averageLatency: 0,
      errorRate: 0,
      activeOperations: 0,
      queueDepth: 0,
      systemHealth: 'healthy',
      lastUpdated: new Date()
    };

    // Start periodic data collection
    this.startPeriodicCollection();
  }

  updateMetrics(flowMetrics: FlowMetrics): void {
    this.metrics = flowMetrics;
    this.updateRealTimeMetrics();
    this.checkPerformanceThresholds();
    this.recordHistoricalData();
  }

  recordOperationStart(operationId: string): void {
    this.activeOperations.add(operationId);
    this.realTimeData.activeOperations = this.activeOperations.size;
  }

  recordOperationEnd(operationId: string, success: boolean, duration: number): void {
    this.activeOperations.delete(operationId);
    this.realTimeData.activeOperations = this.activeOperations.size;
    
    // Update real-time latency
    if (this.realTimeData.averageLatency === 0) {
      this.realTimeData.averageLatency = duration;
    } else {
      // Exponential moving average
      this.realTimeData.averageLatency = 
        0.9 * this.realTimeData.averageLatency + 0.1 * duration;
    }
  }

  getDashboard(): MonitoringDashboard {
    return {
      realTimeMetrics: { ...this.realTimeData },
      performanceAlerts: this.getActiveAlerts(),
      flowVisualization: this.generateFlowVisualization(),
      historicalData: this.getHistoricalMetrics()
    };
  }

  getPerformanceReport(): PerformanceReport {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentData = this.historicalData.filter(
      point => point.timestamp >= oneHourAgo
    );

    return {
      reportId: `perf_${Date.now()}`,
      timeRange: { start: oneHourAgo, end: now },
      summary: {
        averageThroughput: this.calculateAverage(recentData, 'throughput'),
        averageLatency: this.calculateAverage(recentData, 'latency'),
        averageErrorRate: this.calculateAverage(recentData, 'errorRate'),
        totalOperations: recentData.length,
        alertCount: this.alerts.filter(a => a.timestamp >= oneHourAgo).length
      },
      thresholdCompliance: {
        latencyCompliance: this.calculateCompliance(recentData, 'latency', this.thresholds.maxLatency),
        throughputCompliance: this.calculateCompliance(recentData, 'throughput', this.thresholds.minThroughput, 'min'),
        errorRateCompliance: this.calculateCompliance(recentData, 'errorRate', this.thresholds.maxErrorRate)
      },
      recommendations: this.generateRecommendations(),
      generatedAt: now
    };
  }

  private updateRealTimeMetrics(): void {
    if (!this.metrics) return;

    this.realTimeData.currentThroughput = 
      this.metrics.throughput.processedPerSecond + this.metrics.throughput.retrievedPerSecond;
    this.realTimeData.errorRate = this.metrics.errorRate;
    this.realTimeData.lastUpdated = new Date();

    // Determine system health
    if (this.realTimeData.errorRate > this.thresholds.maxErrorRate * 2) {
      this.realTimeData.systemHealth = 'critical';
    } else if (
      this.realTimeData.errorRate > this.thresholds.maxErrorRate ||
      this.realTimeData.averageLatency > this.thresholds.maxLatency ||
      this.realTimeData.currentThroughput < this.thresholds.minThroughput * 0.8
    ) {
      this.realTimeData.systemHealth = 'degraded';
    } else {
      this.realTimeData.systemHealth = 'healthy';
    }
  }

  private checkPerformanceThresholds(): void {
    const now = Date.now();

    // Check latency threshold
    if (this.realTimeData.averageLatency > this.thresholds.maxLatency) {
      this.createAlert('latency', 'critical', 
        `Average latency (${this.realTimeData.averageLatency}ms) exceeds threshold (${this.thresholds.maxLatency}ms)`,
        this.thresholds.maxLatency, this.realTimeData.averageLatency);
    }

    // Check throughput threshold
    if (this.realTimeData.currentThroughput < this.thresholds.minThroughput) {
      this.createAlert('throughput', 'warning',
        `Current throughput (${this.realTimeData.currentThroughput} ops/sec) below threshold (${this.thresholds.minThroughput} ops/sec)`,
        this.thresholds.minThroughput, this.realTimeData.currentThroughput);
    }

    // Check error rate threshold
    if (this.realTimeData.errorRate > this.thresholds.maxErrorRate) {
      this.createAlert('error_rate', 'critical',
        `Error rate (${(this.realTimeData.errorRate * 100).toFixed(2)}%) exceeds threshold (${(this.thresholds.maxErrorRate * 100).toFixed(2)}%)`,
        this.thresholds.maxErrorRate, this.realTimeData.errorRate);
    }

    // Check system health
    if (this.realTimeData.systemHealth === 'critical') {
      this.createAlert('system_health', 'critical',
        'System health is critical - multiple performance thresholds exceeded',
        1, 0);
    }
  }

  private createAlert(
    type: PerformanceAlert['type'], 
    severity: PerformanceAlert['severity'],
    message: string,
    threshold: number,
    currentValue: number
  ): void {
    const alertKey = `${type}_${severity}`;
    const now = Date.now();
    
    // Check cooldown
    const lastAlert = this.alertCooldowns.get(alertKey);
    if (lastAlert && (now - lastAlert) < this.thresholds.alertCooldown) {
      return;
    }

    const alert: PerformanceAlert = {
      id: `alert_${now}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      threshold,
      currentValue,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);
    this.alertCooldowns.set(alertKey, now);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  private recordHistoricalData(): void {
    if (!this.metrics) return;

    const dataPoint: MetricDataPoint = {
      timestamp: new Date(),
      throughput: this.realTimeData.currentThroughput,
      latency: this.realTimeData.averageLatency,
      errorRate: this.realTimeData.errorRate,
      stepMetrics: {}
    };

    // Record step-specific metrics
    Object.entries(this.metrics.pipelineStepMetrics).forEach(([step, metric]) => {
      dataPoint.stepMetrics[step as PipelineStep] = metric.averageDuration;
    });

    this.historicalData.push(dataPoint);

    // Keep only last 24 hours of data (assuming 1 data point per minute)
    const maxDataPoints = 24 * 60;
    if (this.historicalData.length > maxDataPoints) {
      this.historicalData = this.historicalData.slice(-maxDataPoints);
    }
  }

  private generateFlowVisualization(): FlowVisualization {
    const pipelineSteps: PipelineStepVisualization[] = [];
    const bottlenecks: Bottleneck[] = [];

    if (this.metrics) {
      Object.entries(this.metrics.pipelineStepMetrics).forEach(([step, metric]) => {
        const stepEnum = step as PipelineStep;
        const visualization: PipelineStepVisualization = {
          step: stepEnum,
          status: metric.errorCount > 0 ? 'error' : 'active',
          throughput: metric.totalExecutions / (metric.averageDuration / 1000),
          averageLatency: metric.averageDuration,
          errorCount: metric.errorCount,
          queueSize: 0 // Mock queue size
        };

        pipelineSteps.push(visualization);

        // Identify bottlenecks
        if (metric.averageDuration > 1000) { // > 1 second
          bottlenecks.push({
            step: stepEnum,
            severity: metric.averageDuration > 2000 ? 'critical' : 'major',
            description: `Step ${step} has high latency (${metric.averageDuration}ms)`,
            impact: Math.min(90, (metric.averageDuration / 2000) * 100),
            recommendation: `Optimize ${step} processing or increase resources`
          });
        }
      });
    }

    const dataFlowGraph: DataFlowNode[] = [
      {
        id: 'input',
        name: 'Data Input',
        type: 'input',
        connections: ['qompress'],
        metrics: { processed: this.metrics?.totalProcessed || 0, errors: 0, averageTime: 0 }
      },
      {
        id: 'qompress',
        name: 'Qompress',
        type: 'processing',
        connections: ['qlock'],
        metrics: this.getNodeMetrics(PipelineStep.QOMPRESS_COMPRESSION)
      },
      {
        id: 'qlock',
        name: 'Qlock',
        type: 'processing',
        connections: ['qindex'],
        metrics: this.getNodeMetrics(PipelineStep.QLOCK_ENCRYPTION)
      },
      {
        id: 'qindex',
        name: 'Qindex',
        type: 'processing',
        connections: ['qerberos'],
        metrics: this.getNodeMetrics(PipelineStep.QINDEX_METADATA)
      },
      {
        id: 'qerberos',
        name: 'Qerberos',
        type: 'processing',
        connections: ['ipfs'],
        metrics: this.getNodeMetrics(PipelineStep.QERBEROS_SECURITY)
      },
      {
        id: 'ipfs',
        name: 'IPFS Storage',
        type: 'storage',
        connections: [],
        metrics: this.getNodeMetrics(PipelineStep.IPFS_STORAGE)
      }
    ];

    return {
      pipelineSteps,
      dataFlowGraph,
      bottlenecks
    };
  }

  private getNodeMetrics(step: PipelineStep): DataFlowNode['metrics'] {
    if (!this.metrics) {
      return { processed: 0, errors: 0, averageTime: 0 };
    }

    const stepMetric = this.metrics.pipelineStepMetrics[step];
    return {
      processed: stepMetric?.totalExecutions || 0,
      errors: stepMetric?.errorCount || 0,
      averageTime: stepMetric?.averageDuration || 0
    };
  }

  private getActiveAlerts(): PerformanceAlert[] {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.alerts.filter(alert => 
      !alert.resolved && alert.timestamp >= oneHourAgo
    );
  }

  private getHistoricalMetrics(): HistoricalMetrics {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentData = this.historicalData.filter(
      point => point.timestamp >= oneHourAgo
    );

    return {
      timeRange: { start: oneHourAgo, end: now },
      dataPoints: recentData,
      trends: this.calculateTrends(recentData)
    };
  }

  private calculateTrends(data: MetricDataPoint[]): MetricTrend[] {
    if (data.length < 2) return [];

    const trends: MetricTrend[] = [];
    const metrics: Array<keyof Pick<MetricDataPoint, 'throughput' | 'latency' | 'errorRate'>> = 
      ['throughput', 'latency', 'errorRate'];

    metrics.forEach(metric => {
      const values = data.map(point => point[metric]);
      const trend = this.calculateLinearTrend(values);
      
      trends.push({
        metric: metric === 'errorRate' ? 'error_rate' : metric,
        direction: trend.slope > 0.1 ? 'increasing' : 
                  trend.slope < -0.1 ? 'decreasing' : 'stable',
        changeRate: trend.slope * 3600, // Per hour
        confidence: trend.rSquared
      });
    });

    return trends;
  }

  private calculateLinearTrend(values: number[]): { slope: number; rSquared: number } {
    if (values.length < 2) return { slope: 0, rSquared: 0 };

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = values.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = values.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const ssTot = values.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const rSquared = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

    return { slope, rSquared: Math.max(0, rSquared) };
  }

  private calculateAverage(data: MetricDataPoint[], metric: keyof MetricDataPoint): number {
    if (data.length === 0) return 0;
    const values = data.map(point => point[metric] as number).filter(v => typeof v === 'number');
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateCompliance(
    data: MetricDataPoint[], 
    metric: keyof MetricDataPoint, 
    threshold: number,
    type: 'max' | 'min' = 'max'
  ): number {
    if (data.length === 0) return 1;
    
    const values = data.map(point => point[metric] as number).filter(v => typeof v === 'number');
    const compliantCount = values.filter(value => 
      type === 'max' ? value <= threshold : value >= threshold
    ).length;
    
    return compliantCount / values.length;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.realTimeData.averageLatency > this.thresholds.maxLatency) {
      recommendations.push('Consider optimizing pipeline steps or increasing system resources');
    }
    
    if (this.realTimeData.currentThroughput < this.thresholds.minThroughput) {
      recommendations.push('Scale up processing capacity or optimize bottleneck steps');
    }
    
    if (this.realTimeData.errorRate > this.thresholds.maxErrorRate) {
      recommendations.push('Investigate error patterns and improve error handling');
    }
    
    if (this.realTimeData.systemHealth === 'degraded') {
      recommendations.push('Monitor system closely and prepare for scaling if needed');
    }
    
    return recommendations;
  }

  private startPeriodicCollection(): void {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.realTimeData.lastUpdated = new Date();
    }, 30000);
  }

  // Public method to resolve alerts
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  // Public method to get current thresholds
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  // Public method to update thresholds
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }
}

export interface PerformanceReport {
  reportId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: {
    averageThroughput: number;
    averageLatency: number;
    averageErrorRate: number;
    totalOperations: number;
    alertCount: number;
  };
  thresholdCompliance: {
    latencyCompliance: number;
    throughputCompliance: number;
    errorRateCompliance: number;
  };
  recommendations: string[];
  generatedAt: Date;
}