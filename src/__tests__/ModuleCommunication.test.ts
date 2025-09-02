// Integration tests for Module Communication system
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleCommunication } from '../services/ModuleCommunication.js';
import { APIGateway } from '../services/APIGateway.js';
import { QerberosAuth } from '../services/QerberosAuth.js';
import {
  ModuleEvent,
  BroadcastMessage,
  AuthCredentials,
  ModuleCommunicationError,
  AuthenticationError
} from '../interfaces/ModuleCommunication.js';

describe('ModuleCommunication Integration', () => {
  let moduleCommunication: ModuleCommunication;
  let testCredentials: AuthCredentials;

  beforeEach(async () => {
    moduleCommunication = new ModuleCommunication();
    testCredentials = {
      userId: 'demo-user',
      token: 'test-token'
    };

    // Initialize authentication
    await moduleCommunication.initializeAuth('http://localhost:3005', testCredentials);
  });

  describe('Request Handling', () => {
    it('should send a successful request to a module', async () => {
      // Set module as healthy
      process.env.SQUID_HEALTHY = 'true';

      const response = await moduleCommunication.sendRequest(
        'squid',
        '/api/identity/create',
        'POST',
        { name: 'Test User' }
      );

      expect(response.success).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.auditCid).toBeDefined();
      expect(response.qerberosSignature).toBeDefined();
    });

    it('should handle module communication errors', async () => {
      // Set module as unhealthy
      process.env.SQUID_HEALTHY = 'false';

      await expect(
        moduleCommunication.sendRequest('squid', '/api/test', 'GET')
      ).rejects.toThrow(ModuleCommunicationError);
    });

    it('should validate request inputs', async () => {
      await expect(
        moduleCommunication.sendRequest('', '/api/test', 'GET')
      ).rejects.toThrow('Module ID is required');

      await expect(
        moduleCommunication.sendRequest('squid', '', 'GET')
      ).rejects.toThrow('Endpoint is required');

      await expect(
        moduleCommunication.sendRequest('squid', '/api/test', 'INVALID' as any)
      ).rejects.toThrow('Invalid HTTP method');
    });

    it('should handle authentication and authorization', async () => {
      process.env.QERBEROS_HEALTHY = 'true';

      const response = await moduleCommunication.sendRequest(
        'qerberos',
        '/api/auth/validate',
        'POST',
        { token: 'test-token' },
        { authenticated: true }
      );

      expect(response.success).toBe(true);
      expect(response.auditCid).toBeDefined();
    });

    it('should handle requests without authentication when specified', async () => {
      process.env.SQUID_HEALTHY = 'true';

      const response = await moduleCommunication.sendRequest(
        'squid',
        '/api/public/info',
        'GET',
        undefined,
        { authenticated: false }
      );

      expect(response.success).toBe(true);
    });
  });

  describe('Broadcasting', () => {
    it('should broadcast message to multiple modules', async () => {
      // Set modules as healthy
      process.env.SQUID_HEALTHY = 'true';
      process.env.QLOCK_HEALTHY = 'true';
      process.env.QINDEX_HEALTHY = 'true';

      const message: BroadcastMessage = {
        type: 'system-update',
        payload: { version: '1.0.0' },
        timestamp: new Date(),
        sender: 'demo-orchestrator'
      };

      const result = await moduleCommunication.broadcast(
        ['squid', 'qlock', 'qindex'],
        message
      );

      expect(result.success).toBe(true);
      expect(Object.keys(result.responses)).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle partial broadcast failures', async () => {
      // Set some modules as healthy, others as unhealthy
      process.env.SQUID_HEALTHY = 'true';
      process.env.QLOCK_HEALTHY = 'false';

      const message: BroadcastMessage = {
        type: 'test-message',
        payload: { data: 'test' },
        timestamp: new Date(),
        sender: 'test'
      };

      const result = await moduleCommunication.broadcast(
        ['squid', 'qlock'],
        message
      );

      expect(result.success).toBe(false);
      expect(result.failed).toContain('qlock');
      expect(result.responses['squid'].success).toBe(true);
      expect(result.responses['qlock'].success).toBe(false);
    });

    it('should require at least one module for broadcast', async () => {
      const message: BroadcastMessage = {
        type: 'test',
        payload: {},
        timestamp: new Date(),
        sender: 'test'
      };

      await expect(
        moduleCommunication.broadcast([], message)
      ).rejects.toThrow('At least one module ID is required');
    });
  });

  describe('Event Subscription', () => {
    it('should subscribe to module events', async () => {
      const eventCallback = vi.fn();

      const subscription = await moduleCommunication.subscribe(
        'squid',
        'identity-created',
        eventCallback
      );

      expect(subscription.success).toBe(true);
      expect(subscription.subscriptionId).toBeDefined();
      expect(subscription.moduleId).toBe('squid');
      expect(subscription.eventType).toBe('identity-created');
    });

    it('should handle events through subscriptions', async () => {
      const eventCallback = vi.fn();

      await moduleCommunication.subscribe(
        'squid',
        'identity-created',
        eventCallback
      );

      // Simulate incoming event
      const event: ModuleEvent = {
        type: 'identity-created',
        source: 'squid',
        data: { userId: 'test-user' },
        timestamp: new Date()
      };

      moduleCommunication.handleEvent(event);

      expect(eventCallback).toHaveBeenCalledWith(event);
    });

    it('should unsubscribe from events', async () => {
      const eventCallback = vi.fn();

      const subscription = await moduleCommunication.subscribe(
        'squid',
        'identity-created',
        eventCallback
      );

      expect(subscription.success).toBe(true);

      // Unsubscribe
      await moduleCommunication.unsubscribe(subscription.subscriptionId);

      // Simulate event after unsubscription
      const event: ModuleEvent = {
        type: 'identity-created',
        source: 'squid',
        data: { userId: 'test-user' },
        timestamp: new Date()
      };

      moduleCommunication.handleEvent(event);

      // Callback should not be called after unsubscription
      expect(eventCallback).not.toHaveBeenCalled();
    });

    it('should handle unsubscribe from non-existent subscription', async () => {
      await expect(
        moduleCommunication.unsubscribe('non-existent-subscription')
      ).rejects.toThrow('Subscription non-existent-subscription not found');
    });

    it('should validate subscription inputs', async () => {
      const eventCallback = vi.fn();

      const invalidSubscription = await moduleCommunication.subscribe(
        '',
        'test-event',
        eventCallback
      );

      expect(invalidSubscription.success).toBe(false);
      expect(invalidSubscription.error).toContain('required');
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track communication statistics', async () => {
      process.env.SQUID_HEALTHY = 'true';

      // Make several requests
      await moduleCommunication.sendRequest('squid', '/api/test1', 'GET');
      await moduleCommunication.sendRequest('squid', '/api/test2', 'POST');

      const stats = await moduleCommunication.getStats();

      expect(stats.totalRequests).toBeGreaterThanOrEqual(2);
      expect(stats.successfulRequests).toBeGreaterThanOrEqual(2);
      expect(stats.moduleStats['squid']).toBeDefined();
      expect(stats.moduleStats['squid'].requestCount).toBeGreaterThanOrEqual(2);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });

    it('should track error statistics', async () => {
      process.env.SQUID_HEALTHY = 'false';

      let errorOccurred = false;
      try {
        await moduleCommunication.sendRequest('squid', '/api/test', 'GET');
      } catch (error) {
        errorOccurred = true;
        expect(error).toBeInstanceOf(ModuleCommunicationError);
      }

      expect(errorOccurred).toBe(true);

      const stats = await moduleCommunication.getStats();

      expect(stats.failedRequests).toBeGreaterThan(0);
      expect(stats.moduleStats['squid']).toBeDefined();
      expect(stats.moduleStats['squid'].errorCount).toBeGreaterThan(0);
    });

    it('should provide active subscriptions information', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      await moduleCommunication.subscribe('squid', 'event1', callback1);
      await moduleCommunication.subscribe('qlock', 'event2', callback2);

      const activeSubscriptions = moduleCommunication.getActiveSubscriptions();

      expect(activeSubscriptions).toHaveLength(2);
      expect(activeSubscriptions[0].active).toBe(true);
      expect(activeSubscriptions[1].active).toBe(true);
    });
  });

  describe('Authentication Integration', () => {
    it('should initialize authentication successfully', async () => {
      const newComm = new ModuleCommunication();
      
      await expect(
        newComm.initializeAuth('http://localhost:3005', testCredentials)
      ).resolves.not.toThrow();
    });

    it('should handle authentication failures', async () => {
      const invalidCredentials: AuthCredentials = {
        userId: 'invalid-user',
        token: 'invalid-token'
      };

      await expect(
        moduleCommunication.initializeAuth('http://localhost:3005', invalidCredentials)
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('Gateway Integration', () => {
    it('should access gateway for configuration', () => {
      const gateway = moduleCommunication.getGateway();
      expect(gateway).toBeInstanceOf(APIGateway);

      const registeredModules = gateway.getRegisteredModules();
      expect(registeredModules.length).toBeGreaterThan(0);
    });

    it('should access auth service for permissions', () => {
      const auth = moduleCommunication.getAuth();
      expect(auth).toBeInstanceOf(QerberosAuth);

      const permissions = auth.getUserPermissions('demo-user');
      expect(permissions.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      process.env.SQUID_HEALTHY = 'true';

      const response = await moduleCommunication.sendRequest(
        'squid',
        '/api/slow-endpoint',
        'GET',
        undefined,
        { timeout: 1 } // Very short timeout
      );

      // Should still get a response (simulated)
      expect(response).toBeDefined();
    });

    it('should handle malformed responses', async () => {
      process.env.SQUID_HEALTHY = 'true';

      // This should not throw, but handle gracefully
      const response = await moduleCommunication.sendRequest(
        'squid',
        '/api/malformed',
        'GET'
      );

      expect(response).toBeDefined();
      expect(response.success).toBeDefined();
    });

    it('should provide detailed error information', async () => {
      process.env.SQUID_HEALTHY = 'false';

      try {
        await moduleCommunication.sendRequest('squid', '/api/test', 'GET');
      } catch (error) {
        expect(error).toBeInstanceOf(ModuleCommunicationError);
        const commError = error as ModuleCommunicationError;
        expect(commError.moduleId).toBe('squid');
        expect(commError.message).toBeDefined();
      }
    });
  });

  describe('Module-to-Module Communication Patterns', () => {
    it('should support request-response pattern', async () => {
      process.env.SQUID_HEALTHY = 'true';
      process.env.QERBEROS_HEALTHY = 'true';

      // Simulate sQuid requesting authentication from Qerberos
      const authResponse = await moduleCommunication.sendRequest(
        'qerberos',
        '/api/auth/validate',
        'POST',
        { userId: 'test-user', token: 'test-token' }
      );

      expect(authResponse.success).toBe(true);
      expect(authResponse.data).toBeDefined();
    });

    it('should support publish-subscribe pattern through events', async () => {
      const eventCallback = vi.fn();

      // Subscribe to identity events
      await moduleCommunication.subscribe('squid', 'identity-updated', eventCallback);

      // Simulate identity update event
      const event: ModuleEvent = {
        type: 'identity-updated',
        source: 'squid',
        data: { userId: 'test-user', changes: ['email'] },
        timestamp: new Date()
      };

      moduleCommunication.handleEvent(event);

      expect(eventCallback).toHaveBeenCalledWith(event);
    });

    it('should support pipeline pattern through sequential requests', async () => {
      process.env.QPIC_HEALTHY = 'true';
      process.env.QLOCK_HEALTHY = 'true';
      process.env.QINDEX_HEALTHY = 'true';

      // Simulate Q∞ data flow pipeline
      const compressResponse = await moduleCommunication.sendRequest(
        'qpic',
        '/api/compress',
        'POST',
        { data: 'test-data' }
      );

      expect(compressResponse.success).toBe(true);

      const encryptResponse = await moduleCommunication.sendRequest(
        'qlock',
        '/api/encrypt',
        'POST',
        { data: compressResponse.data }
      );

      expect(encryptResponse.success).toBe(true);

      const indexResponse = await moduleCommunication.sendRequest(
        'qindex',
        '/api/index',
        'POST',
        { data: encryptResponse.data }
      );

      expect(indexResponse.success).toBe(true);
    });
  });
});