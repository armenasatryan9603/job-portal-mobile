#!/bin/bash

# iOS Clean Script (Preserves Podfile)
# This script cleans iOS build artifacts while keeping your Podfile configuration

set -e  # Exit on any error

echo "🧹 iOS Clean Script (Preserves Podfile)"
echo "======================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "app.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if iOS folder exists
if [ ! -d "ios" ]; then
    echo "❌ Error: iOS folder not found. Run 'npx expo run:ios' first."
    exit 1
fi

echo "🗑️  Cleaning iOS build artifacts..."

# Clean build folder
if [ -d "ios/build" ]; then
    rm -rf ios/build
    echo "✅ Removed ios/build"
fi

# Clean Pods folder
if [ -d "ios/Pods" ]; then
    rm -rf ios/Pods
    echo "✅ Removed ios/Pods"
fi

# Remove Podfile.lock
if [ -f "ios/Podfile.lock" ]; then
    rm ios/Podfile.lock
    echo "✅ Removed ios/Podfile.lock"
fi

# Clean derived data (optional)
if [ -d "~/Library/Developer/Xcode/DerivedData" ]; then
    echo "🧹 Cleaning Xcode derived data..."
    rm -rf ~/Library/Developer/Xcode/DerivedData
    echo "✅ Cleaned Xcode derived data"
fi

# Reinstall pods
echo "📦 Reinstalling CocoaPods dependencies..."
cd ios
pod install
cd ..

echo "🎉 iOS clean complete!"
echo ""
echo "📋 Summary:"
echo "  ✅ Build artifacts removed"
echo "  ✅ Podfile preserved"
echo "  ✅ CocoaPods dependencies reinstalled"
echo ""
echo "🚀 You can now run: npx expo run:ios"
