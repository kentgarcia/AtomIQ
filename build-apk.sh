#!/bin/bash
# Quick script to build APK with environment variables

echo "Ì∫Ä AtomIQ APK Builder"
echo "===================="
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "‚ùå EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if logged in
echo "Ì≥ù Checking EAS login status..."
if ! eas whoami &> /dev/null; then
    echo "Please login to EAS:"
    eas login
fi

echo ""
echo "Ì¥ê Pushing environment secrets to EAS..."
eas secret:push --scope project --env-file .env.local --force

echo ""
echo "Ì≥¶ Starting APK build..."
echo "Choose build profile:"
echo "  1) Preview (for testing)"
echo "  2) Production (for release)"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo "Building preview APK..."
    eas build --platform android --profile preview
elif [ "$choice" = "2" ]; then
    echo "Building production APK..."
    eas build --platform android --profile production
else
    echo "Invalid choice. Building preview by default..."
    eas build --platform android --profile preview
fi

echo ""
echo "‚úÖ Build started! You can monitor progress at:"
echo "   https://expo.dev/accounts/kentgarcia/projects/AtomIQ/builds"
