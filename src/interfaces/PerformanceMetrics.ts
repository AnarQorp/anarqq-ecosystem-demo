import { PerformanceMetrics } from '../types/index.js';

/**
 * Performance threshold configuration
 */
export interface PerformanceThresholds {
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    minRequestsPerSecond: number;
    minDataProcessedPerSecond: number;
  };
  errorRate: {
    maxErrorRate: number;
  };
  availability: {
    minAvailability: number;
  };
}

/**
 * Performance alert configuration
 */
export interface PerformanceAlert {
  id: string;
  type: 'latency' | 'throughput' | 'error_rate' | 'availability';
  severity: 'warning' | 'error' | 'critical';
  threshold: number;
  currentValue: number;
  message: string;
  timestamp: Date;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitoringConfig {
  enabled: boolean;
  intervalMs: number;
  retentionPeriodMs: number;
  thresholds: PerformanceThresholds;
  alerting: {
    enabled: boolean;
    webhookUrl?: string;
    emailRecipients?: string[];
  };
}

/**
 * Performance metrics collection result
 */
export interface PerformanceCollectionResult {
  metrics: PerformanceMetrics;
  alerts: PerformanceAlert[];
  timestamp: Date;
  collectionDuration: number;
}

/**
 * Core interface for performance metrics collection and monitoring
 */
export interface IPerformanceMetrics {
  /**
   * Collect current performance metrics
   * @returns Promise resolving to performance metrics
   */
  collectMetrics(): Promise<PerformanceMetrics>;

  /**
   * Collect metrics with alerting
   * @returns Promise resolving to collection result with alerts
   */
  collectMetricsWithAlerting(): Promise<PerformanceCollectionResult>;

  /**
   * Start real-time performance monitoring
   * @param config - Monitoring configuration
   * @returns Promise resolving when monitoring starts
   */
  startMonitoring(config: PerformanceMonitoringConfig): Promise<void>;

  /**
   * Stop performance monitoring
   * @returns Promise resolving when monitoring stops
   */
  stopMonitoring(): Promise<void>;

  /**
   * Get historical performance metrics
   * @param startTime - Start time for historical data
   * @param endTime - End time for historical data
   * @returns Promise resolving to historical metrics
   */
  getHistoricalMetrics(startTime: Date, endTime: Date): Promise<PerformanceMetrics[]>;

  /**
   * Validate performance against thresholds
   * @param metrics - Performance metrics to validate
   * @param thresholds - Thresholds to validate against
   * @returns Promise resolving to validation result
   */
  validatePerformance(
    metrics: PerformanceMetrics, 
    thresholds: PerformanceThresholds
  ): Promise<{
    isValid: boolean;
    violations: string[];
    alerts: PerformanceAlert[];
  }>;

  /**
   * Record latency measurement
   * @param operation - Operation name
   * @param latencyMs - Latency in milliseconds
   * @returns Promise resolving when recorded
   */
  recordLatency(operation: string, latencyMs: number): Promise<void>;

  /**
   * Record throughput measurement
   * @param operation - Operation name
   * @param requestCount - Number of requests
   * @param dataBytes - Amount of data processed in bytes
   * @param durationMs - Duration in milliseconds
   * @returns Promise resolving when recorded
   */
  recordThroughput(
    operation: string, 
    requestCount: number, 
    dataBytes: number, 
    durationMs: number
  ): Promise<void>;

  /**
   * Record error occurrence
   * @param operation - Operation name
   * @param error - Error details
   * @returns Promise resolving when recorded
   */
  recordError(operation: string, error: Error): Promise<void>;

  /**
   * Get current monitoring configuration
   * @returns Current monitoring configuration
   */
  getMonitoringConfig(): PerformanceMonitoringConfig;

  /**
   * Update monitoring configuration
   * @param config - New monitoring configuration
   * @returns Promise resolving when updated
   */
  updateMonitoringConfig(config: Partial<PerformanceMonitoringConfig>): Promise<void>;
}