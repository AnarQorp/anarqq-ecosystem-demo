import { describe, it, expect, beforeEach } from 'vitest';
import { BaseConfig } from '../config/BaseConfig.js';
import { Environment } from '../types/index.js';

describe('BaseConfig', () => {
  let config: BaseConfig;

  beforeEach(() => {
    config = new BaseConfig();
  });

  it('should initialize with default configurations', () => {
    expect(config.getCurrentEnvironment()).toBe('local');
    
    const localConfig = config.getCurrentConfig();
    expect(localConfig.environment).toBe('local');
    expect(localConfig.modules).toHaveLength(14);
    expect(localConfig.network.ipfs.gateway).toBe('http://localhost:8080');
  });

  it('should switch environments correctly', () => {
    config.setCurrentEnvironment('staging');
    expect(config.getCurrentEnvironment()).toBe('staging');
    
    const stagingConfig = config.getCurrentConfig();
    expect(stagingConfig.environment).toBe('staging');
    expect(stagingConfig.network.qnetPhase2.enabled).toBe(true);
  });

  it('should validate configuration correctly', () => {
    const validation = config.validateConfig('local');
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should include all required modules', () => {
    const localConfig = config.getCurrentConfig();
    const moduleIds = localConfig.modules.map(m => m.id);
    
    const requiredModules = [
      'squid', 'qlock', 'qonsent', 'qindex', 'qerberos',
      'qwallet', 'qflow', 'qnet', 'qdrive', 'qpic',
      'qmarket', 'qmail', 'qchat', 'qsocial'
    ];
    
    requiredModules.forEach(moduleId => {
      expect(moduleIds).toContain(moduleId);
    });
  });

  it('should handle environment variable overrides', () => {
    process.env.QNET_PHASE2_ENABLED = 'true';
    process.env.MAX_LATENCY = '1500';
    
    config.loadFromEnvironment('local');
    const localConfig = config.getCurrentConfig();
    
    expect(localConfig.network.qnetPhase2.enabled).toBe(true);
    expect(localConfig.validation.performanceGate.maxLatency).toBe(1500);
    
    // Cleanup
    delete process.env.QNET_PHASE2_ENABLED;
    delete process.env.MAX_LATENCY;
  });

  it('should throw error for invalid environment', () => {
    expect(() => {
      config.setCurrentEnvironment('invalid' as Environment);
    }).toThrow('Configuration not available for environment: invalid');
  });
});