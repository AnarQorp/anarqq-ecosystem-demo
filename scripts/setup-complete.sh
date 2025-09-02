#!/bin/bash

# Script maestro para configuración completa del repositorio AnarQorp
# Ejecuta verificación, configuración y setup del repositorio GitHub

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                                                              ║${NC}"
    echo -e "${PURPLE}║  $1${NC}"
    echo -e "${PURPLE}║                                                              ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Banner inicial
clear
echo -e "${PURPLE}"
cat << 'EOF'
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║               AnarQ&Q Ecosystem Demo Setup                    ║
    ║                                                               ║
    ║           Configuración Automática de Repositorio            ║
    ║                     GitHub - AnarQorp                         ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
print_info "Este script configurará automáticamente:"
echo "  • Verificación de prerrequisitos"
echo "  • Instalación de dependencias"
echo "  • Creación del repositorio GitHub privado"
echo "  • Configuración de CI/CD y seguridad"
echo "  • Setup inicial de Git"
echo ""

# Verificar si se proporcionó el token
if [ -z "$1" ] && [ -z "$GITHUB_TOKEN" ]; then
    print_error "Token de GitHub requerido"
    echo ""
    echo "Uso: $0 [GITHUB_TOKEN]"
    echo ""
    echo "O configurar como variable de entorno:"
    echo "export GITHUB_TOKEN=tu_token_aqui"
    echo ""
    echo "Para crear un token:"
    echo "1. Ir a https://github.com/settings/tokens"
    echo "2. Crear 'Personal access token (classic)'"
    echo "3. Seleccionar scopes: repo, admin:org, workflow"
    echo "4. Copiar el token generado"
    exit 1
fi

# Configurar token si se proporcionó como argumento
if [ -n "$1" ]; then
    export GITHUB_TOKEN="$1"
fi

# Confirmar antes de continuar
echo -e "${YELLOW}¿Continuar con la configuración? (y/N): ${NC}"
read -r confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "Configuración cancelada."
    exit 0
fi

# Paso 1: Verificación de prerrequisitos
print_header "PASO 1: VERIFICACIÓN DE PRERREQUISITOS"
print_step "Ejecutando verificación de sistema..."

if ./scripts/verify-setup.sh; then
    print_success "Verificación completada exitosamente"
else
    print_error "Verificación falló. Resolver errores antes de continuar."
    exit 1
fi

# Paso 2: Instalación de dependencias
print_header "PASO 2: INSTALACIÓN DE DEPENDENCIAS"

if [ ! -d "node_modules" ]; then
    print_step "Instalando dependencias de Node.js..."
    npm install
    print_success "Dependencias instaladas"
else
    print_info "Dependencias ya instaladas"
fi

print_step "Verificando build del proyecto..."
if npm run build; then
    print_success "Proyecto compilado exitosamente"
else
    print_error "Error al compilar el proyecto"
    exit 1
fi

# Paso 3: Ejecutar tests
print_header "PASO 3: VERIFICACIÓN DE TESTS"
print_step "Ejecutando tests del proyecto..."

if npm test; then
    print_success "Tests ejecutados exitosamente"
else
    print_error "Algunos tests fallaron, pero continuando con el setup..."
fi

# Paso 4: Creación del repositorio GitHub
print_header "PASO 4: CREACIÓN DEL REPOSITORIO GITHUB"
print_step "Creando repositorio privado en AnarQorp..."

if ./scripts/create-github-repo.sh; then
    print_success "Repositorio GitHub configurado exitosamente"
else
    print_error "Error al configurar el repositorio GitHub"
    exit 1
fi

# Paso 5: Push inicial
print_header "PASO 5: PUSH INICIAL"
print_step "Subiendo código al repositorio..."

echo -e "${YELLOW}¿Hacer push del código al repositorio? (y/N): ${NC}"
read -r push_confirm
if [[ $push_confirm =~ ^[Yy]$ ]]; then
    if git push -u origin main; then
        print_success "Código subido exitosamente"
    else
        print_error "Error al subir el código"
        print_info "Puedes intentar manualmente con: git push -u origin main"
    fi
else
    print_info "Push omitido. Ejecutar manualmente: git push -u origin main"
fi

# Paso 6: Verificación final
print_header "PASO 6: VERIFICACIÓN FINAL"
print_step "Verificando configuración del repositorio..."

# Verificar que el repositorio existe
repo_url="https://github.com/AnarQorp/anarqq-ecosystem-demo"
if curl -s -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/repos/AnarQorp/anarqq-ecosystem-demo" | grep -q '"full_name"'; then
    print_success "Repositorio accesible: $repo_url"
else
    print_error "No se puede acceder al repositorio"
fi

# Verificar workflows
if curl -s -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/repos/AnarQorp/anarqq-ecosystem-demo/actions/workflows" | grep -q '"workflows"'; then
    print_success "Workflows de GitHub Actions configurados"
else
    print_info "Workflows pueden tardar unos minutos en aparecer"
fi

# Resumen final
print_header "🎉 CONFIGURACIÓN COMPLETADA"

echo -e "${GREEN}"
cat << 'EOF'
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║                    ¡SETUP COMPLETADO!                        ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
print_success "Repositorio GitHub configurado exitosamente"
echo ""
print_info "📍 Información del repositorio:"
echo "   • URL: https://github.com/AnarQorp/anarqq-ecosystem-demo"
echo "   • Organización: AnarQorp"
echo "   • Tipo: Privado"
echo "   • Contacto: anarqorp@proton.me"
echo ""
print_info "🔧 Características configuradas:"
echo "   ✅ CI/CD Pipeline con GitHub Actions"
echo "   ✅ Protección de rama main"
echo "   ✅ Templates para Issues y PRs"
echo "   ✅ CODEOWNERS configurado"
echo "   ✅ Análisis de seguridad automático"
echo "   ✅ Despliegues automáticos"
echo ""
print_info "📋 Próximos pasos:"
echo "   1. Verificar workflows en: $repo_url/actions"
echo "   2. Configurar secrets si es necesario"
echo "   3. Invitar colaboradores al repositorio"
echo "   4. Revisar y personalizar configuraciones"
echo ""
print_info "📚 Documentación:"
echo "   • README.md - Documentación principal"
echo "   • GITHUB_SETUP.md - Guía de configuración GitHub"
echo "   • .github/ - Templates y workflows"
echo ""

# Mostrar comandos útiles
print_info "🚀 Comandos útiles:"
echo "   git status                    # Ver estado del repositorio"
echo "   git push origin main          # Subir cambios"
echo "   npm run dev                   # Ejecutar en desarrollo"
echo "   npm test                      # Ejecutar tests"
echo "   docker-compose up             # Levantar entorno local"
echo ""

print_success "¡El repositorio AnarQ&Q Ecosystem Demo está listo para usar!"