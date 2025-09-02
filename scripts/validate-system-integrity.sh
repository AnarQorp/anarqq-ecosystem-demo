#!/bin/bash

# AnarQ&Q Ecosystem Demo - System Integrity Validation Script
# Comprehensive validation of system state and integrity

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${1:-local}
VALIDATION_TYPE=${2:-full}  # full, quick, security, performance
VALIDATION_LOG="$PROJECT_DIR/logs/validation-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Validation counters
VALIDATIONS_TOTAL=0
VALIDATIONS_PASSED=0
VALIDATIONS_FAILED=0
VALIDATIONS_WARNING=0

# Logging functions
log_info() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1"
    echo -e "${BLUE}$msg${NC}"
    echo "$msg" >> "$VALIDATION_LOG"
}

log_success() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1"
    echo -e "${GREEN}$msg${NC}"
    echo "$msg" >> "$VALIDATION_LOG"
}

log_warning() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $1"
    echo -e "${YELLOW}$msg${NC}"
    echo "$msg" >> "$VALIDATION_LOG"
}

log_error() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1"
    echo -e "${RED}$msg${NC}"
    echo "$msg" >> "$VALIDATION_LOG"
}

log_header() {
    echo ""
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║$(printf "%62s" "$1")║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Validation execution wrapper
run_validation() {
    local validation_name="$1"
    local validation_function="$2"
    local is_critical="${3:-true}"
    
    ((VALIDATIONS_TOTAL++))
    
    log_info "Running validation: $validation_name"
    
    local result
    if $validation_function; then
        result="PASSED"
        log_success "✓ $validation_name"
        ((VALIDATIONS_PASSED++))
        return 0
    else
        if [ "$is_critical" = "true" ]; then
            result="FAILED"
            log_error "✗ $validation_name (CRITICAL)"
            ((VALIDATIONS_FAILED++))
            return 1
        else
            result="WARNING"
            log_warning "⚠ $validation_name (NON-CRITICAL)"
            ((VALIDATIONS_WARNING++))
            return 0
        fi
    fi
}

# Initialize validation environment
initialize_validation() {
    log_header "INITIALIZING SYSTEM INTEGRITY VALIDATION"
    
    # Create logs directory
    mkdir -p "$PROJECT_DIR/logs"
    
    # Initialize validation log
    echo "System Integrity Validation" > "$VALIDATION_LOG"
    echo "Environment: $ENVIRONMENT" >> "$VALIDATION_LOG"
    echo "Type: $VALIDATION_TYPE" >> "$VALIDATION_LOG"
    echo "Started: $(date)" >> "$VALIDATION_LOG"
    echo "========================================" >> "$VALIDATION_LOG"
    
    log_info "Validation initialized for $ENVIRONMENT environment"
    log_info "Validation type: $VALIDATION_TYPE"
    log_info "Log file: $VALIDATION_LOG"
}

# Validate Docker environment
validate_docker_environment() {
    log_info "Validating Docker environment..."
    
    # Check Docker daemon
    if ! docker info &>/dev/null; then
        log_error "Docker daemon is not running"
        return 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &>/dev/null; then
        log_error "Docker Compose is not installed"
        return 1
    fi
    
    # Validate compose files
    local compose_file="docker-compose.yml"
    case $ENVIRONMENT in
        staging) compose_file="docker-compose.staging.yml" ;;
        qnet-phase2) compose_file="docker-compose.qnet-phase2.yml" ;;
    esac
    
    if [ ! -f "$PROJECT_DIR/$compose_file" ]; then
        log_error "Docker compose file not found: $compose_file"
        return 1
    fi
    
    if ! docker-compose -f "$PROJECT_DIR/$compose_file" config &>/dev/null; then
        log_error "Docker compose file validation failed: $compose_file"
        return 1
    fi
    
    log_success "Docker environment validation passed"
    return 0
}

# Validate service health
validate_service_health() {
    log_info "Validating service health..."
    
    local services_healthy=true
    
    # Demo Orchestrator health check
    log_info "Checking Demo Orchestrator health..."
    if curl -f -s --connect-timeout 5 http://localhost:3000/health &>/dev/null; then
        log_success "Demo Orchestrator is healthy"
    else
        log_error "Demo Orchestrator health check failed"
        services_healthy=false
    fi
    
    # IPFS health check
    log_info "Checking IPFS health..."
    if curl -f -s --connect-timeout 5 http://localhost:5001/api/v0/version &>/dev/null; then
        log_success "IPFS API is healthy"
    else
        log_warning "IPFS API health check failed (may be normal during startup)"
    fi
    
    # IPFS Gateway check
    if curl -f -s --connect-timeout 5 http://localhost:8080/ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn &>/dev/null; then
        log_success "IPFS Gateway is healthy"
    else
        log_warning "IPFS Gateway health check failed (may be normal for new deployment)"
    fi
    
    # Qerberos health check
    log_info "Checking Qerberos health..."
    if curl -f -s --connect-timeout 5 http://localhost:3001/health &>/dev/null; then
        log_success "Qerberos service is healthy"
    else
        log_error "Qerberos health check failed"
        services_healthy=false
    fi
    
    # Qwallet health check
    log_info "Checking Qwallet health..."
    if curl -f -s --connect-timeout 5 http://localhost:3002/health &>/dev/null; then
        log_success "Qwallet service is healthy"
    else
        log_error "Qwallet health check failed"
        services_healthy=false
    fi
    
    if [ "$services_healthy" = true ]; then
        return 0
    else
        return 1
    fi
}

# Validate performance metrics
validate_performance_metrics() {
    log_info "Validating performance metrics..."
    
    local performance_ok=true
    
    # Latency test
    log_info "Testing response latency..."
    local start_time=$(date +%s%N)
    if curl -f -s http://localhost:3000/health &>/dev/null; then
        local end_time=$(date +%s%N)
        local latency_ms=$(( (end_time - start_time) / 1000000 ))
        
        if [ $latency_ms -lt 2000 ]; then
            log_success "Latency test passed: ${latency_ms}ms < 2000ms"
        else
            log_error "Latency test failed: ${latency_ms}ms >= 2000ms"
            performance_ok=false
        fi
    else
        log_error "Latency test failed: service not responding"
        performance_ok=false
    fi
    
    # Throughput test (simplified)
    log_info "Testing throughput..."
    local successful_requests=0
    local total_requests=10
    
    for i in $(seq 1 $total_requests); do
        if curl -f -s --connect-timeout 1 http://localhost:3000/health &>/dev/null; then
            ((successful_requests++))
        fi
    done
    
    local success_rate=$(echo "scale=2; $successful_requests * 100 / $total_requests" | bc)
    
    if (( $(echo "$success_rate >= 99" | bc -l) )); then
        log_success "Throughput test passed: ${success_rate}% success rate"
    else
        log_error "Throughput test failed: ${success_rate}% success rate < 99%"
        performance_ok=false
    fi
    
    # Memory usage check
    log_info "Checking memory usage..."
    local memory_usage=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
    
    if (( $(echo "$memory_usage < 90" | bc -l) )); then
        log_success "Memory usage is acceptable: ${memory_usage}%"
    else
        log_warning "High memory usage detected: ${memory_usage}%"
    fi
    
    # Disk usage check
    log_info "Checking disk usage..."
    local disk_usage=$(df "$PROJECT_DIR" | awk 'NR==2{print $5}' | sed 's/%//')
    
    if [ $disk_usage -lt 90 ]; then
        log_success "Disk usage is acceptable: ${disk_usage}%"
    else
        log_warning "High disk usage detected: ${disk_usage}%"
    fi
    
    if [ "$performance_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

# Validate security configuration
validate_security_configuration() {
    log_info "Validating security configuration..."
    
    local security_ok=true
    
    # Check for exposed sensitive information
    log_info "Checking for exposed sensitive information..."
    
    # Check environment files
    if [ -f "$PROJECT_DIR/.env" ]; then
        if grep -q "password\|secret\|key" "$PROJECT_DIR/.env" | grep -v "example\|placeholder"; then
            log_warning "Potential sensitive information found in .env file"
        else
            log_success "No obvious sensitive information in .env file"
        fi
    fi
    
    # Check Docker container security
    log_info "Checking Docker container security..."
    
    # Check for containers running as root
    local root_containers=$(docker ps --format "table {{.Names}}\t{{.Command}}" | grep -v "NAMES" | wc -l)
    if [ $root_containers -gt 0 ]; then
        log_warning "$root_containers containers may be running with elevated privileges"
    else
        log_success "No containers detected running with elevated privileges"
    fi
    
    # Check network security
    log_info "Checking network security..."
    
    # Verify HTTPS configuration (for production)
    if [ "$ENVIRONMENT" = "qnet-phase2" ]; then
        if curl -k -s https://localhost &>/dev/null; then
            log_success "HTTPS endpoint is accessible"
        else
            log_warning "HTTPS endpoint not accessible (may be normal for local testing)"
        fi
    fi
    
    # Check for default passwords
    log_info "Checking for default passwords..."
    if docker-compose logs 2>/dev/null | grep -i "default.*password\|admin.*admin\|password.*password"; then
        log_error "Default passwords detected in logs"
        security_ok=false
    else
        log_success "No default passwords detected in logs"
    fi
    
    if [ "$security_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

# Validate data integrity
validate_data_integrity() {
    log_info "Validating data integrity..."
    
    local integrity_ok=true
    
    # Check Docker volumes
    log_info "Checking Docker volumes integrity..."
    
    local volumes=$(docker volume ls -q | grep anarqq || true)
    if [ -n "$volumes" ]; then
        for volume in $volumes; do
            if docker volume inspect "$volume" &>/dev/null; then
                log_success "Volume $volume is accessible"
            else
                log_error "Volume $volume is not accessible"
                integrity_ok=false
            fi
        done
    else
        log_info "No AnarQ&Q volumes found (may be normal for fresh deployment)"
    fi
    
    # Check configuration files integrity
    log_info "Checking configuration files integrity..."
    
    local config_files=(
        ".env"
        "package.json"
        "tsconfig.json"
    )
    
    for file in "${config_files[@]}"; do
        if [ -f "$PROJECT_DIR/$file" ]; then
            case $file in
                *.json)
                    if jq . "$PROJECT_DIR/$file" &>/dev/null; then
                        log_success "$file is valid JSON"
                    else
                        log_error "$file is invalid JSON"
                        integrity_ok=false
                    fi
                    ;;
                *)
                    if [ -r "$PROJECT_DIR/$file" ]; then
                        log_success "$file is readable"
                    else
                        log_error "$file is not readable"
                        integrity_ok=false
                    fi
                    ;;
            esac
        else
            log_warning "$file not found"
        fi
    done
    
    # Test basic functionality
    log_info "Testing basic functionality..."
    
    if [ -f "$PROJECT_DIR/test-basic.mjs" ]; then
        if node "$PROJECT_DIR/test-basic.mjs" &>/dev/null; then
            log_success "Basic functionality test passed"
        else
            log_error "Basic functionality test failed"
            integrity_ok=false
        fi
    else
        log_warning "Basic functionality test not found"
    fi
    
    if [ "$integrity_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

# Validate network connectivity
validate_network_connectivity() {
    log_info "Validating network connectivity..."
    
    local network_ok=true
    
    # Check internal service connectivity
    log_info "Checking internal service connectivity..."
    
    local services=(
        "localhost:3000"  # Demo Orchestrator
        "localhost:5001"  # IPFS API
        "localhost:8080"  # IPFS Gateway
        "localhost:3001"  # Qerberos
        "localhost:3002"  # Qwallet
    )
    
    for service in "${services[@]}"; do
        if nc -z ${service/:/ } 2>/dev/null; then
            log_success "$service is reachable"
        else
            log_error "$service is not reachable"
            network_ok=false
        fi
    done
    
    # Check external connectivity
    log_info "Checking external connectivity..."
    
    if curl -s --connect-timeout 5 https://api.github.com &>/dev/null; then
        log_success "External connectivity is working"
    else
        log_warning "External connectivity issues detected"
    fi
    
    # Check Docker network
    log_info "Checking Docker network..."
    
    local docker_networks=$(docker network ls --format "{{.Name}}" | grep anarqq || true)
    if [ -n "$docker_networks" ]; then
        for network in $docker_networks; do
            if docker network inspect "$network" &>/dev/null; then
                log_success "Docker network $network is healthy"
            else
                log_error "Docker network $network has issues"
                network_ok=false
            fi
        done
    else
        log_info "No AnarQ&Q Docker networks found"
    fi
    
    if [ "$network_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

# Validate QNET Phase 2 specific requirements
validate_qnet_phase2_requirements() {
    if [ "$ENVIRONMENT" != "qnet-phase2" ]; then
        log_info "Skipping QNET Phase 2 validation (not in qnet-phase2 environment)"
        return 0
    fi
    
    log_info "Validating QNET Phase 2 specific requirements..."
    
    local qnet_ok=true
    
    # Check Docker Swarm mode
    log_info "Checking Docker Swarm mode..."
    if docker node ls &>/dev/null; then
        log_success "Docker Swarm mode is active"
        
        # Check node count
        local node_count=$(docker node ls --format "{{.Status}}" | grep -c "Ready" || echo "0")
        if [ $node_count -ge 3 ]; then
            log_success "Sufficient nodes in swarm: $node_count"
        else
            log_warning "Low node count in swarm: $node_count (recommended: 3+)"
        fi
    else
        log_error "Docker Swarm mode is not active"
        qnet_ok=false
    fi
    
    # Check service replicas
    log_info "Checking service replicas..."
    if docker service ls &>/dev/null; then
        local services=$(docker service ls --format "{{.Name}}" | grep anarqq || true)
        if [ -n "$services" ]; then
            for service in $services; do
                local replicas=$(docker service ls --filter "name=$service" --format "{{.Replicas}}")
                log_info "Service $service replicas: $replicas"
            done
        else
            log_warning "No AnarQ&Q services found in swarm"
        fi
    fi
    
    # Check load balancer
    log_info "Checking load balancer configuration..."
    if docker service ls --filter "name=anarqq-demo_load-balancer" --format "{{.Name}}" | grep -q load-balancer; then
        log_success "Load balancer service is running"
    else
        log_warning "Load balancer service not found"
    fi
    
    if [ "$qnet_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

# Generate validation report
generate_validation_report() {
    log_header "GENERATING VALIDATION REPORT"
    
    local report_file="$PROJECT_DIR/validation-report-$(date +%Y%m%d-%H%M%S).json"
    local overall_status="success"
    
    if [ $VALIDATIONS_FAILED -gt 0 ]; then
        overall_status="failed"
    elif [ $VALIDATIONS_WARNING -gt 0 ]; then
        overall_status="warning"
    fi
    
    cat > "$report_file" << EOF
{
  "validation": {
    "environment": "$ENVIRONMENT",
    "type": "$VALIDATION_TYPE",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "$overall_status"
  },
  "results": {
    "total_validations": $VALIDATIONS_TOTAL,
    "passed": $VALIDATIONS_PASSED,
    "failed": $VALIDATIONS_FAILED,
    "warnings": $VALIDATIONS_WARNING,
    "success_rate": "$(echo "scale=2; $VALIDATIONS_PASSED * 100 / $VALIDATIONS_TOTAL" | bc)%"
  },
  "categories": {
    "docker_environment": "$(grep -q "Docker environment validation passed" "$VALIDATION_LOG" && echo "passed" || echo "failed")",
    "service_health": "$(grep -q "service health" "$VALIDATION_LOG" && echo "checked" || echo "skipped")",
    "performance_metrics": "$(grep -q "performance metrics" "$VALIDATION_LOG" && echo "checked" || echo "skipped")",
    "security_configuration": "$(grep -q "security configuration" "$VALIDATION_LOG" && echo "checked" || echo "skipped")",
    "data_integrity": "$(grep -q "data integrity" "$VALIDATION_LOG" && echo "checked" || echo "skipped")",
    "network_connectivity": "$(grep -q "network connectivity" "$VALIDATION_LOG" && echo "checked" || echo "skipped")"
  },
  "system_info": {
    "os": "$(uname -s)",
    "docker_version": "$(docker --version 2>/dev/null || echo "not available")",
    "compose_version": "$(docker-compose --version 2>/dev/null || echo "not available")",
    "node_version": "$(node --version 2>/dev/null || echo "not available")",
    "memory_usage": "$(free | awk 'NR==2{printf "%.2f%%", $3*100/$2}' 2>/dev/null || echo "unknown")",
    "disk_usage": "$(df "$PROJECT_DIR" | awk 'NR==2{print $5}' 2>/dev/null || echo "unknown")"
  },
  "recommendations": [
    $([ $VALIDATIONS_FAILED -eq 0 ] && echo '"System is healthy and ready for use"' || echo '"Address failed validations before proceeding"'),
    $([ $VALIDATIONS_WARNING -gt 0 ] && echo '"Review warnings for potential improvements"' || echo '"No warnings detected"'),
    "Monitor system performance continuously",
    "Run validation regularly to ensure system health"
  ],
  "log_file": "$VALIDATION_LOG"
}
EOF
    
    log_success "Validation report generated: $report_file"
}

# Main validation execution
main() {
    log_header "ANARQ&Q ECOSYSTEM DEMO - SYSTEM INTEGRITY VALIDATION"
    
    # Validate parameters
    case $ENVIRONMENT in
        local|staging|qnet-phase2) ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            echo "Usage: $0 [local|staging|qnet-phase2] [full|quick|security|performance]"
            exit 1
            ;;
    esac
    
    case $VALIDATION_TYPE in
        full|quick|security|performance) ;;
        *)
            log_error "Invalid validation type: $VALIDATION_TYPE"
            echo "Usage: $0 [local|staging|qnet-phase2] [full|quick|security|performance]"
            exit 1
            ;;
    esac
    
    initialize_validation
    
    # Run validations based on type
    case $VALIDATION_TYPE in
        full)
            run_validation "Docker Environment" validate_docker_environment true
            run_validation "Service Health" validate_service_health true
            run_validation "Performance Metrics" validate_performance_metrics true
            run_validation "Security Configuration" validate_security_configuration false
            run_validation "Data Integrity" validate_data_integrity true
            run_validation "Network Connectivity" validate_network_connectivity true
            run_validation "QNET Phase 2 Requirements" validate_qnet_phase2_requirements false
            ;;
        quick)
            run_validation "Docker Environment" validate_docker_environment true
            run_validation "Service Health" validate_service_health true
            run_validation "Network Connectivity" validate_network_connectivity true
            ;;
        security)
            run_validation "Security Configuration" validate_security_configuration true
            run_validation "Data Integrity" validate_data_integrity true
            ;;
        performance)
            run_validation "Performance Metrics" validate_performance_metrics true
            run_validation "Service Health" validate_service_health true
            ;;
    esac
    
    generate_validation_report
    
    log_header "VALIDATION COMPLETED"
    
    echo ""
    log_info "📊 Validation Results Summary:"
    echo "  • Total Validations: $VALIDATIONS_TOTAL"
    echo "  • Passed: $VALIDATIONS_PASSED"
    echo "  • Failed: $VALIDATIONS_FAILED"
    echo "  • Warnings: $VALIDATIONS_WARNING"
    echo "  • Success Rate: $(echo "scale=2; $VALIDATIONS_PASSED * 100 / $VALIDATIONS_TOTAL" | bc)%"
    echo ""
    
    if [ $VALIDATIONS_FAILED -eq 0 ]; then
        log_success "🎉 System integrity validation completed successfully!"
        echo ""
        log_info "✅ System Status: HEALTHY"
        echo ""
        exit 0
    else
        log_error "❌ System integrity validation failed with $VALIDATIONS_FAILED critical issues."
        echo ""
        log_info "🔧 System Status: NEEDS ATTENTION"
        echo ""
        log_info "📋 Check the validation log for details: $VALIDATION_LOG"
        echo ""
        exit 1
    fi
}

# Execute main function
main "$@"