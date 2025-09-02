// Main entry point for AnarQ&Q Ecosystem Demo Orchestrator
import { BaseConfig } from './config/index.js';
import { Environment } from './types/index.js';
import { DemoOrchestratorService } from './services/DemoOrchestratorService.js';
import { ScenarioEngine } from './services/ScenarioEngine.js';
import { PerformanceMetricsService } from './services/PerformanceMetricsService.js';
import { ModuleRegistry } from './services/ModuleRegistry.js';
import { ErrorHandlerService } from './services/ErrorHandlerService.js';

/**
 * Main application class for the Demo Orchestrator
 */
export class DemoOrchestratorApp {
  private config: BaseConfig;
  private orchestrator: DemoOrchestratorService;
  private initialized: boolean = false;

  constructor() {
    this.config = new BaseConfig();
    this.initializeOrchestrator();
  }

  /**
   * Initialize the orchestrator with all dependencies
   */
  private initializeOrchestrator(): void {
    const performanceMetrics = new PerformanceMetricsService();
    const moduleRegistry = new ModuleRegistry();
    const errorHandler = new ErrorHandlerService();
    
    // Create scenario engine with mock dependencies for now
    const scenarioEngine = new ScenarioEngine(
      {} as any, // Pi Network Integration - will be properly injected
      {} as any, // Q∞ Data Flow - will be properly injected
      moduleRegistry as any, // Module Integration
      {} as any  // Qerberos Auth - will be properly injected
    );

    this.orchestrator = new DemoOrchestratorService(
      this.config,
      scenarioEngine,
      performanceMetrics,
      moduleRegistry,
      errorHandler
    );
  }

  /**
   * Initialize the demo orchestrator application
   * @param environment - Target environment to initialize
   */
  async initialize(environment: Environment = 'local'): Promise<void> {
    console.log(`Initializing AnarQ&Q Ecosystem Demo Orchestrator for ${environment} environment...`);
    
    try {
      // Initialize the orchestrator service
      await this.orchestrator.initialize(environment);
      
      this.initialized = true;
      console.log('✓ Demo Orchestrator initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Demo Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Get the orchestrator service
   */
  getOrchestrator(): DemoOrchestratorService {
    return this.orchestrator;
  }

  /**
   * Get current configuration
   */
  getConfig(): BaseConfig {
    return this.config;
  }

  /**
   * Check if orchestrator is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Demo Orchestrator...');
    
    if (this.orchestrator) {
      await this.orchestrator.shutdown();
    }
    
    this.initialized = false;
    console.log('✓ Demo Orchestrator shutdown complete');
  }
}

// Export all types and interfaces
export * from './types/index.js';
export * from './interfaces/index.js';
export * from './config/index.js';

// Default export
export default DemoOrchestratorApp;