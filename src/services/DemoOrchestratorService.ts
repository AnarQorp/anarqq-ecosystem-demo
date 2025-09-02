import { IDemoOrchestrator } from '../interfaces/DemoOrchestrator.js';
import { IScenarioEngine } from '../interfaces/ScenarioEngine.js';
import { IValidationManager } from '../interfaces/ValidationManager.js';
import { 
  Environment, 
  ScenarioType, 
  ScenarioResult, 
  ValidationResult, 
  DemoReport, 
  HealthStatus,
  ExecutionStatus,
  ModuleStatus
} from '../types/index.js';
import { BaseConfig } from '../config/index.js';
import { ScenarioEngine } from './ScenarioEngine.js';
import { PerformanceMetricsService } from './PerformanceMetricsService.js';
import { ModuleRegistry } from './ModuleRegistry.js';
import { ErrorHandlerService } from './ErrorHandlerService.js';

/**
 * Main Demo Orchestrator implementation
 * Coordinates scenario execution and validation processes
 */
export class DemoOrchestratorService implements IDemoOrchestrator {
  private config: BaseConfig;
  private scenarioEngine: IScenarioEngine;
  private performanceMetrics: PerformanceMetricsService;
  private moduleRegistry: ModuleRegistry;
  private errorHandler: ErrorHandlerService;
  private initialized: boolean = false;
  private currentEnvironment: Environment = 'local';
  private activeExecutions: Map<string, ScenarioResult> = new Map();

  constructor(
    config: BaseConfig,
    scenarioEngine: IScenarioEngine,
    performanceMetrics: PerformanceMetricsService,
    moduleRegistry: ModuleRegistry,
    errorHandler: ErrorHandlerService
  ) {
    this.config = config;
    this.scenarioEngine = scenarioEngine;
    this.performanceMetrics = performanceMetrics;
    this.moduleRegistry = moduleRegistry;
    this.errorHandler = errorHandler;
  }

  /**
   * Initialize the orchestrator with environment configuration
   */
  async initialize(environment: Environment): Promise<void> {
    try {
      console.log(`[DemoOrchestrator] Initializing for environment: ${environment}`);
      
      this.currentEnvironment = environment;
      this.config.setCurrentEnvironment(environment);
      
      // Load and validate configuration
      this.config.loadFromEnvironment(environment);
      const validation = this.config.validateConfig(environment);
      
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      // Initialize all modules
      await this.moduleRegistry.initializeModules(environment);
      
      // Verify module health
      const healthStatus = await this.getHealthStatus();
      if (healthStatus.overall === 'unhealthy') {
        throw new Error('System health check failed - cannot initialize orchestrator');
      }

      // Initialize performance monitoring
      await this.performanceMetrics.initialize();

      this.initialized = true;
      console.log(`[DemoOrchestrator] ✓ Initialized successfully for ${environment} environment`);
      
    } catch (error) {
      console.error(`[DemoOrchestrator] ✗ Initialization failed:`, error);
      throw new Error(`Orchestrator initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a specific demo scenario in the given environment
   */
  async executeScenario(scenarioType: ScenarioType, environment: Environment): Promise<ScenarioResult> {
    if (!this.initialized) {
      throw new Error('Orchestrator not initialized. Call initialize() first.');
    }

    if (environment !== this.currentEnvironment) {
      throw new Error(`Environment mismatch. Expected ${this.currentEnvironment}, got ${environment}`);
    }

    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    try {
      console.log(`[DemoOrchestrator] Executing ${scenarioType} scenario (ID: ${executionId})`);

      // Start performance monitoring for this execution
      await this.performanceMetrics.startExecution(executionId);

      let result: ScenarioResult;

      // Execute scenario based on type
      switch (scenarioType) {
        case 'identity':
          result = await this.scenarioEngine.executeIdentityFlow({
            userId: `demo-user-${executionId}`,
            squidRegistration: true,
            piWalletEnabled: true,
            qerberosValidation: true
          });
          break;

        case 'content':
          result = await this.scenarioEngine.executeContentFlow({
            userId: `demo-user-${executionId}`,
            contentType: 'text',
            contentSize: 1024,
            qInfinityProcessing: true,
            ipfsStorage: true,
            integrityValidation: true
          });
          break;

        case 'dao':
          result = await this.scenarioEngine.executeDaoFlow({
            userId: `demo-user-${executionId}`,
            proposalType: 'governance',
            qflowExecution: true,
            piNetworkIntegration: true,
            multiUserVoting: true
          });
          break;

        case 'social':
          result = await this.scenarioEngine.executeSocialFlow({
            userId: `demo-user-${executionId}`,
            communityId: `demo-community-${executionId}`,
            governanceHub: true,
            squidSubIdentities: true,
            qonsentPolicies: true,
            reputationSystem: true
          });
          break;

        default:
          throw new Error(`Unknown scenario type: ${scenarioType}`);
      }

      // Stop performance monitoring
      await this.performanceMetrics.stopExecution(executionId);

      // Update result with execution metadata
      result.scenarioId = executionId;
      result.duration = Date.now() - startTime;
      result.timestamp = new Date();

      // Store active execution
      this.activeExecutions.set(executionId, result);

      console.log(`[DemoOrchestrator] ✓ Scenario ${scenarioType} completed successfully (${result.duration}ms)`);
      return result;

    } catch (error) {
      console.error(`[DemoOrchestrator] ✗ Scenario ${scenarioType} failed:`, error);
      
      // Stop performance monitoring on error
      await this.performanceMetrics.stopExecution(executionId);

      // Create error result
      const errorResult: ScenarioResult = {
        scenarioId: executionId,
        status: 'failure' as ExecutionStatus,
        duration: Date.now() - startTime,
        auditCid: '',
        qerberosSignature: '',
        moduleResults: [],
        timestamp: new Date()
      };

      this.activeExecutions.set(executionId, errorResult);
      
      // Handle error through error handler
      await this.errorHandler.handleError(error instanceof Error ? error : new Error('Unknown error'), {
        context: 'scenario_execution',
        scenarioType,
        executionId,
        environment
      });

      throw error;
    }
  }

  /**
   * Validate the execution results of a completed scenario
   */
  async validateExecution(executionId: string): Promise<ValidationResult> {
    try {
      console.log(`[DemoOrchestrator] Validating execution: ${executionId}`);

      const execution = this.activeExecutions.get(executionId);
      if (!execution) {
        throw new Error(`Execution not found: ${executionId}`);
      }

      // Get performance metrics for this execution
      const performanceMetrics = await this.performanceMetrics.getExecutionMetrics(executionId);
      
      // Get decentralization metrics
      const decentralizationMetrics = await this.moduleRegistry.getDecentralizationMetrics();

      // Validate performance against thresholds
      const config = this.config.getCurrentConfig();
      const performanceGate = config.validation.performanceGate;
      const decentralizationGate = config.validation.decentralizationGate;

      const errors: string[] = [];
      const warnings: string[] = [];

      // Performance validation
      if (performanceMetrics.latency.p95 > performanceGate.maxLatency) {
        errors.push(`P95 latency (${performanceMetrics.latency.p95}ms) exceeds threshold (${performanceGate.maxLatency}ms)`);
      }

      if (performanceMetrics.throughput.requestsPerSecond < performanceGate.minThroughput) {
        errors.push(`Throughput (${performanceMetrics.throughput.requestsPerSecond} RPS) below threshold (${performanceGate.minThroughput} RPS)`);
      }

      if (performanceMetrics.errorRate > performanceGate.maxErrorRate) {
        errors.push(`Error rate (${performanceMetrics.errorRate}) exceeds threshold (${performanceGate.maxErrorRate})`);
      }

      // Decentralization validation
      if (decentralizationMetrics.nodeCount < decentralizationGate.minNodes) {
        errors.push(`Node count (${decentralizationMetrics.nodeCount}) below minimum (${decentralizationGate.minNodes})`);
      }

      if (decentralizationMetrics.singlePointsOfFailure.length > decentralizationGate.maxSinglePointFailures) {
        errors.push(`Too many single points of failure: ${decentralizationMetrics.singlePointsOfFailure.length}`);
      }

      if (decentralizationMetrics.geographicDistribution.length < decentralizationGate.minGeographicDistribution) {
        warnings.push(`Geographic distribution (${decentralizationMetrics.geographicDistribution.length}) below recommended (${decentralizationGate.minGeographicDistribution})`);
      }

      // Module status validation
      const failedModules = execution.moduleResults.filter(m => m.status === 'error');
      if (failedModules.length > 0) {
        errors.push(`Failed modules: ${failedModules.map(m => m.moduleId).join(', ')}`);
      }

      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        performanceMetrics,
        decentralizationMetrics
      };

      console.log(`[DemoOrchestrator] ✓ Validation completed: ${result.isValid ? 'PASSED' : 'FAILED'}`);
      return result;

    } catch (error) {
      console.error(`[DemoOrchestrator] ✗ Validation failed:`, error);
      throw new Error(`Execution validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate comprehensive report for demo execution
   */
  async generateReport(executionId: string): Promise<DemoReport> {
    try {
      console.log(`[DemoOrchestrator] Generating report for execution: ${executionId}`);

      const execution = this.activeExecutions.get(executionId);
      if (!execution) {
        throw new Error(`Execution not found: ${executionId}`);
      }

      // Validate execution
      const validationResults = await this.validateExecution(executionId);

      // Create comprehensive report
      const report: DemoReport = {
        executionId,
        environment: this.currentEnvironment,
        scenarios: [execution],
        overallStatus: execution.status,
        totalDuration: execution.duration,
        validationResults,
        generatedAt: new Date()
      };

      console.log(`[DemoOrchestrator] ✓ Report generated for execution: ${executionId}`);
      return report;

    } catch (error) {
      console.error(`[DemoOrchestrator] ✗ Report generation failed:`, error);
      throw new Error(`Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current health status of all system components
   */
  async getHealthStatus(): Promise<HealthStatus> {
    try {
      const moduleStatuses = await this.moduleRegistry.getAllModuleStatuses();
      const networkStatus = await this.moduleRegistry.getNetworkStatus();

      // Determine overall health
      const moduleHealthValues = Object.values(moduleStatuses);
      const hasUnhealthyModules = moduleHealthValues.includes('error' as ModuleStatus);
      const hasInactiveModules = moduleHealthValues.includes('inactive' as ModuleStatus);

      let overall: 'healthy' | 'degraded' | 'unhealthy';
      if (hasUnhealthyModules || networkStatus === 'disconnected') {
        overall = 'unhealthy';
      } else if (hasInactiveModules || networkStatus === 'degraded') {
        overall = 'degraded';
      } else {
        overall = 'healthy';
      }

      return {
        overall,
        modules: moduleStatuses,
        network: networkStatus,
        lastCheck: new Date()
      };

    } catch (error) {
      console.error(`[DemoOrchestrator] ✗ Health check failed:`, error);
      return {
        overall: 'unhealthy',
        modules: {},
        network: 'disconnected',
        lastCheck: new Date()
      };
    }
  }

  /**
   * Shutdown the orchestrator and cleanup resources
   */
  async shutdown(): Promise<void> {
    try {
      console.log('[DemoOrchestrator] Shutting down...');

      // Stop all active executions
      for (const [executionId] of this.activeExecutions) {
        await this.performanceMetrics.stopExecution(executionId);
      }
      this.activeExecutions.clear();

      // Shutdown performance monitoring
      await this.performanceMetrics.shutdown();

      // Shutdown module registry
      await this.moduleRegistry.shutdown();

      this.initialized = false;
      console.log('[DemoOrchestrator] ✓ Shutdown completed');

    } catch (error) {
      console.error('[DemoOrchestrator] ✗ Shutdown failed:', error);
      throw new Error(`Orchestrator shutdown failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current environment
   */
  getCurrentEnvironment(): Environment {
    return this.currentEnvironment;
  }

  /**
   * Check if orchestrator is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get active executions count
   */
  getActiveExecutionsCount(): number {
    return this.activeExecutions.size;
  }
}