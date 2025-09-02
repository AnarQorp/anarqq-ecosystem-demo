#!/bin/bash

# AnarQ&Q Ecosystem Demo - Advanced Deployment Script
# Handles complex deployment scenarios with rollback capabilities

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${1:-local}
DEPLOYMENT_MODE=${2:-standard}  # standard, blue-green, canary
ROLLBACK_ON_FAILURE=${3:-true}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Deployment state
DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)"
DEPLOYMENT_LOG="$PROJECT_DIR/logs/deployment-$DEPLOYMENT_ID.log"
ROLLBACK_DATA="$PROJECT_DIR/rollback/rollback-$DEPLOYMENT_ID.json"

# Logging functions
log_info() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1"
    echo -e "${BLUE}$msg${NC}"
    echo "$msg" >> "$DEPLOYMENT_LOG"
}

log_success() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1"
    echo -e "${GREEN}$msg${NC}"
    echo "$msg" >> "$DEPLOYMENT_LOG"
}

log_warning() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $1"
    echo -e "${YELLOW}$msg${NC}"
    echo "$msg" >> "$DEPLOYMENT_LOG"
}

log_error() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1"
    echo -e "${RED}$msg${NC}"
    echo "$msg" >> "$DEPLOYMENT_LOG"
}

log_header() {
    echo ""
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║$(printf "%62s" "$1")║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Initialize deployment
initialize_deployment() {
    log_header "INITIALIZING DEPLOYMENT"
    
    # Create necessary directories
    mkdir -p "$PROJECT_DIR/logs"
    mkdir -p "$PROJECT_DIR/rollback"
    mkdir -p "$PROJECT_DIR/backups"
    
    # Initialize deployment log
    echo "Deployment ID: $DEPLOYMENT_ID" > "$DEPLOYMENT_LOG"
    echo "Environment: $ENVIRONMENT" >> "$DEPLOYMENT_LOG"
    echo "Mode: $DEPLOYMENT_MODE" >> "$DEPLOYMENT_LOG"
    echo "Started: $(date)" >> "$DEPLOYMENT_LOG"
    echo "----------------------------------------" >> "$DEPLOYMENT_LOG"
    
    log_info "Deployment initialized: $DEPLOYMENT_ID"
    log_info "Environment: $ENVIRONMENT"
    log_info "Mode: $DEPLOYMENT_MODE"
    log_info "Log file: $DEPLOYMENT_LOG"
}

# Pre-deployment validation
pre_deployment_validation() {
    log_header "PRE-DEPLOYMENT VALIDATION"
    
    local validation_errors=0
    
    # Check environment configuration
    log_info "Validating environment configuration..."
    if [ ! -f "$PROJECT_DIR/.env.$ENVIRONMENT" ]; then
        log_error "Environment file not found: .env.$ENVIRONMENT"
        ((validation_errors++))
    else
        log_success "Environment configuration found"
    fi
    
    # Check Docker compose file
    local compose_file="docker-compose.yml"
    case $ENVIRONMENT in
        staging) compose_file="docker-compose.staging.yml" ;;
        qnet-phase2) compose_file="docker-compose.qnet-phase2.yml" ;;
    esac
    
    if [ ! -f "$PROJECT_DIR/$compose_file" ]; then
        log_error "Docker compose file not found: $compose_file"
        ((validation_errors++))
    else
        log_success "Docker compose file validated"
    fi
    
    # Validate Docker compose syntax
    log_info "Validating Docker compose syntax..."
    if docker-compose -f "$PROJECT_DIR/$compose_file" config &> /dev/null; then
        log_success "Docker compose syntax is valid"
    else
        log_error "Docker compose syntax validation failed"
        ((validation_errors++))
    fi
    
    # Check resource availability
    log_info "Checking system resources..."
    
    # Check disk space (minimum 5GB)
    local available_space=$(df "$PROJECT_DIR" | awk 'NR==2 {print $4}')
    local min_space=5242880  # 5GB in KB
    
    if [ "$available_space" -gt "$min_space" ]; then
        log_success "Sufficient disk space available"
    else
        log_error "Insufficient disk space (need 5GB, have $(($available_space/1024/1024))GB)"
        ((validation_errors++))
    fi
    
    # Check memory (minimum 4GB)
    local available_memory=$(free -m | awk 'NR==2{print $7}')
    local min_memory=4096
    
    if [ "$available_memory" -gt "$min_memory" ]; then
        log_success "Sufficient memory available"
    else
        log_warning "Low memory available (have ${available_memory}MB, recommended 4GB+)"
    fi
    
    # Check network connectivity
    log_info "Checking network connectivity..."
    if curl -s --connect-timeout 5 https://api.github.com &> /dev/null; then
        log_success "Network connectivity verified"
    else
        log_warning "Network connectivity issues detected"
    fi
    
    if [ $validation_errors -gt 0 ]; then
        log_error "Pre-deployment validation failed with $validation_errors errors"
        return 1
    fi
    
    log_success "Pre-deployment validation passed"
    return 0
}

# Create deployment backup
create_deployment_backup() {
    log_header "CREATING DEPLOYMENT BACKUP"
    
    local backup_dir="$PROJECT_DIR/backups/backup-$DEPLOYMENT_ID"
    mkdir -p "$backup_dir"
    
    # Backup current configuration
    log_info "Backing up current configuration..."
    
    # Backup environment files
    if [ -f "$PROJECT_DIR/.env" ]; then
        cp "$PROJECT_DIR/.env" "$backup_dir/.env.backup"
        log_success "Environment file backed up"
    fi
    
    # Backup Docker volumes (if any)
    log_info "Backing up Docker volumes..."
    if docker volume ls -q | grep -q anarqq; then
        docker run --rm -v anarqq_data:/data -v "$backup_dir":/backup alpine tar czf /backup/volumes.tar.gz -C /data .
        log_success "Docker volumes backed up"
    fi
    
    # Create rollback data
    cat > "$ROLLBACK_DATA" << EOF
{
  "deployment_id": "$DEPLOYMENT_ID",
  "environment": "$ENVIRONMENT",
  "backup_location": "$backup_dir",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "previous_state": {
    "containers": $(docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | tail -n +2 | jq -R . | jq -s .),
    "volumes": $(docker volume ls --format "table {{.Name}}" | tail -n +2 | jq -R . | jq -s .),
    "networks": $(docker network ls --format "table {{.Name}}" | tail -n +2 | jq -R . | jq -s .)
  }
}
EOF
    
    log_success "Deployment backup created: $backup_dir"
    log_success "Rollback data saved: $ROLLBACK_DATA"
}

# Deploy based on mode
deploy_by_mode() {
    log_header "DEPLOYING ($DEPLOYMENT_MODE MODE)"
    
    case $DEPLOYMENT_MODE in
        standard)
            deploy_standard
            ;;
        blue-green)
            deploy_blue_green
            ;;
        canary)
            deploy_canary
            ;;
        *)
            log_error "Unknown deployment mode: $DEPLOYMENT_MODE"
            return 1
            ;;
    esac
}

# Standard deployment
deploy_standard() {
    log_info "Executing standard deployment..."
    
    cd "$PROJECT_DIR"
    
    # Select compose file
    local compose_file="docker-compose.yml"
    case $ENVIRONMENT in
        staging) compose_file="docker-compose.staging.yml" ;;
        qnet-phase2) compose_file="docker-compose.qnet-phase2.yml" ;;
    esac
    
    # Stop existing services
    log_info "Stopping existing services..."
    docker-compose -f "$compose_file" down --remove-orphans || true
    
    # Pull latest images
    log_info "Pulling latest images..."
    docker-compose -f "$compose_file" pull
    
    # Start services
    log_info "Starting services..."
    if [ "$ENVIRONMENT" = "qnet-phase2" ]; then
        # Use Docker Swarm for production
        if ! docker node ls &> /dev/null; then
            docker swarm init
        fi
        docker stack deploy -c "$compose_file" anarqq-demo
    else
        docker-compose -f "$compose_file" up --build -d
    fi
    
    log_success "Standard deployment completed"
}

# Blue-green deployment
deploy_blue_green() {
    log_info "Executing blue-green deployment..."
    
    # This is a simplified blue-green deployment
    # In production, this would involve load balancer switching
    
    local current_env="blue"
    local new_env="green"
    
    # Check current environment
    if docker ps --format "table {{.Names}}" | grep -q "green"; then
        current_env="green"
        new_env="blue"
    fi
    
    log_info "Current environment: $current_env"
    log_info "Deploying to: $new_env"
    
    # Deploy to new environment
    cd "$PROJECT_DIR"
    
    # Create temporary compose file for new environment
    local compose_file="docker-compose.yml"
    local temp_compose="docker-compose.$new_env.yml"
    
    # Modify compose file for new environment (change container names and ports)
    sed "s/demo-orchestrator/demo-orchestrator-$new_env/g; s/3000:3000/3100:3000/g" "$compose_file" > "$temp_compose"
    
    # Deploy new environment
    docker-compose -f "$temp_compose" up --build -d
    
    # Wait for new environment to be ready
    log_info "Waiting for new environment to be ready..."
    sleep 30
    
    # Health check new environment
    if curl -f http://localhost:3100/health &> /dev/null; then
        log_success "New environment is healthy"
        
        # Switch traffic (in real scenario, this would be load balancer config)
        log_info "Switching traffic to new environment..."
        
        # Stop old environment
        docker-compose down --remove-orphans || true
        
        # Rename new environment containers to standard names
        docker rename "demo-orchestrator-$new_env" "demo-orchestrator"
        
        log_success "Blue-green deployment completed"
    else
        log_error "New environment health check failed"
        docker-compose -f "$temp_compose" down
        rm "$temp_compose"
        return 1
    fi
    
    rm "$temp_compose"
}

# Canary deployment
deploy_canary() {
    log_info "Executing canary deployment..."
    
    # Deploy canary version alongside current version
    cd "$PROJECT_DIR"
    
    # Create canary compose file
    local compose_file="docker-compose.yml"
    local canary_compose="docker-compose.canary.yml"
    
    # Modify compose file for canary (different ports and names)
    sed "s/demo-orchestrator/demo-orchestrator-canary/g; s/3000:3000/3200:3000/g" "$compose_file" > "$canary_compose"
    
    # Deploy canary
    docker-compose -f "$canary_compose" up --build -d
    
    # Wait for canary to be ready
    log_info "Waiting for canary to be ready..."
    sleep 30
    
    # Health check canary
    if curl -f http://localhost:3200/health &> /dev/null; then
        log_success "Canary deployment is healthy"
        
        # Run canary tests
        log_info "Running canary validation tests..."
        
        # Simulate traffic split testing
        local canary_success=true
        for i in {1..10}; do
            if ! curl -f http://localhost:3200/health &> /dev/null; then
                canary_success=false
                break
            fi
            sleep 1
        done
        
        if [ "$canary_success" = true ]; then
            log_success "Canary tests passed, promoting to production"
            
            # Stop old version
            docker-compose down --remove-orphans || true
            
            # Promote canary to production
            docker rename "demo-orchestrator-canary" "demo-orchestrator"
            
            log_success "Canary deployment promoted to production"
        else
            log_error "Canary tests failed, rolling back"
            docker-compose -f "$canary_compose" down
            rm "$canary_compose"
            return 1
        fi
    else
        log_error "Canary deployment health check failed"
        docker-compose -f "$canary_compose" down
        rm "$canary_compose"
        return 1
    fi
    
    rm "$canary_compose"
}

# Post-deployment validation
post_deployment_validation() {
    log_header "POST-DEPLOYMENT VALIDATION"
    
    local validation_errors=0
    
    # Wait for services to stabilize
    log_info "Waiting for services to stabilize..."
    sleep 30
    
    # Health checks
    log_info "Performing health checks..."
    
    # Demo Orchestrator
    if curl -f http://localhost:3000/health &> /dev/null; then
        log_success "Demo Orchestrator health check passed"
    else
        log_error "Demo Orchestrator health check failed"
        ((validation_errors++))
    fi
    
    # IPFS
    if curl -f http://localhost:8080/ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn &> /dev/null; then
        log_success "IPFS health check passed"
    else
        log_warning "IPFS health check failed (may be normal for new deployment)"
    fi
    
    # Performance validation
    log_info "Running performance validation..."
    
    # Latency test
    local latency=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:3000/health)
    local latency_ms=$(echo "$latency * 1000" | bc)
    
    if (( $(echo "$latency_ms < 2000" | bc -l) )); then
        log_success "Latency test passed (${latency_ms}ms < 2000ms)"
    else
        log_error "Latency test failed (${latency_ms}ms >= 2000ms)"
        ((validation_errors++))
    fi
    
    # Integration test
    log_info "Running integration tests..."
    if node "$PROJECT_DIR/test-basic.mjs"; then
        log_success "Integration tests passed"
    else
        log_error "Integration tests failed"
        ((validation_errors++))
    fi
    
    if [ $validation_errors -gt 0 ]; then
        log_error "Post-deployment validation failed with $validation_errors errors"
        return 1
    fi
    
    log_success "Post-deployment validation passed"
    return 0
}

# Rollback deployment
rollback_deployment() {
    log_header "ROLLING BACK DEPLOYMENT"
    
    if [ ! -f "$ROLLBACK_DATA" ]; then
        log_error "Rollback data not found: $ROLLBACK_DATA"
        return 1
    fi
    
    log_info "Rolling back deployment: $DEPLOYMENT_ID"
    
    # Stop current services
    log_info "Stopping current services..."
    docker-compose down --remove-orphans || true
    
    if [ "$ENVIRONMENT" = "qnet-phase2" ]; then
        docker stack rm anarqq-demo || true
        sleep 10
    fi
    
    # Restore backup
    local backup_dir=$(jq -r '.backup_location' "$ROLLBACK_DATA")
    
    if [ -d "$backup_dir" ]; then
        log_info "Restoring configuration from backup..."
        
        # Restore environment file
        if [ -f "$backup_dir/.env.backup" ]; then
            cp "$backup_dir/.env.backup" "$PROJECT_DIR/.env"
            log_success "Environment file restored"
        fi
        
        # Restore volumes
        if [ -f "$backup_dir/volumes.tar.gz" ]; then
            log_info "Restoring Docker volumes..."
            docker run --rm -v anarqq_data:/data -v "$backup_dir":/backup alpine tar xzf /backup/volumes.tar.gz -C /data
            log_success "Docker volumes restored"
        fi
    fi
    
    # Restart with previous configuration
    log_info "Restarting services with previous configuration..."
    "$SCRIPT_DIR/setup-environment.sh" "$ENVIRONMENT"
    
    log_success "Rollback completed"
}

# Generate deployment report
generate_deployment_report() {
    log_header "GENERATING DEPLOYMENT REPORT"
    
    local report_file="$PROJECT_DIR/deployment-report-$DEPLOYMENT_ID.json"
    local deployment_status="success"
    
    if [ $? -ne 0 ]; then
        deployment_status="failed"
    fi
    
    cat > "$report_file" << EOF
{
  "deployment": {
    "id": "$DEPLOYMENT_ID",
    "environment": "$ENVIRONMENT",
    "mode": "$DEPLOYMENT_MODE",
    "status": "$deployment_status",
    "started": "$(head -n 4 "$DEPLOYMENT_LOG" | tail -n 1 | cut -d' ' -f2-3)",
    "completed": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "duration": "$(( $(date +%s) - $(date -d "$(head -n 4 "$DEPLOYMENT_LOG" | tail -n 1 | cut -d' ' -f2-3)" +%s) )) seconds"
  },
  "validation": {
    "pre_deployment": "$(grep -q "Pre-deployment validation passed" "$DEPLOYMENT_LOG" && echo "passed" || echo "failed")",
    "post_deployment": "$(grep -q "Post-deployment validation passed" "$DEPLOYMENT_LOG" && echo "passed" || echo "failed")"
  },
  "services": {
    "demo_orchestrator": {
      "status": "$(curl -f http://localhost:3000/health &> /dev/null && echo "healthy" || echo "unhealthy")",
      "url": "http://localhost:3000"
    },
    "ipfs": {
      "status": "$(curl -f http://localhost:8080/ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn &> /dev/null && echo "healthy" || echo "unhealthy")",
      "gateway": "http://localhost:8080"
    }
  },
  "logs": {
    "deployment_log": "$DEPLOYMENT_LOG",
    "rollback_data": "$ROLLBACK_DATA"
  }
}
EOF
    
    log_success "Deployment report generated: $report_file"
}

# Main execution
main() {
    log_header "ANARQ&Q ECOSYSTEM DEMO - ADVANCED DEPLOYMENT"
    
    # Validate parameters
    case $ENVIRONMENT in
        local|staging|qnet-phase2) ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            echo "Usage: $0 [local|staging|qnet-phase2] [standard|blue-green|canary] [true|false]"
            exit 1
            ;;
    esac
    
    case $DEPLOYMENT_MODE in
        standard|blue-green|canary) ;;
        *)
            log_error "Invalid deployment mode: $DEPLOYMENT_MODE"
            echo "Usage: $0 [local|staging|qnet-phase2] [standard|blue-green|canary] [true|false]"
            exit 1
            ;;
    esac
    
    # Execute deployment pipeline
    initialize_deployment
    
    if pre_deployment_validation; then
        create_deployment_backup
        
        if deploy_by_mode; then
            if post_deployment_validation; then
                log_success "🎉 Deployment completed successfully!"
            else
                log_error "Post-deployment validation failed"
                if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
                    rollback_deployment
                fi
                exit 1
            fi
        else
            log_error "Deployment failed"
            if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
                rollback_deployment
            fi
            exit 1
        fi
    else
        log_error "Pre-deployment validation failed"
        exit 1
    fi
    
    generate_deployment_report
    
    log_header "DEPLOYMENT COMPLETED"
    
    echo ""
    log_success "🎉 Advanced deployment completed successfully!"
    echo ""
    log_info "📊 Deployment Summary:"
    echo "  • ID: $DEPLOYMENT_ID"
    echo "  • Environment: $ENVIRONMENT"
    echo "  • Mode: $DEPLOYMENT_MODE"
    echo "  • Status: Success"
    echo ""
    log_info "📝 Files Generated:"
    echo "  • Log: $DEPLOYMENT_LOG"
    echo "  • Report: $PROJECT_DIR/deployment-report-$DEPLOYMENT_ID.json"
    echo "  • Rollback Data: $ROLLBACK_DATA"
    echo ""
}

# Execute main function
main "$@"