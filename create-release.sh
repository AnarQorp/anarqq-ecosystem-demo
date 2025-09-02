#!/bin/bash

# AnarQ&Q Ecosystem Demo - Release Creator
# Creates a complete release package with all installers
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
    echo "║            📦 AnarQ&Q Demo Release Creator                    ║"
    echo "║                                                               ║"
    echo "║              Creador de Paquetes de Release                   ║"
    echo "║                     Versión 1.0.0                            ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_step() { echo -e "${CYAN}🔄 $1${NC}"; }

# Configuration
VERSION="1.0.0"
RELEASE_DIR="anarqq-ecosystem-demo-v${VERSION}"
ARCHIVE_NAME="anarqq-ecosystem-demo-installers-v${VERSION}"

main() {
    print_banner
    
    print_info "Creando release v${VERSION} del AnarQ&Q Ecosystem Demo..."
    echo ""
    
    # Clean previous release
    if [ -d "$RELEASE_DIR" ]; then
        print_step "Limpiando release anterior..."
        rm -rf "$RELEASE_DIR"
    fi
    
    # Create release directory
    print_step "Creando directorio de release..."
    mkdir -p "$RELEASE_DIR"
    
    # Copy installers
    print_step "Copiando instaladores..."
    cp install-anarqq*.* "$RELEASE_DIR/" 2>/dev/null || true
    cp verify-installation.sh "$RELEASE_DIR/" 2>/dev/null || true
    
    # Copy documentation
    print_step "Copiando documentación..."
    cp README-INSTALLERS.md "$RELEASE_DIR/" 2>/dev/null || true
    cp anarqq-ecosystem-demo-release/README.md "$RELEASE_DIR/" 2>/dev/null || true
    
    # Create checksums
    print_step "Generando checksums..."
    cd "$RELEASE_DIR"
    sha256sum * > SHA256SUMS 2>/dev/null || shasum -a 256 * > SHA256SUMS
    cd ..
    
    # Make scripts executable
    print_step "Configurando permisos..."
    chmod +x "$RELEASE_DIR"/*.sh 2>/dev/null || true
    chmod +x "$RELEASE_DIR"/*.py 2>/dev/null || true
    
    # Create release info
    print_step "Creando información de release..."
    cat > "$RELEASE_DIR/RELEASE_INFO.txt" << EOF
AnarQ&Q Ecosystem Demo - Release v${VERSION}
============================================

Fecha de Release: $(date)
Versión: ${VERSION}
Plataformas Soportadas: Linux, macOS, Windows

Instaladores Incluidos:
- install-anarqq.sh (Instalador maestro con detección automática)
- install-anarqq-demo.sh (Instalador Bash para Linux/macOS)
- install-anarqq-demo.py (Instalador Python GUI multiplataforma)
- install-anarqq-demo.ps1 (Instalador PowerShell para Windows)
- install-anarqq-demo.bat (Instalador Batch para Windows)
- verify-installation.sh (Script de verificación post-instalación)

Documentación:
- README.md (Guía de inicio rápido)
- README-INSTALLERS.md (Documentación completa)
- RELEASE_INFO.txt (Este archivo)
- SHA256SUMS (Checksums de verificación)

Uso Rápido:
1. Descargar y extraer este paquete
2. Ejecutar: ./install-anarqq.sh
3. Seguir las instrucciones en pantalla
4. Verificar con: ./verify-installation.sh

Soporte:
- Email: anarqorp@proton.me
- GitHub: https://github.com/AnarQorp/anarqq-ecosystem-demo
- Issues: https://github.com/AnarQorp/anarqq-ecosystem-demo/issues

¡Gracias por usar AnarQ&Q Ecosystem Demo!
EOF
    
    # Create archives
    print_step "Creando archivos comprimidos..."
    
    # ZIP archive
    if command -v zip >/dev/null 2>&1; then
        zip -r "${ARCHIVE_NAME}.zip" "$RELEASE_DIR"
        print_success "Archivo ZIP creado: ${ARCHIVE_NAME}.zip"
    fi
    
    # TAR.GZ archive
    tar -czf "${ARCHIVE_NAME}.tar.gz" "$RELEASE_DIR"
    print_success "Archivo TAR.GZ creado: ${ARCHIVE_NAME}.tar.gz"
    
    # Show release contents
    print_step "Contenido del release:"
    echo ""
    ls -la "$RELEASE_DIR"
    echo ""
    
    # Show archive sizes
    print_info "Tamaños de archivos:"
    ls -lh "${ARCHIVE_NAME}".* 2>/dev/null || true
    echo ""
    
    # Generate release notes
    print_step "Generando notas de release..."
    cat > "RELEASE_NOTES_v${VERSION}.md" << EOF
# AnarQ&Q Ecosystem Demo v${VERSION} - Release Notes

## 🚀 Nueva Release

Esta release incluye un conjunto completo de instaladores automáticos para el AnarQ&Q Ecosystem Demo, facilitando el despliegue en múltiples plataformas.

## 📦 Instaladores Incluidos

### Instalador Maestro
- **\`install-anarqq.sh\`** - Detección automática de sistema y selección de instalador apropiado

### Instaladores Específicos por Plataforma
- **\`install-anarqq-demo.sh\`** - Instalador Bash completo (Linux/macOS)
- **\`install-anarqq-demo.py\`** - Instalador Python con GUI (Multiplataforma)
- **\`install-anarqq-demo.ps1\`** - Instalador PowerShell avanzado (Windows)
- **\`install-anarqq-demo.bat\`** - Instalador Batch nativo (Windows)

### Herramientas Adicionales
- **\`verify-installation.sh\`** - Verificación completa post-instalación
- **Documentación completa** - Guías de uso y solución de problemas

## ✨ Características Principales

### 🔧 Instalación Automática
- ✅ Verificación automática de requisitos del sistema
- ✅ Instalación automática de dependencias (Node.js, Git)
- ✅ Descarga de repositorios con Git o ZIP como respaldo
- ✅ Configuración automática del entorno de desarrollo
- ✅ Creación de scripts de inicio y gestión

### 🖥️ Interfaz Gráfica
- ✅ Instalador Python con GUI usando Tkinter
- ✅ Barra de progreso en tiempo real
- ✅ Log visual de instalación
- ✅ Selección de directorio personalizado
- ✅ Fallback automático a modo consola

### 🔍 Verificación Completa
- ✅ Verificación de requisitos del sistema
- ✅ Validación de estructura de instalación
- ✅ Pruebas de funcionalidad npm y build
- ✅ Verificación de disponibilidad de puertos
- ✅ Reporte detallado con estadísticas

### 🌐 Compatibilidad Multiplataforma
- ✅ Linux (Ubuntu, Debian, CentOS, Fedora, etc.)
- ✅ macOS (Intel y Apple Silicon)
- ✅ Windows (CMD, PowerShell, Git Bash)
- ✅ Detección automática de gestores de paquetes

## 🚀 Instalación Rápida

\`\`\`bash
# Descargar release
curl -L -O https://github.com/AnarQorp/anarqq-ecosystem-demo/releases/download/v${VERSION}/${ARCHIVE_NAME}.tar.gz

# Extraer
tar -xzf ${ARCHIVE_NAME}.tar.gz

# Instalar
cd ${RELEASE_DIR}
./install-anarqq.sh
\`\`\`

## 🔧 Requisitos del Sistema

- **Node.js**: v18.0.0 o superior
- **npm**: Incluido con Node.js
- **Git**: Recomendado (opcional, se usa ZIP como respaldo)
- **Python**: v3.8+ (solo para instalador GUI)
- **Espacio en disco**: 5GB libres
- **Memoria RAM**: 2GB disponibles

## 📁 Estructura Post-Instalación

\`\`\`
~/anarqq-ecosystem/
├── demo/                    # Aplicación demo
├── core/                   # Ecosistema completo (opcional)
├── start-demo.sh/.bat      # Script para iniciar demo
├── stop-services.sh/.bat   # Script para detener servicios
├── update-demo.sh/.bat     # Script para actualizar
└── install.log            # Log de instalación
\`\`\`

## 🛠️ Verificación

\`\`\`bash
# Verificar instalación completa
./verify-installation.sh
\`\`\`

## 📞 Soporte

- **📧 Email**: anarqorp@proton.me
- **🐛 Issues**: [GitHub Issues](https://github.com/AnarQorp/anarqq-ecosystem-demo/issues)
- **📖 Documentación**: Ver README-INSTALLERS.md incluido

## 🔄 Changelog

### Nuevas Características
- Instalador maestro con detección automática de sistema
- Instalador Python GUI con interfaz gráfica completa
- Instalador PowerShell avanzado para Windows
- Script de verificación post-instalación
- Documentación completa con guías de solución de problemas
- Soporte para instalación automática de dependencias
- Compatibilidad multiplataforma mejorada

### Mejoras
- Manejo robusto de errores en todos los instaladores
- Logs detallados de instalación y diagnóstico
- Fallback automático entre métodos de descarga (Git/ZIP)
- Verificación exhaustiva de requisitos del sistema
- Creación automática de scripts de gestión

### Correcciones
- Resolución de problemas de permisos en diferentes sistemas
- Manejo mejorado de rutas con espacios
- Compatibilidad con diferentes versiones de shells
- Detección correcta de gestores de paquetes del sistema

---

**Descarga**: [${ARCHIVE_NAME}.tar.gz](https://github.com/AnarQorp/anarqq-ecosystem-demo/releases/download/v${VERSION}/${ARCHIVE_NAME}.tar.gz)

**Checksums**: Ver SHA256SUMS incluido en el paquete
EOF
    
    print_success "Notas de release generadas: RELEASE_NOTES_v${VERSION}.md"
    
    # Final summary
    echo ""
    print_success "🎉 ¡Release v${VERSION} creado exitosamente!"
    echo ""
    print_info "📦 Archivos generados:"
    echo "   • $RELEASE_DIR/ (directorio de release)"
    echo "   • ${ARCHIVE_NAME}.tar.gz (archivo comprimido)"
    [ -f "${ARCHIVE_NAME}.zip" ] && echo "   • ${ARCHIVE_NAME}.zip (archivo ZIP)"
    echo "   • RELEASE_NOTES_v${VERSION}.md (notas de release)"
    echo ""
    print_info "🚀 Próximos pasos:"
    echo "   1. Probar los instaladores en diferentes plataformas"
    echo "   2. Subir archivos a GitHub Releases"
    echo "   3. Actualizar documentación del repositorio"
    echo "   4. Anunciar la nueva release"
    echo ""
    print_warning "📋 Para crear un GitHub Release:"
    echo "   gh release create v${VERSION} ${ARCHIVE_NAME}.tar.gz ${ARCHIVE_NAME}.zip --title \"AnarQ&Q Ecosystem Demo v${VERSION}\" --notes-file RELEASE_NOTES_v${VERSION}.md"
    echo ""
}

# Run main function
main "$@"