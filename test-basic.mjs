// Basic test script to verify the implementation
import { DemoOrchestratorApp } from './dist/index.js';

async function runBasicTests() {
  console.log('🧪 Running basic tests for Demo Orchestrator...\n');
  
  try {
    // Test 1: Create orchestrator instance
    console.log('Test 1: Creating orchestrator instance...');
    const orchestrator = new DemoOrchestratorApp();
    console.log('✓ Orchestrator instance created successfully\n');
    
    // Test 2: Initialize with local environment
    console.log('Test 2: Initializing with local environment...');
    await orchestrator.initialize('local');
    console.log('✓ Initialized successfully\n');
    
    // Test 3: Check configuration
    console.log('Test 3: Checking configuration...');
    const config = orchestrator.getConfig();
    const currentConfig = config.getCurrentConfig();
    console.log(`✓ Environment: ${currentConfig.environment}`);
    console.log(`✓ Modules configured: ${currentConfig.modules.length}`);
    console.log(`✓ IPFS Gateway: ${currentConfig.network.ipfs.gateway}`);
    console.log(`✓ Performance gate max latency: ${currentConfig.validation.performanceGate.maxLatency}ms\n`);
    
    // Test 4: Validate configuration
    console.log('Test 4: Validating configuration...');
    const validation = config.validateConfig('local');
    if (validation.isValid) {
      console.log('✓ Configuration validation passed');
    } else {
      console.log('✗ Configuration validation failed:', validation.errors);
    }
    console.log();
    
    // Test 5: Test environment switching
    console.log('Test 5: Testing environment switching...');
    config.setCurrentEnvironment('staging');
    console.log(`✓ Switched to: ${config.getCurrentEnvironment()}`);
    
    config.setCurrentEnvironment('qnet-phase2');
    console.log(`✓ Switched to: ${config.getCurrentEnvironment()}`);
    
    config.setCurrentEnvironment('local');
    console.log(`✓ Switched back to: ${config.getCurrentEnvironment()}\n`);
    
    // Test 6: Shutdown
    console.log('Test 6: Shutting down orchestrator...');
    await orchestrator.shutdown();
    console.log('✓ Shutdown completed\n');
    
    console.log('🎉 All basic tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runBasicTests();