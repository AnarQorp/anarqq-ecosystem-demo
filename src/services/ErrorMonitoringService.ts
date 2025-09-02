// Error monitoring and alerting service for the AnarQ&Q Ecosystem Demo

import {
  IErrorMonitor,
  DemoError,
  ErrorAlert,
  ErrorMetrics,
  ErrorCategory,
  ErrorSeverity,
  EscalationLevel,
  AlertingConfig,
  AlertChannel,
  AlertThresholds,
  EscalationRule
} from '../interfaces/ErrorHandler.js';

export class ErrorMonitoringService implements IErrorMonitor {
  private isMonitoringActive: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private errorCallbacks: ((error: DemoError) => void)[] = [];
  private alertCallbacks: ((alert: ErrorAlert) => void)[] = [];
  private resolutionCallbacks: ((error: DemoError, result: any) => void)[] = [];
  
  private detectedErrors: DemoError[] = [];
  private processedAlerts: ErrorAlert[] = [];
  private currentMetrics: ErrorMetrics;
  private alertingConfig: AlertingConfig;
  
  // Monitoring thresholds
  private readonly MONITORING_INTERVAL = 5000; // 5 seconds
  private readonly ERROR_DETECTION_WINDOW = 60000; // 1 minute
  private readonly ALERT_PROCESSING_INTERVAL = 10000; // 10 seconds

  constructor(alertingConfig?: AlertingConfig) {
    this.alertingConfig = alertingConfig || this.getDefaultAlertingConfig();
    this.initializeMetrics();
  }

  // Real-time monitoring methods
  async startMonitoring(): Promise<void> {
    if (this.isMonitoringActive) {
      console.log('[ErrorMonitor] Monitoring is already active');
      return;
    }

    console.log('[ErrorMonitor] Starting error monitoring...');
    this.isMonitoringActive = true;

    // Start main monitoring loop
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitoringCycle();
      } catch (error) {
        console.error('[ErrorMonitor] Error in monitoring cycle:', error);
      }
    }, this.MONITORING_INTERVAL);

    // Start alert processing
    setInterval(async () => {
      try {
        await this.processAlerts();
        await this.checkEscalationRules();
      } catch (error) {
        console.error('[ErrorMonitor] Error in alert processing:', error);
      }
    }, this.ALERT_PROCESSING_INTERVAL);

    console.log('[ErrorMonitor] Error monitoring started successfully');
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoringActive) {
      console.log('[ErrorMonitor] Monitoring is not active');
      return;
    }

    console.log('[ErrorMonitor] Stopping error monitoring...');
    this.isMonitoringActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('[ErrorMonitor] Error monitoring stopped');
  }

  isMonitoring(): boolean {
    return this.isMonitoringActive;
  }

  // Error detection methods
  async detectErrors(): Promise<DemoError[]> {
    const detectedErrors: DemoError[] = [];

    try {
      // Simulate error detection from various sources
      const systemErrors = await this.detectSystemErrors();
      const performanceErrors = await this.detectPerformanceErrors();
      const networkErrors = await this.detectNetworkErrors();
      const securityErrors = await this.detectSecurityErrors();

      detectedErrors.push(...systemErrors, ...performanceErrors, ...networkErrors, ...securityErrors);

      // Store detected errors
      this.detectedErrors.push(...detectedErrors);

      // Trigger error callbacks
      detectedErrors.forEach(error => {
        this.errorCallbacks.forEach(callback => {
          try {
            callback(error);
          } catch (callbackError) {
            console.error('[ErrorMonitor] Error in error callback:', callbackError);
          }
        });
      });

    } catch (error) {
      console.error('[ErrorMonitor] Error during error detection:', error);
    }

    return detectedErrors;
  }

  classifyError(error: any): DemoError {
    // Determine error category based on error properties
    let category: ErrorCategory = 'validation';
    let severity: ErrorSeverity = 'medium';

    if (error.moduleId || error.endpoint) {
      category = 'module';
    } else if (error.flowId || error.step) {
      category = 'dataflow';
    } else if (error.piUserId || error.contractAddress) {
      category = 'pinetwork';
    } else if (error.metric || error.threshold) {
      category = 'performance';
    } else if (error.nodeId || error.networkType) {
      category = 'network';
    } else if (error.securityType || error.userId) {
      category = 'security';
    }

    // Determine severity based on error characteristics
    if (error.critical || error.severity === 'critical') {
      severity = 'critical';
    } else if (error.high || error.severity === 'high') {
      severity = 'high';
    } else if (error.low || error.severity === 'low') {
      severity = 'low';
    }

    return {
      id: error.id || `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category,
      severity,
      message: error.message || 'Unknown error occurred',
      timestamp: error.timestamp || new Date(),
      context: error.context || {},
      stackTrace: error.stack,
      correlationId: error.correlationId
    };
  }

  calculateSeverity(error: DemoError): ErrorSeverity {
    let severityScore = 0;

    // Base severity from error category
    const categoryScores: Record<ErrorCategory, number> = {
      'security': 4,
      'dataflow': 3,
      'validation': 3,
      'module': 2,
      'performance': 2,
      'network': 2,
      'pinetwork': 1
    };

    severityScore += categoryScores[error.category] || 1;

    // Adjust based on context
    if (error.context.critical) severityScore += 2;
    if (error.context.userImpact === 'high') severityScore += 1;
    if (error.context.systemWide) severityScore += 1;

    // Map score to severity level
    if (severityScore >= 6) return 'critical';
    if (severityScore >= 4) return 'high';
    if (severityScore >= 2) return 'medium';
    return 'low';
  }

  // Alerting methods
  async sendAlert(alert: ErrorAlert): Promise<void> {
    if (!this.alertingConfig.enabled) {
      console.log('[ErrorMonitor] Alerting is disabled, skipping alert:', alert.id);
      return;
    }

    console.log(`[ErrorMonitor] Sending alert: ${alert.id} (${alert.severity})`);

    // Send alert through configured channels
    for (const channel of this.alertingConfig.channels) {
      if (!channel.enabled) continue;
      if (!channel.severityFilter.includes(alert.severity)) continue;

      try {
        await this.sendAlertToChannel(alert, channel);
      } catch (error) {
        console.error(`[ErrorMonitor] Failed to send alert to channel ${channel.id}:`, error);
      }
    }

    // Store processed alert
    this.processedAlerts.push(alert);

    // Trigger alert callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (callbackError) {
        console.error('[ErrorMonitor] Error in alert callback:', callbackError);
      }
    });
  }

  async processAlerts(): Promise<void> {
    // Process any pending alerts
    const pendingAlerts = this.processedAlerts.filter(alert => 
      !alert.acknowledged && !alert.resolved
    );

    for (const alert of pendingAlerts) {
      // Check if alert needs escalation
      const timeSinceCreated = Date.now() - alert.timestamp.getTime();
      const escalationDelay = this.getEscalationDelay(alert);

      if (timeSinceCreated > escalationDelay && !alert.acknowledged) {
        await this.escalateAlert(alert);
      }
    }

    // Clean up old resolved alerts
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.processedAlerts = this.processedAlerts.filter(alert => 
      alert.timestamp.getTime() > cutoffTime
    );
  }

  async checkEscalationRules(): Promise<void> {
    const currentMetrics = await this.collectMetrics();

    for (const rule of this.alertingConfig.escalationRules) {
      if (await this.evaluateEscalationCondition(rule.condition, currentMetrics)) {
        console.log(`[ErrorMonitor] Escalation rule triggered: ${rule.condition}`);
        
        // Execute escalation actions
        for (const action of rule.actions) {
          try {
            await this.executeEscalationAction(action, rule);
          } catch (error) {
            console.error(`[ErrorMonitor] Failed to execute escalation action ${action}:`, error);
          }
        }
      }
    }
  }

  // Metrics collection
  async collectMetrics(): Promise<ErrorMetrics> {
    const now = new Date();
    const timeWindow = {
      start: new Date(now.getTime() - this.ERROR_DETECTION_WINDOW),
      end: now
    };

    const recentErrors = this.detectedErrors.filter(error => 
      error.timestamp >= timeWindow.start && error.timestamp <= timeWindow.end
    );

    const errorsByCategory: Record<ErrorCategory, number> = {
      module: 0,
      dataflow: 0,
      pinetwork: 0,
      performance: 0,
      network: 0,
      security: 0,
      validation: 0
    };

    const errorsBySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    recentErrors.forEach(error => {
      errorsByCategory[error.category]++;
      errorsBySeverity[error.severity]++;
    });

    const resolvedAlerts = this.processedAlerts.filter(alert => alert.resolved);
    const escalatedAlerts = this.processedAlerts.filter(alert => 
      alert.escalationLevel === 'critical' || alert.escalationLevel === 'emergency'
    );

    const resolutionRate = this.processedAlerts.length > 0 
      ? resolvedAlerts.length / this.processedAlerts.length 
      : 1.0;

    const escalationRate = this.processedAlerts.length > 0 
      ? escalatedAlerts.length / this.processedAlerts.length 
      : 0.0;

    const averageResolutionTime = resolvedAlerts.length > 0
      ? resolvedAlerts.reduce((sum, alert) => {
          const resolutionTime = alert.resolvedAt 
            ? alert.resolvedAt.getTime() - alert.timestamp.getTime()
            : 0;
          return sum + resolutionTime;
        }, 0) / resolvedAlerts.length
      : 0;

    this.currentMetrics = {
      totalErrors: recentErrors.length,
      errorsByCategory,
      errorsBySeverity,
      resolutionRate,
      averageResolutionTime,
      escalationRate,
      timeWindow
    };

    return this.currentMetrics;
  }

  async updateMetrics(error: DemoError, resolution: any): Promise<void> {
    // Update metrics based on error resolution
    this.detectedErrors.push(error);

    // Trigger resolution callbacks
    this.resolutionCallbacks.forEach(callback => {
      try {
        callback(error, resolution);
      } catch (callbackError) {
        console.error('[ErrorMonitor] Error in resolution callback:', callbackError);
      }
    });

    // Recalculate metrics
    await this.collectMetrics();
  }

  // Event handling
  onError(callback: (error: DemoError) => void): void {
    this.errorCallbacks.push(callback);
  }

  onAlert(callback: (alert: ErrorAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  onResolution(callback: (error: DemoError, result: any) => void): void {
    this.resolutionCallbacks.push(callback);
  }

  // Private helper methods
  private async monitoringCycle(): Promise<void> {
    // Detect new errors
    const newErrors = await this.detectErrors();

    // Create alerts for high-severity errors
    for (const error of newErrors) {
      if (error.severity === 'high' || error.severity === 'critical') {
        const alert: ErrorAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          error,
          severity: error.severity,
          escalationLevel: this.mapSeverityToEscalationLevel(error.severity),
          timestamp: new Date(),
          acknowledged: false,
          resolved: false
        };

        await this.sendAlert(alert);
      }
    }

    // Update metrics
    await this.collectMetrics();
  }

  private async detectSystemErrors(): Promise<DemoError[]> {
    const errors: DemoError[] = [];

    // Simulate system error detection
    if (Math.random() < 0.1) { // 10% chance of detecting a system error
      errors.push({
        id: `system-error-${Date.now()}`,
        category: 'module',
        severity: Math.random() < 0.3 ? 'high' : 'medium',
        message: 'System module error detected',
        timestamp: new Date(),
        context: {
          moduleId: 'system',
          errorType: 'resource_exhaustion'
        }
      });
    }

    return errors;
  }

  private async detectPerformanceErrors(): Promise<DemoError[]> {
    const errors: DemoError[] = [];

    // Simulate performance monitoring
    const currentLatency = 100 + Math.random() * 200; // 100-300ms
    const latencyThreshold = 200;

    if (currentLatency > latencyThreshold) {
      errors.push({
        id: `perf-error-${Date.now()}`,
        category: 'performance',
        severity: currentLatency > latencyThreshold * 1.5 ? 'high' : 'medium',
        message: `Latency threshold exceeded: ${currentLatency.toFixed(0)}ms`,
        timestamp: new Date(),
        context: {
          metric: 'latency',
          value: currentLatency,
          threshold: latencyThreshold
        }
      });
    }

    return errors;
  }

  private async detectNetworkErrors(): Promise<DemoError[]> {
    const errors: DemoError[] = [];

    // Simulate network monitoring
    if (Math.random() < 0.05) { // 5% chance of network error
      errors.push({
        id: `network-error-${Date.now()}`,
        category: 'network',
        severity: Math.random() < 0.4 ? 'high' : 'medium',
        message: 'Network connectivity issue detected',
        timestamp: new Date(),
        context: {
          networkType: 'qnet',
          connectionStatus: 'degraded'
        }
      });
    }

    return errors;
  }

  private async detectSecurityErrors(): Promise<DemoError[]> {
    const errors: DemoError[] = [];

    // Simulate security monitoring
    if (Math.random() < 0.02) { // 2% chance of security error
      errors.push({
        id: `security-error-${Date.now()}`,
        category: 'security',
        severity: 'critical',
        message: 'Security anomaly detected',
        timestamp: new Date(),
        context: {
          securityType: 'anomaly_detection',
          threatLevel: 'high'
        }
      });
    }

    return errors;
  }

  private async sendAlertToChannel(alert: ErrorAlert, channel: AlertChannel): Promise<void> {
    switch (channel.type) {
      case 'console':
        console.log(`[ALERT-${channel.id}] ${alert.severity.toUpperCase()}: ${alert.error.message}`);
        break;
      
      case 'email':
        // Simulate email sending
        console.log(`[EMAIL-${channel.id}] Sending email alert for: ${alert.error.message}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        break;
      
      case 'slack':
        // Simulate Slack notification
        console.log(`[SLACK-${channel.id}] Sending Slack alert for: ${alert.error.message}`);
        await new Promise(resolve => setTimeout(resolve, 50));
        break;
      
      case 'webhook':
        // Simulate webhook call
        console.log(`[WEBHOOK-${channel.id}] Calling webhook for: ${alert.error.message}`);
        await new Promise(resolve => setTimeout(resolve, 200));
        break;
      
      default:
        console.log(`[UNKNOWN-${channel.id}] Alert: ${alert.error.message}`);
    }
  }

  private async escalateAlert(alert: ErrorAlert): Promise<void> {
    console.log(`[ErrorMonitor] Escalating alert: ${alert.id}`);
    
    // Increase escalation level
    const currentLevel = alert.escalationLevel;
    if (currentLevel === 'warning') {
      alert.escalationLevel = 'error';
    } else if (currentLevel === 'error') {
      alert.escalationLevel = 'critical';
    } else if (currentLevel === 'critical') {
      alert.escalationLevel = 'emergency';
    }

    // Send escalated alert
    await this.sendAlert(alert);
  }

  private getEscalationDelay(alert: ErrorAlert): number {
    // Return escalation delay based on severity
    switch (alert.severity) {
      case 'critical': return 5 * 60 * 1000; // 5 minutes
      case 'high': return 15 * 60 * 1000; // 15 minutes
      case 'medium': return 60 * 60 * 1000; // 1 hour
      case 'low': return 4 * 60 * 60 * 1000; // 4 hours
      default: return 60 * 60 * 1000;
    }
  }

  private async evaluateEscalationCondition(condition: string, metrics: ErrorMetrics): boolean {
    // Simple condition evaluation
    if (condition.includes('error_rate > critical_threshold')) {
      return metrics.totalErrors > 10; // More than 10 errors in time window
    }
    
    if (condition.includes('escalation_rate > threshold')) {
      return metrics.escalationRate > 0.2; // More than 20% escalation rate
    }

    if (condition.includes('resolution_time > threshold')) {
      return metrics.averageResolutionTime > 300000; // More than 5 minutes
    }

    return false;
  }

  private async executeEscalationAction(action: string, rule: EscalationRule): Promise<void> {
    switch (action) {
      case 'notify_all_channels':
        console.log('[ErrorMonitor] Executing: notify_all_channels');
        // Send notification to all enabled channels
        break;
      
      case 'auto_escalate':
        console.log('[ErrorMonitor] Executing: auto_escalate');
        // Automatically escalate all pending alerts
        break;
      
      case 'emergency_response':
        console.log('[ErrorMonitor] Executing: emergency_response');
        // Trigger emergency response procedures
        break;
      
      default:
        console.log(`[ErrorMonitor] Unknown escalation action: ${action}`);
    }
  }

  private mapSeverityToEscalationLevel(severity: ErrorSeverity): EscalationLevel {
    switch (severity) {
      case 'low': return 'warning';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'critical';
      default: return 'warning';
    }
  }

  private getDefaultAlertingConfig(): AlertingConfig {
    return {
      enabled: true,
      channels: [
        {
          id: 'console',
          type: 'console',
          config: {},
          enabled: true,
          severityFilter: ['low', 'medium', 'high', 'critical']
        }
      ],
      thresholds: {
        errorRate: {
          warning: 0.05,
          critical: 0.15,
          timeWindow: 300000 // 5 minutes
        },
        escalationRate: {
          warning: 0.1,
          critical: 0.25,
          timeWindow: 300000
        },
        resolutionTime: {
          warning: 60000, // 1 minute
          critical: 300000 // 5 minutes
        }
      },
      escalationRules: [
        {
          condition: 'error_rate > critical_threshold',
          delay: 0,
          targetLevel: 'emergency',
          actions: ['notify_all_channels', 'auto_escalate']
        }
      ]
    };
  }

  private initializeMetrics(): void {
    this.currentMetrics = {
      totalErrors: 0,
      errorsByCategory: {
        module: 0,
        dataflow: 0,
        pinetwork: 0,
        performance: 0,
        network: 0,
        security: 0,
        validation: 0
      },
      errorsBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      resolutionRate: 1.0,
      averageResolutionTime: 0,
      escalationRate: 0,
      timeWindow: {
        start: new Date(),
        end: new Date()
      }
    };
  }
}