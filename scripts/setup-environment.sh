#!/bin/bash

# AnarQ&Q Ecosystem Demo - Environment Setup Script
# Automated setup for local, staging, and QNET Phase 2 environments

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${1:-local}
FORCE_REBUILD=${2:-false}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo ""
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║$(printf "%62s" "$1")║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Validate environment parameter
validate_environment() {
    case $ENVIRONMENT in
        local|staging|qnet-phase2)
            log_info "Setting up $ENVIRONMENT environment"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            echo "Usage: $0 [local|staging|qnet-phase2] [force-rebuild]"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log_header "CHECKING PREREQUISITES"
    
    local missing_tools=()
    
    # Check required tools
    for tool in docker docker-compose node npm git curl; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
            log_error "$tool is not installed"
        else
            log_success "$tool is available"
        fi
    done
    
    # Check Node.js version
    if command -v node &> /dev/null; then
        local node_version=$(node --version | sed 's/v//' | cut -d'.' -f1)
        if [ "$node_version" -ge 18 ]; then
            log_success "Node.js version is compatible (v$(node --version | sed 's/v//'))"
        else
            log_error "Node.js version must be 18 or higher (current: v$(node --version | sed 's/v//'))"
            missing_tools+=("node>=18")
        fi
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        missing_tools+=("docker-daemon")
    else
        log_success "Docker daemon is running"
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing prerequisites: ${missing_tools[*]}"
        exit 1
    fi
    
    log_success "All prerequisites satisfied"
}

# Setup environment variables
setup_environment_variables() {
    log_header "SETTING UP ENVIRONMENT VARIABLES"
    
    # Create environment-specific .env file
    local env_file="$PROJECT_DIR/.env.$ENVIRONMENT"
    
    case $ENVIRONMENT in
        local)
            cat > "$env_file" << EOF
# Local Development Environment
NODE_ENV=development
LOG_LEVEL=debug
DEMO_ENVIRONMENT=local

# Network Configuration
QNET_PHASE2_ENABLED=false
DISTRIBUTED_MODE=false

# Pi Network Configuration
PI_NETWORK_TESTNET=true
PI_NETWORK_MAINNET=false

# Service Ports
DEMO_ORCHESTRATOR_PORT=3000
IPFS_API_PORT=5001
IPFS_GATEWAY_PORT=8080
QERBEROS_PORT=3001
QWALLET_PORT=3002
REDIS_PORT=6379

# Performance Thresholds
MAX_LATENCY_MS=2000
MIN_THROUGHPUT_RPS=100
MAX_ERROR_RATE=0.01

# Security
ENCRYPTION_LEVEL=standard
AUDIT_ENABLED=true

# Development
HOT_RELOAD=true
DEBUG_MODE=true
EOF
            ;;
        staging)
            cat > "$env_file" << EOF
# Staging Environment
NODE_ENV=staging
LOG_LEVEL=info
DEMO_ENVIRONMENT=staging

# Network Configuration
QNET_PHASE2_ENABLED=true
DISTRIBUTED_MODE=true

# Pi Network Configuration
PI_NETWORK_TESTNET=true
PI_NETWORK_MAINNET=false

# Service Configuration
DEMO_ORCHESTRATOR_REPLICAS=2
QNET_NODE_REPLICAS=3
QERBEROS_REPLICAS=2

# Performance Thresholds
MAX_LATENCY_MS=1500
MIN_THROUGHPUT_RPS=150
MAX_ERROR_RATE=0.005

# Security
ENCRYPTION_LEVEL=high
AUDIT_ENABLED=true
CLUSTER_MODE=true

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
ALERTING_ENABLED=true

# Scaling
AUTO_SCALING_ENABLED=true
CPU_THRESHOLD=70
MEMORY_THRESHOLD=80
NETWORK_LATENCY_THRESHOLD=200
EOF
            ;;
        qnet-phase2)
            cat > "$env_file" << EOF
# QNET Phase 2 Production Environment
NODE_ENV=production
LOG_LEVEL=warn
DEMO_ENVIRONMENT=qnet-phase2

# Network Configuration
QNET_PHASE2_ENABLED=true
DISTRIBUTED_MODE=true
BYZANTINE_FAULT_TOLERANCE=true

# Pi Network Configuration
PI_NETWORK_TESTNET=false
PI_NETWORK_MAINNET=true

# High Availability Configuration
DEMO_ORCHESTRATOR_REPLICAS=5
QNET_COORDINATOR_REPLICAS=3
QNET_VALIDATOR_REPLICAS=global
QERBEROS_REPLICAS=5
QWALLET_REPLICAS=3
IPFS_GATEWAY_REPLICAS=3

# Performance Requirements
MAX_LATENCY_MS=1000
MIN_THROUGHPUT_RPS=200
MAX_ERROR_RATE=0.001

# Security
ENCRYPTION_LEVEL=maximum
AUDIT_ENABLED=true
CLUSTER_MODE=true
REPLICATION_FACTOR=3

# Monitoring & Alerting
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
ALERTMANAGER_ENABLED=true
CONTINUOUS_MONITORING=true

# Scaling & Fault Tolerance
AUTO_SCALING_ENABLED=true
CHAOS_ENGINEERING_ENABLED=true
MIN_NODES=5
MAX_NODES=100
CPU_THRESHOLD=60
MEMORY_THRESHOLD=70
NETWORK_LATENCY_THRESHOLD=100

# Load Balancing
LOAD_BALANCER_ENABLED=true
SSL_ENABLED=true
RATE_LIMITING_ENABLED=true
EOF
            ;;
    esac
    
    # Copy to main .env file
    cp "$env_file" "$PROJECT_DIR/.env"
    
    log_success "Environment variables configured for $ENVIRONMENT"
}

# Install and build project
install_and_build() {
    log_header "INSTALLING DEPENDENCIES AND BUILDING PROJECT"
    
    cd "$PROJECT_DIR"
    
    # Install dependencies
    if [ ! -d "node_modules" ] || [ "$FORCE_REBUILD" = "true" ]; then
        log_info "Installing Node.js dependencies..."
        npm ci
        log_success "Dependencies installed"
    else
        log_info "Dependencies already installed (use force-rebuild to reinstall)"
    fi
    
    # Build project
    log_info "Building TypeScript project..."
    npm run build
    log_success "Project built successfully"
    
    # Run tests
    log_info "Running tests..."
    if npm test; then
        log_success "All tests passed"
    else
        log_warning "Some tests failed, but continuing with setup"
    fi
}

# Setup Docker environment
setup_docker_environment() {
    log_header "SETTING UP DOCKER ENVIRONMENT"
    
    cd "$PROJECT_DIR"
    
    # Select appropriate docker-compose file
    local compose_file="docker-compose.yml"
    case $ENVIRONMENT in
        staging)
            compose_file="docker-compose.staging.yml"
            ;;
        qnet-phase2)
            compose_file="docker-compose.qnet-phase2.yml"
            ;;
    esac
    
    log_info "Using compose file: $compose_file"
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f "$compose_file" down --remove-orphans || true
    
    # Pull latest images
    log_info "Pulling latest Docker images..."
    docker-compose -f "$compose_file" pull || log_warning "Some images may not exist yet"
    
    # Build and start services
    log_info "Building and starting services..."
    if [ "$ENVIRONMENT" = "qnet-phase2" ]; then
        # For production, use swarm mode
        if ! docker node ls &> /dev/null; then
            log_info "Initializing Docker Swarm..."
            docker swarm init
        fi
        docker stack deploy -c "$compose_file" anarqq-demo
    else
        docker-compose -f "$compose_file" up --build -d
    fi
    
    log_success "Docker environment started"
}

# Wait for services to be ready
wait_for_services() {
    log_header "WAITING FOR SERVICES TO BE READY"
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "Checking services (attempt $attempt/$max_attempts)..."
        
        local all_ready=true
        
        # Check demo orchestrator
        if ! curl -f http://localhost:3000/health &> /dev/null; then
            all_ready=false
        fi
        
        # Check IPFS
        if ! curl -f http://localhost:8080/ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn &> /dev/null; then
            all_ready=false
        fi
        
        if [ "$all_ready" = true ]; then
            log_success "All services are ready"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    log_warning "Some services may not be fully ready yet"
    return 1
}

# Validate deployment
validate_deployment() {
    log_header "VALIDATING DEPLOYMENT"
    
    local validation_errors=0
    
    # Check service health
    log_info "Checking service health..."
    
    # Demo Orchestrator health check
    if curl -f http://localhost:3000/health &> /dev/null; then
        log_success "Demo Orchestrator is healthy"
    else
        log_error "Demo Orchestrator health check failed"
        ((validation_errors++))
    fi
    
    # IPFS connectivity check
    if curl -f http://localhost:8080/ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn &> /dev/null; then
        log_success "IPFS is accessible"
    else
        log_warning "IPFS connectivity check failed (may be normal for first startup)"
    fi
    
    # Check container status
    log_info "Checking container status..."
    if [ "$ENVIRONMENT" = "qnet-phase2" ]; then
        docker service ls
    else
        docker-compose ps
    fi
    
    # Run basic functionality test
    log_info "Running basic functionality test..."
    if node "$PROJECT_DIR/test-basic.mjs"; then
        log_success "Basic functionality test passed"
    else
        log_error "Basic functionality test failed"
        ((validation_errors++))
    fi
    
    if [ $validation_errors -eq 0 ]; then
        log_success "Deployment validation passed"
        return 0
    else
        log_error "Deployment validation failed with $validation_errors errors"
        return 1
    fi
}

# Generate deployment report
generate_deployment_report() {
    log_header "GENERATING DEPLOYMENT REPORT"
    
    local report_file="$PROJECT_DIR/deployment-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "deployment": {
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "version": "$(cat $PROJECT_DIR/package.json | grep version | cut -d'"' -f4)",
    "status": "completed"
  },
  "services": {
    "demo_orchestrator": {
      "url": "http://localhost:3000",
      "health_endpoint": "http://localhost:3000/health"
    },
    "ipfs": {
      "gateway": "http://localhost:8080",
      "api": "http://localhost:5001"
    },
    "qerberos": {
      "url": "http://localhost:3001"
    },
    "qwallet": {
      "url": "http://localhost:3002"
    }
  },
  "configuration": {
    "environment_file": ".env.$ENVIRONMENT",
    "compose_file": "docker-compose$([ "$ENVIRONMENT" != "local" ] && echo ".$ENVIRONMENT" || echo "").yml"
  },
  "validation": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "$(validate_deployment &> /dev/null && echo "passed" || echo "failed")"
  }
}
EOF
    
    log_success "Deployment report generated: $report_file"
}

# Main execution
main() {
    log_header "ANARQ&Q ECOSYSTEM DEMO - ENVIRONMENT SETUP"
    
    validate_environment
    check_prerequisites
    setup_environment_variables
    install_and_build
    setup_docker_environment
    wait_for_services
    validate_deployment
    generate_deployment_report
    
    log_header "SETUP COMPLETED SUCCESSFULLY"
    
    echo ""
    log_success "🎉 $ENVIRONMENT environment is ready!"
    echo ""
    log_info "📊 Service URLs:"
    echo "  • Demo Orchestrator: http://localhost:3000"
    echo "  • IPFS Gateway: http://localhost:8080"
    echo "  • IPFS API: http://localhost:5001"
    echo "  • Qerberos Service: http://localhost:3001"
    echo "  • Qwallet Service: http://localhost:3002"
    echo ""
    log_info "📝 Useful commands:"
    echo "  • View logs: docker-compose logs -f"
    echo "  • Stop services: docker-compose down"
    echo "  • Restart services: docker-compose restart"
    echo "  • Run demo: npm run demo"
    echo ""
    log_info "📋 Next steps:"
    echo "  1. Verify services at http://localhost:3000"
    echo "  2. Run demo scenarios: npm run demo"
    echo "  3. Check monitoring (staging/production): http://localhost:3003"
    echo ""
}

# Execute main function
main "$@"