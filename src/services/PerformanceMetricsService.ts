import { 
  IPerformanceMetrics, 
  PerformanceThresholds, 
  PerformanceAlert, 
  PerformanceMonitoringConfig,
  PerformanceCollectionResult
} from '../interfaces/PerformanceMetrics.js';
import { PerformanceMetrics } from '../types/index.js';

/**
 * Latency measurement record
 */
interface LatencyRecord {
  operation: string;
  latencyMs: number;
  timestamp: Date;
}

/**
 * Throughput measurement record
 */
interface ThroughputRecord {
  operation: string;
  requestCount: number;
  dataBytes: number;
  durationMs: number;
  timestamp: Date;
}

/**
 * Error record
 */
interface ErrorRecord {
  operation: string;
  error: Error;
  timestamp: Date;
}

/**
 * Performance metrics service implementation
 * Provides real-time performance monitoring with alerting capabilities
 */
export class PerformanceMetricsService implements IPerformanceMetrics {
  private latencyRecords: LatencyRecord[] = [];
  private throughputRecords: ThroughputRecord[] = [];
  private errorRecords: ErrorRecord[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private config: PerformanceMonitoringConfig;
  private alerts: PerformanceAlert[] = [];

  constructor() {
    // Default configuration
    this.config = {
      enabled: false,
      intervalMs: 5000, // 5 seconds
      retentionPeriodMs: 24 * 60 * 60 * 1000, // 24 hours
      thresholds: {
        latency: {
          p50: 1000, // 1 second
          p95: 2000, // 2 seconds
          p99: 5000  // 5 seconds
        },
        throughput: {
          minRequestsPerSecond: 100,
          minDataProcessedPerSecond: 1024 * 1024 // 1MB/s
        },
        errorRate: {
          maxErrorRate: 0.01 // 1%
        },
        availability: {
          minAvailability: 0.99 // 99%
        }
      },
      alerting: {
        enabled: true
      }
    };
  }

  async collectMetrics(): Promise<PerformanceMetrics> {
    const now = new Date();
    const windowMs = 60000; // 1 minute window
    const windowStart = new Date(now.getTime() - windowMs);

    // Filter records within the time window
    const recentLatency = this.latencyRecords.filter(r => r.timestamp >= windowStart);
    const recentThroughput = this.throughputRecords.filter(r => r.timestamp >= windowStart);
    const recentErrors = this.errorRecords.filter(r => r.timestamp >= windowStart);

    // Calculate latency percentiles
    const latencies = recentLatency.map(r => r.latencyMs).sort((a, b) => a - b);
    const latency = {
      p50: this.calculatePercentile(latencies, 50),
      p95: this.calculatePercentile(latencies, 95),
      p99: this.calculatePercentile(latencies, 99)
    };

    // Calculate throughput
    const totalRequests = recentThroughput.reduce((sum, r) => sum + r.requestCount, 0);
    const totalDataBytes = recentThroughput.reduce((sum, r) => sum + r.dataBytes, 0);
    const windowSeconds = windowMs / 1000;

    const throughput = {
      requestsPerSecond: totalRequests / windowSeconds,
      dataProcessedPerSecond: totalDataBytes / windowSeconds
    };

    // Calculate error rate
    const totalOperations = recentLatency.length + recentErrors.length;
    const errorRate = totalOperations > 0 ? recentErrors.length / totalOperations : 0;

    // Calculate availability (simplified - based on successful operations)
    const successfulOperations = recentLatency.length;
    const availability = totalOperations > 0 ? successfulOperations / totalOperations : 1.0;

    return {
      latency,
      throughput,
      errorRate,
      availability
    };
  }

  async collectMetricsWithAlerting(): Promise<PerformanceCollectionResult> {
    const startTime = Date.now();
    const metrics = await this.collectMetrics();
    const collectionDuration = Date.now() - startTime;

    // Generate alerts based on thresholds
    const alerts = await this.generateAlerts(metrics);

    return {
      metrics,
      alerts,
      timestamp: new Date(),
      collectionDuration
    };
  }

  async startMonitoring(config: PerformanceMonitoringConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (!this.config.enabled) {
      return;
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        const result = await this.collectMetricsWithAlerting();
        
        // Clean up old records
        await this.cleanupOldRecords();
        
        // Process alerts
        if (this.config.alerting.enabled && result.alerts.length > 0) {
          await this.processAlerts(result.alerts);
        }
      } catch (error) {
        console.error('Error during performance monitoring:', error);
      }
    }, this.config.intervalMs);
  }

  async stopMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.config.enabled = false;
  }

  async getHistoricalMetrics(startTime: Date, endTime: Date): Promise<PerformanceMetrics[]> {
    // For this implementation, we'll return metrics calculated from stored records
    // In a production system, this would query a time-series database
    
    const filteredLatency = this.latencyRecords.filter(
      r => r.timestamp >= startTime && r.timestamp <= endTime
    );
    const filteredThroughput = this.throughputRecords.filter(
      r => r.timestamp >= startTime && r.timestamp <= endTime
    );
    const filteredErrors = this.errorRecords.filter(
      r => r.timestamp >= startTime && r.timestamp <= endTime
    );

    // Group by time intervals (e.g., 1-minute buckets)
    const intervalMs = 60000; // 1 minute
    const intervals: Map<number, PerformanceMetrics> = new Map();

    // Process each interval
    const startTimestamp = Math.floor(startTime.getTime() / intervalMs) * intervalMs;
    const endTimestamp = Math.floor(endTime.getTime() / intervalMs) * intervalMs;

    for (let timestamp = startTimestamp; timestamp <= endTimestamp; timestamp += intervalMs) {
      const intervalStart = new Date(timestamp);
      const intervalEnd = new Date(timestamp + intervalMs);

      const intervalLatency = filteredLatency.filter(
        r => r.timestamp >= intervalStart && r.timestamp < intervalEnd
      );
      const intervalThroughput = filteredThroughput.filter(
        r => r.timestamp >= intervalStart && r.timestamp < intervalEnd
      );
      const intervalErrors = filteredErrors.filter(
        r => r.timestamp >= intervalStart && r.timestamp < intervalEnd
      );

      const latencies = intervalLatency.map(r => r.latencyMs).sort((a, b) => a - b);
      const totalRequests = intervalThroughput.reduce((sum, r) => sum + r.requestCount, 0);
      const totalDataBytes = intervalThroughput.reduce((sum, r) => sum + r.dataBytes, 0);
      const totalOperations = intervalLatency.length + intervalErrors.length;

      intervals.set(timestamp, {
        latency: {
          p50: this.calculatePercentile(latencies, 50),
          p95: this.calculatePercentile(latencies, 95),
          p99: this.calculatePercentile(latencies, 99)
        },
        throughput: {
          requestsPerSecond: totalRequests / (intervalMs / 1000),
          dataProcessedPerSecond: totalDataBytes / (intervalMs / 1000)
        },
        errorRate: totalOperations > 0 ? intervalErrors.length / totalOperations : 0,
        availability: totalOperations > 0 ? intervalLatency.length / totalOperations : 1.0
      });
    }

    return Array.from(intervals.values());
  }

  async validatePerformance(
    metrics: PerformanceMetrics, 
    thresholds: PerformanceThresholds
  ): Promise<{
    isValid: boolean;
    violations: string[];
    alerts: PerformanceAlert[];
  }> {
    const violations: string[] = [];
    const alerts: PerformanceAlert[] = [];

    // Validate latency
    if (metrics.latency.p50 > thresholds.latency.p50) {
      violations.push(`P50 latency ${metrics.latency.p50}ms exceeds threshold ${thresholds.latency.p50}ms`);
      alerts.push(this.createAlert('latency', 'warning', thresholds.latency.p50, metrics.latency.p50, 'P50 latency threshold exceeded'));
    }

    if (metrics.latency.p95 > thresholds.latency.p95) {
      violations.push(`P95 latency ${metrics.latency.p95}ms exceeds threshold ${thresholds.latency.p95}ms`);
      alerts.push(this.createAlert('latency', 'error', thresholds.latency.p95, metrics.latency.p95, 'P95 latency threshold exceeded'));
    }

    if (metrics.latency.p99 > thresholds.latency.p99) {
      violations.push(`P99 latency ${metrics.latency.p99}ms exceeds threshold ${thresholds.latency.p99}ms`);
      alerts.push(this.createAlert('latency', 'critical', thresholds.latency.p99, metrics.latency.p99, 'P99 latency threshold exceeded'));
    }

    // Validate throughput
    if (metrics.throughput.requestsPerSecond < thresholds.throughput.minRequestsPerSecond) {
      violations.push(`Requests per second ${metrics.throughput.requestsPerSecond} below threshold ${thresholds.throughput.minRequestsPerSecond}`);
      alerts.push(this.createAlert('throughput', 'warning', thresholds.throughput.minRequestsPerSecond, metrics.throughput.requestsPerSecond, 'Request throughput below threshold'));
    }

    if (metrics.throughput.dataProcessedPerSecond < thresholds.throughput.minDataProcessedPerSecond) {
      violations.push(`Data throughput ${metrics.throughput.dataProcessedPerSecond} bytes/s below threshold ${thresholds.throughput.minDataProcessedPerSecond} bytes/s`);
      alerts.push(this.createAlert('throughput', 'warning', thresholds.throughput.minDataProcessedPerSecond, metrics.throughput.dataProcessedPerSecond, 'Data throughput below threshold'));
    }

    // Validate error rate
    if (metrics.errorRate > thresholds.errorRate.maxErrorRate) {
      violations.push(`Error rate ${(metrics.errorRate * 100).toFixed(2)}% exceeds threshold ${(thresholds.errorRate.maxErrorRate * 100).toFixed(2)}%`);
      alerts.push(this.createAlert('error_rate', 'error', thresholds.errorRate.maxErrorRate, metrics.errorRate, 'Error rate threshold exceeded'));
    }

    // Validate availability
    if (metrics.availability < thresholds.availability.minAvailability) {
      violations.push(`Availability ${(metrics.availability * 100).toFixed(2)}% below threshold ${(thresholds.availability.minAvailability * 100).toFixed(2)}%`);
      alerts.push(this.createAlert('availability', 'critical', thresholds.availability.minAvailability, metrics.availability, 'Availability below threshold'));
    }

    return {
      isValid: violations.length === 0,
      violations,
      alerts
    };
  }

  async recordLatency(operation: string, latencyMs: number): Promise<void> {
    this.latencyRecords.push({
      operation,
      latencyMs,
      timestamp: new Date()
    });
  }

  async recordThroughput(
    operation: string, 
    requestCount: number, 
    dataBytes: number, 
    durationMs: number
  ): Promise<void> {
    this.throughputRecords.push({
      operation,
      requestCount,
      dataBytes,
      durationMs,
      timestamp: new Date()
    });
  }

  async recordError(operation: string, error: Error): Promise<void> {
    this.errorRecords.push({
      operation,
      error,
      timestamp: new Date()
    });
  }

  getMonitoringConfig(): PerformanceMonitoringConfig {
    return { ...this.config };
  }

  async updateMonitoringConfig(config: Partial<PerformanceMonitoringConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Restart monitoring if it was running
    if (this.monitoringInterval && this.config.enabled) {
      await this.stopMonitoring();
      await this.startMonitoring(this.config);
    }
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, Math.min(index, values.length - 1))];
  }

  private async generateAlerts(metrics: PerformanceMetrics): Promise<PerformanceAlert[]> {
    const validation = await this.validatePerformance(metrics, this.config.thresholds);
    return validation.alerts;
  }

  private createAlert(
    type: 'latency' | 'throughput' | 'error_rate' | 'availability',
    severity: 'warning' | 'error' | 'critical',
    threshold: number,
    currentValue: number,
    message: string
  ): PerformanceAlert {
    return {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      threshold,
      currentValue,
      message,
      timestamp: new Date()
    };
  }

  private async processAlerts(alerts: PerformanceAlert[]): Promise<void> {
    // Store alerts
    this.alerts.push(...alerts);
    
    // In a production system, this would send notifications
    // For now, we'll just log them
    for (const alert of alerts) {
      console.warn(`Performance Alert [${alert.severity.toUpperCase()}]: ${alert.message}`, {
        type: alert.type,
        threshold: alert.threshold,
        currentValue: alert.currentValue,
        timestamp: alert.timestamp
      });
    }
  }

  private async cleanupOldRecords(): Promise<void> {
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriodMs);
    
    this.latencyRecords = this.latencyRecords.filter(r => r.timestamp >= cutoffTime);
    this.throughputRecords = this.throughputRecords.filter(r => r.timestamp >= cutoffTime);
    this.errorRecords = this.errorRecords.filter(r => r.timestamp >= cutoffTime);
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoffTime);
  }
}