# Firebase Setup Guide

## ⚠️ IMPORTANT: Replace Placeholder Files

**The current config files contain placeholder values and will cause errors. You MUST replace them with real Firebase project credentials.**

## Current Status

✅ Firebase configuration files created  
✅ Firebase initialization added to app  
✅ `firebase.json` created  
⚠️ **PLACEHOLDER FILES - Replace with real Firebase credentials**

## Required Steps

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or use existing project
3. Follow the setup wizard

### 2. Add iOS App to Firebase

1. In Firebase Console, click "Add app" → iOS
2. Enter bundle ID: `com.jobportalmobile.app`
3. Download `GoogleService-Info.plist`
4. **Replace** `ios/GoogleService-Info.plist` with the downloaded file

### 3. Add Android App to Firebase

1. In Firebase Console, click "Add app" → Android
2. Enter package name: `com.jobportalmobile.app`
3. Download `google-services.json`
4. **Replace** `android/app/google-services.json` with the downloaded file

### 4. Enable Required Services

In Firebase Console, enable:

- **Authentication** (for user management)
- **Cloud Messaging** (for push notifications)
- **Firestore** (if you plan to use it)

### 5. Test the Setup

After replacing the config files:

```bash
# Clean and rebuild
./scripts/clean-ios.sh
npx expo run:ios
```

## Current Configuration Files

### iOS: `ios/GoogleService-Info.plist`

- ⚠️ **Contains placeholder values**
- Must be replaced with actual file from Firebase Console
- Current values: `AIzaSyDummyKeyReplaceWithRealKey`, etc.

### Android: `android/app/google-services.json`

- ⚠️ **Contains placeholder values**
- Must be replaced with actual file from Firebase Console
- Current values: `AIzaSyDummyKeyReplaceWithRealKey`, etc.

### App: `config/firebase.ts`

- Firebase initialization code
- Already configured and imported in app

### New: `firebase.json`

- React Native Firebase configuration
- Optimizes Android task execution

## Troubleshooting

### Error: "Missing or invalid FirebaseOptions property 'apikey'"

- **This means you're still using placeholder config files**
- Replace `ios/GoogleService-Info.plist` and `android/app/google-services.json` with real files from Firebase Console

### Error: "No default app '[DEFAULT]' has been created"

- Make sure you've replaced the placeholder config files
- Verify the bundle ID/package name matches your Firebase project
- Check that Firebase services are enabled in the console

### Build Errors

- Run `./scripts/clean-ios.sh` to clean build artifacts
- Ensure Firebase headers are in Podfile (they should be preserved by the script)

## Next Steps After Setup

1. **Replace placeholder config files with real ones** (CRITICAL)
2. Test push notifications
3. Configure authentication if needed
4. Set up Firestore if you plan to use it
