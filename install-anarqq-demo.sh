#!/bin/bash

# AnarQ&Q Ecosystem Demo Installer
# Instalador automático para la demo del ecosistema AnarQ&Q
# Versión: 1.0.0
# Autor: AnarQorp
# Licencia: MIT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuración
DEMO_REPO="https://github.com/AnarQorp/anarqq-ecosystem-demo.git"
CORE_REPO="https://github.com/AnarQorp/anarqq-ecosystem-core.git"
INSTALL_DIR="$HOME/anarqq-ecosystem"
DEMO_DIR="$INSTALL_DIR/demo"
CORE_DIR="$INSTALL_DIR/core"

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

print_header() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║               AnarQ&Q Ecosystem Demo Installer                ║"
    echo "║                                                               ║"
    echo "║           Instalador Automático del Ecosistema               ║"
    echo "║                     AnarQ&Q v1.0.0                           ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${CYAN}🔄 $1${NC}"
}

print_substep() {
    echo -e "   ${BLUE}→ $1${NC}"
}

# Función para verificar prerrequisitos
check_prerequisites() {
    print_step "Verificando prerrequisitos del sistema..."
    
    local errors=0
    
    # Verificar Git
    if command -v git &> /dev/null; then
        print_substep "Git está instalado: $(git --version)"
    else
        print_error "Git no está instalado"
        ((errors++))
    fi
    
    # Verificar Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        print_substep "Node.js está instalado: $node_version"
        
        # Verificar versión mínima (18+)
        local major_version=$(echo $node_version | cut -d'.' -f1 | sed 's/v//')
        if [ "$major_version" -ge 18 ]; then
            print_substep "Versión de Node.js compatible (≥18)"
        else
            print_error "Node.js versión $node_version no es compatible (requiere ≥18)"
            ((errors++))
        fi
    else
        print_error "Node.js no está instalado"
        ((errors++))
    fi
    
    # Verificar npm
    if command -v npm &> /dev/null; then
        print_substep "npm está instalado: $(npm --version)"
    else
        print_error "npm no está instalado"
        ((errors++))
    fi
    
    # Verificar Docker (opcional)
    if command -v docker &> /dev/null; then
        print_substep "Docker está instalado: $(docker --version)"
    else
        print_warning "Docker no está instalado (opcional para contenedores)"
    fi
    
    # Verificar Docker Compose (opcional)
    if command -v docker-compose &> /dev/null; then
        print_substep "Docker Compose está instalado: $(docker-compose --version)"
    else
        print_warning "Docker Compose no está instalado (opcional para orquestación)"
    fi
    
    if [ $errors -gt 0 ]; then
        print_error "Se encontraron $errors errores en los prerrequisitos"
        echo ""
        print_info "Para instalar los prerrequisitos:"
        echo "  • Git: sudo apt install git (Ubuntu/Debian) o brew install git (macOS)"
        echo "  • Node.js: https://nodejs.org/ o usar nvm"
        echo "  • Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    print_success "Todos los prerrequisitos están satisfechos"
}

# Función para crear directorio de instalación
create_install_directory() {
    print_step "Creando directorio de instalación..."
    
    if [ -d "$INSTALL_DIR" ]; then
        print_warning "El directorio $INSTALL_DIR ya existe"
        read -p "¿Deseas continuar y sobrescribir? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Instalación cancelada"
            exit 0
        fi
        rm -rf "$INSTALL_DIR"
    fi
    
    mkdir -p "$INSTALL_DIR"
    print_success "Directorio creado: $INSTALL_DIR"
}

# Función para descargar repositorios (usando ZIP para evitar autenticación)
download_repositories() {
    print_step "Descargando repositorios del ecosistema AnarQ&Q..."
    
    # URLs para descarga ZIP
    local demo_zip_url="https://github.com/AnarQorp/anarqq-ecosystem-demo/archive/refs/heads/main.zip"
    local core_zip_url="https://github.com/AnarQorp/anarqq-ecosystem-core/archive/refs/heads/main.zip"
    
    # Crear directorio temporal
    local temp_dir=$(mktemp -d)
    
    # Descargar demo usando ZIP
    print_substep "Descargando repositorio de la demo..."
    
    if download_and_extract_zip "$demo_zip_url" "$DEMO_DIR" "demo" "$temp_dir"; then
        print_success "Demo descargada en: $DEMO_DIR"
    else
        print_error "No se pudo descargar la demo"
        print_info "Esto puede ocurrir si:"
        print_info "  1. No tienes acceso al repositorio privado"
        print_info "  2. Tu conexión a internet tiene problemas"
        print_info "  3. El repositorio no está disponible"
        echo ""
        print_info "Contacta a anarqorp@proton.me para obtener acceso"
        cleanup_and_exit 1
    fi
    
    # Preguntar si también quiere el core
    echo ""
    print_info "¿Deseas también descargar el repositorio completo del ecosistema?"
    print_info "Esto incluye todos los 15 módulos y el código fuente completo (~7MB)"
    read -p "Descargar ecosistema completo? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_substep "Descargando repositorio del ecosistema completo..."
        
        if download_and_extract_zip "$core_zip_url" "$CORE_DIR" "core" "$temp_dir"; then
            print_success "Ecosistema completo descargado en: $CORE_DIR"
        else
            print_warning "No se pudo descargar el ecosistema completo (continuando solo con demo)"
        fi
    fi
    
    # Limpiar directorio temporal
    rm -rf "$temp_dir"
}

# Función para limpiar y salir
cleanup_and_exit() {
    local exit_code=${1:-1}
    print_warning "Limpiando archivos temporales..."
    # Limpiar cualquier directorio temporal que pueda haber quedado
    rm -rf /tmp/anarqq-* 2>/dev/null || true
    exit $exit_code
}

# Función auxiliar para descargar y extraer ZIP
download_and_extract_zip() {
    local zip_url="$1"
    local target_dir="$2"
    local repo_name="$3"
    local temp_dir="$4"
    
    local zip_file="$temp_dir/${repo_name}.zip"
    local extract_dir="$temp_dir/${repo_name}_extract"
    
    # Intentar descarga con curl
    print_substep "Descargando archivo ZIP..."
    if curl -L -f -s -o "$zip_file" "$zip_url" 2>/dev/null; then
        print_substep "Extrayendo archivos..."
        
        # Crear directorio de extracción
        mkdir -p "$extract_dir"
        
        # Extraer ZIP
        if command_exists unzip; then
            if unzip -q "$zip_file" -d "$extract_dir" 2>/dev/null; then
                # Buscar el directorio extraído (GitHub crea un directorio con formato repo-branch)
                local extracted_dir=$(find "$extract_dir" -maxdepth 1 -type d -name "*-main" | head -1)
                
                if [ -n "$extracted_dir" ] && [ -d "$extracted_dir" ]; then
                    # Mover contenido al directorio objetivo
                    mkdir -p "$target_dir"
                    cp -r "$extracted_dir"/* "$target_dir/" 2>/dev/null || true
                    cp -r "$extracted_dir"/.[^.]* "$target_dir/" 2>/dev/null || true
                    return 0
                fi
            fi
        else
            print_warning "unzip no está disponible, intentando con otros métodos..."
        fi
    fi
    
    # Si llegamos aquí, la descarga ZIP falló
    return 1
}

# Función para instalar dependencias
install_dependencies() {
    print_step "Instalando dependencias..."
    
    # Instalar dependencias de la demo
    print_substep "Instalando dependencias de la demo..."
    cd "$DEMO_DIR"
    npm install
    print_success "Dependencias de la demo instaladas"
    
    # Si existe el core, instalar sus dependencias también
    if [ -d "$CORE_DIR" ]; then
        print_substep "Instalando dependencias del ecosistema completo..."
        cd "$CORE_DIR"
        npm install
        
        # Instalar dependencias del backend si existe
        if [ -d "backend" ]; then
            print_substep "Instalando dependencias del backend..."
            cd backend
            npm install
            cd ..
        fi
        
        print_success "Dependencias del ecosistema completo instaladas"
    fi
}

# Función para configurar entorno
setup_environment() {
    print_step "Configurando entorno..."
    
    cd "$DEMO_DIR"
    
    # Copiar archivo de entorno si no existe
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        print_substep "Creando archivo de configuración .env..."
        cp .env.example .env
        print_success "Archivo .env creado desde .env.example"
    fi
    
    # Si existe el core, configurar también
    if [ -d "$CORE_DIR" ]; then
        cd "$CORE_DIR"
        if [ ! -f ".env" ] && [ -f ".env.example" ]; then
            print_substep "Creando archivo .env para el ecosistema completo..."
            cp .env.example .env
        fi
        
        # Backend environment
        if [ -d "backend" ] && [ ! -f "backend/.env" ] && [ -f "backend/.env.example" ]; then
            print_substep "Creando archivo .env para el backend..."
            cp backend/.env.example backend/.env
        fi
    fi
}

# Función para ejecutar tests básicos
run_basic_tests() {
    print_step "Ejecutando tests básicos..."
    
    cd "$DEMO_DIR"
    
    # Test de build de la demo
    print_substep "Probando build de la demo..."
    if npm run build &> /dev/null; then
        print_success "Build de la demo exitoso"
    else
        print_warning "Build de la demo falló (puede requerir configuración adicional)"
    fi
    
    # Test básico si existe
    if [ -f "test-basic.mjs" ]; then
        print_substep "Ejecutando test básico..."
        if node test-basic.mjs &> /dev/null; then
            print_success "Test básico pasó"
        else
            print_warning "Test básico falló (puede requerir configuración adicional)"
        fi
    fi
}

# Función para crear scripts de acceso rápido
create_shortcuts() {
    print_step "Creando scripts de acceso rápido..."
    
    # Script para iniciar la demo
    cat > "$INSTALL_DIR/start-demo.sh" << 'EOF'
#!/bin/bash
echo "🚀 Iniciando AnarQ&Q Ecosystem Demo..."
cd "$(dirname "$0")/demo"
npm run dev
EOF
    
    # Script para iniciar el ecosistema completo
    if [ -d "$CORE_DIR" ]; then
        cat > "$INSTALL_DIR/start-ecosystem.sh" << 'EOF'
#!/bin/bash
echo "🚀 Iniciando AnarQ&Q Ecosystem Core..."
cd "$(dirname "$0")/core"

# Iniciar backend en background si existe
if [ -d "backend" ]; then
    echo "📡 Iniciando backend..."
    cd backend
    npm start &
    BACKEND_PID=$!
    cd ..
    echo "Backend iniciado con PID: $BACKEND_PID"
fi

# Iniciar frontend
echo "🎨 Iniciando frontend..."
npm run dev
EOF
    fi
    
    # Script para Docker Compose si está disponible
    if command -v docker-compose &> /dev/null && [ -f "$DEMO_DIR/docker-compose.yml" ]; then
        cat > "$INSTALL_DIR/start-docker.sh" << 'EOF'
#!/bin/bash
echo "🐳 Iniciando AnarQ&Q Ecosystem con Docker..."
cd "$(dirname "$0")/demo"
docker-compose up -d
echo "✅ Servicios iniciados con Docker Compose"
echo "📊 Para ver logs: docker-compose logs -f"
echo "🛑 Para detener: docker-compose down"
EOF
    fi
    
    # Hacer ejecutables
    chmod +x "$INSTALL_DIR"/*.sh
    
    print_success "Scripts de acceso rápido creados en: $INSTALL_DIR"
}

# Función para mostrar información final
show_final_info() {
    print_header
    print_success "🎉 ¡Instalación completada exitosamente!"
    echo ""
    print_info "📍 Ubicación de instalación: $INSTALL_DIR"
    echo ""
    print_info "🚀 Para iniciar la demo:"
    echo "   cd $DEMO_DIR"
    echo "   npm run dev"
    echo ""
    print_info "⚡ O usar el script de acceso rápido:"
    echo "   $INSTALL_DIR/start-demo.sh"
    echo ""
    
    if [ -d "$CORE_DIR" ]; then
        print_info "🌐 Para iniciar el ecosistema completo:"
        echo "   $INSTALL_DIR/start-ecosystem.sh"
        echo ""
    fi
    
    if [ -f "$INSTALL_DIR/start-docker.sh" ]; then
        print_info "🐳 Para iniciar con Docker:"
        echo "   $INSTALL_DIR/start-docker.sh"
        echo ""
    fi
    
    print_info "📚 Documentación:"
    echo "   • Demo: $DEMO_DIR/README.md"
    if [ -d "$CORE_DIR" ]; then
        echo "   • Ecosistema: $CORE_DIR/README.md"
    fi
    echo ""
    
    print_info "🔧 Configuración:"
    echo "   • Demo: $DEMO_DIR/.env"
    if [ -d "$CORE_DIR" ]; then
        echo "   • Ecosistema: $CORE_DIR/.env"
        echo "   • Backend: $CORE_DIR/backend/.env"
    fi
    echo ""
    
    print_info "🌐 URLs por defecto (una vez iniciado):"
    echo "   • Frontend: http://localhost:8080"
    echo "   • Backend: http://localhost:3001"
    echo ""
    
    print_info "📧 Soporte: anarqorp@proton.me"
    print_info "🔗 GitHub: https://github.com/AnarQorp"
    echo ""
    
    print_success "¡Disfruta explorando el ecosistema AnarQ&Q! 🚀"
}

# Función principal
main() {
    print_header
    
    print_info "Este instalador configurará automáticamente:"
    echo "  • Verificación de prerrequisitos"
    echo "  • Descarga de repositorios"
    echo "  • Instalación de dependencias"
    echo "  • Configuración del entorno"
    echo "  • Tests básicos"
    echo "  • Scripts de acceso rápido"
    echo ""
    
    read -p "¿Continuar con la instalación? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Instalación cancelada"
        exit 0
    fi
    
    echo ""
    
    # Ejecutar pasos de instalación
    check_prerequisites
    create_install_directory
    download_repositories
    install_dependencies
    setup_environment
    run_basic_tests
    create_shortcuts
    
    echo ""
    show_final_info
}

# Manejo de errores
trap 'print_error "Error durante la instalación. Revisa los logs arriba."; exit 1' ERR

# Ejecutar instalador
main "$@"