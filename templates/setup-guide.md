# {{t:title}}

Version: {{version}} | Last Updated: {{lastUpdated}}

## {{t:overview}}

This guide provides comprehensive instructions for setting up and running the AnarQ&Q ecosystem demonstration platform. The demo showcases the complete integration of all 14 core modules in a fully decentralized environment.

## {{t:prerequisites}}

Before starting the setup process, ensure you have the following prerequisites installed and configured:

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended), macOS 10.15+, or Windows 10+ with WSL2
- **Memory**: Minimum 8GB RAM, 16GB recommended for full demo scenarios
- **Storage**: At least 20GB free disk space
- **Network**: Stable internet connection for QNET Phase 2 integration

### Required Software

- **Docker**: Version 20.10+ with Docker Compose v2
- **Node.js**: Version 18+ with npm or yarn
- **Git**: Latest version for repository management
- **Pi Network Wallet**: For Pi Network integration scenarios

### Optional Tools

- **Visual Studio Code**: Recommended IDE with TypeScript support
- **Postman**: For API testing and validation
- **IPFS Desktop**: For local IPFS node management

## {{t:installation}}

### 1. Clone the Repository

```bash
git clone https://github.com/AnarQorp/anarq-ecosystem-demo.git
cd anarq-ecosystem-demo
```

### 2. Install Dependencies

```bash
# Install demo orchestrator dependencies
cd demo-orchestrator
npm install

# Return to root directory
cd ..
```

### 3. Environment Configuration

```bash
# Copy environment template
cp demo-orchestrator/.env.example demo-orchestrator/.env

# Edit configuration file
nano demo-orchestrator/.env
```

### 4. Docker Setup

```bash
# Build all services
docker-compose build

# Start core services
docker-compose up -d
```

## {{t:configuration}}

### Environment Variables

Configure the following environment variables in `demo-orchestrator/.env`:

```env
# Environment Configuration
NODE_ENV=development
DEMO_ENVIRONMENT=local

# QNET Phase 2 Configuration
QNET_PHASE2_ENABLED=true
QNET_MIN_NODES=3
QNET_SCALING_CPU_THRESHOLD=70
QNET_SCALING_MEMORY_THRESHOLD=80

# Pi Network Configuration
PI_NETWORK_ENABLED=true
PI_NETWORK_TESTNET=true
PI_WALLET_API_KEY=your_pi_wallet_api_key

# IPFS Configuration
IPFS_GATEWAY=http://localhost:8080
IPFS_API=http://localhost:5001

# Performance Thresholds
MAX_LATENCY_MS=2000
MIN_THROUGHPUT_RPS=100
MAX_ERROR_RATE=0.01
```

### Module Configuration

Each module can be individually configured through the module registry:

```bash
# Configure module endpoints
npm run configure:modules

# Verify module health
npm run health:check
```

## {{t:verification}}

### 1. System Health Check

```bash
# Run comprehensive health check
npm run demo:health

# Expected output: All modules should show "healthy" status
```

### 2. Basic Functionality Test

```bash
# Run basic integration test
npm run demo:test:basic

# This will verify:
# - Module connectivity
# - Q∞ data flow pipeline
# - IPFS integration
# - Basic Pi Network connectivity
```

### 3. Performance Validation

```bash
# Run performance validation
npm run demo:validate:performance

# Validates:
# - Latency < 2 seconds
# - Throughput > 100 RPS
# - Error rate < 1%
```

## {{t:troubleshooting}}

### Common Issues

#### Docker Services Not Starting

**Problem**: Services fail to start with port conflicts

**Solution**:
```bash
# Check for port conflicts
netstat -tulpn | grep :8080

# Stop conflicting services
sudo systemctl stop apache2  # or nginx

# Restart demo services
docker-compose restart
```

#### Module Health Check Failures

**Problem**: One or more modules show "unhealthy" status

**Solution**:
```bash
# Check module logs
docker-compose logs [module-name]

# Restart specific module
docker-compose restart [module-name]

# Verify module configuration
npm run config:verify [module-name]
```

#### Pi Network Connection Issues

**Problem**: Pi Network integration fails

**Solution**:
1. Verify Pi Wallet API key in `.env` file
2. Check Pi Network testnet status
3. Ensure firewall allows outbound connections
4. Test with Pi Network sandbox mode:
   ```bash
   export PI_NETWORK_SANDBOX=true
   npm run demo:test:pi
   ```

#### IPFS Connectivity Problems

**Problem**: IPFS operations timeout or fail

**Solution**:
```bash
# Check IPFS daemon status
ipfs id

# Restart IPFS daemon
ipfs daemon --enable-gc

# Test IPFS connectivity
ipfs swarm peers
```

### Performance Issues

#### High Latency

If latency exceeds 2 seconds:

1. Check system resources: `htop` or `docker stats`
2. Verify network connectivity: `ping gateway.ipfs.io`
3. Scale QNET nodes: `npm run qnet:scale:up`
4. Enable performance monitoring: `npm run monitor:enable`

#### Low Throughput

If throughput falls below 100 RPS:

1. Increase Docker resource limits
2. Enable horizontal scaling
3. Check for bottlenecks in module communication
4. Optimize database connections

### Getting Help

If you encounter issues not covered in this guide:

1. Check the [troubleshooting documentation](./troubleshooting.md)
2. Review module-specific logs in `logs/` directory
3. Join the AnarQ&Q developer community
4. Submit an issue on the GitHub repository

## {{t:next_steps}}

After successful setup and verification:

1. **Explore Demo Scenarios**: Run the identity, content, DAO, and social flow scenarios
2. **Review Documentation**: Read the workflow documentation for detailed scenario explanations
3. **Pi Network Integration**: Configure Pi Network integration for production use
4. **Performance Tuning**: Optimize configuration for your specific environment
5. **Development**: Start building custom scenarios and integrations

### Quick Start Commands

```bash
# Run identity flow scenario
npm run demo:scenario:identity

# Run content flow scenario
npm run demo:scenario:content

# Run DAO governance scenario
npm run demo:scenario:dao

# Run social governance scenario
npm run demo:scenario:social

# Run all scenarios
npm run demo:scenario:all
```

### Additional Resources

- [Workflow Documentation](./workflow-guide.md)
- [Pi Network Integration Guide](../pi/integration-guide.md)
- [API Reference](./api-reference.md)
- [Performance Tuning Guide](./performance-tuning.md)
- [Security Best Practices](./security-guide.md)

---

For the latest updates and community support, visit the [AnarQ&Q Ecosystem Demo Repository](https://github.com/AnarQorp/anarq-ecosystem-demo).