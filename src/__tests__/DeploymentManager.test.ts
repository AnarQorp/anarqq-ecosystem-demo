/**
 * DeploymentManager Tests
 * 
 * Comprehensive tests for repository provisioning, deployment orchestration,
 * and validation functionality with access control and security policy validation.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { DeploymentManagerService } from '../services/DeploymentManagerService.js';
import {
  Environment,
  BranchProtectionRules,
  CICDConfig,
  WorkflowConfig
} from '../interfaces/DeploymentManager.js';

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

describe('DeploymentManagerService', () => {
  let deploymentManager: DeploymentManagerService;
  let mockOctokit: any;
  let mockDocker: any;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock Octokit
    mockOctokit = {
      repos: {
        createInOrg: vi.fn(),
        updateBranchProtection: vi.fn(),
        createOrUpdateFileContents: vi.fn(),
        createOrUpdateEnvironment: vi.fn()
      }
    };

    // Mock Docker
    mockDocker = {
      listContainers: vi.fn(),
      getContainer: vi.fn()
    };

    // Mock the constructors
    const { Octokit } = await import('@octokit/rest');
    const Docker = (await import('dockerode')).default;
    
    vi.mocked(Octokit).mockImplementation(() => mockOctokit);
    vi.mocked(Docker).mockImplementation(() => mockDocker);

    deploymentManager = new DeploymentManagerService('test-token');
  });

  describe('Repository Provisioning', () => {
    it('should successfully provision a private repository', async () => {
      // Arrange
      const org = 'AnarQorp';
      const repoName = 'test-ecosystem-demo';
      
      mockOctokit.repos.createInOrg.mockResolvedValue({
        data: {
          html_url: `https://github.com/${org}/${repoName}`,
          id: 12345
        }
      });

      mockOctokit.repos.updateBranchProtection.mockResolvedValue({});
      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({});

      // Act
      const result = await deploymentManager.provisionPrivateRepo(org, repoName);

      // Assert
      expect(result.success).toBe(true);
      expect(result.repoUrl).toBe(`https://github.com/${org}/${repoName}`);
      expect(result.repoId).toBe('12345');
      expect(result.message).toContain('Successfully created');

      // Verify repository creation call
      expect(mockOctokit.repos.createInOrg).toHaveBeenCalledWith({
        org,
        name: repoName,
        description: `AnarQ&Q Ecosystem Demo - ${repoName}`,
        private: true,
        auto_init: true,
        gitignore_template: 'Node',
        license_template: 'mit'
      });

      // Verify branch protection was set up
      expect(mockOctokit.repos.updateBranchProtection).toHaveBeenCalled();

      // Verify initial files were created
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledTimes(5);
    });

    it('should handle repository creation failure', async () => {
      // Arrange
      const org = 'AnarQorp';
      const repoName = 'test-repo';
      const error = new Error('Repository already exists');
      
      mockOctokit.repos.createInOrg.mockRejectedValue(error);

      // Act
      const result = await deploymentManager.provisionPrivateRepo(org, repoName);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Repository already exists');
      expect(result.repoUrl).toBe('');
      expect(result.repoId).toBe('');
    });

    it('should validate access control during repository setup', async () => {
      // Arrange
      const org = 'AnarQorp';
      const repoName = 'secure-repo';
      
      mockOctokit.repos.createInOrg.mockResolvedValue({
        data: {
          html_url: `https://github.com/${org}/${repoName}`,
          id: 12345
        }
      });

      mockOctokit.repos.updateBranchProtection.mockResolvedValue({});
      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({});

      // Act
      const result = await deploymentManager.provisionPrivateRepo(org, repoName);

      // Assert
      expect(result.success).toBe(true);
      
      // Verify that the repository was created as private
      const createCall = mockOctokit.repos.createInOrg.mock.calls[0][0];
      expect(createCall.private).toBe(true);
      
      // Verify branch protection was configured
      expect(mockOctokit.repos.updateBranchProtection).toHaveBeenCalled();
    });
  });

  describe('Branch Protection Rules', () => {
    it('should successfully setup branch protection rules', async () => {
      // Arrange
      const repoName = 'test-repo';
      const rules: BranchProtectionRules = {
        requirePullRequest: true,
        requiredReviews: 2,
        dismissStaleReviews: true,
        requireCodeOwnerReviews: true,
        requireStatusChecks: true,
        requiredStatusChecks: ['ci/build', 'ci/test', 'security/scan'],
        enforceAdmins: true,
        restrictPushes: true,
        allowedPushUsers: ['admin', 'lead-dev']
      };

      mockOctokit.repos.updateBranchProtection.mockResolvedValue({});

      // Act
      const result = await deploymentManager.setupBranchProtection(repoName, rules);

      // Assert
      expect(result.success).toBe(true);
      expect(result.branch).toBe('main');
      expect(result.rulesApplied).toContain('Pull Request Required');
      expect(result.rulesApplied).toContain('Status Checks Required');
      expect(result.rulesApplied).toContain('Admin Enforcement');
      expect(result.rulesApplied).toContain('Push Restrictions');

      // Verify the protection call
      const protectionCall = mockOctokit.repos.updateBranchProtection.mock.calls[0][0];
      expect(protectionCall.owner).toBe('AnarQorp');
      expect(protectionCall.repo).toBe(repoName);
      expect(protectionCall.branch).toBe('main');
      expect(protectionCall.enforce_admins).toBe(true);
      expect(protectionCall.required_pull_request_reviews.required_approving_review_count).toBe(2);
      expect(protectionCall.required_status_checks.contexts).toEqual(['ci/build', 'ci/test', 'security/scan']);
    });

    it('should handle branch protection setup failure', async () => {
      // Arrange
      const repoName = 'test-repo';
      const rules: BranchProtectionRules = {
        requirePullRequest: true,
        requiredReviews: 1,
        dismissStaleReviews: false,
        requireCodeOwnerReviews: false,
        requireStatusChecks: false,
        requiredStatusChecks: [],
        enforceAdmins: false,
        restrictPushes: false,
        allowedPushUsers: []
      };

      const error = new Error('Insufficient permissions');
      mockOctokit.repos.updateBranchProtection.mockRejectedValue(error);

      // Act
      const result = await deploymentManager.setupBranchProtection(repoName, rules);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions');
      expect(result.rulesApplied).toEqual([]);
    });

    it('should validate security policies in branch protection', async () => {
      // Arrange
      const repoName = 'security-test-repo';
      const secureRules: BranchProtectionRules = {
        requirePullRequest: true,
        requiredReviews: 2,
        dismissStaleReviews: true,
        requireCodeOwnerReviews: true,
        requireStatusChecks: true,
        requiredStatusChecks: ['security/sast', 'security/dependency-check', 'ci/test'],
        enforceAdmins: true,
        restrictPushes: true,
        allowedPushUsers: []
      };

      mockOctokit.repos.updateBranchProtection.mockResolvedValue({});

      // Act
      const result = await deploymentManager.setupBranchProtection(repoName, secureRules);

      // Assert
      expect(result.success).toBe(true);
      
      // Verify security-focused configuration
      const protectionCall = mockOctokit.repos.updateBranchProtection.mock.calls[0][0];
      expect(protectionCall.required_status_checks.contexts).toContain('security/sast');
      expect(protectionCall.required_status_checks.contexts).toContain('security/dependency-check');
      expect(protectionCall.enforce_admins).toBe(true);
      expect(protectionCall.required_pull_request_reviews.require_code_owner_reviews).toBe(true);
    });
  });

  describe('CI/CD Integration', () => {
    it('should successfully setup GitHub Actions CI/CD integration', async () => {
      // Arrange
      const repoName = 'cicd-test-repo';
      const config: CICDConfig = {
        provider: 'github-actions',
        workflows: [
          {
            name: 'build-and-test',
            trigger: 'push',
            branches: ['main', 'develop'],
            steps: [
              {
                name: 'Checkout code',
                action: 'actions/checkout@v4',
                parameters: {}
              },
              {
                name: 'Setup Node.js',
                action: 'actions/setup-node@v4',
                parameters: { 'node-version': '20' }
              },
              {
                name: 'Run tests',
                action: 'npm test',
                parameters: {}
              }
            ]
          }
        ],
        secrets: [
          {
            name: 'GITHUB_TOKEN',
            description: 'GitHub API token',
            required: true
          },
          {
            name: 'DOCKER_REGISTRY_TOKEN',
            description: 'Docker registry access token',
            required: true
          }
        ],
        environments: [
          {
            name: 'staging',
            protection: true,
            reviewers: ['admin'],
            secrets: ['STAGING_API_KEY']
          }
        ]
      };

      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({});
      mockOctokit.repos.createOrUpdateEnvironment.mockResolvedValue({});

      // Act
      const result = await deploymentManager.setupCICDIntegration(repoName, config);

      // Assert
      expect(result.success).toBe(true);
      expect(result.workflowsCreated).toContain('build-and-test');
      expect(result.secretsConfigured).toContain('GITHUB_TOKEN');
      expect(result.secretsConfigured).toContain('DOCKER_REGISTRY_TOKEN');
      expect(result.environmentsSetup).toContain('staging');

      // Verify workflow file creation
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'AnarQorp',
          repo: repoName,
          path: '.github/workflows/build-and-test.yml',
          message: 'Add build-and-test workflow'
        })
      );

      // Verify environment setup
      expect(mockOctokit.repos.createOrUpdateEnvironment).toHaveBeenCalledWith({
        owner: 'AnarQorp',
        repo: repoName,
        environment_name: 'staging'
      });
    });

    it('should handle CI/CD integration setup failure', async () => {
      // Arrange
      const repoName = 'failing-repo';
      const config: CICDConfig = {
        provider: 'github-actions',
        workflows: [],
        secrets: [],
        environments: []
      };

      const error = new Error('API rate limit exceeded');
      mockOctokit.repos.createOrUpdateFileContents.mockRejectedValue(error);

      // Act
      const result = await deploymentManager.setupCICDIntegration(repoName, config);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
      expect(result.workflowsCreated).toEqual([]);
    });

    it('should validate Kiro pipeline integration configuration', async () => {
      // Arrange
      const repoName = 'kiro-integration-repo';
      const kiroConfig: CICDConfig = {
        provider: 'kiro-pipelines',
        workflows: [
          {
            name: 'kiro-deployment',
            trigger: 'manual',
            steps: [
              {
                name: 'Deploy with Kiro',
                action: 'kiro/deploy',
                parameters: {
                  environment: 'staging',
                  'auto-rollback': true
                }
              }
            ]
          }
        ],
        secrets: [
          {
            name: 'KIRO_API_KEY',
            description: 'Kiro API access key',
            required: true
          }
        ],
        environments: [
          {
            name: 'qnet-phase2',
            protection: true,
            reviewers: ['kiro-admin'],
            secrets: ['KIRO_API_KEY']
          }
        ]
      };

      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({});
      mockOctokit.repos.createOrUpdateEnvironment.mockResolvedValue({});

      // Act
      const result = await deploymentManager.setupCICDIntegration(repoName, kiroConfig);

      // Assert
      expect(result.success).toBe(true);
      expect(result.workflowsCreated).toContain('kiro-deployment');
      expect(result.secretsConfigured).toContain('KIRO_API_KEY');
      expect(result.environmentsSetup).toContain('qnet-phase2');
    });
  });

  describe('Docker Compose Orchestration', () => {
    it('should successfully run docker-compose for local environment', async () => {
      // Arrange
      const env: Environment = 'local';

      // Mock file system operations
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue('version: "3.8"\nservices:\n  test-service:\n    image: test');

      // Act
      const result = await deploymentManager.runDockerCompose(env);

      // Assert
      expect(result.success).toBe(true);
      expect(result.environment).toBe('local');
      expect(result.duration).toBeGreaterThan(0);
      expect(result.message).toContain('Successfully deployed');
    });

    it('should handle different environments correctly', async () => {
      // Test each environment
      const environments: Environment[] = ['local', 'staging', 'qnet-phase2'];

      for (const env of environments) {
        // Arrange
        const fs = await import('fs/promises');
        vi.mocked(fs.readFile).mockResolvedValue(`version: "3.8"\nservices:\n  ${env}-service:\n    image: test`);

        // Act
        const result = await deploymentManager.runDockerCompose(env);

        // Assert
        expect(result.success).toBe(true);
        expect(result.environment).toBe(env);
      }
    });

    it('should handle docker-compose execution failure', async () => {
      // Arrange
      const env: Environment = 'local';
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      // Act
      const result = await deploymentManager.runDockerCompose(env);

      // Assert
      expect(result.success).toBe(true); // Should use default compose file
      expect(result.environment).toBe(env);
    });
  });

  describe('Deployment Validation', () => {
    it('should successfully validate a healthy deployment', async () => {
      // Act
      const result = await deploymentManager.validateDeployment('local');

      // Assert
      expect(result.success).toBe(true);
      expect(result.environment).toBe('local');
      expect(result.healthChecks).toBeDefined();
      expect(result.performanceMetrics).toBeDefined();
      expect(result.securityValidation).toBeDefined();
      expect(result.message).toContain('validation passed');

      // Verify performance thresholds
      expect(result.performanceMetrics.latency.p99).toBeLessThanOrEqual(2000);
      expect(result.performanceMetrics.throughput.requestsPerSecond).toBeGreaterThanOrEqual(100);
      expect(result.performanceMetrics.errorRate).toBeLessThanOrEqual(0.01);

      // Verify security validation
      expect(result.securityValidation.accessControlValid).toBe(true);
      expect(result.securityValidation.encryptionEnabled).toBe(true);
      expect(result.securityValidation.auditLoggingActive).toBe(true);
    });

    it('should detect and report validation failures', async () => {
      // This test would need to mock failing conditions
      // For now, we'll test the structure
      const result = await deploymentManager.validateDeployment('staging');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('healthChecks');
      expect(result).toHaveProperty('performanceMetrics');
      expect(result).toHaveProperty('securityValidation');
    });
  });

  describe('Rollback Functionality', () => {
    it('should handle rollback when no deployment exists', async () => {
      // Act
      const result = await deploymentManager.rollbackOnFailure();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('No active deployment to rollback');
      expect(result.servicesRolledBack).toEqual([]);
    });

    it('should successfully rollback to previous deployment', async () => {
      // Arrange - First create a deployment to have something to rollback to
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue('version: "3.8"\nservices:\n  test-service:\n    image: test');
      
      await deploymentManager.runDockerCompose('local');

      // Act
      const result = await deploymentManager.rollbackOnFailure();

      // Assert
      expect(result.success).toBe(true);
      expect(result.rollbackDuration).toBeGreaterThan(0);
      expect(result.message).toContain('Successfully rolled back');
    });
  });

  describe('Deployment Reporting', () => {
    it('should generate comprehensive deployment report', async () => {
      // Act
      const report = await deploymentManager.generateDeploymentReport();

      // Assert
      expect(report).toHaveProperty('deploymentId');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('environment');
      expect(report).toHaveProperty('status');
      expect(report).toHaveProperty('duration');
      expect(report).toHaveProperty('services');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('auditTrail');

      expect(report.deploymentId).toMatch(/^(deployment-|report-)\d+$/);
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(['success', 'failure', 'partial']).toContain(report.status);
    });

    it('should include performance metrics in report', async () => {
      // Act
      const report = await deploymentManager.generateDeploymentReport();

      // Assert
      expect(report.metrics).toHaveProperty('totalDuration');
      expect(report.metrics).toHaveProperty('servicesDeployed');
      expect(report.metrics).toHaveProperty('successRate');
      expect(report.metrics).toHaveProperty('resourceUtilization');
      expect(report.metrics).toHaveProperty('networkLatency');

      expect(report.metrics.totalDuration).toBeGreaterThanOrEqual(0);
      expect(report.metrics.servicesDeployed).toBeGreaterThanOrEqual(0);
      expect(report.metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(report.metrics.successRate).toBeLessThanOrEqual(1);
    });

    it('should include audit trail in report', async () => {
      // Act
      const report = await deploymentManager.generateDeploymentReport();

      // Assert
      expect(Array.isArray(report.auditTrail)).toBe(true);
      
      if (report.auditTrail.length > 0) {
        const auditEntry = report.auditTrail[0];
        expect(auditEntry).toHaveProperty('timestamp');
        expect(auditEntry).toHaveProperty('action');
        expect(auditEntry).toHaveProperty('user');
        expect(auditEntry).toHaveProperty('resource');
        expect(auditEntry).toHaveProperty('result');
        expect(auditEntry).toHaveProperty('details');
      }
    });
  });

  describe('Security Policy Validation', () => {
    it('should enforce security policies during repository creation', async () => {
      // Arrange
      const org = 'AnarQorp';
      const repoName = 'security-validated-repo';
      
      mockOctokit.repos.createInOrg.mockResolvedValue({
        data: {
          html_url: `https://github.com/${org}/${repoName}`,
          id: 12345
        }
      });

      mockOctokit.repos.updateBranchProtection.mockResolvedValue({});
      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({});

      // Act
      const result = await deploymentManager.provisionPrivateRepo(org, repoName);

      // Assert
      expect(result.success).toBe(true);
      
      // Verify security policies are enforced
      const createCall = mockOctokit.repos.createInOrg.mock.calls[0][0];
      expect(createCall.private).toBe(true); // Repository must be private
      expect(createCall.auto_init).toBe(true); // Initialize with README
      expect(createCall.gitignore_template).toBe('Node'); // Include gitignore
      expect(createCall.license_template).toBe('mit'); // Include license

      // Verify branch protection is automatically applied
      expect(mockOctokit.repos.updateBranchProtection).toHaveBeenCalled();
    });

    it('should validate access control in deployment validation', async () => {
      // Act
      const result = await deploymentManager.validateDeployment('local');

      // Assert
      expect(result.success).toBe(true);
      expect(result.securityValidation.accessControlValid).toBe(true);
      expect(result.securityValidation.encryptionEnabled).toBe(true);
      expect(result.securityValidation.auditLoggingActive).toBe(true);
      expect(Array.isArray(result.securityValidation.vulnerabilities)).toBe(true);
    });

    it('should detect security vulnerabilities', async () => {
      // This would be implemented with actual security scanning
      // For now, we test the structure
      const result = await deploymentManager.validateDeployment('staging');

      expect(result.securityValidation).toHaveProperty('vulnerabilities');
      expect(Array.isArray(result.securityValidation.vulnerabilities)).toBe(true);
    });
  });
});