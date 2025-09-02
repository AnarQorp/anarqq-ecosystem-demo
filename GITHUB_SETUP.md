# Configuración del Repositorio GitHub - AnarQorp

Este documento describe el proceso para crear y mantener el repositorio privado del AnarQ&Q Ecosystem Demo en GitHub bajo la organización AnarQorp.

## Información del Repositorio

- **Organización**: AnarQorp
- **Repositorio**: anarqq-ecosystem-demo
- **Tipo**: Privado
- **Contacto**: anarqorp@proton.me
- **URL**: https://github.com/AnarQorp/anarqq-ecosystem-demo

## Configuración Inicial

### Prerrequisitos

1. **Cuenta GitHub**: Acceso a la cuenta asociada con anarqorp@proton.me
2. **Permisos**: Permisos de administrador en la organización AnarQorp
3. **Token de Acceso**: Personal Access Token con los siguientes scopes:
   - `repo` (acceso completo a repositorios)
   - `admin:org` (administración de organización)
   - `workflow` (gestión de workflows)

### Crear Token de Acceso

1. Ir a https://github.com/settings/tokens
2. Hacer clic en "Generate new token (classic)"
3. Configurar:
   - **Note**: "AnarQQ Ecosystem Demo Management"
   - **Expiration**: 90 days (renovar según necesidad)
   - **Scopes**: 
     - ✅ repo
     - ✅ admin:org
     - ✅ workflow
4. Copiar el token generado (solo se muestra una vez)

### Ejecutar Configuración Automática

```bash
# Opción 1: Pasar token como argumento
./scripts/create-github-repo.sh tu_github_token_aqui

# Opción 2: Usar variable de entorno
export GITHUB_TOKEN=tu_github_token_aqui
./scripts/create-github-repo.sh
```

### Configuración Manual (Alternativa)

Si prefieres configurar manualmente:

1. **Crear Repositorio**:
   ```bash
   curl -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        -d '{"name":"anarqq-ecosystem-demo","description":"AnarQ&Q Ecosystem Demo","private":true}' \
        https://api.github.com/orgs/AnarQorp/repos
   ```

2. **Configurar Git Local**:
   ```bash
   git init
   git remote add origin https://github.com/AnarQorp/anarqq-ecosystem-demo.git
   git branch -M main
   git add .
   git commit -m "feat: initial commit - AnarQ&Q Ecosystem Demo"
   git push -u origin main
   ```

## Estructura del Repositorio

```
anarqq-ecosystem-demo/
├── .github/
│   ├── workflows/
│   │   └── ci.yml                 # CI/CD pipeline
│   ├── ISSUE_TEMPLATE/
│   │   └── bug_report.md          # Template para reportar bugs
│   ├── CODEOWNERS                 # Propietarios del código
│   └── pull_request_template.md   # Template para PRs
├── src/                           # Código fuente
├── scripts/                       # Scripts de automatización
├── docker-compose*.yml            # Configuraciones de despliegue
├── README.md                      # Documentación principal
└── GITHUB_SETUP.md               # Este archivo
```

## CI/CD Pipeline

El repositorio incluye un pipeline automatizado que:

### En Push a `main`:
- ✅ Ejecuta tests unitarios
- ✅ Ejecuta análisis de seguridad
- ✅ Construye imagen Docker
- ✅ Despliega a producción (QNET Phase 2)

### En Push a `develop`:
- ✅ Ejecuta tests unitarios
- ✅ Ejecuta análisis de seguridad
- ✅ Despliega a staging

### En Pull Requests:
- ✅ Ejecuta tests unitarios
- ✅ Ejecuta linter
- ✅ Verifica build

## Configuración de Seguridad

### Protección de Rama `main`
- ✅ Requiere Pull Request
- ✅ Requiere 1 revisión aprobada
- ✅ Descarta revisiones obsoletas
- ✅ Requiere checks de estado exitosos
- ✅ Requiere que las ramas estén actualizadas

### Secrets Requeridos
Configurar en GitHub → Settings → Secrets and variables → Actions:

- `DOCKER_REGISTRY_TOKEN`: Token para acceso al registro Docker
- `STAGING_DEPLOY_KEY`: Clave para despliegue en staging
- `PRODUCTION_DEPLOY_KEY`: Clave para despliegue en producción

## Mantenimiento

### Actualización Regular
```bash
# Obtener últimos cambios
git pull origin main

# Hacer cambios necesarios
# ...

# Commit y push
git add .
git commit -m "feat: descripción de cambios"
git push origin main
```

### Gestión de Releases
```bash
# Crear tag para release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### Monitoreo
- **Actions**: Verificar que los workflows se ejecuten correctamente
- **Security**: Revisar alertas de seguridad en la pestaña Security
- **Issues**: Responder a issues reportados por la comunidad

## Colaboradores

### Equipos de AnarQorp
- **@anarqorp-admin**: Administradores con acceso completo
- **@anarqorp-dev-team**: Desarrolladores con acceso a código fuente
- **@anarqorp-ops**: Equipo de operaciones con acceso a infraestructura

### Invitar Colaboradores
1. Ir a Settings → Manage access
2. Hacer clic en "Invite a collaborator"
3. Agregar usuario o equipo
4. Seleccionar nivel de permisos apropiado

## Troubleshooting

### Error: "Not Found" al crear repositorio
- Verificar que el token tenga permisos `admin:org`
- Confirmar que eres miembro de la organización AnarQorp
- Verificar que la organización existe y es accesible

### Error: "Validation Failed" en protección de rama
- Verificar que la rama `main` existe
- Confirmar permisos de administrador en el repositorio
- Algunos settings requieren plan GitHub Pro/Team

### Workflows no se ejecutan
- Verificar que los archivos YAML están en `.github/workflows/`
- Confirmar sintaxis YAML correcta
- Revisar logs en la pestaña Actions

## Contacto y Soporte

- **Email**: anarqorp@proton.me
- **GitHub**: @AnarQorp
- **Documentación**: Ver README.md del proyecto

## Changelog

- **2024-01-09**: Configuración inicial del repositorio
- **2024-01-09**: Implementación de CI/CD pipeline
- **2024-01-09**: Configuración de protección de ramas y templates