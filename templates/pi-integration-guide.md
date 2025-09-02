# {{t:title}}

Version: {{version}} | Last Updated: {{lastUpdated}}

## {{t:overview}}

This guide provides comprehensive instructions for integrating Pi Network functionality with the AnarQ&Q ecosystem demo. The integration enables Pi Wallet authentication, smart contract execution, transaction processing, and DAO governance through Pi Network infrastructure.

## {{t:setup}}

### Prerequisites

Before configuring Pi Network integration, ensure you have:

- **Pi Wallet**: Installed and configured Pi Wallet application
- **Pi Developer Account**: Registered developer account on Pi Network
- **API Credentials**: Valid Pi Network API keys and credentials
- **Testnet Access**: Access to Pi Network testnet for development

### Environment Configuration

Configure Pi Network settings in your environment file:

```env
# Pi Network Configuration
PI_NETWORK_ENABLED=true
PI_NETWORK_TESTNET=true
PI_NETWORK_MAINNET=false

# Pi Wallet API Configuration
PI_WALLET_API_KEY=your_pi_wallet_api_key
PI_WALLET_API_SECRET=your_pi_wallet_api_secret
PI_WALLET_SANDBOX_MODE=true

# Pi Smart Contract Configuration
PI_CONTRACT_REGISTRY=0x1234567890abcdef...
PI_DAO_CONTRACT=0xabcdef1234567890...
PI_GOVERNANCE_CONTRACT=0x567890abcdef1234...

# Network Configuration
PI_NETWORK_RPC_URL=https://api.minepi.com/v2
PI_NETWORK_CHAIN_ID=314159
PI_NETWORK_TIMEOUT=30000

# Transaction Configuration
PI_TRANSACTION_GAS_LIMIT=100000
PI_TRANSACTION_GAS_PRICE=1000000000
PI_TRANSACTION_CONFIRMATION_BLOCKS=3
```

### Service Initialization

Initialize Pi Network services in your application:

```typescript
import { PiNetworkIntegrationService } from './services/PiNetworkIntegrationService';

const piService = new PiNetworkIntegrationService();

await piService.initialize({
  apiKey: process.env.PI_WALLET_API_KEY,
  apiSecret: process.env.PI_WALLET_API_SECRET,
  testnet: process.env.PI_NETWORK_TESTNET === 'true',
  rpcUrl: process.env.PI_NETWORK_RPC_URL,
  chainId: parseInt(process.env.PI_NETWORK_CHAIN_ID || '314159')
});
```

## {{t:authentication}}

### Pi Wallet Authentication Flow

The Pi Wallet authentication integrates with sQuid identity management:

#### Authentication Process

1. **User Initiates Authentication**
   ```typescript
   const authResult = await piService.authenticateWithPiWallet(piUserId);
   ```

2. **Pi Wallet Verification**
   - User approves authentication in Pi Wallet app
   - Pi Network validates user credentials
   - Authentication token is generated

3. **Identity Linking**
   ```typescript
   const linkResult = await piService.linkPiIdentity(piUserId, squidId);
   ```

4. **Qerberos Audit Trail**
   - Authentication event is logged
   - Audit signature is generated
   - Identity link is verified

#### Implementation Example

```typescript
import { PiNetworkIntegrationService } from './services/PiNetworkIntegrationService';
import { QerberosAuth } from './services/QerberosAuth';

class PiAuthenticationHandler {
  constructor(
    private piService: PiNetworkIntegrationService,
    private qerberos: QerberosAuth
  ) {}

  async authenticateUser(piUserId: string, squidId: string) {
    try {
      // Step 1: Authenticate with Pi Wallet
      const authResult = await this.piService.authenticateWithPiWallet(piUserId);
      
      if (!authResult.success) {
        throw new Error('Pi Wallet authentication failed');
      }

      // Step 2: Link identities
      const linkResult = await this.piService.linkPiIdentity(piUserId, squidId);
      
      // Step 3: Create audit trail
      const auditEntry = await this.qerberos.createAuditEntry({
        action: 'pi_authentication',
        userId: squidId,
        piUserId: piUserId,
        timestamp: new Date(),
        metadata: {
          authToken: authResult.token,
          linkId: linkResult.linkId
        }
      });

      return {
        success: true,
        authToken: authResult.token,
        linkId: linkResult.linkId,
        auditCid: auditEntry.cid
      };
    } catch (error) {
      console.error('Pi authentication error:', error);
      throw error;
    }
  }
}
```

### Authentication Security

- **Token Management**: Secure storage and rotation of authentication tokens
- **Session Management**: Proper session lifecycle management
- **Audit Logging**: Complete audit trail for all authentication events
- **Error Handling**: Graceful handling of authentication failures

## {{t:smart_contracts}}

### Smart Contract Integration with Qflow

Pi Network smart contracts are executed through the Qflow automation system:

#### Contract Deployment

```typescript
import { PiSmartContractEngine } from './services/PiSmartContractEngine';

const contractEngine = new PiSmartContractEngine();

// Deploy DAO governance contract
const deployResult = await contractEngine.deployContract({
  contractType: 'dao_governance',
  parameters: {
    votingPeriod: 7 * 24 * 60 * 60, // 7 days
    quorum: 51, // 51% quorum
    proposalThreshold: 1000 // 1000 Pi tokens
  }
});
```

#### Contract Execution

```typescript
// Execute smart contract method
const executionResult = await contractEngine.executeContract({
  contractAddress: deployResult.contractAddress,
  method: 'createProposal',
  parameters: [
    'Ecosystem Upgrade Proposal',
    'Upgrade core modules to v2.0',
    7 * 24 * 60 * 60 // voting period
  ],
  gasLimit: 100000
});
```

#### Qflow Integration

Smart contract execution is orchestrated through Qflow workflows:

```typescript
import { QflowService } from './services/QflowService';

const qflow = new QflowService();

// Create workflow for contract execution
const workflow = await qflow.createWorkflow({
  name: 'pi_contract_execution',
  steps: [
    {
      type: 'validate_parameters',
      handler: 'validateContractParams'
    },
    {
      type: 'execute_contract',
      handler: 'executePiContract'
    },
    {
      type: 'verify_execution',
      handler: 'verifyContractExecution'
    },
    {
      type: 'create_audit',
      handler: 'createExecutionAudit'
    }
  ]
});
```

## {{t:transactions}}

### Transaction Processing with Qwallet

Pi Network transactions are processed through the integrated Qwallet system:

#### Transaction Creation

```typescript
import { PiTransactionProcessor } from './services/PiTransactionProcessor';

const txProcessor = new PiTransactionProcessor();

// Create Pi transaction
const transaction = await txProcessor.createTransaction({
  from: userWalletAddress,
  to: recipientAddress,
  amount: 100, // 100 Pi tokens
  memo: 'Demo transaction',
  gasLimit: 21000
});
```

#### Transaction Validation

```typescript
// Validate transaction before processing
const validationResult = await txProcessor.validateTransaction(transaction);

if (!validationResult.isValid) {
  throw new Error(`Transaction validation failed: ${validationResult.errors.join(', ')}`);
}
```

#### Transaction Processing

```typescript
// Process transaction through Qwallet
const processingResult = await txProcessor.processTransaction(transaction);

// Monitor transaction status
const status = await txProcessor.getTransactionStatus(processingResult.transactionId);
```

#### Transaction Audit

All transactions are audited through Qerberos:

```typescript
// Create transaction audit trail
const auditResult = await qerberos.auditTransaction({
  transactionId: processingResult.transactionId,
  transactionHash: processingResult.hash,
  blockNumber: processingResult.blockNumber,
  gasUsed: processingResult.gasUsed,
  status: processingResult.status
});
```

## {{t:governance}}

### DAO Governance Integration

Pi Network smart contracts integrate with DAO governance through multiple modules:

#### Governance Proposal Creation

```typescript
import { DAOService } from './services/DAOService';

const daoService = new DAOService();

// Create governance proposal
const proposal = await daoService.createProposal({
  title: 'Pi Network Integration Enhancement',
  description: 'Enhance Pi Network integration with additional features',
  proposer: userAddress,
  votingPeriod: 7 * 24 * 60 * 60, // 7 days
  executionDelay: 2 * 24 * 60 * 60, // 2 days
  piContractIntegration: true
});
```

#### Voting Process

```typescript
// Submit vote through Pi Network contract
const voteResult = await piService.submitGovernanceVote({
  proposalId: proposal.id,
  vote: 'yes', // 'yes', 'no', 'abstain'
  voterAddress: userAddress,
  votingPower: userVotingPower
});
```

#### Proposal Execution

```typescript
// Execute approved proposal
const executionResult = await daoService.executeProposal({
  proposalId: proposal.id,
  piContractAddress: proposal.piContractAddress,
  executionParameters: proposal.executionParameters
});
```

### Social Governance Integration

Qsocial serves as the social governance hub with Pi Network integration:

```typescript
import { QsocialService } from './services/QsocialService';

const qsocial = new QsocialService();

// Create governance discussion
const discussion = await qsocial.createGovernanceDiscussion({
  proposalId: proposal.id,
  title: 'Discuss Pi Network Integration Enhancement',
  description: 'Community discussion for the Pi Network proposal',
  piIntegration: true,
  moderationLevel: 'community'
});
```

## {{t:troubleshooting}}

### Common Issues and Solutions

#### Pi Wallet Connection Issues

**Problem**: Pi Wallet authentication fails or times out

**Solutions**:

1. **Check Pi Wallet Status**
   ```bash
   # Verify Pi Wallet connectivity
   npm run pi:test:connection
   ```

2. **Validate API Credentials**
   ```bash
   # Test API credentials
   npm run pi:validate:credentials
   ```

3. **Network Configuration**
   ```bash
   # Check network connectivity
   curl -X GET "https://api.minepi.com/v2/health"
   ```

#### Smart Contract Execution Failures

**Problem**: Smart contract execution fails or reverts

**Solutions**:

1. **Gas Estimation**
   ```typescript
   // Estimate gas before execution
   const gasEstimate = await contractEngine.estimateGas(contractCall);
   ```

2. **Contract State Validation**
   ```typescript
   // Validate contract state
   const contractState = await contractEngine.getContractState(contractAddress);
   ```

3. **Transaction Debugging**
   ```bash
   # Enable debug logging
   export PI_DEBUG=true
   npm run demo:scenario:dao --debug
   ```

#### Transaction Processing Issues

**Problem**: Transactions fail or remain pending

**Solutions**:

1. **Check Network Status**
   ```bash
   # Monitor Pi Network status
   npm run pi:network:status
   ```

2. **Adjust Gas Settings**
   ```typescript
   // Increase gas limit and price
   const transaction = {
     ...baseTransaction,
     gasLimit: 150000, // Increased from 100000
     gasPrice: 2000000000 // Increased from 1000000000
   };
   ```

3. **Transaction Recovery**
   ```bash
   # Recover stuck transactions
   npm run pi:transaction:recover --tx-id=<transaction-id>
   ```

### Performance Optimization

#### Connection Pooling

```typescript
// Configure connection pooling for Pi Network
const piService = new PiNetworkIntegrationService({
  connectionPool: {
    maxConnections: 10,
    connectionTimeout: 30000,
    idleTimeout: 60000
  }
});
```

#### Caching Strategy

```typescript
// Implement caching for frequently accessed data
const cache = new Map();

async function getCachedContractData(contractAddress: string) {
  const cacheKey = `contract:${contractAddress}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const data = await contractEngine.getContractData(contractAddress);
  cache.set(cacheKey, data);
  
  return data;
}
```

## {{t:api_reference}}

### PiNetworkIntegrationService API

#### Authentication Methods

```typescript
interface IPiNetworkIntegration {
  authenticateWithPiWallet(piUserId: string): Promise<AuthResult>;
  linkPiIdentity(piUserId: string, squidId: string): Promise<LinkResult>;
  validateAuthToken(token: string): Promise<boolean>;
  refreshAuthToken(refreshToken: string): Promise<AuthResult>;
}
```

#### Smart Contract Methods

```typescript
interface IPiSmartContractEngine {
  deployContract(params: ContractDeploymentParams): Promise<DeploymentResult>;
  executeContract(params: ContractExecutionParams): Promise<ExecutionResult>;
  getContractState(contractAddress: string): Promise<ContractState>;
  estimateGas(params: ContractExecutionParams): Promise<number>;
}
```

#### Transaction Methods

```typescript
interface IPiTransactionProcessor {
  createTransaction(params: TransactionParams): Promise<Transaction>;
  validateTransaction(transaction: Transaction): Promise<ValidationResult>;
  processTransaction(transaction: Transaction): Promise<ProcessingResult>;
  getTransactionStatus(transactionId: string): Promise<TransactionStatus>;
}
```

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| PI_AUTH_001 | Invalid Pi Wallet credentials | Verify API key and secret |
| PI_AUTH_002 | Authentication timeout | Check network connectivity |
| PI_CONTRACT_001 | Contract execution failed | Verify contract parameters |
| PI_CONTRACT_002 | Insufficient gas | Increase gas limit |
| PI_TX_001 | Transaction validation failed | Check transaction parameters |
| PI_TX_002 | Insufficient balance | Verify account balance |

## {{t:examples}}

### Complete Integration Example

```typescript
import {
  PiNetworkIntegrationService,
  PiSmartContractEngine,
  PiTransactionProcessor
} from './services';

class PiNetworkDemo {
  private piService: PiNetworkIntegrationService;
  private contractEngine: PiSmartContractEngine;
  private txProcessor: PiTransactionProcessor;

  constructor() {
    this.piService = new PiNetworkIntegrationService();
    this.contractEngine = new PiSmartContractEngine();
    this.txProcessor = new PiTransactionProcessor();
  }

  async runCompleteDemo() {
    try {
      // 1. Initialize services
      await this.initializeServices();

      // 2. Authenticate user
      const authResult = await this.authenticateUser('demo-pi-user');

      // 3. Deploy governance contract
      const contractResult = await this.deployGovernanceContract();

      // 4. Create and execute proposal
      const proposalResult = await this.createGovernanceProposal(contractResult.contractAddress);

      // 5. Process voting transaction
      const voteResult = await this.processVote(proposalResult.proposalId);

      console.log('Pi Network demo completed successfully:', {
        auth: authResult,
        contract: contractResult,
        proposal: proposalResult,
        vote: voteResult
      });

    } catch (error) {
      console.error('Pi Network demo failed:', error);
      throw error;
    }
  }

  private async initializeServices() {
    await this.piService.initialize({
      apiKey: process.env.PI_WALLET_API_KEY!,
      apiSecret: process.env.PI_WALLET_API_SECRET!,
      testnet: true
    });

    await this.contractEngine.initialize({
      rpcUrl: process.env.PI_NETWORK_RPC_URL!,
      chainId: parseInt(process.env.PI_NETWORK_CHAIN_ID!)
    });

    await this.txProcessor.initialize({
      defaultGasLimit: 100000,
      defaultGasPrice: 1000000000
    });
  }

  private async authenticateUser(piUserId: string) {
    return await this.piService.authenticateWithPiWallet(piUserId);
  }

  private async deployGovernanceContract() {
    return await this.contractEngine.deployContract({
      contractType: 'dao_governance',
      parameters: {
        votingPeriod: 7 * 24 * 60 * 60,
        quorum: 51,
        proposalThreshold: 1000
      }
    });
  }

  private async createGovernanceProposal(contractAddress: string) {
    return await this.contractEngine.executeContract({
      contractAddress,
      method: 'createProposal',
      parameters: [
        'Demo Proposal',
        'This is a demonstration proposal',
        7 * 24 * 60 * 60
      ]
    });
  }

  private async processVote(proposalId: string) {
    const transaction = await this.txProcessor.createTransaction({
      to: process.env.PI_DAO_CONTRACT!,
      data: this.contractEngine.encodeMethodCall('vote', [proposalId, true]),
      gasLimit: 50000
    });

    return await this.txProcessor.processTransaction(transaction);
  }
}

// Usage
const demo = new PiNetworkDemo();
demo.runCompleteDemo().catch(console.error);
```

---

For additional Pi Network integration support, visit the [Pi Developer Portal](https://developers.minepi.com) or consult the [AnarQ&Q Integration Documentation](https://docs.anarq.org/pi-integration).