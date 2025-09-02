/**
 * Consensus Simulator Implementation
 * Simulates various consensus mechanisms under Byzantine conditions for QNET Phase 2
 */

import {
  ConsensusSimulator,
  ConsensusValidation,
  ByzantineNode
} from '../interfaces/ByzantineFaultTolerance.js';

export class ConsensusSimulatorImpl implements ConsensusSimulator {
  private nodes: Map<string, ByzantineNode> = new Map();
  private consensusType: 'pbft' | 'raft' | 'pos' | 'pow' = 'pbft';
  private byzantineNodeIds: Set<string> = new Set();
  private networkPartitions: string[][] = [];
  private consensusHistory: ConsensusValidation[] = [];
  private currentRound: number = 0;

  async initializeConsensus(
    nodeCount: number,
    consensusType: 'pbft' | 'raft' | 'pos' | 'pow',
    byzantineCount: number
  ): Promise<void> {
    this.consensusType = consensusType;
    this.nodes.clear();
    this.byzantineNodeIds.clear();
    this.networkPartitions = [];
    this.consensusHistory = [];
    this.currentRound = 0;

    // Create honest nodes
    for (let i = 0; i < nodeCount; i++) {
      const nodeId = `consensus-node-${i + 1}`;
      const node: ByzantineNode = {
        nodeId,
        address: `192.168.1.${i + 1}`,
        port: 9000 + i,
        region: this.getRandomRegion(),
        status: 'honest',
        behaviorType: 'honest',
        maliciousActions: [],
        consensusParticipation: true,
        trustScore: 100
      };
      this.nodes.set(nodeId, node);
    }

    // Randomly select Byzantine nodes
    const nodeIds = Array.from(this.nodes.keys());
    const shuffled = nodeIds.sort(() => Math.random() - 0.5);
    const byzantineNodes = shuffled.slice(0, Math.min(byzantineCount, nodeIds.length));

    for (const nodeId of byzantineNodes) {
      const node = this.nodes.get(nodeId)!;
      node.status = 'byzantine';
      node.behaviorType = this.getRandomByzantineBehavior();
      node.trustScore = Math.random() * 50; // Lower trust score
      this.byzantineNodeIds.add(nodeId);
    }

    console.log(`Initialized ${consensusType} consensus with ${nodeCount} nodes (${byzantineCount} Byzantine)`);
  }

  async executeConsensusRound(proposedValue: any): Promise<ConsensusValidation> {
    const startTime = Date.now();
    this.currentRound++;

    const participatingNodes = this.getParticipatingNodes();
    const byzantineNodes = Array.from(this.byzantineNodeIds);

    // Simulate consensus process based on consensus type
    const consensusResult = await this.simulateConsensusProcess(
      proposedValue,
      participatingNodes,
      byzantineNodes
    );

    const consensusTime = Date.now() - startTime;

    // Detect Byzantine behavior during this round
    const byzantineDetected = this.detectByzantineBehaviorInRound(byzantineNodes);

    // Check for safety and liveness violations
    const safetyViolation = this.checkSafetyViolation(consensusResult, byzantineNodes);
    const livenessViolation = consensusTime > this.getConsensusTimeoutThreshold();

    const validation: ConsensusValidation = {
      consensusRound: this.currentRound,
      timestamp: new Date(),
      participatingNodes,
      byzantineNodes,
      proposedValue,
      finalValue: consensusResult.finalValue,
      consensusReached: consensusResult.consensusReached,
      consensusTime,
      byzantineDetected,
      safetyViolation,
      livenessViolation
    };

    this.consensusHistory.push(validation);
    return validation;
  }

  async simulateNetworkPartition(partitionGroups: string[][]): Promise<void> {
    this.networkPartitions = partitionGroups;
    
    // Update node participation based on partitions
    for (const [nodeId, node] of this.nodes) {
      // Check if node is in the largest partition (can participate in consensus)
      const largestPartition = partitionGroups.reduce((largest, current) => 
        current.length > largest.length ? current : largest, []
      );
      
      node.consensusParticipation = largestPartition.includes(nodeId);
    }

    console.log(`Network partitioned into ${partitionGroups.length} groups:`, 
      partitionGroups.map(group => group.length));
  }

  async healNetworkPartition(): Promise<void> {
    this.networkPartitions = [];
    
    // Restore participation for all honest nodes
    for (const [nodeId, node] of this.nodes) {
      if (node.status === 'honest') {
        node.consensusParticipation = true;
      }
    }

    console.log('Network partition healed - all honest nodes can participate');
  }

  async getConsensusStatistics(): Promise<{
    totalRounds: number;
    successfulRounds: number;
    averageConsensusTime: number;
    byzantineDetectionRate: number;
  }> {
    const totalRounds = this.consensusHistory.length;
    const successfulRounds = this.consensusHistory.filter(round => round.consensusReached).length;
    
    const totalConsensusTime = this.consensusHistory.reduce(
      (sum, round) => sum + round.consensusTime, 0
    );
    const averageConsensusTime = totalRounds > 0 ? totalConsensusTime / totalRounds : 0;

    const totalByzantineInstances = this.consensusHistory.reduce(
      (sum, round) => sum + round.byzantineNodes.length, 0
    );
    const totalDetectedInstances = this.consensusHistory.reduce(
      (sum, round) => sum + round.byzantineDetected.length, 0
    );
    const byzantineDetectionRate = totalByzantineInstances > 0 ? 
      (totalDetectedInstances / totalByzantineInstances) * 100 : 100;

    return {
      totalRounds,
      successfulRounds,
      averageConsensusTime,
      byzantineDetectionRate
    };
  }

  // Private helper methods

  private getRandomRegion(): string {
    const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'];
    return regions[Math.floor(Math.random() * regions.length)];
  }

  private getRandomByzantineBehavior() {
    const behaviors = ['lying', 'equivocating', 'delaying', 'silent', 'flooding'];
    return behaviors[Math.floor(Math.random() * behaviors.length)] as any;
  }

  private getParticipatingNodes(): string[] {
    return Array.from(this.nodes.entries())
      .filter(([_, node]) => node.consensusParticipation)
      .map(([nodeId, _]) => nodeId);
  }

  private async simulateConsensusProcess(
    proposedValue: any,
    participatingNodes: string[],
    byzantineNodes: string[]
  ): Promise<{ consensusReached: boolean; finalValue: any }> {
    switch (this.consensusType) {
      case 'pbft':
        return this.simulatePBFTConsensus(proposedValue, participatingNodes, byzantineNodes);
      case 'raft':
        return this.simulateRaftConsensus(proposedValue, participatingNodes, byzantineNodes);
      case 'pos':
        return this.simulatePoSConsensus(proposedValue, participatingNodes, byzantineNodes);
      case 'pow':
        return this.simulatePoWConsensus(proposedValue, participatingNodes, byzantineNodes);
      default:
        throw new Error(`Unsupported consensus type: ${this.consensusType}`);
    }
  }

  private async simulatePBFTConsensus(
    proposedValue: any,
    participatingNodes: string[],
    byzantineNodes: string[]
  ): Promise<{ consensusReached: boolean; finalValue: any }> {
    const totalNodes = participatingNodes.length;
    const byzantineCount = byzantineNodes.filter(nodeId => 
      participatingNodes.includes(nodeId)
    ).length;

    // PBFT can tolerate up to (n-1)/3 Byzantine nodes
    const maxByzantineNodes = Math.floor((totalNodes - 1) / 3);
    const consensusReached = byzantineCount <= maxByzantineNodes;

    // Simulate three-phase protocol: pre-prepare, prepare, commit
    const phases = ['pre-prepare', 'prepare', 'commit'];
    let currentValue = proposedValue;

    for (const phase of phases) {
      // Byzantine nodes may send conflicting messages
      if (byzantineCount > 0) {
        currentValue = this.simulateByzantineInterference(currentValue, byzantineNodes, phase);
      }

      // Simulate network delay
      await this.simulateNetworkDelay();
    }

    return {
      consensusReached,
      finalValue: consensusReached ? proposedValue : `byzantine-interference-${this.currentRound}`
    };
  }

  private async simulateRaftConsensus(
    proposedValue: any,
    participatingNodes: string[],
    byzantineNodes: string[]
  ): Promise<{ consensusReached: boolean; finalValue: any }> {
    const totalNodes = participatingNodes.length;
    const byzantineCount = byzantineNodes.filter(nodeId => 
      participatingNodes.includes(nodeId)
    ).length;

    // Raft requires majority consensus
    const requiredVotes = Math.floor(totalNodes / 2) + 1;
    const honestNodes = totalNodes - byzantineCount;
    const consensusReached = honestNodes >= requiredVotes;

    // Simulate leader election and log replication
    const leader = participatingNodes[0]; // Simplified leader selection
    const isByzantineLeader = byzantineNodes.includes(leader);

    if (isByzantineLeader) {
      // Byzantine leader may propose conflicting values
      return {
        consensusReached: false,
        finalValue: `byzantine-leader-${this.currentRound}`
      };
    }

    await this.simulateNetworkDelay();

    return {
      consensusReached,
      finalValue: consensusReached ? proposedValue : `raft-failure-${this.currentRound}`
    };
  }

  private async simulatePoSConsensus(
    proposedValue: any,
    participatingNodes: string[],
    byzantineNodes: string[]
  ): Promise<{ consensusReached: boolean; finalValue: any }> {
    const totalNodes = participatingNodes.length;
    const byzantineCount = byzantineNodes.filter(nodeId => 
      participatingNodes.includes(nodeId)
    ).length;

    // Simulate stake-based voting
    const totalStake = totalNodes * 100; // Assume 100 stake per node
    const byzantineStake = byzantineCount * 100;
    const honestStake = totalStake - byzantineStake;

    // Consensus requires 2/3 of stake
    const requiredStake = Math.floor(totalStake * 2 / 3);
    const consensusReached = honestStake >= requiredStake;

    // Simulate finality gadget
    await this.simulateNetworkDelay();

    return {
      consensusReached,
      finalValue: consensusReached ? proposedValue : `pos-failure-${this.currentRound}`
    };
  }

  private async simulatePoWConsensus(
    proposedValue: any,
    participatingNodes: string[],
    byzantineNodes: string[]
  ): Promise<{ consensusReached: boolean; finalValue: any }> {
    const totalNodes = participatingNodes.length;
    const byzantineCount = byzantineNodes.filter(nodeId => 
      participatingNodes.includes(nodeId)
    ).length;

    // Simulate mining competition
    const totalHashPower = totalNodes * 100; // Assume 100 hash power per node
    const byzantineHashPower = byzantineCount * 100;
    const honestHashPower = totalHashPower - byzantineHashPower;

    // Honest majority assumption
    const consensusReached = honestHashPower > byzantineHashPower;

    // Simulate mining time
    await this.simulateNetworkDelay(2000); // Longer delay for PoW

    return {
      consensusReached,
      finalValue: consensusReached ? proposedValue : `pow-attack-${this.currentRound}`
    };
  }

  private simulateByzantineInterference(
    originalValue: any,
    byzantineNodes: string[],
    phase: string
  ): any {
    if (byzantineNodes.length === 0) {
      return originalValue;
    }

    // Simulate different types of Byzantine behavior
    const interferenceType = Math.random();
    
    if (interferenceType < 0.3) {
      // Equivocation - send different values
      return `equivocated-${phase}-${this.currentRound}`;
    } else if (interferenceType < 0.6) {
      // Delay - simulate delayed messages (handled by network delay)
      return originalValue;
    } else if (interferenceType < 0.8) {
      // False information
      return `false-${phase}-${this.currentRound}`;
    } else {
      // Silent - no interference
      return originalValue;
    }
  }

  private async simulateNetworkDelay(baseDelay: number = 100): Promise<void> {
    // Simulate network latency with some variance
    const delay = baseDelay + Math.random() * baseDelay;
    
    // Add extra delay for network partitions
    const partitionDelay = this.networkPartitions.length > 0 ? 500 : 0;
    
    return new Promise(resolve => setTimeout(resolve, delay + partitionDelay));
  }

  private detectByzantineBehaviorInRound(byzantineNodes: string[]): string[] {
    // Simulate Byzantine detection with some probability
    const detectionRate = 0.7; // 70% detection rate
    
    return byzantineNodes.filter(() => Math.random() < detectionRate);
  }

  private checkSafetyViolation(
    consensusResult: { consensusReached: boolean; finalValue: any },
    byzantineNodes: string[]
  ): boolean {
    // Safety violation occurs when Byzantine nodes cause incorrect consensus
    if (!consensusResult.consensusReached) {
      return false; // No consensus, so no safety violation
    }

    // Check if final value was influenced by Byzantine behavior
    const finalValueString = String(consensusResult.finalValue);
    return finalValueString.includes('byzantine') || 
           finalValueString.includes('false') || 
           finalValueString.includes('equivocated');
  }

  private getConsensusTimeoutThreshold(): number {
    // Different consensus mechanisms have different timeout thresholds
    switch (this.consensusType) {
      case 'pbft':
        return 5000; // 5 seconds for PBFT
      case 'raft':
        return 3000; // 3 seconds for Raft
      case 'pos':
        return 10000; // 10 seconds for PoS
      case 'pow':
        return 60000; // 60 seconds for PoW
      default:
        return 5000;
    }
  }

  // Public methods for testing and monitoring

  public getNodeStatus(): ByzantineNode[] {
    return Array.from(this.nodes.values());
  }

  public getByzantineNodes(): string[] {
    return Array.from(this.byzantineNodeIds);
  }

  public getNetworkPartitions(): string[][] {
    return [...this.networkPartitions];
  }

  public getConsensusHistory(): ConsensusValidation[] {
    return [...this.consensusHistory];
  }

  public async simulateNodeFailure(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = 'offline';
      node.consensusParticipation = false;
      console.log(`Node ${nodeId} failed and is now offline`);
    }
  }

  public async simulateNodeRecovery(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node && node.status === 'offline') {
      node.status = this.byzantineNodeIds.has(nodeId) ? 'byzantine' : 'honest';
      node.consensusParticipation = true;
      console.log(`Node ${nodeId} recovered and rejoined consensus`);
    }
  }

  public async addNode(nodeId: string, isByzantine: boolean = false): Promise<void> {
    if (this.nodes.has(nodeId)) {
      throw new Error(`Node ${nodeId} already exists`);
    }

    const node: ByzantineNode = {
      nodeId,
      address: `192.168.1.${this.nodes.size + 1}`,
      port: 9000 + this.nodes.size,
      region: this.getRandomRegion(),
      status: isByzantine ? 'byzantine' : 'honest',
      behaviorType: isByzantine ? this.getRandomByzantineBehavior() : 'honest',
      maliciousActions: [],
      consensusParticipation: true,
      trustScore: isByzantine ? Math.random() * 50 : 100
    };

    this.nodes.set(nodeId, node);
    
    if (isByzantine) {
      this.byzantineNodeIds.add(nodeId);
    }

    console.log(`Added ${isByzantine ? 'Byzantine' : 'honest'} node ${nodeId}`);
  }

  public async removeNode(nodeId: string): Promise<void> {
    if (!this.nodes.has(nodeId)) {
      throw new Error(`Node ${nodeId} does not exist`);
    }

    this.nodes.delete(nodeId);
    this.byzantineNodeIds.delete(nodeId);
    
    console.log(`Removed node ${nodeId}`);
  }
}