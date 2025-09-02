# 🚀 AnarQ&Q Ecosystem Demo - Instaladores Automáticos

Este directorio contiene instaladores automáticos para facilitar el despliegue de la demo del ecosistema AnarQ&Q en diferentes plataformas.

## 📦 Instaladores Disponibles

### 1. Instalador Bash (Linux/macOS) - `install-anarqq-demo.sh`
Instalador completo con interfaz de consola para sistemas Unix-like.

**Características:**
- ✅ Verificación automática de requisitos del sistema
- ✅ Instalación automática de dependencias (Node.js, Git)
- ✅ Descarga de repositorios con Git o ZIP como respaldo
- ✅ Configuración automática del entorno
- ✅ Creación de scripts de inicio y gestión
- ✅ Soporte para Docker (opcional)
- ✅ Log detallado de instalación

**Uso:**
```bash
# Hacer ejecutable
chmod +x install-anarqq-demo.sh

# Ejecutar instalación
./install-anarqq-demo.sh
```

### 2. Instalador Windows - `install-anarqq-demo.bat`
Instalador para sistemas Windows con CMD.

**Características:**
- ✅ Verificación de requisitos (Node.js, npm, Git)
- ✅ Descarga automática de repositorios
- ✅ Instalación de dependencias
- ✅ Creación de scripts .bat para Windows
- ✅ Soporte para Docker Desktop (opcional)

**Uso:**
```cmd
# Ejecutar como administrador (recomendado)
install-anarqq-demo.bat
```

### 3. Instalador Python con GUI - `install-anarqq-demo.py`
Instalador multiplataforma con interfaz gráfica usando Tkinter.

**Características:**
- ✅ Interfaz gráfica intuitiva
- ✅ Barra de progreso en tiempo real
- ✅ Log visual de instalación
- ✅ Selección de directorio de instalación
- ✅ Opción para instalar ecosistema completo
- ✅ Fallback automático a modo consola
- ✅ Multiplataforma (Windows, Linux, macOS)

**Uso:**
```bash
# Con interfaz gráfica (por defecto)
python3 install-anarqq-demo.py

# Modo consola forzado
python3 install-anarqq-demo.py --console
```

## 🔧 Requisitos del Sistema

### Requisitos Mínimos
- **Node.js**: v18.0.0 o superior
- **npm**: Incluido con Node.js
- **Git**: Recomendado (opcional, se usa ZIP como respaldo)
- **Python**: v3.8+ (solo para instalador Python)
- **Espacio en disco**: 5GB libres
- **Memoria RAM**: 2GB disponibles

### Requisitos Opcionales
- **Docker**: Para contenedores de servicios
- **Docker Compose**: Para orquestación de servicios

## 📁 Estructura de Instalación

Después de la instalación, tendrás la siguiente estructura:

```
~/anarqq-ecosystem/
├── demo/                    # Repositorio de la demo
│   ├── src/
│   ├── package.json
│   ├── .env                # Configuración del entorno
│   └── ...
├── core/                   # Repositorio completo (opcional)
│   └── ...
├── start-demo.sh/.bat      # Script para iniciar la demo
├── stop-services.sh/.bat   # Script para detener servicios
├── update-demo.sh/.bat     # Script para actualizar
└── install.log            # Log de instalación
```

## 🚀 Uso Post-Instalación

### Iniciar la Demo
```bash
# Linux/macOS
~/anarqq-ecosystem/start-demo.sh

# Windows
%USERPROFILE%\anarqq-ecosystem\start-demo.bat
```

### Actualizar la Demo
```bash
# Linux/macOS
~/anarqq-ecosystem/update-demo.sh

# Windows
%USERPROFILE%\anarqq-ecosystem\update-demo.bat
```

### Detener Servicios
```bash
# Linux/macOS
~/anarqq-ecosystem/stop-services.sh

# Windows
%USERPROFILE%\anarqq-ecosystem\stop-services.bat
```

## 🔍 Verificación de Instalación

### Script Automático de Verificación - `verify-installation.sh`
Incluimos un script completo que verifica automáticamente toda la instalación:

```bash
# Hacer ejecutable
chmod +x verify-installation.sh

# Ejecutar verificación completa
./verify-installation.sh
```

**El script verifica:**
- ✅ Requisitos del sistema (Node.js, npm, Git, Docker)
- ✅ Estructura de directorios de instalación
- ✅ Archivos de la demo y dependencias
- ✅ Scripts de inicio y gestión
- ✅ Funcionalidad de npm y build
- ✅ Disponibilidad de puertos de desarrollo

### Verificación Manual

Si prefieres verificar manualmente:

1. **Verificar Node.js y npm:**
   ```bash
   node --version
   npm --version
   ```

2. **Verificar la demo:**
   ```bash
   cd ~/anarqq-ecosystem/demo
   npm run dev
   ```

3. **Verificar Docker (opcional):**
   ```bash
   docker --version
   docker-compose --version
   ```

## 🛠️ Solución de Problemas

### Problemas Comunes

#### 1. Node.js no encontrado
**Solución:**
- **Linux/Ubuntu:** `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs`
- **macOS:** `brew install node` o descargar desde [nodejs.org](https://nodejs.org)
- **Windows:** Descargar desde [nodejs.org](https://nodejs.org)

#### 2. Git no encontrado
**Solución:**
- **Linux/Ubuntu:** `sudo apt-get install git`
- **macOS:** `brew install git`
- **Windows:** Descargar desde [git-scm.com](https://git-scm.com)

#### 3. Permisos insuficientes
**Solución:**
- **Linux/macOS:** Ejecutar con `sudo` si es necesario
- **Windows:** Ejecutar como administrador

#### 4. Error de compilación
**Solución:**
```bash
cd ~/anarqq-ecosystem/demo
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 5. Puerto ocupado
**Solución:**
```bash
# Encontrar proceso usando el puerto
lsof -i :3000  # Linux/macOS
netstat -ano | findstr :3000  # Windows

# Cambiar puerto en .env
echo "PORT=3001" >> ~/anarqq-ecosystem/demo/.env
```

### Logs de Diagnóstico

Los instaladores crean logs detallados en:
- **Ubicación:** `~/anarqq-ecosystem/install.log`
- **Contenido:** Todos los pasos de instalación, errores y advertencias

Para revisar el log:
```bash
# Ver log completo
cat ~/anarqq-ecosystem/install.log

# Ver solo errores
grep "ERROR" ~/anarqq-ecosystem/install.log

# Seguir log en tiempo real (durante instalación)
tail -f ~/anarqq-ecosystem/install.log
```

## 🔄 Actualización de Instaladores

Para obtener las últimas versiones de los instaladores:

```bash
# Descargar instalador Bash
curl -O https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq-demo.sh

# Descargar instalador Python
curl -O https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq-demo.py

# Hacer ejecutables
chmod +x install-anarqq-demo.sh install-anarqq-demo.py
```

## 📞 Soporte

Si encuentras problemas durante la instalación:

1. **Revisa el log:** `~/anarqq-ecosystem/install.log`
2. **Verifica requisitos:** Asegúrate de tener Node.js v18+ instalado
3. **Contacta soporte:** anarqorp@proton.me
4. **Reporta issues:** [GitHub Issues](https://github.com/AnarQorp/anarqq-ecosystem-demo/issues)

## 📚 Documentación Adicional

- **Demo Repository:** https://github.com/AnarQorp/anarqq-ecosystem-demo
- **Core Ecosystem:** https://github.com/AnarQorp/anarqq-ecosystem-core
- **Documentación Técnica:** Ver `/docs` en cada repositorio
- **API Reference:** Ver `/api-docs` en la demo

## 🎯 Próximos Pasos

Después de la instalación exitosa:

1. **Explora la demo:** Navega por las diferentes funcionalidades
2. **Revisa la documentación:** Entiende la arquitectura del ecosistema
3. **Personaliza la configuración:** Edita `.env` según tus necesidades
4. **Contribuye:** Reporta bugs o sugiere mejoras
5. **Integra:** Usa las APIs para tus propios proyectos

---

**¡Gracias por usar AnarQ&Q Ecosystem Demo!** 🚀

*Para más información, visita nuestros repositorios en GitHub o contacta al equipo de desarrollo.*