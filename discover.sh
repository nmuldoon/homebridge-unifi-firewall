#!/bin/bash

# UniFi 9 Policy Discovery Script
# This script helps you discover UniFi 9 policies for configuration

echo "🔍 UniFi 9 Policy Discovery Tool"
echo "================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if the discovery script exists
if [ ! -f "src/discover-policies.ts" ]; then
    echo "❌ src/discover-policies.ts not found. Make sure you're in the project directory."
    exit 1
fi

echo "📋 Usage Examples:"
echo ""
echo "1. Using command line arguments:"
echo "   npm run build && node dist/discover-policies.js https://192.168.1.1 admin password default"
echo ""
echo "2. Using environment variables:"
echo "   export UNIFI_URL=https://192.168.1.1"
echo "   export UNIFI_USERNAME=admin"
echo "   export UNIFI_PASSWORD=password"
echo "   export UNIFI_SITE=default"
echo "   npm run build && node dist/discover-policies.js"
echo ""

# Build the project first
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix any compilation errors."
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""

# Prompt for UniFi Controller details
read -p "Enter UniFi Controller URL (e.g., https://192.168.1.1): " UNIFI_URL
read -p "Enter username: " UNIFI_USERNAME
read -s -p "Enter password: " UNIFI_PASSWORD
echo ""
read -p "Enter site name (default: default): " UNIFI_SITE

# Set default site if empty
if [ -z "$UNIFI_SITE" ]; then
    UNIFI_SITE="default"
fi

echo ""
echo "🚀 Discovering policies..."
echo ""

# Run the discovery script
node dist/discover-policies.js "$UNIFI_URL" "$UNIFI_USERNAME" "$UNIFI_PASSWORD" "$UNIFI_SITE"
