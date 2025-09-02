/**
 * DeploymentManager Interface
 * 
 * Manages private repository setup and automated deployment across environments
 * with GitHub API integration and CI/CD pipeline configuration.
 */

export interface DeploymentManager {
  /**
   * Provisions a private repository under the specified organization
   * @param org - Organization name (e.g., 'AnarQorp')
   * @param repoName - Name of the repository to create
   * @returns Promise resolving to repository creation result
   */
  provisionPrivateRepo(org: string, repoName: string): Promise<RepoResult>

  /**
   * Runs docker-compose deployment for specified environment
   * @param env - Target environment for deployment
   * @returns Promise resolving to deployment result
   */
  runDockerCompose(env: Environment): Promise<DeploymentResult>

  /**
   * Performs rollback on deployment failure
   * @returns Promise resolving to rollback result
   */
  rollbackOnFailure(): Promise<RollbackResult>

  /**
   * Validates deployment health and readiness
   * @param env - Environment to validate
   * @returns Promise resolving to validation result
   */
  validateDeployment(env: Environment): Promise<ValidationResult>

  /**
   * Generates comprehensive deployment report
   * @returns Promise resolving to deployment report
   */
  generateDeploymentReport(): Promise<DeploymentReport>

  /**
   * Sets up branch protection rules for the repository
   * @param repoName - Repository name
   * @param rules - Branch protection configuration
   * @returns Promise resolving to protection setup result
   */
  setupBranchProtection(repoName: string, rules: BranchProtectionRules): Promise<ProtectionResult>

  /**
   * Configures CI/CD integration with Kiro pipelines
   * @param repoName - Repository name
   * @param config - CI/CD configuration
   * @returns Promise resolving to CI/CD setup result
   */
  setupCICDIntegration(repoName: string, config: CICDConfig): Promise<CICDResult>
}

export type Environment = 'local' | 'staging' | 'qnet-phase2'

export interface RepoResult {
  success: boolean
  repoUrl: string
  repoId: string
  message: string
  error?: string
}

export interface DeploymentResult {
  success: boolean
  environment: Environment
  services: ServiceStatus[]
  duration: number
  message: string
  error?: string
}

export interface RollbackResult {
  success: boolean
  previousVersion: string
  rollbackDuration: number
  servicesRolledBack: string[]
  message: string
  error?: string
}

export interface ValidationResult {
  success: boolean
  environment: Environment
  healthChecks: HealthCheck[]
  performanceMetrics: PerformanceMetrics
  securityValidation: SecurityValidation
  message: string
  error?: string
}

export interface DeploymentReport {
  deploymentId: string
  timestamp: Date
  environment: Environment
  status: 'success' | 'failure' | 'partial'
  duration: number
  services: ServiceReport[]
  metrics: DeploymentMetrics
  auditTrail: AuditEntry[]
}

export interface ServiceStatus {
  name: string
  status: 'running' | 'stopped' | 'error' | 'starting'
  port?: number
  healthUrl?: string
  version: string
}

export interface HealthCheck {
  service: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime: number
  lastChecked: Date
  details: string
}

export interface PerformanceMetrics {
  latency: {
    p50: number
    p95: number
    p99: number
  }
  throughput: {
    requestsPerSecond: number
    dataProcessedPerSecond: number
  }
  errorRate: number
  availability: number
}

export interface SecurityValidation {
  accessControlValid: boolean
  encryptionEnabled: boolean
  auditLoggingActive: boolean
  vulnerabilities: SecurityVulnerability[]
}

export interface SecurityVulnerability {
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  component: string
  recommendation: string
}

export interface ServiceReport {
  name: string
  status: 'success' | 'failure' | 'degraded'
  startTime: Date
  duration: number
  resourceUsage: ResourceUsage
  logs: LogEntry[]
}

export interface ResourceUsage {
  cpu: number
  memory: number
  disk: number
  network: number
}

export interface LogEntry {
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  service: string
}

export interface DeploymentMetrics {
  totalDuration: number
  servicesDeployed: number
  successRate: number
  resourceUtilization: ResourceUsage
  networkLatency: number
}

export interface AuditEntry {
  timestamp: Date
  action: string
  user: string
  resource: string
  result: 'success' | 'failure'
  details: string
}

export interface BranchProtectionRules {
  requirePullRequest: boolean
  requiredReviews: number
  dismissStaleReviews: boolean
  requireCodeOwnerReviews: boolean
  requireStatusChecks: boolean
  requiredStatusChecks: string[]
  enforceAdmins: boolean
  restrictPushes: boolean
  allowedPushUsers: string[]
}

export interface ProtectionResult {
  success: boolean
  branch: string
  rulesApplied: string[]
  message: string
  error?: string
}

export interface CICDConfig {
  provider: 'github-actions' | 'kiro-pipelines'
  workflows: WorkflowConfig[]
  secrets: SecretConfig[]
  environments: EnvironmentConfig[]
}

export interface WorkflowConfig {
  name: string
  trigger: 'push' | 'pull_request' | 'schedule' | 'manual'
  branches?: string[]
  schedule?: string
  steps: WorkflowStep[]
}

export interface WorkflowStep {
  name: string
  action: string
  parameters: Record<string, any>
  condition?: string
}

export interface SecretConfig {
  name: string
  description: string
  required: boolean
}

export interface EnvironmentConfig {
  name: Environment
  protection: boolean
  reviewers?: string[]
  secrets: string[]
}

export interface CICDResult {
  success: boolean
  workflowsCreated: string[]
  secretsConfigured: string[]
  environmentsSetup: string[]
  message: string
  error?: string
}