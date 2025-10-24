# #################### ANDROID Build Scripts ########################################
cd /Users/armenasatryan/Desktop/marketplace/mobile

# Prebuild the Android project (if not already done)
npx expo prebuild --platform android

# Build the APK
cd android
./gradlew assembleRelease

# Or for debug build (easier, no signing required)
./gradlew assembleDebug

# ###############################################################################