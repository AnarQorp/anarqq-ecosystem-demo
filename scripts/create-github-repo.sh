#!/bin/bash

# Script para crear y configurar el repositorio GitHub de AnarQorp
# Uso: ./scripts/create-github-repo.sh [GITHUB_TOKEN]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con colores
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Configuración
ORG_NAME="AnarQorp"
REPO_NAME="anarqq-ecosystem-demo"
REPO_DESCRIPTION="AnarQ&Q Ecosystem Demo - Comprehensive demonstration of the AnarQ&Q decentralized ecosystem with QNET Phase 2 integration"

# Verificar si se proporcionó el token como argumento
if [ -n "$1" ]; then
    GITHUB_TOKEN="$1"
elif [ -n "$GITHUB_TOKEN" ]; then
    print_info "Usando GITHUB_TOKEN de variable de entorno"
else
    print_error "GITHUB_TOKEN no proporcionado"
    echo ""
    echo "Uso: $0 [GITHUB_TOKEN]"
    echo ""
    echo "O configurar como variable de entorno:"
    echo "export GITHUB_TOKEN=tu_token_aqui"
    echo ""
    echo "Para crear un token:"
    echo "1. Ir a https://github.com/settings/tokens"
    echo "2. Crear un 'Personal access token (classic)'"
    echo "3. Seleccionar scopes: repo, admin:org, workflow"
    echo "4. Copiar el token generado"
    exit 1
fi

print_info "Iniciando configuración del repositorio GitHub..."
print_info "Organización: $ORG_NAME"
print_info "Repositorio: $REPO_NAME"

# Función para hacer llamadas a la API de GitHub
github_api() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "https://api.github.com$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            "https://api.github.com$endpoint"
    fi
}

# Verificar acceso a la organización
print_info "Verificando acceso a la organización $ORG_NAME..."
org_response=$(github_api "GET" "/orgs/$ORG_NAME")
if echo "$org_response" | grep -q '"message".*"Not Found"'; then
    print_error "No se puede acceder a la organización $ORG_NAME"
    print_warning "Verifica que:"
    echo "  1. La organización existe"
    echo "  2. Tu token tiene permisos para la organización"
    echo "  3. Eres miembro de la organización"
    exit 1
fi
print_success "Acceso a organización verificado"

# Verificar si el repositorio ya existe
print_info "Verificando si el repositorio ya existe..."
repo_check=$(github_api "GET" "/repos/$ORG_NAME/$REPO_NAME")
if echo "$repo_check" | grep -q '"full_name"'; then
    print_warning "El repositorio $ORG_NAME/$REPO_NAME ya existe"
    REPO_URL=$(echo "$repo_check" | grep '"html_url"' | cut -d'"' -f4)
    print_info "URL del repositorio: $REPO_URL"
else
    # Crear el repositorio
    print_info "Creando repositorio privado..."
    repo_data='{
        "name": "'$REPO_NAME'",
        "description": "'$REPO_DESCRIPTION'",
        "private": true,
        "auto_init": true,
        "gitignore_template": "Node",
        "license_template": "mit"
    }'
    
    create_response=$(github_api "POST" "/orgs/$ORG_NAME/repos" "$repo_data")
    
    if echo "$create_response" | grep -q '"html_url"'; then
        REPO_URL=$(echo "$create_response" | grep '"html_url"' | cut -d'"' -f4)
        print_success "Repositorio creado exitosamente: $REPO_URL"
    else
        print_error "Error creando el repositorio"
        echo "Respuesta de la API:"
        echo "$create_response" | jq . 2>/dev/null || echo "$create_response"
        exit 1
    fi
fi

# Configurar protección de rama main
print_info "Configurando protección de rama main..."
protection_data='{
    "required_status_checks": {
        "strict": true,
        "contexts": ["ci/build", "ci/test", "ci/security-scan"]
    },
    "enforce_admins": false,
    "required_pull_request_reviews": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews": true,
        "require_code_owner_reviews": false
    },
    "restrictions": null
}'

protection_response=$(github_api "PUT" "/repos/$ORG_NAME/$REPO_NAME/branches/main/protection" "$protection_data")
if echo "$protection_response" | grep -q '"url"'; then
    print_success "Protección de rama configurada"
else
    print_warning "No se pudo configurar la protección de rama (puede requerir permisos adicionales)"
fi

# Crear directorio .github si no existe
mkdir -p .github/workflows
mkdir -p .github/ISSUE_TEMPLATE

# Crear workflow de CI/CD
print_info "Creando workflows de GitHub Actions..."

cat > .github/workflows/ci.yml << 'EOF'
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run tests
      run: npm test
    
    - name: Build project
      run: npm run build

  security:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Run security audit
      run: npm audit --audit-level moderate
    
    - name: Initialize CodeQL
      uses: github/codeql-action/init@v2
      with:
        languages: javascript
    
    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v2

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: [test, security]
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Build Docker image
      run: |
        docker build -t anarqorp/anarqq-ecosystem-demo:staging .
        echo "Docker image built for staging"
    
    - name: Deploy to staging
      run: |
        echo "Deploying to staging environment..."
        # Aquí iría la lógica de despliegue real

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: [test, security]
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Build Docker image
      run: |
        docker build -t anarqorp/anarqq-ecosystem-demo:latest .
        echo "Docker image built for production"
    
    - name: Deploy to production
      run: |
        echo "Deploying to production environment..."
        # Aquí iría la lógica de despliegue real
EOF

print_success "Workflow de CI/CD creado"

# Crear CODEOWNERS
cat > .github/CODEOWNERS << 'EOF'
# AnarQ&Q Ecosystem Demo - Code Owners

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
EOF

print_success "CODEOWNERS creado"

# Crear template para issues
cat > .github/ISSUE_TEMPLATE/bug_report.md << 'EOF'
---
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
EOF

# Crear template para pull requests
cat > .github/pull_request_template.md << 'EOF'
## Descripción

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
EOF

print_success "Templates de GitHub creados"

# Configurar Git local
print_info "Configurando Git local..."

# Verificar si ya es un repositorio Git
if [ ! -d ".git" ]; then
    git init
    print_success "Repositorio Git inicializado"
fi

# Configurar remote origin
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$ORG_NAME/$REPO_NAME.git"
print_success "Remote origin configurado"

# Configurar rama principal
git branch -M main

# Agregar archivos
git add .
print_success "Archivos agregados al staging"

# Verificar si hay cambios para commit
if git diff --staged --quiet; then
    print_warning "No hay cambios para commit"
else
    # Commit inicial
    git commit -m "feat: initial commit - AnarQ&Q Ecosystem Demo

- Implementación completa del demo orchestrator
- Configuración multi-ambiente (local, staging, qnet-phase2)
- Sistema de validación y rollback
- Integración con GitHub API
- CI/CD pipelines configurados
- Documentación completa

Refs: #1"
    print_success "Commit inicial creado"
fi

# Mostrar información final
echo ""
print_success "🎉 ¡Configuración completada exitosamente!"
echo ""
print_info "📍 Repositorio: $REPO_URL"
print_info "🔧 Organización: $ORG_NAME"
print_info "📧 Contacto: anarqorp@proton.me"
echo ""
print_warning "📋 Próximos pasos:"
echo "   1. Ejecutar: git push -u origin main"
echo "   2. Configurar secrets en GitHub (si es necesario)"
echo "   3. Verificar que los workflows funcionen correctamente"
echo "   4. Invitar colaboradores al repositorio"
echo ""
print_info "🚀 Para subir los cambios ejecuta:"
echo "   git push -u origin main"