import { 
  Environment, 
  EnvironmentConfig, 
  ModuleConfig, 
  NetworkConfig, 
  ValidationConfig 
} from '../types/index.js';

/**
 * Base configuration manager for multi-environment support
 * Handles loading and management of environment-specific configurations
 */
export class BaseConfig {
  private configs: Map<Environment, EnvironmentConfig> = new Map();
  private currentEnvironment: Environment = 'local';

  constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * Get configuration for specified environment
   * @param environment - Target environment
   * @returns Environment configuration
   */
  getConfig(environment: Environment): EnvironmentConfig {
    const config = this.configs.get(environment);
    if (!config) {
      throw new Error(`Configuration not found for environment: ${environment}`);
    }
    return config;
  }

  /**
   * Get current environment configuration
   * @returns Current environment configuration
   */
  getCurrentConfig(): EnvironmentConfig {
    return this.getConfig(this.currentEnvironment);
  }

  /**
   * Set current environment
   * @param environment - Environment to set as current
   */
  setCurrentEnvironment(environment: Environment): void {
    if (!this.configs.has(environment)) {
      throw new Error(`Configuration not available for environment: ${environment}`);
    }
    this.currentEnvironment = environment;
  }

  /**
   * Get current environment
   * @returns Current environment
   */
  getCurrentEnvironment(): Environment {
    return this.currentEnvironment;
  }

  /**
   * Update configuration for specific environment
   * @param environment - Target environment
   * @param config - Configuration to update
   */
  updateConfig(environment: Environment, config: Partial<EnvironmentConfig>): void {
    const existingConfig = this.getConfig(environment);
    const updatedConfig = { ...existingConfig, ...config };
    this.configs.set(environment, updatedConfig);
  }

  /**
   * Load configuration from environment variables
   * @param environment - Target environment
   */
  loadFromEnvironment(environment: Environment): void {
    const config = this.getConfig(environment);
    
    // Override with environment variables if present
    if (process.env.QNET_PHASE2_ENABLED) {
      config.network.qnetPhase2.enabled = process.env.QNET_PHASE2_ENABLED === 'true';
    }
    
    if (process.env.PI_NETWORK_TESTNET) {
      config.network.piNetwork.testnet = process.env.PI_NETWORK_TESTNET === 'true';
    }
    
    if (process.env.IPFS_GATEWAY) {
      config.network.ipfs.gateway = process.env.IPFS_GATEWAY;
    }
    
    if (process.env.MAX_LATENCY) {
      config.validation.performanceGate.maxLatency = parseInt(process.env.MAX_LATENCY);
    }
    
    this.configs.set(environment, config);
  }

  /**
   * Validate configuration for environment
   * @param environment - Environment to validate
   * @returns Validation result
   */
  validateConfig(environment: Environment): { isValid: boolean; errors: string[] } {
    const config = this.getConfig(environment);
    const errors: string[] = [];

    // Validate modules
    if (!config.modules || config.modules.length === 0) {
      errors.push('No modules configured');
    }

    // Validate required modules for AnarQ&Q ecosystem
    const requiredModules = [
      'squid', 'qlock', 'qonsent', 'qindex', 'qerberos', 
      'qwallet', 'qflow', 'qnet', 'qdrive', 'qpic', 
      'qmarket', 'qmail', 'qchat', 'qsocial'
    ];

    const configuredModules = config.modules.map(m => m.id);
    const missingModules = requiredModules.filter(m => !configuredModules.includes(m));
    
    if (missingModules.length > 0) {
      errors.push(`Missing required modules: ${missingModules.join(', ')}`);
    }

    // Validate network configuration
    if (!config.network.ipfs.gateway) {
      errors.push('IPFS gateway not configured');
    }

    // Validate validation thresholds
    if (config.validation.performanceGate.maxLatency <= 0) {
      errors.push('Invalid performance gate: maxLatency must be positive');
    }

    if (config.validation.performanceGate.minThroughput <= 0) {
      errors.push('Invalid performance gate: minThroughput must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Initialize default configurations for all environments
   */
  private initializeDefaultConfigs(): void {
    // Local environment configuration
    this.configs.set('local', this.createLocalConfig());
    
    // Staging environment configuration
    this.configs.set('staging', this.createStagingConfig());
    
    // QNET Phase 2 environment configuration
    this.configs.set('qnet-phase2', this.createQnetPhase2Config());
  }

  /**
   * Create local environment configuration
   */
  private createLocalConfig(): EnvironmentConfig {
    return {
      environment: 'local',
      modules: this.createDefaultModules('local'),
      network: this.createLocalNetworkConfig(),
      validation: this.createDefaultValidationConfig()
    };
  }

  /**
   * Create staging environment configuration
   */
  private createStagingConfig(): EnvironmentConfig {
    return {
      environment: 'staging',
      modules: this.createDefaultModules('staging'),
      network: this.createStagingNetworkConfig(),
      validation: this.createDefaultValidationConfig()
    };
  }

  /**
   * Create QNET Phase 2 environment configuration
   */
  private createQnetPhase2Config(): EnvironmentConfig {
    return {
      environment: 'qnet-phase2',
      modules: this.createDefaultModules('qnet-phase2'),
      network: this.createQnetPhase2NetworkConfig(),
      validation: this.createProductionValidationConfig()
    };
  }

  /**
   * Create default module configurations
   */
  private createDefaultModules(environment: Environment): ModuleConfig[] {
    const basePort = environment === 'local' ? 3000 : 8000;
    const host = environment === 'local' ? 'localhost' : 'qnet-node';
    
    return [
      { id: 'squid', name: 'sQuid Identity', version: '1.0.0', endpoint: `http://${host}:${basePort + 1}`, enabled: true, dependencies: [] },
      { id: 'qlock', name: 'Qlock Encryption', version: '1.0.0', endpoint: `http://${host}:${basePort + 2}`, enabled: true, dependencies: ['squid'] },
      { id: 'qonsent', name: 'Qonsent Privacy', version: '1.0.0', endpoint: `http://${host}:${basePort + 3}`, enabled: true, dependencies: ['squid'] },
      { id: 'qindex', name: 'Qindex Metadata', version: '1.0.0', endpoint: `http://${host}:${basePort + 4}`, enabled: true, dependencies: ['qlock'] },
      { id: 'qerberos', name: 'Qerberos Security', version: '1.0.0', endpoint: `http://${host}:${basePort + 5}`, enabled: true, dependencies: ['squid', 'qindex'] },
      { id: 'qwallet', name: 'Qwallet Finance', version: '1.0.0', endpoint: `http://${host}:${basePort + 6}`, enabled: true, dependencies: ['squid', 'qerberos'] },
      { id: 'qflow', name: 'Qflow Automation', version: '1.0.0', endpoint: `http://${host}:${basePort + 7}`, enabled: true, dependencies: ['qerberos'] },
      { id: 'qnet', name: 'QNET Network', version: '2.0.0', endpoint: `http://${host}:${basePort + 8}`, enabled: true, dependencies: [] },
      { id: 'qdrive', name: 'Qdrive Storage', version: '1.0.0', endpoint: `http://${host}:${basePort + 9}`, enabled: true, dependencies: ['qlock', 'qindex'] },
      { id: 'qpic', name: 'QpiC Compression', version: '1.0.0', endpoint: `http://${host}:${basePort + 10}`, enabled: true, dependencies: [] },
      { id: 'qmarket', name: 'Qmarket Commerce', version: '1.0.0', endpoint: `http://${host}:${basePort + 11}`, enabled: true, dependencies: ['qwallet'] },
      { id: 'qmail', name: 'Qmail Communication', version: '1.0.0', endpoint: `http://${host}:${basePort + 12}`, enabled: true, dependencies: ['qerberos'] },
      { id: 'qchat', name: 'Qchat Messaging', version: '1.0.0', endpoint: `http://${host}:${basePort + 13}`, enabled: true, dependencies: ['qerberos'] },
      { id: 'qsocial', name: 'Qsocial Community', version: '1.0.0', endpoint: `http://${host}:${basePort + 14}`, enabled: true, dependencies: ['squid', 'qerberos'] }
    ];
  }

  /**
   * Create local network configuration
   */
  private createLocalNetworkConfig(): NetworkConfig {
    return {
      qnetPhase2: {
        enabled: false,
        minNodes: 1,
        scalingThresholds: {
          cpuThreshold: 70,
          memoryThreshold: 80,
          networkLatencyThreshold: 200
        }
      },
      piNetwork: {
        enabled: true,
        testnet: true,
        contractAddresses: {
          governance: '0x1234567890123456789012345678901234567890',
          dao: '0x2345678901234567890123456789012345678901'
        }
      },
      ipfs: {
        gateway: 'http://localhost:8080',
        api: 'http://localhost:5001',
        timeout: 30000
      }
    };
  }

  /**
   * Create staging network configuration
   */
  private createStagingNetworkConfig(): NetworkConfig {
    return {
      qnetPhase2: {
        enabled: true,
        minNodes: 3,
        scalingThresholds: {
          cpuThreshold: 70,
          memoryThreshold: 80,
          networkLatencyThreshold: 200
        }
      },
      piNetwork: {
        enabled: true,
        testnet: true,
        contractAddresses: {
          governance: '0x3456789012345678901234567890123456789012',
          dao: '0x4567890123456789012345678901234567890123'
        }
      },
      ipfs: {
        gateway: 'https://staging-ipfs.anarqq.org',
        api: 'https://staging-ipfs-api.anarqq.org',
        timeout: 30000
      }
    };
  }

  /**
   * Create QNET Phase 2 network configuration
   */
  private createQnetPhase2NetworkConfig(): NetworkConfig {
    return {
      qnetPhase2: {
        enabled: true,
        minNodes: 5,
        scalingThresholds: {
          cpuThreshold: 70,
          memoryThreshold: 80,
          networkLatencyThreshold: 200
        }
      },
      piNetwork: {
        enabled: true,
        testnet: false,
        contractAddresses: {
          governance: '0x5678901234567890123456789012345678901234',
          dao: '0x6789012345678901234567890123456789012345'
        }
      },
      ipfs: {
        gateway: 'https://ipfs.anarqq.org',
        api: 'https://ipfs-api.anarqq.org',
        timeout: 30000
      }
    };
  }

  /**
   * Create default validation configuration
   */
  private createDefaultValidationConfig(): ValidationConfig {
    return {
      performanceGate: {
        maxLatency: 2000, // 2 seconds
        minThroughput: 100, // 100 RPS
        maxErrorRate: 0.01 // 1%
      },
      decentralizationGate: {
        minNodes: 3,
        maxSinglePointFailures: 0,
        minGeographicDistribution: 2
      },
      integrityGate: {
        dataIntegrityCheck: true,
        auditTrailCompleteness: true,
        qerberosSignatureValidation: true
      }
    };
  }

  /**
   * Create production validation configuration with stricter requirements
   */
  private createProductionValidationConfig(): ValidationConfig {
    return {
      performanceGate: {
        maxLatency: 2000, // 2 seconds
        minThroughput: 100, // 100 RPS
        maxErrorRate: 0.01 // 1%
      },
      decentralizationGate: {
        minNodes: 5,
        maxSinglePointFailures: 0,
        minGeographicDistribution: 3
      },
      integrityGate: {
        dataIntegrityCheck: true,
        auditTrailCompleteness: true,
        qerberosSignatureValidation: true
      }
    };
  }
}