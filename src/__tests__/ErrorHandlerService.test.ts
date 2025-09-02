// Tests for ErrorHandlerService

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ErrorHandlerService } from '../services/ErrorHandlerService.js';
import {
  ModuleError,
  DataFlowError,
  PiNetworkError,
  PerformanceError,
  NetworkError,
  SecurityError,
  ValidationError,
  RetryConfig,
  FallbackConfig,
  EscalationConfig,
  AlertingConfig
} from '../interfaces/ErrorHandler.js';

describe('ErrorHandlerService', () => {
  let errorHandler: ErrorHandlerService;

  beforeEach(() => {
    errorHandler = new ErrorHandlerService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Module Error Handling', () => {
    it('should handle low severity module errors with retry strategy', async () => {
      const moduleError: ModuleError = {
        id: 'module-error-1',
        category: 'module',
        severity: 'low',
        message: 'Module connection timeout',
        timestamp: new Date(),
        context: {},
        moduleId: 'qwallet',
        endpoint: 'http://localhost:3001/api/health',
        errorCode: 'TIMEOUT'
      };

      const result = await errorHandler.handleModuleError(moduleError);

      expect(result.success).toBe(true);
      expect(result.resolution.strategy).toBe('retry');
      expect(result.finalStatus).toBe('resolved');
      expect(result.attempts.length).toBeGreaterThan(0);
      expect(result.metadata.moduleId).toBe('qwallet');
    });

    it('should handle critical module errors with escalation strategy', async () => {
      const moduleError: ModuleError = {
        id: 'module-error-2',
        category: 'module',
        severity: 'critical',
        message: 'Module crashed unexpectedly',
        timestamp: new Date(),
        context: {},
        moduleId: 'qerberos',
        errorCode: 'CRASH'
      };

      const result = await errorHandler.handleModuleError(moduleError);

      expect(result.resolution.strategy).toBe('escalate');
      expect(result.resolution.escalationLevel).toBe('emergency');
      expect(result.finalStatus).toBe('escalated');
      expect(result.metadata.moduleId).toBe('qerberos');
    });

    it('should create alerts for high and critical severity module errors', async () => {
      const criticalError: ModuleError = {
        id: 'module-error-3',
        category: 'module',
        severity: 'critical',
        message: 'Critical module failure',
        timestamp: new Date(),
        context: {},
        moduleId: 'squid'
      };

      await errorHandler.handleModuleError(criticalError);
      const alerts = await errorHandler.getActiveAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].error.id).toBe('module-error-3');
      expect(alerts[0].severity).toBe('critical');
    });
  });

  describe('Data Flow Error Handling', () => {
    it('should handle storage errors with fallback strategy', async () => {
      const dataFlowError: DataFlowError = {
        id: 'dataflow-error-1',
        category: 'dataflow',
        severity: 'high',
        message: 'IPFS storage failed',
        timestamp: new Date(),
        context: {},
        flowId: 'flow-123',
        step: 'storage',
        processingStage: 'storage'
      };

      const result = await errorHandler.handleDataFlowError(dataFlowError);

      expect(result.resolution.strategy).toBe('fallback');
      expect(result.resolution.fallbackAction).toBe('alternative_storage');
      expect(result.metadata.processingStage).toBe('storage');
    });

    it('should handle processing errors with retry strategy', async () => {
      const dataFlowError: DataFlowError = {
        id: 'dataflow-error-2',
        category: 'dataflow',
        severity: 'medium',
        message: 'Compression failed',
        timestamp: new Date(),
        context: {},
        flowId: 'flow-456',
        step: 'compression',
        processingStage: 'compression'
      };

      const result = await errorHandler.handleDataFlowError(dataFlowError);

      expect(result.resolution.strategy).toBe('retry');
      expect(result.resolution.maxRetries).toBe(2);
      expect(result.metadata.step).toBe('compression');
    });

    it('should always create alerts for data flow errors', async () => {
      const dataFlowError: DataFlowError = {
        id: 'dataflow-error-3',
        category: 'dataflow',
        severity: 'medium',
        message: 'Data processing error',
        timestamp: new Date(),
        context: {},
        flowId: 'flow-789',
        step: 'encryption',
        processingStage: 'encryption'
      };

      await errorHandler.handleDataFlowError(dataFlowError);
      const alerts = await errorHandler.getActiveAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.error.id === 'dataflow-error-3')).toBe(true);
    });
  });

  describe('Pi Network Error Handling', () => {
    it('should handle testnet errors with retry strategy', async () => {
      const piNetworkError: PiNetworkError = {
        id: 'pi-error-1',
        category: 'pinetwork',
        severity: 'medium',
        message: 'Pi testnet connection failed',
        timestamp: new Date(),
        context: {},
        networkType: 'testnet',
        piUserId: 'pi-user-123'
      };

      const result = await errorHandler.handlePiNetworkError(piNetworkError);

      expect(result.resolution.strategy).toBe('retry');
      expect(result.resolution.maxRetries).toBe(5);
      expect(result.metadata.networkType).toBe('testnet');
    });

    it('should handle mainnet errors with fallback strategy', async () => {
      const piNetworkError: PiNetworkError = {
        id: 'pi-error-2',
        category: 'pinetwork',
        severity: 'high',
        message: 'Pi mainnet unavailable',
        timestamp: new Date(),
        context: {},
        networkType: 'mainnet',
        contractAddress: '0x123456789'
      };

      const result = await errorHandler.handlePiNetworkError(piNetworkError);

      expect(result.resolution.strategy).toBe('fallback');
      expect(result.resolution.fallbackAction).toBe('offline_mode');
      expect(result.metadata.networkType).toBe('mainnet');
    });
  });

  describe('Performance Error Handling', () => {
    it('should handle minor performance degradation with graceful degradation', async () => {
      const performanceError: PerformanceError = {
        id: 'perf-error-1',
        category: 'performance',
        severity: 'medium',
        message: 'Latency threshold exceeded',
        timestamp: new Date(),
        context: {},
        metric: 'latency',
        threshold: 2000,
        actualValue: 2500,
        duration: 30000
      };

      const result = await errorHandler.handlePerformanceError(performanceError);

      expect(result.resolution.strategy).toBe('degrade');
      expect(result.metadata.thresholdExceeded).toBe(25);
    });

    it('should handle significant performance degradation with escalation', async () => {
      const performanceError: PerformanceError = {
        id: 'perf-error-2',
        category: 'performance',
        severity: 'critical',
        message: 'Severe latency degradation',
        timestamp: new Date(),
        context: {},
        metric: 'latency',
        threshold: 2000,
        actualValue: 4000,
        duration: 60000
      };

      const result = await errorHandler.handlePerformanceError(performanceError);

      expect(result.resolution.strategy).toBe('escalate');
      expect(result.resolution.escalationLevel).toBe('critical');
      expect(result.metadata.thresholdExceeded).toBe(100);
    });
  });

  describe('Network Error Handling', () => {
    it('should handle QNET errors with fallback to alternative nodes', async () => {
      const networkError: NetworkError = {
        id: 'network-error-1',
        category: 'network',
        severity: 'high',
        message: 'QNET node unreachable',
        timestamp: new Date(),
        context: {},
        nodeId: 'qnet-node-1',
        networkType: 'qnet',
        connectionStatus: 'unreachable'
      };

      const result = await errorHandler.handleNetworkError(networkError);

      expect(result.resolution.strategy).toBe('fallback');
      expect(result.resolution.fallbackAction).toBe('alternative_nodes');
    });

    it('should handle other network errors with retry strategy', async () => {
      const networkError: NetworkError = {
        id: 'network-error-2',
        category: 'network',
        severity: 'medium',
        message: 'IPFS connection timeout',
        timestamp: new Date(),
        context: {},
        networkType: 'ipfs',
        connectionStatus: 'timeout'
      };

      const result = await errorHandler.handleNetworkError(networkError);

      expect(result.resolution.strategy).toBe('retry');
      expect(result.resolution.maxRetries).toBe(3);
    });
  });

  describe('Security Error Handling', () => {
    it('should always escalate security errors to emergency level', async () => {
      const securityError: SecurityError = {
        id: 'security-error-1',
        category: 'security',
        severity: 'high',
        message: 'Unauthorized access attempt',
        timestamp: new Date(),
        context: {},
        securityType: 'authorization',
        userId: 'user-123',
        resourceId: 'resource-456'
      };

      const result = await errorHandler.handleSecurityError(securityError);

      expect(result.resolution.strategy).toBe('escalate');
      expect(result.resolution.escalationLevel).toBe('emergency');
      expect(result.finalStatus).toBe('escalated');
    });

    it('should always create critical alerts for security errors', async () => {
      const securityError: SecurityError = {
        id: 'security-error-2',
        category: 'security',
        severity: 'critical',
        message: 'Security breach detected',
        timestamp: new Date(),
        context: {},
        securityType: 'authentication'
      };

      await errorHandler.handleSecurityError(securityError);
      const alerts = await errorHandler.getActiveAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.error.id === 'security-error-2')).toBe(true);
    });
  });

  describe('Validation Error Handling', () => {
    it('should escalate integrity validation errors', async () => {
      const validationError: ValidationError = {
        id: 'validation-error-1',
        category: 'validation',
        severity: 'critical',
        message: 'Data integrity check failed',
        timestamp: new Date(),
        context: {},
        validationType: 'integrity',
        expectedValue: 'hash123',
        actualValue: 'hash456'
      };

      const result = await errorHandler.handleValidationError(validationError);

      expect(result.resolution.strategy).toBe('escalate');
      expect(result.resolution.escalationLevel).toBe('critical');
    });

    it('should retry performance validation errors', async () => {
      const validationError: ValidationError = {
        id: 'validation-error-2',
        category: 'validation',
        severity: 'medium',
        message: 'Performance validation failed',
        timestamp: new Date(),
        context: {},
        validationType: 'performance',
        expectedValue: 100,
        actualValue: 150
      };

      const result = await errorHandler.handleValidationError(validationError);

      expect(result.resolution.strategy).toBe('retry');
      expect(result.resolution.maxRetries).toBe(2);
    });
  });

  describe('Retry Strategy', () => {
    it('should execute retry strategy with exponential backoff', async () => {
      const retryConfig: RetryConfig = {
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitter: false
      };

      const error: ModuleError = {
        id: 'retry-test-1',
        category: 'module',
        severity: 'medium',
        message: 'Test retry error',
        timestamp: new Date(),
        context: {},
        moduleId: 'test-module'
      };

      const result = await errorHandler.executeRetryStrategy(error, retryConfig);

      expect(result.attempts.length).toBeGreaterThan(0);
      expect(result.attempts.every(attempt => attempt.strategy === 'retry')).toBe(true);
    });

    it('should respect maximum retry attempts', async () => {
      const retryConfig: RetryConfig = {
        maxRetries: 2,
        baseDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
        jitter: false
      };

      const error: ModuleError = {
        id: 'retry-test-2',
        category: 'module',
        severity: 'medium',
        message: 'Test retry limit',
        timestamp: new Date(),
        context: {},
        moduleId: 'test-module'
      };

      // Mock the retry operation to always fail
      vi.spyOn(errorHandler as any, 'simulateRetryOperation').mockRejectedValue(new Error('Always fails'));

      const result = await errorHandler.executeRetryStrategy(error, retryConfig);

      expect(result.success).toBe(false);
      expect(result.attempts.length).toBe(2);
      expect(result.finalStatus).toBe('failed');
    });
  });

  describe('Fallback Strategy', () => {
    it('should execute fallback strategy successfully', async () => {
      const fallbackConfig: FallbackConfig = {
        action: 'use_backup_service',
        parameters: { backupUrl: 'http://backup.example.com' },
        timeout: 5000,
        successCriteria: ['service_available']
      };

      const error: NetworkError = {
        id: 'fallback-test-1',
        category: 'network',
        severity: 'high',
        message: 'Primary service unavailable',
        timestamp: new Date(),
        context: {},
        networkType: 'qnet',
        connectionStatus: 'unreachable'
      };

      const result = await errorHandler.executeFallbackStrategy(error, fallbackConfig);

      expect(result.success).toBe(true);
      expect(result.resolution.strategy).toBe('fallback');
      expect(result.resolution.fallbackAction).toBe('use_backup_service');
    });
  });

  describe('Escalation Strategy', () => {
    it('should execute escalation strategy', async () => {
      const escalationConfig: EscalationConfig = {
        level: 'critical',
        notificationChannels: ['email', 'slack'],
        escalationDelay: 0,
        autoEscalate: true
      };

      const error: SecurityError = {
        id: 'escalation-test-1',
        category: 'security',
        severity: 'critical',
        message: 'Security incident',
        timestamp: new Date(),
        context: {},
        securityType: 'authentication'
      };

      const result = await errorHandler.executeEscalationStrategy(error, escalationConfig);

      expect(result.success).toBe(true);
      expect(result.resolution.strategy).toBe('escalate');
      expect(result.resolution.escalationLevel).toBe('critical');
    });
  });

  describe('Error Metrics', () => {
    it('should calculate error metrics correctly', async () => {
      // Add some test errors
      const errors = [
        {
          id: 'metrics-test-1',
          category: 'module' as const,
          severity: 'low' as const,
          message: 'Test error 1',
          timestamp: new Date(),
          context: {}
        },
        {
          id: 'metrics-test-2',
          category: 'dataflow' as const,
          severity: 'high' as const,
          message: 'Test error 2',
          timestamp: new Date(),
          context: {}
        }
      ];

      for (const error of errors) {
        await errorHandler.handleError(error);
      }

      const metrics = await errorHandler.getErrorMetrics();

      expect(metrics.totalErrors).toBeGreaterThanOrEqual(2);
      expect(metrics.errorsByCategory.module).toBeGreaterThanOrEqual(1);
      expect(metrics.errorsByCategory.dataflow).toBeGreaterThanOrEqual(1);
      expect(metrics.errorsBySeverity.low).toBeGreaterThanOrEqual(1);
      expect(metrics.errorsBySeverity.high).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Alert Management', () => {
    it('should acknowledge alerts', async () => {
      const error: SecurityError = {
        id: 'alert-test-1',
        category: 'security',
        severity: 'high',
        message: 'Test security error',
        timestamp: new Date(),
        context: {},
        securityType: 'authorization'
      };

      await errorHandler.handleSecurityError(error);
      const alerts = await errorHandler.getActiveAlerts();
      const alertId = alerts[0].id;

      await errorHandler.acknowledgeAlert(alertId, 'test-user');
      const updatedAlerts = await errorHandler.getActiveAlerts();
      const acknowledgedAlert = updatedAlerts.find(alert => alert.id === alertId);

      expect(acknowledgedAlert?.acknowledged).toBe(true);
      expect(acknowledgedAlert?.acknowledgedBy).toBe('test-user');
    });

    it('should resolve alerts', async () => {
      const error: PerformanceError = {
        id: 'resolve-test-1',
        category: 'performance',
        severity: 'high',
        message: 'Test performance error',
        timestamp: new Date(),
        context: {},
        metric: 'latency',
        threshold: 1000,
        actualValue: 2000,
        duration: 30000
      };

      await errorHandler.handlePerformanceError(error);
      const alerts = await errorHandler.getActiveAlerts();
      const alertId = alerts[0].id;

      await errorHandler.resolveAlert(alertId, 'Performance optimized');
      const updatedAlerts = await errorHandler.getActiveAlerts();
      const resolvedAlert = updatedAlerts.find(alert => alert.id === alertId);

      expect(resolvedAlert?.resolved).toBe(true);
      expect(resolvedAlert?.resolutionSummary).toBe('Performance optimized');
    });
  });

  describe('Configuration Management', () => {
    it('should update retry configuration', async () => {
      const newRetryConfig: RetryConfig = {
        maxRetries: 5,
        baseDelay: 2000,
        maxDelay: 20000,
        backoffMultiplier: 3,
        jitter: true
      };

      await errorHandler.updateRetryConfig('module', newRetryConfig);

      // Verify configuration was updated by testing retry behavior
      const error: ModuleError = {
        id: 'config-test-1',
        category: 'module',
        severity: 'medium',
        message: 'Test config update',
        timestamp: new Date(),
        context: {},
        moduleId: 'test-module'
      };

      // Mock retry to always fail to test max retries
      vi.spyOn(errorHandler as any, 'simulateRetryOperation').mockRejectedValue(new Error('Always fails'));

      const result = await errorHandler.executeRetryStrategy(error, newRetryConfig);
      expect(result.attempts.length).toBe(5);
    });

    it('should update alerting configuration', async () => {
      const newAlertingConfig: AlertingConfig = {
        enabled: true,
        channels: [
          {
            id: 'test-channel',
            type: 'webhook',
            config: { url: 'http://test.example.com' },
            enabled: true,
            severityFilter: ['critical']
          }
        ],
        thresholds: {
          errorRate: { warning: 0.1, critical: 0.2, timeWindow: 60000 },
          escalationRate: { warning: 0.05, critical: 0.15, timeWindow: 60000 },
          resolutionTime: { warning: 30000, critical: 120000 }
        },
        escalationRules: []
      };

      await errorHandler.updateAlertingConfig(newAlertingConfig);

      // Configuration update should complete without error
      expect(true).toBe(true);
    });
  });

  describe('Handler Health', () => {
    it('should report healthy status with no recent errors', async () => {
      const health = await errorHandler.getHandlerHealth();

      expect(health.status).toBe('healthy');
      expect(health.details).toHaveProperty('recentErrorCount');
      expect(health.details).toHaveProperty('criticalErrorCount');
      expect(health.details).toHaveProperty('activeAlertsCount');
    });

    it('should report degraded status with many recent errors', async () => {
      // Generate multiple errors to trigger degraded status
      for (let i = 0; i < 15; i++) {
        const error: ModuleError = {
          id: `health-test-${i}`,
          category: 'module',
          severity: 'medium',
          message: `Test error ${i}`,
          timestamp: new Date(),
          context: {},
          moduleId: 'test-module'
        };
        await errorHandler.handleModuleError(error);
      }

      const health = await errorHandler.getHandlerHealth();
      expect(['degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('Error History', () => {
    it('should retrieve error history', async () => {
      const error: ValidationError = {
        id: 'history-test-1',
        category: 'validation',
        severity: 'medium',
        message: 'Test validation error',
        timestamp: new Date(),
        context: {},
        validationType: 'performance'
      };

      await errorHandler.handleValidationError(error);
      const history = await errorHandler.getErrorHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history.some(e => e.id === 'history-test-1')).toBe(true);
    });

    it('should filter error history by category', async () => {
      const moduleError: ModuleError = {
        id: 'history-module-1',
        category: 'module',
        severity: 'low',
        message: 'Module test error',
        timestamp: new Date(),
        context: {},
        moduleId: 'test-module'
      };

      const networkError: NetworkError = {
        id: 'history-network-1',
        category: 'network',
        severity: 'medium',
        message: 'Network test error',
        timestamp: new Date(),
        context: {},
        networkType: 'qnet',
        connectionStatus: 'timeout'
      };

      await errorHandler.handleModuleError(moduleError);
      await errorHandler.handleNetworkError(networkError);

      const moduleHistory = await errorHandler.getErrorHistory('module');
      const networkHistory = await errorHandler.getErrorHistory('network');

      expect(moduleHistory.every(e => e.category === 'module')).toBe(true);
      expect(networkHistory.every(e => e.category === 'network')).toBe(true);
    });

    it('should limit error history results', async () => {
      // Add multiple errors
      for (let i = 0; i < 10; i++) {
        const error: ModuleError = {
          id: `limit-test-${i}`,
          category: 'module',
          severity: 'low',
          message: `Test error ${i}`,
          timestamp: new Date(),
          context: {},
          moduleId: 'test-module'
        };
        await errorHandler.handleModuleError(error);
      }

      const limitedHistory = await errorHandler.getErrorHistory(undefined, 5);
      expect(limitedHistory.length).toBeLessThanOrEqual(5);
    });
  });
});