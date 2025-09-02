#!/usr/bin/env tsx

import { DemoDocumentationService } from '../src/services/DemoDocumentationService.js';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * CLI script to generate demo documentation
 * Usage: npm run docs:generate
 */
async function main() {
  console.log('🚀 Starting demo documentation generation...');
  
  try {
    const docService = new DemoDocumentationService();
    
    // Initialize the service
    console.log('📋 Initializing documentation service...');
    await docService.initialize();
    
    // Generate all documentation
    console.log('📝 Generating all documentation files...');
    const results = await docService.generateAllDocumentation();
    
    // Display results
    console.log('\n✅ Documentation generation completed successfully!');
    console.log('\n📊 Generation Summary:');
    
    for (const [docType, langResults] of Object.entries(results)) {
      console.log(`\n${docType}:`);
      for (const [language, result] of Object.entries(langResults)) {
        console.log(`  ${language}: ${result.outputPath} (${result.wordCount} words)`);
      }
    }
    
    // Validate documentation
    console.log('\n🔍 Validating generated documentation...');
    const validationResults = await docService.validateAllDocumentation();
    
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
      console.log('\n⚠️  Some documentation files have validation errors. Please review and fix them.');
      process.exit(1);
    } else {
      console.log('\n🎉 All documentation files are valid!');
    }
    
    // Generate index file
    await generateDocumentationIndex(results);
    
    console.log('\n📚 Documentation generation completed successfully!');
    console.log('📁 Files generated in: docs/demo/');
    
  } catch (error) {
    console.error('❌ Documentation generation failed:', error);
    process.exit(1);
  }
}

/**
 * Generate a documentation index file
 */
async function generateDocumentationIndex(results: Record<string, any>) {
  const indexContent = `# AnarQ&Q Ecosystem Demo Documentation

This directory contains comprehensive documentation for the AnarQ&Q ecosystem demonstration platform.

## Available Documentation

### Setup and Configuration
- [Setup Guide (English)](./setup-guide-en.md) - Complete setup instructions
- [Setup Guide (Spanish)](./setup-guide-es.md) - Instrucciones completas de configuración

### Workflows and Usage
- [Workflow Guide (English)](./workflow-guide-en.md) - Detailed workflow documentation
- [Workflow Guide (Spanish)](./workflow-guide-es.md) - Documentación detallada de flujos de trabajo

### API Reference
- [API Reference (English)](./api-reference-en.md) - Complete API documentation
- [API Reference (Spanish)](./api-reference-es.md) - Documentación completa de la API

### Troubleshooting
- [Troubleshooting Guide (English)](./troubleshooting-guide-en.md) - Common issues and solutions
- [Troubleshooting Guide (Spanish)](./troubleshooting-guide-es.md) - Problemas comunes y soluciones

## Quick Start

1. Follow the [Setup Guide](./setup-guide-en.md) to install and configure the demo
2. Review the [Workflow Guide](./workflow-guide-en.md) to understand the demo scenarios
3. Use the [API Reference](./api-reference-en.md) for programmatic access
4. Consult the [Troubleshooting Guide](./troubleshooting-guide-en.md) if you encounter issues

## Languages

All documentation is available in:
- **English** (en) - Primary language
- **Spanish** (es) - Español

## Generation Information

This documentation was automatically generated on ${new Date().toISOString().split('T')[0]} using the AnarQ&Q documentation generation system.

For the latest updates, visit the [AnarQ&Q Ecosystem Demo Repository](https://github.com/AnarQorp/anarq-ecosystem-demo).
`;

  const outputPath = join(process.cwd(), '..', 'docs', 'demo', 'README.md');
  
  try {
    // Ensure directory exists
    await fs.mkdir(join(process.cwd(), '..', 'docs', 'demo'), { recursive: true });
    
    // Write index file
    await fs.writeFile(outputPath, indexContent, 'utf-8');
    
    console.log('📄 Generated documentation index: docs/demo/README.md');
  } catch (error) {
    console.warn('⚠️  Failed to generate documentation index:', error);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as generateDocumentation };