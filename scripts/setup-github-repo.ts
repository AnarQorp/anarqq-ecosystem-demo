#!/usr/bin/env tsx

/**
 * GitHub Repository Setup Script
 * 
 * Automatiza la creación de un repositorio privado en GitHub bajo AnarQorp
 * y configura el proyecto para mantenerlo actualizado.
 */

import { DeploymentManagerService } from '../src/services/DeploymentManagerService.js';
import { BranchProtectionRules, CICDConfig } from '../src/interfaces/DeploymentManager.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface GitHubSetupConfig {
  orgName: string;
  repoName: string;
  description: string;
  githubToken: string;
  localPath: string;
}

class GitHubRepoSetup {
  private deploymentManager: DeploymentManagerService;
  private config: GitHubSetupConfig;

  constructor(config: GitHubSetupConfig) {
    this.config = config;
    this.deploymentManager = new DeploymentManagerService(config.githubToken);
  }

  async setupRepository(): Promise<void> {
    console.log('🚀 Iniciando configuración del repositorio GitHub...');

    try {
      // 1. Crear repositorio privado
      console.log('📦 Creando repositorio privado en GitHub...');
      const repoResult = await this.deploymentManager.provisionPrivateRepo(
        this.config.orgName,
        this.config.repoName
      );

      if (!repoResult.success) {
        throw new Error(`Error creando repositorio: ${repoResult.error}`);
      }

      console.log(`✅ Repositorio creado exitosamente: ${repoResult.repoUrl}`);

      // 2. Configurar reglas de protección de rama
      console.log('🔒 Configurando reglas de protección de rama...');
      const protectionRules: BranchProtectionRules = {
        requirePullRequest: true,
        requiredReviews: 1,
        dismissStaleReviews: true,
        requireCodeOwnerReviews: false,
        requireStatusChecks: true,
        requiredStatusChecks: ['ci/build', 'ci/test', 'ci/security-scan'],
        enforceAdmins: false,
        restrictPushes: false,
        allowedPushUsers: []
      };

      const protectionResult = await this.deploymentManager.setupBranchProtection(
        this.config.repoName,
        protectionRules
      );

      if (protectionResult.success) {
        console.log('✅ Reglas de protección configuradas');
      } else {
        console.warn('⚠️ Error configurando protección:', protectionResult.error);
      }

      // 3. Configurar CI/CD
      console.log('⚙️ Configurando CI/CD pipelines...');
      const cicdConfig: CICDConfig = {
        provider: 'github-actions',
        workflows: [
          {
            name: 'build-and-test',
            trigger: 'push',
            branches: ['main', 'develop'],
            steps: [
              {
                name: 'Checkout code',
                action: 'actions/checkout@v4',
                parameters: {}
              },
              {
                name: 'Setup Node.js',
                action: 'actions/setup-node@v4',
                parameters: { 'node-version': '20' }
              },
              {
                name: 'Install dependencies',
                action: 'npm ci',
                parameters: {}
              },
              {
                name: 'Run tests',
                action: 'npm test',
                parameters: {}
              },
              {
                name: 'Build project',
                action: 'npm run build',
                parameters: {}
              }
            ]
          },
          {
            name: 'security-scan',
            trigger: 'push',
            branches: ['main'],
            steps: [
              {
                name: 'Checkout code',
                action: 'actions/checkout@v4',
                parameters: {}
              },
              {
                name: 'Run security audit',
                action: 'npm audit',
                parameters: {}
              },
              {
                name: 'CodeQL Analysis',
                action: 'github/codeql-action/analyze@v2',
                parameters: {}
              }
            ]
          },
          {
            name: 'deploy-staging',
            trigger: 'push',
            branches: ['develop'],
            steps: [
              {
                name: 'Deploy to staging',
                action: 'docker/build-push-action@v5',
                parameters: {
                  'context': '.',
                  'push': true,
                  'tags': 'anarqorp/anarqq-ecosystem-demo:staging'
                }
              }
            ]
          }
        ],
        secrets: [
          {
            name: 'DOCKER_REGISTRY_TOKEN',
            description: 'Token para acceso al registro Docker',
            required: true
          },
          {
            name: 'STAGING_DEPLOY_KEY',
            description: 'Clave para despliegue en staging',
            required: true
          }
        ],
        environments: [
          {
            name: 'staging',
            protection: true,
            reviewers: ['anarqorp-admin'],
            secrets: ['STAGING_DEPLOY_KEY']
          },
          {
            name: 'qnet-phase2',
            protection: true,
            reviewers: ['anarqorp-admin', 'anarqorp-ops'],
            secrets: ['DOCKER_REGISTRY_TOKEN']
          }
        ]
      };

      const cicdResult = await this.deploymentManager.setupCICDIntegration(
        this.config.repoName,
        cicdConfig
      );

      if (cicdResult.success) {
        console.log('✅ CI/CD configurado exitosamente');
        console.log(`   - Workflows creados: ${cicdResult.workflowsCreated.join(', ')}`);
        console.log(`   - Entornos configurados: ${cicdResult.environmentsSetup.join(', ')}`);
      } else {
        console.warn('⚠️ Error configurando CI/CD:', cicdResult.error);
      }

      // 4. Crear archivos adicionales para el repositorio
      await this.createAdditionalFiles();

      // 5. Configurar Git local
      await this.setupLocalGit(repoResult.repoUrl);

      console.log('🎉 ¡Configuración completada exitosamente!');
      console.log(`📍 Repositorio: ${repoResult.repoUrl}`);
      console.log('📋 Próximos pasos:');
      console.log('   1. Configurar los secrets en GitHub');
      console.log('   2. Hacer push del código inicial');
      console.log('   3. Configurar webhooks si es necesario');

    } catch (error) {
      console.error('❌ Error durante la configuración:', error);
      throw error;
    }
  }

  private async createAdditionalFiles(): Promise<void> {
    console.log('📄 Creando archivos adicionales...');

    // Crear CODEOWNERS
    const codeowners = `# AnarQ&Q Ecosystem Demo - Code Owners

# Global owners
* @anarqorp-admin

# Source code
/src/ @anarqorp-dev-team

# Infrastructure and deployment
/docker-compose*.yml @anarqorp-ops
/scripts/ @anarqorp-ops
/.github/ @anarqorp-admin

# Documentation
/README.md @anarqorp-admin
/docs/ @anarqorp-admin
`;

    await fs.writeFile(path.join(this.config.localPath, '.github', 'CODEOWNERS'), codeowners);

    // Crear template para issues
    const issueTemplate = `---
name: Bug Report
about: Reportar un bug en el AnarQ&Q Ecosystem Demo
title: '[BUG] '
labels: bug
assignees: ''

---

**Descripción del bug**
Una descripción clara y concisa del bug.

**Pasos para reproducir**
1. Ir a '...'
2. Hacer clic en '....'
3. Desplazarse hacia abajo hasta '....'
4. Ver error

**Comportamiento esperado**
Una descripción clara y concisa de lo que esperabas que pasara.

**Capturas de pantalla**
Si aplica, agregar capturas de pantalla para ayudar a explicar el problema.

**Entorno:**
 - OS: [e.g. Ubuntu 20.04]
 - Node.js: [e.g. 20.x]
 - Docker: [e.g. 24.x]

**Contexto adicional**
Agregar cualquier otro contexto sobre el problema aquí.
`;

    await fs.mkdir(path.join(this.config.localPath, '.github', 'ISSUE_TEMPLATE'), { recursive: true });
    await fs.writeFile(
      path.join(this.config.localPath, '.github', 'ISSUE_TEMPLATE', 'bug_report.md'),
      issueTemplate
    );

    // Crear template para pull requests
    const prTemplate = `## Descripción

Breve descripción de los cambios realizados.

## Tipo de cambio

- [ ] Bug fix (cambio que no rompe funcionalidad existente y arregla un issue)
- [ ] Nueva funcionalidad (cambio que no rompe funcionalidad existente y agrega una nueva característica)
- [ ] Breaking change (fix o feature que causaría que funcionalidad existente no funcione como se espera)
- [ ] Actualización de documentación

## ¿Cómo se ha probado?

Describe las pruebas que ejecutaste para verificar tus cambios.

- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Tests manuales

## Checklist:

- [ ] Mi código sigue las guías de estilo del proyecto
- [ ] He realizado una auto-revisión de mi código
- [ ] He comentado mi código, particularmente en áreas difíciles de entender
- [ ] He realizado los cambios correspondientes a la documentación
- [ ] Mis cambios no generan nuevas advertencias
- [ ] He agregado tests que prueban que mi fix es efectivo o que mi feature funciona
- [ ] Los tests unitarios nuevos y existentes pasan localmente con mis cambios
`;

    await fs.writeFile(
      path.join(this.config.localPath, '.github', 'pull_request_template.md'),
      prTemplate
    );

    // Actualizar README con información específica del repositorio
    const readmeAddition = `

## Repositorio GitHub

Este proyecto está alojado en GitHub bajo la organización AnarQorp:
- **Repositorio**: https://github.com/AnarQorp/${this.config.repoName}
- **Organización**: AnarQorp
- **Contacto**: anarqorp@proton.me

### Contribución

1. Fork el repositorio
2. Crear una rama para tu feature (\`git checkout -b feature/AmazingFeature\`)
3. Commit tus cambios (\`git commit -m 'Add some AmazingFeature'\`)
4. Push a la rama (\`git push origin feature/AmazingFeature\`)
5. Abrir un Pull Request

### Mantenimiento

El repositorio se mantiene actualizado automáticamente mediante:
- CI/CD pipelines con GitHub Actions
- Despliegues automáticos a staging y producción
- Monitoreo continuo de seguridad y calidad

Para más información sobre el desarrollo y despliegue, consulta la documentación en \`/docs\`.
`;

    const currentReadme = await fs.readFile(path.join(this.config.localPath, 'README.md'), 'utf-8');
    await fs.writeFile(
      path.join(this.config.localPath, 'README.md'),
      currentReadme + readmeAddition
    );

    console.log('✅ Archivos adicionales creados');
  }

  private async setupLocalGit(repoUrl: string): Promise<void> {
    console.log('🔧 Configurando Git local...');

    // Crear script para configurar Git
    const gitSetupScript = `#!/bin/bash

# Script para configurar el repositorio Git local
set -e

echo "🔧 Configurando repositorio Git local..."

# Inicializar Git si no existe
if [ ! -d ".git" ]; then
    git init
    echo "✅ Repositorio Git inicializado"
fi

# Configurar remote origin
git remote remove origin 2>/dev/null || true
git remote add origin ${repoUrl.replace('https://github.com/', 'git@github.com:').replace('.git', '')}.git
echo "✅ Remote origin configurado: ${repoUrl}"

# Configurar rama principal
git branch -M main

# Agregar archivos
git add .
echo "✅ Archivos agregados al staging"

# Commit inicial
git commit -m "feat: initial commit - AnarQ&Q Ecosystem Demo

- Implementación completa del demo orchestrator
- Configuración multi-ambiente (local, staging, qnet-phase2)
- Sistema de validación y rollback
- Integración con GitHub API
- CI/CD pipelines configurados
- Documentación completa

Refs: #1" || echo "⚠️ No hay cambios para commit"

echo "🚀 Repositorio Git configurado. Para subir los cambios ejecuta:"
echo "   git push -u origin main"
echo ""
echo "📋 Configuración adicional requerida:"
echo "   1. Configurar SSH key en GitHub si usas SSH"
echo "   2. Configurar secrets en el repositorio GitHub"
echo "   3. Verificar permisos de la organización AnarQorp"
`;

    await fs.writeFile(path.join(this.config.localPath, 'scripts', 'setup-git.sh'), gitSetupScript);
    
    // Hacer el script ejecutable (en sistemas Unix)
    try {
      await fs.chmod(path.join(this.config.localPath, 'scripts', 'setup-git.sh'), 0o755);
    } catch (error) {
      console.warn('⚠️ No se pudo hacer ejecutable el script (probablemente en Windows)');
    }

    console.log('✅ Script de configuración Git creado en scripts/setup-git.sh');
  }
}

// Función principal
async function main() {
  const config: GitHubSetupConfig = {
    orgName: 'AnarQorp',
    repoName: 'anarqq-ecosystem-demo',
    description: 'AnarQ&Q Ecosystem Demo - Comprehensive demonstration of the AnarQ&Q decentralized ecosystem with QNET Phase 2 integration',
    githubToken: process.env.GITHUB_TOKEN || '',
    localPath: process.cwd()
  };

  if (!config.githubToken) {
    console.error('❌ Error: GITHUB_TOKEN no está configurado');
    console.log('📋 Para configurar el token:');
    console.log('   1. Crear un Personal Access Token en GitHub con permisos de repo');
    console.log('   2. Exportar como variable de entorno: export GITHUB_TOKEN=tu_token');
    console.log('   3. O crear un archivo .env con: GITHUB_TOKEN=tu_token');
    process.exit(1);
  }

  try {
    const setup = new GitHubRepoSetup(config);
    await setup.setupRepository();
  } catch (error) {
    console.error('❌ Error durante la configuración:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { GitHubRepoSetup, GitHubSetupConfig };