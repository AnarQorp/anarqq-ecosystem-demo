// Module Integration Interface for AnarQ&Q Ecosystem Demo
import { ModuleStatus, PerformanceMetrics } from '../types/index.js';

export interface IModuleIntegration {
  /**
   * Register a module in the system
   * @param module - Module configuration to register
   */
  registerModule(module: ModuleRegistration): Promise<ModuleRegistrationResult>;

  /**
   * Discover and auto-register available modules
   */
  discoverModules(): Promise<ModuleDiscoveryResult>;

  /**
   * Get health status of a specific module
   * @param moduleId - ID of the module to check
   */
  getModuleHealth(moduleId: string): Promise<HealthCheckResult>;

  /**
   * Get health status of all registered modules
   */
  getAllModulesHealth(): Promise<Record<string, HealthCheckResult>>;

  /**
   * Start health monitoring for all modules
   */
  startHealthMonitoring(): Promise<void>;

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): Promise<void>;

  /**
   * Get list of all registered modules
   */
  getRegisteredModules(): Promise<ModuleInfo[]>;

  /**
   * Unregister a module
   * @param moduleId - ID of the module to unregister
   */
  unregisterModule(moduleId: string): Promise<void>;

  /**
   * Attempt to recover a failed module
   * @param moduleId - ID of the module to recover
   */
  recoverModule(moduleId: string): Promise<ModuleRecoveryResult>;

  /**
   * Call a specific method on a module
   * @param moduleId - ID of the module
   * @param method - Method name to call
   * @param params - Parameters to pass to the method
   */
  callModuleMethod(moduleId: string, method: string, params?: any): Promise<any>;
}

export interface ModuleRegistration {
  id: string;
  name: string;
  version: string;
  endpoint: string;
  healthCheckEndpoint: string;
  dependencies: string[];
  metadata: ModuleMetadata;
}

export interface ModuleMetadata {
  description: string;
  category: 'identity' | 'security' | 'storage' | 'communication' | 'automation' | 'network' | 'commerce';
  capabilities: string[];
  requiredEnvironment: string[];
}

export interface ModuleRegistrationResult {
  success: boolean;
  moduleId: string;
  error?: string;
  warnings: string[];
}

export interface ModuleDiscoveryResult {
  discovered: ModuleRegistration[];
  registered: string[];
  failed: Array<{
    endpoint: string;
    error: string;
  }>;
}

export interface HealthCheckResult {
  moduleId: string;
  status: ModuleStatus;
  lastCheck: Date;
  responseTime: number;
  error?: string;
  metrics: ModuleHealthMetrics;
  dependencies: DependencyHealth[];
}

export interface ModuleHealthMetrics {
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  requestCount: number;
  errorCount: number;
  lastError?: string;
}

export interface DependencyHealth {
  dependencyId: string;
  status: ModuleStatus;
  lastCheck: Date;
}

export interface ModuleInfo {
  id: string;
  name: string;
  version: string;
  endpoint: string;
  status: ModuleStatus;
  registeredAt: Date;
  lastHealthCheck: Date;
  metadata: ModuleMetadata;
}

export interface ModuleRecoveryResult {
  success: boolean;
  moduleId: string;
  recoveryActions: string[];
  error?: string;
  newStatus: ModuleStatus;
}

export interface ModuleEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  authenticated: boolean;
}

// Core module definitions for the 14 AnarQ&Q modules
export const CORE_MODULES = {
  SQUID: 'squid',
  QLOCK: 'qlock', 
  QONSENT: 'qonsent',
  QINDEX: 'qindex',
  QERBEROS: 'qerberos',
  QWALLET: 'qwallet',
  QFLOW: 'qflow',
  QNET: 'qnet',
  QDRIVE: 'qdrive',
  QPIC: 'qpic',
  QMARKET: 'qmarket',
  QMAIL: 'qmail',
  QCHAT: 'qchat',
  QSOCIAL: 'qsocial'
} as const;

export type CoreModuleId = typeof CORE_MODULES[keyof typeof CORE_MODULES];