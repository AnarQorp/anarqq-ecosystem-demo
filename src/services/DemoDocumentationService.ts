import { join } from 'path';
import { DocumentationGeneratorService } from './DocumentationGeneratorService.js';
import { 
  DocumentationConfig,
  DocumentationTemplate,
  DocumentationResult,
  Language
} from '../types/index.js';

/**
 * Service for generating demo setup and workflow documentation
 * Creates comprehensive guides for the /docs/demo directory
 */
export class DemoDocumentationService {
  private docGenerator: DocumentationGeneratorService;
  private config: DocumentationConfig;

  constructor() {
    this.docGenerator = new DocumentationGeneratorService();
    this.config = {
      outputDirectory: join(process.cwd(), '..', 'docs', 'demo'),
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
   * Initialize the demo documentation service
   */
  async initialize(): Promise<void> {
    await this.docGenerator.initialize(this.config);
  }

  /**
   * Generate all demo documentation files
   */
  async generateAllDocumentation(): Promise<Record<string, Record<Language, DocumentationResult>>> {
    const results: Record<string, Record<Language, DocumentationResult>> = {};

    // Generate setup guide
    results.setupGuide = await this.generateSetupGuide();

    // Generate workflow guide
    results.workflowGuide = await this.generateWorkflowGuide();

    // Generate API reference
    results.apiReference = await this.generateApiReference();

    // Generate troubleshooting guide
    results.troubleshootingGuide = await this.generateTroubleshootingGuide();

    return results;
  }

  /**
   * Generate setup guide documentation
   */
  async generateSetupGuide(): Promise<Record<Language, DocumentationResult>> {
    const template = await this.docGenerator.loadTemplate(
      join(this.config.templateDirectory, 'setup-guide.json')
    );

    const dynamicData = {
      currentDate: new Date().toISOString().split('T')[0],
      nodeVersion: process.version,
      demoVersion: '1.0.0',
      supportedPlatforms: 'Linux, macOS, Windows (WSL2)',
      minMemory: '8GB',
      recommendedMemory: '16GB',
      diskSpace: '20GB',
      dockerVersion: '20.10+',
      nodeJsVersion: '18+',
      repositoryUrl: 'https://github.com/AnarQorp/anarq-ecosystem-demo.git',
      docsUrl: 'https://docs.anarq.org',
      supportUrl: 'https://support.anarq.org'
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
   * Generate workflow guide documentation
   */
  async generateWorkflowGuide(): Promise<Record<Language, DocumentationResult>> {
    const template = await this.docGenerator.loadTemplate(
      join(this.config.templateDirectory, 'workflow-guide.json')
    );

    const dynamicData = {
      currentDate: new Date().toISOString().split('T')[0],
      coreModules: [
        'sQuid', 'Qlock', 'Qonsent', 'Qindex', 'Qerberos', 
        'Qwallet', 'Qflow', 'QNET', 'Qdrive', 'QpiC', 
        'Qmarket', 'Qmail', 'Qchat', 'Qsocial'
      ].join(', '),
      scenarioCount: 4,
      maxLatency: '2 seconds',
      minThroughput: '100 RPS',
      maxErrorRate: '1%',
      qnetMinNodes: 5,
      piNetworkTestnet: 'https://api.minepi.com/v2',
      ipfsGateway: 'http://localhost:8080',
      monitoringPort: 3000
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
   * Generate API reference documentation
   */
  async generateApiReference(): Promise<Record<Language, DocumentationResult>> {
    const template: DocumentationTemplate = {
      id: 'api-reference',
      name: 'API Reference',
      type: 'api',
      templatePath: join(this.config.templateDirectory, 'api-reference.md'),
      outputPath: 'api-reference.md',
      variables: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString().split('T')[0]
      },
      translations: {
        en: {
          title: 'AnarQ&Q Ecosystem Demo API Reference',
          overview: 'API Overview',
          authentication: 'Authentication',
          endpoints: 'API Endpoints',
          examples: 'Code Examples',
          errors: 'Error Handling',
          rate_limits: 'Rate Limits'
        },
        es: {
          title: 'Referencia de API del Demo del Ecosistema AnarQ&Q',
          overview: 'Descripción General de la API',
          authentication: 'Autenticación',
          endpoints: 'Endpoints de la API',
          examples: 'Ejemplos de Código',
          errors: 'Manejo de Errores',
          rate_limits: 'Límites de Velocidad'
        }
      }
    };

    // Create API reference template content
    const apiTemplateContent = this.generateApiReferenceTemplate();
    
    // Save template content to file
    await this.docGenerator.saveDocumentation(
      apiTemplateContent,
      template.templatePath,
      'en'
    );

    const dynamicData = {
      baseUrl: 'http://localhost:3000/api',
      authEndpoint: '/auth/login',
      scenarioEndpoint: '/scenarios',
      validationEndpoint: '/validation',
      metricsEndpoint: '/metrics',
      healthEndpoint: '/health',
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
   * Generate troubleshooting guide documentation
   */
  async generateTroubleshootingGuide(): Promise<Record<Language, DocumentationResult>> {
    const template: DocumentationTemplate = {
      id: 'troubleshooting-guide',
      name: 'Troubleshooting Guide',
      type: 'troubleshooting',
      templatePath: join(this.config.templateDirectory, 'troubleshooting-guide.md'),
      outputPath: 'troubleshooting-guide.md',
      variables: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString().split('T')[0]
      },
      translations: {
        en: {
          title: 'AnarQ&Q Ecosystem Demo Troubleshooting Guide',
          overview: 'Overview',
          common_issues: 'Common Issues',
          performance_issues: 'Performance Issues',
          network_issues: 'Network Issues',
          module_issues: 'Module Issues',
          pi_network_issues: 'Pi Network Issues',
          ipfs_issues: 'IPFS Issues',
          docker_issues: 'Docker Issues',
          getting_help: 'Getting Help'
        },
        es: {
          title: 'Guía de Solución de Problemas del Demo del Ecosistema AnarQ&Q',
          overview: 'Descripción General',
          common_issues: 'Problemas Comunes',
          performance_issues: 'Problemas de Rendimiento',
          network_issues: 'Problemas de Red',
          module_issues: 'Problemas de Módulos',
          pi_network_issues: 'Problemas de Pi Network',
          ipfs_issues: 'Problemas de IPFS',
          docker_issues: 'Problemas de Docker',
          getting_help: 'Obtener Ayuda'
        }
      }
    };

    // Create troubleshooting template content
    const troubleshootingTemplateContent = this.generateTroubleshootingTemplate();
    
    // Save template content to file
    await this.docGenerator.saveDocumentation(
      troubleshootingTemplateContent,
      template.templatePath,
      'en'
    );

    const dynamicData = {
      supportEmail: 'support@anarq.org',
      communityForum: 'https://community.anarq.org',
      githubIssues: 'https://github.com/AnarQorp/anarq-ecosystem-demo/issues',
      documentationUrl: 'https://docs.anarq.org',
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
   * Validate all generated documentation
   */
  async validateAllDocumentation(): Promise<Record<string, any>> {
    const validationResults: Record<string, any> = {};

    // Get all available templates
    const templates = await this.docGenerator.getAvailableTemplates();

    for (const templatePath of templates) {
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
   * Generate API reference template content
   */
  private generateApiReferenceTemplate(): string {
    return `# {{t:title}}

Version: {{version}} | Last Updated: {{lastUpdated}}

## {{t:overview}}

The AnarQ&Q Ecosystem Demo provides a comprehensive REST API for interacting with all demo scenarios and validation systems. This API enables programmatic access to scenario execution, performance monitoring, and system health checks.

### Base URL

\`\`\`
{{baseUrl}}
\`\`\`

## {{t:authentication}}

### Login

\`\`\`http
POST {{authEndpoint}}
Content-Type: application/json

{
  "username": "demo-user",
  "password": "demo-password"
}
\`\`\`

**Response:**
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "user-123",
    "username": "demo-user",
    "role": "demo"
  }
}
\`\`\`

## {{t:endpoints}}

### Scenario Execution

#### Execute Identity Scenario

\`\`\`http
POST {{scenarioEndpoint}}/identity
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "demo-user-001",
  "piWalletId": "pi-wallet-123",
  "enableAuditTrail": true
}
\`\`\`

#### Execute Content Scenario

\`\`\`http
POST {{scenarioEndpoint}}/content
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "Sample content for processing",
  "userId": "demo-user-001",
  "enableMonitoring": true
}
\`\`\`

#### Execute DAO Scenario

\`\`\`http
POST {{scenarioEndpoint}}/dao
Authorization: Bearer {token}
Content-Type: application/json

{
  "proposalTitle": "Demo Proposal",
  "proposalDescription": "This is a demo governance proposal",
  "votingPeriod": 604800
}
\`\`\`

### Validation and Monitoring

#### Get Performance Metrics

\`\`\`http
GET {{metricsEndpoint}}/performance
Authorization: Bearer {token}
\`\`\`

#### Validate System Health

\`\`\`http
GET {{healthEndpoint}}
Authorization: Bearer {token}
\`\`\`

## {{t:examples}}

### Complete Scenario Execution Example

\`\`\`typescript
import axios from 'axios';

class DemoAPIClient {
  private baseUrl = '{{baseUrl}}';
  private token: string | null = null;

  async login(username: string, password: string) {
    const response = await axios.post(\`\${this.baseUrl}{{authEndpoint}}\`, {
      username,
      password
    });
    
    this.token = response.data.token;
    return response.data;
  }

  async executeIdentityScenario(params: any) {
    return await axios.post(
      \`\${this.baseUrl}{{scenarioEndpoint}}/identity\`,
      params,
      {
        headers: {
          'Authorization': \`Bearer \${this.token}\`,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  async getPerformanceMetrics() {
    return await axios.get(
      \`\${this.baseUrl}{{metricsEndpoint}}/performance\`,
      {
        headers: {
          'Authorization': \`Bearer \${this.token}\`
        }
      }
    );
  }
}

// Usage
const client = new DemoAPIClient();
await client.login('demo-user', 'demo-password');

const identityResult = await client.executeIdentityScenario({
  userId: 'demo-user-001',
  piWalletId: 'pi-wallet-123',
  enableAuditTrail: true
});

console.log('Identity scenario result:', identityResult.data);
\`\`\`

## {{t:errors}}

### Error Response Format

\`\`\`json
{
  "error": {
    "code": "SCENARIO_EXECUTION_FAILED",
    "message": "Identity scenario execution failed",
    "details": {
      "step": "pi_wallet_authentication",
      "reason": "Invalid Pi Wallet credentials"
    },
    "timestamp": "{{currentDate}}T10:30:00Z"
  }
}
\`\`\`

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| AUTH_001 | Invalid credentials | Check username and password |
| AUTH_002 | Token expired | Re-authenticate to get new token |
| SCENARIO_001 | Scenario execution failed | Check scenario parameters |
| VALIDATION_001 | Validation failed | Review validation requirements |
| PERFORMANCE_001 | Performance threshold exceeded | Check system resources |

## {{t:rate_limits}}

- **Authentication**: 10 requests per minute
- **Scenario Execution**: 5 requests per minute
- **Metrics**: 60 requests per minute
- **Health Checks**: 120 requests per minute

Rate limit headers are included in all responses:

\`\`\`
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1640995200
\`\`\`

---

For additional API support, visit the [AnarQ&Q Developer Portal]({{documentationUrl}}) or contact [API Support](mailto:{{supportEmail}}).`;
  }

  /**
   * Generate troubleshooting template content
   */
  private generateTroubleshootingTemplate(): string {
    return `# {{t:title}}

Version: {{version}} | Last Updated: {{lastUpdated}}

## {{t:overview}}

This guide provides solutions to common issues encountered when setting up and running the AnarQ&Q ecosystem demonstration platform. Issues are organized by category with step-by-step resolution procedures.

## {{t:common_issues}}

### Demo Won't Start

**Symptoms:**
- Docker containers fail to start
- Services show "unhealthy" status
- Connection timeouts

**Solutions:**

1. **Check Docker Status**
   \`\`\`bash
   docker --version
   docker-compose --version
   docker system info
   \`\`\`

2. **Verify Port Availability**
   \`\`\`bash
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :8080
   netstat -tulpn | grep :5001
   \`\`\`

3. **Check System Resources**
   \`\`\`bash
   free -h  # Check memory
   df -h    # Check disk space
   \`\`\`

4. **Restart Services**
   \`\`\`bash
   docker-compose down
   docker-compose up -d
   \`\`\`

### Module Health Check Failures

**Symptoms:**
- One or more modules show "error" status
- Module communication timeouts
- API endpoints not responding

**Solutions:**

1. **Check Module Logs**
   \`\`\`bash
   docker-compose logs squid
   docker-compose logs qerberos
   docker-compose logs qwallet
   \`\`\`

2. **Restart Specific Module**
   \`\`\`bash
   docker-compose restart [module-name]
   \`\`\`

3. **Verify Module Configuration**
   \`\`\`bash
   npm run config:verify [module-name]
   \`\`\`

4. **Check Module Dependencies**
   \`\`\`bash
   npm run deps:check
   \`\`\`

## {{t:performance_issues}}

### High Latency (>2 seconds)

**Diagnosis:**
\`\`\`bash
npm run monitor:latency
\`\`\`

**Solutions:**

1. **Check System Load**
   \`\`\`bash
   htop
   docker stats
   \`\`\`

2. **Scale QNET Nodes**
   \`\`\`bash
   npm run qnet:scale:up --nodes=3
   \`\`\`

3. **Optimize Docker Resources**
   \`\`\`yaml
   # docker-compose.yml
   services:
     demo-orchestrator:
       deploy:
         resources:
           limits:
             memory: 2G
             cpus: '1.0'
   \`\`\`

### Low Throughput (<100 RPS)

**Diagnosis:**
\`\`\`bash
npm run monitor:throughput
\`\`\`

**Solutions:**

1. **Enable Horizontal Scaling**
   \`\`\`bash
   export QNET_SCALING_ENABLED=true
   docker-compose up -d --scale demo-orchestrator=3
   \`\`\`

2. **Optimize Database Connections**
   \`\`\`bash
   export DB_POOL_SIZE=20
   export DB_CONNECTION_TIMEOUT=5000
   \`\`\`

3. **Check Network Bottlenecks**
   \`\`\`bash
   iftop  # Monitor network usage
   \`\`\`

## {{t:network_issues}}

### QNET Phase 2 Connection Issues

**Symptoms:**
- Cannot connect to external QNET nodes
- Network partition errors
- Consensus failures

**Solutions:**

1. **Check Network Connectivity**
   \`\`\`bash
   ping qnet-node-1.anarq.org
   telnet qnet-node-1.anarq.org 8080
   \`\`\`

2. **Verify Firewall Settings**
   \`\`\`bash
   sudo ufw status
   sudo iptables -L
   \`\`\`

3. **Enable Local Mode**
   \`\`\`bash
   export QNET_LOCAL_MODE=true
   npm run demo:restart
   \`\`\`

### IPFS Connectivity Problems

**Symptoms:**
- IPFS operations timeout
- Content retrieval failures
- Peer connection issues

**Solutions:**

1. **Check IPFS Daemon**
   \`\`\`bash
   ipfs id
   ipfs swarm peers
   \`\`\`

2. **Restart IPFS**
   \`\`\`bash
   ipfs shutdown
   ipfs daemon --enable-gc
   \`\`\`

3. **Configure IPFS Gateway**
   \`\`\`bash
   export IPFS_GATEWAY=https://gateway.ipfs.io
   \`\`\`

## {{t:pi_network_issues}}

### Pi Wallet Authentication Failures

**Symptoms:**
- Pi authentication timeouts
- Invalid credentials errors
- Token validation failures

**Solutions:**

1. **Verify Pi Wallet Configuration**
   \`\`\`bash
   echo $PI_WALLET_API_KEY
   echo $PI_NETWORK_TESTNET
   \`\`\`

2. **Test Pi Network Connectivity**
   \`\`\`bash
   curl -X GET "https://api.minepi.com/v2/health"
   \`\`\`

3. **Enable Sandbox Mode**
   \`\`\`bash
   export PI_NETWORK_SANDBOX=true
   npm run demo:test:pi
   \`\`\`

### Smart Contract Execution Errors

**Symptoms:**
- Contract deployment failures
- Transaction reverts
- Gas estimation errors

**Solutions:**

1. **Check Gas Settings**
   \`\`\`bash
   export PI_TRANSACTION_GAS_LIMIT=150000
   export PI_TRANSACTION_GAS_PRICE=2000000000
   \`\`\`

2. **Verify Contract State**
   \`\`\`bash
   npm run pi:contract:status --address=0x...
   \`\`\`

3. **Enable Debug Mode**
   \`\`\`bash
   export PI_DEBUG=true
   npm run demo:scenario:dao --debug
   \`\`\`

## {{t:docker_issues}}

### Container Build Failures

**Symptoms:**
- Docker build errors
- Image pull failures
- Dependency installation errors

**Solutions:**

1. **Clean Docker Cache**
   \`\`\`bash
   docker system prune -a
   docker builder prune
   \`\`\`

2. **Rebuild Images**
   \`\`\`bash
   docker-compose build --no-cache
   \`\`\`

3. **Check Docker Daemon**
   \`\`\`bash
   sudo systemctl status docker
   sudo systemctl restart docker
   \`\`\`

### Volume Mount Issues

**Symptoms:**
- File permission errors
- Volume not found errors
- Data persistence issues

**Solutions:**

1. **Fix Permissions**
   \`\`\`bash
   sudo chown -R $USER:$USER ./data
   chmod -R 755 ./data
   \`\`\`

2. **Recreate Volumes**
   \`\`\`bash
   docker-compose down -v
   docker volume prune
   docker-compose up -d
   \`\`\`

## {{t:getting_help}}

### Self-Diagnosis Tools

1. **Run Health Check**
   \`\`\`bash
   npm run demo:health --verbose
   \`\`\`

2. **Generate Diagnostic Report**
   \`\`\`bash
   npm run demo:diagnose --output=diagnostic-report.json
   \`\`\`

3. **Check System Requirements**
   \`\`\`bash
   npm run system:check
   \`\`\`

### Community Support

- **Documentation**: [{{documentationUrl}}]({{documentationUrl}})
- **Community Forum**: [{{communityForum}}]({{communityForum}})
- **GitHub Issues**: [{{githubIssues}}]({{githubIssues}})
- **Email Support**: [{{supportEmail}}](mailto:{{supportEmail}})

### Reporting Issues

When reporting issues, please include:

1. **System Information**
   \`\`\`bash
   npm run system:info > system-info.txt
   \`\`\`

2. **Error Logs**
   \`\`\`bash
   docker-compose logs > error-logs.txt
   \`\`\`

3. **Configuration**
   \`\`\`bash
   npm run config:export > config-export.json
   \`\`\`

4. **Steps to Reproduce**
   - Detailed steps that led to the issue
   - Expected vs actual behavior
   - Screenshots or error messages

---

For immediate assistance, contact our support team at [{{supportEmail}}](mailto:{{supportEmail}}) or visit our [community forum]({{communityForum}}).`;
  }
}