# Translation System Setup Guide

This guide explains how to set up and use the backend-based translation system.

## Overview

The translation system fetches translations from the backend API. Translation files are stored on the server in the `backend/locales/` folder. The system includes:

- **Backend API**: Serves translations from JSON files
- **Caching**: Caches translations for offline use and performance
- **React Context**: Easy integration with React components

## Setup Steps

### 1. Backend Translation Files

Translation files are located in the `backend/locales/` folder:

- `backend/locales/en.json` - English translations
- `backend/locales/ru.json` - Russian translations
- `backend/locales/hy.json` - Armenian translations

Each file should contain key-value pairs:

```json
{
  "welcome": "Welcome",
  "services": "Services",
  "orders": "Orders"
}
```

### 2. Backend API Endpoints

The backend provides the following endpoints:

- `GET /translations` - Get available languages
- `GET /translations/:language` - Get translations for a specific language

Example response:

```json
{
  "success": true,
  "language": "en",
  "translations": {
    "welcome": "Welcome",
    "services": "Services"
  }
}
```

### 3. App Integration

#### Wrap your app with the TranslationProvider:

```tsx
import React from "react";
import { TranslationProvider } from "./contexts/TranslationContext";
import { LanguageProvider } from "./contexts/LanguageContext";

export default function App() {
  return (
    <LanguageProvider>
      <TranslationProvider>{/* Your app components */}</TranslationProvider>
    </LanguageProvider>
  );
}
```

#### Use translations in components:

```tsx
import React from "react";
import { Text, View } from "react-native";
import { useTranslation, useT } from "./hooks/useTranslation";

function MyComponent() {
  const { t, loading, error } = useTranslation();

  // Method 1: Using the hook
  const welcomeText = useT("welcome", "Welcome");

  // Method 2: Using the context
  const servicesText = t("services", "Services");

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error}</Text>;

  return (
    <View>
      <Text>{welcomeText}</Text>
      <Text>{servicesText}</Text>
    </View>
  );
}
```

## API Reference

### TranslationService

```typescript
// Get all translations for a language
const translations = await translationService.getTranslations("en");

// Get a specific translation
const text = await translationService.getTranslation("en", "welcome");

// Refresh translations (reloads from backend)
const freshTranslations = await translationService.refreshTranslations("en");

// Clear cache
await translationService.clearCache();

// Check if translations are cached
const isCached = await translationService.isCached("en");
```

### useTranslation Hook

```typescript
const {
  t, // Translation function
  translations, // All translations object
  loading, // Loading state
  error, // Error message
  refreshTranslations, // Refresh function
} = useTranslation();
```

### useT Hook (Shorthand)

```typescript
// Get a single translation
const welcomeText = useT("welcome", "Welcome");
```

## Configuration

### Translation Config

Edit `config/translations.ts` to customize:

```typescript
export const TRANSLATION_CONFIG = {
  // Cache expiry time (24 hours)
  cache: {
    expiryTime: 24 * 60 * 60 * 1000,
  },

  // Debug settings
  debug: {
    enabled: __DEV__,
    logMissingTranslations: true,
    logCacheHits: false,
  },

  // Add new languages
  supportedLanguages: ["en", "ru", "hy", "fr"],
};
```

### API Configuration

The frontend uses `EXPO_PUBLIC_API_URL` environment variable to determine the backend URL. For Android emulator, `localhost` is automatically converted to `10.0.2.2`.

## Caching Strategy

1. **Memory Cache**: Fastest access, cleared on app restart
2. **AsyncStorage Cache**: Persists between app sessions, expires after 24 hours
3. **Backend API**: Primary source, fetched when cache expires or on refresh

## Error Handling

The system gracefully handles errors:

- **Network Issues**: Falls back to cached translations
- **Missing Translations**: Returns the key as fallback
- **Backend Errors**: Logs error and uses empty object

## Best Practices

1. **Always provide fallbacks**: `t('key', 'Fallback text')`
2. **Use consistent keys**: Follow a naming convention
3. **Keep files in sync**: Ensure all language files have the same keys
4. **Monitor missing translations**: Check console logs in development
5. **Update translation files**: Keep translations current on the backend

## Adding New Translations

1. Add the new key to all language files in `backend/locales/` folder
2. Provide translations for each language
3. Restart the backend server
4. Clear cache in the app if needed: `translationService.clearCache()`
5. Translations will be fetched automatically on next request

## Troubleshooting

### Common Issues

1. **Translations not loading**

   - Check that backend is running
   - Verify `EXPO_PUBLIC_API_URL` is set correctly
   - Check that `backend/locales/` folder exists
   - Verify JSON files are valid

2. **Missing translations**

   - Check console logs for missing keys
   - Verify JSON file format
   - Ensure all language files have the same keys
   - Check backend logs for errors

3. **Cache issues**
   - Clear cache: `translationService.clearCache()`
   - Check cache expiry settings
   - Verify AsyncStorage permissions

### Debug Mode

Enable debug mode in `config/translations.ts`:

```typescript
debug: {
  enabled: true,
  logMissingTranslations: true,
  logCacheHits: true,
}
```

## Performance Considerations

- Translations are cached for 24 hours
- Memory cache provides instant access
- Backend requests are made only when cache expires
- Cached translations ensure offline functionality
- Minimal impact on app startup time
