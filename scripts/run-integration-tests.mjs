#!/usr/bin/env node

/**
 * Integration Test Runner Script
 * 
 * Executes the comprehensive integration test suite for Task 13
 * Provides detailed reporting and handles test sequencing
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

class IntegrationTestRunner {
  constructor() {
    this.testResults = {
      task13_1: { name: 'End-to-End Integration', status: 'pending', duration: 0, errors: [] },
      task13_2: { name: 'Performance and Scalability', status: 'pending', duration: 0, errors: [] },
      task13_3: { name: 'Production Readiness', status: 'pending', duration: 0, errors: [] }
    };
    
    this.startTime = Date.now();
  }

  /**
   * Run a specific test suite
   */
  async runTestSuite(testFile, taskId) {
    console.log(`\n🧪 Running ${this.testResults[taskId].name} Tests`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const testProcess = spawn('npm', ['test', '--', '--run', testFile], {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      testProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        this.testResults[taskId].duration = duration;
        
        if (code === 0) {
          this.testResults[taskId].status = 'passed';
          console.log(`✅ ${this.testResults[taskId].name} tests completed successfully (${duration}ms)`);
        } else {
          this.testResults[taskId].status = 'failed';
          this.testResults[taskId].errors.push(`Test suite exited with code ${code}`);
          console.log(`❌ ${this.testResults[taskId].name} tests failed (${duration}ms)`);
        }
        
        resolve(code === 0);
      });
      
      testProcess.on('error', (error) => {
        const duration = Date.now() - startTime;
        this.testResults[taskId].duration = duration;
        this.testResults[taskId].status = 'error';
        this.testResults[taskId].errors.push(error.message);
        console.error(`💥 Error running ${this.testResults[taskId].name} tests:`, error.message);
        resolve(false);
      });
    });
  }

  /**
   * Run all integration tests in sequence
   */
  async runAllTests() {
    console.log('🚀 Starting Comprehensive Integration Test Suite');
    console.log('================================================');
    console.log(`Start Time: ${new Date().toISOString()}`);
    
    // Test suite configuration
    const testSuites = [
      { file: 'EndToEndIntegration.test.ts', taskId: 'task13_1' },
      { file: 'PerformanceAndScalability.test.ts', taskId: 'task13_2' },
      { file: 'ProductionReadiness.test.ts', taskId: 'task13_3' }
    ];
    
    // Verify test files exist
    for (const suite of testSuites) {
      const testPath = join(process.cwd(), 'src', '__tests__', suite.file);
      if (!existsSync(testPath)) {
        console.error(`❌ Test file not found: ${suite.file}`);
        this.testResults[suite.taskId].status = 'error';
        this.testResults[suite.taskId].errors.push(`Test file not found: ${suite.file}`);
        continue;
      }
    }
    
    // Run test suites sequentially
    let allPassed = true;
    
    for (const suite of testSuites) {
      if (this.testResults[suite.taskId].status === 'error') {
        allPassed = false;
        continue;
      }
      
      const passed = await this.runTestSuite(suite.file, suite.taskId);
      if (!passed) {
        allPassed = false;
        
        // Ask user if they want to continue with remaining tests
        const shouldContinue = await this.askContinue(suite.taskId);
        if (!shouldContinue) {
          console.log('🛑 Test execution stopped by user');
          break;
        }
      }
    }
    
    // Generate final report
    await this.generateReport(allPassed);
    
    return allPassed;
  }

  /**
   * Ask user if they want to continue after a test failure
   */
  async askContinue(failedTaskId) {
    // For automated environments, continue by default
    if (process.env.CI || process.env.AUTOMATED) {
      return true;
    }
    
    console.log(`\n⚠️  ${this.testResults[failedTaskId].name} tests failed.`);
    console.log('Continue with remaining tests? (y/N)');
    
    return new Promise((resolve) => {
      process.stdin.once('data', (data) => {
        const input = data.toString().trim().toLowerCase();
        resolve(input === 'y' || input === 'yes');
      });
    });
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport(allPassed) {
    const totalDuration = Date.now() - this.startTime;
    const endTime = new Date().toISOString();
    
    console.log('\n📊 Integration Test Suite Report');
    console.log('================================');
    
    // Summary statistics
    const passed = Object.values(this.testResults).filter(r => r.status === 'passed').length;
    const failed = Object.values(this.testResults).filter(r => r.status === 'failed').length;
    const errors = Object.values(this.testResults).filter(r => r.status === 'error').length;
    const total = Object.keys(this.testResults).length;
    
    console.log(`Overall Status: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    console.log(`End Time: ${endTime}`);
    console.log(`\nTest Results: ${passed}/${total} passed, ${failed} failed, ${errors} errors`);
    
    // Detailed results
    console.log('\nDetailed Results:');
    Object.entries(this.testResults).forEach(([taskId, result]) => {
      const statusIcon = result.status === 'passed' ? '✅' : 
                        result.status === 'failed' ? '❌' : '💥';
      
      console.log(`  ${statusIcon} ${taskId.toUpperCase()}: ${result.name}`);
      console.log(`     Status: ${result.status.toUpperCase()}`);
      console.log(`     Duration: ${result.duration}ms`);
      
      if (result.errors.length > 0) {
        console.log(`     Errors:`);
        result.errors.forEach(error => {
          console.log(`       - ${error}`);
        });
      }
    });
    
    // Generate JSON report
    const report = {
      timestamp: endTime,
      startTime: new Date(this.startTime).toISOString(),
      totalDuration,
      overallStatus: allPassed ? 'passed' : 'failed',
      summary: { total, passed, failed, errors },
      results: this.testResults,
      requirements: {
        task13_1: ['1.1', '2.1', '4.1'],
        task13_2: ['7.2', '7.3', '7.4', '7.6'],
        task13_3: ['6.4', '5.1', '6.6']
      }
    };
    
    const reportPath = join(process.cwd(), 'test-results', `integration-test-report-${Date.now()}.json`);
    
    try {
      // Ensure test-results directory exists
      const { mkdirSync } = await import('fs');
      mkdirSync(join(process.cwd(), 'test-results'), { recursive: true });
      
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.error('Failed to save report:', error.message);
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (allPassed) {
      console.log('  ✅ All integration tests passed successfully');
      console.log('  🎯 System is ready for production deployment');
      console.log('  📋 Consider running performance benchmarks');
    } else {
      console.log('  ❌ Some integration tests failed');
      console.log('  🔧 Review failed tests and fix issues before deployment');
      console.log('  📊 Check detailed error messages above');
      
      if (failed > 0) {
        console.log('  🧪 Re-run failed tests after fixes');
      }
      
      if (errors > 0) {
        console.log('  ⚙️  Check test environment configuration');
      }
    }
    
    console.log('\n🏁 Integration test suite completed');
  }

  /**
   * Run specific test by task ID
   */
  async runSpecificTest(taskId) {
    const testMapping = {
      '13.1': { file: 'EndToEndIntegration.test.ts', taskId: 'task13_1' },
      '13.2': { file: 'PerformanceAndScalability.test.ts', taskId: 'task13_2' },
      '13.3': { file: 'ProductionReadiness.test.ts', taskId: 'task13_3' }
    };
    
    const testConfig = testMapping[taskId];
    if (!testConfig) {
      console.error(`❌ Unknown task ID: ${taskId}`);
      console.log('Available tasks: 13.1, 13.2, 13.3');
      return false;
    }
    
    console.log(`🎯 Running specific test: Task ${taskId}`);
    const passed = await this.runTestSuite(testConfig.file, testConfig.taskId);
    
    await this.generateReport(passed);
    return passed;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new IntegrationTestRunner();
  
  if (args.length === 0) {
    // Run all tests
    const success = await runner.runAllTests();
    process.exit(success ? 0 : 1);
  } else if (args[0] === '--task' && args[1]) {
    // Run specific task
    const success = await runner.runSpecificTest(args[1]);
    process.exit(success ? 0 : 1);
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log('Integration Test Runner');
    console.log('Usage:');
    console.log('  npm run test:integration              # Run all integration tests');
    console.log('  npm run test:integration -- --task 13.1  # Run specific task');
    console.log('  npm run test:integration -- --help       # Show this help');
    console.log('');
    console.log('Available tasks:');
    console.log('  13.1 - End-to-End Integration Testing');
    console.log('  13.2 - Performance and Scalability Testing');
    console.log('  13.3 - Production Readiness Validation');
    process.exit(0);
  } else {
    console.error('❌ Invalid arguments. Use --help for usage information.');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Integration test runner failed:', error);
    process.exit(1);
  });
}

export { IntegrationTestRunner };