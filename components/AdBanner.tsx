/**
 * AdMob Banner component. Renders a Google AdMob banner when the native module is available.
 * Uses test IDs in __DEV__, or platform-specific env vars in production:
 *   - EXPO_PUBLIC_ADMOB_BANNER_ID_IOS   (iOS)
 *   - EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID (Android)
 * Returns null if the native module is not available (e.g. Expo Go).
 */
import React, { useEffect } from "react";
import { Platform } from "react-native";

const ADMOB_BANNER_ID =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS ?? null
    : process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID ?? null;

let BannerAd: React.ComponentType<any> | null = null;
let BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: string } | null = null;
let TestIds: { BANNER: string } | null = null;
let mobileAds: (() => { initialize: () => Promise<unknown> }) | null = null;

try {
  const admob = require("react-native-google-mobile-ads");
  BannerAd = admob.BannerAd;
  BannerAdSize = admob.BannerAdSize;
  TestIds = admob.TestIds;
  mobileAds = admob.default;
} catch {
  // Native module not available (e.g. Expo Go, web)
}

const adUnitId = __DEV__
  ? TestIds?.BANNER ?? "ca-app-pub-3940256099942544/6300978111"
  : ADMOB_BANNER_ID || TestIds?.BANNER || "ca-app-pub-3940256099942544/6300978111";

export function AdBanner() {
  useEffect(() => {
    if (!mobileAds) return;
    mobileAds()
      .initialize()
      .catch((err: unknown) => console.warn("AdMob init failed:", err));
  }, []);

  if (!BannerAd || !BannerAdSize) return null;

  return (
    <BannerAd
      unitId={adUnitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
    />
  );
}
