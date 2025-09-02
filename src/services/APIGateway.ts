// API Gateway Service for unified module communication
import {
  IAPIGateway,
  ModuleGatewayConfig,
  GatewayRequest,
  GatewayResponse,
  GatewayHealth,
  HttpMethod,
  RateLimitConfig,
  LoadBalancingConfig
} from '../interfaces/ModuleCommunication.js';

export class APIGateway implements IAPIGateway {
  private modules: Map<string, ModuleGatewayConfig> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private loadBalancers: Map<string, LoadBalancer> = new Map();
  private stats: GatewayStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    startTime: new Date(),
    moduleStats: new Map()
  };

  constructor() {
    this.initializeDefaultModules();
  }

  async registerModule(moduleId: string, config: ModuleGatewayConfig): Promise<void> {
    // Validate configuration
    this.validateModuleConfig(config);

    // Store module configuration
    this.modules.set(moduleId, config);

    // Initialize rate limiter if enabled
    if (config.rateLimits.enabled) {
      this.rateLimiters.set(moduleId, new RateLimiter(config.rateLimits));
    }

    // Initialize load balancer if configured
    if (config.loadBalancing) {
      this.loadBalancers.set(moduleId, new LoadBalancer(config.loadBalancing));
    }

    // Initialize module stats
    this.stats.moduleStats.set(moduleId, {
      requestCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      lastRequest: new Date()
    });

    console.log(`Module ${moduleId} registered with API Gateway`);
  }

  async unregisterModule(moduleId: string): Promise<void> {
    this.modules.delete(moduleId);
    this.rateLimiters.delete(moduleId);
    this.loadBalancers.delete(moduleId);
    this.stats.moduleStats.delete(moduleId);

    console.log(`Module ${moduleId} unregistered from API Gateway`);
  }

  async routeRequest<T = any>(request: GatewayRequest): Promise<GatewayResponse<T>> {
    const startTime = Date.now();
    
    try {
      // Get module configuration
      const moduleConfig = this.modules.get(request.moduleId);
      if (!moduleConfig) {
        throw new Error(`Module ${request.moduleId} not registered`);
      }

      // Check rate limits
      if (moduleConfig.rateLimits.enabled) {
        const rateLimiter = this.rateLimiters.get(request.moduleId);
        if (rateLimiter && !rateLimiter.allowRequest()) {
          return {
            success: false,
            error: 'Rate limit exceeded',
            statusCode: 429,
            headers: {},
            responseTime: Date.now() - startTime,
            routedTo: request.moduleId
          };
        }
      }

      // Route request to module
      const response = await this.forwardRequest(request, moduleConfig);
      
      // Update statistics
      this.updateStats(request.moduleId, true, Date.now() - startTime);
      
      return {
        ...response,
        responseTime: Date.now() - startTime,
        routedTo: request.moduleId
      };

    } catch (error) {
      // Update error statistics
      this.updateStats(request.moduleId, false, Date.now() - startTime);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500,
        headers: {},
        responseTime: Date.now() - startTime,
        routedTo: request.moduleId
      };
    }
  }

  async getHealth(): Promise<GatewayHealth> {
    const uptime = Date.now() - this.stats.startTime.getTime();
    const totalRequests = this.stats.totalRequests;
    const errorRate = totalRequests > 0 ? this.stats.failedRequests / totalRequests : 0;
    
    // Calculate requests per second over the last minute
    const requestsPerSecond = this.calculateRequestsPerSecond();

    return {
      status: this.determineHealthStatus(errorRate),
      registeredModules: this.modules.size,
      activeConnections: this.getActiveConnections(),
      requestsPerSecond,
      errorRate,
      uptime
    };
  }

  async updateModuleConfig(moduleId: string, config: Partial<ModuleGatewayConfig>): Promise<void> {
    const existingConfig = this.modules.get(moduleId);
    if (!existingConfig) {
      throw new Error(`Module ${moduleId} not registered`);
    }

    const updatedConfig = { ...existingConfig, ...config };
    this.validateModuleConfig(updatedConfig);
    
    this.modules.set(moduleId, updatedConfig);

    // Update rate limiter if configuration changed
    if (config.rateLimits) {
      if (updatedConfig.rateLimits.enabled) {
        this.rateLimiters.set(moduleId, new RateLimiter(updatedConfig.rateLimits));
      } else {
        this.rateLimiters.delete(moduleId);
      }
    }

    console.log(`Module ${moduleId} configuration updated`);
  }

  /**
   * Initialize default module configurations
   */
  private initializeDefaultModules(): void {
    const defaultConfig: ModuleGatewayConfig = {
      endpoint: '',
      healthCheckPath: '/health',
      authRequired: true,
      rateLimits: {
        requestsPerMinute: 1000,
        burstLimit: 100,
        enabled: true
      },
      timeout: 5000,
      retries: 3
    };

    // Core modules with their default endpoints
    const coreModules = [
      { id: 'squid', endpoint: 'http://localhost:3001' },
      { id: 'qlock', endpoint: 'http://localhost:3002' },
      { id: 'qonsent', endpoint: 'http://localhost:3003' },
      { id: 'qindex', endpoint: 'http://localhost:3004' },
      { id: 'qerberos', endpoint: 'http://localhost:3005' },
      { id: 'qwallet', endpoint: 'http://localhost:3006' },
      { id: 'qflow', endpoint: 'http://localhost:3007' },
      { id: 'qnet', endpoint: 'http://localhost:3008' },
      { id: 'qdrive', endpoint: 'http://localhost:3009' },
      { id: 'qpic', endpoint: 'http://localhost:3010' },
      { id: 'qmarket', endpoint: 'http://localhost:3011' },
      { id: 'qmail', endpoint: 'http://localhost:3012' },
      { id: 'qchat', endpoint: 'http://localhost:3013' },
      { id: 'qsocial', endpoint: 'http://localhost:3014' }
    ];

    for (const module of coreModules) {
      const config = {
        ...defaultConfig,
        endpoint: process.env[`${module.id.toUpperCase()}_ENDPOINT`] || module.endpoint
      };
      
      this.modules.set(module.id, config);
      this.rateLimiters.set(module.id, new RateLimiter(config.rateLimits));
      this.stats.moduleStats.set(module.id, {
        requestCount: 0,
        errorCount: 0,
        totalResponseTime: 0,
        lastRequest: new Date()
      });
    }
  }

  /**
   * Validate module configuration
   */
  private validateModuleConfig(config: ModuleGatewayConfig): void {
    if (!config.endpoint || config.endpoint.trim() === '') {
      throw new Error('Module endpoint is required');
    }

    if (config.timeout <= 0) {
      throw new Error('Timeout must be positive');
    }

    if (config.retries < 0) {
      throw new Error('Retries cannot be negative');
    }

    if (config.rateLimits.enabled) {
      if (config.rateLimits.requestsPerMinute <= 0) {
        throw new Error('Requests per minute must be positive');
      }
      if (config.rateLimits.burstLimit <= 0) {
        throw new Error('Burst limit must be positive');
      }
    }
  }

  /**
   * Forward request to target module
   */
  private async forwardRequest<T = any>(
    request: GatewayRequest,
    config: ModuleGatewayConfig
  ): Promise<GatewayResponse<T>> {
    // Simulate HTTP request - in real implementation, this would use fetch or axios
    const url = `${config.endpoint}${request.path}`;
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    // Simulate response based on module health
    const isHealthy = await this.checkModuleHealth(request.moduleId);
    
    if (!isHealthy) {
      throw new Error(`Module ${request.moduleId} is not healthy`);
    }

    // Simulate successful response
    return {
      success: true,
      data: this.generateMockResponse(request) as T,
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Module-Id': request.moduleId
      }
    };
  }

  /**
   * Check module health
   */
  private async checkModuleHealth(moduleId: string): Promise<boolean> {
    // Simulate health check - in real implementation, this would make HTTP request
    const envVar = `${moduleId.toUpperCase()}_HEALTHY`;
    return process.env[envVar] !== 'false';
  }

  /**
   * Generate mock response for testing
   */
  private generateMockResponse(request: GatewayRequest): any {
    return {
      moduleId: request.moduleId,
      path: request.path,
      method: request.method,
      timestamp: new Date().toISOString(),
      success: true,
      message: `Response from ${request.moduleId}`
    };
  }

  /**
   * Update gateway statistics
   */
  private updateStats(moduleId: string, success: boolean, responseTime: number): void {
    this.stats.totalRequests++;
    
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    const moduleStats = this.stats.moduleStats.get(moduleId);
    if (moduleStats) {
      moduleStats.requestCount++;
      moduleStats.totalResponseTime += responseTime;
      moduleStats.lastRequest = new Date();
      
      if (!success) {
        moduleStats.errorCount++;
      }
    }
  }

  /**
   * Calculate requests per second
   */
  private calculateRequestsPerSecond(): number {
    const uptimeSeconds = (Date.now() - this.stats.startTime.getTime()) / 1000;
    return uptimeSeconds > 0 ? this.stats.totalRequests / uptimeSeconds : 0;
  }

  /**
   * Determine health status based on error rate
   */
  private determineHealthStatus(errorRate: number): 'healthy' | 'degraded' | 'unhealthy' {
    if (errorRate < 0.01) return 'healthy';
    if (errorRate < 0.05) return 'degraded';
    return 'unhealthy';
  }

  /**
   * Get active connections count
   */
  private getActiveConnections(): number {
    // Simulate active connections
    return Math.floor(Math.random() * 100);
  }

  /**
   * Get gateway statistics
   */
  getStats(): GatewayStats {
    return this.stats;
  }

  /**
   * Get registered modules
   */
  getRegisteredModules(): string[] {
    return Array.from(this.modules.keys());
  }
}

/**
 * Rate Limiter implementation
 */
class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  allowRequest(): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // Remove old requests
    this.requests = this.requests.filter(time => time > windowStart);

    // Check if within limits
    if (this.requests.length >= this.config.requestsPerMinute) {
      return false;
    }

    // Check burst limit
    const recentRequests = this.requests.filter(time => time > now - 1000); // Last second
    if (recentRequests.length >= this.config.burstLimit) {
      return false;
    }

    // Allow request
    this.requests.push(now);
    return true;
  }
}

/**
 * Load Balancer implementation
 */
class LoadBalancer {
  private config: LoadBalancingConfig;
  private currentIndex: number = 0;

  constructor(config: LoadBalancingConfig) {
    this.config = config;
  }

  selectEndpoint(endpoints: string[]): string {
    if (endpoints.length === 0) {
      throw new Error('No endpoints available');
    }

    switch (this.config.strategy) {
      case 'round-robin':
        const endpoint = endpoints[this.currentIndex % endpoints.length];
        this.currentIndex++;
        return endpoint;
      
      case 'least-connections':
        // Simplified implementation - in real scenario, would track connections
        return endpoints[0];
      
      case 'weighted':
        // Simplified implementation - in real scenario, would use weights
        return endpoints[0];
      
      default:
        return endpoints[0];
    }
  }
}

/**
 * Gateway statistics interface
 */
interface GatewayStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  startTime: Date;
  moduleStats: Map<string, ModuleStats>;
}

interface ModuleStats {
  requestCount: number;
  errorCount: number;
  totalResponseTime: number;
  lastRequest: Date;
}