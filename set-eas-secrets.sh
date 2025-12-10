#!/bin/bash

# This script sets up EAS secrets from your .env.local file
# Run this script once to configure your environment variables for EAS builds

echo "Setting up EAS secrets for AtomIQ..."

# Read values from .env.local
source .env.local

# Set EAS secrets (these will be encrypted and stored in EAS)
echo "Setting Supabase secrets..."
eas secret:push --scope project --env-file .env.local --force

echo ""
echo "✅ EAS secrets have been set!"
echo ""
echo "Now you can build your APK with:"
echo "  Preview build:    eas build --platform android --profile preview"
echo "  Production build: eas build --platform android --profile production"
