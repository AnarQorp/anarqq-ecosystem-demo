// Tests for Dependency Management system
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DependencyManager } from '../services/DependencyManager.js';
import { CORE_MODULES } from '../interfaces/ModuleIntegration.js';
import { DependencyError, FailureStrategy } from '../interfaces/DependencyManagement.js';

describe('DependencyManager', () => {
  let dependencyManager: DependencyManager;

  beforeEach(() => {
    dependencyManager = new DependencyManager();
    // Clear environment variables
    vi.clearAllMocks();
  });

  describe('Dependency Resolution', () => {
    it('should resolve dependencies for a module', async () => {
      const resolution = await dependencyManager.resolveDependencies(CORE_MODULES.QWALLET);

      expect(resolution.moduleId).toBe(CORE_MODULES.QWALLET);
      expect(resolution.dependencies).toHaveLength(2); // SQUID and QERBEROS
      expect(resolution.dependencies.some(d => d.dependencyId === CORE_MODULES.SQUID)).toBe(true);
      expect(resolution.dependencies.some(d => d.dependencyId === CORE_MODULES.QERBEROS)).toBe(true);
      expect(resolution.canStart).toBe(false); // Dependencies not active
      expect(resolution.blockedBy).toContain(CORE_MODULES.SQUID);
      expect(resolution.blockedBy).toContain(CORE_MODULES.QERBEROS);
    });

    it('should handle module with no dependencies', async () => {
      const resolution = await dependencyManager.resolveDependencies(CORE_MODULES.SQUID);

      expect(resolution.moduleId).toBe(CORE_MODULES.SQUID);
      expect(resolution.dependencies).toHaveLength(0);
      expect(resolution.canStart).toBe(true);
      expect(resolution.blockedBy).toHaveLength(0);
    });

    it('should throw error for non-existent module', async () => {
      await expect(
        dependencyManager.resolveDependencies('non-existent-module')
      ).rejects.toThrow(DependencyError);
    });

    it('should identify modules that depend on a given module', async () => {
      const resolution = await dependencyManager.resolveDependencies(CORE_MODULES.SQUID);

      expect(resolution.requiredBy.length).toBeGreaterThan(0);
      expect(resolution.requiredBy).toContain(CORE_MODULES.QERBEROS);
      expect(resolution.requiredBy).toContain(CORE_MODULES.QONSENT);
    });
  });

  describe('Startup Sequence', () => {
    it('should generate startup sequence with phases', async () => {
      const sequence = await dependencyManager.getStartupSequence();

      expect(sequence.phases.length).toBeGreaterThan(0);
      expect(sequence.totalModules).toBe(14); // All core modules
      expect(sequence.estimatedTime).toBeGreaterThan(0);
      expect(sequence.criticalPath).toContain(CORE_MODULES.SQUID);
      expect(sequence.criticalPath).toContain(CORE_MODULES.QERBEROS);
    });

    it('should have correct phase ordering', async () => {
      const sequence = await dependencyManager.getStartupSequence();

      // First phase should contain modules with no dependencies
      const firstPhase = sequence.phases[0];
      expect(firstPhase.modules).toContain(CORE_MODULES.SQUID);
      expect(firstPhase.modules).toContain(CORE_MODULES.QLOCK);
      expect(firstPhase.dependencies).toHaveLength(0);

      // Second phase should depend on first phase
      const secondPhase = sequence.phases[1];
      expect(secondPhase.modules).toContain(CORE_MODULES.QERBEROS);
      expect(secondPhase.dependencies).toContain(CORE_MODULES.SQUID);
    });
  });

  describe('Module Startup', () => {
    it('should start modules successfully', async () => {
      const result = await dependencyManager.startModules([CORE_MODULES.SQUID, CORE_MODULES.QLOCK]);

      expect(result.success).toBe(true);
      expect(result.startedModules).toContain(CORE_MODULES.SQUID);
      expect(result.startedModules).toContain(CORE_MODULES.QLOCK);
      expect(result.failedModules).toHaveLength(0);
      expect(result.totalTime).toBeGreaterThan(0);

      // Check module statuses
      const statuses = dependencyManager.getModuleStatuses();
      expect(statuses.get(CORE_MODULES.SQUID)).toBe('active');
      expect(statuses.get(CORE_MODULES.QLOCK)).toBe('active');
    });

    it('should handle module startup failures', async () => {
      // Set module to fail startup
      process.env.SQUID_STARTUP_FAIL = 'true';

      const result = await dependencyManager.startModules([CORE_MODULES.SQUID]);

      expect(result.success).toBe(false);
      expect(result.startedModules).not.toContain(CORE_MODULES.SQUID);
      expect(result.failedModules).toHaveLength(1);
      expect(result.failedModules[0].moduleId).toBe(CORE_MODULES.SQUID);
      expect(result.failedModules[0].error).toContain('Startup failed');

      // Clean up
      delete process.env.SQUID_STARTUP_FAIL;
    });

    it('should start all modules when no specific modules provided', async () => {
      const result = await dependencyManager.startModules();

      expect(result.startedModules.length).toBe(14); // All core modules
      expect(result.success).toBe(true);
    });
  });

  describe('Module Shutdown', () => {
    it('should stop modules successfully', async () => {
      // First start some modules
      await dependencyManager.startModules([CORE_MODULES.SQUID, CORE_MODULES.QLOCK]);

      // Then stop them
      const result = await dependencyManager.stopModules([CORE_MODULES.SQUID, CORE_MODULES.QLOCK]);

      expect(result.success).toBe(true);
      expect(result.stoppedModules).toContain(CORE_MODULES.SQUID);
      expect(result.stoppedModules).toContain(CORE_MODULES.QLOCK);
      expect(result.failedToStop).toHaveLength(0);
      expect(result.gracefulShutdown).toBe(true);

      // Check module statuses
      const statuses = dependencyManager.getModuleStatuses();
      expect(statuses.get(CORE_MODULES.SQUID)).toBe('inactive');
      expect(statuses.get(CORE_MODULES.QLOCK)).toBe('inactive');
    });

    it('should stop all modules when no specific modules provided', async () => {
      // Start all modules first
      await dependencyManager.startModules();

      // Stop all modules
      const result = await dependencyManager.stopModules();

      expect(result.success).toBe(true);
      expect(result.stoppedModules.length).toBe(14);
      expect(result.gracefulShutdown).toBe(true);
    });
  });

  describe('Failure Handling', () => {
    it('should handle module failure with appropriate strategy', async () => {
      const error = new Error('Test module failure');
      const result = await dependencyManager.handleModuleFailure(CORE_MODULES.SQUID, error);

      expect(result.moduleId).toBe(CORE_MODULES.SQUID);
      expect(result.handlingStrategy).toBe(FailureStrategy.RESTART);
      expect(result.actionsPerformed).toContain('Attempted restart');
      expect(result.affectedModules.length).toBeGreaterThan(0);
      expect(result.recoveryPossible).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should identify affected modules when a dependency fails', async () => {
      const error = new Error('Test failure');
      const result = await dependencyManager.handleModuleFailure(CORE_MODULES.SQUID, error);

      // SQUID is a dependency for many modules
      expect(result.affectedModules).toContain(CORE_MODULES.QERBEROS);
      expect(result.affectedModules).toContain(CORE_MODULES.QONSENT);
      expect(result.affectedModules).toContain(CORE_MODULES.QWALLET);
    });
  });

  describe('Dependency Graph', () => {
    it('should generate dependency graph', async () => {
      const graph = await dependencyManager.getDependencyGraph();

      expect(graph.nodes.length).toBe(14); // All core modules
      expect(graph.criticalPath).toContain(CORE_MODULES.SQUID);
      expect(graph.criticalPath).toContain(CORE_MODULES.QERBEROS);

      // Check specific module properties
      const squidNode = graph.nodes.find(n => n.moduleId === CORE_MODULES.SQUID);
      expect(squidNode).toBeDefined();
      expect(squidNode!.dependencies).toHaveLength(0);
      expect(squidNode!.dependents.length).toBeGreaterThan(0);
      expect(squidNode!.critical).toBe(true);

      const qwalletNode = graph.nodes.find(n => n.moduleId === CORE_MODULES.QWALLET);
      expect(qwalletNode).toBeDefined();
      expect(qwalletNode!.dependencies).toContain(CORE_MODULES.SQUID);
      expect(qwalletNode!.dependencies).toContain(CORE_MODULES.QERBEROS);
      expect(qwalletNode!.level).toBeGreaterThan(0);
    });

    it('should calculate correct module levels', async () => {
      const graph = await dependencyManager.getDependencyGraph();

      // Level 0 modules (no dependencies)
      const level0Modules = graph.nodes.filter(n => n.level === 0);
      expect(level0Modules.some(n => n.moduleId === CORE_MODULES.SQUID)).toBe(true);
      expect(level0Modules.some(n => n.moduleId === CORE_MODULES.QLOCK)).toBe(true);

      // Level 1 modules (depend on level 0)
      const level1Modules = graph.nodes.filter(n => n.level === 1);
      expect(level1Modules.some(n => n.moduleId === CORE_MODULES.QERBEROS)).toBe(true);

      // Higher level modules
      const qwalletNode = graph.nodes.find(n => n.moduleId === CORE_MODULES.QWALLET);
      expect(qwalletNode!.level).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Dependency Validation', () => {
    it('should validate dependencies successfully', async () => {
      const configs = Array.from(dependencyManager['dependencies'].values());
      const result = await dependencyManager.validateDependencies(configs);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Dependency Updates', () => {
    it('should update module dependencies', async () => {
      const newDependencies = [CORE_MODULES.SQUID];
      
      await dependencyManager.updateModuleDependencies(CORE_MODULES.QLOCK, newDependencies);

      const resolution = await dependencyManager.resolveDependencies(CORE_MODULES.QLOCK);
      expect(resolution.dependencies).toHaveLength(1);
      expect(resolution.dependencies[0].dependencyId).toBe(CORE_MODULES.SQUID);
    });

    it('should throw error when updating non-existent module', async () => {
      await expect(
        dependencyManager.updateModuleDependencies('non-existent', [])
      ).rejects.toThrow(DependencyError);
    });
  });

  describe('Module Status Management', () => {
    it('should track module statuses correctly', () => {
      const statuses = dependencyManager.getModuleStatuses();

      expect(statuses.size).toBe(14);
      
      // All modules should start as inactive
      for (const status of statuses.values()) {
        expect(status).toBe('inactive');
      }
    });

    it('should update statuses during startup and shutdown', async () => {
      // Start modules
      await dependencyManager.startModules([CORE_MODULES.SQUID]);
      let statuses = dependencyManager.getModuleStatuses();
      expect(statuses.get(CORE_MODULES.SQUID)).toBe('active');

      // Stop modules
      await dependencyManager.stopModules([CORE_MODULES.SQUID]);
      statuses = dependencyManager.getModuleStatuses();
      expect(statuses.get(CORE_MODULES.SQUID)).toBe('inactive');
    });
  });

  describe('Complex Dependency Scenarios', () => {
    it('should handle complex dependency chains', async () => {
      // Test QSOCIAL which depends on SQUID -> QERBEROS -> QFLOW
      const resolution = await dependencyManager.resolveDependencies(CORE_MODULES.QSOCIAL);

      expect(resolution.dependencies.length).toBe(3);
      expect(resolution.dependencies.some(d => d.dependencyId === CORE_MODULES.SQUID)).toBe(true);
      expect(resolution.dependencies.some(d => d.dependencyId === CORE_MODULES.QERBEROS)).toBe(true);
      expect(resolution.dependencies.some(d => d.dependencyId === CORE_MODULES.QFLOW)).toBe(true);
      expect(resolution.canStart).toBe(false); // All dependencies inactive
    });

    it('should allow startup when dependencies are satisfied', async () => {
      // Start dependencies first
      await dependencyManager.startModules([
        CORE_MODULES.SQUID,
        CORE_MODULES.QERBEROS,
        CORE_MODULES.QWALLET,
        CORE_MODULES.QFLOW
      ]);

      // Now QSOCIAL should be able to start
      const resolution = await dependencyManager.resolveDependencies(CORE_MODULES.QSOCIAL);
      expect(resolution.canStart).toBe(true);
      expect(resolution.blockedBy).toHaveLength(0);
    });
  });
});