#!/bin/bash

# iOS Regeneration Script with Firebase Headers Preservation
# This script safely regenerates the iOS folder while preserving Firebase configuration

set -e  # Exit on any error

echo "🔄 iOS Regeneration Script with Firebase Headers Preservation"
echo "=============================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "app.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Backup current Podfile if it exists
if [ -f "ios/Podfile" ]; then
    echo "📋 Backing up current Podfile..."
    cp ios/Podfile ios/Podfile.backup
    echo "✅ Podfile backed up to ios/Podfile.backup"
fi

# Remove iOS folder
if [ -d "ios" ]; then
    echo "🗑️  Removing iOS folder..."
    rm -rf ios
    echo "✅ iOS folder removed"
fi

# Regenerate iOS folder
echo "🔄 Regenerating iOS folder..."
npx expo run:ios --no-build

# Check if iOS folder was created
if [ ! -d "ios" ]; then
    echo "❌ Error: iOS folder was not created"
    exit 1
fi

echo "✅ iOS folder regenerated"

# Add Firebase headers back to Podfile
echo "🔧 Adding Firebase headers to new Podfile..."

# Create a temporary file with the Firebase headers
cat > /tmp/firebase_headers.txt << 'EOF'
  
  # Firebase specific modular headers
  pod 'GoogleUtilities', :modular_headers => true
  pod 'FirebaseCoreInternal', :modular_headers => true
EOF

# Find the line number where we need to insert (after use_modular_headers!)
insert_line=$(grep -n "use_modular_headers!" ios/Podfile | cut -d: -f1)
if [ -z "$insert_line" ]; then
    echo "❌ Error: Could not find 'use_modular_headers!' in Podfile"
    exit 1
fi

# Insert the Firebase headers after use_modular_headers!
sed -i.bak "${insert_line}r /tmp/firebase_headers.txt" ios/Podfile

# Clean up temporary file
rm /tmp/firebase_headers.txt

echo "✅ Firebase headers added to Podfile"

# Install pods
echo "📦 Installing CocoaPods dependencies..."
cd ios
pod install
cd ..

echo "🎉 iOS regeneration complete!"
echo ""
echo "📋 Summary:"
echo "  ✅ iOS folder regenerated"
echo "  ✅ Firebase headers preserved"
echo "  ✅ CocoaPods dependencies installed"
echo ""
echo "🚀 You can now run: npx expo run:ios"
