# Google Maps Setup Guide

This guide explains how to set up Google Maps API keys for react-native-maps in your Expo project.

## Prerequisites

- Google Cloud Console account
- Expo project with react-native-maps installed

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing for the project (required for Maps API)

## Step 2: Enable Required APIs

Enable the following APIs in your Google Cloud project:

1. **Maps SDK for Android**
2. **Maps SDK for iOS**
3. **Geocoding API** (for address conversion)
4. **Places API** (optional, for enhanced location search)

### How to Enable APIs:

1. In Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for each API and click "Enable"

## Step 3: Create API Keys

### Create Android API Key:

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key
4. Click "Restrict Key" and configure:
   - **Application restrictions**: Android apps
   - **Package name**: `com.jobportalmobile.app`
   - **SHA-1 certificate fingerprint**: Get from your keystore

### Create iOS API Key:

1. Create another API key (or use the same one)
2. Click "Restrict Key" and configure:
   - **Application restrictions**: iOS apps
   - **Bundle identifier**: `com.jobportalmobile.app`

## Step 4: Update app.json

Replace the placeholder API keys in your `app.json`:

```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_ACTUAL_IOS_API_KEY"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ACTUAL_ANDROID_API_KEY"
        }
      }
    }
  }
}
```

## Step 5: Build the App

After adding the API keys, you need to rebuild the app:

```bash
# For iOS
npx expo run:ios

# For Android
npx expo run:android
```

## Step 6: Test the Implementation

The LocationPicker now includes:

- **Manual Address Input** - Type addresses directly
- **Current Location** - Get GPS location
- **Map Selection** - Tap "Show on Map" for interactive map
- **Address Geocoding** - Automatic address resolution

## Usage Example

```tsx
import { LocationPicker } from "@/components/LocationPicker";

const MyComponent = () => {
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const handleLocationSelect = (location) => {
    console.log("Selected location:", location);
    setShowLocationPicker(false);
  };

  return (
    <LocationPicker
      visible={showLocationPicker}
      onClose={() => setShowLocationPicker(false)}
      onLocationSelect={handleLocationSelect}
    />
  );
};
```

## Troubleshooting

### Common Issues:

1. **Map not showing on Android**

   - Verify Android API key is correct
   - Check that Maps SDK for Android is enabled
   - Ensure package name matches in API key restrictions

2. **Map not showing on iOS**

   - Verify iOS API key is correct
   - Check that Maps SDK for iOS is enabled
   - Ensure bundle identifier matches in API key restrictions

3. **API Key errors**
   - Check API key restrictions
   - Verify billing is enabled
   - Check API quotas in Google Cloud Console

### Debug Steps:

1. Check console logs for API key errors
2. Verify network connectivity
3. Test on physical devices (maps work better on real devices)
4. Check Google Cloud Console for API usage and errors

## Security Best Practices

1. **Restrict API Keys** - Always restrict keys to specific apps
2. **Monitor Usage** - Set up billing alerts
3. **Rotate Keys** - Regularly rotate API keys
4. **Use Environment Variables** - Don't commit API keys to version control

## Cost Considerations

- Google Maps API has usage-based pricing
- Set up billing alerts to monitor costs
- Consider implementing caching for frequently accessed locations
- Review pricing at: https://developers.google.com/maps/billing-and-pricing

## Support

For issues related to react-native-maps:

- [react-native-maps documentation](https://github.com/react-native-maps/react-native-maps)
- [Expo documentation](https://docs.expo.dev/)
- [Google Maps Platform documentation](https://developers.google.com/maps/documentation)
