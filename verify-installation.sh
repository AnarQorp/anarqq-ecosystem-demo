#!/bin/bash

# AnarQ&Q Ecosystem Demo - Installation Verification Script
# Verifies that the installation was completed successfully
# Version: 1.0.0
# Author: AnarQorp Team

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="$HOME/anarqq-ecosystem"
DEMO_DIR="$INSTALL_DIR/demo"
CORE_DIR="$INSTALL_DIR/core"
LOG_FILE="$INSTALL_DIR/verification.log"

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Functions
print_banner() {
    clear
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║            🔍 AnarQ&Q Installation Verification               ║"
    echo "║                                                               ║"
    echo "║              Verificador de Instalación                      ║"
    echo "║                     Versión 1.0.0                            ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

log_message() {
    local message="$1"
    local level="${2:-INFO}"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

print_test() {
    local test_name="$1"
    echo -e "${CYAN}🧪 Testing: $test_name${NC}"
    ((TESTS_TOTAL++))
}

print_pass() {
    local message="$1"
    echo -e "${GREEN}✅ PASS: $message${NC}"
    log_message "PASS: $message" "SUCCESS"
    ((TESTS_PASSED++))
}

print_fail() {
    local message="$1"
    echo -e "${RED}❌ FAIL: $message${NC}"
    log_message "FAIL: $message" "ERROR"
    ((TESTS_FAILED++))
}

print_info() {
    local message="$1"
    echo -e "${BLUE}ℹ️  $message${NC}"
    log_message "$message" "INFO"
}

print_warning() {
    local message="$1"
    echo -e "${YELLOW}⚠️  $message${NC}"
    log_message "$message" "WARNING"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

test_system_requirements() {
    echo -e "${BLUE}=== System Requirements Tests ===${NC}"
    echo ""
    
    # Test Node.js
    print_test "Node.js availability"
    if command_exists node; then
        local node_version=$(node --version)
        print_pass "Node.js found: $node_version"
    else
        print_fail "Node.js not found"
    fi
    
    # Test npm
    print_test "npm availability"
    if command_exists npm; then
        local npm_version=$(npm --version)
        print_pass "npm found: v$npm_version"
    else
        print_fail "npm not found"
    fi
    
    # Test Git
    print_test "Git availability"
    if command_exists git; then
        local git_version=$(git --version | cut -d' ' -f3)
        print_pass "Git found: v$git_version"
    else
        print_warning "Git not found (not critical if ZIP was used)"
    fi
    
    # Test Docker (optional)
    print_test "Docker availability (optional)"
    if command_exists docker; then
        local docker_version=$(docker --version | cut -d' ' -f3 | sed 's/,//')
        print_pass "Docker found: v$docker_version"
    else
        print_info "Docker not found (optional)"
    fi
    
    echo ""
}

test_installation_structure() {
    echo -e "${BLUE}=== Installation Structure Tests ===${NC}"
    echo ""
    
    # Test main installation directory
    print_test "Main installation directory"
    if [ -d "$INSTALL_DIR" ]; then
        print_pass "Installation directory exists: $INSTALL_DIR"
    else
        print_fail "Installation directory not found: $INSTALL_DIR"
        return 1
    fi
    
    # Test demo directory
    print_test "Demo directory"
    if [ -d "$DEMO_DIR" ]; then
        print_pass "Demo directory exists: $DEMO_DIR"
    else
        print_fail "Demo directory not found: $DEMO_DIR"
    fi
    
    # Test core directory (optional)
    print_test "Core directory (optional)"
    if [ -d "$CORE_DIR" ] && [ "$(ls -A "$CORE_DIR")" ]; then
        print_pass "Core directory exists and is not empty: $CORE_DIR"
    else
        print_info "Core directory not found or empty (optional)"
    fi
    
    # Test log file
    print_test "Installation log file"
    if [ -f "$INSTALL_DIR/install.log" ]; then
        print_pass "Installation log exists"
    else
        print_warning "Installation log not found"
    fi
    
    echo ""
}

test_demo_files() {
    echo -e "${BLUE}=== Demo Files Tests ===${NC}"
    echo ""
    
    if [ ! -d "$DEMO_DIR" ]; then
        print_fail "Demo directory not found, skipping file tests"
        return 1
    fi
    
    cd "$DEMO_DIR"
    
    # Test package.json
    print_test "package.json file"
    if [ -f "package.json" ]; then
        print_pass "package.json exists"
    else
        print_fail "package.json not found"
    fi
    
    # Test node_modules
    print_test "Node modules installation"
    if [ -d "node_modules" ] && [ "$(ls -A node_modules)" ]; then
        print_pass "node_modules directory exists and is not empty"
    else
        print_fail "node_modules directory not found or empty"
    fi
    
    # Test environment file
    print_test "Environment configuration"
    if [ -f ".env" ]; then
        print_pass ".env file exists"
    elif [ -f ".env.example" ]; then
        print_warning ".env file not found, but .env.example exists"
    else
        print_warning "No environment files found"
    fi
    
    # Test build directory (if exists)
    print_test "Build output (optional)"
    if [ -d "dist" ] || [ -d "build" ] || [ -d ".next" ]; then
        print_pass "Build output directory found"
    else
        print_info "No build output directory found (may not be built yet)"
    fi
    
    echo ""
}

test_launcher_scripts() {
    echo -e "${BLUE}=== Launcher Scripts Tests ===${NC}"
    echo ""
    
    # Test start script
    print_test "Start demo script"
    if [ -f "$INSTALL_DIR/start-demo.sh" ] && [ -x "$INSTALL_DIR/start-demo.sh" ]; then
        print_pass "start-demo.sh exists and is executable"
    else
        print_fail "start-demo.sh not found or not executable"
    fi
    
    # Test stop script
    print_test "Stop services script"
    if [ -f "$INSTALL_DIR/stop-services.sh" ] && [ -x "$INSTALL_DIR/stop-services.sh" ]; then
        print_pass "stop-services.sh exists and is executable"
    else
        print_fail "stop-services.sh not found or not executable"
    fi
    
    # Test update script
    print_test "Update demo script"
    if [ -f "$INSTALL_DIR/update-demo.sh" ] && [ -x "$INSTALL_DIR/update-demo.sh" ]; then
        print_pass "update-demo.sh exists and is executable"
    else
        print_warning "update-demo.sh not found or not executable"
    fi
    
    echo ""
}

test_npm_functionality() {
    echo -e "${BLUE}=== NPM Functionality Tests ===${NC}"
    echo ""
    
    if [ ! -d "$DEMO_DIR" ]; then
        print_fail "Demo directory not found, skipping npm tests"
        return 1
    fi
    
    cd "$DEMO_DIR"
    
    # Test npm scripts
    print_test "NPM scripts availability"
    if [ -f "package.json" ]; then
        local scripts=$(npm run 2>/dev/null | grep -E "^  [a-zA-Z]" | wc -l)
        if [ "$scripts" -gt 0 ]; then
            print_pass "NPM scripts found ($scripts scripts available)"
        else
            print_warning "No NPM scripts found"
        fi
    else
        print_fail "package.json not found"
    fi
    
    # Test npm install (dry run)
    print_test "NPM dependencies check"
    if npm list --depth=0 >/dev/null 2>&1; then
        print_pass "All NPM dependencies are properly installed"
    else
        print_warning "Some NPM dependencies may be missing or have issues"
    fi
    
    echo ""
}

test_build_capability() {
    echo -e "${BLUE}=== Build Capability Tests ===${NC}"
    echo ""
    
    if [ ! -d "$DEMO_DIR" ]; then
        print_fail "Demo directory not found, skipping build tests"
        return 1
    fi
    
    cd "$DEMO_DIR"
    
    # Test build script existence
    print_test "Build script availability"
    if npm run build --dry-run >/dev/null 2>&1; then
        print_pass "Build script is available"
        
        # Test actual build (optional, can be slow)
        read -p "Do you want to test the build process? This may take a few minutes (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_test "Build process execution"
            if npm run build >/dev/null 2>&1; then
                print_pass "Build completed successfully"
            else
                print_fail "Build failed"
            fi
        else
            print_info "Build test skipped by user"
        fi
    else
        print_warning "Build script not available or not configured"
    fi
    
    echo ""
}

test_port_availability() {
    echo -e "${BLUE}=== Port Availability Tests ===${NC}"
    echo ""
    
    # Common development ports
    local ports=(3000 3001 8000 8080 5000 5173)
    
    for port in "${ports[@]}"; do
        print_test "Port $port availability"
        if ! lsof -i :$port >/dev/null 2>&1; then
            print_pass "Port $port is available"
        else
            print_warning "Port $port is in use"
        fi
    done
    
    echo ""
}

show_summary() {
    echo -e "${PURPLE}=== Verification Summary ===${NC}"
    echo ""
    echo -e "${BLUE}Total Tests: $TESTS_TOTAL${NC}"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo -e "${YELLOW}Success Rate: $(( TESTS_PASSED * 100 / TESTS_TOTAL ))%${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! Your installation appears to be working correctly.${NC}"
        echo ""
        echo -e "${CYAN}Next steps:${NC}"
        echo "1. Start the demo: $INSTALL_DIR/start-demo.sh"
        echo "2. Open your browser to the displayed URL"
        echo "3. Explore the AnarQ&Q ecosystem features"
    elif [ $TESTS_FAILED -lt 3 ]; then
        echo -e "${YELLOW}⚠️  Some tests failed, but the installation might still work.${NC}"
        echo -e "${YELLOW}Check the failed tests above and consider fixing them.${NC}"
    else
        echo -e "${RED}❌ Multiple tests failed. The installation may have issues.${NC}"
        echo -e "${RED}Please review the installation process or contact support.${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Log file: $LOG_FILE${NC}"
    echo -e "${BLUE}Support: anarqorp@proton.me${NC}"
    echo ""
}

# Main execution
main() {
    print_banner
    
    # Create log file
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "Verification started at $(date)" > "$LOG_FILE"
    
    print_info "Starting AnarQ&Q installation verification..."
    print_info "Installation directory: $INSTALL_DIR"
    echo ""
    
    # Run all tests
    test_system_requirements
    test_installation_structure
    test_demo_files
    test_launcher_scripts
    test_npm_functionality
    test_build_capability
    test_port_availability
    
    # Show summary
    show_summary
    
    # Return appropriate exit code
    if [ $TESTS_FAILED -eq 0 ]; then
        return 0
    elif [ $TESTS_FAILED -lt 3 ]; then
        return 1
    else
        return 2
    fi
}

# Run main function
main "$@"