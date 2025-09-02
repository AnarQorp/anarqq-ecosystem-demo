// Error handling interfaces for the AnarQ&Q Ecosystem Demo

export type ErrorCategory = 'module' | 'dataflow' | 'pinetwork' | 'performance' | 'network' | 'security' | 'validation';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ResolutionStrategy = 'retry' | 'fallback' | 'abort' | 'escalate' | 'degrade';
export type EscalationLevel = 'warning' | 'error' | 'critical' | 'emergency';

// Base error interface
export interface BaseError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  timestamp: Date;
  context: Record<string, any>;
  stackTrace?: string;
  correlationId?: string;
}

// Specific error types
export interface ModuleError extends BaseError {
  category: 'module';
  moduleId: string;
  endpoint?: string;
  apiVersion?: string;
  errorCode?: string;
}

export interface DataFlowError extends BaseError {
  category: 'dataflow';
  flowId: string;
  step: string;
  inputData?: any;
  processingStage: 'compression' | 'encryption' | 'indexing' | 'storage' | 'retrieval' | 'decompression' | 'decryption';
}

export interface PiNetworkError extends BaseError {
  category: 'pinetwork';
  piUserId?: string;
  contractAddress?: string;
  transactionId?: string;
  networkType: 'mainnet' | 'testnet';
}

export interface PerformanceError extends BaseError {
  category: 'performance';
  metric: 'latency' | 'throughput' | 'errorRate' | 'availability';
  threshold: number;
  actualValue: number;
  duration: number;
}

export interface NetworkError extends BaseError {
  category: 'network';
  nodeId?: string;
  networkType: 'qnet' | 'ipfs' | 'pi';
  connectionStatus: 'timeout' | 'refused' | 'unreachable' | 'degraded';
}

export interface SecurityError extends BaseError {
  category: 'security';
  securityType: 'authentication' | 'authorization' | 'signature' | 'audit' | 'encryption';
  userId?: string;
  resourceId?: string;
}

export interface ValidationError extends BaseError {
  category: 'validation';
  validationType: 'integrity' | 'decentralization' | 'performance' | 'audit';
  expectedValue?: any;
  actualValue?: any;
}

export type DemoError = ModuleError | DataFlowError | PiNetworkError | PerformanceError | NetworkError | SecurityError | ValidationError;

// Error resolution interfaces
export interface ErrorResolution {
  strategy: ResolutionStrategy;
  retryCount?: number;
  maxRetries?: number;
  retryDelay?: number;
  fallbackAction?: string;
  escalationLevel?: EscalationLevel;
  userMessage: string;
  technicalMessage?: string;
  resolutionSteps?: string[];
  estimatedRecoveryTime?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface FallbackConfig {
  action: string;
  parameters: Record<string, any>;
  timeout: number;
  successCriteria: string[];
}

export interface EscalationConfig {
  level: EscalationLevel;
  notificationChannels: string[];
  escalationDelay: number;
  autoEscalate: boolean;
}

// Error handling results
export interface ErrorHandlingResult {
  success: boolean;
  resolution: ErrorResolution;
  executionTime: number;
  finalStatus: 'resolved' | 'escalated' | 'failed';
  attempts: ErrorAttempt[];
  metadata: Record<string, any>;
}

export interface ErrorAttempt {
  attemptNumber: number;
  strategy: ResolutionStrategy;
  timestamp: Date;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

// Error monitoring interfaces
export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  resolutionRate: number;
  averageResolutionTime: number;
  escalationRate: number;
  timeWindow: {
    start: Date;
    end: Date;
  };
}

export interface ErrorAlert {
  id: string;
  error: DemoError;
  severity: ErrorSeverity;
  escalationLevel: EscalationLevel;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolutionSummary?: string;
}

export interface AlertingConfig {
  enabled: boolean;
  channels: AlertChannel[];
  thresholds: AlertThresholds;
  escalationRules: EscalationRule[];
}

export interface AlertChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'console';
  config: Record<string, any>;
  enabled: boolean;
  severityFilter: ErrorSeverity[];
}

export interface AlertThresholds {
  errorRate: {
    warning: number;
    critical: number;
    timeWindow: number;
  };
  escalationRate: {
    warning: number;
    critical: number;
    timeWindow: number;
  };
  resolutionTime: {
    warning: number;
    critical: number;
  };
}

export interface EscalationRule {
  condition: string;
  delay: number;
  targetLevel: EscalationLevel;
  actions: string[];
}

// Main error handler interface
export interface IErrorHandler {
  // Error processing
  handleError(error: DemoError): Promise<ErrorHandlingResult>;
  handleModuleError(error: ModuleError): Promise<ErrorHandlingResult>;
  handleDataFlowError(error: DataFlowError): Promise<ErrorHandlingResult>;
  handlePiNetworkError(error: PiNetworkError): Promise<ErrorHandlingResult>;
  handlePerformanceError(error: PerformanceError): Promise<ErrorHandlingResult>;
  handleNetworkError(error: NetworkError): Promise<ErrorHandlingResult>;
  handleSecurityError(error: SecurityError): Promise<ErrorHandlingResult>;
  handleValidationError(error: ValidationError): Promise<ErrorHandlingResult>;

  // Error resolution strategies
  executeRetryStrategy(error: DemoError, config: RetryConfig): Promise<ErrorHandlingResult>;
  executeFallbackStrategy(error: DemoError, config: FallbackConfig): Promise<ErrorHandlingResult>;
  executeEscalationStrategy(error: DemoError, config: EscalationConfig): Promise<ErrorHandlingResult>;

  // Error monitoring
  getErrorMetrics(timeWindow?: { start: Date; end: Date }): Promise<ErrorMetrics>;
  getActiveAlerts(): Promise<ErrorAlert[]>;
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void>;
  resolveAlert(alertId: string, resolutionSummary: string): Promise<void>;

  // Configuration
  updateRetryConfig(category: ErrorCategory, config: RetryConfig): Promise<void>;
  updateFallbackConfig(category: ErrorCategory, config: FallbackConfig): Promise<void>;
  updateEscalationConfig(category: ErrorCategory, config: EscalationConfig): Promise<void>;
  updateAlertingConfig(config: AlertingConfig): Promise<void>;

  // Health and status
  getHandlerHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: Record<string, any> }>;
  getErrorHistory(category?: ErrorCategory, limit?: number): Promise<DemoError[]>;
}

// Error monitoring interface
export interface IErrorMonitor {
  // Real-time monitoring
  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
  isMonitoring(): boolean;

  // Error detection
  detectErrors(): Promise<DemoError[]>;
  classifyError(error: any): DemoError;
  calculateSeverity(error: DemoError): ErrorSeverity;

  // Alerting
  sendAlert(alert: ErrorAlert): Promise<void>;
  processAlerts(): Promise<void>;
  checkEscalationRules(): Promise<void>;

  // Metrics collection
  collectMetrics(): Promise<ErrorMetrics>;
  updateMetrics(error: DemoError, resolution: ErrorHandlingResult): Promise<void>;

  // Event handling
  onError(callback: (error: DemoError) => void): void;
  onAlert(callback: (alert: ErrorAlert) => void): void;
  onResolution(callback: (error: DemoError, result: ErrorHandlingResult) => void): void;
}

// Error context builder
export interface IErrorContext {
  buildModuleContext(moduleId: string, endpoint?: string): Record<string, any>;
  buildDataFlowContext(flowId: string, step: string, data?: any): Record<string, any>;
  buildPiNetworkContext(piUserId?: string, contractAddress?: string): Record<string, any>;
  buildPerformanceContext(metric: string, value: number, threshold: number): Record<string, any>;
  buildNetworkContext(nodeId?: string, networkType?: string): Record<string, any>;
  buildSecurityContext(userId?: string, resourceId?: string): Record<string, any>;
  buildValidationContext(validationType: string, expected?: any, actual?: any): Record<string, any>;
}