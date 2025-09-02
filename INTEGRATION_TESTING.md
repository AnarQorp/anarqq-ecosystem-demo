# Integration Testing Guide

This document provides comprehensive guidance for running the integration tests implemented for Task 13 of the AnarQ&Q Ecosystem Demo.

## Overview

The integration testing suite consists of three main test categories that validate the complete system integration, performance, and production readiness:

### Task 13.1: End-to-End Integration Testing
- **File**: `src/__tests__/EndToEndIntegration.test.ts`
- **Requirements**: 1.1, 2.1, 4.1
- **Purpose**: Execute complete system integration tests across all modules, validate Q∞ data flow integrity, and test Pi Network integration

### Task 13.2: Performance and Scalability Testing
- **File**: `src/__tests__/PerformanceAndScalability.test.ts`
- **Requirements**: 7.2, 7.3, 7.4, 7.6
- **Purpose**: Run performance tests with validation gate requirements and test QNET Phase 2 scaling

### Task 13.3: Production Readiness Validation
- **File**: `src/__tests__/ProductionReadiness.test.ts`
- **Requirements**: 6.4, 5.1, 6.6
- **Purpose**: Execute comprehensive production readiness validation and test deployment automation

## Running Integration Tests

### Prerequisites

1. **Environment Setup**:
   ```bash
   cd demo-orchestrator
   npm install
   ```

2. **Build the Project**:
   ```bash
   npm run build
   ```

3. **Environment Variables**:
   Ensure you have the necessary environment variables configured for:
   - QNET Phase 2 connectivity
   - Pi Network integration (testnet)
   - IPFS node access
   - Database connections

### Running All Integration Tests

To run the complete integration test suite:

```bash
npm run test:integration
```

This will execute all three test suites sequentially and provide a comprehensive report.

### Running Individual Test Suites

#### Task 13.1: End-to-End Integration
```bash
npm run test:integration:13.1
```

#### Task 13.2: Performance and Scalability
```bash
npm run test:integration:13.2
```

#### Task 13.3: Production Readiness
```bash
npm run test:integration:13.3
```

### Running Specific Test Files

You can also run individual test files directly:

```bash
# End-to-End Integration Tests
npm test EndToEndIntegration.test.ts

# Performance and Scalability Tests
npm test PerformanceAndScalability.test.ts

# Production Readiness Tests
npm test ProductionReadiness.test.ts

# Comprehensive Integration Runner
npm test ComprehensiveIntegrationRunner.test.ts
```

## Test Categories and Coverage

### End-to-End Integration Tests

#### Complete System Integration
- ✅ All 14 core modules integration (sQuid, Qlock, Qonsent, Qindex, Qerberos, Qwallet, Qflow, QNET, Qdrive, QpiC, Qmarket, Qmail, Qchat, Qsocial)
- ✅ Module health checks and status validation
- ✅ Clear data flow visualization between components
- ✅ Error handling and fallback options for module failures

#### Q∞ Data Flow Validation
- ✅ Forward flow: data → Qompress → Qlock → Qindex → Qerberos → IPFS
- ✅ Reverse flow: IPFS → Qindex → Qerberos → Qlock → Qompress → user
- ✅ Step-by-step transformation logging and validation
- ✅ Data integrity verification at each checkpoint
- ✅ Error diagnostics and processing halt on failure

#### Pi Network Integration
- ✅ Pi Wallet authentication as primary method
- ✅ Secure Pi identity linking with sQuid integration
- ✅ Smart contract execution through Qflow with Pi Network compatibility
- ✅ Pi transaction processing through integrated Qwallet system
- ✅ Alternative authentication methods when Pi Network is unavailable

#### Real-World Data Scenarios
- ✅ Large binary files through Q∞ pipeline
- ✅ Complex JSON metadata processing
- ✅ Concurrent data processing requests
- ✅ Various file types and sizes validation

### Performance and Scalability Tests

#### Performance Validation Gates
- ✅ Latency requirements (≤2s for P95)
- ✅ Throughput requirements (≥100 RPS)
- ✅ Error rate requirements (≤1%)
- ✅ Availability requirements (≥99%)

#### QNET Phase 2 Scaling
- ✅ Dynamic node provisioning based on CPU threshold (70%)
- ✅ Memory-based scaling (80% threshold)
- ✅ Geographic distribution scaling based on network latency (200ms threshold)
- ✅ Load balancing across scaled nodes
- ✅ Automatic failover during node failures

#### Decentralization Validation
- ✅ Minimum node count requirement (≥5 nodes)
- ✅ Geographic distribution requirements (≥3 regions)
- ✅ Network partition tolerance testing
- ✅ No single points of failure validation
- ✅ Consensus mechanism validation under load

#### Distributed Node Operation
- ✅ Distributed storage across nodes
- ✅ Distributed computation validation
- ✅ Network resilience during node churn

### Production Readiness Tests

#### Comprehensive Production Readiness
- ✅ All demo scenarios execution in production environment
- ✅ Production-grade error handling and recovery
- ✅ Production monitoring and alerting validation
- ✅ Production security measures validation

#### Chaos Engineering During DAO Flows
- ✅ DAO functionality maintenance when killing QNET nodes during voting
- ✅ Network partition handling during DAO proposal creation
- ✅ Data consistency during Byzantine node behavior
- ✅ Resource exhaustion resilience during DAO execution

#### Bilingual Documentation Validation
- ✅ English documentation completeness and accuracy
- ✅ Spanish documentation completeness and accuracy
- ✅ Documentation synchronization between languages
- ✅ Visual diagrams and code examples accuracy

#### Deployment Automation and Rollback
- ✅ Deployment automation across all environments (local, staging, qnet-phase2)
- ✅ Rollback procedures for deployment failures
- ✅ Blue-green deployment strategy testing
- ✅ Disaster recovery procedures validation
- ✅ Deployment security and compliance validation

## Performance Benchmarks

### Validation Gates
The tests validate against these performance requirements:

| Metric | Requirement | Test Coverage |
|--------|-------------|---------------|
| Latency (P95) | ≤ 2000ms | ✅ Validated |
| Throughput | ≥ 100 RPS | ✅ Validated |
| Error Rate | ≤ 1% | ✅ Validated |
| Availability | ≥ 99% | ✅ Validated |
| Node Count | ≥ 5 nodes | ✅ Validated |
| Geographic Distribution | ≥ 3 regions | ✅ Validated |
| Single Points of Failure | 0 | ✅ Validated |

### QNET Phase 2 Scaling Thresholds
| Resource | Threshold | Action |
|----------|-----------|--------|
| CPU | 70% | Provision additional compute nodes |
| Memory | 80% | Scale memory-intensive services |
| Network Latency | 200ms | Add geographically distributed nodes |

## Test Environment Configuration

### Local Environment
- Docker-based module simulation
- Local IPFS node
- Simulated Pi Network integration
- In-memory databases for testing

### Staging Environment
- Distributed module deployment
- Shared IPFS cluster
- Pi Network testnet integration
- Staging databases and services

### QNET Phase 2 Environment
- Production-like distributed network
- External node participation
- Pi Network mainnet integration (with testnet fallback)
- Production-grade infrastructure

## Troubleshooting

### Common Issues

#### Test Timeouts
If tests are timing out, increase the timeout values in `vitest.config.ts`:
```typescript
test: {
  timeout: 600000, // 10 minutes
  testTimeout: 600000,
  hookTimeout: 120000
}
```

#### Module Connection Failures
Ensure all required services are running:
- IPFS node
- Database connections
- QNET Phase 2 nodes
- Pi Network connectivity

#### Performance Test Failures
Performance tests may fail if system resources are constrained:
- Ensure adequate CPU and memory
- Close unnecessary applications
- Run tests on dedicated hardware for accurate results

#### Network Partition Tests
Network partition tests require elevated privileges:
```bash
sudo npm run test:integration:13.2
```

### Environment Variables

Required environment variables for full test execution:

```bash
# QNET Phase 2 Configuration
QNET_PHASE2_ENDPOINT=wss://qnet-phase2.example.com
QNET_PHASE2_API_KEY=your_api_key

# Pi Network Integration
PI_NETWORK_API_URL=https://api.minepi.com
PI_NETWORK_API_KEY=your_pi_api_key
PI_NETWORK_TESTNET=true

# IPFS Configuration
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/anarqq_test
REDIS_URL=redis://localhost:6379

# Test Configuration
TEST_ENVIRONMENT=integration
LOG_LEVEL=debug
```

## Continuous Integration

### GitHub Actions Integration

The integration tests can be integrated into CI/CD pipelines:

```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run test:integration
        env:
          CI: true
          AUTOMATED: true
```

### Test Reports

Integration test reports are automatically generated in the `test-results/` directory:
- JSON format: `integration-test-report-{timestamp}.json`
- HTML format: Available through vitest coverage reports
- Console output: Detailed execution logs

## Contributing

When adding new integration tests:

1. Follow the existing test structure and naming conventions
2. Ensure tests are deterministic and can run in any order
3. Add appropriate timeout values for long-running tests
4. Include comprehensive error handling and cleanup
5. Update this documentation with new test coverage

## Support

For issues with integration tests:
1. Check the troubleshooting section above
2. Review test logs in the `test-results/` directory
3. Ensure all prerequisites are met
4. Contact the development team with specific error messages

---

**Note**: These integration tests are designed to validate the complete AnarQ&Q ecosystem. They require significant system resources and network connectivity. For development purposes, consider running individual test suites rather than the complete suite.