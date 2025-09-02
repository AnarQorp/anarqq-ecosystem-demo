// Error context builder service for the AnarQ&Q Ecosystem Demo

import { IErrorContext } from '../interfaces/ErrorHandler.js';

export class ErrorContextService implements IErrorContext {
  
  buildModuleContext(moduleId: string, endpoint?: string): Record<string, any> {
    const context: Record<string, any> = {
      moduleId,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };

    if (endpoint) {
      context.endpoint = endpoint;
      context.endpointType = this.determineEndpointType(endpoint);
    }

    // Add module-specific context
    context.moduleType = this.determineModuleType(moduleId);
    context.expectedVersion = this.getExpectedModuleVersion(moduleId);
    context.dependencies = this.getModuleDependencies(moduleId);

    return context;
  }

  buildDataFlowContext(flowId: string, step: string, data?: any): Record<string, any> {
    const context: Record<string, any> = {
      flowId,
      step,
      timestamp: new Date().toISOString(),
      stepIndex: this.getStepIndex(step),
      pipeline: 'Q∞'
    };

    if (data) {
      context.dataSize = this.calculateDataSize(data);
      context.dataType = this.determineDataType(data);
      context.dataHash = this.calculateDataHash(data);
    }

    // Add step-specific context
    context.stepType = this.determineStepType(step);
    context.expectedDuration = this.getExpectedStepDuration(step);
    context.previousStep = this.getPreviousStep(step);
    context.nextStep = this.getNextStep(step);

    return context;
  }

  buildPiNetworkContext(piUserId?: string, contractAddress?: string): Record<string, any> {
    const context: Record<string, any> = {
      timestamp: new Date().toISOString(),
      networkType: process.env.PI_NETWORK_TYPE || 'testnet',
      sdkVersion: process.env.PI_SDK_VERSION || 'unknown'
    };

    if (piUserId) {
      context.piUserId = piUserId;
      context.userIdHash = this.hashSensitiveData(piUserId);
    }

    if (contractAddress) {
      context.contractAddress = contractAddress;
      context.contractType = this.determineContractType(contractAddress);
      context.contractNetwork = this.getContractNetwork(contractAddress);
    }

    // Add Pi Network specific context
    context.walletConnected = this.checkWalletConnection();
    context.networkStatus = this.getPiNetworkStatus();
    context.gasPrice = this.getCurrentGasPrice();

    return context;
  }

  buildPerformanceContext(metric: string, value: number, threshold: number): Record<string, any> {
    const context: Record<string, any> = {
      metric,
      value,
      threshold,
      timestamp: new Date().toISOString(),
      thresholdExceeded: value > threshold,
      exceedancePercentage: ((value - threshold) / threshold) * 100
    };

    // Add metric-specific context
    context.metricType = this.determineMetricType(metric);
    context.measurementUnit = this.getMetricUnit(metric);
    context.historicalAverage = this.getHistoricalAverage(metric);
    context.trendDirection = this.getTrendDirection(metric, value);

    // Add system context
    context.systemLoad = this.getCurrentSystemLoad();
    context.memoryUsage = this.getCurrentMemoryUsage();
    context.activeConnections = this.getActiveConnectionCount();

    return context;
  }

  buildNetworkContext(nodeId?: string, networkType?: string): Record<string, any> {
    const context: Record<string, any> = {
      timestamp: new Date().toISOString(),
      localNodeId: this.getLocalNodeId()
    };

    if (nodeId) {
      context.nodeId = nodeId;
      context.nodeRegion = this.getNodeRegion(nodeId);
      context.nodeStatus = this.getNodeStatus(nodeId);
    }

    if (networkType) {
      context.networkType = networkType;
      context.networkHealth = this.getNetworkHealth(networkType);
      context.peerCount = this.getPeerCount(networkType);
    }

    // Add network diagnostics
    context.latency = this.measureNetworkLatency();
    context.bandwidth = this.measureBandwidth();
    context.packetLoss = this.measurePacketLoss();
    context.connectionQuality = this.assessConnectionQuality();

    return context;
  }

  buildSecurityContext(userId?: string, resourceId?: string): Record<string, any> {
    const context: Record<string, any> = {
      timestamp: new Date().toISOString(),
      sessionId: this.getCurrentSessionId(),
      ipAddress: this.getClientIpAddress(),
      userAgent: this.getUserAgent()
    };

    if (userId) {
      context.userId = userId;
      context.userIdHash = this.hashSensitiveData(userId);
      context.userRole = this.getUserRole(userId);
      context.lastActivity = this.getLastUserActivity(userId);
    }

    if (resourceId) {
      context.resourceId = resourceId;
      context.resourceType = this.determineResourceType(resourceId);
      context.accessLevel = this.getResourceAccessLevel(resourceId);
    }

    // Add security context
    context.authenticationMethod = this.getAuthenticationMethod();
    context.securityLevel = this.getCurrentSecurityLevel();
    context.threatLevel = this.getCurrentThreatLevel();
    context.recentFailedAttempts = this.getRecentFailedAttempts();

    return context;
  }

  buildValidationContext(validationType: string, expected?: any, actual?: any): Record<string, any> {
    const context: Record<string, any> = {
      validationType,
      timestamp: new Date().toISOString(),
      validationId: this.generateValidationId()
    };

    if (expected !== undefined) {
      context.expected = expected;
      context.expectedType = typeof expected;
      context.expectedHash = this.calculateDataHash(expected);
    }

    if (actual !== undefined) {
      context.actual = actual;
      context.actualType = typeof actual;
      context.actualHash = this.calculateDataHash(actual);
    }

    // Add validation-specific context
    context.validationRule = this.getValidationRule(validationType);
    context.validationSeverity = this.getValidationSeverity(validationType);
    context.previousValidations = this.getPreviousValidations(validationType);
    context.validationChain = this.getValidationChain();

    // Add comparison context if both values are provided
    if (expected !== undefined && actual !== undefined) {
      context.valuesMatch = this.deepEqual(expected, actual);
      context.differenceAnalysis = this.analyzeDifferences(expected, actual);
    }

    return context;
  }

  // Private helper methods
  private determineEndpointType(endpoint: string): string {
    if (endpoint.includes('/api/')) return 'api';
    if (endpoint.includes('/health')) return 'health';
    if (endpoint.includes('/metrics')) return 'metrics';
    if (endpoint.includes('ws://') || endpoint.includes('wss://')) return 'websocket';
    return 'unknown';
  }

  private determineModuleType(moduleId: string): string {
    const moduleTypes: Record<string, string> = {
      'squid': 'identity',
      'qlock': 'encryption',
      'qonsent': 'privacy',
      'qindex': 'indexing',
      'qerberos': 'security',
      'qwallet': 'finance',
      'qflow': 'automation',
      'qnet': 'network',
      'qdrive': 'storage',
      'qpic': 'compression',
      'qmarket': 'commerce',
      'qmail': 'communication',
      'qchat': 'messaging',
      'qsocial': 'social'
    };
    return moduleTypes[moduleId.toLowerCase()] || 'unknown';
  }

  private getExpectedModuleVersion(moduleId: string): string {
    // In real implementation, this would fetch from configuration
    return '1.0.0';
  }

  private getModuleDependencies(moduleId: string): string[] {
    const dependencies: Record<string, string[]> = {
      'squid': ['qerberos'],
      'qwallet': ['squid', 'qerberos'],
      'qdrive': ['qlock', 'qindex', 'qerberos'],
      'qsocial': ['squid', 'qerberos', 'qonsent']
    };
    return dependencies[moduleId.toLowerCase()] || [];
  }

  private getStepIndex(step: string): number {
    const steps = ['compression', 'encryption', 'indexing', 'security', 'storage'];
    return steps.indexOf(step.toLowerCase()) + 1;
  }

  private calculateDataSize(data: any): number {
    return JSON.stringify(data).length;
  }

  private determineDataType(data: any): string {
    if (typeof data === 'string') return 'string';
    if (typeof data === 'number') return 'number';
    if (typeof data === 'boolean') return 'boolean';
    if (Array.isArray(data)) return 'array';
    if (data && typeof data === 'object') return 'object';
    return 'unknown';
  }

  private calculateDataHash(data: any): string {
    // Simple hash implementation - in production, use crypto.createHash
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private determineStepType(step: string): string {
    const stepTypes: Record<string, string> = {
      'compression': 'data_processing',
      'encryption': 'security',
      'indexing': 'metadata',
      'storage': 'persistence',
      'retrieval': 'access'
    };
    return stepTypes[step.toLowerCase()] || 'unknown';
  }

  private getExpectedStepDuration(step: string): number {
    const durations: Record<string, number> = {
      'compression': 500,
      'encryption': 1000,
      'indexing': 300,
      'storage': 2000,
      'retrieval': 800
    };
    return durations[step.toLowerCase()] || 1000;
  }

  private getPreviousStep(step: string): string | null {
    const pipeline = ['compression', 'encryption', 'indexing', 'security', 'storage'];
    const index = pipeline.indexOf(step.toLowerCase());
    return index > 0 ? pipeline[index - 1] : null;
  }

  private getNextStep(step: string): string | null {
    const pipeline = ['compression', 'encryption', 'indexing', 'security', 'storage'];
    const index = pipeline.indexOf(step.toLowerCase());
    return index >= 0 && index < pipeline.length - 1 ? pipeline[index + 1] : null;
  }

  private hashSensitiveData(data: string): string {
    // Simple hash for sensitive data - in production, use proper hashing
    return this.calculateDataHash(data);
  }

  private determineContractType(contractAddress: string): string {
    // In real implementation, this would query the blockchain
    if (contractAddress.startsWith('0x')) return 'ethereum_compatible';
    return 'unknown';
  }

  private getContractNetwork(contractAddress: string): string {
    // In real implementation, this would determine the actual network
    return process.env.PI_NETWORK_TYPE || 'testnet';
  }

  private checkWalletConnection(): boolean {
    // In real implementation, this would check actual wallet connection
    return true;
  }

  private getPiNetworkStatus(): string {
    // In real implementation, this would check Pi Network status
    return 'connected';
  }

  private getCurrentGasPrice(): number {
    // In real implementation, this would fetch current gas price
    return 20; // Gwei
  }

  private determineMetricType(metric: string): string {
    const metricTypes: Record<string, string> = {
      'latency': 'time',
      'throughput': 'rate',
      'errorrate': 'percentage',
      'availability': 'percentage',
      'cpu': 'percentage',
      'memory': 'percentage'
    };
    return metricTypes[metric.toLowerCase()] || 'unknown';
  }

  private getMetricUnit(metric: string): string {
    const units: Record<string, string> = {
      'latency': 'ms',
      'throughput': 'rps',
      'errorrate': '%',
      'availability': '%',
      'cpu': '%',
      'memory': '%'
    };
    return units[metric.toLowerCase()] || 'unknown';
  }

  private getHistoricalAverage(metric: string): number {
    // In real implementation, this would calculate from historical data
    const averages: Record<string, number> = {
      'latency': 150,
      'throughput': 85,
      'errorrate': 0.5,
      'availability': 99.9
    };
    return averages[metric.toLowerCase()] || 0;
  }

  private getTrendDirection(metric: string, currentValue: number): string {
    const historical = this.getHistoricalAverage(metric);
    if (currentValue > historical * 1.1) return 'increasing';
    if (currentValue < historical * 0.9) return 'decreasing';
    return 'stable';
  }

  private getCurrentSystemLoad(): number {
    // In real implementation, this would get actual system load
    return Math.random() * 100;
  }

  private getCurrentMemoryUsage(): number {
    // In real implementation, this would get actual memory usage
    return Math.random() * 100;
  }

  private getActiveConnectionCount(): number {
    // In real implementation, this would count active connections
    return Math.floor(Math.random() * 100) + 10;
  }

  private getLocalNodeId(): string {
    return process.env.NODE_ID || 'local-node-' + Math.random().toString(36).substr(2, 9);
  }

  private getNodeRegion(nodeId: string): string {
    // In real implementation, this would determine node region
    const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];
    return regions[Math.floor(Math.random() * regions.length)];
  }

  private getNodeStatus(nodeId: string): string {
    // In real implementation, this would check actual node status
    const statuses = ['healthy', 'degraded', 'unhealthy'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  private getNetworkHealth(networkType: string): string {
    // In real implementation, this would check network health
    return 'healthy';
  }

  private getPeerCount(networkType: string): number {
    // In real implementation, this would count actual peers
    return Math.floor(Math.random() * 50) + 5;
  }

  private measureNetworkLatency(): number {
    // In real implementation, this would measure actual latency
    return Math.random() * 200 + 10;
  }

  private measureBandwidth(): number {
    // In real implementation, this would measure actual bandwidth
    return Math.random() * 1000 + 100; // Mbps
  }

  private measurePacketLoss(): number {
    // In real implementation, this would measure actual packet loss
    return Math.random() * 5; // Percentage
  }

  private assessConnectionQuality(): string {
    const latency = this.measureNetworkLatency();
    const packetLoss = this.measurePacketLoss();
    
    if (latency < 50 && packetLoss < 1) return 'excellent';
    if (latency < 100 && packetLoss < 2) return 'good';
    if (latency < 200 && packetLoss < 5) return 'fair';
    return 'poor';
  }

  private getCurrentSessionId(): string {
    return 'session-' + Math.random().toString(36).substr(2, 9);
  }

  private getClientIpAddress(): string {
    // In real implementation, this would get actual client IP
    return '192.168.1.' + Math.floor(Math.random() * 255);
  }

  private getUserAgent(): string {
    // In real implementation, this would get actual user agent
    return 'AnarQ-Demo-Client/1.0.0';
  }

  private getUserRole(userId: string): string {
    // In real implementation, this would fetch user role
    const roles = ['user', 'admin', 'moderator', 'developer'];
    return roles[Math.floor(Math.random() * roles.length)];
  }

  private getLastUserActivity(userId: string): Date {
    // In real implementation, this would fetch last activity
    return new Date(Date.now() - Math.random() * 3600000); // Within last hour
  }

  private determineResourceType(resourceId: string): string {
    if (resourceId.includes('user')) return 'user_data';
    if (resourceId.includes('file')) return 'file_data';
    if (resourceId.includes('contract')) return 'smart_contract';
    return 'unknown';
  }

  private getResourceAccessLevel(resourceId: string): string {
    const levels = ['public', 'private', 'restricted', 'confidential'];
    return levels[Math.floor(Math.random() * levels.length)];
  }

  private getAuthenticationMethod(): string {
    const methods = ['pi_wallet', 'squid_identity', 'oauth', 'api_key'];
    return methods[Math.floor(Math.random() * methods.length)];
  }

  private getCurrentSecurityLevel(): string {
    const levels = ['low', 'medium', 'high', 'maximum'];
    return levels[Math.floor(Math.random() * levels.length)];
  }

  private getCurrentThreatLevel(): string {
    const levels = ['minimal', 'low', 'medium', 'high'];
    return levels[Math.floor(Math.random() * levels.length)];
  }

  private getRecentFailedAttempts(): number {
    return Math.floor(Math.random() * 5);
  }

  private generateValidationId(): string {
    return 'validation-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  private getValidationRule(validationType: string): string {
    const rules: Record<string, string> = {
      'integrity': 'data_hash_match',
      'decentralization': 'min_node_count',
      'performance': 'threshold_compliance',
      'audit': 'signature_verification'
    };
    return rules[validationType] || 'unknown';
  }

  private getValidationSeverity(validationType: string): string {
    const severities: Record<string, string> = {
      'integrity': 'critical',
      'decentralization': 'high',
      'performance': 'medium',
      'audit': 'critical'
    };
    return severities[validationType] || 'medium';
  }

  private getPreviousValidations(validationType: string): number {
    // In real implementation, this would count previous validations
    return Math.floor(Math.random() * 10);
  }

  private getValidationChain(): string[] {
    return ['input_validation', 'business_rules', 'security_checks', 'integrity_verification'];
  }

  private deepEqual(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  private analyzeDifferences(expected: any, actual: any): Record<string, any> {
    return {
      typeMatch: typeof expected === typeof actual,
      sizeMatch: JSON.stringify(expected).length === JSON.stringify(actual).length,
      structureMatch: this.compareStructure(expected, actual),
      contentMatch: this.deepEqual(expected, actual)
    };
  }

  private compareStructure(obj1: any, obj2: any): boolean {
    if (typeof obj1 !== typeof obj2) return false;
    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
    if (typeof obj1 === 'object' && obj1 !== null && obj2 !== null) {
      const keys1 = Object.keys(obj1).sort();
      const keys2 = Object.keys(obj2).sort();
      return JSON.stringify(keys1) === JSON.stringify(keys2);
    }
    return true;
  }
}