#!/bin/bash

# AnarQ&Q Ecosystem Demo - Continuous Monitoring Script
# Real-time monitoring with performance tracking and alerting

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${1:-local}
MONITORING_INTERVAL=${2:-30}  # seconds
ALERT_THRESHOLD_LATENCY=${3:-2000}  # milliseconds
ALERT_THRESHOLD_ERROR_RATE=${4:-0.01}  # 1%

# Monitoring state
MONITORING_LOG="$PROJECT_DIR/logs/monitoring-$(date +%Y%m%d-%H%M%S).log"
METRICS_FILE="$PROJECT_DIR/logs/metrics-$(date +%Y%m%d-%H%M%S).json"
ALERT_LOG="$PROJECT_DIR/logs/alerts-$(date +%Y%m%d-%H%M%S).log"
PID_FILE="$PROJECT_DIR/logs/monitoring.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Monitoring flags
MONITORING_ACTIVE=true
ALERT_COOLDOWN=300  # 5 minutes
LAST_ALERT_TIME=0

# Logging functions
log_info() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1"
    echo -e "${BLUE}$msg${NC}"
    echo "$msg" >> "$MONITORING_LOG"
}

log_success() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1"
    echo -e "${GREEN}$msg${NC}"
    echo "$msg" >> "$MONITORING_LOG"
}

log_warning() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $1"
    echo -e "${YELLOW}$msg${NC}"
    echo "$msg" >> "$MONITORING_LOG"
}

log_error() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1"
    echo -e "${RED}$msg${NC}"
    echo "$msg" >> "$MONITORING_LOG"
}

log_alert() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [ALERT] $1"
    echo -e "${RED}🚨 $msg${NC}"
    echo "$msg" >> "$MONITORING_LOG"
    echo "$msg" >> "$ALERT_LOG"
}

log_header() {
    echo ""
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║$(printf "%62s" "$1")║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Signal handlers
cleanup() {
    log_info "Shutting down monitoring..."
    MONITORING_ACTIVE=false
    rm -f "$PID_FILE"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Initialize monitoring
initialize_monitoring() {
    log_header "INITIALIZING CONTINUOUS MONITORING"
    
    # Create necessary directories
    mkdir -p "$PROJECT_DIR/logs"
    
    # Check if monitoring is already running
    if [ -f "$PID_FILE" ]; then
        local existing_pid=$(cat "$PID_FILE")
        if kill -0 "$existing_pid" 2>/dev/null; then
            log_error "Monitoring is already running (PID: $existing_pid)"
            exit 1
        else
            log_warning "Removing stale PID file"
            rm -f "$PID_FILE"
        fi
    fi
    
    # Save current PID
    echo $$ > "$PID_FILE"
    
    # Initialize log files
    echo "Continuous Monitoring Started" > "$MONITORING_LOG"
    echo "Environment: $ENVIRONMENT" >> "$MONITORING_LOG"
    echo "Interval: ${MONITORING_INTERVAL}s" >> "$MONITORING_LOG"
    echo "Started: $(date)" >> "$MONITORING_LOG"
    echo "========================================" >> "$MONITORING_LOG"
    
    # Initialize metrics file
    echo '{"monitoring_session": {"started": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "metrics": []}}' > "$METRICS_FILE"
    
    log_info "Monitoring initialized"
    log_info "Environment: $ENVIRONMENT"
    log_info "Interval: ${MONITORING_INTERVAL} seconds"
    log_info "PID: $$"
    log_info "Logs: $MONITORING_LOG"
    log_info "Metrics: $METRICS_FILE"
}

# Collect system metrics
collect_system_metrics() {
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    
    # Memory usage
    local memory_info=$(free -m)
    local memory_total=$(echo "$memory_info" | awk 'NR==2{print $2}')
    local memory_used=$(echo "$memory_info" | awk 'NR==2{print $3}')
    local memory_percentage=$(echo "scale=2; $memory_used * 100 / $memory_total" | bc)
    
    # Disk usage
    local disk_usage=$(df "$PROJECT_DIR" | awk 'NR==2{print $5}' | sed 's/%//')
    
    # Load average
    local load_average=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    
    echo "{
        \"timestamp\": \"$timestamp\",
        \"system\": {
            \"cpu_usage\": \"$cpu_usage\",
            \"memory_percentage\": $memory_percentage,
            \"memory_used_mb\": $memory_used,
            \"memory_total_mb\": $memory_total,
            \"disk_usage_percentage\": $disk_usage,
            \"load_average\": $load_average
        }
    }"
}

# Collect service metrics
collect_service_metrics() {
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Demo Orchestrator metrics
    local demo_status="unknown"
    local demo_latency=0
    local demo_response_code=0
    
    local start_time=$(date +%s%N)
    if response=$(curl -s -w "%{http_code}" --connect-timeout 5 http://localhost:3000/health 2>/dev/null); then
        local end_time=$(date +%s%N)
        demo_latency=$(( (end_time - start_time) / 1000000 ))
        demo_response_code=$(echo "$response" | tail -c 4)
        
        if [ "$demo_response_code" = "200" ]; then
            demo_status="healthy"
        else
            demo_status="unhealthy"
        fi
    else
        demo_status="unreachable"
    fi
    
    # IPFS metrics
    local ipfs_status="unknown"
    local ipfs_peers=0
    
    if ipfs_info=$(curl -s --connect-timeout 5 http://localhost:5001/api/v0/swarm/peers 2>/dev/null); then
        ipfs_status="healthy"
        ipfs_peers=$(echo "$ipfs_info" | jq '.Peers | length' 2>/dev/null || echo "0")
    else
        ipfs_status="unreachable"
    fi
    
    # Qerberos metrics
    local qerberos_status="unknown"
    local qerberos_latency=0
    
    local start_time=$(date +%s%N)
    if curl -s --connect-timeout 5 http://localhost:3001/health &>/dev/null; then
        local end_time=$(date +%s%N)
        qerberos_latency=$(( (end_time - start_time) / 1000000 ))
        qerberos_status="healthy"
    else
        qerberos_status="unreachable"
    fi
    
    # Qwallet metrics
    local qwallet_status="unknown"
    local qwallet_latency=0
    
    local start_time=$(date +%s%N)
    if curl -s --connect-timeout 5 http://localhost:3002/health &>/dev/null; then
        local end_time=$(date +%s%N)
        qwallet_latency=$(( (end_time - start_time) / 1000000 ))
        qwallet_status="healthy"
    else
        qwallet_status="unreachable"
    fi
    
    # Docker container metrics
    local container_count=0
    local running_containers=0
    
    if docker ps &>/dev/null; then
        container_count=$(docker ps -a | grep -c anarqq || echo "0")
        running_containers=$(docker ps | grep -c anarqq || echo "0")
    fi
    
    echo "{
        \"timestamp\": \"$timestamp\",
        \"services\": {
            \"demo_orchestrator\": {
                \"status\": \"$demo_status\",
                \"latency_ms\": $demo_latency,
                \"response_code\": $demo_response_code
            },
            \"ipfs\": {
                \"status\": \"$ipfs_status\",
                \"peers\": $ipfs_peers
            },
            \"qerberos\": {
                \"status\": \"$qerberos_status\",
                \"latency_ms\": $qerberos_latency
            },
            \"qwallet\": {
                \"status\": \"$qwallet_status\",
                \"latency_ms\": $qwallet_latency
            }
        },
        \"containers\": {
            \"total\": $container_count,
            \"running\": $running_containers
        }
    }"
}

# Collect performance metrics
collect_performance_metrics() {
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Throughput test
    local successful_requests=0
    local failed_requests=0
    local total_latency=0
    local test_requests=5
    
    for i in $(seq 1 $test_requests); do
        local start_time=$(date +%s%N)
        if curl -s --connect-timeout 2 http://localhost:3000/health &>/dev/null; then
            local end_time=$(date +%s%N)
            local request_latency=$(( (end_time - start_time) / 1000000 ))
            total_latency=$((total_latency + request_latency))
            ((successful_requests++))
        else
            ((failed_requests++))
        fi
    done
    
    local average_latency=0
    if [ $successful_requests -gt 0 ]; then
        average_latency=$((total_latency / successful_requests))
    fi
    
    local error_rate=0
    if [ $test_requests -gt 0 ]; then
        error_rate=$(echo "scale=4; $failed_requests / $test_requests" | bc)
    fi
    
    echo "{
        \"timestamp\": \"$timestamp\",
        \"performance\": {
            \"average_latency_ms\": $average_latency,
            \"successful_requests\": $successful_requests,
            \"failed_requests\": $failed_requests,
            \"error_rate\": $error_rate,
            \"throughput_rps\": $(echo "scale=2; $successful_requests / 5" | bc)
        }
    }"
}

# Check alert conditions
check_alert_conditions() {
    local metrics="$1"
    local current_time=$(date +%s)
    
    # Skip if in cooldown period
    if [ $((current_time - LAST_ALERT_TIME)) -lt $ALERT_COOLDOWN ]; then
        return 0
    fi
    
    # Extract metrics using jq
    local demo_status=$(echo "$metrics" | jq -r '.services.demo_orchestrator.status // "unknown"')
    local demo_latency=$(echo "$metrics" | jq -r '.services.demo_orchestrator.latency_ms // 0')
    local error_rate=$(echo "$metrics" | jq -r '.performance.error_rate // 0')
    local memory_percentage=$(echo "$metrics" | jq -r '.system.memory_percentage // 0')
    local disk_usage=$(echo "$metrics" | jq -r '.system.disk_usage_percentage // 0')
    
    local alerts_triggered=false
    
    # Service down alert
    if [ "$demo_status" != "healthy" ]; then
        log_alert "Demo Orchestrator service is $demo_status"
        alerts_triggered=true
    fi
    
    # High latency alert
    if [ "$demo_latency" -gt "$ALERT_THRESHOLD_LATENCY" ]; then
        log_alert "High latency detected: ${demo_latency}ms > ${ALERT_THRESHOLD_LATENCY}ms"
        alerts_triggered=true
    fi
    
    # High error rate alert
    if (( $(echo "$error_rate > $ALERT_THRESHOLD_ERROR_RATE" | bc -l) )); then
        log_alert "High error rate detected: $error_rate > $ALERT_THRESHOLD_ERROR_RATE"
        alerts_triggered=true
    fi
    
    # High memory usage alert
    if (( $(echo "$memory_percentage > 90" | bc -l) )); then
        log_alert "High memory usage: ${memory_percentage}%"
        alerts_triggered=true
    fi
    
    # High disk usage alert
    if [ "$disk_usage" -gt 90 ]; then
        log_alert "High disk usage: ${disk_usage}%"
        alerts_triggered=true
    fi
    
    if [ "$alerts_triggered" = true ]; then
        LAST_ALERT_TIME=$current_time
    fi
}

# Update metrics file
update_metrics_file() {
    local new_metric="$1"
    
    # Read current metrics file
    local current_metrics=$(cat "$METRICS_FILE")
    
    # Add new metric to the array
    local updated_metrics=$(echo "$current_metrics" | jq ".metrics += [$new_metric]")
    
    # Write back to file
    echo "$updated_metrics" > "$METRICS_FILE"
}

# Display monitoring dashboard
display_dashboard() {
    local metrics="$1"
    
    # Clear screen and show dashboard
    clear
    
    log_header "ANARQ&Q ECOSYSTEM DEMO - MONITORING DASHBOARD"
    
    echo -e "${BLUE}Environment:${NC} $ENVIRONMENT"
    echo -e "${BLUE}Monitoring Interval:${NC} ${MONITORING_INTERVAL}s"
    echo -e "${BLUE}Last Update:${NC} $(date)"
    echo ""
    
    # System metrics
    echo -e "${PURPLE}📊 SYSTEM METRICS${NC}"
    echo "----------------------------------------"
    local cpu_usage=$(echo "$metrics" | jq -r '.system.cpu_usage // "N/A"')
    local memory_percentage=$(echo "$metrics" | jq -r '.system.memory_percentage // 0')
    local disk_usage=$(echo "$metrics" | jq -r '.system.disk_usage_percentage // 0')
    local load_average=$(echo "$metrics" | jq -r '.system.load_average // "N/A"')
    
    echo -e "CPU Usage: ${cpu_usage}"
    echo -e "Memory Usage: ${memory_percentage}%"
    echo -e "Disk Usage: ${disk_usage}%"
    echo -e "Load Average: ${load_average}"
    echo ""
    
    # Service status
    echo -e "${PURPLE}🔧 SERVICE STATUS${NC}"
    echo "----------------------------------------"
    local demo_status=$(echo "$metrics" | jq -r '.services.demo_orchestrator.status // "unknown"')
    local demo_latency=$(echo "$metrics" | jq -r '.services.demo_orchestrator.latency_ms // 0')
    local ipfs_status=$(echo "$metrics" | jq -r '.services.ipfs.status // "unknown"')
    local qerberos_status=$(echo "$metrics" | jq -r '.services.qerberos.status // "unknown"')
    local qwallet_status=$(echo "$metrics" | jq -r '.services.qwallet.status // "unknown"')
    
    # Color code status
    local demo_color=$([[ "$demo_status" == "healthy" ]] && echo "$GREEN" || echo "$RED")
    local ipfs_color=$([[ "$ipfs_status" == "healthy" ]] && echo "$GREEN" || echo "$RED")
    local qerberos_color=$([[ "$qerberos_status" == "healthy" ]] && echo "$GREEN" || echo "$RED")
    local qwallet_color=$([[ "$qwallet_status" == "healthy" ]] && echo "$GREEN" || echo "$RED")
    
    echo -e "Demo Orchestrator: ${demo_color}${demo_status}${NC} (${demo_latency}ms)"
    echo -e "IPFS: ${ipfs_color}${ipfs_status}${NC}"
    echo -e "Qerberos: ${qerberos_color}${qerberos_status}${NC}"
    echo -e "Qwallet: ${qwallet_color}${qwallet_status}${NC}"
    echo ""
    
    # Performance metrics
    echo -e "${PURPLE}⚡ PERFORMANCE METRICS${NC}"
    echo "----------------------------------------"
    local avg_latency=$(echo "$metrics" | jq -r '.performance.average_latency_ms // 0')
    local error_rate=$(echo "$metrics" | jq -r '.performance.error_rate // 0')
    local throughput=$(echo "$metrics" | jq -r '.performance.throughput_rps // 0')
    
    # Color code performance
    local latency_color=$([[ "$avg_latency" -lt "$ALERT_THRESHOLD_LATENCY" ]] && echo "$GREEN" || echo "$RED")
    local error_color=$(echo "$error_rate <= $ALERT_THRESHOLD_ERROR_RATE" | bc -l | grep -q 1 && echo "$GREEN" || echo "$RED")
    
    echo -e "Average Latency: ${latency_color}${avg_latency}ms${NC}"
    echo -e "Error Rate: ${error_color}${error_rate}${NC}"
    echo -e "Throughput: ${throughput} RPS"
    echo ""
    
    # Container status
    echo -e "${PURPLE}🐳 CONTAINER STATUS${NC}"
    echo "----------------------------------------"
    local total_containers=$(echo "$metrics" | jq -r '.containers.total // 0')
    local running_containers=$(echo "$metrics" | jq -r '.containers.running // 0')
    
    echo -e "Total Containers: $total_containers"
    echo -e "Running Containers: $running_containers"
    echo ""
    
    # Controls
    echo -e "${BLUE}📋 CONTROLS${NC}"
    echo "----------------------------------------"
    echo "Press Ctrl+C to stop monitoring"
    echo "Logs: $MONITORING_LOG"
    echo "Metrics: $METRICS_FILE"
    echo ""
}

# Main monitoring loop
monitoring_loop() {
    log_info "Starting monitoring loop..."
    
    while [ "$MONITORING_ACTIVE" = true ]; do
        # Collect all metrics
        local system_metrics=$(collect_system_metrics)
        local service_metrics=$(collect_service_metrics)
        local performance_metrics=$(collect_performance_metrics)
        
        # Combine metrics
        local combined_metrics=$(echo "$system_metrics $service_metrics $performance_metrics" | jq -s 'add')
        
        # Update metrics file
        update_metrics_file "$combined_metrics"
        
        # Check for alerts
        check_alert_conditions "$combined_metrics"
        
        # Display dashboard
        display_dashboard "$combined_metrics"
        
        # Wait for next interval
        sleep "$MONITORING_INTERVAL"
    done
}

# Generate monitoring summary
generate_monitoring_summary() {
    log_header "GENERATING MONITORING SUMMARY"
    
    local summary_file="$PROJECT_DIR/monitoring-summary-$(date +%Y%m%d-%H%M%S).json"
    
    # Calculate summary statistics from metrics file
    local total_metrics=$(jq '.metrics | length' "$METRICS_FILE")
    local avg_latency=$(jq '[.metrics[].performance.average_latency_ms] | add / length' "$METRICS_FILE" 2>/dev/null || echo "0")
    local max_latency=$(jq '[.metrics[].performance.average_latency_ms] | max' "$METRICS_FILE" 2>/dev/null || echo "0")
    local avg_error_rate=$(jq '[.metrics[].performance.error_rate] | add / length' "$METRICS_FILE" 2>/dev/null || echo "0")
    
    cat > "$summary_file" << EOF
{
  "monitoring_summary": {
    "environment": "$ENVIRONMENT",
    "session_started": "$(jq -r '.monitoring_session.started' "$METRICS_FILE")",
    "session_ended": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "total_metrics_collected": $total_metrics,
    "monitoring_interval_seconds": $MONITORING_INTERVAL
  },
  "performance_summary": {
    "average_latency_ms": $avg_latency,
    "maximum_latency_ms": $max_latency,
    "average_error_rate": $avg_error_rate,
    "alert_threshold_latency_ms": $ALERT_THRESHOLD_LATENCY,
    "alert_threshold_error_rate": $ALERT_THRESHOLD_ERROR_RATE
  },
  "files_generated": {
    "monitoring_log": "$MONITORING_LOG",
    "metrics_file": "$METRICS_FILE",
    "alert_log": "$ALERT_LOG",
    "summary_file": "$summary_file"
  },
  "recommendations": [
    "Review alert log for any critical issues",
    "Analyze performance trends in metrics file",
    "Consider adjusting alert thresholds based on observed patterns",
    "Schedule regular monitoring sessions for continuous health checks"
  ]
}
EOF
    
    log_success "Monitoring summary generated: $summary_file"
}

# Main execution
main() {
    log_header "ANARQ&Q ECOSYSTEM DEMO - CONTINUOUS MONITORING"
    
    # Validate parameters
    case $ENVIRONMENT in
        local|staging|qnet-phase2) ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            echo "Usage: $0 [local|staging|qnet-phase2] [interval_seconds] [latency_threshold_ms] [error_rate_threshold]"
            exit 1
            ;;
    esac
    
    # Validate monitoring interval
    if ! [[ "$MONITORING_INTERVAL" =~ ^[0-9]+$ ]] || [ "$MONITORING_INTERVAL" -lt 5 ]; then
        log_error "Invalid monitoring interval: $MONITORING_INTERVAL (minimum: 5 seconds)"
        exit 1
    fi
    
    initialize_monitoring
    
    log_info "🚀 Starting continuous monitoring..."
    log_info "Press Ctrl+C to stop monitoring gracefully"
    echo ""
    
    # Start monitoring loop
    monitoring_loop
    
    # Generate summary on exit
    generate_monitoring_summary
    
    log_success "Monitoring session completed"
}

# Execute main function
main "$@"