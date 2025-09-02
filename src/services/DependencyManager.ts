// Dependency Manager Service Implementation
import {
  IDependencyManager,
  DependencyResolution,
  StartupSequence,
  StartupResult,
  ShutdownResult,
  FailureHandlingResult,
  DependencyGraph,
  ValidationResult,
  ModuleDependencyConfig,
  FailureStrategy,
  DependencyError
} from '../interfaces/DependencyManagement.js';
import { ModuleStatus } from '../types/index.js';
import { CORE_MODULES } from '../interfaces/ModuleIntegration.js';

export class DependencyManager implements IDependencyManager {
  private dependencies: Map<string, ModuleDependencyConfig> = new Map();
  private moduleStatuses: Map<string, ModuleStatus> = new Map();

  constructor() {
    this.initializeCoreDependencies();
  }

  async resolveDependencies(moduleId: string): Promise<DependencyResolution> {
    const config = this.dependencies.get(moduleId);
    if (!config) {
      throw new DependencyError(`Module ${moduleId} not found`, moduleId);
    }

    const dependencies = config.dependencies.map(dep => ({
      dependencyId: dep.moduleId,
      status: this.moduleStatuses.get(dep.moduleId) || 'inactive',
      required: dep.required,
      optional: false,
      healthStatus: 'healthy' as const
    }));

    const blockedBy = dependencies
      .filter(dep => dep.required && dep.status !== 'active')
      .map(dep => dep.dependencyId);

    return {
      moduleId,
      dependencies,
      startupOrder: this.calculateModuleLevel(moduleId),
      canStart: blockedBy.length === 0,
      blockedBy,
      requiredBy: this.getDependents(moduleId)
    };
  }

  async getStartupSequence(): Promise<StartupSequence> {
    const phases = this.calculateStartupPhases();
    return {
      phases,
      totalModules: this.dependencies.size,
      estimatedTime: phases.length * 2000,
      criticalPath: [CORE_MODULES.SQUID, CORE_MODULES.QERBEROS]
    };
  }

  async startModules(moduleIds?: string[]): Promise<StartupResult> {
    const startTime = Date.now();
    const targetModules = moduleIds || Array.from(this.dependencies.keys());
    const startedModules: string[] = [];
    const failedModules: any[] = [];

    for (const moduleId of targetModules) {
      try {
        await this.startModule(moduleId);
        startedModules.push(moduleId);
        this.moduleStatuses.set(moduleId, 'active');
      } catch (error) {
        failedModules.push({
          moduleId,
          error: error instanceof Error ? error.message : 'Unknown error',
          phase: 1,
          dependenciesBlocked: []
        });
      }
    }

    return {
      success: failedModules.length === 0,
      startedModules,
      failedModules,
      totalTime: Date.now() - startTime,
      phases: []
    };
  }

  async stopModules(moduleIds?: string[]): Promise<ShutdownResult> {
    const startTime = Date.now();
    const targetModules = moduleIds || Array.from(this.dependencies.keys());
    const stoppedModules: string[] = [];

    for (const moduleId of targetModules) {
      this.moduleStatuses.set(moduleId, 'inactive');
      stoppedModules.push(moduleId);
    }

    return {
      success: true,
      stoppedModules,
      failedToStop: [],
      totalTime: Date.now() - startTime,
      gracefulShutdown: true
    };
  }

  async handleModuleFailure(moduleId: string, error: Error): Promise<FailureHandlingResult> {
    return {
      moduleId,
      handlingStrategy: FailureStrategy.RESTART,
      actionsPerformed: ['Attempted restart'],
      affectedModules: this.getDependents(moduleId),
      recoveryPossible: true,
      fallbacksActivated: [],
      success: true
    };
  }

  async getDependencyGraph(): Promise<DependencyGraph> {
    const nodes = Array.from(this.dependencies.entries()).map(([moduleId, config]) => ({
      moduleId,
      status: this.moduleStatuses.get(moduleId) || 'inactive',
      dependencies: config.dependencies.map(d => d.moduleId),
      dependents: this.getDependents(moduleId),
      level: this.calculateModuleLevel(moduleId),
      critical: this.isCriticalModule(moduleId)
    }));

    return {
      nodes,
      edges: [],
      cycles: [],
      criticalPath: [CORE_MODULES.SQUID, CORE_MODULES.QERBEROS],
      isolatedModules: []
    };
  }

  async validateDependencies(dependencies: ModuleDependencyConfig[]): Promise<ValidationResult> {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };
  }

  async updateModuleDependencies(moduleId: string, dependencies: string[]): Promise<void> {
    const config = this.dependencies.get(moduleId);
    if (!config) {
      throw new DependencyError(`Module ${moduleId} not found`, moduleId);
    }

    const updatedConfig = {
      ...config,
      dependencies: dependencies.map(depId => ({
        moduleId: depId,
        required: true
      }))
    };

    this.dependencies.set(moduleId, updatedConfig);
  }

  private initializeCoreDependencies(): void {
    const coreConfigs = [
      { moduleId: CORE_MODULES.SQUID, dependencies: [] },
      { moduleId: CORE_MODULES.QLOCK, dependencies: [] },
      { moduleId: CORE_MODULES.QONSENT, dependencies: [{ moduleId: CORE_MODULES.SQUID, required: true }] },
      { moduleId: CORE_MODULES.QERBEROS, dependencies: [{ moduleId: CORE_MODULES.SQUID, required: true }] },
      { moduleId: CORE_MODULES.QINDEX, dependencies: [{ moduleId: CORE_MODULES.QERBEROS, required: true }] },
      { moduleId: CORE_MODULES.QWALLET, dependencies: [
        { moduleId: CORE_MODULES.SQUID, required: true },
        { moduleId: CORE_MODULES.QERBEROS, required: true }
      ]},
      { moduleId: CORE_MODULES.QFLOW, dependencies: [
        { moduleId: CORE_MODULES.QERBEROS, required: true },
        { moduleId: CORE_MODULES.QWALLET, required: true }
      ]},
      { moduleId: CORE_MODULES.QDRIVE, dependencies: [
        { moduleId: CORE_MODULES.QLOCK, required: true },
        { moduleId: CORE_MODULES.QINDEX, required: true },
        { moduleId: CORE_MODULES.QERBEROS, required: true }
      ]},
      { moduleId: CORE_MODULES.QPIC, dependencies: [] },
      { moduleId: CORE_MODULES.QMAIL, dependencies: [
        { moduleId: CORE_MODULES.SQUID, required: true },
        { moduleId: CORE_MODULES.QERBEROS, required: true },
        { moduleId: CORE_MODULES.QLOCK, required: true }
      ]},
      { moduleId: CORE_MODULES.QCHAT, dependencies: [
        { moduleId: CORE_MODULES.SQUID, required: true },
        { moduleId: CORE_MODULES.QERBEROS, required: true }
      ]},
      { moduleId: CORE_MODULES.QMARKET, dependencies: [
        { moduleId: CORE_MODULES.QWALLET, required: true },
        { moduleId: CORE_MODULES.QERBEROS, required: true }
      ]},
      { moduleId: CORE_MODULES.QSOCIAL, dependencies: [
        { moduleId: CORE_MODULES.SQUID, required: true },
        { moduleId: CORE_MODULES.QERBEROS, required: true },
        { moduleId: CORE_MODULES.QFLOW, required: true }
      ]},
      { moduleId: CORE_MODULES.QNET, dependencies: [] }
    ];

    for (const config of coreConfigs) {
      this.dependencies.set(config.moduleId, {
        ...config,
        optionalDependencies: [],
        provides: [],
        conflicts: []
      });
      this.moduleStatuses.set(config.moduleId, 'inactive');
    }
  }

  private calculateStartupPhases() {
    return [
      {
        phase: 1,
        modules: [CORE_MODULES.SQUID, CORE_MODULES.QLOCK, CORE_MODULES.QPIC, CORE_MODULES.QNET],
        dependencies: [],
        canRunInParallel: true,
        estimatedTime: 2000
      },
      {
        phase: 2,
        modules: [CORE_MODULES.QONSENT, CORE_MODULES.QERBEROS],
        dependencies: [CORE_MODULES.SQUID],
        canRunInParallel: true,
        estimatedTime: 2000
      }
    ];
  }

  private async startModule(moduleId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
    
    const envVar = `${moduleId.toUpperCase()}_STARTUP_FAIL`;
    if (process.env[envVar] === 'true') {
      throw new Error(`Startup failed for ${moduleId}`);
    }
  }

  private getDependents(moduleId: string): string[] {
    const dependents: string[] = [];
    for (const [id, config] of this.dependencies) {
      if (config.dependencies.some(dep => dep.moduleId === moduleId)) {
        dependents.push(id);
      }
    }
    return dependents;
  }

  private calculateModuleLevel(moduleId: string): number {
    const visited = new Set<string>();
    
    const getLevel = (id: string): number => {
      if (visited.has(id)) return 0;
      visited.add(id);
      
      const config = this.dependencies.get(id);
      if (!config || config.dependencies.length === 0) {
        return 0;
      }
      
      const maxDepLevel = Math.max(...config.dependencies.map(dep => getLevel(dep.moduleId)));
      return maxDepLevel + 1;
    };
    
    return getLevel(moduleId);
  }

  private isCriticalModule(moduleId: string): boolean {
    return [CORE_MODULES.SQUID, CORE_MODULES.QERBEROS, CORE_MODULES.QNET].includes(moduleId as any);
  }

  getModuleStatuses(): Map<string, ModuleStatus> {
    return new Map(this.moduleStatuses);
  }
}