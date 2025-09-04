# AnarQ&Q Ecosystem Demo Orchestrator

A comprehensive demonstration platform that showcases the complete integration and functionality of all 14 core modules within the AnarQ&Q decentralized ecosystem.

## Overview

The Demo Orchestrator serves as a production-ready validation system that demonstrates real-world data flows, module interactions, and Pi Network integration capabilities in a fully decentralized manner.

## Features

- **Complete Module Integration**: Integrates all 14 core AnarQ&Q modules
- **Q∞ Data Flow Validation**: End-to-end validation of the data processing pipeline
- **Multi-Environment Support**: Local, staging, and QNET Phase 2 environments
- **Pi Network Integration**: Full Pi Wallet authentication and smart contract execution
- **Performance Monitoring**: Real-time metrics and validation gates
- **Decentralization Validation**: Network resilience and fault tolerance testing

## Core Modules

1. **sQuid** - Decentralized Identity Management
2. **Qlock** - Encryption and Key Management
3. **Qonsent** - Privacy and Consent Management
4. **Qindex** - Metadata and Indexing
5. **Qerberos** - Security and Authentication
6. **Qwallet** - Financial Services
7. **Qflow** - Workflow Automation
8. **QNET** - Network Infrastructure (Phase 2)
9. **Qdrive** - Decentralized Storage
10. **QpiC** - Data Compression
11. **Qmarket** - Commerce Platform
12. **Qmail** - Communication Services
13. **Qchat** - Messaging Platform
14. **Qsocial** - Social Governance Hub

## Quick Start

### Prerequisites

- Node.js 18+ 
- TypeScript 5+
- Docker and Docker Compose (for full environment)

### Installation

```bash
# Clone and setup
cd demo-orchestrator
npm install

# Copy environment configuration
cp .env.example .env

# Build the project
npm run build

# Run in development mode
npm run dev
```

### Basic Usage

```typescript
import { DemoOrchestratorApp } from './src/index.js';

const orchestrator = new DemoOrchestratorApp();

// Initialize for local environment
await orchestrator.initialize('local');

// Check if ready
console.log('Ready:', orchestrator.isInitialized());

// Shutdown when done
await orchestrator.shutdown();
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

### Multi-Environment Support

The orchestrator supports three environments:

- **local**: Development environment with simulated modules
- **staging**: Shared testing environment with distributed modules  
- **qnet-phase2**: Production environment with full decentralization

### Validation Gates

Performance and decentralization requirements are enforced through validation gates:

- **Performance Gate**: ≤2s latency, ≥100 RPS, ≤1% error rate
- **Decentralization Gate**: Minimum nodes, geographic distribution
- **Integrity Gate**: Data integrity, audit trails, Qerberos signatures

## Architecture

The system follows a microservices architecture with:

- **Demo Orchestrator**: Central coordination and management
- **Scenario Engine**: Execution of predefined demo scenarios
- **Validation Manager**: Performance and integrity validation
- **Configuration Manager**: Multi-environment configuration management

## Development

### Scripts

```bash
npm run build      # Build TypeScript
npm run dev        # Development mode with hot reload
npm run test       # Run tests
npm run test:watch # Watch mode testing
npm run lint       # Code linting
npm run clean      # Clean build artifacts
```

### Project Structure

```
src/
├── config/          # Configuration management
├── interfaces/      # Core interfaces and contracts
├── types/          # TypeScript type definitions
└── index.ts        # Main entry point
```

## Requirements Mapping

This implementation addresses the following requirements:

- **Requirement 6.1**: Private repository under AnarQorp organization
- **Requirement 6.2**: Docker-compose orchestration for all services
- **Requirement 6.3**: Automated setup and configuration scripts

## GitHub Repository

Este proyecto está alojado en GitHub bajo la organización AnarQorp:

- **Repositorio**: https://github.com/AnarQorp/anarqq-ecosystem-demo
- **Organización**: AnarQorp  
- **Contacto**: anarqorp@proton.me
- **Tipo**: Repositorio privado

### Configuración del Repositorio

Para crear y configurar el repositorio GitHub:

```bash
# Configurar token de GitHub
export GITHUB_TOKEN=tu_token_aqui

# Ejecutar script de configuración
./scripts/create-github-repo.sh
```

Ver `GITHUB_SETUP.md` para instrucciones detalladas.

### CI/CD Pipeline

El repositorio incluye pipelines automatizados:

- **Push a `main`**: Tests + Seguridad + Deploy a Producción
- **Push a `develop`**: Tests + Deploy a Staging  
- **Pull Requests**: Tests + Validación de código

### Contribución

1. Fork el repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m 'feat: nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

### Mantenimiento Automático

El repositorio se mantiene actualizado mediante:

- ✅ CI/CD pipelines con GitHub Actions
- ✅ Despliegues automáticos a staging y producción
- ✅ Monitoreo continuo de seguridad (CodeQL, npm audit)
- ✅ Protección de ramas con revisiones obligatorias
- ✅ Templates para issues y pull requests

## Licencia

Este proyecto está disponible bajo una licencia dual:

- **Código fuente**: Licencia MIT - Consulta el archivo [LICENSE](../LICENSE) para más información
- **Documentación y contenido**: Licencia CC BY-NC-SA 4.0 - Consulta el archivo [LICENSE-CC-BY-NC-SA](../LICENSE-CC-BY-NC-SA) para más información

La licencia MIT aplica al código fuente, mientras que la licencia Creative Commons BY-NC-SA 4.0 aplica a la documentación, contenido educativo y materiales relacionados.

## License

This project is available under dual licensing:

- **Source code**: MIT License - See [LICENSE](../LICENSE) file for details
- **Documentation and content**: CC BY-NC-SA 4.0 License - See [LICENSE-CC-BY-NC-SA](../LICENSE-CC-BY-NC-SA) file for details

The MIT license applies to the source code, while the Creative Commons BY-NC-SA 4.0 license applies to documentation, educational content, and related materials.