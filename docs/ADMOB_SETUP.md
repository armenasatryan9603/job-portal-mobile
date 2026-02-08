# AdMob setup – next steps to earn from ads

The home screen now has a **Google AdMob banner** slot (after Quick Actions). It uses **test ad IDs** by default so you can run the app without an AdMob account. To earn real revenue, do the following.

## 1. Install the native dependency and rebuild

From the `mobile` folder:

```bash
npm install
npx expo prebuild --clean
```

Then build and run the app on a device or simulator:

- **iOS:** `npx expo run:ios`
- **Android:** `npx expo run:android`

(You must use a **development build**; Expo Go does not include the AdMob native module.)

## 2. Create a Google AdMob account and app

1. Go to [admob.google.com](https://admob.google.com) and sign in with your Google account.
2. Click **Apps** → **Add app**.
3. Select **Android** and/or **iOS** and enter your app details:
   - **Android:** package name `com.jobportalmobile.app`
   - **iOS:** bundle ID `com.jobportalmobile.app`
4. After the app is created, note the **App ID** for each platform (e.g. `ca-app-pub-xxxxxxxx~yyyyyyyy`).

## 3. Create a Banner ad unit

1. In AdMob, open your app → **Ad units** → **Add ad unit**.
2. Choose **Banner**.
3. Name it (e.g. "Home banner") and create it.
4. Copy the **Ad unit ID** (e.g. `ca-app-pub-xxxxxxxx/zzzzzzzz`).

## 4. Use your real IDs in the app

**Option A – Environment variable (recommended)**

1. In `mobile/.env`, add:
   ```env
   EXPO_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-xxxxxxxx/zzzzzzzz
   ```
   (Use your real Banner ad unit ID.)

2. For the **App IDs** (required by the native SDK), update `mobile/app.json` in the `react-native-google-mobile-ads` plugin entry:
   - Replace `androidAppId` with your Android AdMob App ID.
   - Replace `iosAppId` with your iOS AdMob App ID.

**Option B – Keep test IDs for now**

- Leave the plugin in `app.json` as-is (test App IDs) and do not set `EXPO_PUBLIC_ADMOB_BANNER_ID`. The app will keep showing test ads and you will not earn money, but you can verify that the banner loads.

## 5. Rebuild after changing App IDs

After changing the AdMob App IDs in `app.json`, run:

```bash
npx expo prebuild --clean
npx expo run:ios   # or run:android
```

## 6. Optional – consent (GDPR / ATT)

If you have users in the **EEA** or use **iOS**, you may need:

- **GDPR:** Use the UMP SDK / consent form before loading ads (see [react-native-google-mobile-ads European consent docs](https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/european-user-consent.mdx)).
- **iOS ATT:** Request App Tracking Transparency before personalized ads.

The current implementation does not include consent; add it when you are ready to go live in regulated regions.

## Summary

| Step | Action |
|------|--------|
| 1 | Run `npm install` and `npx expo prebuild --clean`, then `npx expo run:ios` or `run:android`. |
| 2 | Create an AdMob account and register your app (Android and/or iOS). |
| 3 | Create a Banner ad unit and copy the Ad unit ID. |
| 4 | Set `EXPO_PUBLIC_ADMOB_BANNER_ID` in `.env` and put your real App IDs in `app.json` (plugin config). |
| 5 | Rebuild the app after changing `app.json`. |
| 6 | (Optional) Add consent flow for EEA and iOS ATT. |

Revenue will appear in your AdMob dashboard; payouts depend on your country and payment threshold.
