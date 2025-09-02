// Module Dependency Management Interface
import { ModuleStatus } from '../types/index.js';

export interface IDependencyManager {
  /**
   * Resolve dependencies for a module
   * @param moduleId - Module ID to resolve dependencies for
   */
  resolveDependencies(moduleId: string): Promise<DependencyResolution>;

  /**
   * Get startup sequence for all modules
   */
  getStartupSequence(): Promise<StartupSequence>;

  /**
   * Start modules in dependency order
   * @param moduleIds - Optional list of specific modules to start
   */
  startModules(moduleIds?: string[]): Promise<StartupResult>;

  /**
   * Stop modules in reverse dependency order
   * @param moduleIds - Optional list of specific modules to stop
   */
  stopModules(moduleIds?: string[]): Promise<ShutdownResult>;

  /**
   * Handle module failure with graceful degradation
   * @param moduleId - Failed module ID
   * @param error - Failure error
   */
  handleModuleFailure(moduleId: string, error: Error): Promise<FailureHandlingResult>;

  /**
   * Get dependency graph
   */
  getDependencyGraph(): Promise<DependencyGraph>;

  /**
   * Validate dependency configuration
   * @param dependencies - Dependency configuration to validate
   */
  validateDependencies(dependencies: ModuleDependencyConfig[]): Promise<ValidationResult>;

  /**
   * Update module dependencies
   * @param moduleId - Module ID
   * @param dependencies - New dependencies
   */
  updateModuleDependencies(moduleId: string, dependencies: string[]): Promise<void>;
}

export interface DependencyResolution {
  moduleId: string;
  dependencies: ResolvedDependency[];
  startupOrder: number;
  canStart: boolean;
  blockedBy: string[];
  requiredBy: string[];
}

export interface ResolvedDependency {
  dependencyId: string;
  status: ModuleStatus;
  required: boolean;
  optional: boolean;
  version?: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

export interface StartupSequence {
  phases: StartupPhase[];
  totalModules: number;
  estimatedTime: number;
  criticalPath: string[];
}

export interface StartupPhase {
  phase: number;
  modules: string[];
  dependencies: string[];
  canRunInParallel: boolean;
  estimatedTime: number;
}

export interface StartupResult {
  success: boolean;
  startedModules: string[];
  failedModules: ModuleStartupFailure[];
  totalTime: number;
  phases: PhaseResult[];
}

export interface ModuleStartupFailure {
  moduleId: string;
  error: string;
  phase: number;
  dependenciesBlocked: string[];
}

export interface PhaseResult {
  phase: number;
  success: boolean;
  modules: ModulePhaseResult[];
  duration: number;
}

export interface ModulePhaseResult {
  moduleId: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  error?: string;
}

export interface ShutdownResult {
  success: boolean;
  stoppedModules: string[];
  failedToStop: string[];
  totalTime: number;
  gracefulShutdown: boolean;
}

export interface FailureHandlingResult {
  moduleId: string;
  handlingStrategy: FailureStrategy;
  actionsPerformed: string[];
  affectedModules: string[];
  recoveryPossible: boolean;
  fallbacksActivated: string[];
  success: boolean;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  cycles: string[][];
  criticalPath: string[];
  isolatedModules: string[];
}

export interface DependencyNode {
  moduleId: string;
  status: ModuleStatus;
  dependencies: string[];
  dependents: string[];
  level: number;
  critical: boolean;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'required' | 'optional';
  weight: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  type: 'circular-dependency' | 'missing-dependency' | 'invalid-dependency' | 'version-conflict';
  message: string;
  modules: string[];
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  type: 'optional-dependency-missing' | 'performance-impact' | 'deprecated-dependency';
  message: string;
  modules: string[];
}

export interface ModuleDependencyConfig {
  moduleId: string;
  dependencies: DependencySpec[];
  optionalDependencies: DependencySpec[];
  provides: string[];
  conflicts: string[];
}

export interface DependencySpec {
  moduleId: string;
  version?: string;
  required: boolean;
  fallback?: string;
}

export enum FailureStrategy {
  RESTART = 'restart',
  FALLBACK = 'fallback',
  GRACEFUL_DEGRADATION = 'graceful-degradation',
  ISOLATE = 'isolate',
  CASCADE_SHUTDOWN = 'cascade-shutdown'
}

export interface GracefulDegradationConfig {
  moduleId: string;
  fallbackModules: string[];
  degradedCapabilities: string[];
  recoveryActions: RecoveryAction[];
  maxRetries: number;
  retryDelay: number;
}

export interface RecoveryAction {
  type: 'restart' | 'reset-state' | 'clear-cache' | 'reload-config' | 'switch-fallback';
  description: string;
  timeout: number;
  prerequisites: string[];
}

export interface ModuleHealthCheck {
  moduleId: string;
  healthy: boolean;
  dependencies: DependencyHealthCheck[];
  lastCheck: Date;
  responseTime: number;
  error?: string;
}

export interface DependencyHealthCheck {
  dependencyId: string;
  healthy: boolean;
  required: boolean;
  lastCheck: Date;
  error?: string;
}

// Dependency management events
export interface DependencyEvent {
  type: DependencyEventType;
  moduleId: string;
  timestamp: Date;
  data: any;
}

export enum DependencyEventType {
  MODULE_STARTED = 'module-started',
  MODULE_STOPPED = 'module-stopped',
  MODULE_FAILED = 'module-failed',
  DEPENDENCY_RESOLVED = 'dependency-resolved',
  DEPENDENCY_FAILED = 'dependency-failed',
  GRACEFUL_DEGRADATION_ACTIVATED = 'graceful-degradation-activated',
  RECOVERY_INITIATED = 'recovery-initiated',
  RECOVERY_COMPLETED = 'recovery-completed'
}

// Error types
export class DependencyError extends Error {
  constructor(
    message: string,
    public moduleId: string,
    public dependencyId?: string,
    public errorType?: string
  ) {
    super(message);
    this.name = 'DependencyError';
  }
}

export class CircularDependencyError extends DependencyError {
  constructor(
    message: string,
    public cycle: string[]
  ) {
    super(message, cycle[0], undefined, 'circular-dependency');
    this.name = 'CircularDependencyError';
  }
}

export class StartupTimeoutError extends Error {
  constructor(
    message: string,
    public moduleId: string,
    public timeoutMs: number
  ) {
    super(message);
    this.name = 'StartupTimeoutError';
  }
}