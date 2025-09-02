import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DemoOrchestratorService } from '../services/DemoOrchestratorService.js';
import { BaseConfig } from '../config/index.js';
import { PerformanceMetricsService } from '../services/PerformanceMetricsService.js';
import { ModuleRegistry } from '../services/ModuleRegistry.js';
import { ErrorHandlerService } from '../services/ErrorHandlerService.js';
import { ScenarioEngine } from '../services/ScenarioEngine.js';
import { Environment, ScenarioType, ExecutionStatus } from '../types/index.js';

// Mock dependencies
vi.mock('../services/PerformanceMetricsService.js');
vi.mock('../services/ModuleRegistry.js');
vi.mock('../services/ErrorHandlerService.js');
vi.mock('../services/ScenarioEngine.js');
vi.mock('../config/index.js');

describe('DemoOrchestratorService', () => {
  let orchestrator: DemoOrchestratorService;
  let mockConfig: BaseConfig;
  let mockScenarioEngine: ScenarioEngine;
  let mockPerformanceMetrics: PerformanceMetricsService;
  let mockModuleRegistry: ModuleRegistry;
  let mockErrorHandler: ErrorHandlerService;

  beforeEach(() => {
    // Setup mocks
    mockConfig = {
      setCurrentEnvironment: vi.fn(),
      loadFromEnvironment: vi.fn(),
      validateConfig: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
      getCurrentConfig: vi.fn().mockReturnValue({
        validation: {
          performanceGate: {
            maxLatency: 2000,
            minThroughput: 100,
            maxErrorRate: 0.01
          },
          decentralizationGate: {
            minNodes: 5,
            maxSinglePointFailures: 0,
            minGeographicDistribution: 3
          }
        }
      })
    } as any;

    mockScenarioEngine = {
      executeIdentityFlow: vi.fn(),
      executeContentFlow: vi.fn(),
      executeDaoFlow: vi.fn(),
      executeSocialFlow: vi.fn()
    } as any;

    mockPerformanceMetrics = {
      initialize: vi.fn(),
      startExecution: vi.fn(),
      stopExecution: vi.fn(),
      getExecutionMetrics: vi.fn().mockResolvedValue({
        latency: { p50: 100, p95: 200, p99: 300 },
        throughput: { requestsPerSecond: 150, dataProcessedPerSecond: 1000 },
        errorRate: 0.005,
        availability: 0.999
      }),
      shutdown: vi.fn()
    } as any;

    mockModuleRegistry = {
      initializeModules: vi.fn(),
      getAllModuleStatuses: vi.fn().mockResolvedValue({
        'squid': 'active',
        'qwallet': 'active',
        'qerberos': 'active'
      }),
      getNetworkStatus: vi.fn().mockResolvedValue('connected'),
      getDecentralizationMetrics: vi.fn().mockResolvedValue({
        nodeCount: 7,
        geographicDistribution: ['us-east', 'eu-west', 'asia-pacific'],
        consensusHealth: 0.95,
        networkPartitionTolerance: true,
        singlePointsOfFailure: []
      }),
      shutdown: vi.fn()
    } as any;

    mockErrorHandler = {
      handleError: vi.fn()
    } as any;

    orchestrator = new DemoOrchestratorService(
      mockConfig,
      mockScenarioEngine,
      mockPerformanceMetrics,
      mockModuleRegistry,
      mockErrorHandler
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully with valid configuration', async () => {
      await orchestrator.initialize('local');

      expect(mockConfig.setCurrentEnvironment).toHaveBeenCalledWith('local');
      expect(mockConfig.loadFromEnvironment).toHaveBeenCalledWith('local');
      expect(mockConfig.validateConfig).toHaveBeenCalledWith('local');
      expect(mockModuleRegistry.initializeModules).toHaveBeenCalledWith('local');
      expect(mockPerformanceMetrics.initialize).toHaveBeenCalled();
      expect(orchestrator.isInitialized()).toBe(true);
    });

    it('should throw error if configuration validation fails', async () => {
      mockConfig.validateConfig = vi.fn().mockReturnValue({
        isValid: false,
        errors: ['Invalid module configuration']
      });

      await expect(orchestrator.initialize('local')).rejects.toThrow(
        'Configuration validation failed: Invalid module configuration'
      );
    });

    it('should throw error if system health check fails', async () => {
      mockModuleRegistry.getAllModuleStatuses = vi.fn().mockResolvedValue({
        'squid': 'error',
        'qwallet': 'active'
      });
      mockModuleRegistry.getNetworkStatus = vi.fn().mockResolvedValue('disconnected');

      await expect(orchestrator.initialize('local')).rejects.toThrow(
        'System health check failed - cannot initialize orchestrator'
      );
    });
  });

  describe('executeScenario', () => {
    beforeEach(async () => {
      await orchestrator.initialize('local');
    });

    it('should execute identity scenario successfully', async () => {
      const mockResult = {
        scenarioId: 'test-id',
        status: 'success' as ExecutionStatus,
        duration: 1500,
        auditCid: 'test-audit-cid',
        qerberosSignature: 'test-signature',
        moduleResults: [],
        timestamp: new Date()
      };

      mockScenarioEngine.executeIdentityFlow = vi.fn().mockResolvedValue(mockResult);

      const result = await orchestrator.executeScenario('identity', 'local');

      expect(mockPerformanceMetrics.startExecution).toHaveBeenCalled();
      expect(mockScenarioEngine.executeIdentityFlow).toHaveBeenCalledWith({
        userId: expect.stringContaining('demo-user-'),
        squidRegistration: true,
        piWalletEnabled: true,
        qerberosValidation: true
      });
      expect(mockPerformanceMetrics.stopExecution).toHaveBeenCalled();
      expect(result.status).toBe('success');
    });

    it('should execute content scenario successfully', async () => {
      const mockResult = {
        scenarioId: 'test-id',
        status: 'success' as ExecutionStatus,
        duration: 2000,
        auditCid: 'test-audit-cid',
        qerberosSignature: 'test-signature',
        moduleResults: [],
        timestamp: new Date()
      };

      mockScenarioEngine.executeContentFlow = vi.fn().mockResolvedValue(mockResult);

      const result = await orchestrator.executeScenario('content', 'local');

      expect(mockScenarioEngine.executeContentFlow).toHaveBeenCalledWith({
        userId: expect.stringContaining('demo-user-'),
        contentType: 'text',
        contentSize: 1024,
        qInfinityProcessing: true,
        ipfsStorage: true,
        integrityValidation: true
      });
      expect(result.status).toBe('success');
    });

    it('should execute dao scenario successfully', async () => {
      const mockResult = {
        scenarioId: 'test-id',
        status: 'success' as ExecutionStatus,
        duration: 2500,
        auditCid: 'test-audit-cid',
        qerberosSignature: 'test-signature',
        moduleResults: [],
        timestamp: new Date()
      };

      mockScenarioEngine.executeDaoFlow = vi.fn().mockResolvedValue(mockResult);

      const result = await orchestrator.executeScenario('dao', 'local');

      expect(mockScenarioEngine.executeDaoFlow).toHaveBeenCalledWith({
        userId: expect.stringContaining('demo-user-'),
        proposalType: 'governance',
        qflowExecution: true,
        piNetworkIntegration: true,
        multiUserVoting: true
      });
      expect(result.status).toBe('success');
    });

    it('should execute social scenario successfully', async () => {
      const mockResult = {
        scenarioId: 'test-id',
        status: 'success' as ExecutionStatus,
        duration: 1800,
        auditCid: 'test-audit-cid',
        qerberosSignature: 'test-signature',
        moduleResults: [],
        timestamp: new Date()
      };

      mockScenarioEngine.executeSocialFlow = vi.fn().mockResolvedValue(mockResult);

      const result = await orchestrator.executeScenario('social', 'local');

      expect(mockScenarioEngine.executeSocialFlow).toHaveBeenCalledWith({
        userId: expect.stringContaining('demo-user-'),
        communityId: expect.stringContaining('demo-community-'),
        governanceHub: true,
        squidSubIdentities: true,
        qonsentPolicies: true,
        reputationSystem: true
      });
      expect(result.status).toBe('success');
    });

    it('should throw error for unknown scenario type', async () => {
      await expect(
        orchestrator.executeScenario('unknown' as ScenarioType, 'local')
      ).rejects.toThrow('Unknown scenario type: unknown');
    });

    it('should throw error if not initialized', async () => {
      const uninitializedOrchestrator = new DemoOrchestratorService(
        mockConfig,
        mockScenarioEngine,
        mockPerformanceMetrics,
        mockModuleRegistry,
        mockErrorHandler
      );

      await expect(
        uninitializedOrchestrator.executeScenario('identity', 'local')
      ).rejects.toThrow('Orchestrator not initialized. Call initialize() first.');
    });

    it('should throw error for environment mismatch', async () => {
      await expect(
        orchestrator.executeScenario('identity', 'staging')
      ).rejects.toThrow('Environment mismatch. Expected local, got staging');
    });

    it('should handle scenario execution errors', async () => {
      const error = new Error('Scenario execution failed');
      mockScenarioEngine.executeIdentityFlow = vi.fn().mockRejectedValue(error);

      await expect(
        orchestrator.executeScenario('identity', 'local')
      ).rejects.toThrow('Scenario execution failed');

      expect(mockPerformanceMetrics.stopExecution).toHaveBeenCalled();
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(error, {
        context: 'scenario_execution',
        scenarioType: 'identity',
        executionId: expect.any(String),
        environment: 'local'
      });
    });
  });

  describe('validateExecution', () => {
    let executionId: string;

    beforeEach(async () => {
      await orchestrator.initialize('local');
      
      // Execute a scenario first to have something to validate
      const mockResult = {
        scenarioId: 'test-id',
        status: 'success' as ExecutionStatus,
        duration: 1500,
        auditCid: 'test-audit-cid',
        qerberosSignature: 'test-signature',
        moduleResults: [
          { moduleId: 'squid', status: 'active' as any, duration: 500 },
          { moduleId: 'qwallet', status: 'active' as any, duration: 600 }
        ],
        timestamp: new Date()
      };

      mockScenarioEngine.executeIdentityFlow = vi.fn().mockResolvedValue(mockResult);
      const result = await orchestrator.executeScenario('identity', 'local');
      executionId = result.scenarioId;
    });

    it('should validate execution successfully when all thresholds are met', async () => {
      const validationResult = await orchestrator.validateExecution(executionId);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      expect(validationResult.performanceMetrics).toBeDefined();
      expect(validationResult.decentralizationMetrics).toBeDefined();
    });

    it('should fail validation when performance thresholds are exceeded', async () => {
      mockPerformanceMetrics.getExecutionMetrics = vi.fn().mockResolvedValue({
        latency: { p50: 1000, p95: 3000, p99: 5000 }, // Exceeds 2000ms threshold
        throughput: { requestsPerSecond: 50, dataProcessedPerSecond: 500 }, // Below 100 RPS threshold
        errorRate: 0.02, // Exceeds 0.01 threshold
        availability: 0.95
      });

      const validationResult = await orchestrator.validateExecution(executionId);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
      
      // Check that at least one performance error is present
      const hasLatencyError = validationResult.errors.some(error => 
        error.includes('P95 latency') && error.includes('exceeds threshold')
      );
      const hasThroughputError = validationResult.errors.some(error => 
        error.includes('Throughput') && error.includes('below threshold')
      );
      const hasErrorRateError = validationResult.errors.some(error => 
        error.includes('Error rate') && error.includes('exceeds threshold')
      );
      
      expect(hasLatencyError || hasThroughputError || hasErrorRateError).toBe(true);
    });

    it('should fail validation when decentralization thresholds are not met', async () => {
      mockModuleRegistry.getDecentralizationMetrics = vi.fn().mockResolvedValue({
        nodeCount: 3, // Below 5 minimum
        geographicDistribution: ['us-east'], // Below 3 minimum
        consensusHealth: 0.8,
        networkPartitionTolerance: false,
        singlePointsOfFailure: ['central-server', 'main-db'] // Above 0 maximum
      });

      const validationResult = await orchestrator.validateExecution(executionId);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
      
      // Check that at least one decentralization error is present
      const hasNodeCountError = validationResult.errors.some(error => 
        error.includes('Node count') && error.includes('below minimum')
      );
      const hasSinglePointError = validationResult.errors.some(error => 
        error.includes('single points of failure')
      );
      
      expect(hasNodeCountError || hasSinglePointError).toBe(true);
      
      // Check for geographic distribution warning
      const hasGeoWarning = validationResult.warnings.some(warning => 
        warning.includes('Geographic distribution') && warning.includes('below recommended')
      );
      expect(hasGeoWarning).toBe(true);
    });

    it('should fail validation when modules have errors', async () => {
      // Mock a scenario result with failed modules
      const mockResult = {
        scenarioId: 'test-id-2',
        status: 'partial' as ExecutionStatus,
        duration: 1500,
        auditCid: 'test-audit-cid',
        qerberosSignature: 'test-signature',
        moduleResults: [
          { moduleId: 'squid', status: 'active' as any, duration: 500 },
          { moduleId: 'qwallet', status: 'error' as any, duration: 600, error: 'Connection failed' }
        ],
        timestamp: new Date()
      };

      mockScenarioEngine.executeIdentityFlow = vi.fn().mockResolvedValue(mockResult);
      const result = await orchestrator.executeScenario('identity', 'local');
      
      const validationResult = await orchestrator.validateExecution(result.scenarioId);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Failed modules: qwallet');
    });

    it('should throw error for non-existent execution', async () => {
      await expect(
        orchestrator.validateExecution('non-existent-id')
      ).rejects.toThrow('Execution not found: non-existent-id');
    });
  });

  describe('generateReport', () => {
    let executionId: string;

    beforeEach(async () => {
      await orchestrator.initialize('local');
      
      const mockResult = {
        scenarioId: 'test-id',
        status: 'success' as ExecutionStatus,
        duration: 1500,
        auditCid: 'test-audit-cid',
        qerberosSignature: 'test-signature',
        moduleResults: [],
        timestamp: new Date()
      };

      mockScenarioEngine.executeIdentityFlow = vi.fn().mockResolvedValue(mockResult);
      const result = await orchestrator.executeScenario('identity', 'local');
      executionId = result.scenarioId;
    });

    it('should generate comprehensive report', async () => {
      const report = await orchestrator.generateReport(executionId);

      expect(report.executionId).toBe(executionId);
      expect(report.environment).toBe('local');
      expect(report.scenarios).toHaveLength(1);
      expect(report.overallStatus).toBe('success');
      expect(report.totalDuration).toBeGreaterThanOrEqual(0); // Allow 0 for mock scenarios
      expect(report.validationResults).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent execution', async () => {
      await expect(
        orchestrator.generateReport('non-existent-id')
      ).rejects.toThrow('Execution not found: non-existent-id');
    });
  });

  describe('getHealthStatus', () => {
    beforeEach(async () => {
      await orchestrator.initialize('local');
    });

    it('should return healthy status when all systems are operational', async () => {
      const health = await orchestrator.getHealthStatus();

      expect(health.overall).toBe('healthy');
      expect(health.modules).toEqual({
        'squid': 'active',
        'qwallet': 'active',
        'qerberos': 'active'
      });
      expect(health.network).toBe('connected');
      expect(health.lastCheck).toBeInstanceOf(Date);
    });

    it('should return degraded status when some modules are inactive', async () => {
      mockModuleRegistry.getAllModuleStatuses = vi.fn().mockResolvedValue({
        'squid': 'active',
        'qwallet': 'inactive',
        'qerberos': 'active'
      });

      const health = await orchestrator.getHealthStatus();

      expect(health.overall).toBe('degraded');
    });

    it('should return unhealthy status when modules have errors', async () => {
      mockModuleRegistry.getAllModuleStatuses = vi.fn().mockResolvedValue({
        'squid': 'error',
        'qwallet': 'active',
        'qerberos': 'active'
      });

      const health = await orchestrator.getHealthStatus();

      expect(health.overall).toBe('unhealthy');
    });

    it('should return unhealthy status when network is disconnected', async () => {
      mockModuleRegistry.getNetworkStatus = vi.fn().mockResolvedValue('disconnected');

      const health = await orchestrator.getHealthStatus();

      expect(health.overall).toBe('unhealthy');
    });

    it('should handle health check errors gracefully', async () => {
      mockModuleRegistry.getAllModuleStatuses = vi.fn().mockRejectedValue(new Error('Health check failed'));

      const health = await orchestrator.getHealthStatus();

      expect(health.overall).toBe('unhealthy');
      expect(health.network).toBe('disconnected');
    });
  });

  describe('shutdown', () => {
    beforeEach(async () => {
      await orchestrator.initialize('local');
    });

    it('should shutdown gracefully', async () => {
      // Execute a scenario to have active executions
      const mockResult = {
        scenarioId: 'test-id',
        status: 'success' as ExecutionStatus,
        duration: 1500,
        auditCid: 'test-audit-cid',
        qerberosSignature: 'test-signature',
        moduleResults: [],
        timestamp: new Date()
      };

      mockScenarioEngine.executeIdentityFlow = vi.fn().mockResolvedValue(mockResult);
      await orchestrator.executeScenario('identity', 'local');

      await orchestrator.shutdown();

      expect(mockPerformanceMetrics.shutdown).toHaveBeenCalled();
      expect(mockModuleRegistry.shutdown).toHaveBeenCalled();
      expect(orchestrator.isInitialized()).toBe(false);
    });

    it('should handle shutdown errors', async () => {
      mockPerformanceMetrics.shutdown = vi.fn().mockRejectedValue(new Error('Shutdown failed'));

      await expect(orchestrator.shutdown()).rejects.toThrow('Orchestrator shutdown failed: Shutdown failed');
    });
  });

  describe('utility methods', () => {
    it('should return current environment', async () => {
      await orchestrator.initialize('staging');
      expect(orchestrator.getCurrentEnvironment()).toBe('staging');
    });

    it('should return active executions count', async () => {
      await orchestrator.initialize('local');
      
      expect(orchestrator.getActiveExecutionsCount()).toBe(0);
      
      // Execute a scenario
      const mockResult = {
        scenarioId: 'test-id',
        status: 'success' as ExecutionStatus,
        duration: 1500,
        auditCid: 'test-audit-cid',
        qerberosSignature: 'test-signature',
        moduleResults: [],
        timestamp: new Date()
      };

      mockScenarioEngine.executeIdentityFlow = vi.fn().mockResolvedValue(mockResult);
      await orchestrator.executeScenario('identity', 'local');
      
      expect(orchestrator.getActiveExecutionsCount()).toBe(1);
    });
  });
});