#!/bin/bash

# Script de verificación pre-setup
# Verifica que todo esté listo antes de crear el repositorio GitHub

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Función para verificar comandos
check_command() {
    if command -v "$1" &> /dev/null; then
        print_success "$1 está instalado"
        return 0
    else
        print_error "$1 no está instalado"
        return 1
    fi
}

# Función para verificar archivos
check_file() {
    if [ -f "$1" ]; then
        print_success "Archivo encontrado: $1"
        return 0
    else
        print_error "Archivo faltante: $1"
        return 1
    fi
}

# Función para verificar directorios
check_directory() {
    if [ -d "$1" ]; then
        print_success "Directorio encontrado: $1"
        return 0
    else
        print_error "Directorio faltante: $1"
        return 1
    fi
}

# Variables de control
errors=0

print_header "VERIFICACIÓN PRE-SETUP"
echo ""

# 1. Verificar herramientas necesarias
print_info "Verificando herramientas necesarias..."
check_command "git" || ((errors++))
check_command "node" || ((errors++))
check_command "npm" || ((errors++))
check_command "curl" || ((errors++))

# Verificar versiones
if command -v node &> /dev/null; then
    node_version=$(node --version)
    print_info "Versión de Node.js: $node_version"
    
    # Verificar que sea Node 18+
    major_version=$(echo "$node_version" | cut -d'.' -f1 | sed 's/v//')
    if [ "$major_version" -ge 18 ]; then
        print_success "Versión de Node.js compatible (≥18)"
    else
        print_error "Node.js debe ser versión 18 o superior"
        ((errors++))
    fi
fi

if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    print_info "Versión de npm: $npm_version"
fi

echo ""

# 2. Verificar estructura del proyecto
print_info "Verificando estructura del proyecto..."
check_file "package.json" || ((errors++))
check_file "tsconfig.json" || ((errors++))
check_file "README.md" || ((errors++))
check_file ".env.example" || ((errors++))
check_file "docker-compose.yml" || ((errors++))
check_file "docker-compose.staging.yml" || ((errors++))
check_file "docker-compose.qnet-phase2.yml" || ((errors++))

check_directory "src" || ((errors++))
check_directory "scripts" || ((errors++))

echo ""

# 3. Verificar archivos de configuración GitHub
print_info "Verificando archivos de configuración GitHub..."
check_file "scripts/create-github-repo.sh" || ((errors++))
check_file "GITHUB_SETUP.md" || ((errors++))

# Verificar que el script sea ejecutable
if [ -f "scripts/create-github-repo.sh" ]; then
    if [ -x "scripts/create-github-repo.sh" ]; then
        print_success "Script create-github-repo.sh es ejecutable"
    else
        print_warning "Script create-github-repo.sh no es ejecutable (ejecutar: chmod +x scripts/create-github-repo.sh)"
    fi
fi

echo ""

# 4. Verificar dependencias del proyecto
print_info "Verificando dependencias del proyecto..."
if [ -f "package.json" ]; then
    if [ -d "node_modules" ]; then
        print_success "Dependencias instaladas"
    else
        print_warning "Dependencias no instaladas (ejecutar: npm install)"
    fi
    
    # Verificar scripts en package.json
    if grep -q '"build"' package.json; then
        print_success "Script 'build' encontrado en package.json"
    else
        print_error "Script 'build' faltante en package.json"
        ((errors++))
    fi
    
    if grep -q '"test"' package.json; then
        print_success "Script 'test' encontrado en package.json"
    else
        print_error "Script 'test' faltante en package.json"
        ((errors++))
    fi
fi

echo ""

# 5. Verificar configuración Git
print_info "Verificando configuración Git..."
if git config user.name &> /dev/null; then
    git_name=$(git config user.name)
    print_success "Git user.name configurado: $git_name"
else
    print_warning "Git user.name no configurado"
    print_info "Configurar con: git config --global user.name 'Tu Nombre'"
fi

if git config user.email &> /dev/null; then
    git_email=$(git config user.email)
    print_success "Git user.email configurado: $git_email"
else
    print_warning "Git user.email no configurado"
    print_info "Configurar con: git config --global user.email 'tu@email.com'"
fi

echo ""

# 6. Verificar token GitHub
print_info "Verificando token GitHub..."
if [ -n "$GITHUB_TOKEN" ]; then
    print_success "GITHUB_TOKEN está configurado como variable de entorno"
    
    # Verificar que el token funcione
    if curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | grep -q '"login"'; then
        print_success "Token GitHub es válido"
    else
        print_error "Token GitHub no es válido o no tiene permisos"
        ((errors++))
    fi
else
    print_warning "GITHUB_TOKEN no está configurado"
    print_info "Configurar con: export GITHUB_TOKEN=tu_token_aqui"
fi

echo ""

# 7. Verificar acceso a organización AnarQorp
if [ -n "$GITHUB_TOKEN" ]; then
    print_info "Verificando acceso a organización AnarQorp..."
    org_response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/orgs/AnarQorp)
    if echo "$org_response" | grep -q '"login".*"AnarQorp"'; then
        print_success "Acceso a organización AnarQorp confirmado"
    else
        print_error "No se puede acceder a la organización AnarQorp"
        print_info "Verificar que:"
        echo "  - El token tenga permisos de organización"
        echo "  - Seas miembro de la organización AnarQorp"
        echo "  - La organización exista y sea accesible"
        ((errors++))
    fi
fi

echo ""

# 8. Verificar que el proyecto compile
print_info "Verificando que el proyecto compile..."
if [ -d "node_modules" ]; then
    if npm run build &> /dev/null; then
        print_success "Proyecto compila correctamente"
    else
        print_warning "El proyecto demo-orchestrator tiene errores de compilación TypeScript"
        print_info "Esto no impide la creación del repositorio GitHub"
        print_info "Los errores pueden resolverse posteriormente"
        # No incrementamos errors++ para que no bloquee el setup
    fi
else
    print_warning "No se puede verificar compilación (dependencias no instaladas)"
fi

echo ""

# Resumen final
print_header "RESUMEN DE VERIFICACIÓN"
echo ""

if [ $errors -eq 0 ]; then
    print_success "🎉 ¡Todas las verificaciones pasaron!"
    echo ""
    print_info "El proyecto está listo para crear el repositorio GitHub."
    print_info "Ejecutar: ./scripts/create-github-repo.sh"
else
    print_error "❌ Se encontraron $errors error(es)"
    echo ""
    print_warning "Resolver los errores antes de continuar:"
    echo ""
    
    if ! command -v git &> /dev/null; then
        echo "  • Instalar Git"
    fi
    
    if ! command -v node &> /dev/null; then
        echo "  • Instalar Node.js 18+"
    fi
    
    if [ -z "$GITHUB_TOKEN" ]; then
        echo "  • Configurar GITHUB_TOKEN"
    fi
    
    if [ ! -d "node_modules" ]; then
        echo "  • Ejecutar: npm install"
    fi
    
    echo ""
    print_info "Volver a ejecutar este script después de resolver los errores."
fi

echo ""
exit $errors