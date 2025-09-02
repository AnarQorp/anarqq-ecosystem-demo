// Tests for ErrorContextService

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ErrorContextService } from '../services/ErrorContextService.js';

describe('ErrorContextService', () => {
  let contextService: ErrorContextService;

  beforeEach(() => {
    contextService = new ErrorContextService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Module Context Building', () => {
    it('should build basic module context', () => {
      const context = contextService.buildModuleContext('qwallet');

      expect(context).toHaveProperty('moduleId', 'qwallet');
      expect(context).toHaveProperty('timestamp');
      expect(context).toHaveProperty('environment');
      expect(context).toHaveProperty('moduleType', 'finance');
      expect(context).toHaveProperty('expectedVersion');
      expect(context).toHaveProperty('dependencies');
    });

    it('should build module context with endpoint', () => {
      const context = contextService.buildModuleContext('qerberos', 'http://localhost:3002/api/auth');

      expect(context).toHaveProperty('moduleId', 'qerberos');
      expect(context).toHaveProperty('endpoint', 'http://localhost:3002/api/auth');
      expect(context).toHaveProperty('endpointType', 'api');
      expect(context).toHaveProperty('moduleType', 'security');
    });

    it('should determine correct module types', () => {
      const contexts = [
        { moduleId: 'squid', expectedType: 'identity' },
        { moduleId: 'qlock', expectedType: 'encryption' },
        { moduleId: 'qonsent', expectedType: 'privacy' },
        { moduleId: 'qindex', expectedType: 'indexing' },
        { moduleId: 'qerberos', expectedType: 'security' },
        { moduleId: 'qwallet', expectedType: 'finance' },
        { moduleId: 'qflow', expectedType: 'automation' },
        { moduleId: 'qnet', expectedType: 'network' },
        { moduleId: 'qdrive', expectedType: 'storage' },
        { moduleId: 'qpic', expectedType: 'compression' },
        { moduleId: 'qmarket', expectedType: 'commerce' },
        { moduleId: 'qmail', expectedType: 'communication' },
        { moduleId: 'qchat', expectedType: 'messaging' },
        { moduleId: 'qsocial', expectedType: 'social' }
      ];

      contexts.forEach(({ moduleId, expectedType }) => {
        const context = contextService.buildModuleContext(moduleId);
        expect(context.moduleType).toBe(expectedType);
      });
    });

    it('should determine correct endpoint types', () => {
      const endpoints = [
        { endpoint: 'http://localhost:3001/api/users', expectedType: 'api' },
        { endpoint: 'http://localhost:3001/health', expectedType: 'health' },
        { endpoint: 'http://localhost:3001/metrics', expectedType: 'metrics' },
        { endpoint: 'ws://localhost:3001/socket', expectedType: 'websocket' },
        { endpoint: 'wss://localhost:3001/secure-socket', expectedType: 'websocket' },
        { endpoint: 'http://localhost:3001/unknown', expectedType: 'unknown' }
      ];

      endpoints.forEach(({ endpoint, expectedType }) => {
        const context = contextService.buildModuleContext('test-module', endpoint);
        expect(context.endpointType).toBe(expectedType);
      });
    });

    it('should include module dependencies', () => {
      const context = contextService.buildModuleContext('qwallet');
      expect(context.dependencies).toContain('squid');
      expect(context.dependencies).toContain('qerberos');
    });
  });

  describe('Data Flow Context Building', () => {
    it('should build basic data flow context', () => {
      const context = contextService.buildDataFlowContext('flow-123', 'compression');

      expect(context).toHaveProperty('flowId', 'flow-123');
      expect(context).toHaveProperty('step', 'compression');
      expect(context).toHaveProperty('timestamp');
      expect(context).toHaveProperty('stepIndex', 1);
      expect(context).toHaveProperty('pipeline', 'Q∞');
      expect(context).toHaveProperty('stepType', 'data_processing');
    });

    it('should build data flow context with data', () => {
      const testData = { message: 'Hello World', size: 1024 };
      const context = contextService.buildDataFlowContext('flow-456', 'encryption', testData);

      expect(context).toHaveProperty('flowId', 'flow-456');
      expect(context).toHaveProperty('dataSize');
      expect(context).toHaveProperty('dataType', 'object');
      expect(context).toHaveProperty('dataHash');
      expect(context.dataSize).toBeGreaterThan(0);
    });

    it('should determine correct step indices', () => {
      const steps = [
        { step: 'compression', expectedIndex: 1 },
        { step: 'encryption', expectedIndex: 2 },
        { step: 'indexing', expectedIndex: 3 },
        { step: 'security', expectedIndex: 4 },
        { step: 'storage', expectedIndex: 5 }
      ];

      steps.forEach(({ step, expectedIndex }) => {
        const context = contextService.buildDataFlowContext('flow-test', step);
        expect(context.stepIndex).toBe(expectedIndex);
      });
    });

    it('should determine correct step types', () => {
      const stepTypes = [
        { step: 'compression', expectedType: 'data_processing' },
        { step: 'encryption', expectedType: 'security' },
        { step: 'indexing', expectedType: 'metadata' },
        { step: 'storage', expectedType: 'persistence' },
        { step: 'retrieval', expectedType: 'access' }
      ];

      stepTypes.forEach(({ step, expectedType }) => {
        const context = contextService.buildDataFlowContext('flow-test', step);
        expect(context.stepType).toBe(expectedType);
      });
    });

    it('should include previous and next steps', () => {
      const context = contextService.buildDataFlowContext('flow-test', 'encryption');
      expect(context.previousStep).toBe('compression');
      expect(context.nextStep).toBe('indexing');
    });

    it('should handle first and last steps correctly', () => {
      const firstStepContext = contextService.buildDataFlowContext('flow-test', 'compression');
      expect(firstStepContext.previousStep).toBeNull();
      expect(firstStepContext.nextStep).toBe('encryption');

      const lastStepContext = contextService.buildDataFlowContext('flow-test', 'storage');
      expect(lastStepContext.previousStep).toBe('security');
      expect(lastStepContext.nextStep).toBeNull();
    });

    it('should determine data types correctly', () => {
      const dataTypes = [
        { data: 'hello', expectedType: 'string' },
        { data: 42, expectedType: 'number' },
        { data: true, expectedType: 'boolean' },
        { data: [1, 2, 3], expectedType: 'array' },
        { data: { key: 'value' }, expectedType: 'object' }
      ];

      dataTypes.forEach(({ data, expectedType }) => {
        const context = contextService.buildDataFlowContext('flow-test', 'compression', data);
        expect(context.dataType).toBe(expectedType);
      });
    });
  });

  describe('Pi Network Context Building', () => {
    it('should build basic Pi Network context', () => {
      const context = contextService.buildPiNetworkContext();

      expect(context).toHaveProperty('timestamp');
      expect(context).toHaveProperty('networkType');
      expect(context).toHaveProperty('sdkVersion');
      expect(context).toHaveProperty('walletConnected');
      expect(context).toHaveProperty('networkStatus');
      expect(context).toHaveProperty('gasPrice');
    });

    it('should build Pi Network context with user ID', () => {
      const context = contextService.buildPiNetworkContext('pi-user-123');

      expect(context).toHaveProperty('piUserId', 'pi-user-123');
      expect(context).toHaveProperty('userIdHash');
      expect(context.userIdHash).toBeTruthy();
    });

    it('should build Pi Network context with contract address', () => {
      const context = contextService.buildPiNetworkContext(undefined, '0x1234567890abcdef');

      expect(context).toHaveProperty('contractAddress', '0x1234567890abcdef');
      expect(context).toHaveProperty('contractType');
      expect(context).toHaveProperty('contractNetwork');
    });

    it('should determine contract type from address', () => {
      const context = contextService.buildPiNetworkContext(undefined, '0x1234567890abcdef');
      expect(context.contractType).toBe('ethereum_compatible');

      const unknownContext = contextService.buildPiNetworkContext(undefined, 'unknown-format');
      expect(unknownContext.contractType).toBe('unknown');
    });

    it('should use environment variables for network configuration', () => {
      // Mock environment variables
      const originalEnv = process.env.PI_NETWORK_TYPE;
      process.env.PI_NETWORK_TYPE = 'mainnet';

      const context = contextService.buildPiNetworkContext();
      expect(context.networkType).toBe('mainnet');

      // Restore original environment
      if (originalEnv) {
        process.env.PI_NETWORK_TYPE = originalEnv;
      } else {
        delete process.env.PI_NETWORK_TYPE;
      }
    });
  });

  describe('Performance Context Building', () => {
    it('should build basic performance context', () => {
      const context = contextService.buildPerformanceContext('latency', 2500, 2000);

      expect(context).toHaveProperty('metric', 'latency');
      expect(context).toHaveProperty('value', 2500);
      expect(context).toHaveProperty('threshold', 2000);
      expect(context).toHaveProperty('thresholdExceeded', true);
      expect(context).toHaveProperty('exceedancePercentage', 25);
      expect(context).toHaveProperty('timestamp');
    });

    it('should calculate threshold exceedance correctly', () => {
      const contexts = [
        { value: 1500, threshold: 2000, expectedExceeded: false, expectedPercentage: -25 },
        { value: 2000, threshold: 2000, expectedExceeded: false, expectedPercentage: 0 },
        { value: 2500, threshold: 2000, expectedExceeded: true, expectedPercentage: 25 },
        { value: 3000, threshold: 2000, expectedExceeded: true, expectedPercentage: 50 }
      ];

      contexts.forEach(({ value, threshold, expectedExceeded, expectedPercentage }) => {
        const context = contextService.buildPerformanceContext('latency', value, threshold);
        expect(context.thresholdExceeded).toBe(expectedExceeded);
        expect(context.exceedancePercentage).toBe(expectedPercentage);
      });
    });

    it('should determine correct metric types and units', () => {
      const metrics = [
        { metric: 'latency', expectedType: 'time', expectedUnit: 'ms' },
        { metric: 'throughput', expectedType: 'rate', expectedUnit: 'rps' },
        { metric: 'errorRate', expectedType: 'percentage', expectedUnit: '%' },
        { metric: 'availability', expectedType: 'percentage', expectedUnit: '%' },
        { metric: 'cpu', expectedType: 'percentage', expectedUnit: '%' },
        { metric: 'memory', expectedType: 'percentage', expectedUnit: '%' }
      ];

      metrics.forEach(({ metric, expectedType, expectedUnit }) => {
        const context = contextService.buildPerformanceContext(metric, 100, 80);
        expect(context.metricType).toBe(expectedType);
        expect(context.measurementUnit).toBe(expectedUnit);
      });
    });

    it('should include system context', () => {
      const context = contextService.buildPerformanceContext('cpu', 85, 80);

      expect(context).toHaveProperty('systemLoad');
      expect(context).toHaveProperty('memoryUsage');
      expect(context).toHaveProperty('activeConnections');
      expect(context).toHaveProperty('historicalAverage');
      expect(context).toHaveProperty('trendDirection');
    });

    it('should determine trend direction correctly', () => {
      // Mock historical average
      vi.spyOn(contextService as any, 'getHistoricalAverage').mockReturnValue(100);

      const increasingContext = contextService.buildPerformanceContext('latency', 120, 80);
      expect(increasingContext.trendDirection).toBe('increasing');

      const decreasingContext = contextService.buildPerformanceContext('latency', 80, 80);
      expect(decreasingContext.trendDirection).toBe('decreasing');

      const stableContext = contextService.buildPerformanceContext('latency', 105, 80);
      expect(stableContext.trendDirection).toBe('stable');
    });
  });

  describe('Network Context Building', () => {
    it('should build basic network context', () => {
      const context = contextService.buildNetworkContext();

      expect(context).toHaveProperty('timestamp');
      expect(context).toHaveProperty('localNodeId');
      expect(context).toHaveProperty('latency');
      expect(context).toHaveProperty('bandwidth');
      expect(context).toHaveProperty('packetLoss');
      expect(context).toHaveProperty('connectionQuality');
    });

    it('should build network context with node ID', () => {
      const context = contextService.buildNetworkContext('qnet-node-123');

      expect(context).toHaveProperty('nodeId', 'qnet-node-123');
      expect(context).toHaveProperty('nodeRegion');
      expect(context).toHaveProperty('nodeStatus');
    });

    it('should build network context with network type', () => {
      const context = contextService.buildNetworkContext(undefined, 'qnet');

      expect(context).toHaveProperty('networkType', 'qnet');
      expect(context).toHaveProperty('networkHealth');
      expect(context).toHaveProperty('peerCount');
    });

    it('should assess connection quality correctly', () => {
      // Mock network measurements for predictable results
      vi.spyOn(contextService as any, 'measureNetworkLatency').mockReturnValue(30);
      vi.spyOn(contextService as any, 'measurePacketLoss').mockReturnValue(0.5);

      const context = contextService.buildNetworkContext();
      expect(context.connectionQuality).toBe('excellent');

      // Test different quality levels
      vi.spyOn(contextService as any, 'measureNetworkLatency').mockReturnValue(80);
      vi.spyOn(contextService as any, 'measurePacketLoss').mockReturnValue(1.5);

      const goodContext = contextService.buildNetworkContext();
      expect(goodContext.connectionQuality).toBe('good');

      vi.spyOn(contextService as any, 'measureNetworkLatency').mockReturnValue(150);
      vi.spyOn(contextService as any, 'measurePacketLoss').mockReturnValue(3);

      const fairContext = contextService.buildNetworkContext();
      expect(fairContext.connectionQuality).toBe('fair');

      vi.spyOn(contextService as any, 'measureNetworkLatency').mockReturnValue(300);
      vi.spyOn(contextService as any, 'measurePacketLoss').mockReturnValue(8);

      const poorContext = contextService.buildNetworkContext();
      expect(poorContext.connectionQuality).toBe('poor');
    });

    it('should include network diagnostics', () => {
      const context = contextService.buildNetworkContext('test-node', 'qnet');

      expect(typeof context.latency).toBe('number');
      expect(typeof context.bandwidth).toBe('number');
      expect(typeof context.packetLoss).toBe('number');
      expect(context.latency).toBeGreaterThan(0);
      expect(context.bandwidth).toBeGreaterThan(0);
      expect(context.packetLoss).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Security Context Building', () => {
    it('should build basic security context', () => {
      const context = contextService.buildSecurityContext();

      expect(context).toHaveProperty('timestamp');
      expect(context).toHaveProperty('sessionId');
      expect(context).toHaveProperty('ipAddress');
      expect(context).toHaveProperty('userAgent');
      expect(context).toHaveProperty('authenticationMethod');
      expect(context).toHaveProperty('securityLevel');
      expect(context).toHaveProperty('threatLevel');
      expect(context).toHaveProperty('recentFailedAttempts');
    });

    it('should build security context with user ID', () => {
      const context = contextService.buildSecurityContext('user-123');

      expect(context).toHaveProperty('userId', 'user-123');
      expect(context).toHaveProperty('userIdHash');
      expect(context).toHaveProperty('userRole');
      expect(context).toHaveProperty('lastActivity');
      expect(context.userIdHash).toBeTruthy();
    });

    it('should build security context with resource ID', () => {
      const context = contextService.buildSecurityContext(undefined, 'resource-456');

      expect(context).toHaveProperty('resourceId', 'resource-456');
      expect(context).toHaveProperty('resourceType');
      expect(context).toHaveProperty('accessLevel');
    });

    it('should determine resource types correctly', () => {
      const resources = [
        { resourceId: 'user-data-123', expectedType: 'user_data' },
        { resourceId: 'file-upload-456', expectedType: 'file_data' },
        { resourceId: 'contract-789', expectedType: 'smart_contract' },
        { resourceId: 'unknown-resource', expectedType: 'unknown' }
      ];

      resources.forEach(({ resourceId, expectedType }) => {
        const context = contextService.buildSecurityContext(undefined, resourceId);
        expect(context.resourceType).toBe(expectedType);
      });
    });

    it('should hash sensitive data', () => {
      const context1 = contextService.buildSecurityContext('user-123');
      const context2 = contextService.buildSecurityContext('user-123');
      const context3 = contextService.buildSecurityContext('user-456');

      // Same user should produce same hash
      expect(context1.userIdHash).toBe(context2.userIdHash);
      // Different users should produce different hashes
      expect(context1.userIdHash).not.toBe(context3.userIdHash);
    });

    it('should include security metrics', () => {
      const context = contextService.buildSecurityContext('user-123', 'resource-456');

      expect(['pi_wallet', 'squid_identity', 'oauth', 'api_key']).toContain(context.authenticationMethod);
      expect(['low', 'medium', 'high', 'maximum']).toContain(context.securityLevel);
      expect(['minimal', 'low', 'medium', 'high']).toContain(context.threatLevel);
      expect(['public', 'private', 'restricted', 'confidential']).toContain(context.accessLevel);
      expect(typeof context.recentFailedAttempts).toBe('number');
      expect(context.recentFailedAttempts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Validation Context Building', () => {
    it('should build basic validation context', () => {
      const context = contextService.buildValidationContext('integrity');

      expect(context).toHaveProperty('validationType', 'integrity');
      expect(context).toHaveProperty('timestamp');
      expect(context).toHaveProperty('validationId');
      expect(context).toHaveProperty('validationRule');
      expect(context).toHaveProperty('validationSeverity');
      expect(context).toHaveProperty('previousValidations');
      expect(context).toHaveProperty('validationChain');
    });

    it('should build validation context with expected and actual values', () => {
      const expected = { hash: 'abc123', size: 1024 };
      const actual = { hash: 'def456', size: 1024 };
      const context = contextService.buildValidationContext('integrity', expected, actual);

      expect(context).toHaveProperty('expected', expected);
      expect(context).toHaveProperty('actual', actual);
      expect(context).toHaveProperty('expectedType', 'object');
      expect(context).toHaveProperty('actualType', 'object');
      expect(context).toHaveProperty('expectedHash');
      expect(context).toHaveProperty('actualHash');
      expect(context).toHaveProperty('valuesMatch', false);
      expect(context).toHaveProperty('differenceAnalysis');
    });

    it('should determine validation rules correctly', () => {
      const validationTypes = [
        { type: 'integrity', expectedRule: 'data_hash_match' },
        { type: 'decentralization', expectedRule: 'min_node_count' },
        { type: 'performance', expectedRule: 'threshold_compliance' },
        { type: 'audit', expectedRule: 'signature_verification' }
      ];

      validationTypes.forEach(({ type, expectedRule }) => {
        const context = contextService.buildValidationContext(type);
        expect(context.validationRule).toBe(expectedRule);
      });
    });

    it('should determine validation severities correctly', () => {
      const validationSeverities = [
        { type: 'integrity', expectedSeverity: 'critical' },
        { type: 'decentralization', expectedSeverity: 'high' },
        { type: 'performance', expectedSeverity: 'medium' },
        { type: 'audit', expectedSeverity: 'critical' }
      ];

      validationSeverities.forEach(({ type, expectedSeverity }) => {
        const context = contextService.buildValidationContext(type);
        expect(context.validationSeverity).toBe(expectedSeverity);
      });
    });

    it('should detect value matches correctly', () => {
      const matchingContext = contextService.buildValidationContext('integrity', 'test', 'test');
      expect(matchingContext.valuesMatch).toBe(true);

      const nonMatchingContext = contextService.buildValidationContext('integrity', 'test1', 'test2');
      expect(nonMatchingContext.valuesMatch).toBe(false);

      const objectMatchingContext = contextService.buildValidationContext('integrity', { a: 1 }, { a: 1 });
      expect(objectMatchingContext.valuesMatch).toBe(true);

      const objectNonMatchingContext = contextService.buildValidationContext('integrity', { a: 1 }, { a: 2 });
      expect(objectNonMatchingContext.valuesMatch).toBe(false);
    });

    it('should analyze differences correctly', () => {
      const expected = { name: 'test', count: 5 };
      const actual = { name: 'test', count: 10 };
      const context = contextService.buildValidationContext('integrity', expected, actual);

      expect(context.differenceAnalysis).toHaveProperty('typeMatch', true);
      expect(context.differenceAnalysis).toHaveProperty('structureMatch', true);
      expect(context.differenceAnalysis).toHaveProperty('contentMatch', false);
    });

    it('should include validation chain', () => {
      const context = contextService.buildValidationContext('integrity');
      
      expect(Array.isArray(context.validationChain)).toBe(true);
      expect(context.validationChain).toContain('input_validation');
      expect(context.validationChain).toContain('business_rules');
      expect(context.validationChain).toContain('security_checks');
      expect(context.validationChain).toContain('integrity_verification');
    });

    it('should generate unique validation IDs', () => {
      const context1 = contextService.buildValidationContext('integrity');
      const context2 = contextService.buildValidationContext('integrity');

      expect(context1.validationId).not.toBe(context2.validationId);
      expect(context1.validationId).toMatch(/^validation-\d+-[a-z0-9]+$/);
      expect(context2.validationId).toMatch(/^validation-\d+-[a-z0-9]+$/);
    });
  });

  describe('Data Hash Calculation', () => {
    it('should calculate consistent hashes for same data', () => {
      const data = { message: 'test', value: 123 };
      const hash1 = (contextService as any).calculateDataHash(data);
      const hash2 = (contextService as any).calculateDataHash(data);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
    });

    it('should calculate different hashes for different data', () => {
      const data1 = { message: 'test1' };
      const data2 = { message: 'test2' };
      const hash1 = (contextService as any).calculateDataHash(data1);
      const hash2 = (contextService as any).calculateDataHash(data2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Environment Integration', () => {
    it('should use NODE_ENV for environment context', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const context = contextService.buildModuleContext('test-module');
      expect(context.environment).toBe('test');

      // Restore original environment
      if (originalEnv) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    it('should handle missing environment variables gracefully', () => {
      const originalNodeId = process.env.NODE_ID;
      delete process.env.NODE_ID;

      const context = contextService.buildNetworkContext();
      expect(context.localNodeId).toMatch(/^local-node-[a-z0-9]+$/);

      // Restore original environment
      if (originalNodeId) {
        process.env.NODE_ID = originalNodeId;
      }
    });
  });
});