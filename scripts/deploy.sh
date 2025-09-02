#!/bin/bash

# AnarQ&Q Ecosystem Demo Orchestrator Deployment Script

set -e

echo "🚀 Starting AnarQ&Q Ecosystem Demo Orchestrator deployment..."

# Configuration
ENVIRONMENT=${1:-local}
COMPOSE_FILE="docker-compose.yml"

# Validate environment
case $ENVIRONMENT in
  local|staging|qnet-phase2)
    echo "✓ Deploying to $ENVIRONMENT environment"
    ;;
  *)
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "Usage: $0 [local|staging|qnet-phase2]"
    exit 1
    ;;
esac

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

echo "✓ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

# Validate configuration
echo "🔧 Validating configuration..."
node test-basic.mjs

# Set environment variables based on deployment target
echo "⚙️  Setting up environment for $ENVIRONMENT..."

case $ENVIRONMENT in
  local)
    export DEMO_ENVIRONMENT=local
    export QNET_PHASE2_ENABLED=false
    export PI_NETWORK_TESTNET=true
    ;;
  staging)
    export DEMO_ENVIRONMENT=staging
    export QNET_PHASE2_ENABLED=true
    export PI_NETWORK_TESTNET=true
    ;;
  qnet-phase2)
    export DEMO_ENVIRONMENT=qnet-phase2
    export QNET_PHASE2_ENABLED=true
    export PI_NETWORK_TESTNET=false
    ;;
esac

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans || true

# Build and start containers
echo "🐳 Building and starting containers..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Health check
echo "🏥 Performing health checks..."
if docker-compose ps | grep -q "Up"; then
    echo "✓ Services are running"
else
    echo "❌ Some services failed to start"
    docker-compose logs
    exit 1
fi

# Validate IPFS connectivity
echo "🔗 Validating IPFS connectivity..."
if curl -f http://localhost:8080/ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn > /dev/null 2>&1; then
    echo "✓ IPFS is accessible"
else
    echo "⚠️  IPFS connectivity check failed (this may be normal for first startup)"
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🔗 Service URLs:"
echo "  - Demo Orchestrator: http://localhost:3000"
echo "  - IPFS Gateway: http://localhost:8080"
echo "  - IPFS API: http://localhost:5001"
echo ""
echo "📝 To view logs: docker-compose logs -f"
echo "🛑 To stop services: docker-compose down"
echo ""