// Module Registry Service Implementation
import { 
  IModuleIntegration,
  ModuleRegistration,
  ModuleRegistrationResult,
  ModuleDiscoveryResult,
  HealthCheckResult,
  ModuleInfo,
  ModuleRecoveryResult,
  CORE_MODULES,
  CoreModuleId,
  ModuleHealthMetrics,
  DependencyHealth
} from '../interfaces/ModuleIntegration.js';
import { ModuleStatus } from '../types/index.js';

export class ModuleRegistry implements IModuleIntegration {
  private modules: Map<string, ModuleInfo> = new Map();
  private healthMonitoringInterval?: NodeJS.Timeout;
  private healthCheckIntervalMs: number = 30000; // 30 seconds
  private recoveryAttempts: Map<string, number> = new Map();
  private maxRecoveryAttempts: number = 3;

  constructor() {
    this.initializeCoreModuleDefinitions();
  }

  /**
   * Initialize core module definitions with default configurations
   */
  private initializeCoreModuleDefinitions(): void {
    const coreModuleConfigs = this.getDefaultCoreModuleConfigs();
    
    for (const config of coreModuleConfigs) {
      const moduleInfo: ModuleInfo = {
        id: config.id,
        name: config.name,
        version: config.version,
        endpoint: config.endpoint,
        status: 'inactive',
        registeredAt: new Date(),
        lastHealthCheck: new Date(),
        metadata: config.metadata
      };
      
      this.modules.set(config.id, moduleInfo);
    }
  }

  /**
   * Get default configurations for all 14 core modules
   */
  private getDefaultCoreModuleConfigs(): ModuleRegistration[] {
    return [
      {
        id: CORE_MODULES.SQUID,
        name: 'sQuid Identity',
        version: '1.0.0',
        endpoint: process.env.SQUID_ENDPOINT || 'http://localhost:3001',
        healthCheckEndpoint: '/health',
        dependencies: [],
        metadata: {
          description: 'Decentralized identity management system',
          category: 'identity',
          capabilities: ['identity-creation', 'identity-verification', 'sub-identity-management'],
          requiredEnvironment: ['local', 'staging', 'qnet-phase2']
        }
      },
      {
        id: CORE_MODULES.QLOCK,
        name: 'Qlock Encryption',
        version: '1.0.0',
        endpoint: process.env.QLOCK_ENDPOINT || 'http://localhost:3002',
        healthCheckEndpoint: '/health',
        dependencies: [],
        metadata: {
          description: 'User-controlled encryption and key management',
          category: 'security',
          capabilities: ['encryption', 'decryption', 'key-management'],
          requiredEnvironment: ['local', 'staging', 'qnet-phase2']
        }
      },
      {
        id: CORE_MODULES.QONSENT,
        name: 'Qonsent Privacy',
        version: '1.0.0',
        endpoint: process.env.QONSENT_ENDPOINT || 'http://localhost:3003',
        healthCheckEndpoint: '/health',
        dependencies: [CORE_MODULES.SQUID],
        metadata: {
          description: 'Privacy governance and consent management',
          category: 'security',
          capabilities: ['consent-management', 'privacy-policies', 'data-governance'],
          requiredEnvironment: ['local', 'staging', 'qnet-phase2']
        }
      },
      {
        id: CORE_MODULES.QINDEX,
        name: 'Qindex Metadata',
        version: '1.0.0',
        endpoint: process.env.QINDEX_ENDPOINT || 'http://localhost:3004',
        healthCheckEndpoint: '/health',
        dependencies: [CORE_MODULES.QERBEROS],
        metadata: {
          description: 'Decentralized metadata indexing and search',
          category: 'storage',
          capabilities: ['metadata-indexing', 'search', 'content-discovery'],
          requiredEnvironment: ['local', 'staging', 'qnet-phase2']
        }
      },
      {
        id: CORE_MODULES.QERBEROS,
        name: 'Qerberos Security',
        version: '1.0.0',
        endpoint: process.env.QERBEROS_ENDPOINT || 'http://localhost:3005',
        healthCheckEndpoint: '/health',
        dependencies: [CORE_MODULES.SQUID],
        metadata: {
          description: 'Authentication, authorization, and audit trails',
          category: 'security',
          capabilities: ['authentication', 'authorization', 'audit-trails', 'signature-validation'],
          requiredEnvironment: ['local', 'staging', 'qnet-phase2']
        }
      },
      {
        id: CORE_MODULES.QWALLET,
        name: 'Qwallet Finance',
        version: '1.0.0',
        endpoint: process.env.QWALLET_ENDPOINT || 'http://localhost:3006',
        healthCheckEndpoint: '/health',
        dependencies: [CORE_MODULES.SQUID, CORE_MODULES.QERBEROS],
        metadata: {
          description: 'Decentralized wallet and payment processing',
          category: 'commerce',
          capabilities: ['wallet-management', 'payments', 'pi-integration'],
          requiredEnvironment: ['local', 'staging', 'qnet-phase2']
        }
      },
      {
        id: CORE_MODULES.QFLOW,
        name: 'Qflow Automation',
        version: '1.0.0',
        endpoint: process.env.QFLOW_ENDPOINT || 'http://localhost:3007',
        healthCheckEndpoint: '/health',
        dependencies: [CORE_MODULES.QERBEROS, CORE_MODULES.QWALLET],
        metadata: {
          description: 'Workflow automation and smart contract execution',
          category: 'automation',
          capabilities: ['workflow-automation', 'smart-contracts', 'dao-governance'],
          requiredEnvironment: ['local', 'staging', 'qnet-phase2']
        }
      },
      {
        id: CORE_MODULES.QNET,
        name: 'QNET Network',
        version: '2.0.0',
        endpoint: process.env.QNET_ENDPOINT || 'http://localhost:3008',
        healthCheckEndpoint: '/health',
        dependencies: [],
        metadata: {
          description: 'Decentralized network infrastructure',
          category: 'network',
          capabilities: ['p2p-networking', 'node-scaling', 'load-balancing'],
          requiredEnvironment: ['qnet-phase2']
        }
      },
      {
        id: CORE_MODULES.QDRIVE,
        name: 'Qdrive Storage',
        version: '1.0.0',
        endpoint: process.env.QDRIVE_ENDPOINT || 'http://localhost:3009',
        healthCheckEndpoint: '/health',
        dependencies: [CORE_MODULES.QLOCK, CORE_MODULES.QINDEX, CORE_MODULES.QERBEROS],
        metadata: {
          description: 'Decentralized file storage and management',
          category: 'storage',
          capabilities: ['file-storage', 'ipfs-integration', 'content-management'],
          requiredEnvironment: ['local', 'staging', 'qnet-phase2']
        }
      },
      {
        id: CORE_MODULES.QPIC,
        name: 'QpiC Compression',
        version: '1.0.0',
        endpoint: process.env.QPIC_ENDPOINT || 'http://localhost:3010',
        healthCheckEndpoint: '/health',
        dependencies: [],
        metadata: {
          description: 'Advanced data compression and optimization',
          category: 'storage',
          capabilities: ['compression', 'decompression', 'optimization'],
          requiredEnvironment: ['local', 'staging', 'qnet-phase2']
        }
      },
      {
        id: CORE_MODULES.QMARKET,
        name: 'Qmarket Commerce',
        version: '1.0.0',
        endpoint: process.env.QMARKET_ENDPOINT || 'http://localhost:3011',
        healthCheckEndpoint: '/health',
        dependencies: [CORE_MODULES.QWALLET, CORE_MODULES.QERBEROS],
        metadata: {
          description: 'Decentralized marketplace and commerce',
          category: 'commerce',
          capabilities: ['marketplace', 'transactions', 'reputation-system'],
          requiredEnvironment: ['local', 'staging', 'qnet-phase2']
        }
      },
      {
        id: CORE_MODULES.QMAIL,
        name: 'Qmail Communication',
        version: '1.0.0',
        endpoint: process.env.QMAIL_ENDPOINT || 'http://localhost:3012',
        healthCheckEndpoint: '/health',
        dependencies: [CORE_MODULES.SQUID, CORE_MODULES.QERBEROS, CORE_MODULES.QLOCK],
        metadata: {
          description: 'Secure decentralized email system',
          category: 'communication',
          capabilities: ['secure-messaging', 'email', 'encryption'],
          requiredEnvironment: ['local', 'staging', 'qnet-phase2']
        }
      },
      {
        id: CORE_MODULES.QCHAT,
        name: 'Qchat Messaging',
        version: '1.0.0',
        endpoint: process.env.QCHAT_ENDPOINT || 'http://localhost:3013',
        healthCheckEndpoint: '/health',
        dependencies: [CORE_MODULES.SQUID, CORE_MODULES.QERBEROS],
        metadata: {
          description: 'Real-time messaging and communication',
          category: 'communication',
          capabilities: ['real-time-chat', 'group-messaging', 'notifications'],
          requiredEnvironment: ['local', 'staging', 'qnet-phase2']
        }
      },
      {
        id: CORE_MODULES.QSOCIAL,
        name: 'Qsocial Community',
        version: '1.0.0',
        endpoint: process.env.QSOCIAL_ENDPOINT || 'http://localhost:3014',
        healthCheckEndpoint: '/health',
        dependencies: [CORE_MODULES.SQUID, CORE_MODULES.QERBEROS, CORE_MODULES.QFLOW],
        metadata: {
          description: 'Social governance hub and community platform',
          category: 'communication',
          capabilities: ['social-networking', 'governance-hub', 'reputation-system', 'dao-integration'],
          requiredEnvironment: ['local', 'staging', 'qnet-phase2']
        }
      }
    ];
  }

  async registerModule(module: ModuleRegistration): Promise<ModuleRegistrationResult> {
    try {
      // Validate module configuration
      const validation = this.validateModuleRegistration(module);
      if (!validation.isValid) {
        return {
          success: false,
          moduleId: module.id,
          error: `Validation failed: ${validation.errors.join(', ')}`,
          warnings: validation.warnings
        };
      }

      // Check if module already exists
      if (this.modules.has(module.id)) {
        return {
          success: false,
          moduleId: module.id,
          error: 'Module already registered',
          warnings: ['Consider using update operation instead']
        };
      }

      // Perform initial health check
      const healthCheck = await this.performHealthCheck(module);
      
      const moduleInfo: ModuleInfo = {
        id: module.id,
        name: module.name,
        version: module.version,
        endpoint: module.endpoint,
        status: healthCheck.status,
        registeredAt: new Date(),
        lastHealthCheck: healthCheck.lastCheck,
        metadata: module.metadata
      };

      this.modules.set(module.id, moduleInfo);

      return {
        success: true,
        moduleId: module.id,
        warnings: validation.warnings
      };

    } catch (error) {
      return {
        success: false,
        moduleId: module.id,
        error: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings: []
      };
    }
  }

  async discoverModules(): Promise<ModuleDiscoveryResult> {
    const discovered: ModuleRegistration[] = [];
    const registered: string[] = [];
    const failed: Array<{ endpoint: string; error: string }> = [];

    // Get core module configurations
    const coreConfigs = this.getDefaultCoreModuleConfigs();

    for (const config of coreConfigs) {
      try {
        // Attempt to connect to module endpoint
        const healthCheck = await this.performHealthCheck(config);
        
        if (healthCheck.status === 'active') {
          discovered.push(config);
          
          // Auto-register if not already registered
          if (!this.modules.has(config.id)) {
            const result = await this.registerModule(config);
            if (result.success) {
              registered.push(config.id);
            }
          }
        } else {
          // Module is not healthy, add to failed list
          failed.push({
            endpoint: config.endpoint,
            error: healthCheck.error || 'Module health check failed'
          });
        }
      } catch (error) {
        failed.push({
          endpoint: config.endpoint,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { discovered, registered, failed };
  }

  async getModuleHealth(moduleId: string): Promise<HealthCheckResult> {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    return await this.performHealthCheck({
      id: module.id,
      name: module.name,
      version: module.version,
      endpoint: module.endpoint,
      healthCheckEndpoint: '/health',
      dependencies: [],
      metadata: module.metadata
    });
  }

  async getAllModulesHealth(): Promise<Record<string, HealthCheckResult>> {
    const healthResults: Record<string, HealthCheckResult> = {};

    for (const [moduleId] of this.modules) {
      try {
        healthResults[moduleId] = await this.getModuleHealth(moduleId);
      } catch (error) {
        healthResults[moduleId] = {
          moduleId,
          status: 'error',
          lastCheck: new Date(),
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          metrics: this.getDefaultHealthMetrics(),
          dependencies: []
        };
      }
    }

    return healthResults;
  }

  async startHealthMonitoring(): Promise<void> {
    if (this.healthMonitoringInterval) {
      return; // Already monitoring
    }

    console.log('Starting health monitoring for all modules...');
    
    this.healthMonitoringInterval = setInterval(async () => {
      try {
        const healthResults = await this.getAllModulesHealth();
        
        for (const [moduleId, health] of Object.entries(healthResults)) {
          const module = this.modules.get(moduleId);
          if (module) {
            module.status = health.status;
            module.lastHealthCheck = health.lastCheck;
            
            // Trigger recovery if module is in error state
            if (health.status === 'error') {
              await this.attemptModuleRecovery(moduleId);
            }
          }
        }
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, this.healthCheckIntervalMs);
  }

  async stopHealthMonitoring(): Promise<void> {
    if (this.healthMonitoringInterval) {
      clearInterval(this.healthMonitoringInterval);
      this.healthMonitoringInterval = undefined;
      console.log('Health monitoring stopped');
    }
  }

  async getRegisteredModules(): Promise<ModuleInfo[]> {
    return Array.from(this.modules.values());
  }

  async unregisterModule(moduleId: string): Promise<void> {
    if (!this.modules.has(moduleId)) {
      throw new Error(`Module ${moduleId} not found`);
    }

    this.modules.delete(moduleId);
    this.recoveryAttempts.delete(moduleId);
  }

  async recoverModule(moduleId: string): Promise<ModuleRecoveryResult> {
    const module = this.modules.get(moduleId);
    if (!module) {
      return {
        success: false,
        moduleId,
        recoveryActions: [],
        error: 'Module not found',
        newStatus: 'error'
      };
    }

    const recoveryActions: string[] = [];
    
    try {
      // Attempt health check
      recoveryActions.push('Performing health check');
      const healthCheck = await this.performHealthCheck({
        id: module.id,
        name: module.name,
        version: module.version,
        endpoint: module.endpoint,
        healthCheckEndpoint: '/health',
        dependencies: [],
        metadata: module.metadata
      });

      if (healthCheck.status === 'active') {
        module.status = 'active';
        module.lastHealthCheck = new Date();
        this.recoveryAttempts.delete(moduleId);
        
        return {
          success: true,
          moduleId,
          recoveryActions,
          newStatus: 'active'
        };
      }

      // If still failing, mark as error
      module.status = 'error';
      return {
        success: false,
        moduleId,
        recoveryActions,
        error: 'Module still unresponsive after recovery attempt',
        newStatus: 'error'
      };

    } catch (error) {
      module.status = 'error';
      return {
        success: false,
        moduleId,
        recoveryActions,
        error: error instanceof Error ? error.message : 'Unknown error',
        newStatus: 'error'
      };
    }
  }

  /**
   * Perform health check on a module
   */
  private async performHealthCheck(module: ModuleRegistration): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simulate health check - in real implementation, this would make HTTP request
      // For demo purposes, we'll simulate based on environment variables or default behavior
      const isHealthy = await this.simulateHealthCheck(module);
      const responseTime = Date.now() - startTime;

      const dependencyHealth = await this.checkDependencies(module.dependencies);

      return {
        moduleId: module.id,
        status: isHealthy ? 'active' : 'error',
        lastCheck: new Date(),
        responseTime,
        metrics: this.getDefaultHealthMetrics(),
        dependencies: dependencyHealth
      };

    } catch (error) {
      return {
        moduleId: module.id,
        status: 'error',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: this.getDefaultHealthMetrics(),
        dependencies: []
      };
    }
  }

  /**
   * Simulate health check for demo purposes
   */
  private async simulateHealthCheck(module: ModuleRegistration): Promise<boolean> {
    // In a real implementation, this would make an HTTP request to module.endpoint + module.healthCheckEndpoint
    // For demo purposes, we'll simulate based on environment or random success
    const envVar = `${module.id.toUpperCase()}_HEALTHY`;
    
    // If explicitly set to true, return true
    if (process.env[envVar] === 'true') {
      return true;
    }
    
    // If explicitly set to false, return false
    if (process.env[envVar] === 'false') {
      return false;
    }
    
    // Default behavior: simulate some modules as healthy for testing
    const defaultHealthyModules = [CORE_MODULES.SQUID, CORE_MODULES.QLOCK, CORE_MODULES.QERBEROS];
    return defaultHealthyModules.includes(module.id as any);
  }

  /**
   * Check health of module dependencies
   */
  private async checkDependencies(dependencies: string[]): Promise<DependencyHealth[]> {
    const dependencyHealth: DependencyHealth[] = [];

    for (const depId of dependencies) {
      const depModule = this.modules.get(depId);
      dependencyHealth.push({
        dependencyId: depId,
        status: depModule?.status || 'inactive',
        lastCheck: new Date()
      });
    }

    return dependencyHealth;
  }

  /**
   * Get default health metrics
   */
  private getDefaultHealthMetrics(): ModuleHealthMetrics {
    return {
      uptime: Math.random() * 100,
      memoryUsage: Math.random() * 80,
      cpuUsage: Math.random() * 60,
      requestCount: Math.floor(Math.random() * 1000),
      errorCount: Math.floor(Math.random() * 10)
    };
  }

  /**
   * Validate module registration
   */
  private validateModuleRegistration(module: ModuleRegistration): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!module.id || module.id.trim() === '') {
      errors.push('Module ID is required');
    }

    if (!module.name || module.name.trim() === '') {
      errors.push('Module name is required');
    }

    if (!module.endpoint || module.endpoint.trim() === '') {
      errors.push('Module endpoint is required');
    }

    if (!module.version || module.version.trim() === '') {
      warnings.push('Module version not specified');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Attempt automatic recovery for a failed module
   */
  private async attemptModuleRecovery(moduleId: string): Promise<void> {
    const attempts = this.recoveryAttempts.get(moduleId) || 0;
    
    if (attempts >= this.maxRecoveryAttempts) {
      console.warn(`Module ${moduleId} has exceeded maximum recovery attempts (${this.maxRecoveryAttempts})`);
      return;
    }

    this.recoveryAttempts.set(moduleId, attempts + 1);
    
    console.log(`Attempting recovery for module ${moduleId} (attempt ${attempts + 1}/${this.maxRecoveryAttempts})`);
    
    const result = await this.recoverModule(moduleId);
    
    if (result.success) {
      console.log(`Successfully recovered module ${moduleId}`);
      this.recoveryAttempts.delete(moduleId);
    } else {
      console.warn(`Recovery attempt ${attempts + 1} failed for module ${moduleId}: ${result.error}`);
    }
  }
}