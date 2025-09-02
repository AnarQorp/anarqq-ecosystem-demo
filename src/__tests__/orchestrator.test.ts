import { describe, it, expect, beforeEach } from 'vitest';
import { DemoOrchestratorApp } from '../index.js';

describe('DemoOrchestratorApp', () => {
  let orchestrator: DemoOrchestratorApp;

  beforeEach(() => {
    orchestrator = new DemoOrchestratorApp();
  });

  it('should initialize successfully', async () => {
    expect(orchestrator.isInitialized()).toBe(false);
    
    await orchestrator.initialize('local');
    
    expect(orchestrator.isInitialized()).toBe(true);
    
    await orchestrator.shutdown();
  });

  it('should provide access to configuration', async () => {
    await orchestrator.initialize('local');
    
    const config = orchestrator.getConfig();
    expect(config).toBeDefined();
    expect(config.getCurrentEnvironment()).toBe('local');
    
    await orchestrator.shutdown();
  });

  it('should handle different environments', async () => {
    await orchestrator.initialize('staging');
    
    const config = orchestrator.getConfig();
    expect(config.getCurrentEnvironment()).toBe('staging');
    
    await orchestrator.shutdown();
  });

  it('should shutdown gracefully', async () => {
    await orchestrator.initialize('local');
    expect(orchestrator.isInitialized()).toBe(true);
    
    await orchestrator.shutdown();
    expect(orchestrator.isInitialized()).toBe(false);
  });
});