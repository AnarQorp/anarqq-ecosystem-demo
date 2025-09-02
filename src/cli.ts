#!/usr/bin/env node

import { Command } from 'commander';
import { DemoOrchestratorService } from './services/DemoOrchestratorService.js';
import { ScenarioEngine } from './services/ScenarioEngine.js';
import { PerformanceMetricsService } from './services/PerformanceMetricsService.js';
import { ModuleRegistry } from './services/ModuleRegistry.js';
import { ErrorHandlerService } from './services/ErrorHandlerService.js';
import { BaseConfig } from './config/index.js';
import { Environment, ScenarioType } from './types/index.js';

/**
 * Command-line interface for the Demo Orchestrator
 * Provides commands for demo execution and validation
 */
class DemoOrchestratorCLI {
  private orchestrator: DemoOrchestratorService;
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
    this.initializeOrchestrator();
  }

  /**
   * Initialize the orchestrator with all dependencies
   */
  private initializeOrchestrator(): void {
    const config = new BaseConfig();
    const performanceMetrics = new PerformanceMetricsService();
    const moduleRegistry = new ModuleRegistry();
    const errorHandler = new ErrorHandlerService();
    
    // Create scenario engine with mock dependencies for CLI
    const scenarioEngine = new ScenarioEngine(
      {} as any, // Pi Network Integration - will be properly injected
      {} as any, // Q∞ Data Flow - will be properly injected
      moduleRegistry as any, // Module Integration
      {} as any  // Qerberos Auth - will be properly injected
    );

    this.orchestrator = new DemoOrchestratorService(
      config,
      scenarioEngine,
      performanceMetrics,
      moduleRegistry,
      errorHandler
    );
  }

  /**
   * Setup CLI commands
   */
  private setupCommands(): void {
    this.program
      .name('demo-orchestrator')
      .description('AnarQ&Q Ecosystem Demo Orchestrator CLI')
      .version('1.0.0');

    // Initialize command
    this.program
      .command('init')
      .description('Initialize the demo orchestrator')
      .option('-e, --environment <env>', 'Target environment (local, staging, qnet-phase2)', 'local')
      .action(async (options) => {
        await this.handleInitialize(options.environment as Environment);
      });

    // Execute scenario command
    this.program
      .command('execute')
      .description('Execute a demo scenario')
      .requiredOption('-s, --scenario <type>', 'Scenario type (identity, content, dao, social)')
      .option('-e, --environment <env>', 'Target environment (local, staging, qnet-phase2)', 'local')
      .option('--validate', 'Run validation after execution', false)
      .option('--report', 'Generate report after execution', false)
      .action(async (options) => {
        await this.handleExecuteScenario(
          options.scenario as ScenarioType,
          options.environment as Environment,
          options.validate,
          options.report
        );
      });

    // Validate command
    this.program
      .command('validate')
      .description('Validate a completed execution')
      .requiredOption('-i, --execution-id <id>', 'Execution ID to validate')
      .action(async (options) => {
        await this.handleValidateExecution(options.executionId);
      });

    // Report command
    this.program
      .command('report')
      .description('Generate report for an execution')
      .requiredOption('-i, --execution-id <id>', 'Execution ID for report')
      .option('-f, --format <format>', 'Report format (json, html)', 'json')
      .option('-o, --output <file>', 'Output file path')
      .action(async (options) => {
        await this.handleGenerateReport(options.executionId, options.format, options.output);
      });

    // Health check command
    this.program
      .command('health')
      .description('Check system health status')
      .option('-w, --watch', 'Watch mode - continuous health monitoring', false)
      .option('-i, --interval <seconds>', 'Watch interval in seconds', '30')
      .action(async (options) => {
        await this.handleHealthCheck(options.watch, parseInt(options.interval));
      });

    // Status command
    this.program
      .command('status')
      .description('Show orchestrator status')
      .action(async () => {
        await this.handleStatus();
      });

    // Shutdown command
    this.program
      .command('shutdown')
      .description('Shutdown the orchestrator')
      .action(async () => {
        await this.handleShutdown();
      });

    // Run all scenarios command
    this.program
      .command('run-all')
      .description('Execute all demo scenarios')
      .option('-e, --environment <env>', 'Target environment (local, staging, qnet-phase2)', 'local')
      .option('--validate', 'Run validation after each execution', false)
      .option('--continue-on-error', 'Continue execution even if a scenario fails', false)
      .action(async (options) => {
        await this.handleRunAllScenarios(
          options.environment as Environment,
          options.validate,
          options.continueOnError
        );
      });
  }

  /**
   * Handle initialize command
   */
  private async handleInitialize(environment: Environment): Promise<void> {
    try {
      console.log(`🚀 Initializing Demo Orchestrator for ${environment} environment...`);
      
      await this.orchestrator.initialize(environment);
      
      console.log('✅ Demo Orchestrator initialized successfully');
      console.log(`📊 Environment: ${environment}`);
      console.log('🔧 Ready to execute demo scenarios');
      
    } catch (error) {
      console.error('❌ Initialization failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * Handle execute scenario command
   */
  private async handleExecuteScenario(
    scenarioType: ScenarioType,
    environment: Environment,
    validate: boolean,
    generateReport: boolean
  ): Promise<void> {
    try {
      console.log(`🎬 Executing ${scenarioType} scenario in ${environment} environment...`);
      
      // Initialize if not already done
      if (!this.orchestrator.isInitialized()) {
        await this.orchestrator.initialize(environment);
      }

      // Execute scenario
      const result = await this.orchestrator.executeScenario(scenarioType, environment);
      
      console.log('✅ Scenario execution completed');
      console.log(`📊 Execution ID: ${result.scenarioId}`);
      console.log(`⏱️  Duration: ${result.duration}ms`);
      console.log(`📈 Status: ${result.status}`);
      console.log(`🔍 Module Results: ${result.moduleResults.length} modules processed`);

      // Run validation if requested
      if (validate) {
        console.log('\n🔍 Running validation...');
        const validationResult = await this.orchestrator.validateExecution(result.scenarioId);
        
        console.log(`✅ Validation: ${validationResult.isValid ? 'PASSED' : 'FAILED'}`);
        if (validationResult.errors.length > 0) {
          console.log('❌ Errors:');
          validationResult.errors.forEach(error => console.log(`   - ${error}`));
        }
        if (validationResult.warnings.length > 0) {
          console.log('⚠️  Warnings:');
          validationResult.warnings.forEach(warning => console.log(`   - ${warning}`));
        }
      }

      // Generate report if requested
      if (generateReport) {
        console.log('\n📋 Generating report...');
        const report = await this.orchestrator.generateReport(result.scenarioId);
        console.log(`📄 Report generated for execution: ${report.executionId}`);
        console.log(`📊 Overall Status: ${report.overallStatus}`);
        console.log(`⏱️  Total Duration: ${report.totalDuration}ms`);
      }

    } catch (error) {
      console.error('❌ Scenario execution failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * Handle validate execution command
   */
  private async handleValidateExecution(executionId: string): Promise<void> {
    try {
      console.log(`🔍 Validating execution: ${executionId}...`);
      
      const result = await this.orchestrator.validateExecution(executionId);
      
      console.log(`✅ Validation Result: ${result.isValid ? 'PASSED' : 'FAILED'}`);
      
      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach(error => console.log(`   - ${error}`));
      }
      
      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(warning => console.log(`   - ${warning}`));
      }

      // Display performance metrics
      console.log('\n📊 Performance Metrics:');
      console.log(`   Latency P95: ${result.performanceMetrics.latency.p95}ms`);
      console.log(`   Throughput: ${result.performanceMetrics.throughput.requestsPerSecond} RPS`);
      console.log(`   Error Rate: ${(result.performanceMetrics.errorRate * 100).toFixed(2)}%`);
      console.log(`   Availability: ${(result.performanceMetrics.availability * 100).toFixed(2)}%`);

      // Display decentralization metrics
      console.log('\n🌐 Decentralization Metrics:');
      console.log(`   Node Count: ${result.decentralizationMetrics.nodeCount}`);
      console.log(`   Geographic Distribution: ${result.decentralizationMetrics.geographicDistribution.length} regions`);
      console.log(`   Consensus Health: ${(result.decentralizationMetrics.consensusHealth * 100).toFixed(1)}%`);
      console.log(`   Network Partition Tolerance: ${result.decentralizationMetrics.networkPartitionTolerance ? 'Yes' : 'No'}`);

    } catch (error) {
      console.error('❌ Validation failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * Handle generate report command
   */
  private async handleGenerateReport(executionId: string, format: string, outputFile?: string): Promise<void> {
    try {
      console.log(`📋 Generating ${format} report for execution: ${executionId}...`);
      
      const report = await this.orchestrator.generateReport(executionId);
      
      let output: string;
      if (format === 'json') {
        output = JSON.stringify(report, null, 2);
      } else if (format === 'html') {
        output = this.generateHTMLReport(report);
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      if (outputFile) {
        const fs = await import('fs/promises');
        await fs.writeFile(outputFile, output);
        console.log(`✅ Report saved to: ${outputFile}`);
      } else {
        console.log(output);
      }

    } catch (error) {
      console.error('❌ Report generation failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * Handle health check command
   */
  private async handleHealthCheck(watch: boolean, interval: number): Promise<void> {
    try {
      if (watch) {
        console.log(`🔄 Starting health monitoring (interval: ${interval}s)...`);
        console.log('Press Ctrl+C to stop');
        
        const checkHealth = async () => {
          const health = await this.orchestrator.getHealthStatus();
          const timestamp = new Date().toISOString();
          
          console.log(`\n[${timestamp}] 🏥 Health Status: ${health.overall.toUpperCase()}`);
          console.log(`   Network: ${health.network}`);
          
          const moduleCount = Object.keys(health.modules).length;
          const healthyModules = Object.values(health.modules).filter(status => status === 'active').length;
          console.log(`   Modules: ${healthyModules}/${moduleCount} healthy`);
          
          if (health.overall !== 'healthy') {
            const unhealthyModules = Object.entries(health.modules)
              .filter(([_, status]) => status !== 'active')
              .map(([id, status]) => `${id}:${status}`);
            
            if (unhealthyModules.length > 0) {
              console.log(`   Issues: ${unhealthyModules.join(', ')}`);
            }
          }
        };

        // Initial check
        await checkHealth();
        
        // Set up interval
        const intervalId = setInterval(checkHealth, interval * 1000);
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
          clearInterval(intervalId);
          console.log('\n👋 Health monitoring stopped');
          process.exit(0);
        });
        
      } else {
        console.log('🏥 Checking system health...');
        
        const health = await this.orchestrator.getHealthStatus();
        
        console.log(`✅ Overall Health: ${health.overall.toUpperCase()}`);
        console.log(`🌐 Network Status: ${health.network}`);
        console.log(`📊 Last Check: ${health.lastCheck.toISOString()}`);
        
        console.log('\n📦 Module Status:');
        Object.entries(health.modules).forEach(([moduleId, status]) => {
          const icon = status === 'active' ? '✅' : status === 'inactive' ? '⚠️' : '❌';
          console.log(`   ${icon} ${moduleId}: ${status}`);
        });
      }

    } catch (error) {
      console.error('❌ Health check failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * Handle status command
   */
  private async handleStatus(): Promise<void> {
    try {
      console.log('📊 Demo Orchestrator Status');
      console.log('═══════════════════════════');
      
      console.log(`🔧 Initialized: ${this.orchestrator.isInitialized() ? 'Yes' : 'No'}`);
      console.log(`🌍 Environment: ${this.orchestrator.getCurrentEnvironment()}`);
      console.log(`🎬 Active Executions: ${this.orchestrator.getActiveExecutionsCount()}`);
      
      if (this.orchestrator.isInitialized()) {
        const health = await this.orchestrator.getHealthStatus();
        console.log(`🏥 Health: ${health.overall}`);
        console.log(`🌐 Network: ${health.network}`);
      }

    } catch (error) {
      console.error('❌ Status check failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * Handle shutdown command
   */
  private async handleShutdown(): Promise<void> {
    try {
      console.log('🛑 Shutting down Demo Orchestrator...');
      
      await this.orchestrator.shutdown();
      
      console.log('✅ Shutdown completed');
      process.exit(0);

    } catch (error) {
      console.error('❌ Shutdown failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * Handle run all scenarios command
   */
  private async handleRunAllScenarios(
    environment: Environment,
    validate: boolean,
    continueOnError: boolean
  ): Promise<void> {
    const scenarios: ScenarioType[] = ['identity', 'content', 'dao', 'social'];
    const results: Array<{ scenario: ScenarioType; success: boolean; executionId?: string; error?: string }> = [];

    try {
      console.log(`🎬 Running all demo scenarios in ${environment} environment...`);
      
      // Initialize if not already done
      if (!this.orchestrator.isInitialized()) {
        await this.orchestrator.initialize(environment);
      }

      for (const scenario of scenarios) {
        try {
          console.log(`\n🎯 Executing ${scenario} scenario...`);
          
          const result = await this.orchestrator.executeScenario(scenario, environment);
          
          console.log(`✅ ${scenario} scenario completed (${result.duration}ms)`);
          results.push({ scenario, success: true, executionId: result.scenarioId });

          // Run validation if requested
          if (validate) {
            const validationResult = await this.orchestrator.validateExecution(result.scenarioId);
            console.log(`🔍 Validation: ${validationResult.isValid ? 'PASSED' : 'FAILED'}`);
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ ${scenario} scenario failed: ${errorMessage}`);
          
          results.push({ scenario, success: false, error: errorMessage });
          
          if (!continueOnError) {
            throw error;
          }
        }
      }

      // Summary
      console.log('\n📊 Execution Summary');
      console.log('═══════════════════');
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`✅ Successful: ${successful}/${scenarios.length}`);
      console.log(`❌ Failed: ${failed}/${scenarios.length}`);
      
      results.forEach(result => {
        const icon = result.success ? '✅' : '❌';
        const details = result.success ? `(ID: ${result.executionId})` : `(Error: ${result.error})`;
        console.log(`   ${icon} ${result.scenario} ${details}`);
      });

    } catch (error) {
      console.error('❌ Batch execution failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Demo Execution Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .status-success { color: green; }
        .status-failure { color: red; }
        .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Demo Execution Report</h1>
        <p><strong>Execution ID:</strong> ${report.executionId}</p>
        <p><strong>Environment:</strong> ${report.environment}</p>
        <p><strong>Generated:</strong> ${report.generatedAt}</p>
        <p><strong>Status:</strong> <span class="status-${report.overallStatus}">${report.overallStatus}</span></p>
    </div>
    
    <div class="section">
        <h2>Performance Metrics</h2>
        <div class="metrics">
            <div class="metric-card">
                <h3>Latency</h3>
                <p>P95: ${report.validationResults.performanceMetrics.latency.p95}ms</p>
            </div>
            <div class="metric-card">
                <h3>Throughput</h3>
                <p>${report.validationResults.performanceMetrics.throughput.requestsPerSecond} RPS</p>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>Validation Results</h2>
        <p><strong>Valid:</strong> ${report.validationResults.isValid ? 'Yes' : 'No'}</p>
        ${report.validationResults.errors.length > 0 ? `
        <h3>Errors</h3>
        <ul>${report.validationResults.errors.map((error: string) => `<li>${error}</li>`).join('')}</ul>
        ` : ''}
    </div>
</body>
</html>`;
  }

  /**
   * Run the CLI
   */
  async run(): Promise<void> {
    await this.program.parseAsync(process.argv);
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new DemoOrchestratorCLI();
  cli.run().catch(error => {
    console.error('CLI Error:', error);
    process.exit(1);
  });
}

export { DemoOrchestratorCLI };