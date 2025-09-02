// Module Communication Service - Main implementation
import {
  IModuleCommunication,
  ModuleResponse,
  BroadcastMessage,
  BroadcastOptions,
  BroadcastResult,
  EventCallback,
  ModuleEvent,
  SubscriptionResult,
  CommunicationStats,
  AuthCredentials,
  HttpMethod,
  RequestOptions,
  ModuleCommunicationError,
  AuthenticationError,
  AuthorizationError
} from '../interfaces/ModuleCommunication.js';
import { APIGateway } from './APIGateway.js';
import { QerberosAuth } from './QerberosAuth.js';

export class ModuleCommunication implements IModuleCommunication {
  private gateway: APIGateway;
  private auth: QerberosAuth;
  private eventSubscriptions: Map<string, EventSubscription> = new Map();
  private stats: CommunicationStatsImpl = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    moduleStats: new Map(),
    lastUpdated: new Date()
  };
  private currentUser?: AuthCredentials;

  constructor() {
    this.gateway = new APIGateway();
    this.auth = new QerberosAuth();
  }

  async sendRequest<T = any>(
    moduleId: string,
    endpoint: string,
    method: HttpMethod,
    data?: any,
    options?: RequestOptions
  ): Promise<ModuleResponse<T>> {
    const startTime = Date.now();
    
    try {
      // Validate inputs
      this.validateRequestInputs(moduleId, endpoint, method);

      // Prepare request
      const request = {
        moduleId,
        path: endpoint,
        method,
        headers: options?.headers || {},
        body: data,
        authenticated: options?.authenticated !== false,
        userId: this.currentUser?.userId
      };

      // Handle authentication if required
      if (options?.authenticated !== false && this.currentUser) {
        const authResult = await this.authenticateRequest(moduleId, endpoint, method);
        if (!authResult.success) {
          throw new AuthenticationError(authResult.error || 'Authentication failed');
        }
        
        request.headers['Authorization'] = `Bearer ${authResult.token}`;
      }

      // Route request through gateway
      const response = await this.gateway.routeRequest<T>(request);

      // Check if response indicates an error and throw exception
      if (!response.success) {
        throw new ModuleCommunicationError(
          response.error || 'Request failed',
          moduleId,
          response.statusCode
        );
      }

      // Generate audit trail if required
      if (options?.auditTrail !== false) {
        await this.generateAuditTrail(request, response);
      }

      // Update statistics
      this.updateRequestStats(moduleId, true, Date.now() - startTime);

      return {
        success: response.success,
        data: response.data,
        error: response.error,
        statusCode: response.statusCode,
        headers: response.headers,
        responseTime: response.responseTime,
        auditCid: await this.generateAuditCid(request, response),
        qerberosSignature: await this.generateQerberosSignature(request, response)
      };

    } catch (error) {
      // Update error statistics
      this.updateRequestStats(moduleId, false, Date.now() - startTime);

      if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
        throw error;
      }

      throw new ModuleCommunicationError(
        error instanceof Error ? error.message : 'Request failed',
        moduleId,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  async broadcast<T = any>(
    moduleIds: string[],
    message: BroadcastMessage,
    options?: BroadcastOptions
  ): Promise<BroadcastResult<T>> {
    const startTime = Date.now();
    const responses: Record<string, ModuleResponse<T>> = {};
    const failed: string[] = [];

    // Validate inputs
    if (moduleIds.length === 0) {
      throw new Error('At least one module ID is required for broadcast');
    }

    // Send message to all modules
    const promises = moduleIds.map(async (moduleId) => {
      try {
        const response = await this.sendRequest<T>(
          moduleId,
          '/events/broadcast',
          'POST',
          message,
          {
            timeout: options?.timeout,
            authenticated: options?.authenticated
          }
        );
        responses[moduleId] = response;
      } catch (error) {
        failed.push(moduleId);
        responses[moduleId] = {
          success: false,
          error: error instanceof Error ? error.message : 'Broadcast failed',
          statusCode: 500,
          headers: {},
          responseTime: 0
        };
      }
    });

    // Wait for all responses or timeout
    if (options?.requireAllResponses) {
      await Promise.all(promises);
    } else {
      await Promise.allSettled(promises);
    }

    const totalTime = Date.now() - startTime;

    return {
      success: failed.length === 0,
      responses,
      failed,
      totalTime
    };
  }

  async subscribe(
    moduleId: string,
    eventType: string,
    callback: EventCallback
  ): Promise<SubscriptionResult> {
    try {
      // Validate inputs
      if (!moduleId || !eventType || !callback) {
        throw new Error('Module ID, event type, and callback are required');
      }

      // Generate subscription ID
      const subscriptionId = this.generateSubscriptionId(moduleId, eventType);

      // Create subscription
      const subscription: EventSubscription = {
        id: subscriptionId,
        moduleId,
        eventType,
        callback,
        createdAt: new Date(),
        active: true
      };

      // Store subscription
      this.eventSubscriptions.set(subscriptionId, subscription);

      // Register with module (simulate)
      await this.registerEventSubscription(moduleId, eventType, subscriptionId);

      return {
        subscriptionId,
        moduleId,
        eventType,
        success: true
      };

    } catch (error) {
      return {
        subscriptionId: '',
        moduleId,
        eventType,
        success: false,
        error: error instanceof Error ? error.message : 'Subscription failed'
      };
    }
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.eventSubscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    // Mark as inactive
    subscription.active = false;

    // Unregister with module (simulate)
    await this.unregisterEventSubscription(subscription.moduleId, subscription.eventType, subscriptionId);

    // Remove subscription
    this.eventSubscriptions.delete(subscriptionId);
  }

  async getStats(): Promise<CommunicationStats> {
    // Calculate average response time
    let totalResponseTime = 0;
    let totalRequests = 0;

    for (const moduleStats of this.stats.moduleStats.values()) {
      totalResponseTime += moduleStats.averageResponseTime * moduleStats.requestCount;
      totalRequests += moduleStats.requestCount;
    }

    this.stats.averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    this.stats.lastUpdated = new Date();

    return {
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      averageResponseTime: this.stats.averageResponseTime,
      moduleStats: this.convertModuleStats(),
      lastUpdated: this.stats.lastUpdated
    };
  }

  async initializeAuth(qerberosEndpoint: string, credentials: AuthCredentials): Promise<void> {
    try {
      // Store credentials
      this.currentUser = credentials;

      // Initialize Qerberos auth service
      this.auth = new QerberosAuth(qerberosEndpoint);

      // Test authentication
      const authResult = await this.auth.authenticate({
        userId: credentials.userId,
        moduleId: 'demo-orchestrator',
        action: 'initialize',
        resource: 'auth',
        timestamp: new Date()
      });

      if (!authResult.success) {
        throw new AuthenticationError(authResult.error || 'Authentication initialization failed');
      }

      console.log('Module communication authentication initialized successfully');

    } catch (error) {
      throw new AuthenticationError(
        `Failed to initialize authentication: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate request inputs
   */
  private validateRequestInputs(moduleId: string, endpoint: string, method: HttpMethod): void {
    if (!moduleId || moduleId.trim() === '') {
      throw new Error('Module ID is required');
    }

    if (!endpoint || endpoint.trim() === '') {
      throw new Error('Endpoint is required');
    }

    if (!method) {
      throw new Error('HTTP method is required');
    }

    const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validMethods.includes(method)) {
      throw new Error(`Invalid HTTP method: ${method}`);
    }
  }

  /**
   * Authenticate request with Qerberos
   */
  private async authenticateRequest(moduleId: string, endpoint: string, method: HttpMethod) {
    if (!this.currentUser) {
      throw new AuthenticationError('No user credentials available');
    }

    return await this.auth.authenticate({
      userId: this.currentUser.userId,
      moduleId,
      action: method.toLowerCase(),
      resource: endpoint,
      timestamp: new Date()
    });
  }

  /**
   * Generate audit trail
   */
  private async generateAuditTrail(request: any, response: any): Promise<void> {
    await this.auth.generateAuditTrail(request, response);
  }

  /**
   * Generate audit CID
   */
  private async generateAuditCid(request: any, response: any): Promise<string> {
    // Simulate CID generation
    const content = JSON.stringify({ request, response, timestamp: new Date() });
    return `Qm${this.simpleHash(content)}`;
  }

  /**
   * Generate Qerberos signature
   */
  private async generateQerberosSignature(request: any, response: any): Promise<string> {
    // Simulate signature generation
    const content = JSON.stringify({ request, response, timestamp: new Date() });
    return `qerberos_${this.simpleHash(content)}`;
  }

  /**
   * Update request statistics
   */
  private updateRequestStats(moduleId: string, success: boolean, responseTime: number): void {
    this.stats.totalRequests++;
    
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    // Update module-specific stats
    let moduleStats = this.stats.moduleStats.get(moduleId);
    if (!moduleStats) {
      moduleStats = {
        moduleId,
        requestCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        lastRequest: new Date()
      };
      this.stats.moduleStats.set(moduleId, moduleStats);
    }

    moduleStats.requestCount++;
    moduleStats.lastRequest = new Date();
    
    if (!success) {
      moduleStats.errorCount++;
    }

    // Update average response time
    const totalTime = moduleStats.averageResponseTime * (moduleStats.requestCount - 1) + responseTime;
    moduleStats.averageResponseTime = totalTime / moduleStats.requestCount;
  }

  /**
   * Convert internal module stats to public format
   */
  private convertModuleStats(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [moduleId, stats] of this.stats.moduleStats) {
      result[moduleId] = {
        moduleId: stats.moduleId,
        requestCount: stats.requestCount,
        errorCount: stats.errorCount,
        averageResponseTime: stats.averageResponseTime,
        lastRequest: stats.lastRequest
      };
    }

    return result;
  }

  /**
   * Generate subscription ID
   */
  private generateSubscriptionId(moduleId: string, eventType: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `sub_${moduleId}_${eventType}_${timestamp}_${random}`;
  }

  /**
   * Register event subscription with module
   */
  private async registerEventSubscription(moduleId: string, eventType: string, subscriptionId: string): Promise<void> {
    // Simulate registration with module
    console.log(`Registered subscription ${subscriptionId} for ${eventType} events from ${moduleId}`);
  }

  /**
   * Unregister event subscription with module
   */
  private async unregisterEventSubscription(moduleId: string, eventType: string, subscriptionId: string): Promise<void> {
    // Simulate unregistration with module
    console.log(`Unregistered subscription ${subscriptionId} for ${eventType} events from ${moduleId}`);
  }

  /**
   * Simple hash function
   */
  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Handle incoming events (for testing)
   */
  handleEvent(event: ModuleEvent): void {
    for (const subscription of this.eventSubscriptions.values()) {
      if (subscription.active && 
          subscription.moduleId === event.source && 
          subscription.eventType === event.type) {
        try {
          subscription.callback(event);
        } catch (error) {
          console.error(`Error handling event in subscription ${subscription.id}:`, error);
        }
      }
    }
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): EventSubscription[] {
    return Array.from(this.eventSubscriptions.values()).filter(sub => sub.active);
  }

  /**
   * Get gateway instance for testing
   */
  getGateway(): APIGateway {
    return this.gateway;
  }

  /**
   * Get auth instance for testing
   */
  getAuth(): QerberosAuth {
    return this.auth;
  }
}

/**
 * Internal interfaces
 */
interface EventSubscription {
  id: string;
  moduleId: string;
  eventType: string;
  callback: EventCallback;
  createdAt: Date;
  active: boolean;
}

interface CommunicationStatsImpl {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  moduleStats: Map<string, ModuleStatsImpl>;
  lastUpdated: Date;
}

interface ModuleStatsImpl {
  moduleId: string;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastRequest: Date;
}