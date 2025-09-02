// Unit tests for ModuleRegistry
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleRegistry } from '../services/ModuleRegistry.js';
import { 
  ModuleRegistration, 
  CORE_MODULES,
  ModuleStatus 
} from '../interfaces/ModuleIntegration.js';

describe('ModuleRegistry', () => {
  let moduleRegistry: ModuleRegistry;

  beforeEach(() => {
    moduleRegistry = new ModuleRegistry();
    // Clear environment variables
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await moduleRegistry.stopHealthMonitoring();
  });

  describe('Module Registration', () => {
    it('should register a new module successfully', async () => {
      const testModule: ModuleRegistration = {
        id: 'test-module',
        name: 'Test Module',
        version: '1.0.0',
        endpoint: 'http://localhost:3000',
        healthCheckEndpoint: '/health',
        dependencies: [],
        metadata: {
          description: 'Test module for unit testing',
          category: 'automation',
          capabilities: ['testing'],
          requiredEnvironment: ['local']
        }
      };

      const result = await moduleRegistry.registerModule(testModule);

      expect(result.success).toBe(true);
      expect(result.moduleId).toBe('test-module');
      expect(result.error).toBeUndefined();
    });

    it('should fail to register module with invalid configuration', async () => {
      const invalidModule: ModuleRegistration = {
        id: '', // Invalid empty ID
        name: 'Test Module',
        version: '1.0.0',
        endpoint: 'http://localhost:3000',
        healthCheckEndpoint: '/health',
        dependencies: [],
        metadata: {
          description: 'Test module',
          category: 'automation',
          capabilities: ['testing'],
          requiredEnvironment: ['local']
        }
      };

      const result = await moduleRegistry.registerModule(invalidModule);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Module ID is required');
    });

    it('should prevent duplicate module registration', async () => {
      const testModule: ModuleRegistration = {
        id: 'duplicate-test',
        name: 'Duplicate Test Module',
        version: '1.0.0',
        endpoint: 'http://localhost:3000',
        healthCheckEndpoint: '/health',
        dependencies: [],
        metadata: {
          description: 'Test module',
          category: 'automation',
          capabilities: ['testing'],
          requiredEnvironment: ['local']
        }
      };

      // Register first time
      const firstResult = await moduleRegistry.registerModule(testModule);
      expect(firstResult.success).toBe(true);

      // Attempt to register again
      const secondResult = await moduleRegistry.registerModule(testModule);
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('Module already registered');
    });
  });

  describe('Module Discovery', () => {
    it('should discover and register available modules', async () => {
      // Set environment variables to simulate healthy modules
      process.env.SQUID_HEALTHY = 'true';
      process.env.QLOCK_HEALTHY = 'true';

      const result = await moduleRegistry.discoverModules();

      expect(result.discovered.length).toBeGreaterThanOrEqual(0);
      expect(result.registered.length).toBeGreaterThanOrEqual(0);
      expect(result.failed.length).toBeGreaterThanOrEqual(0);
      
      // Should have some results (discovered + failed should equal total modules)
      expect(result.discovered.length + result.failed.length).toBe(14);
    });

    it('should handle discovery failures gracefully', async () => {
      // Set all modules to unhealthy
      Object.values(CORE_MODULES).forEach(moduleId => {
        process.env[`${moduleId.toUpperCase()}_HEALTHY`] = 'false';
      });

      const result = await moduleRegistry.discoverModules();

      expect(result.discovered.length).toBe(0);
      expect(result.registered.length).toBe(0);
      expect(result.failed.length).toBe(14); // All 14 modules should fail
    });
  });

  describe('Health Monitoring', () => {
    it('should get health status for a registered module', async () => {
      const modules = await moduleRegistry.getRegisteredModules();
      expect(modules.length).toBeGreaterThan(0);

      const firstModule = modules[0];
      const health = await moduleRegistry.getModuleHealth(firstModule.id);

      expect(health.moduleId).toBe(firstModule.id);
      expect(health.status).toMatch(/^(active|inactive|error)$/);
      expect(health.lastCheck).toBeInstanceOf(Date);
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
      expect(health.metrics).toBeDefined();
    });

    it('should get health status for all modules', async () => {
      const healthResults = await moduleRegistry.getAllModulesHealth();

      expect(Object.keys(healthResults).length).toBeGreaterThan(0);
      
      for (const [moduleId, health] of Object.entries(healthResults)) {
        expect(health.moduleId).toBe(moduleId);
        expect(health.status).toMatch(/^(active|inactive|error)$/);
        expect(health.metrics).toBeDefined();
      }
    });

    it('should start and stop health monitoring', async () => {
      // Start monitoring
      await moduleRegistry.startHealthMonitoring();

      // Wait a short time to allow monitoring to run
      await new Promise(resolve => setTimeout(resolve, 100));

      // Stop monitoring
      await moduleRegistry.stopHealthMonitoring();

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should handle health check errors gracefully', async () => {
      // Should throw error for non-existent module
      await expect(moduleRegistry.getModuleHealth('non-existent-module')).rejects.toThrow();
    });
  });

  describe('Module Recovery', () => {
    it('should attempt to recover a failed module', async () => {
      const modules = await moduleRegistry.getRegisteredModules();
      const firstModule = modules[0];

      const recoveryResult = await moduleRegistry.recoverModule(firstModule.id);

      expect(recoveryResult.moduleId).toBe(firstModule.id);
      expect(recoveryResult.success).toBeDefined();
      expect(recoveryResult.recoveryActions).toBeInstanceOf(Array);
      expect(recoveryResult.newStatus).toMatch(/^(active|inactive|error)$/);
    });

    it('should handle recovery of non-existent module', async () => {
      const recoveryResult = await moduleRegistry.recoverModule('non-existent-module');

      expect(recoveryResult.success).toBe(false);
      expect(recoveryResult.error).toContain('Module not found');
      expect(recoveryResult.newStatus).toBe('error');
    });
  });

  describe('Module Management', () => {
    it('should list all registered modules', async () => {
      const modules = await moduleRegistry.getRegisteredModules();

      expect(modules).toBeInstanceOf(Array);
      expect(modules.length).toBeGreaterThan(0);

      // Check that all core modules are registered by default
      const moduleIds = modules.map(m => m.id);
      Object.values(CORE_MODULES).forEach(coreModuleId => {
        expect(moduleIds).toContain(coreModuleId);
      });
    });

    it('should unregister a module', async () => {
      const testModule: ModuleRegistration = {
        id: 'temp-module',
        name: 'Temporary Module',
        version: '1.0.0',
        endpoint: 'http://localhost:3000',
        healthCheckEndpoint: '/health',
        dependencies: [],
        metadata: {
          description: 'Temporary test module',
          category: 'automation',
          capabilities: ['testing'],
          requiredEnvironment: ['local']
        }
      };

      // Register module
      await moduleRegistry.registerModule(testModule);

      // Verify it's registered
      let modules = await moduleRegistry.getRegisteredModules();
      expect(modules.some(m => m.id === 'temp-module')).toBe(true);

      // Unregister module
      await moduleRegistry.unregisterModule('temp-module');

      // Verify it's unregistered
      modules = await moduleRegistry.getRegisteredModules();
      expect(modules.some(m => m.id === 'temp-module')).toBe(false);
    });

    it('should handle unregistering non-existent module', async () => {
      await expect(moduleRegistry.unregisterModule('non-existent-module')).rejects.toThrow();
    });
  });

  describe('Core Module Initialization', () => {
    it('should initialize all 14 core modules by default', async () => {
      const modules = await moduleRegistry.getRegisteredModules();
      
      expect(modules.length).toBe(14);

      // Verify all core modules are present
      const expectedModules = Object.values(CORE_MODULES);
      const actualModuleIds = modules.map(m => m.id);

      expectedModules.forEach(expectedId => {
        expect(actualModuleIds).toContain(expectedId);
      });
    });

    it('should have correct module metadata for core modules', async () => {
      const modules = await moduleRegistry.getRegisteredModules();
      
      // Check sQuid module
      const squidModule = modules.find(m => m.id === CORE_MODULES.SQUID);
      expect(squidModule).toBeDefined();
      expect(squidModule!.name).toBe('sQuid Identity');
      expect(squidModule!.metadata.category).toBe('identity');
      expect(squidModule!.metadata.capabilities).toContain('identity-creation');

      // Check Qerberos module
      const qerberosModule = modules.find(m => m.id === CORE_MODULES.QERBEROS);
      expect(qerberosModule).toBeDefined();
      expect(qerberosModule!.name).toBe('Qerberos Security');
      expect(qerberosModule!.metadata.category).toBe('security');
      expect(qerberosModule!.metadata.capabilities).toContain('authentication');

      // Check Qsocial module
      const qsocialModule = modules.find(m => m.id === CORE_MODULES.QSOCIAL);
      expect(qsocialModule).toBeDefined();
      expect(qsocialModule!.name).toBe('Qsocial Community');
      expect(qsocialModule!.metadata.capabilities).toContain('social-networking');
      expect(qsocialModule!.metadata.capabilities).toContain('governance-hub');
    });
  });

  describe('Environment Configuration', () => {
    it('should respect environment variables for module endpoints', async () => {
      // Set custom endpoint for sQuid
      process.env.SQUID_ENDPOINT = 'http://custom-squid:3001';

      const newRegistry = new ModuleRegistry();
      const modules = await newRegistry.getRegisteredModules();
      
      const squidModule = modules.find(m => m.id === CORE_MODULES.SQUID);
      expect(squidModule!.endpoint).toBe('http://custom-squid:3001');

      // Clean up
      delete process.env.SQUID_ENDPOINT;
    });

    it('should use default endpoints when environment variables are not set', async () => {
      const modules = await moduleRegistry.getRegisteredModules();
      
      const squidModule = modules.find(m => m.id === CORE_MODULES.SQUID);
      expect(squidModule!.endpoint).toBe('http://localhost:3001');
    });
  });
});