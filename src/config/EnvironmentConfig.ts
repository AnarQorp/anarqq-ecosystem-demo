/**
 * Environment Configuration Management
 * 
 * Manages environment-specific configurations for local, staging, and QNET Phase 2 deployments.
 */

import { Environment } from '../interfaces/DeploymentManager.js';

export interface EnvironmentConfiguration {
  environment: Environment;
  services: ServiceConfiguration[];
  networking: NetworkConfiguration;
  monitoring: MonitoringConfiguration;
  security: SecurityConfiguration;
  scaling: ScalingConfiguration;
}

export interface ServiceConfiguration {
  name: string;
  image: string;
  tag: string;
  ports: PortMapping[];
  environment: Record<string, string>;
  volumes: VolumeMapping[];
  resources: ResourceLimits;
  replicas: number;
  healthCheck: HealthCheckConfiguration;
}

export interface PortMapping {
  host: number;
  container: number;
  protocol: 'tcp' | 'udp';
}

export interface VolumeMapping {
  host: string;
  container: string;
  mode: 'ro' | 'rw';
}

export interface ResourceLimits {
  cpu: string;
  memory: string;
  reservedCpu?: string;
  reservedMemory?: string;
}

export interface HealthCheckConfiguration {
  enabled: boolean;
  endpoint: string;
  interval: number;
  timeout: number;
  retries: number;
}

export interface NetworkConfiguration {
  name: string;
  driver: 'bridge' | 'overlay';
  encrypted: boolean;
  attachable: boolean;
}

export interface MonitoringConfiguration {
  enabled: boolean;
  prometheus: PrometheusConfiguration;
  grafana: GrafanaConfiguration;
  alerting: AlertingConfiguration;
}

export interface PrometheusConfiguration {
  enabled: boolean;
  port: number;
  scrapeInterval: string;
  retentionTime: string;
}

export interface GrafanaConfiguration {
  enabled: boolean;
  port: number;
  adminPassword: string;
  database: DatabaseConfiguration;
}

export interface DatabaseConfiguration {
  type: 'sqlite' | 'postgres';
  host?: string;
  port?: number;
  name?: string;
  user?: string;
  password?: string;
}

export interface AlertingConfiguration {
  enabled: boolean;
  alertmanager: AlertmanagerConfiguration;
  rules: AlertRule[];
}

export interface AlertmanagerConfiguration {
  enabled: boolean;
  port: number;
  webhookUrl?: string;
  emailConfig?: EmailConfiguration;
}

export interface EmailConfiguration {
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  from: string;
  to: string[];
}

export interface AlertRule {
  name: string;
  condition: string;
  duration: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface SecurityConfiguration {
  encryption: EncryptionConfiguration;
  authentication: AuthenticationConfiguration;
  authorization: AuthorizationConfiguration;
  audit: AuditConfiguration;
}

export interface EncryptionConfiguration {
  enabled: boolean;
  level: 'basic' | 'high' | 'maximum';
  algorithms: string[];
  keyRotationInterval: string;
}

export interface AuthenticationConfiguration {
  enabled: boolean;
  methods: string[];
  tokenExpiry: string;
  multiFactorAuth: boolean;
}

export interface AuthorizationConfiguration {
  enabled: boolean;
  rbacEnabled: boolean;
  policies: AuthorizationPolicy[];
}

export interface AuthorizationPolicy {
  name: string;
  subjects: string[];
  actions: string[];
  resources: string[];
  conditions?: string[];
}

export interface AuditConfiguration {
  enabled: boolean;
  level: 'basic' | 'detailed' | 'comprehensive';
  retention: string;
  storage: 'local' | 'distributed' | 'cloud';
}

export interface ScalingConfiguration {
  enabled: boolean;
  autoScaling: AutoScalingConfiguration;
  loadBalancing: LoadBalancingConfiguration;
  failover: FailoverConfiguration;
}

export interface AutoScalingConfiguration {
  enabled: boolean;
  minReplicas: number;
  maxReplicas: number;
  targetCpuUtilization: number;
  targetMemoryUtilization: number;
  scaleUpCooldown: string;
  scaleDownCooldown: string;
}

export interface LoadBalancingConfiguration {
  enabled: boolean;
  algorithm: 'round-robin' | 'least-connections' | 'ip-hash';
  healthCheckInterval: string;
  sessionAffinity: boolean;
}

export interface FailoverConfiguration {
  enabled: boolean;
  strategy: 'active-passive' | 'active-active';
  healthCheckInterval: string;
  failoverTimeout: string;
  automaticRecovery: boolean;
}

export class EnvironmentConfigManager {
  private configurations: Map<Environment, EnvironmentConfiguration> = new Map();

  constructor() {
    this.initializeConfigurations();
  }

  getConfiguration(environment: Environment): EnvironmentConfiguration {
    const config = this.configurations.get(environment);
    if (!config) {
      throw new Error(`Configuration not found for environment: ${environment}`);
    }
    return config;
  }

  updateConfiguration(environment: Environment, config: Partial<EnvironmentConfiguration>): void {
    const existingConfig = this.getConfiguration(environment);
    const updatedConfig = { ...existingConfig, ...config };
    this.configurations.set(environment, updatedConfig);
  }

  validateConfiguration(environment: Environment): ValidationResult {
    const config = this.getConfiguration(environment);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate services
    for (const service of config.services) {
      if (!service.name || !service.image) {
        errors.push(`Service missing required fields: ${service.name || 'unnamed'}`);
      }
      
      if (service.replicas < 1) {
        errors.push(`Service ${service.name} must have at least 1 replica`);
      }

      if (environment === 'qnet-phase2' && service.replicas < 3) {
        warnings.push(`Service ${service.name} should have at least 3 replicas for production`);
      }
    }

    // Validate networking
    if (!config.networking.name) {
      errors.push('Network name is required');
    }

    if (environment === 'qnet-phase2' && !config.networking.encrypted) {
      warnings.push('Network encryption is recommended for production');
    }

    // Validate security
    if (environment === 'qnet-phase2') {
      if (!config.security.encryption.enabled) {
        errors.push('Encryption must be enabled for production');
      }
      
      if (!config.security.audit.enabled) {
        errors.push('Audit logging must be enabled for production');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private initializeConfigurations(): void {
    this.configurations.set('local', this.createLocalConfiguration());
    this.configurations.set('staging', this.createStagingConfiguration());
    this.configurations.set('qnet-phase2', this.createQNETPhase2Configuration());
  }

  private createLocalConfiguration(): EnvironmentConfiguration {
    return {
      environment: 'local',
      services: [
        {
          name: 'demo-orchestrator',
          image: 'anarqorp/demo-orchestrator',
          tag: 'latest',
          ports: [{ host: 3000, container: 3000, protocol: 'tcp' }],
          environment: {
            NODE_ENV: 'development',
            LOG_LEVEL: 'debug'
          },
          volumes: [
            { host: './src', container: '/app/src', mode: 'rw' },
            { host: './config', container: '/app/config', mode: 'ro' }
          ],
          resources: {
            cpu: '0.5',
            memory: '512M'
          },
          replicas: 1,
          healthCheck: {
            enabled: true,
            endpoint: '/health',
            interval: 30,
            timeout: 10,
            retries: 3
          }
        },
        {
          name: 'ipfs-node',
          image: 'ipfs/go-ipfs',
          tag: 'latest',
          ports: [
            { host: 4001, container: 4001, protocol: 'tcp' },
            { host: 5001, container: 5001, protocol: 'tcp' },
            { host: 8080, container: 8080, protocol: 'tcp' }
          ],
          environment: {
            IPFS_PROFILE: 'server'
          },
          volumes: [
            { host: 'ipfs_data', container: '/data/ipfs', mode: 'rw' }
          ],
          resources: {
            cpu: '0.25',
            memory: '256M'
          },
          replicas: 1,
          healthCheck: {
            enabled: true,
            endpoint: '/api/v0/id',
            interval: 30,
            timeout: 10,
            retries: 3
          }
        }
      ],
      networking: {
        name: 'anarqq-network',
        driver: 'bridge',
        encrypted: false,
        attachable: true
      },
      monitoring: {
        enabled: false,
        prometheus: {
          enabled: false,
          port: 9090,
          scrapeInterval: '15s',
          retentionTime: '7d'
        },
        grafana: {
          enabled: false,
          port: 3003,
          adminPassword: 'admin',
          database: {
            type: 'sqlite'
          }
        },
        alerting: {
          enabled: false,
          alertmanager: {
            enabled: false,
            port: 9093
          },
          rules: []
        }
      },
      security: {
        encryption: {
          enabled: false,
          level: 'basic',
          algorithms: ['AES-256'],
          keyRotationInterval: '30d'
        },
        authentication: {
          enabled: true,
          methods: ['jwt'],
          tokenExpiry: '1h',
          multiFactorAuth: false
        },
        authorization: {
          enabled: true,
          rbacEnabled: false,
          policies: []
        },
        audit: {
          enabled: true,
          level: 'basic',
          retention: '7d',
          storage: 'local'
        }
      },
      scaling: {
        enabled: false,
        autoScaling: {
          enabled: false,
          minReplicas: 1,
          maxReplicas: 3,
          targetCpuUtilization: 70,
          targetMemoryUtilization: 80,
          scaleUpCooldown: '5m',
          scaleDownCooldown: '10m'
        },
        loadBalancing: {
          enabled: false,
          algorithm: 'round-robin',
          healthCheckInterval: '30s',
          sessionAffinity: false
        },
        failover: {
          enabled: false,
          strategy: 'active-passive',
          healthCheckInterval: '30s',
          failoverTimeout: '60s',
          automaticRecovery: true
        }
      }
    };
  }

  private createStagingConfiguration(): EnvironmentConfiguration {
    const localConfig = this.createLocalConfiguration();
    
    return {
      ...localConfig,
      environment: 'staging',
      services: localConfig.services.map(service => ({
        ...service,
        tag: 'staging',
        environment: {
          ...service.environment,
          NODE_ENV: 'staging',
          LOG_LEVEL: 'info'
        },
        replicas: 2,
        resources: {
          cpu: '1.0',
          memory: '1G',
          reservedCpu: '0.5',
          reservedMemory: '512M'
        }
      })),
      networking: {
        name: 'anarqq-staging-network',
        driver: 'overlay',
        encrypted: true,
        attachable: true
      },
      monitoring: {
        enabled: true,
        prometheus: {
          enabled: true,
          port: 9090,
          scrapeInterval: '15s',
          retentionTime: '30d'
        },
        grafana: {
          enabled: true,
          port: 3003,
          adminPassword: 'staging-admin',
          database: {
            type: 'postgres',
            host: 'postgres',
            port: 5432,
            name: 'grafana',
            user: 'grafana'
          }
        },
        alerting: {
          enabled: true,
          alertmanager: {
            enabled: true,
            port: 9093
          },
          rules: [
            {
              name: 'HighCPUUsage',
              condition: 'cpu_usage > 80',
              duration: '5m',
              severity: 'warning',
              message: 'High CPU usage detected'
            }
          ]
        }
      },
      security: {
        encryption: {
          enabled: true,
          level: 'high',
          algorithms: ['AES-256', 'ChaCha20'],
          keyRotationInterval: '7d'
        },
        authentication: {
          enabled: true,
          methods: ['jwt', 'oauth2'],
          tokenExpiry: '30m',
          multiFactorAuth: true
        },
        authorization: {
          enabled: true,
          rbacEnabled: true,
          policies: [
            {
              name: 'admin-policy',
              subjects: ['admin'],
              actions: ['*'],
              resources: ['*']
            }
          ]
        },
        audit: {
          enabled: true,
          level: 'detailed',
          retention: '90d',
          storage: 'distributed'
        }
      },
      scaling: {
        enabled: true,
        autoScaling: {
          enabled: true,
          minReplicas: 2,
          maxReplicas: 10,
          targetCpuUtilization: 70,
          targetMemoryUtilization: 80,
          scaleUpCooldown: '3m',
          scaleDownCooldown: '5m'
        },
        loadBalancing: {
          enabled: true,
          algorithm: 'least-connections',
          healthCheckInterval: '15s',
          sessionAffinity: true
        },
        failover: {
          enabled: true,
          strategy: 'active-active',
          healthCheckInterval: '15s',
          failoverTimeout: '30s',
          automaticRecovery: true
        }
      }
    };
  }

  private createQNETPhase2Configuration(): EnvironmentConfiguration {
    const stagingConfig = this.createStagingConfiguration();
    
    return {
      ...stagingConfig,
      environment: 'qnet-phase2',
      services: stagingConfig.services.map(service => ({
        ...service,
        tag: 'latest',
        environment: {
          ...service.environment,
          NODE_ENV: 'production',
          LOG_LEVEL: 'warn',
          QNET_PHASE: '2',
          DISTRIBUTED_MODE: 'true'
        },
        replicas: service.name === 'demo-orchestrator' ? 5 : 3,
        resources: {
          cpu: '2.0',
          memory: '2G',
          reservedCpu: '1.0',
          reservedMemory: '1G'
        }
      })),
      networking: {
        name: 'qnet-phase2-network',
        driver: 'overlay',
        encrypted: true,
        attachable: true
      },
      monitoring: {
        enabled: true,
        prometheus: {
          enabled: true,
          port: 9090,
          scrapeInterval: '10s',
          retentionTime: '365d'
        },
        grafana: {
          enabled: true,
          port: 3003,
          adminPassword: 'production-admin',
          database: {
            type: 'postgres',
            host: 'postgres-cluster',
            port: 5432,
            name: 'grafana',
            user: 'grafana'
          }
        },
        alerting: {
          enabled: true,
          alertmanager: {
            enabled: true,
            port: 9093,
            webhookUrl: 'https://hooks.slack.com/services/...',
            emailConfig: {
              smtpHost: 'smtp.gmail.com',
              smtpPort: 587,
              username: 'alerts@anarqorp.com',
              password: 'app-password',
              from: 'alerts@anarqorp.com',
              to: ['ops@anarqorp.com', 'dev@anarqorp.com']
            }
          },
          rules: [
            {
              name: 'ServiceDown',
              condition: 'up == 0',
              duration: '1m',
              severity: 'critical',
              message: 'Service is down'
            },
            {
              name: 'HighErrorRate',
              condition: 'error_rate > 5',
              duration: '2m',
              severity: 'warning',
              message: 'High error rate detected'
            },
            {
              name: 'DiskSpaceLow',
              condition: 'disk_free < 10',
              duration: '5m',
              severity: 'warning',
              message: 'Disk space is running low'
            }
          ]
        }
      },
      security: {
        encryption: {
          enabled: true,
          level: 'maximum',
          algorithms: ['AES-256-GCM', 'ChaCha20-Poly1305'],
          keyRotationInterval: '1d'
        },
        authentication: {
          enabled: true,
          methods: ['jwt', 'oauth2', 'saml'],
          tokenExpiry: '15m',
          multiFactorAuth: true
        },
        authorization: {
          enabled: true,
          rbacEnabled: true,
          policies: [
            {
              name: 'admin-policy',
              subjects: ['admin', 'ops'],
              actions: ['*'],
              resources: ['*']
            },
            {
              name: 'developer-policy',
              subjects: ['developer'],
              actions: ['read', 'deploy'],
              resources: ['services', 'logs']
            },
            {
              name: 'readonly-policy',
              subjects: ['viewer'],
              actions: ['read'],
              resources: ['metrics', 'logs']
            }
          ]
        },
        audit: {
          enabled: true,
          level: 'comprehensive',
          retention: '2y',
          storage: 'distributed'
        }
      },
      scaling: {
        enabled: true,
        autoScaling: {
          enabled: true,
          minReplicas: 5,
          maxReplicas: 100,
          targetCpuUtilization: 60,
          targetMemoryUtilization: 70,
          scaleUpCooldown: '1m',
          scaleDownCooldown: '3m'
        },
        loadBalancing: {
          enabled: true,
          algorithm: 'least-connections',
          healthCheckInterval: '10s',
          sessionAffinity: true
        },
        failover: {
          enabled: true,
          strategy: 'active-active',
          healthCheckInterval: '10s',
          failoverTimeout: '15s',
          automaticRecovery: true
        }
      }
    };
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const environmentConfigManager = new EnvironmentConfigManager();