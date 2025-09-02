// Module Communication Interface for standardized inter-module communication
import { ModuleStatus } from '../types/index.js';

export interface IModuleCommunication {
  /**
   * Send a request to a specific module
   * @param moduleId - Target module ID
   * @param endpoint - Module endpoint path
   * @param method - HTTP method
   * @param data - Request payload
   * @param options - Request options
   */
  sendRequest<T = any>(
    moduleId: string,
    endpoint: string,
    method: HttpMethod,
    data?: any,
    options?: RequestOptions
  ): Promise<ModuleResponse<T>>;

  /**
   * Broadcast a message to multiple modules
   * @param moduleIds - Target module IDs
   * @param message - Message to broadcast
   * @param options - Broadcast options
   */
  broadcast<T = any>(
    moduleIds: string[],
    message: BroadcastMessage,
    options?: BroadcastOptions
  ): Promise<BroadcastResult<T>>;

  /**
   * Subscribe to module events
   * @param moduleId - Source module ID
   * @param eventType - Event type to subscribe to
   * @param callback - Event handler callback
   */
  subscribe(
    moduleId: string,
    eventType: string,
    callback: EventCallback
  ): Promise<SubscriptionResult>;

  /**
   * Unsubscribe from module events
   * @param subscriptionId - Subscription ID to cancel
   */
  unsubscribe(subscriptionId: string): Promise<void>;

  /**
   * Get communication statistics
   */
  getStats(): Promise<CommunicationStats>;

  /**
   * Initialize authentication with Qerberos
   * @param qerberosEndpoint - Qerberos service endpoint
   * @param credentials - Authentication credentials
   */
  initializeAuth(qerberosEndpoint: string, credentials: AuthCredentials): Promise<void>;
}

export interface IAPIGateway {
  /**
   * Register a module endpoint with the gateway
   * @param moduleId - Module ID
   * @param config - Module configuration
   */
  registerModule(moduleId: string, config: ModuleGatewayConfig): Promise<void>;

  /**
   * Unregister a module from the gateway
   * @param moduleId - Module ID to unregister
   */
  unregisterModule(moduleId: string): Promise<void>;

  /**
   * Route a request through the gateway
   * @param request - Gateway request
   */
  routeRequest<T = any>(request: GatewayRequest): Promise<GatewayResponse<T>>;

  /**
   * Get gateway health status
   */
  getHealth(): Promise<GatewayHealth>;

  /**
   * Update module routing configuration
   * @param moduleId - Module ID
   * @param config - Updated configuration
   */
  updateModuleConfig(moduleId: string, config: Partial<ModuleGatewayConfig>): Promise<void>;
}

export interface IQerberosAuth {
  /**
   * Authenticate a request
   * @param request - Request to authenticate
   */
  authenticate(request: AuthRequest): Promise<AuthResult>;

  /**
   * Authorize a request
   * @param token - Authentication token
   * @param resource - Resource being accessed
   * @param action - Action being performed
   */
  authorize(token: string, resource: string, action: string): Promise<AuthorizationResult>;

  /**
   * Generate audit trail entry
   * @param request - Request to audit
   * @param response - Response to audit
   */
  generateAuditTrail(request: any, response: any): Promise<AuditEntry>;

  /**
   * Validate Qerberos signature
   * @param data - Data to validate
   * @param signature - Qerberos signature
   */
  validateSignature(data: any, signature: string): Promise<SignatureValidation>;
}

// Type definitions
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  authenticated?: boolean;
  auditTrail?: boolean;
}

export interface ModuleResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
  headers: Record<string, string>;
  responseTime: number;
  auditCid?: string;
  qerberosSignature?: string;
}

export interface BroadcastMessage {
  type: string;
  payload: any;
  timestamp: Date;
  sender: string;
}

export interface BroadcastOptions {
  timeout?: number;
  requireAllResponses?: boolean;
  authenticated?: boolean;
}

export interface BroadcastResult<T = any> {
  success: boolean;
  responses: Record<string, ModuleResponse<T>>;
  failed: string[];
  totalTime: number;
}

export interface EventCallback {
  (event: ModuleEvent): void | Promise<void>;
}

export interface ModuleEvent {
  type: string;
  source: string;
  data: any;
  timestamp: Date;
  auditCid?: string;
}

export interface SubscriptionResult {
  subscriptionId: string;
  moduleId: string;
  eventType: string;
  success: boolean;
  error?: string;
}

export interface CommunicationStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  moduleStats: Record<string, ModuleCommStats>;
  lastUpdated: Date;
}

export interface ModuleCommStats {
  moduleId: string;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastRequest: Date;
}

export interface AuthCredentials {
  userId: string;
  token?: string;
  privateKey?: string;
  publicKey?: string;
}

export interface ModuleGatewayConfig {
  endpoint: string;
  healthCheckPath: string;
  authRequired: boolean;
  rateLimits: RateLimitConfig;
  timeout: number;
  retries: number;
  loadBalancing?: LoadBalancingConfig;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit: number;
  enabled: boolean;
}

export interface LoadBalancingConfig {
  strategy: 'round-robin' | 'least-connections' | 'weighted';
  healthCheckInterval: number;
  failoverThreshold: number;
}

export interface GatewayRequest {
  moduleId: string;
  path: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  authenticated?: boolean;
  userId?: string;
}

export interface GatewayResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
  headers: Record<string, string>;
  responseTime: number;
  routedTo: string;
}

export interface GatewayHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  registeredModules: number;
  activeConnections: number;
  requestsPerSecond: number;
  errorRate: number;
  uptime: number;
}

export interface AuthRequest {
  userId: string;
  moduleId: string;
  action: string;
  resource: string;
  timestamp: Date;
  signature?: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  expiresAt?: Date;
  permissions?: string[];
  error?: string;
  auditCid?: string;
}

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  requiredPermissions?: string[];
  auditCid?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  moduleId: string;
  action: string;
  resource: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  auditCid: string;
  qerberosSignature: string;
}

export interface SignatureValidation {
  valid: boolean;
  signer?: string;
  timestamp?: Date;
  error?: string;
}

// Communication patterns
export enum CommunicationPattern {
  REQUEST_RESPONSE = 'request-response',
  PUBLISH_SUBSCRIBE = 'publish-subscribe',
  BROADCAST = 'broadcast',
  PIPELINE = 'pipeline'
}

export interface CommunicationRoute {
  pattern: CommunicationPattern;
  source: string;
  target: string | string[];
  authenticated: boolean;
  auditRequired: boolean;
  timeout: number;
}

// Error types
export class ModuleCommunicationError extends Error {
  constructor(
    message: string,
    public moduleId: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ModuleCommunicationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string, public userId?: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public userId?: string,
    public resource?: string,
    public action?: string
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}