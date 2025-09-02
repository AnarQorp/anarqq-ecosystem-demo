#!/usr/bin/env tsx

import { PiDocumentationService } from '../src/services/PiDocumentationService.js';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * CLI script to generate Pi Network integration documentation
 * Usage: npm run docs:generate:pi
 */
async function main() {
  console.log('🥧 Starting Pi Network documentation generation...');
  
  try {
    const piDocService = new PiDocumentationService();
    
    // Initialize the service
    console.log('📋 Initializing Pi documentation service...');
    await piDocService.initialize();
    
    // Generate all Pi Network documentation
    console.log('📝 Generating Pi Network documentation files...');
    const results = await piDocService.generateAllPiDocumentation();
    
    // Display results
    console.log('\n✅ Pi Network documentation generation completed successfully!');
    console.log('\n📊 Generation Summary:');
    
    for (const [docType, langResults] of Object.entries(results)) {
      console.log(`\n${docType}:`);
      for (const [language, result] of Object.entries(langResults)) {
        console.log(`  ${language}: ${result.outputPath} (${result.wordCount} words)`);
      }
    }
    
    // Validate Pi Network documentation
    console.log('\n🔍 Validating generated Pi Network documentation...');
    const validationResults = await piDocService.validateAllPiDocumentation();
    
    let totalErrors = 0;
    let totalWarnings = 0;
    
    for (const [docId, validation] of Object.entries(validationResults)) {
      if (validation && typeof validation === 'object') {
        totalErrors += validation.errors?.length || 0;
        totalWarnings += validation.warnings?.length || 0;
        
        if (!validation.isValid) {
          console.log(`❌ ${docId}: ${validation.errors?.length || 0} errors`);
        } else {
          console.log(`✅ ${docId}: Valid (${validation.warnings?.length || 0} warnings)`);
        }
      }
    }
    
    console.log(`\n📈 Validation Summary:`);
    console.log(`  Total Errors: ${totalErrors}`);
    console.log(`  Total Warnings: ${totalWarnings}`);
    
    if (totalErrors > 0) {
      console.log('\n⚠️  Some Pi Network documentation files have validation errors. Please review and fix them.');
      process.exit(1);
    } else {
      console.log('\n🎉 All Pi Network documentation files are valid!');
    }
    
    // Generate Pi documentation index
    await generatePiDocumentationIndex(results);
    
    console.log('\n🥧 Pi Network documentation generation completed successfully!');
    console.log('📁 Files generated in: docs/pi/');
    
  } catch (error) {
    console.error('❌ Pi Network documentation generation failed:', error);
    process.exit(1);
  }
}

/**
 * Generate a Pi Network documentation index file
 */
async function generatePiDocumentationIndex(results: Record<string, any>) {
  const indexContent = `# Pi Network Integration Documentation

This directory contains comprehensive documentation for Pi Network integration with the AnarQ&Q ecosystem demonstration platform.

## Available Documentation

### Integration Guide
- [Pi Network Integration Guide (English)](./integration-guide-en.md) - Complete integration instructions
- [Pi Network Integration Guide (Spanish)](./integration-guide-es.md) - Instrucciones completas de integración

### Wallet Setup
- [Pi Wallet Setup Guide (English)](./wallet-setup-guide-en.md) - Pi Wallet configuration
- [Pi Wallet Setup Guide (Spanish)](./wallet-setup-guide-es.md) - Configuración de Pi Wallet

### Smart Contracts
- [Smart Contracts Guide (English)](./smart-contracts-guide-en.md) - Pi Network smart contract development
- [Smart Contracts Guide (Spanish)](./smart-contracts-guide-es.md) - Desarrollo de contratos inteligentes

### Troubleshooting
- [Troubleshooting Guide (English)](./troubleshooting-guide-en.md) - Pi Network integration issues
- [Troubleshooting Guide (Spanish)](./troubleshooting-guide-es.md) - Problemas de integración

## Quick Start

1. Follow the [Integration Guide](./integration-guide-en.md) for complete Pi Network setup
2. Configure your Pi Wallet using the [Wallet Setup Guide](./wallet-setup-guide-en.md)
3. Deploy smart contracts with the [Smart Contracts Guide](./smart-contracts-guide-en.md)
4. Resolve issues using the [Troubleshooting Guide](./troubleshooting-guide-en.md)

## Pi Network Features

### Authentication
- Pi Wallet integration for user authentication
- Secure identity linking with sQuid
- Multi-factor authentication support

### Smart Contracts
- DAO governance contract deployment
- Qflow workflow integration
- Automated proposal execution

### Transactions
- Pi token transaction processing
- Gas optimization strategies
- Transaction monitoring and validation

### Security
- End-to-end encryption
- Audit trail generation via Qerberos
- Secure key management

## Languages

All Pi Network documentation is available in:
- **English** (en) - Primary language
- **Spanish** (es) - Español

## Support

For Pi Network integration support:
- **Email**: [pi-support@anarq.org](mailto:pi-support@anarq.org)
- **Pi Network Support**: [https://support.minepi.com](https://support.minepi.com)
- **Community Forum**: [https://community.anarq.org/pi](https://community.anarq.org/pi)
- **Developer Portal**: [https://developers.minepi.com](https://developers.minepi.com)

## Generation Information

This documentation was automatically generated on ${new Date().toISOString().split('T')[0]} using the AnarQ&Q Pi Network documentation generation system.

For the latest updates, visit the [AnarQ&Q Ecosystem Demo Repository](https://github.com/AnarQorp/anarq-ecosystem-demo).
`;

  const outputPath = join(process.cwd(), '..', 'docs', 'pi', 'README.md');
  
  try {
    // Ensure directory exists
    await fs.mkdir(join(process.cwd(), '..', 'docs', 'pi'), { recursive: true });
    
    // Write index file
    await fs.writeFile(outputPath, indexContent, 'utf-8');
    
    console.log('📄 Generated Pi documentation index: docs/pi/README.md');
  } catch (error) {
    console.warn('⚠️  Failed to generate Pi documentation index:', error);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as generatePiDocumentation };