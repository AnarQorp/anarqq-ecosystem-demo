import { 
  Environment, 
  ScenarioType, 
  ScenarioResult, 
  ValidationResult, 
  DemoReport, 
  HealthStatus 
} from '../types/index.js';

/**
 * Core interface for the Demo Orchestrator
 * Manages execution of demo scenarios and validation processes
 */
export interface IDemoOrchestrator {
  /**
   * Execute a specific demo scenario in the given environment
   * @param scenarioType - Type of scenario to execute
   * @param environment - Target environment for execution
   * @returns Promise resolving to scenario execution result
   */
  executeScenario(scenarioType: ScenarioType, environment: Environment): Promise<ScenarioResult>;

  /**
   * Validate the execution results of a completed scenario
   * @param executionId - Unique identifier for the execution
   * @returns Promise resolving to validation results
   */
  validateExecution(executionId: string): Promise<ValidationResult>;

  /**
   * Generate comprehensive report for demo execution
   * @param executionId - Unique identifier for the execution
   * @returns Promise resolving to demo report
   */
  generateReport(executionId: string): Promise<DemoReport>;

  /**
   * Get current health status of all system components
   * @returns Promise resolving to health status
   */
  getHealthStatus(): Promise<HealthStatus>;

  /**
   * Initialize the orchestrator with environment configuration
   * @param environment - Target environment to initialize
   * @returns Promise resolving when initialization is complete
   */
  initialize(environment: Environment): Promise<void>;

  /**
   * Shutdown the orchestrator and cleanup resources
   * @returns Promise resolving when shutdown is complete
   */
  shutdown(): Promise<void>;
}