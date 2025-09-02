#!/bin/bash

# AnarQ&Q Ecosystem Demo - Environment Configuration Script
# Configures environment-specific settings and optimizations

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${1:-local}
CONFIG_TYPE=${2:-standard}  # standard, performance, security

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

# Configure local environment
configure_local_environment() {
    log_header "CONFIGURING LOCAL ENVIRONMENT"
    
    # Create local configuration directory
    mkdir -p "$PROJECT_DIR/config/local"
    
    # Configure Docker settings for local development
    cat > "$PROJECT_DIR/config/local/docker-settings.json" << EOF
{
  "development": {
    "hot_reload": true,
    "debug_mode": true,
    "log_level": "debug",
    "resource_limits": {
      "memory": "512m",
      "cpu": "0.5"
    }
  },
  "services": {
    "demo_orchestrator": {
      "replicas": 1,
      "restart_policy": "unless-stopped"
    },
    "ipfs": {
      "profile": "server",
      "storage_max": "10GB"
    },
    "qerberos": {
      "encryption_level": "standard",
      "audit_enabled": true
    }
  }
}
EOF
    
    # Configure local networking
    cat > "$PROJECT_DIR/config/local/network.conf" << EOF
# Local Network Configuration
NETWORK_NAME=anarqq-local-network
NETWORK_DRIVER=bridge
ENABLE_IPV6=false
SUBNET=172.20.0.0/16
GATEWAY=172.20.0.1

# Port Mappings
DEMO_ORCHESTRATOR_PORT=3000
IPFS_API_PORT=5001
IPFS_GATEWAY_PORT=8080
QERBEROS_PORT=3001
QWALLET_PORT=3002
REDIS_PORT=6379
EOF
    
    # Configure development tools
    cat > "$PROJECT_DIR/config/local/dev-tools.json" << EOF
{
  "hot_reload": {
    "enabled": true,
    "watch_paths": ["src/**/*.ts", "src/**/*.js"],
    "ignore_paths": ["node_modules", "dist", "logs"]
  },
  "debugging": {
    "enabled": true,
    "debug_port": 9229,
    "source_maps": true
  },
  "testing": {
    "auto_run": false,
    "coverage": true,
    "watch_mode": true
  }
}
EOF
    
    log_success "Local environment configured"
}

# Configure staging environment
configure_staging_environment() {
    log_header "CONFIGURING STAGING ENVIRONMENT"
    
    # Create staging configuration directory
    mkdir -p "$PROJECT_DIR/config/staging"
    
    # Configure Docker Swarm settings
    cat > "$PROJECT_DIR/config/staging/swarm-config.json" << EOF
{
  "swarm": {
    "mode": "manager",
    "advertise_addr": "0.0.0.0:2377",
    "listen_addr": "0.0.0.0:2377"
  },
  "services": {
    "demo_orchestrator": {
      "replicas": 2,
      "placement": {
        "constraints": ["node.role == worker"]
      },
      "resources": {
        "limits": {
          "cpus": "0.5",
          "memory": "512M"
        },
        "reservations": {
          "cpus": "0.25",
          "memory": "256M"
        }
      }
    },
    "qnet_node": {
      "replicas": 3,
      "placement": {
        "preferences": [{"spread": "node.labels.zone"}]
      }
    }
  }
}
EOF
    
    # Configure monitoring
    cat > "$PROJECT_DIR/config/staging/monitoring.yml" << EOF
# Prometheus Configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'demo-orchestrator'
    static_configs:
      - targets: ['demo-orchestrator:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'qerberos'
    static_configs:
      - targets: ['qerberos-service:3001']
    metrics_path: '/metrics'

  - job_name: 'qwallet'
    static_configs:
      - targets: ['qwallet-service:3002']
    metrics_path: '/metrics'

  - job_name: 'ipfs'
    static_configs:
      - targets: ['ipfs-cluster:5001']
    metrics_path: '/debug/metrics/prometheus'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
EOF
    
    # Configure alert rules
    cat > "$PROJECT_DIR/config/staging/alert_rules.yml" << EOF
groups:
  - name: anarqq_demo_alerts
    rules:
      - alert: HighLatency
        expr: http_request_duration_seconds{quantile="0.95"} > 1.5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "95th percentile latency is above 1.5 seconds"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 1%"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} is down"
EOF
    
    # Configure load balancing
    cat > "$PROJECT_DIR/config/staging/nginx.conf" << EOF
upstream demo_orchestrator {
    least_conn;
    server demo-orchestrator-1:3000 max_fails=3 fail_timeout=30s;
    server demo-orchestrator-2:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name staging.anarqq.demo;

    location / {
        proxy_pass http://demo_orchestrator;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Health check
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }

    location /health {
        access_log off;
        proxy_pass http://demo_orchestrator/health;
    }
}
EOF
    
    log_success "Staging environment configured"
}

# Configure QNET Phase 2 environment
configure_qnet_phase2_environment() {
    log_header "CONFIGURING QNET PHASE 2 ENVIRONMENT"
    
    # Create production configuration directory
    mkdir -p "$PROJECT_DIR/config/qnet-phase2"
    
    # Configure high availability settings
    cat > "$PROJECT_DIR/config/qnet-phase2/ha-config.json" << EOF
{
  "high_availability": {
    "enabled": true,
    "replication_factor": 3,
    "min_healthy_replicas": 2,
    "auto_failover": true,
    "health_check_interval": "10s"
  },
  "scaling": {
    "auto_scaling": true,
    "min_replicas": 3,
    "max_replicas": 10,
    "cpu_threshold": 70,
    "memory_threshold": 80,
    "scale_up_cooldown": "5m",
    "scale_down_cooldown": "10m"
  },
  "load_balancing": {
    "algorithm": "least_conn",
    "health_check": {
      "path": "/health",
      "interval": "5s",
      "timeout": "3s",
      "retries": 3
    }
  }
}
EOF
    
    # Configure security settings
    cat > "$PROJECT_DIR/config/qnet-phase2/security.json" << EOF
{
  "encryption": {
    "level": "maximum",
    "algorithms": ["AES-256-GCM", "ChaCha20-Poly1305"],
    "key_rotation_interval": "24h"
  },
  "authentication": {
    "multi_factor": true,
    "session_timeout": "1h",
    "max_failed_attempts": 3,
    "lockout_duration": "15m"
  },
  "network_security": {
    "tls_version": "1.3",
    "cipher_suites": ["TLS_AES_256_GCM_SHA384", "TLS_CHACHA20_POLY1305_SHA256"],
    "hsts_enabled": true,
    "certificate_pinning": true
  },
  "audit": {
    "enabled": true,
    "log_level": "detailed",
    "retention_period": "90d",
    "integrity_checks": true
  }
}
EOF
    
    # Configure QNET Phase 2 specific settings
    cat > "$PROJECT_DIR/config/qnet-phase2/qnet-config.json" << EOF
{
  "qnet_phase2": {
    "consensus": {
      "algorithm": "pbft",
      "byzantine_fault_tolerance": true,
      "min_validators": 5,
      "max_validators": 100,
      "block_time": "3s",
      "finality_time": "15s"
    },
    "network": {
      "p2p_port": 4000,
      "rpc_port": 4001,
      "metrics_port": 4002,
      "max_peers": 50,
      "discovery_enabled": true
    },
    "storage": {
      "backend": "distributed",
      "replication_factor": 5,
      "consistency_level": "strong",
      "compression": "lz4"
    },
    "performance": {
      "max_tps": 1000,
      "target_latency": "100ms",
      "batch_size": 100,
      "cache_size": "1GB"
    }
  }
}
EOF
    
    # Configure production monitoring
    cat > "$PROJECT_DIR/config/qnet-phase2/monitoring-production.yml" << EOF
# Production Prometheus Configuration
global:
  scrape_interval: 10s
  evaluation_interval: 10s
  external_labels:
    cluster: 'qnet-phase2'
    environment: 'production'

rule_files:
  - "production_alert_rules.yml"

scrape_configs:
  - job_name: 'demo-orchestrator-cluster'
    dns_sd_configs:
      - names: ['demo-orchestrator.anarqq-demo']
        type: 'A'
        port: 3000
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'qnet-validators'
    dns_sd_configs:
      - names: ['qnet-validator.anarqq-demo']
        type: 'A'
        port: 4002
    metrics_path: '/metrics'

  - job_name: 'qerberos-cluster'
    dns_sd_configs:
      - names: ['qerberos-cluster.anarqq-demo']
        type: 'A'
        port: 3001
    metrics_path: '/metrics'

  - job_name: 'system-metrics'
    static_configs:
      - targets: ['node-exporter:9100']

alerting:
  alertmanagers:
    - dns_sd_configs:
        - names: ['alertmanager.anarqq-demo']
          type: 'A'
          port: 9093

remote_write:
  - url: "https://prometheus-remote.anarqq.com/api/v1/write"
    basic_auth:
      username: "anarqq-demo"
      password_file: "/etc/prometheus/remote_write_password"
EOF
    
    # Configure production alert rules
    cat > "$PROJECT_DIR/config/qnet-phase2/production_alert_rules.yml" << EOF
groups:
  - name: critical_alerts
    rules:
      - alert: ServiceCriticalDown
        expr: up == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Critical service is down"
          description: "{{ $labels.instance }} has been down for more than 30 seconds"

      - alert: HighLatencyCritical
        expr: http_request_duration_seconds{quantile="0.95"} > 1.0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Critical latency threshold exceeded"
          description: "95th percentile latency is above 1 second"

      - alert: HighErrorRateCritical
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.001
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Critical error rate exceeded"
          description: "Error rate is above 0.1%"

  - name: performance_alerts
    rules:
      - alert: QNETConsensusDelay
        expr: qnet_consensus_time_seconds > 15
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "QNET consensus taking too long"
          description: "Consensus time is above 15 seconds"

      - alert: ValidatorOffline
        expr: qnet_validator_online == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "QNET validator offline"
          description: "Validator {{ $labels.validator_id }} is offline"

  - name: security_alerts
    rules:
      - alert: UnauthorizedAccess
        expr: increase(http_requests_total{status="401"}[5m]) > 10
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Multiple unauthorized access attempts"
          description: "More than 10 unauthorized access attempts in 5 minutes"

      - alert: AuditLogFailure
        expr: qerberos_audit_log_errors > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Audit log failure detected"
          description: "Qerberos audit logging is failing"
EOF
    
    log_success "QNET Phase 2 environment configured"
}

# Configure performance optimizations
configure_performance_optimizations() {
    log_header "CONFIGURING PERFORMANCE OPTIMIZATIONS"
    
    case $ENVIRONMENT in
        local)
            # Local performance settings
            cat > "$PROJECT_DIR/config/local/performance.json" << EOF
{
  "optimization_level": "development",
  "caching": {
    "enabled": true,
    "ttl": "5m",
    "max_size": "100MB"
  },
  "compression": {
    "enabled": false,
    "level": 1
  },
  "connection_pooling": {
    "max_connections": 10,
    "idle_timeout": "30s"
  }
}
EOF
            ;;
        staging)
            # Staging performance settings
            cat > "$PROJECT_DIR/config/staging/performance.json" << EOF
{
  "optimization_level": "balanced",
  "caching": {
    "enabled": true,
    "ttl": "15m",
    "max_size": "500MB",
    "distributed": true
  },
  "compression": {
    "enabled": true,
    "level": 6,
    "algorithms": ["gzip", "brotli"]
  },
  "connection_pooling": {
    "max_connections": 50,
    "idle_timeout": "60s",
    "keepalive": true
  },
  "load_balancing": {
    "algorithm": "round_robin",
    "health_checks": true
  }
}
EOF
            ;;
        qnet-phase2)
            # Production performance settings
            cat > "$PROJECT_DIR/config/qnet-phase2/performance.json" << EOF
{
  "optimization_level": "maximum",
  "caching": {
    "enabled": true,
    "ttl": "1h",
    "max_size": "2GB",
    "distributed": true,
    "redis_cluster": true
  },
  "compression": {
    "enabled": true,
    "level": 9,
    "algorithms": ["brotli", "zstd", "gzip"]
  },
  "connection_pooling": {
    "max_connections": 200,
    "idle_timeout": "300s",
    "keepalive": true,
    "tcp_nodelay": true
  },
  "load_balancing": {
    "algorithm": "least_conn",
    "health_checks": true,
    "sticky_sessions": false
  },
  "database": {
    "connection_pool_size": 100,
    "query_cache": true,
    "prepared_statements": true
  }
}
EOF
            ;;
    esac
    
    log_success "Performance optimizations configured"
}

# Configure security settings
configure_security_settings() {
    log_header "CONFIGURING SECURITY SETTINGS"
    
    case $ENVIRONMENT in
        local)
            # Local security settings (relaxed for development)
            cat > "$PROJECT_DIR/config/local/security.json" << EOF
{
  "security_level": "development",
  "authentication": {
    "required": true,
    "method": "basic",
    "session_timeout": "24h"
  },
  "encryption": {
    "level": "standard",
    "tls_required": false
  },
  "cors": {
    "enabled": true,
    "origins": ["*"],
    "methods": ["GET", "POST", "PUT", "DELETE"]
  },
  "rate_limiting": {
    "enabled": false
  }
}
EOF
            ;;
        staging)
            # Staging security settings
            cat > "$PROJECT_DIR/config/staging/security.json" << EOF
{
  "security_level": "enhanced",
  "authentication": {
    "required": true,
    "method": "jwt",
    "session_timeout": "8h",
    "refresh_token": true
  },
  "encryption": {
    "level": "high",
    "tls_required": true,
    "tls_version": "1.2+"
  },
  "cors": {
    "enabled": true,
    "origins": ["https://staging.anarqq.demo"],
    "methods": ["GET", "POST", "PUT", "DELETE"],
    "credentials": true
  },
  "rate_limiting": {
    "enabled": true,
    "requests_per_minute": 100,
    "burst": 20
  },
  "headers": {
    "hsts": true,
    "csp": "default-src 'self'",
    "x_frame_options": "DENY"
  }
}
EOF
            ;;
        qnet-phase2)
            # Production security settings (maximum security)
            cat > "$PROJECT_DIR/config/qnet-phase2/security.json" << EOF
{
  "security_level": "maximum",
  "authentication": {
    "required": true,
    "method": "oauth2",
    "multi_factor": true,
    "session_timeout": "1h",
    "refresh_token": true,
    "token_rotation": true
  },
  "encryption": {
    "level": "maximum",
    "tls_required": true,
    "tls_version": "1.3",
    "cipher_suites": ["TLS_AES_256_GCM_SHA384"],
    "certificate_pinning": true
  },
  "cors": {
    "enabled": true,
    "origins": ["https://demo.anarqq.com"],
    "methods": ["GET", "POST"],
    "credentials": true,
    "max_age": 86400
  },
  "rate_limiting": {
    "enabled": true,
    "requests_per_minute": 60,
    "burst": 10,
    "ip_whitelist": [],
    "ddos_protection": true
  },
  "headers": {
    "hsts": true,
    "hsts_max_age": 31536000,
    "csp": "default-src 'self'; script-src 'self' 'unsafe-inline'",
    "x_frame_options": "DENY",
    "x_content_type_options": "nosniff",
    "referrer_policy": "strict-origin-when-cross-origin"
  },
  "audit": {
    "log_all_requests": true,
    "log_sensitive_data": false,
    "retention_days": 90
  }
}
EOF
            ;;
    esac
    
    log_success "Security settings configured"
}

# Generate configuration summary
generate_configuration_summary() {
    log_header "GENERATING CONFIGURATION SUMMARY"
    
    local summary_file="$PROJECT_DIR/config/configuration-summary-$ENVIRONMENT.json"
    
    cat > "$summary_file" << EOF
{
  "configuration": {
    "environment": "$ENVIRONMENT",
    "config_type": "$CONFIG_TYPE",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "version": "$(cat $PROJECT_DIR/package.json | grep version | cut -d'"' -f4)"
  },
  "files_created": [
    "config/$ENVIRONMENT/docker-settings.json",
    "config/$ENVIRONMENT/network.conf",
    "config/$ENVIRONMENT/performance.json",
    "config/$ENVIRONMENT/security.json"
  ],
  "optimizations": {
    "performance": "$([ "$CONFIG_TYPE" = "performance" ] && echo "enabled" || echo "standard")",
    "security": "$([ "$CONFIG_TYPE" = "security" ] && echo "enhanced" || echo "standard")",
    "monitoring": "$([ "$ENVIRONMENT" != "local" ] && echo "enabled" || echo "disabled")"
  },
  "next_steps": [
    "Review configuration files in config/$ENVIRONMENT/",
    "Run deployment with: ./scripts/setup-environment.sh $ENVIRONMENT",
    "Validate configuration with: ./scripts/validate-configuration.sh $ENVIRONMENT"
  ]
}
EOF
    
    log_success "Configuration summary generated: $summary_file"
}

# Main execution
main() {
    log_header "ANARQ&Q ECOSYSTEM DEMO - ENVIRONMENT CONFIGURATION"
    
    # Validate parameters
    case $ENVIRONMENT in
        local|staging|qnet-phase2) ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            echo "Usage: $0 [local|staging|qnet-phase2] [standard|performance|security]"
            exit 1
            ;;
    esac
    
    case $CONFIG_TYPE in
        standard|performance|security) ;;
        *)
            log_error "Invalid configuration type: $CONFIG_TYPE"
            echo "Usage: $0 [local|staging|qnet-phase2] [standard|performance|security]"
            exit 1
            ;;
    esac
    
    # Create base configuration directory
    mkdir -p "$PROJECT_DIR/config"
    
    # Configure based on environment
    case $ENVIRONMENT in
        local)
            configure_local_environment
            ;;
        staging)
            configure_staging_environment
            ;;
        qnet-phase2)
            configure_qnet_phase2_environment
            ;;
    esac
    
    # Apply optimizations based on config type
    case $CONFIG_TYPE in
        performance|standard)
            configure_performance_optimizations
            ;;
    esac
    
    case $CONFIG_TYPE in
        security|standard)
            configure_security_settings
            ;;
    esac
    
    generate_configuration_summary
    
    log_header "CONFIGURATION COMPLETED"
    
    echo ""
    log_success "🎉 Environment configuration completed successfully!"
    echo ""
    log_info "📊 Configuration Summary:"
    echo "  • Environment: $ENVIRONMENT"
    echo "  • Type: $CONFIG_TYPE"
    echo "  • Files: config/$ENVIRONMENT/"
    echo ""
    log_info "📝 Next Steps:"
    echo "  1. Review configuration files"
    echo "  2. Run: ./scripts/setup-environment.sh $ENVIRONMENT"
    echo "  3. Validate: ./scripts/validate-configuration.sh $ENVIRONMENT"
    echo ""
}

# Execute main function
main "$@"