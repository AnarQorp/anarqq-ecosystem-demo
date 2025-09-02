import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { DemoOrchestratorService } from '../services/DemoOrchestratorService.js';
import { PerformanceMetricsService } from '../services/PerformanceMetricsService.js';
import { QNETScalingManager } from '../services/QNETScalingManager.js';
import { LoadBalancer } from '../services/LoadBalancer.js';
import { DecentralizationValidationService } from '../services/DecentralizationValidationService.js';
import { BaseConfig } from '../config/index.js';
import { Environment } from '../types/index.js';

/**
 * Performance and Scalability Testing
 * 
 * Run performance tests with validation gate requirements (≤2s latency, ≥100 RPS, ≤1% error rate)
 * Test QNET Phase 2 scaling with dynamic node provisioning and load balancing
 * Validate decentralization requirements with distributed node operation
 * 
 * Requirements: 7.2, 7.3, 7.4, 7.6
 */
describe('Performance and Scalability Tests', () => {
  let orchestrator: DemoOrchestratorService;
  let performanceMetrics: PerformanceMetricsService;
  let scalingManager: QNETScalingManager;
  let loadBalancer: LoadBalancer;
  let decentralizationValidator: DecentralizationValidationService;
  let config: BaseConfig;

  // Performance validation gates
  const VALIDATION_GATES = {
    maxLatency: 2000, // 2 seconds
    minThroughput: 100, // 100 RPS
    maxErrorRate: 0.01, // 1%
    minAvailability: 0.99, // 99%
    minNodes: 5,
    maxSinglePointFailures: 0,
    minGeographicDistribution: 3
  };

  // QNET Phase 2 scaling thresholds
  const SCALING_THRESHOLDS = {
    cpuThreshold: 70, // 70%
    memoryThreshold: 80, // 80%
    networkLatencyThreshold: 200 // 200ms
  };

  beforeAll(async () => {
    config = new BaseConfig();
    
    // Initialize performance and scaling services
    performanceMetrics = new PerformanceMetricsService();
    scalingManager = new QNETScalingManager();
    loadBalancer = new LoadBalancer();
    decentralizationValidator = new DecentralizationValidationService();
    
    // Initialize orchestrator for QNET Phase 2 environment
    orchestrator = new DemoOrchestratorService(
      config,
      {} as any, // Scenario engine - will be mocked for performance tests
      performanceMetrics,
      {} as any, // Module registry
      {} as any  // Error handler
    );

    await orchestrator.initialize('qnet-phase2');
  });

  afterAll(async () => {
    if (orchestrator) {
      await orchestrator.shutdown();
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Performance Validation Gates', () => {
    it('should meet latency requirements (≤2s)', async () => {
      // Requirement 7.2: Latency validation
      const testDuration = 60000; // 1 minute test
      const requestInterval = 100; // 100ms between requests
      const latencyMeasurements: number[] = [];

      const startTime = Date.now();
      
      while (Date.now() - startTime < testDuration) {
        const requestStart = Date.now();
        
        try {
          // Execute a representative operation
          await orchestrator.executeScenario('identity', 'qnet-phase2');
          
          const latency = Date.now() - requestStart;
          latencyMeasurements.push(latency);
          
        } catch (error) {
          // Record failed requests for error rate calculation
          latencyMeasurements.push(-1);
        }
        
        // Wait before next request
        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }

      // Calculate latency percentiles
      const successfulRequests = latencyMeasurements.filter(l => l > 0);
      successfulRequests.sort((a, b) => a - b);
      
      const p50 = successfulRequests[Math.floor(successfulRequests.length * 0.5)];
      const p95 = successfulRequests[Math.floor(successfulRequests.length * 0.95)];
      const p99 = successfulRequests[Math.floor(successfulRequests.length * 0.99)];
      
      console.log(`Latency P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`);
      
      // Validate against requirements
      expect(p95, 'P95 latency should be ≤2000ms').toBeLessThanOrEqual(VALIDATION_GATES.maxLatency);
      expect(p99, 'P99 latency should be ≤2000ms').toBeLessThanOrEqual(VALIDATION_GATES.maxLatency);
      
      // Store metrics for reporting
      await performanceMetrics.recordLatencyMetrics({
        p50,
        p95,
        p99,
        average: successfulRequests.reduce((a, b) => a + b, 0) / successfulRequests.length
      });
    });

    it('should meet throughput requirements (≥100 RPS)', async () => {
      // Requirement 7.3: Throughput validation
      const testDuration = 30000; // 30 seconds
      const concurrentUsers = 50;
      const requestsPerUser = 100;
      
      const startTime = Date.now();
      const completedRequests: Array<{ success: boolean; duration: number }> = [];
      
      // Create concurrent user simulations
      const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
        const userResults: Array<{ success: boolean; duration: number }> = [];
        
        for (let i = 0; i < requestsPerUser; i++) {
          if (Date.now() - startTime > testDuration) break;
          
          const requestStart = Date.now();
          
          try {
            await orchestrator.executeScenario('content', 'qnet-phase2');
            userResults.push({ success: true, duration: Date.now() - requestStart });
          } catch (error) {
            userResults.push({ success: false, duration: Date.now() - requestStart });
          }
        }
        
        return userResults;
      });
      
      // Wait for all users to complete
      const allResults = await Promise.all(userPromises);
      allResults.forEach(userResults => completedRequests.push(...userResults));
      
      const actualDuration = Date.now() - startTime;
      const successfulRequests = completedRequests.filter(r => r.success).length;
      const throughput = (successfulRequests / actualDuration) * 1000; // RPS
      
      console.log(`Throughput: ${throughput.toFixed(2)} RPS (${successfulRequests} successful requests in ${actualDuration}ms)`);
      
      // Validate against requirements
      expect(throughput, 'Throughput should be ≥100 RPS').toBeGreaterThanOrEqual(VALIDATION_GATES.minThroughput);
      
      // Store metrics
      await performanceMetrics.recordThroughputMetrics({
        requestsPerSecond: throughput,
        totalRequests: completedRequests.length,
        successfulRequests,
        testDuration: actualDuration
      });
    });

    it('should meet error rate requirements (≤1%)', async () => {
      // Requirement 7.4: Error rate validation
      const totalRequests = 1000;
      const results: Array<{ success: boolean; error?: string }> = [];
      
      // Execute requests in batches to avoid overwhelming the system
      const batchSize = 10;
      const batches = Math.ceil(totalRequests / batchSize);
      
      for (let batch = 0; batch < batches; batch++) {
        const batchPromises = Array.from({ length: Math.min(batchSize, totalRequests - batch * batchSize) }, async () => {
          try {
            await orchestrator.executeScenario('dao', 'qnet-phase2');
            return { success: true };
          } catch (error) {
            return { 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const successfulRequests = results.filter(r => r.success).length;
      const failedRequests = results.filter(r => !r.success).length;
      const errorRate = failedRequests / totalRequests;
      
      console.log(`Error Rate: ${(errorRate * 100).toFixed(2)}% (${failedRequests}/${totalRequests} failed)`);
      
      // Validate against requirements
      expect(errorRate, 'Error rate should be ≤1%').toBeLessThanOrEqual(VALIDATION_GATES.maxErrorRate);
      
      // Analyze error types if any
      if (failedRequests > 0) {
        const errorTypes = results
          .filter(r => !r.success)
          .reduce((acc, r) => {
            const errorType = r.error?.split(':')[0] || 'Unknown';
            acc[errorType] = (acc[errorType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        
        console.log('Error breakdown:', errorTypes);
      }
      
      // Store metrics
      await performanceMetrics.recordErrorMetrics({
        errorRate,
        totalRequests,
        failedRequests,
        errorBreakdown: results.filter(r => !r.success).map(r => r.error || 'Unknown')
      });
    });

    it('should meet availability requirements (≥99%)', async () => {
      // Requirement 7.4: Availability validation
      const monitoringDuration = 300000; // 5 minutes
      const checkInterval = 5000; // 5 seconds
      const availabilityChecks: Array<{ timestamp: number; available: boolean }> = [];
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < monitoringDuration) {
        const checkStart = Date.now();
        
        try {
          // Perform health check
          const health = await orchestrator.getHealthStatus();
          const isAvailable = health.overall === 'healthy';
          
          availabilityChecks.push({
            timestamp: checkStart,
            available: isAvailable
          });
          
        } catch (error) {
          availabilityChecks.push({
            timestamp: checkStart,
            available: false
          });
        }
        
        // Wait for next check
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
      
      const totalChecks = availabilityChecks.length;
      const availableChecks = availabilityChecks.filter(c => c.available).length;
      const availability = availableChecks / totalChecks;
      
      console.log(`Availability: ${(availability * 100).toFixed(2)}% (${availableChecks}/${totalChecks} checks passed)`);
      
      // Validate against requirements
      expect(availability, 'Availability should be ≥99%').toBeGreaterThanOrEqual(VALIDATION_GATES.minAvailability);
      
      // Store metrics
      await performanceMetrics.recordAvailabilityMetrics({
        availability,
        totalChecks,
        availableChecks,
        monitoringDuration
      });
    });
  });

  describe('QNET Phase 2 Scaling', () => {
    it('should perform dynamic node provisioning based on CPU threshold', async () => {
      // Requirement 7.6: Dynamic node scaling
      
      // Simulate high CPU load
      const initialNodeCount = await scalingManager.getCurrentNodeCount();
      
      // Trigger CPU-based scaling
      await scalingManager.simulateResourceLoad({
        cpu: SCALING_THRESHOLDS.cpuThreshold + 10, // Exceed threshold
        memory: 50,
        networkLatency: 100
      });
      
      // Wait for scaling to trigger
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const scalingResult = await scalingManager.checkScalingStatus();
      
      expect(scalingResult.triggered).toBe(true);
      expect(scalingResult.reason).toContain('CPU');
      expect(scalingResult.newNodeCount).toBeGreaterThan(initialNodeCount);
      
      // Verify new nodes are healthy
      const newNodes = await scalingManager.getRecentlyProvisionedNodes();
      expect(newNodes.length).toBeGreaterThan(0);
      
      for (const node of newNodes) {
        expect(node.status).toBe('active');
        expect(node.healthScore).toBeGreaterThan(0.8);
      }
    });

    it('should perform dynamic node provisioning based on memory threshold', async () => {
      // Requirement 7.6: Memory-based scaling
      
      const initialNodeCount = await scalingManager.getCurrentNodeCount();
      
      // Trigger memory-based scaling
      await scalingManager.simulateResourceLoad({
        cpu: 50,
        memory: SCALING_THRESHOLDS.memoryThreshold + 10, // Exceed threshold
        networkLatency: 100
      });
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const scalingResult = await scalingManager.checkScalingStatus();
      
      expect(scalingResult.triggered).toBe(true);
      expect(scalingResult.reason).toContain('Memory');
      expect(scalingResult.newNodeCount).toBeGreaterThan(initialNodeCount);
    });

    it('should perform geographic distribution scaling based on network latency', async () => {
      // Requirement 7.6: Network latency-based scaling
      
      const initialDistribution = await scalingManager.getGeographicDistribution();
      
      // Trigger network latency-based scaling
      await scalingManager.simulateResourceLoad({
        cpu: 50,
        memory: 50,
        networkLatency: SCALING_THRESHOLDS.networkLatencyThreshold + 50 // Exceed threshold
      });
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const scalingResult = await scalingManager.checkScalingStatus();
      
      expect(scalingResult.triggered).toBe(true);
      expect(scalingResult.reason).toContain('Network');
      
      // Verify geographic distribution improved
      const newDistribution = await scalingManager.getGeographicDistribution();
      expect(newDistribution.regions.length).toBeGreaterThanOrEqual(initialDistribution.regions.length);
      expect(newDistribution.averageLatency).toBeLessThan(initialDistribution.averageLatency);
    });

    it('should handle load balancing across scaled nodes', async () => {
      // Requirement 7.6: Load balancing validation
      
      // Ensure we have multiple nodes
      const nodeCount = await scalingManager.getCurrentNodeCount();
      if (nodeCount < 3) {
        await scalingManager.provisionAdditionalNodes(3 - nodeCount);
      }
      
      const nodes = await scalingManager.getActiveNodes();
      expect(nodes.length).toBeGreaterThanOrEqual(3);
      
      // Test load distribution
      const requestCount = 100;
      const nodeRequestCounts: Record<string, number> = {};
      
      for (let i = 0; i < requestCount; i++) {
        const selectedNode = await loadBalancer.selectNode(nodes);
        nodeRequestCounts[selectedNode.id] = (nodeRequestCounts[selectedNode.id] || 0) + 1;
      }
      
      // Verify load is distributed
      const requestCounts = Object.values(nodeRequestCounts);
      const avgRequests = requestCount / nodes.length;
      const maxDeviation = avgRequests * 0.3; // Allow 30% deviation
      
      requestCounts.forEach(count => {
        expect(Math.abs(count - avgRequests)).toBeLessThanOrEqual(maxDeviation);
      });
      
      console.log('Load distribution:', nodeRequestCounts);
    });

    it('should handle automatic failover during node failures', async () => {
      // Requirement 7.6: Failover validation
      
      const nodes = await scalingManager.getActiveNodes();
      expect(nodes.length).toBeGreaterThan(1);
      
      // Simulate node failure
      const targetNode = nodes[0];
      await scalingManager.simulateNodeFailure(targetNode.id);
      
      // Wait for failover detection
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify failover occurred
      const healthStatus = await loadBalancer.checkNodeHealth(targetNode.id);
      expect(healthStatus.isHealthy).toBe(false);
      
      // Verify traffic is redirected
      const activeNodes = await loadBalancer.getActiveNodes();
      expect(activeNodes.find(n => n.id === targetNode.id)).toBeUndefined();
      
      // Verify system continues to function
      const testResult = await orchestrator.executeScenario('identity', 'qnet-phase2');
      expect(testResult.status).toBe('success');
    });
  });

  describe('Decentralization Validation', () => {
    it('should validate minimum node count requirement', async () => {
      // Requirement 7.6: Minimum node validation
      
      const nodeCount = await decentralizationValidator.getCurrentNodeCount();
      
      expect(nodeCount, `Should have at least ${VALIDATION_GATES.minNodes} nodes`).toBeGreaterThanOrEqual(VALIDATION_GATES.minNodes);
      
      // Verify nodes are distributed
      const nodeDistribution = await decentralizationValidator.getNodeDistribution();
      expect(nodeDistribution.totalNodes).toBe(nodeCount);
      expect(nodeDistribution.activeNodes).toBe(nodeCount);
    });

    it('should validate geographic distribution requirements', async () => {
      // Requirement 7.6: Geographic distribution validation
      
      const geoDistribution = await decentralizationValidator.getGeographicDistribution();
      
      expect(geoDistribution.regions.length, `Should have nodes in at least ${VALIDATION_GATES.minGeographicDistribution} regions`).toBeGreaterThanOrEqual(VALIDATION_GATES.minGeographicDistribution);
      
      // Verify reasonable distribution across regions
      const nodesPerRegion = geoDistribution.regions.map(r => r.nodeCount);
      const totalNodes = nodesPerRegion.reduce((a, b) => a + b, 0);
      const avgNodesPerRegion = totalNodes / geoDistribution.regions.length;
      
      // No region should have more than 60% of total nodes
      nodesPerRegion.forEach(count => {
        expect(count / totalNodes).toBeLessThanOrEqual(0.6);
      });
    });

    it('should validate network partition tolerance', async () => {
      // Requirement 7.6: Network partition tolerance
      
      const nodes = await decentralizationValidator.getActiveNodes();
      const partitionSize = Math.floor(nodes.length / 3); // Create minority partition
      
      // Simulate network partition
      const partitionedNodes = nodes.slice(0, partitionSize);
      await decentralizationValidator.simulateNetworkPartition(partitionedNodes.map(n => n.id));
      
      // Wait for partition detection
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verify majority partition continues to function
      const majorityNodes = nodes.slice(partitionSize);
      const consensusHealth = await decentralizationValidator.checkConsensusHealth(majorityNodes.map(n => n.id));
      
      expect(consensusHealth.canReachConsensus).toBe(true);
      expect(consensusHealth.participatingNodes).toBeGreaterThan(nodes.length / 2);
      
      // Verify system continues to process transactions
      const testResult = await orchestrator.executeScenario('content', 'qnet-phase2');
      expect(testResult.status).toBe('success');
      
      // Restore partition
      await decentralizationValidator.restoreNetworkPartition();
    });

    it('should validate no single points of failure', async () => {
      // Requirement 7.6: Single point of failure validation
      
      const spofAnalysis = await decentralizationValidator.analyzeSinglePointsOfFailure();
      
      expect(spofAnalysis.singlePointsOfFailure.length, 'Should have no single points of failure').toBe(VALIDATION_GATES.maxSinglePointFailures);
      
      // Verify critical services are distributed
      const criticalServices = ['consensus', 'storage', 'networking', 'authentication'];
      
      for (const service of criticalServices) {
        const serviceDistribution = await decentralizationValidator.getServiceDistribution(service);
        expect(serviceDistribution.nodeCount, `${service} should be distributed across multiple nodes`).toBeGreaterThan(1);
        expect(serviceDistribution.redundancyLevel, `${service} should have adequate redundancy`).toBeGreaterThan(1);
      }
    });

    it('should validate consensus mechanism under load', async () => {
      // Requirement 7.6: Consensus validation under load
      
      const nodes = await decentralizationValidator.getActiveNodes();
      const transactionLoad = 1000; // High transaction load
      
      // Generate concurrent transactions
      const transactions = Array.from({ length: transactionLoad }, (_, i) => ({
        id: `tx-${i}`,
        type: 'test',
        data: `Test transaction ${i}`,
        timestamp: Date.now()
      }));
      
      const startTime = Date.now();
      
      // Submit transactions concurrently
      const results = await Promise.all(
        transactions.map(tx => decentralizationValidator.submitTransaction(tx))
      );
      
      const processingTime = Date.now() - startTime;
      
      // Verify consensus was maintained
      const consensusHealth = await decentralizationValidator.checkConsensusHealth();
      expect(consensusHealth.canReachConsensus).toBe(true);
      expect(consensusHealth.consensusLatency).toBeLessThan(5000); // 5 seconds max
      
      // Verify transaction processing
      const successfulTxs = results.filter(r => r.success).length;
      const successRate = successfulTxs / transactionLoad;
      
      expect(successRate, 'Transaction success rate should be high under load').toBeGreaterThan(0.95);
      
      console.log(`Processed ${successfulTxs}/${transactionLoad} transactions in ${processingTime}ms`);
    });
  });

  describe('Distributed Node Operation', () => {
    it('should validate distributed storage across nodes', async () => {
      // Requirement 7.6: Distributed storage validation
      
      const testData = Array.from({ length: 100 }, (_, i) => ({
        id: `data-${i}`,
        content: `Test content ${i}`,
        size: Math.floor(Math.random() * 1000) + 100
      }));
      
      // Store data across the network
      const storageResults = await Promise.all(
        testData.map(data => decentralizationValidator.storeData(data))
      );
      
      // Verify data is distributed
      const storageDistribution = await decentralizationValidator.getStorageDistribution();
      
      expect(storageDistribution.totalNodes).toBeGreaterThan(1);
      expect(storageDistribution.replicationFactor).toBeGreaterThan(1);
      
      // Verify no single node stores all data
      const maxDataPerNode = Math.max(...storageDistribution.nodesData.map(n => n.dataCount));
      const totalDataItems = testData.length;
      
      expect(maxDataPerNode / totalDataItems).toBeLessThan(0.8); // No node should have >80% of data
      
      // Verify data retrieval works from multiple nodes
      const retrievalTests = testData.slice(0, 10); // Test subset
      const retrievalResults = await Promise.all(
        retrievalTests.map(data => decentralizationValidator.retrieveData(data.id))
      );
      
      retrievalResults.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.data.content).toBe(retrievalTests[index].content);
      });
    });

    it('should validate distributed computation across nodes', async () => {
      // Requirement 7.6: Distributed computation validation
      
      const computationTasks = Array.from({ length: 50 }, (_, i) => ({
        id: `task-${i}`,
        type: 'hash_computation',
        input: `Input data for task ${i}`,
        complexity: Math.floor(Math.random() * 5) + 1
      }));
      
      // Distribute computation tasks
      const computationResults = await Promise.all(
        computationTasks.map(task => decentralizationValidator.executeDistributedComputation(task))
      );
      
      // Verify tasks were distributed across nodes
      const executionDistribution = await decentralizationValidator.getComputationDistribution();
      
      expect(executionDistribution.participatingNodes).toBeGreaterThan(1);
      
      // Verify load balancing
      const tasksPerNode = executionDistribution.nodeExecutions.map(n => n.taskCount);
      const avgTasksPerNode = computationTasks.length / executionDistribution.participatingNodes;
      const maxDeviation = avgTasksPerNode * 0.4; // Allow 40% deviation
      
      tasksPerNode.forEach(count => {
        expect(Math.abs(count - avgTasksPerNode)).toBeLessThanOrEqual(maxDeviation);
      });
      
      // Verify computation results
      computationResults.forEach((result, index) => {
        expect(result.success, `Task ${index} should succeed`).toBe(true);
        expect(result.output, `Task ${index} should have output`).toBeDefined();
        expect(result.executionNode, `Task ${index} should specify execution node`).toBeDefined();
      });
    });

    it('should validate network resilience during node churn', async () => {
      // Requirement 7.6: Network resilience validation
      
      const initialNodes = await decentralizationValidator.getActiveNodes();
      const churnRate = 0.3; // 30% of nodes will be churned
      const nodesToChurn = Math.floor(initialNodes.length * churnRate);
      
      // Simulate node churn (nodes leaving and joining)
      const leavingNodes = initialNodes.slice(0, nodesToChurn);
      
      // Remove nodes
      await Promise.all(
        leavingNodes.map(node => decentralizationValidator.removeNode(node.id))
      );
      
      // Wait for network to adapt
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Add new nodes
      const newNodes = await Promise.all(
        Array.from({ length: nodesToChurn }, () => decentralizationValidator.addNode())
      );
      
      // Wait for new nodes to integrate
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Verify network health
      const networkHealth = await decentralizationValidator.getNetworkHealth();
      
      expect(networkHealth.isHealthy).toBe(true);
      expect(networkHealth.activeNodes).toBeGreaterThanOrEqual(initialNodes.length - 1);
      expect(networkHealth.consensusHealth).toBeGreaterThan(0.8);
      
      // Verify system functionality
      const testResult = await orchestrator.executeScenario('dao', 'qnet-phase2');
      expect(testResult.status).toBe('success');
      
      // Verify data availability after churn
      const dataAvailability = await decentralizationValidator.checkDataAvailability();
      expect(dataAvailability.availabilityRate).toBeGreaterThan(0.99);
    });
  });
});