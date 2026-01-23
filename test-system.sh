#!/bin/bash

# AURORA System Integration Test Script
# Tests all major endpoints and functionality

set -e

echo "🧪 AURORA System Integration Tests"
echo "=================================="
echo ""

API_URL="http://localhost:3001"
USER_ID="user_default"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

test_passed=0
test_failed=0

# Helper function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4

    echo -n "Testing $name... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$API_URL$endpoint")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((test_passed++))
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        echo ""
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        ((test_failed++))
        echo "$body"
        echo ""
        return 1
    fi
}

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# 1. Test Health Endpoint
echo "1️⃣  Health Check Tests"
echo "-------------------"
test_endpoint "API Health" "GET" "/health"

# 2. Test IPS Endpoints
echo "2️⃣  IPS Management Tests"
echo "---------------------"
test_endpoint "Get IPS Policy" "GET" "/api/ips?userId=$USER_ID"
test_endpoint "Get Active IPS Version" "GET" "/api/ips/active?userId=$USER_ID"

# 3. Test Portfolio Endpoints
echo "3️⃣  Portfolio Tests"
echo "----------------"
test_endpoint "List Portfolios" "GET" "/api/portfolios?userId=$USER_ID"

# Create a test portfolio
PORTFOLIO_DATA='{"userId":"'$USER_ID'","name":"Test Portfolio","type":"PAPER"}'
if test_endpoint "Create Portfolio" "POST" "/api/portfolios" "$PORTFOLIO_DATA"; then
    PORTFOLIO_ID=$(curl -s -X POST -H "Content-Type: application/json" -d "$PORTFOLIO_DATA" "$API_URL/api/portfolios" | jq -r '.id')

    if [ -n "$PORTFOLIO_ID" ] && [ "$PORTFOLIO_ID" != "null" ]; then
        test_endpoint "Get Portfolio Details" "GET" "/api/portfolios/$PORTFOLIO_ID"
        test_endpoint "Get Portfolio Snapshots" "GET" "/api/portfolios/$PORTFOLIO_ID/snapshots"
        test_endpoint "Create Snapshot" "POST" "/api/portfolios/$PORTFOLIO_ID/snapshots" "{}"
    fi
fi

# 4. Test Instruments Endpoints
echo "4️⃣  Instruments Tests"
echo "------------------"
test_endpoint "List Instruments" "GET" "/api/instruments?limit=10"
test_endpoint "Search Instruments" "GET" "/api/instruments/search?q=ETF"

# 5. Test Alerts Endpoints
echo "5️⃣  Alerts Tests"
echo "-------------"
test_endpoint "List Alerts" "GET" "/api/alerts?userId=$USER_ID"

# 6. Test Engine Endpoints
echo "6️⃣  Engine Tests"
echo "-------------"
test_endpoint "List Engine Runs" "GET" "/api/engine/runs?userId=$USER_ID"

# Enqueue a test run
RUN_DATA='{"userId":"'$USER_ID'","type":"scoring"}'
if test_endpoint "Enqueue Scoring Run" "POST" "/api/engine/run" "$RUN_DATA"; then
    RUN_ID=$(curl -s -X POST -H "Content-Type: application/json" -d "$RUN_DATA" "$API_URL/api/engine/run" | jq -r '.id')

    if [ -n "$RUN_ID" ] && [ "$RUN_ID" != "null" ]; then
        echo "⏳ Waiting 5 seconds for job to process..."
        sleep 5
        test_endpoint "Get Run Status" "GET" "/api/engine/runs/$RUN_ID"
    fi
fi

# Summary
echo ""
echo "=================================="
echo "📊 Test Summary"
echo "=================================="
echo -e "Passed: ${GREEN}$test_passed${NC}"
echo -e "Failed: ${RED}$test_failed${NC}"
echo ""

if [ $test_failed -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
