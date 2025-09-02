import { join } from 'path';
import { DocumentationGeneratorService } from './DocumentationGeneratorService.js';
import { 
  DocumentationConfig,
  DocumentationTemplate,
  DocumentationResult,
  Language
} from '../types/index.js';

/**
 * Service for generating Pi Network integration documentation
 * Creates comprehensive guides for the /docs/pi directory
 */
export class PiDocumentationService {
  private docGenerator: DocumentationGeneratorService;
  private config: DocumentationConfig;

  constructor() {
    this.docGenerator = new DocumentationGeneratorService();
    this.config = {
      outputDirectory: join(process.cwd(), '..', 'docs', 'pi'),
      templateDirectory: join(process.cwd(), 'templates'),
      languages: ['en', 'es'],
      defaultLanguage: 'en',
      validation: {
        enableSpellCheck: true,
        enableGrammarCheck: true,
        enableLinkValidation: true
      }
    };
  }

  /**
   * Initialize the Pi documentation service
   */
  async initialize(): Promise<void> {
    await this.docGenerator.initialize(this.config);
  }

  /**
   * Generate all Pi Network documentation files
   */
  async generateAllPiDocumentation(): Promise<Record<string, Record<Language, DocumentationResult>>> {
    const results: Record<string, Record<Language, DocumentationResult>> = {};

    // Generate Pi integration guide
    results.integrationGuide = await this.generatePiIntegrationGuide();

    // Generate Pi wallet setup guide
    results.walletSetupGuide = await this.generatePiWalletSetupGuide();

    // Generate Pi smart contracts guide
    results.smartContractsGuide = await this.generatePiSmartContractsGuide();

    // Generate Pi troubleshooting guide
    results.troubleshootingGuide = await this.generatePiTroubleshootingGuide();

    return results;
  }

  /**
   * Generate Pi Network integration guide
   */
  async generatePiIntegrationGuide(): Promise<Record<Language, DocumentationResult>> {
    const template = await this.docGenerator.loadTemplate(
      join(this.config.templateDirectory, 'pi-integration-guide.json')
    );

    const dynamicData = {
      currentDate: new Date().toISOString().split('T')[0],
      piNetworkVersion: '2.0',
      piWalletVersion: '1.5.0',
      testnetUrl: 'https://api.minepi.com/v2',
      mainnetUrl: 'https://api.mainnet.minepi.com/v2',
      chainId: '314159',
      gasLimit: '100000',
      gasPrice: '1000000000',
      confirmationBlocks: '3',
      supportEmail: 'pi-support@anarq.org',
      developerPortal: 'https://developers.minepi.com',
      documentationUrl: 'https://docs.anarq.org/pi-integration'
    };

    const results = await this.docGenerator.generateBilingual(template, dynamicData);

    // Save generated documentation
    for (const [language, result] of Object.entries(results)) {
      await this.docGenerator.saveDocumentation(
        result.content,
        result.outputPath,
        language as Language
      );
    }

    return results;
  }

  /**
   * Generate Pi Wallet setup guide
   */
  async generatePiWalletSetupGuide(): Promise<Record<Language, DocumentationResult>> {
    const template: DocumentationTemplate = {
      id: 'pi-wallet-setup',
      name: 'Pi Wallet Setup Guide',
      type: 'setup',
      templatePath: join(this.config.templateDirectory, 'pi-wallet-setup.md'),
      outputPath: 'wallet-setup-guide.md',
      variables: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString().split('T')[0]
      },
      translations: {
        en: {
          title: 'Pi Wallet Setup and Configuration Guide',
          overview: 'Overview',
          prerequisites: 'Prerequisites',
          installation: 'Installation',
          configuration: 'Configuration',
          authentication: 'Authentication Setup',
          testing: 'Testing Connection',
          troubleshooting: 'Troubleshooting',
          security: 'Security Best Practices'
        },
        es: {
          title: 'Guía de Configuración de Pi Wallet',
          overview: 'Descripción General',
          prerequisites: 'Prerrequisitos',
          installation: 'Instalación',
          configuration: 'Configuración',
          authentication: 'Configuración de Autenticación',
          testing: 'Prueba de Conexión',
          troubleshooting: 'Solución de Problemas',
          security: 'Mejores Prácticas de Seguridad'
        }
      }
    };

    // Create Pi Wallet setup template content
    const walletTemplateContent = this.generatePiWalletSetupTemplate();
    
    // Save template content to file
    await this.docGenerator.saveDocumentation(
      walletTemplateContent,
      template.templatePath,
      'en'
    );

    const dynamicData = {
      piWalletDownloadUrl: 'https://minepi.com/download',
      apiKeyUrl: 'https://developers.minepi.com/keys',
      testnetFaucet: 'https://testnet.minepi.com/faucet',
      supportUrl: 'https://support.minepi.com',
      currentDate: new Date().toISOString().split('T')[0]
    };

    const results = await this.docGenerator.generateBilingual(template, dynamicData);

    // Save generated documentation
    for (const [language, result] of Object.entries(results)) {
      await this.docGenerator.saveDocumentation(
        result.content,
        result.outputPath,
        language as Language
      );
    }

    return results;
  }

  /**
   * Generate Pi smart contracts guide
   */
  async generatePiSmartContractsGuide(): Promise<Record<Language, DocumentationResult>> {
    const template: DocumentationTemplate = {
      id: 'pi-smart-contracts',
      name: 'Pi Smart Contracts Guide',
      type: 'integration',
      templatePath: join(this.config.templateDirectory, 'pi-smart-contracts.md'),
      outputPath: 'smart-contracts-guide.md',
      variables: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString().split('T')[0]
      },
      translations: {
        en: {
          title: 'Pi Network Smart Contracts Integration Guide',
          overview: 'Overview',
          deployment: 'Contract Deployment',
          execution: 'Contract Execution',
          governance: 'DAO Governance Integration',
          qflow_integration: 'Qflow Integration',
          testing: 'Testing and Validation',
          examples: 'Code Examples',
          best_practices: 'Best Practices'
        },
        es: {
          title: 'Guía de Integración de Contratos Inteligentes de Pi Network',
          overview: 'Descripción General',
          deployment: 'Despliegue de Contratos',
          execution: 'Ejecución de Contratos',
          governance: 'Integración de Gobernanza DAO',
          qflow_integration: 'Integración con Qflow',
          testing: 'Pruebas y Validación',
          examples: 'Ejemplos de Código',
          best_practices: 'Mejores Prácticas'
        }
      }
    };

    // Create Pi smart contracts template content
    const contractsTemplateContent = this.generatePiSmartContractsTemplate();
    
    // Save template content to file
    await this.docGenerator.saveDocumentation(
      contractsTemplateContent,
      template.templatePath,
      'en'
    );

    const dynamicData = {
      solidityVersion: '0.8.19',
      qflowVersion: '2.0.0',
      gasLimit: '500000',
      deploymentCost: '0.1 Pi',
      currentDate: new Date().toISOString().split('T')[0]
    };

    const results = await this.docGenerator.generateBilingual(template, dynamicData);

    // Save generated documentation
    for (const [language, result] of Object.entries(results)) {
      await this.docGenerator.saveDocumentation(
        result.content,
        result.outputPath,
        language as Language
      );
    }

    return results;
  }

  /**
   * Generate Pi troubleshooting guide
   */
  async generatePiTroubleshootingGuide(): Promise<Record<Language, DocumentationResult>> {
    const template: DocumentationTemplate = {
      id: 'pi-troubleshooting',
      name: 'Pi Network Troubleshooting Guide',
      type: 'troubleshooting',
      templatePath: join(this.config.templateDirectory, 'pi-troubleshooting.md'),
      outputPath: 'troubleshooting-guide.md',
      variables: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString().split('T')[0]
      },
      translations: {
        en: {
          title: 'Pi Network Integration Troubleshooting Guide',
          overview: 'Overview',
          authentication_issues: 'Authentication Issues',
          wallet_issues: 'Wallet Connection Issues',
          contract_issues: 'Smart Contract Issues',
          transaction_issues: 'Transaction Issues',
          network_issues: 'Network Connectivity Issues',
          performance_issues: 'Performance Issues',
          getting_help: 'Getting Help'
        },
        es: {
          title: 'Guía de Solución de Problemas de Integración con Pi Network',
          overview: 'Descripción General',
          authentication_issues: 'Problemas de Autenticación',
          wallet_issues: 'Problemas de Conexión de Wallet',
          contract_issues: 'Problemas de Contratos Inteligentes',
          transaction_issues: 'Problemas de Transacciones',
          network_issues: 'Problemas de Conectividad de Red',
          performance_issues: 'Problemas de Rendimiento',
          getting_help: 'Obtener Ayuda'
        }
      }
    };

    // Create Pi troubleshooting template content
    const troubleshootingTemplateContent = this.generatePiTroubleshootingTemplate();
    
    // Save template content to file
    await this.docGenerator.saveDocumentation(
      troubleshootingTemplateContent,
      template.templatePath,
      'en'
    );

    const dynamicData = {
      supportEmail: 'pi-support@anarq.org',
      piSupportUrl: 'https://support.minepi.com',
      communityForum: 'https://community.anarq.org/pi',
      githubIssues: 'https://github.com/AnarQorp/anarq-ecosystem-demo/issues',
      currentDate: new Date().toISOString().split('T')[0]
    };

    const results = await this.docGenerator.generateBilingual(template, dynamicData);

    // Save generated documentation
    for (const [language, result] of Object.entries(results)) {
      await this.docGenerator.saveDocumentation(
        result.content,
        result.outputPath,
        language as Language
      );
    }

    return results;
  }

  /**
   * Validate all Pi Network documentation
   */
  async validateAllPiDocumentation(): Promise<Record<string, any>> {
    const validationResults: Record<string, any> = {};

    // Get all available Pi templates
    const templates = await this.docGenerator.getAvailableTemplates();
    const piTemplates = templates.filter(t => t.includes('pi-'));

    for (const templatePath of piTemplates) {
      const template = await this.docGenerator.loadTemplate(templatePath);
      
      for (const language of this.config.languages) {
        const result = await this.docGenerator.generateFromTemplate(template, language, {});
        
        if (result.validationResult) {
          validationResults[`${template.id}-${language}`] = result.validationResult;
        }
      }
    }

    return validationResults;
  }

  /**
   * Generate Pi Wallet setup template content
   */
  private generatePiWalletSetupTemplate(): string {
    return `# {{t:title}}

Version: {{version}} | Last Updated: {{lastUpdated}}

## {{t:overview}}

This guide provides step-by-step instructions for setting up and configuring Pi Wallet integration with the AnarQ&Q ecosystem demo.

## {{t:prerequisites}}

Before setting up Pi Wallet integration, ensure you have:

### System Requirements
- Pi Wallet App: Latest version installed on mobile device
- Pi Developer Account: Registered account with API access
- AnarQ&Q Demo: Properly configured demo environment

### Required Information
- Pi Wallet API credentials
- Pi Network testnet/mainnet access
- Demo environment configuration

## {{t:installation}}

### 1. Install Pi Wallet Application

Download and install the Pi Wallet application from [{{piWalletDownloadUrl}}]({{piWalletDownloadUrl}}).

### 2. Configure Demo Environment

Update your demo environment configuration:

\`\`\`bash
# Edit environment file
nano demo-orchestrator/.env
\`\`\`

Add Pi Wallet configuration:

\`\`\`env
# Pi Wallet Configuration
PI_WALLET_API_KEY=your_api_key_here
PI_WALLET_API_SECRET=your_api_secret_here
PI_WALLET_APP_ID=your_app_id_here

# Pi Network Settings
PI_NETWORK_TESTNET=true
PI_NETWORK_MAINNET=false
PI_WALLET_SANDBOX_MODE=true
\`\`\`

## {{t:configuration}}

Configure Pi Wallet settings for different environments:

**Development Environment:**
\`\`\`env
PI_WALLET_ENVIRONMENT=development
PI_WALLET_DEBUG=true
PI_WALLET_TIMEOUT=30000
\`\`\`

**Production Environment:**
\`\`\`env
PI_WALLET_ENVIRONMENT=production
PI_WALLET_DEBUG=false
PI_WALLET_TIMEOUT=10000
\`\`\`

## {{t:authentication}}

Configure the Pi Wallet authentication flow:

\`\`\`typescript
import { PiWalletAuth } from './services/PiWalletAuth';

const piAuth = new PiWalletAuth({
  apiKey: process.env.PI_WALLET_API_KEY,
  apiSecret: process.env.PI_WALLET_API_SECRET,
  appId: process.env.PI_WALLET_APP_ID
});

await piAuth.initialize();
\`\`\`

## {{t:testing}}

Test Pi Wallet connectivity:

\`\`\`bash
# Test Pi Wallet API connection
npm run test:pi-wallet:connection

# Test authentication flow
npm run test:pi-wallet:auth
\`\`\`

## {{t:troubleshooting}}

### Common Issues

#### API Key Issues
- Verify API key in Pi Developer Portal
- Check environment variable configuration
- Ensure API key has proper permissions

#### Authentication Timeouts
- Increase timeout values
- Check network connectivity
- Verify Pi Wallet app is updated

## {{t:security}}

### Security Best Practices

1. **API Key Management**
   - Store API keys securely
   - Use environment variables
   - Rotate keys regularly

2. **Authentication Security**
   - Implement proper session management
   - Use secure token storage
   - Validate all authentication responses

---

For additional Pi Wallet support, visit the [Pi Support Center]({{supportUrl}}).`;
  }

  /**
   * Generate Pi smart contracts template content (simplified)
   */
  private generatePiSmartContractsTemplate(): string {
    return `# {{t:title}}

Version: {{version}} | Last Updated: {{lastUpdated}}

## {{t:overview}}

This guide covers the integration of Pi Network smart contracts with the AnarQ&Q ecosystem.

## {{t:deployment}}

### Contract Development Environment

Set up the development environment:

\`\`\`bash
# Install Solidity compiler
npm install -g solc@{{solidityVersion}}

# Install Pi Network development tools
npm install @pi-network/contracts
npm install @anarq/qflow@{{qflowVersion}}
\`\`\`

### Basic Contract Template

\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^{{solidityVersion}};

contract AnarQGovernance {
    struct Proposal {
        uint256 id;
        string title;
        string description;
        uint256 votingPeriod;
        uint256 createdAt;
        bool executed;
    }
    
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    
    function createProposal(
        string memory title,
        string memory description,
        uint256 votingPeriod
    ) external returns (uint256) {
        proposalCount++;
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            title: title,
            description: description,
            votingPeriod: votingPeriod,
            createdAt: block.timestamp,
            executed: false
        });
        
        return proposalCount;
    }
}
\`\`\`

## {{t:execution}}

Deploy and interact with contracts:

\`\`\`typescript
import { PiSmartContractEngine } from './services/PiSmartContractEngine';

const contractEngine = new PiSmartContractEngine();

const proposalResult = await contractEngine.createProposal({
  title: 'Ecosystem Enhancement Proposal',
  description: 'Enhance the AnarQ&Q ecosystem',
  votingPeriod: 7 * 24 * 60 * 60
});
\`\`\`

## {{t:governance}}

Integrate with DAO governance:

\`\`\`typescript
class PiDAOIntegration {
  async createGovernanceProposal(proposal) {
    const daoProposal = await this.daoService.createProposal(proposal);
    const piProposal = await this.piContract.createProposal(proposal);
    
    return {
      daoProposalId: daoProposal.id,
      piProposalId: piProposal.proposalId
    };
  }
}
\`\`\`

## {{t:testing}}

Test smart contracts:

\`\`\`typescript
describe('AnarQGovernance', () => {
  it('should create proposal successfully', async () => {
    const tx = await governance.createProposal(
      'Test Proposal',
      'Description',
      7 * 24 * 60 * 60
    );
    
    expect(tx).to.be.ok;
  });
});
\`\`\`

## {{t:best_practices}}

### Development Best Practices

1. **Contract Security**
   - Use established patterns
   - Implement access controls
   - Add input validation

2. **Gas Optimization**
   - Minimize storage operations
   - Use events for logging
   - Batch operations

---

For advanced development, visit the [Pi Developer Documentation](https://developers.minepi.com).`;
  }

  /**
   * Generate Pi troubleshooting template content (simplified)
   */
  private generatePiTroubleshootingTemplate(): string {
    return `# {{t:title}}

Version: {{version}} | Last Updated: {{lastUpdated}}

## {{t:overview}}

This guide provides troubleshooting solutions for Pi Network integration issues.

## {{t:authentication_issues}}

### Pi Wallet Authentication Failures

**Common Solutions:**

1. **Verify API Credentials**
   \`\`\`bash
   echo $PI_WALLET_API_KEY
   curl -H "Authorization: Bearer $PI_WALLET_API_KEY" \\
        "https://api.minepi.com/v2/me"
   \`\`\`

2. **Increase Timeout Values**
   \`\`\`env
   PI_WALLET_TIMEOUT=60000
   PI_WALLET_RETRY_ATTEMPTS=5
   \`\`\`

3. **Enable Debug Mode**
   \`\`\`env
   PI_WALLET_DEBUG=true
   PI_DEBUG=true
   \`\`\`

## {{t:wallet_issues}}

### Pi Wallet Connection Problems

**Solutions:**

1. **Check Wallet Status**
   \`\`\`bash
   npm run pi:wallet:status
   \`\`\`

2. **Restart Connection**
   \`\`\`typescript
   await piWallet.disconnect();
   await piWallet.connect();
   \`\`\`

## {{t:contract_issues}}

### Smart Contract Problems

**Solutions:**

1. **Check Gas Settings**
   \`\`\`typescript
   const gasEstimate = await contract.estimateGas.deploy();
   const gasLimit = gasEstimate.mul(120).div(100);
   \`\`\`

2. **Verify Contract Code**
   \`\`\`bash
   solc --optimize --bin --abi Contract.sol
   \`\`\`

## {{t:transaction_issues}}

### Transaction Problems

**Solutions:**

1. **Check Transaction Status**
   \`\`\`bash
   npm run pi:transaction:status --hash=0x...
   \`\`\`

2. **Increase Gas Price**
   \`\`\`typescript
   const newGasPrice = currentGasPrice.mul(150).div(100);
   \`\`\`

## {{t:network_issues}}

### Network Connectivity

**Solutions:**

1. **Check Network Status**
   \`\`\`bash
   curl -I https://api.minepi.com/v2/health
   ping api.minepi.com
   \`\`\`

2. **Use Multiple Endpoints**
   \`\`\`typescript
   const rpcEndpoints = [
     'https://api.minepi.com/v2',
     'https://rpc1.minepi.com'
   ];
   \`\`\`

## {{t:performance_issues}}

### Performance Optimization

**Solutions:**

1. **Use Connection Pooling**
   \`\`\`typescript
   const agent = new https.Agent({
     keepAlive: true,
     maxSockets: 10
   });
   \`\`\`

2. **Implement Caching**
   \`\`\`typescript
   const cache = new Map();
   
   async function getCachedData(key, fetcher, ttl = 60000) {
     const cached = cache.get(key);
     if (cached && Date.now() - cached.timestamp < ttl) {
       return cached.data;
     }
     
     const data = await fetcher();
     cache.set(key, { data, timestamp: Date.now() });
     return data;
   }
   \`\`\`

## {{t:getting_help}}

### Support Resources

- **Pi Network Support**: [{{piSupportUrl}}]({{piSupportUrl}})
- **AnarQ&Q Pi Integration**: [{{supportEmail}}](mailto:{{supportEmail}})
- **Community Forum**: [{{communityForum}}]({{communityForum}})
- **GitHub Issues**: [{{githubIssues}}]({{githubIssues}})

### Reporting Issues

Include:
1. Environment information
2. Error logs
3. Transaction details
4. Reproduction steps

---

For immediate assistance, contact [{{supportEmail}}](mailto:{{supportEmail}}).`;
  }
}