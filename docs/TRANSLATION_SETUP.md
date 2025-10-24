# Translation System Setup Guide

This guide explains how to set up and use the Google Sheets-based translation system with local fallback.

## Overview

The translation system prioritizes Google Sheets as the primary source and uses local JSON files as fallback. It includes:

- **Google Sheets Integration**: Fetches translations from Google Sheets
- **Local Fallback**: Uses local JSON files when Google Sheets is unavailable
- **Caching**: Caches translations for offline use
- **React Context**: Easy integration with React components

## Setup Steps

### 1. Environment Variables

Add the following environment variable to your `.env` file:

```bash
GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key_here
```

### 2. Google Sheets API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API
4. Create credentials (API Key)
5. Copy the API key to your `.env` file

### 3. Google Sheets Configuration

The system is configured to use these Google Sheets:

- **English**: `1Mh7mztLyDxRB8HtGDhqDW-M0IfvFocRv5RlBlPfMsnA`
- **Russian**: `1-PR5GYLitEBZYaqi69CWOO9FN-g5ql3muzY1rlOLy6s`
- **Armenian**: `1WO56vVlflD1bGtzXQOXpIL6Ol8GGE0kKy9Asljfj6G4`

Each sheet should have:

- Column A: Translation keys
- Column B: Translation values
- Range: `{language}!A:B` (e.g., `en!A:B`)

### 4. App Integration

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

// Refresh translations from Google Sheets
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

// Get multiple translations
const { welcome, services, orders } = useTranslations([
  "welcome",
  "services",
  "orders",
]);
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
    logGoogleSheetsRequests: true,
  },

  // Add new languages
  supportedLanguages: ["en", "ru", "hy", "fr"],
};
```

## Caching Strategy

1. **Memory Cache**: Fastest access, cleared on app restart
2. **AsyncStorage Cache**: Persists between app sessions, expires after 24 hours
3. **Google Sheets**: Primary source, fetched when cache expires
4. **Local JSON**: Fallback when Google Sheets is unavailable

## Error Handling

The system gracefully handles errors:

- **Network Issues**: Falls back to cached or local translations
- **Invalid API Key**: Uses local translations
- **Missing Translations**: Returns the key as fallback
- **Sheet Access Issues**: Uses local translations

## Best Practices

1. **Always provide fallbacks**: `t('key', 'Fallback text')`
2. **Use consistent keys**: Follow a naming convention
3. **Test offline**: Ensure app works without internet
4. **Monitor missing translations**: Check console logs in development
5. **Update Google Sheets**: Keep translations current

## Troubleshooting

### Common Issues

1. **Translations not loading**

   - Check API key configuration
   - Verify Google Sheets permissions
   - Check network connectivity

2. **Missing translations**

   - Check console logs for missing keys
   - Verify Google Sheets format
   - Ensure local JSON files exist

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
  logGoogleSheetsRequests: true,
}
```

## Migration from Local-Only System

If you're migrating from a local-only translation system:

1. Keep your existing JSON files as fallback
2. Update your components to use the new hooks
3. Test with Google Sheets disabled (offline mode)
4. Gradually populate Google Sheets with your translations

## Performance Considerations

- Translations are cached for 24 hours
- Memory cache provides instant access
- Google Sheets requests are made only when needed
- Local fallback ensures offline functionality
- Minimal impact on app startup time
