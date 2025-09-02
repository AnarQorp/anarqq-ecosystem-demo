// Core type definitions for the AnarQ&Q Ecosystem Demo

export type Environment = 'local' | 'staging' | 'qnet-phase2';
export type ScenarioType = 'identity' | 'content' | 'dao' | 'social';
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failure' | 'partial';
export type ModuleStatus = 'active' | 'inactive' | 'error';
export type Language = 'en' | 'es';
export type DocumentationType = 'setup' | 'workflow' | 'troubleshooting' | 'api' | 'integration';

// Core execution result types
export interface ScenarioResult {
  scenarioId: string;
  status: ExecutionStatus;
  duration: number;
  auditCid: string;
  qerberosSignature: string;
  moduleResults: ModuleResult[];
  timestamp: Date;
}

export interface ModuleResult {
  moduleId: string;
  status: ModuleStatus;
  duration: number;
  error?: string;
  metrics?: Record<string, number>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  performanceMetrics: PerformanceMetrics;
  decentralizationMetrics: DecentralizationMetrics;
}

export interface PerformanceMetrics {
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    dataProcessedPerSecond: number;
  };
  errorRate: number;
  availability: number;
}

export interface DecentralizationMetrics {
  nodeCount: number;
  geographicDistribution: string[];
  consensusHealth: number;
  networkPartitionTolerance: boolean;
  singlePointsOfFailure: string[];
}

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  modules: Record<string, ModuleStatus>;
  network: 'connected' | 'degraded' | 'disconnected';
  lastCheck: Date;
}

export interface DemoReport {
  executionId: string;
  environment: Environment;
  scenarios: ScenarioResult[];
  overallStatus: ExecutionStatus;
  totalDuration: number;
  validationResults: ValidationResult;
  generatedAt: Date;
}

// Configuration types
export interface EnvironmentConfig {
  environment: Environment;
  modules: ModuleConfig[];
  network: NetworkConfig;
  validation: ValidationConfig;
}

export interface ModuleConfig {
  id: string;
  name: string;
  version: string;
  endpoint: string;
  enabled: boolean;
  dependencies: string[];
}

export interface NetworkConfig {
  qnetPhase2: {
    enabled: boolean;
    minNodes: number;
    scalingThresholds: {
      cpuThreshold: number;
      memoryThreshold: number;
      networkLatencyThreshold: number;
    };
  };
  piNetwork: {
    enabled: boolean;
    testnet: boolean;
    contractAddresses: Record<string, string>;
  };
  ipfs: {
    gateway: string;
    api: string;
    timeout: number;
  };
}

export interface ValidationConfig {
  performanceGate: {
    maxLatency: number;
    minThroughput: number;
    maxErrorRate: number;
  };
  decentralizationGate: {
    minNodes: number;
    maxSinglePointFailures: number;
    minGeographicDistribution: number;
  };
  integrityGate: {
    dataIntegrityCheck: boolean;
    auditTrailCompleteness: boolean;
    qerberosSignatureValidation: boolean;
  };
}

// Documentation generation types
export interface DocumentationConfig {
  outputDirectory: string;
  templateDirectory: string;
  languages: Language[];
  defaultLanguage: Language;
  validation: {
    enableSpellCheck: boolean;
    enableGrammarCheck: boolean;
    enableLinkValidation: boolean;
  };
}

export interface DocumentationTemplate {
  id: string;
  name: string;
  type: DocumentationType;
  templatePath: string;
  outputPath: string;
  variables: Record<string, any>;
  translations: Record<Language, Record<string, string>>;
}

export interface DocumentationResult {
  templateId: string;
  language: Language;
  content: string;
  outputPath: string;
  generatedAt: Date;
  wordCount: number;
  validationResult?: DocumentationValidationResult;
}

export interface DocumentationValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics: {
    readabilityScore: number;
    completenessScore: number;
    accuracyScore: number;
  };
}

export interface ValidationError {
  type: 'spelling' | 'grammar' | 'link' | 'structure' | 'translation';
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  type: 'style' | 'readability' | 'completeness';
  message: string;
  suggestion?: string;
  line?: number;
  column?: number;
}