#!/bin/bash

# AnarQ&Q Ecosystem Demo - Master Installer Script
# Detects the system and runs the appropriate installer
# Version: 1.0.0
# Author: AnarQorp Team

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_banner() {
    clear
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║            🚀 AnarQ&Q Ecosystem Demo Installer               ║"
    echo "║                                                               ║"
    echo "║                 Master Installation Script                    ║"
    echo "║                     Versión 1.0.0                            ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

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

detect_system() {
    local os_type=""
    local installer=""
    
    # Detect operating system
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        os_type="Linux"
        installer="install-anarqq-demo.sh"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        os_type="macOS"
        installer="install-anarqq-demo.sh"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        os_type="Windows (Git Bash/Cygwin)"
        installer="install-anarqq-demo.sh"
    else
        os_type="Unknown ($OSTYPE)"
        installer=""
    fi
    
    echo "$os_type|$installer"
}

check_python() {
    if command -v python3 >/dev/null 2>&1; then
        local python_version=$(python3 --version 2>&1 | cut -d' ' -f2)
        echo "python3|$python_version"
        return 0
    elif command -v python >/dev/null 2>&1; then
        local python_version=$(python --version 2>&1 | cut -d' ' -f2)
        if [[ $python_version == 3.* ]]; then
            echo "python|$python_version"
            return 0
        fi
    fi
    return 1
}

show_installer_options() {
    echo -e "${CYAN}Instaladores disponibles:${NC}"
    echo ""
    
    # Bash installer
    if [ -f "install-anarqq-demo.sh" ]; then
        echo -e "${GREEN}1. Instalador Bash (Recomendado)${NC}"
        echo "   - Archivo: install-anarqq-demo.sh"
        echo "   - Plataforma: Linux, macOS, Windows (Git Bash)"
        echo "   - Características: Completo, verificación automática, instalación de dependencias"
        echo ""
    fi
    
    # Python installer
    if [ -f "install-anarqq-demo.py" ]; then
        local python_info=""
        if python_result=$(check_python); then
            python_cmd=$(echo "$python_result" | cut -d'|' -f1)
            python_ver=$(echo "$python_result" | cut -d'|' -f2)
            python_info=" (Python $python_ver disponible)"
        else
            python_info=" (Python 3.8+ requerido)"
        fi
        
        echo -e "${GREEN}2. Instalador Python con GUI${NC}$python_info"
        echo "   - Archivo: install-anarqq-demo.py"
        echo "   - Plataforma: Multiplataforma"
        echo "   - Características: Interfaz gráfica, barra de progreso, log visual"
        echo ""
    fi
    
    # Windows batch installer
    if [ -f "install-anarqq-demo.bat" ]; then
        echo -e "${YELLOW}3. Instalador Windows Batch${NC}"
        echo "   - Archivo: install-anarqq-demo.bat"
        echo "   - Plataforma: Windows CMD"
        echo "   - Características: Nativo de Windows, sin dependencias adicionales"
        echo ""
    fi
    
    # PowerShell installer
    if [ -f "install-anarqq-demo.ps1" ]; then
        echo -e "${YELLOW}4. Instalador PowerShell${NC}"
        echo "   - Archivo: install-anarqq-demo.ps1"
        echo "   - Plataforma: Windows PowerShell"
        echo "   - Características: Avanzado, gestión de paquetes, colores"
        echo ""
    fi
    
    echo -e "${BLUE}5. Instalación Manual${NC}"
    echo "   - Seguir instrucciones del README"
    echo ""
    
    echo -e "${CYAN}0. Salir${NC}"
    echo ""
}

run_installer() {
    local choice="$1"
    
    case $choice in
        1)
            if [ -f "install-anarqq-demo.sh" ]; then
                print_info "Ejecutando instalador Bash..."
                chmod +x install-anarqq-demo.sh
                ./install-anarqq-demo.sh
            else
                print_error "Instalador Bash no encontrado"
                return 1
            fi
            ;;
        2)
            if [ -f "install-anarqq-demo.py" ]; then
                if python_result=$(check_python); then
                    python_cmd=$(echo "$python_result" | cut -d'|' -f1)
                    print_info "Ejecutando instalador Python con $python_cmd..."
                    chmod +x install-anarqq-demo.py
                    $python_cmd install-anarqq-demo.py
                else
                    print_error "Python 3.8+ no encontrado"
                    print_info "Instala Python desde: https://python.org"
                    return 1
                fi
            else
                print_error "Instalador Python no encontrado"
                return 1
            fi
            ;;
        3)
            if [ -f "install-anarqq-demo.bat" ]; then
                print_info "Para ejecutar el instalador Windows Batch:"
                print_info "1. Abre CMD como administrador"
                print_info "2. Navega a este directorio"
                print_info "3. Ejecuta: install-anarqq-demo.bat"
                echo ""
                read -p "Presiona Enter para continuar..."
            else
                print_error "Instalador Windows Batch no encontrado"
                return 1
            fi
            ;;
        4)
            if [ -f "install-anarqq-demo.ps1" ]; then
                print_info "Para ejecutar el instalador PowerShell:"
                print_info "1. Abre PowerShell como administrador"
                print_info "2. Ejecuta: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser"
                print_info "3. Navega a este directorio"
                print_info "4. Ejecuta: .\\install-anarqq-demo.ps1"
                echo ""
                read -p "Presiona Enter para continuar..."
            else
                print_error "Instalador PowerShell no encontrado"
                return 1
            fi
            ;;
        5)
            print_info "Instalación Manual:"
            echo ""
            echo "1. Asegúrate de tener Node.js v18+ instalado"
            echo "2. Clona el repositorio:"
            echo "   git clone https://github.com/AnarQorp/anarqq-ecosystem-demo.git"
            echo "3. Instala dependencias:"
            echo "   cd anarqq-ecosystem-demo && npm install"
            echo "4. Configura el entorno:"
            echo "   cp .env.example .env"
            echo "5. Inicia la demo:"
            echo "   npm run dev"
            echo ""
            echo "Para más detalles, consulta el README del repositorio."
            echo ""
            read -p "Presiona Enter para continuar..."
            ;;
        0)
            print_info "Saliendo..."
            exit 0
            ;;
        *)
            print_error "Opción inválida"
            return 1
            ;;
    esac
}

main() {
    print_banner
    
    # Detect system
    system_info=$(detect_system)
    os_type=$(echo "$system_info" | cut -d'|' -f1)
    recommended_installer=$(echo "$system_info" | cut -d'|' -f2)
    
    print_info "Sistema detectado: $os_type"
    if [ -n "$recommended_installer" ] && [ -f "$recommended_installer" ]; then
        print_success "Instalador recomendado: $recommended_installer"
    fi
    echo ""
    
    # Show options
    show_installer_options
    
    # Get user choice
    while true; do
        read -p "Selecciona una opción (1-5, 0 para salir): " choice
        echo ""
        
        if run_installer "$choice"; then
            break
        else
            echo ""
            print_warning "Intenta con otra opción"
            echo ""
        fi
    done
    
    # Offer verification
    if [ -f "verify-installation.sh" ]; then
        echo ""
        read -p "¿Deseas verificar la instalación? (y/N): " verify
        if [[ $verify =~ ^[Yy]$ ]]; then
            print_info "Ejecutando verificación..."
            chmod +x verify-installation.sh
            ./verify-installation.sh
        fi
    fi
    
    print_success "¡Gracias por usar AnarQ&Q Ecosystem Demo!"
}

# Run main function
main "$@"