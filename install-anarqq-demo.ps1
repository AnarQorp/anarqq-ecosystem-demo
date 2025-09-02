# AnarQ&Q Ecosystem Demo Installer for Windows PowerShell
# Automated installation script for the complete AnarQ&Q demo environment
# Version: 1.0.0
# Author: AnarQorp Team

param(
    [string]$InstallPath = "$env:USERPROFILE\anarqq-ecosystem",
    [switch]$InstallCore = $false,
    [switch]$SkipDependencies = $false,
    [switch]$Quiet = $false
)

# Configuration
$Config = @{
    DemoRepo = "https://github.com/AnarQorp/anarqq-ecosystem-demo.git"
    CoreRepo = "https://github.com/AnarQorp/anarqq-ecosystem-core.git"
    DemoZip = "https://github.com/AnarQorp/anarqq-ecosystem-demo/archive/refs/heads/main.zip"
    CoreZip = "https://github.com/AnarQorp/anarqq-ecosystem-core/archive/refs/heads/main.zip"
    MinNodeVersion = "18.0.0"
    RequiredDiskGB = 5
    RequiredMemoryGB = 2
}

# Global variables
$DemoDir = Join-Path $InstallPath "demo"
$CoreDir = Join-Path $InstallPath "core"
$LogFile = Join-Path $InstallPath "install.log"
$ErrorCount = 0

# Color functions
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White",
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Write to console with color
    if (-not $Quiet) {
        switch ($Color) {
            "Red" { Write-Host $Message -ForegroundColor Red }
            "Green" { Write-Host $Message -ForegroundColor Green }
            "Yellow" { Write-Host $Message -ForegroundColor Yellow }
            "Blue" { Write-Host $Message -ForegroundColor Blue }
            "Cyan" { Write-Host $Message -ForegroundColor Cyan }
            "Magenta" { Write-Host $Message -ForegroundColor Magenta }
            default { Write-Host $Message }
        }
    }
    
    # Write to log file
    if (Test-Path (Split-Path $LogFile -Parent)) {
        Add-Content -Path $LogFile -Value $logEntry
    }
}

function Write-Info { param([string]$Message) Write-ColorOutput "ℹ️  $Message" "Blue" "INFO" }
function Write-Success { param([string]$Message) Write-ColorOutput "✅ $Message" "Green" "SUCCESS" }
function Write-Warning { param([string]$Message) Write-ColorOutput "⚠️  $Message" "Yellow" "WARNING" }
function Write-Error { param([string]$Message) Write-ColorOutput "❌ $Message" "Red" "ERROR"; $script:ErrorCount++ }
function Write-Step { param([string]$Message) Write-ColorOutput "🔄 $Message" "Cyan" "STEP" }

function Show-Banner {
    if (-not $Quiet) {
        Clear-Host
        Write-Host ""
        Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
        Write-Host "║                                                               ║" -ForegroundColor Magenta
        Write-Host "║               🚀 AnarQ&Q Ecosystem Demo Installer             ║" -ForegroundColor Magenta
        Write-Host "║                                                               ║" -ForegroundColor Magenta
        Write-Host "║           Instalador Automático del Ecosistema               ║" -ForegroundColor Magenta
        Write-Host "║                     Versión 1.0.0                            ║" -ForegroundColor Magenta
        Write-Host "║                                                               ║" -ForegroundColor Magenta
        Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
        Write-Host ""
    }
}

function Test-Command {
    param([string]$Command)
    
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

function Get-CommandVersion {
    param([string]$Command, [string]$VersionArg = "--version")
    
    try {
        $output = & $Command $VersionArg 2>$null
        return $output
    }
    catch {
        return $null
    }
}

function Test-SystemRequirements {
    Write-Info "Verificando requisitos del sistema..."
    
    # Check PowerShell version
    $psVersion = $PSVersionTable.PSVersion
    Write-Info "PowerShell version: $psVersion"
    
    # Check Windows version
    $osVersion = [System.Environment]::OSVersion.Version
    Write-Info "Windows version: $osVersion"
    
    # Check Node.js
    if (Test-Command "node") {
        $nodeVersion = Get-CommandVersion "node"
        Write-Success "Node.js encontrado: $nodeVersion"
    }
    else {
        Write-Error "Node.js no encontrado"
        Write-Info "Descarga Node.js desde: https://nodejs.org"
    }
    
    # Check npm
    if (Test-Command "npm") {
        $npmVersion = Get-CommandVersion "npm"
        Write-Success "npm encontrado: $npmVersion"
    }
    else {
        Write-Error "npm no encontrado"
    }
    
    # Check Git
    if (Test-Command "git") {
        $gitVersion = Get-CommandVersion "git"
        Write-Success "Git encontrado: $gitVersion"
    }
    else {
        Write-Warning "Git no encontrado (se usará descarga ZIP)"
        Write-Info "Descarga Git desde: https://git-scm.com"
    }
    
    # Check Docker (optional)
    if (Test-Command "docker") {
        $dockerVersion = Get-CommandVersion "docker"
        Write-Success "Docker encontrado: $dockerVersion"
    }
    else {
        Write-Info "Docker no encontrado (opcional)"
        Write-Info "Descarga Docker Desktop desde: https://www.docker.com/products/docker-desktop"
    }
    
    # Check disk space
    try {
        $drive = (Get-Item $InstallPath).PSDrive
        if (-not $drive) {
            $drive = Get-PSDrive -Name ($InstallPath.Substring(0,1))
        }
        
        $freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
        if ($freeSpaceGB -ge $Config.RequiredDiskGB) {
            Write-Success "Espacio en disco: ${freeSpaceGB}GB disponibles"
        }
        else {
            Write-Error "Espacio insuficiente: ${freeSpaceGB}GB (requerido: $($Config.RequiredDiskGB)GB)"
        }
    }
    catch {
        Write-Warning "No se pudo verificar el espacio en disco: $_"
    }
    
    # Check memory
    try {
        $memory = Get-CimInstance -ClassName Win32_ComputerSystem
        $memoryGB = [math]::Round($memory.TotalPhysicalMemory / 1GB, 2)
        if ($memoryGB -ge $Config.RequiredMemoryGB) {
            Write-Success "Memoria RAM: ${memoryGB}GB"
        }
        else {
            Write-Warning "Memoria RAM baja: ${memoryGB}GB (recomendado: $($Config.RequiredMemoryGB)GB+)"
        }
    }
    catch {
        Write-Warning "No se pudo verificar la memoria RAM: $_"
    }
    
    return $ErrorCount -eq 0
}

function Install-Dependencies {
    if ($SkipDependencies) {
        Write-Info "Saltando instalación de dependencias (--SkipDependencies)"
        return
    }
    
    Write-Step "Verificando e instalando dependencias..."
    
    # Check if Chocolatey is available for package management
    if (Test-Command "choco") {
        Write-Info "Chocolatey encontrado, se puede usar para instalar dependencias"
        
        # Install Node.js if not present
        if (-not (Test-Command "node")) {
            Write-Step "Instalando Node.js con Chocolatey..."
            try {
                & choco install nodejs -y
                Write-Success "Node.js instalado con Chocolatey"
            }
            catch {
                Write-Warning "Error instalando Node.js con Chocolatey: $_"
            }
        }
        
        # Install Git if not present
        if (-not (Test-Command "git")) {
            Write-Step "Instalando Git con Chocolatey..."
            try {
                & choco install git -y
                Write-Success "Git instalado con Chocolatey"
            }
            catch {
                Write-Warning "Error instalando Git con Chocolatey: $_"
            }
        }
    }
    elseif (Test-Command "winget") {
        Write-Info "Windows Package Manager (winget) encontrado"
        
        # Install Node.js if not present
        if (-not (Test-Command "node")) {
            Write-Step "Instalando Node.js con winget..."
            try {
                & winget install OpenJS.NodeJS
                Write-Success "Node.js instalado con winget"
            }
            catch {
                Write-Warning "Error instalando Node.js con winget: $_"
            }
        }
        
        # Install Git if not present
        if (-not (Test-Command "git")) {
            Write-Step "Instalando Git con winget..."
            try {
                & winget install Git.Git
                Write-Success "Git instalado con winget"
            }
            catch {
                Write-Warning "Error instalando Git con winget: $_"
            }
        }
    }
    else {
        Write-Info "No se encontró gestor de paquetes (Chocolatey/winget)"
        Write-Info "Instala manualmente las dependencias faltantes"
    }
}

function New-Directories {
    Write-Step "Creando directorios de instalación..."
    
    try {
        if (-not (Test-Path $InstallPath)) {
            New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
        }
        
        if (-not (Test-Path $DemoDir)) {
            New-Item -ItemType Directory -Path $DemoDir -Force | Out-Null
        }
        
        if (-not (Test-Path $CoreDir)) {
            New-Item -ItemType Directory -Path $CoreDir -Force | Out-Null
        }
        
        # Create log file
        New-Item -ItemType File -Path $LogFile -Force | Out-Null
        
        Write-Success "Directorios creados en: $InstallPath"
    }
    catch {
        Write-Error "Error creando directorios: $_"
        throw
    }
}

function Get-Repository {
    param(
        [string]$RepoUrl,
        [string]$ZipUrl,
        [string]$Destination,
        [string]$Name
    )
    
    $gitAvailable = Test-Command "git"
    
    if ($gitAvailable) {
        try {
            Write-Step "Clonando repositorio $Name con Git..."
            
            if (Test-Path (Join-Path $Destination ".git")) {
                Write-Info "Repositorio $Name ya existe, actualizando..."
                Set-Location $Destination
                & git pull origin main
            }
            else {
                & git clone $RepoUrl $Destination
            }
            
            Write-Success "Repositorio $Name descargado con Git"
            return
        }
        catch {
            Write-Warning "Error con Git para $Name : $_"
        }
    }
    
    # Fallback to ZIP download
    Write-Step "Descargando $Name como ZIP..."
    
    try {
        $tempZip = Join-Path $env:TEMP "$Name.zip"
        $tempExtract = Join-Path $env:TEMP "$Name-extract"
        
        # Download ZIP
        Invoke-WebRequest -Uri $ZipUrl -OutFile $tempZip -UseBasicParsing
        
        # Extract ZIP
        if (Test-Path $tempExtract) {
            Remove-Item $tempExtract -Recurse -Force
        }
        Expand-Archive -Path $tempZip -DestinationPath $tempExtract
        
        # Move contents to destination
        $extractedDir = Get-ChildItem $tempExtract | Select-Object -First 1
        if ($extractedDir) {
            if (Test-Path $Destination) {
                Remove-Item $Destination -Recurse -Force
            }
            Move-Item $extractedDir.FullName $Destination
        }
        
        # Cleanup
        Remove-Item $tempZip -Force -ErrorAction SilentlyContinue
        Remove-Item $tempExtract -Recurse -Force -ErrorAction SilentlyContinue
        
        Write-Success "Repositorio $Name descargado como ZIP"
    }
    catch {
        Write-Error "Error descargando $Name : $_"
        throw
    }
}

function Install-ProjectDependencies {
    param([string]$ProjectPath, [string]$ProjectName)
    
    Write-Step "Instalando dependencias de $ProjectName..."
    
    try {
        Set-Location $ProjectPath
        
        # Install npm dependencies
        & npm install
        Write-Success "Dependencias de $ProjectName instaladas"
        
        # Try to build
        try {
            & npm run build
            Write-Success "$ProjectName compilado correctamente"
        }
        catch {
            Write-Warning "$ProjectName tiene errores de compilación (no crítico)"
        }
    }
    catch {
        Write-Error "Error instalando dependencias de $ProjectName : $_"
        throw
    }
}

function Set-Environment {
    Write-Step "Configurando entorno..."
    
    $envExample = Join-Path $DemoDir ".env.example"
    $envFile = Join-Path $DemoDir ".env"
    
    if ((Test-Path $envExample) -and (-not (Test-Path $envFile))) {
        Copy-Item $envExample $envFile
        Write-Success "Archivo .env creado"
        Write-Info "Puedes editar $envFile para personalizar la configuración"
    }
}

function New-LauncherScripts {
    Write-Step "Creando scripts de inicio..."
    
    # Start demo script
    $startScript = Join-Path $InstallPath "start-demo.bat"
    $startContent = @"
@echo off
echo 🚀 Iniciando AnarQ&Q Demo...
cd /d "$DemoDir"
npm run dev
pause
"@
    Set-Content -Path $startScript -Value $startContent
    Write-Success "Script de inicio creado: $startScript"
    
    # Stop services script
    $stopScript = Join-Path $InstallPath "stop-services.bat"
    $stopContent = @"
@echo off
echo 🛑 Deteniendo servicios AnarQ&Q...
cd /d "$DemoDir"
if exist "docker-compose.yml" docker-compose down
echo Servicios detenidos
pause
"@
    Set-Content -Path $stopScript -Value $stopContent
    Write-Success "Script de parada creado: $stopScript"
    
    # Update script
    $updateScript = Join-Path $InstallPath "update-demo.bat"
    $updateContent = @"
@echo off
echo 🔄 Actualizando AnarQ&Q Demo...
cd /d "$DemoDir"
git pull origin main
npm install
npm run build
echo Demo actualizada
pause
"@
    Set-Content -Path $updateScript -Value $updateContent
    Write-Success "Script de actualización creado: $updateScript"
    
    # PowerShell launcher
    $psScript = Join-Path $InstallPath "start-demo.ps1"
    $psContent = @"
# AnarQ&Q Demo Launcher
Write-Host "🚀 Iniciando AnarQ&Q Demo..." -ForegroundColor Green
Set-Location "$DemoDir"
& npm run dev
"@
    Set-Content -Path $psScript -Value $psContent
    Write-Success "Script PowerShell creado: $psScript"
}

function Show-CompletionMessage {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Green
    Write-Host "   INSTALACIÓN COMPLETADA" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""
    
    Write-Success "¡Instalación completada exitosamente!"
    Write-Host ""
    Write-Info "📍 Ubicación de instalación: $InstallPath"
    Write-Info "📋 Log de instalación: $LogFile"
    Write-Host ""
    Write-Host "🚀 Para iniciar la demo:" -ForegroundColor Yellow
    Write-Host "   $InstallPath\start-demo.bat" -ForegroundColor Cyan
    Write-Host "   $InstallPath\start-demo.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔄 Para actualizar:" -ForegroundColor Yellow
    Write-Host "   $InstallPath\update-demo.bat" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🛑 Para detener servicios:" -ForegroundColor Yellow
    Write-Host "   $InstallPath\stop-services.bat" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📚 Documentación:" -ForegroundColor Blue
    Write-Host "   Demo: https://github.com/AnarQorp/anarqq-ecosystem-demo" -ForegroundColor Cyan
    Write-Host "   Core: https://github.com/AnarQorp/anarqq-ecosystem-core" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💬 Soporte: anarqorp@proton.me" -ForegroundColor Magenta
    Write-Host ""
}

function Start-Installation {
    try {
        Show-Banner
        
        Write-Info "Iniciando instalación del AnarQ&Q Ecosystem Demo..."
        Write-Info "Fecha: $(Get-Date)"
        Write-Info "Usuario: $env:USERNAME"
        Write-Info "Sistema: $env:OS"
        Write-Host ""
        
        if (-not $Quiet) {
            Write-Host "Esta instalación:" -ForegroundColor Yellow
            Write-Host "  • Descargará los repositorios de AnarQ&Q"
            Write-Host "  • Instalará las dependencias necesarias"
            Write-Host "  • Configurará el entorno de desarrollo"
            Write-Host "  • Creará scripts de inicio automático"
            Write-Host ""
            Write-Host "Ubicación de instalación: $InstallPath" -ForegroundColor Yellow
            Write-Host ""
            
            $confirm = Read-Host "¿Continuar con la instalación? (y/N)"
            if ($confirm -ne 'y' -and $confirm -ne 'Y') {
                Write-Info "Instalación cancelada"
                return $false
            }
        }
        
        # Installation steps
        if (-not (Test-SystemRequirements)) {
            Write-Error "Los requisitos del sistema no se cumplen"
            return $false
        }
        
        Install-Dependencies
        New-Directories
        
        # Download demo repository
        Get-Repository $Config.DemoRepo $Config.DemoZip $DemoDir "Demo"
        
        # Download core repository if requested
        if ($InstallCore) {
            Get-Repository $Config.CoreRepo $Config.CoreZip $CoreDir "Core"
        }
        
        # Install dependencies
        Install-ProjectDependencies $DemoDir "Demo"
        
        # Setup environment
        Set-Environment
        
        # Create launchers
        New-LauncherScripts
        
        Show-CompletionMessage
        
        return $true
    }
    catch {
        Write-Error "Error durante la instalación: $_"
        Write-Info "Revisa el log: $LogFile"
        return $false
    }
}

# Main execution
try {
    $success = Start-Installation
    
    if ($success) {
        Write-Success "Instalación completada exitosamente"
        exit 0
    }
    else {
        Write-Error "La instalación falló"
        exit 1
    }
}
catch {
    Write-Error "Error inesperado: $_"
    exit 1
}
finally {
    if (-not $Quiet) {
        Write-Host ""
        Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
}