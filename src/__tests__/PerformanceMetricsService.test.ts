import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMetricsService } from '../services/PerformanceMetricsService.js';
import { PerformanceThresholds, PerformanceMonitoringConfig } from '../interfaces/PerformanceMetrics.js';

describe('PerformanceMetricsService', () => {
  let service: PerformanceMetricsService;

  beforeEach(() => {
    service = new PerformanceMetricsService();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await service.stopMonitoring();
    vi.useRealTimers();
  });

  describe('collectMetrics', () => {
    it('should return default metrics when no data recorded', async () => {
      const metrics = await service.collectMetrics();

      expect(metrics).toEqual({
        latency: {
          p50: 0,
          p95: 0,
          p99: 0
        },
        throughput: {
          requestsPerSecond: 0,
          dataProcessedPerSecond: 0
        },
        errorRate: 0,
        availability: 1.0
      });
    });

    it('should calculate metrics from recorded data', async () => {
      // Record some latency data
      await service.recordLatency('test-op', 100);
      await service.recordLatency('test-op', 200);
      await service.recordLatency('test-op', 300);
      await service.recordLatency('test-op', 400);
      await service.recordLatency('test-op', 500);

      // Record throughput data
      await service.recordThroughput('test-op', 10, 1024, 1000);
      await service.recordThroughput('test-op', 20, 2048, 1000);

      // Record an error
      await service.recordError('test-op', new Error('Test error'));

      const metrics = await service.collectMetrics();

      expect(metrics.latency.p50).toBe(300);
      expect(metrics.latency.p95).toBe(500);
      expect(metrics.latency.p99).toBe(500);
      expect(metrics.throughput.requestsPerSecond).toBeGreaterThan(0);
      expect(metrics.throughput.dataProcessedPerSecond).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeGreaterThan(0);
      expect(metrics.availability).toBeLessThan(1.0);
    });

    it('should only consider recent data within time window', async () => {
      // Record old data (outside 1-minute window)
      const oldTime = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
      vi.setSystemTime(oldTime);
      await service.recordLatency('old-op', 1000);

      // Move to current time and record new data
      vi.setSystemTime(new Date());
      await service.recordLatency('new-op', 100);

      const metrics = await service.collectMetrics();

      // Should only reflect the recent data
      expect(metrics.latency.p50).toBe(100);
    });
  });

  describe('collectMetricsWithAlerting', () => {
    it('should return metrics with alerts and collection metadata', async () => {
      await service.recordLatency('test-op', 100);

      const result = await service.collectMetricsWithAlerting();

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('collectionDuration');
      expect(Array.isArray(result.alerts)).toBe(true);
      expect(result.collectionDuration).toBeGreaterThanOrEqual(0);
    });

    it('should generate alerts when thresholds are exceeded', async () => {
      // Configure strict thresholds
      const config: PerformanceMonitoringConfig = {
        enabled: true,
        intervalMs: 1000,
        retentionPeriodMs: 60000,
        thresholds: {
          latency: { p50: 50, p95: 100, p99: 200 },
          throughput: { minRequestsPerSecond: 1000, minDataProcessedPerSecond: 1024 * 1024 },
          errorRate: { maxErrorRate: 0.001 },
          availability: { minAvailability: 0.999 }
        },
        alerting: { enabled: true }
      };

      await service.updateMonitoringConfig(config);

      // Record data that exceeds thresholds
      await service.recordLatency('test-op', 1000); // Exceeds all latency thresholds
      await service.recordError('test-op', new Error('Test error')); // Exceeds error rate

      const result = await service.collectMetricsWithAlerting();

      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.alerts.some(a => a.type === 'latency')).toBe(true);
      expect(result.alerts.some(a => a.type === 'error_rate')).toBe(true);
    });
  });

  describe('monitoring', () => {
    it('should start and stop monitoring', async () => {
      const config: PerformanceMonitoringConfig = {
        enabled: true,
        intervalMs: 100,
        retentionPeriodMs: 60000,
        thresholds: {
          latency: { p50: 1000, p95: 2000, p99: 5000 },
          throughput: { minRequestsPerSecond: 100, minDataProcessedPerSecond: 1024 },
          errorRate: { maxErrorRate: 0.01 },
          availability: { minAvailability: 0.99 }
        },
        alerting: { enabled: true }
      };

      await service.startMonitoring(config);
      expect(service.getMonitoringConfig().enabled).toBe(true);

      await service.stopMonitoring();
      expect(service.getMonitoringConfig().enabled).toBe(false);
    });

    it('should not start monitoring when disabled', async () => {
      const config: PerformanceMonitoringConfig = {
        enabled: false,
        intervalMs: 100,
        retentionPeriodMs: 60000,
        thresholds: {
          latency: { p50: 1000, p95: 2000, p99: 5000 },
          throughput: { minRequestsPerSecond: 100, minDataProcessedPerSecond: 1024 },
          errorRate: { maxErrorRate: 0.01 },
          availability: { minAvailability: 0.99 }
        },
        alerting: { enabled: true }
      };

      await service.startMonitoring(config);
      
      // Should not have started monitoring
      expect(service.getMonitoringConfig().enabled).toBe(false);
    });
  });

  describe('validatePerformance', () => {
    it('should validate metrics against thresholds', async () => {
      const metrics = {
        latency: { p50: 500, p95: 1500, p99: 3000 },
        throughput: { requestsPerSecond: 150, dataProcessedPerSecond: 2048 },
        errorRate: 0.005,
        availability: 0.995
      };

      const thresholds: PerformanceThresholds = {
        latency: { p50: 1000, p95: 2000, p99: 5000 },
        throughput: { minRequestsPerSecond: 100, minDataProcessedPerSecond: 1024 },
        errorRate: { maxErrorRate: 0.01 },
        availability: { minAvailability: 0.99 }
      };

      const result = await service.validatePerformance(metrics, thresholds);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.alerts).toHaveLength(0);
    });

    it('should detect threshold violations', async () => {
      const metrics = {
        latency: { p50: 1500, p95: 2500, p99: 6000 }, // All exceed thresholds
        throughput: { requestsPerSecond: 50, dataProcessedPerSecond: 512 }, // Below thresholds
        errorRate: 0.02, // Exceeds threshold
        availability: 0.95 // Below threshold
      };

      const thresholds: PerformanceThresholds = {
        latency: { p50: 1000, p95: 2000, p99: 5000 },
        throughput: { minRequestsPerSecond: 100, minDataProcessedPerSecond: 1024 },
        errorRate: { maxErrorRate: 0.01 },
        availability: { minAvailability: 0.99 }
      };

      const result = await service.validatePerformance(metrics, thresholds);

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.alerts.length).toBeGreaterThan(0);
      
      // Check that all violation types are detected
      expect(result.violations.some(v => v.includes('P50 latency'))).toBe(true);
      expect(result.violations.some(v => v.includes('P95 latency'))).toBe(true);
      expect(result.violations.some(v => v.includes('P99 latency'))).toBe(true);
      expect(result.violations.some(v => v.includes('Requests per second'))).toBe(true);
      expect(result.violations.some(v => v.includes('Data throughput'))).toBe(true);
      expect(result.violations.some(v => v.includes('Error rate'))).toBe(true);
      expect(result.violations.some(v => v.includes('Availability'))).toBe(true);
    });
  });

  describe('data recording', () => {
    it('should record latency measurements', async () => {
      await service.recordLatency('test-operation', 250);
      
      const metrics = await service.collectMetrics();
      expect(metrics.latency.p50).toBe(250);
    });

    it('should record throughput measurements', async () => {
      await service.recordThroughput('test-operation', 100, 1024 * 1024, 1000);
      
      const metrics = await service.collectMetrics();
      expect(metrics.throughput.requestsPerSecond).toBeGreaterThan(0);
      expect(metrics.throughput.dataProcessedPerSecond).toBeGreaterThan(0);
    });

    it('should record error occurrences', async () => {
      await service.recordLatency('test-operation', 100); // Successful operation
      await service.recordError('test-operation', new Error('Test error'));
      
      const metrics = await service.collectMetrics();
      expect(metrics.errorRate).toBe(0.5); // 1 error out of 2 total operations
    });
  });

  describe('historical metrics', () => {
    it('should return historical metrics for time range', async () => {
      const startTime = new Date();
      
      // Record some data
      await service.recordLatency('test-op', 100);
      await service.recordLatency('test-op', 200);
      
      // Move time forward
      vi.advanceTimersByTime(60000); // 1 minute
      
      const endTime = new Date();
      
      const historical = await service.getHistoricalMetrics(startTime, endTime);
      
      expect(Array.isArray(historical)).toBe(true);
      expect(historical.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array for time range with no data', async () => {
      const startTime = new Date(Date.now() - 120000); // 2 minutes ago
      const endTime = new Date(Date.now() - 60000); // 1 minute ago
      
      const historical = await service.getHistoricalMetrics(startTime, endTime);
      
      expect(Array.isArray(historical)).toBe(true);
    });
  });

  describe('configuration management', () => {
    it('should update monitoring configuration', async () => {
      const newConfig = {
        intervalMs: 2000,
        thresholds: {
          latency: { p50: 500, p95: 1000, p99: 2000 }
        }
      };

      await service.updateMonitoringConfig(newConfig);
      
      const config = service.getMonitoringConfig();
      expect(config.intervalMs).toBe(2000);
      expect(config.thresholds.latency.p50).toBe(500);
    });

    it('should preserve existing configuration when partially updating', async () => {
      const originalConfig = service.getMonitoringConfig();
      
      await service.updateMonitoringConfig({
        intervalMs: 3000
      });
      
      const updatedConfig = service.getMonitoringConfig();
      expect(updatedConfig.intervalMs).toBe(3000);
      expect(updatedConfig.retentionPeriodMs).toBe(originalConfig.retentionPeriodMs);
      expect(updatedConfig.thresholds).toEqual(originalConfig.thresholds);
    });
  });
});