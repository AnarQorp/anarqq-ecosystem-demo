// Health Monitoring Service for Module Integration
import { 
  HealthCheckResult, 
  ModuleHealthMetrics, 
  ModuleInfo,
  ModuleRecoveryResult 
} from '../interfaces/ModuleIntegration.js';
import { ModuleStatus, PerformanceMetrics } from '../types/index.js';

export interface HealthMonitorConfig {
  checkInterval: number; // milliseconds
  timeoutMs: number;
  retryAttempts: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
  };
}

export interface HealthAlert {
  moduleId: string;
  alertType: 'performance' | 'availability' | 'dependency' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metrics?: Partial<ModuleHealthMetrics>;
}

export interface HealthMonitorStats {
  totalModules: number;
  activeModules: number;
  inactiveModules: number;
  errorModules: number;
  averageResponseTime: number;
  overallHealthScore: number;
  lastUpdate: Date;
}

export class HealthMonitor {
  private config: HealthMonitorConfig;
  private monitoringActive: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private healthHistory: Map<string, HealthCheckResult[]> = new Map();
  private alerts: HealthAlert[] = [];
  private alertCallbacks: Array<(alert: HealthAlert) => void> = [];
  private maxHistorySize: number = 100;

  constructor(config?: Partial<HealthMonitorConfig>) {
    this.config = {
      checkInterval: 30000, // 30 seconds
      timeoutMs: 5000, // 5 seconds
      retryAttempts: 3,
      alertThresholds: {
        responseTime: 2000, // 2 seconds
        errorRate: 0.05, // 5%
        cpuUsage: 80, // 80%
        memoryUsage: 85 // 85%
      },
      ...config
    };
  }

  /**
   * Start continuous health monitoring
   */
  async startMonitoring(modules: Map<string, ModuleInfo>): Promise<void> {
    if (this.monitoringActive) {
      console.warn('Health monitoring is already active');
      return;
    }

    console.log('Starting health monitoring service...');
    this.monitoringActive = true;

    // Perform initial health check
    await this.performHealthCheckCycle(modules);

    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      if (this.monitoringActive) {
        await this.performHealthCheckCycle(modules);
      }
    }, this.config.checkInterval);

    console.log(`Health monitoring started with ${this.config.checkInterval}ms interval`);
  }

  /**
   * Stop health monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.monitoringActive) {
      return;
    }

    console.log('Stopping health monitoring service...');
    this.monitoringActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('Health monitoring stopped');
  }

  /**
   * Perform health check cycle for all modules
   */
  private async performHealthCheckCycle(modules: Map<string, ModuleInfo>): Promise<void> {
    const checkPromises: Promise<void>[] = [];

    for (const [moduleId, moduleInfo] of modules) {
      checkPromises.push(this.checkModuleHealth(moduleId, moduleInfo));
    }

    await Promise.allSettled(checkPromises);
    
    // Generate overall health statistics
    const stats = this.generateHealthStats(modules);
    console.log(`Health check cycle completed. Overall health score: ${stats.overallHealthScore.toFixed(2)}%`);
  }

  /**
   * Check health of a specific module
   */
  private async checkModuleHealth(moduleId: string, moduleInfo: ModuleInfo): Promise<void> {
    try {
      const healthResult = await this.performModuleHealthCheck(moduleId, moduleInfo);
      
      // Store health history
      this.storeHealthHistory(moduleId, healthResult);
      
      // Check for alerts
      await this.checkForAlerts(moduleId, healthResult);
      
      // Update module status
      moduleInfo.status = healthResult.status;
      moduleInfo.lastHealthCheck = healthResult.lastCheck;

    } catch (error) {
      console.error(`Health check failed for module ${moduleId}:`, error);
      
      const errorResult: HealthCheckResult = {
        moduleId,
        status: 'error',
        lastCheck: new Date(),
        responseTime: this.config.timeoutMs,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: this.getDefaultMetrics(),
        dependencies: []
      };

      this.storeHealthHistory(moduleId, errorResult);
      await this.triggerAlert(moduleId, 'availability', 'critical', `Module health check failed: ${errorResult.error}`);
    }
  }

  /**
   * Perform actual health check for a module
   */
  private async performModuleHealthCheck(moduleId: string, moduleInfo: ModuleInfo): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simulate health check - in real implementation, this would make HTTP request
      const isHealthy = await this.simulateHealthCheck(moduleInfo);
      const responseTime = Date.now() - startTime;
      
      // Generate realistic metrics
      const metrics = this.generateHealthMetrics(moduleId, isHealthy);
      
      return {
        moduleId,
        status: isHealthy ? 'active' : 'error',
        lastCheck: new Date(),
        responseTime,
        metrics,
        dependencies: await this.checkModuleDependencies(moduleInfo)
      };

    } catch (error) {
      return {
        moduleId,
        status: 'error',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: this.getDefaultMetrics(),
        dependencies: []
      };
    }
  }

  /**
   * Simulate health check for demo purposes
   */
  private async simulateHealthCheck(moduleInfo: ModuleInfo): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    // Check environment variable for forced status
    const envVar = `${moduleInfo.id.toUpperCase()}_HEALTHY`;
    if (process.env[envVar] === 'false') {
      return false;
    }
    
    // Simulate 95% uptime
    return Math.random() > 0.05;
  }

  /**
   * Generate realistic health metrics
   */
  private generateHealthMetrics(moduleId: string, isHealthy: boolean): ModuleHealthMetrics {
    const baseMetrics = this.getDefaultMetrics();
    
    if (!isHealthy) {
      // Simulate degraded performance when unhealthy
      return {
        ...baseMetrics,
        cpuUsage: Math.min(100, baseMetrics.cpuUsage + 30),
        memoryUsage: Math.min(100, baseMetrics.memoryUsage + 20),
        errorCount: baseMetrics.errorCount + Math.floor(Math.random() * 10),
        lastError: 'Service unavailable'
      };
    }

    return baseMetrics;
  }

  /**
   * Check dependencies of a module
   */
  private async checkModuleDependencies(moduleInfo: ModuleInfo): Promise<Array<{ dependencyId: string; status: ModuleStatus; lastCheck: Date }>> {
    // In a real implementation, this would check actual dependencies
    // For demo purposes, we'll simulate dependency checks
    return [];
  }

  /**
   * Store health check result in history
   */
  private storeHealthHistory(moduleId: string, result: HealthCheckResult): void {
    if (!this.healthHistory.has(moduleId)) {
      this.healthHistory.set(moduleId, []);
    }

    const history = this.healthHistory.get(moduleId)!;
    history.push(result);

    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * Check for alert conditions
   */
  private async checkForAlerts(moduleId: string, healthResult: HealthCheckResult): Promise<void> {
    const { alertThresholds } = this.config;

    // Response time alert
    if (healthResult.responseTime > alertThresholds.responseTime) {
      await this.triggerAlert(
        moduleId,
        'performance',
        'medium',
        `High response time: ${healthResult.responseTime}ms (threshold: ${alertThresholds.responseTime}ms)`,
        { responseTime: healthResult.responseTime }
      );
    }

    // CPU usage alert
    if (healthResult.metrics.cpuUsage > alertThresholds.cpuUsage) {
      await this.triggerAlert(
        moduleId,
        'resource',
        'high',
        `High CPU usage: ${healthResult.metrics.cpuUsage}% (threshold: ${alertThresholds.cpuUsage}%)`,
        { cpuUsage: healthResult.metrics.cpuUsage }
      );
    }

    // Memory usage alert
    if (healthResult.metrics.memoryUsage > alertThresholds.memoryUsage) {
      await this.triggerAlert(
        moduleId,
        'resource',
        'high',
        `High memory usage: ${healthResult.metrics.memoryUsage}% (threshold: ${alertThresholds.memoryUsage}%)`,
        { memoryUsage: healthResult.metrics.memoryUsage }
      );
    }

    // Module status alert
    if (healthResult.status === 'error') {
      await this.triggerAlert(
        moduleId,
        'availability',
        'critical',
        `Module is in error state: ${healthResult.error || 'Unknown error'}`
      );
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(
    moduleId: string,
    alertType: HealthAlert['alertType'],
    severity: HealthAlert['severity'],
    message: string,
    metrics?: Partial<ModuleHealthMetrics>
  ): Promise<void> {
    const alert: HealthAlert = {
      moduleId,
      alertType,
      severity,
      message,
      timestamp: new Date(),
      metrics
    };

    this.alerts.push(alert);

    // Limit alert history
    if (this.alerts.length > 1000) {
      this.alerts.shift();
    }

    // Notify alert callbacks
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        console.error('Alert callback error:', error);
      }
    }

    console.warn(`[${severity.toUpperCase()}] ${moduleId}: ${message}`);
  }

  /**
   * Generate overall health statistics
   */
  private generateHealthStats(modules: Map<string, ModuleInfo>): HealthMonitorStats {
    let activeCount = 0;
    let inactiveCount = 0;
    let errorCount = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const [moduleId, moduleInfo] of modules) {
      switch (moduleInfo.status) {
        case 'active':
          activeCount++;
          break;
        case 'inactive':
          inactiveCount++;
          break;
        case 'error':
          errorCount++;
          break;
      }

      // Calculate average response time from recent health checks
      const history = this.healthHistory.get(moduleId);
      if (history && history.length > 0) {
        const recentChecks = history.slice(-5); // Last 5 checks
        const avgResponseTime = recentChecks.reduce((sum, check) => sum + check.responseTime, 0) / recentChecks.length;
        totalResponseTime += avgResponseTime;
        responseTimeCount++;
      }
    }

    const totalModules = modules.size;
    const averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;
    const overallHealthScore = totalModules > 0 ? (activeCount / totalModules) * 100 : 0;

    return {
      totalModules,
      activeModules: activeCount,
      inactiveModules: inactiveCount,
      errorModules: errorCount,
      averageResponseTime,
      overallHealthScore,
      lastUpdate: new Date()
    };
  }

  /**
   * Get default health metrics
   */
  private getDefaultMetrics(): ModuleHealthMetrics {
    return {
      uptime: 90 + Math.random() * 10, // 90-100%
      memoryUsage: 30 + Math.random() * 40, // 30-70%
      cpuUsage: 20 + Math.random() * 40, // 20-60%
      requestCount: Math.floor(Math.random() * 1000),
      errorCount: Math.floor(Math.random() * 5)
    };
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (alert: HealthAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 50): HealthAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get health history for a module
   */
  getHealthHistory(moduleId: string, limit: number = 20): HealthCheckResult[] {
    const history = this.healthHistory.get(moduleId);
    return history ? history.slice(-limit) : [];
  }

  /**
   * Get current health statistics
   */
  getCurrentStats(modules: Map<string, ModuleInfo>): HealthMonitorStats {
    return this.generateHealthStats(modules);
  }

  /**
   * Clear alert history
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<HealthMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Health monitor configuration updated');
  }
}