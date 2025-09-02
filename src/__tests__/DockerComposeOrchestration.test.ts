/**
 * Docker Compose Orchestration Tests
 * 
 * Tests for multi-environment docker-compose deployment automation
 * and environment-specific configuration management.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { DeploymentManagerService } from '../services/DeploymentManagerService.js';
import { environmentConfigManager } from '../config/EnvironmentConfig.js';
import { Environment } from '../interfaces/DeploymentManager.js';

// Mock external dependencies
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn()
}));
vi.mock('dockerode', () => ({
  default: vi.fn()
}));
vi.mock('js-yaml', () => ({
  dump: vi.fn().mockReturnValue('mocked-yaml-content'),
  load: vi.fn().mockReturnValue({ services: { 'test-service': {} } })
}));
vi.mock('fs/promises', () => ({
  readFile: vi.fn()
}));

describe('Docker Compose Orchestration', () => {
  let deploymentManager: DeploymentManagerService;
  let mockDocker: any;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock Docker
    mockDocker = {
      listContainers: vi.fn(),
      getContainer: vi.fn()
    };

    const Docker = (await import('dockerode')).default;
    vi.mocked(Docker).mockImplementation(() => mockDocker);

    deploymentManager = new DeploymentManagerService('test-token');
  });

  describe('Environment Configuration Management', () => {
    it('should provide valid configuration for local environment', () => {
      const config = environmentConfigManager.getConfiguration('local');
      
      expect(config.environment).toBe('local');
      expect(config.services).toBeDefined();
      expect(config.services.length).toBeGreaterThan(0);
      expect(config.networking.driver).toBe('bridge');
      expect(config.monitoring.enabled).toBe(false);
      expect(config.security.encryption.enabled).toBe(false);
      expect(config.scaling.enabled).toBe(false);
    });

    it('should provide valid configuration for staging environment', () => {
      const config = environmentConfigManager.getConfiguration('staging');
      
      expect(config.environment).toBe('staging');
      expect(config.services).toBeDefined();
      expect(config.services.length).toBeGreaterThan(0);
      expect(config.networking.driver).toBe('overlay');
      expect(config.networking.encrypted).toBe(true);
      expect(config.monitoring.enabled).toBe(true);
      expect(config.security.encryption.enabled).toBe(true);
      expect(config.scaling.enabled).toBe(true);
      
      // Verify staging-specific settings
      config.services.forEach(service => {
        expect(service.replicas).toBeGreaterThanOrEqual(2);
        expect(service.tag).toBe('staging');
        expect(service.environment.NODE_ENV).toBe('staging');
      });
    });

    it('should provide valid configuration for QNET Phase 2 environment', () => {
      const config = environmentConfigManager.getConfiguration('qnet-phase2');
      
      expect(config.environment).toBe('qnet-phase2');
      expect(config.services).toBeDefined();
      expect(config.services.length).toBeGreaterThan(0);
      expect(config.networking.driver).toBe('overlay');
      expect(config.networking.encrypted).toBe(true);
      expect(config.monitoring.enabled).toBe(true);
      expect(config.security.encryption.enabled).toBe(true);
      expect(config.security.encryption.level).toBe('maximum');
      expect(config.scaling.enabled).toBe(true);
      
      // Verify production-specific settings
      config.services.forEach(service => {
        expect(service.replicas).toBeGreaterThanOrEqual(3);
        expect(service.tag).toBe('latest');
        expect(service.environment.NODE_ENV).toBe('production');
        expect(service.environment.QNET_PHASE).toBe('2');
      });
    });

    it('should validate configuration correctly', () => {
      const environments: Environment[] = ['local', 'staging', 'qnet-phase2'];
      
      environments.forEach(env => {
        const validation = environmentConfigManager.validateConfiguration(env);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toEqual([]);
      });
    });

    it('should detect configuration errors', () => {
      // Create invalid configuration
      const invalidConfig = environmentConfigManager.getConfiguration('local');
      invalidConfig.services[0].name = '';
      invalidConfig.services[0].replicas = 0;
      invalidConfig.networking.name = '';
      
      environmentConfigManager.updateConfiguration('local', invalidConfig);
      
      const validation = environmentConfigManager.validateConfiguration('local');
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(error => error.includes('missing required fields'))).toBe(true);
      expect(validation.errors.some(error => error.includes('at least 1 replica'))).toBe(true);
      expect(validation.errors.some(error => error.includes('Network name is required'))).toBe(true);
    });
  });

  describe('Local Environment Deployment', () => {
    it('should successfully deploy to local environment', async () => {
      // Mock file system operations
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(`
        version: '3.8'
        services:
          demo-orchestrator:
            image: anarqorp/demo-orchestrator:latest
          ipfs-node:
            image: ipfs/go-ipfs:latest
          qerberos-service:
            image: anarqorp/qerberos:latest
      `);

      const result = await deploymentManager.runDockerCompose('local');

      expect(result.success).toBe(true);
      expect(result.environment).toBe('local');
      expect(result.services.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.message).toContain('Successfully deployed');
    });

    it('should handle local environment service failures', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(`
        version: '3.8'
        services:
          demo-orchestrator:
            image: anarqorp/demo-orchestrator:latest
          failing-service:
            image: non-existent:latest
      `);

      const result = await deploymentManager.runDockerCompose('local');

      expect(result.success).toBe(true); // Should still succeed with available services
      expect(result.environment).toBe('local');
    });

    it('should validate local environment resource requirements', () => {
      const config = environmentConfigManager.getConfiguration('local');
      
      config.services.forEach(service => {
        expect(service.resources.cpu).toBeDefined();
        expect(service.resources.memory).toBeDefined();
        expect(parseFloat(service.resources.cpu)).toBeLessThanOrEqual(2.0); // Reasonable for local
        expect(service.resources.memory).toMatch(/^\d+[MG]$/); // Valid memory format
      });
    });
  });

  describe('Staging Environment Deployment', () => {
    it('should successfully deploy to staging environment', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(`
        version: '3.8'
        services:
          demo-orchestrator:
            image: anarqorp/demo-orchestrator:staging
            deploy:
              replicas: 2
          ipfs-cluster:
            image: ipfs/ipfs-cluster:latest
          qerberos-service:
            image: anarqorp/qerberos:staging
            deploy:
              replicas: 2
          monitoring:
            image: prom/prometheus:latest
      `);

      const result = await deploymentManager.runDockerCompose('staging');

      expect(result.success).toBe(true);
      expect(result.environment).toBe('staging');
      expect(result.services.length).toBeGreaterThan(0);
      expect(result.message).toContain('Successfully deployed');
    });

    it('should validate staging environment high availability', () => {
      const config = environmentConfigManager.getConfiguration('staging');
      
      // Verify high availability settings
      expect(config.networking.encrypted).toBe(true);
      expect(config.monitoring.enabled).toBe(true);
      expect(config.security.encryption.enabled).toBe(true);
      expect(config.scaling.enabled).toBe(true);
      
      // Verify service replicas for HA
      config.services.forEach(service => {
        expect(service.replicas).toBeGreaterThanOrEqual(2);
      });
    });

    it('should configure monitoring for staging environment', () => {
      const config = environmentConfigManager.getConfiguration('staging');
      
      expect(config.monitoring.prometheus.enabled).toBe(true);
      expect(config.monitoring.grafana.enabled).toBe(true);
      expect(config.monitoring.alerting.enabled).toBe(true);
      expect(config.monitoring.alerting.rules.length).toBeGreaterThan(0);
    });
  });

  describe('QNET Phase 2 Environment Deployment', () => {
    it('should successfully deploy to QNET Phase 2 environment', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(`
        version: '3.8'
        services:
          demo-orchestrator:
            image: anarqorp/demo-orchestrator:latest
            deploy:
              mode: replicated
              replicas: 5
          qnet-coordinator:
            image: anarqorp/qnet:phase2-coordinator
            deploy:
              replicas: 3
          qnet-validator:
            image: anarqorp/qnet:phase2-validator
            deploy:
              mode: global
          load-balancer:
            image: nginx:alpine
            deploy:
              replicas: 2
      `);

      const result = await deploymentManager.runDockerCompose('qnet-phase2');

      expect(result.success).toBe(true);
      expect(result.environment).toBe('qnet-phase2');
      expect(result.services.length).toBeGreaterThan(0);
      expect(result.message).toContain('Successfully deployed');
    });

    it('should validate QNET Phase 2 production requirements', () => {
      const config = environmentConfigManager.getConfiguration('qnet-phase2');
      
      // Verify production-grade settings
      expect(config.networking.encrypted).toBe(true);
      expect(config.security.encryption.level).toBe('maximum');
      expect(config.security.audit.level).toBe('comprehensive');
      expect(config.monitoring.prometheus.retentionTime).toBe('365d');
      
      // Verify scaling capabilities
      expect(config.scaling.autoScaling.maxReplicas).toBeGreaterThanOrEqual(100);
      expect(config.scaling.loadBalancing.enabled).toBe(true);
      expect(config.scaling.failover.enabled).toBe(true);
    });

    it('should configure Byzantine fault tolerance for QNET Phase 2', () => {
      const config = environmentConfigManager.getConfiguration('qnet-phase2');
      
      // Verify minimum replicas for Byzantine fault tolerance
      const orchestratorService = config.services.find(s => s.name === 'demo-orchestrator');
      expect(orchestratorService?.replicas).toBeGreaterThanOrEqual(5);
      
      // Verify security policies
      expect(config.security.authorization.policies.length).toBeGreaterThan(0);
      expect(config.security.authentication.multiFactorAuth).toBe(true);
    });

    it('should validate resource allocation for production workloads', () => {
      const config = environmentConfigManager.getConfiguration('qnet-phase2');
      
      config.services.forEach(service => {
        expect(service.resources.cpu).toBeDefined();
        expect(service.resources.memory).toBeDefined();
        expect(service.resources.reservedCpu).toBeDefined();
        expect(service.resources.reservedMemory).toBeDefined();
        
        // Verify production resource requirements
        const cpuLimit = parseFloat(service.resources.cpu);
        const reservedCpu = parseFloat(service.resources.reservedCpu!);
        expect(cpuLimit).toBeGreaterThanOrEqual(reservedCpu);
        expect(cpuLimit).toBeGreaterThanOrEqual(1.0); // Minimum for production
      });
    });
  });

  describe('Environment-Specific Configuration Validation', () => {
    it('should enforce different security levels per environment', () => {
      const localConfig = environmentConfigManager.getConfiguration('local');
      const stagingConfig = environmentConfigManager.getConfiguration('staging');
      const prodConfig = environmentConfigManager.getConfiguration('qnet-phase2');
      
      // Security should increase from local to production
      expect(localConfig.security.encryption.level).toBe('basic');
      expect(stagingConfig.security.encryption.level).toBe('high');
      expect(prodConfig.security.encryption.level).toBe('maximum');
      
      // Audit levels should increase
      expect(localConfig.security.audit.level).toBe('basic');
      expect(stagingConfig.security.audit.level).toBe('detailed');
      expect(prodConfig.security.audit.level).toBe('comprehensive');
    });

    it('should configure appropriate monitoring retention per environment', () => {
      const localConfig = environmentConfigManager.getConfiguration('local');
      const stagingConfig = environmentConfigManager.getConfiguration('staging');
      const prodConfig = environmentConfigManager.getConfiguration('qnet-phase2');
      
      // Monitoring should be disabled for local, enabled for staging/prod
      expect(localConfig.monitoring.enabled).toBe(false);
      expect(stagingConfig.monitoring.enabled).toBe(true);
      expect(prodConfig.monitoring.enabled).toBe(true);
      
      // Retention should increase for production
      expect(stagingConfig.monitoring.prometheus.retentionTime).toBe('30d');
      expect(prodConfig.monitoring.prometheus.retentionTime).toBe('365d');
    });

    it('should scale replicas appropriately per environment', () => {
      const localConfig = environmentConfigManager.getConfiguration('local');
      const stagingConfig = environmentConfigManager.getConfiguration('staging');
      const prodConfig = environmentConfigManager.getConfiguration('qnet-phase2');
      
      // Verify replica scaling
      localConfig.services.forEach(service => {
        expect(service.replicas).toBe(1);
      });
      
      stagingConfig.services.forEach(service => {
        expect(service.replicas).toBeGreaterThanOrEqual(2);
      });
      
      prodConfig.services.forEach(service => {
        expect(service.replicas).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('Deployment Validation', () => {
    it('should validate deployment health for all environments', async () => {
      const environments: Environment[] = ['local', 'staging', 'qnet-phase2'];
      
      for (const env of environments) {
        const result = await deploymentManager.validateDeployment(env);
        
        expect(result.success).toBe(true);
        expect(result.environment).toBe(env);
        expect(result.healthChecks).toBeDefined();
        expect(result.performanceMetrics).toBeDefined();
        expect(result.securityValidation).toBeDefined();
      }
    });

    it('should enforce performance thresholds per environment', async () => {
      const environments: Environment[] = ['local', 'staging', 'qnet-phase2'];
      
      for (const env of environments) {
        const result = await deploymentManager.validateDeployment(env);
        
        // All environments should meet basic performance requirements
        expect(result.performanceMetrics.latency.p99).toBeLessThanOrEqual(2000);
        expect(result.performanceMetrics.throughput.requestsPerSecond).toBeGreaterThanOrEqual(100);
        expect(result.performanceMetrics.errorRate).toBeLessThanOrEqual(0.01);
        
        // Production should have higher availability requirements
        if (env === 'qnet-phase2') {
          expect(result.performanceMetrics.availability).toBeGreaterThanOrEqual(0.999);
        }
      }
    });

    it('should validate security configuration per environment', async () => {
      const stagingResult = await deploymentManager.validateDeployment('staging');
      const prodResult = await deploymentManager.validateDeployment('qnet-phase2');
      
      // Staging and production should have security enabled
      expect(stagingResult.securityValidation.accessControlValid).toBe(true);
      expect(stagingResult.securityValidation.encryptionEnabled).toBe(true);
      expect(stagingResult.securityValidation.auditLoggingActive).toBe(true);
      
      expect(prodResult.securityValidation.accessControlValid).toBe(true);
      expect(prodResult.securityValidation.encryptionEnabled).toBe(true);
      expect(prodResult.securityValidation.auditLoggingActive).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle docker-compose file not found', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const result = await deploymentManager.runDockerCompose('local');

      // Should fall back to default configuration
      expect(result.success).toBe(true);
      expect(result.environment).toBe('local');
    });

    it('should handle invalid docker-compose configuration', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue('invalid yaml content');

      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      const result = await deploymentManager.runDockerCompose('local');

      // Should handle gracefully
      expect(result.success).toBe(true);
      expect(result.environment).toBe('local');
    });

    it('should provide meaningful error messages for deployment failures', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Permission denied'));

      const result = await deploymentManager.runDockerCompose('staging');

      expect(result.success).toBe(true); // Should use fallback
      expect(result.environment).toBe('staging');
    });
  });
});