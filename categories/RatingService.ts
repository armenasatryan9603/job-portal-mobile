import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Linking, Platform } from "react-native";

const STORAGE_KEYS = {
  APP_LAUNCH_COUNT: "rating.appLaunchCount",
  POSITIVE_EVENT_COUNT: "rating.positiveEventCount",
  LAST_PROMPT_AT: "rating.lastPromptAt",
  PROMPT_COUNT: "rating.promptCount",
};

// Simple heuristics to avoid bothering users too often
const MIN_APP_LAUNCHES = 5;
const MIN_POSITIVE_EVENTS = 2;
const MIN_DAYS_BETWEEN_PROMPTS = 90;
const MAX_PROMPTS = 3;

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

/**
 * Opens the store review page using Linking (no native module).
 * iOS: App Store "write review" if appStoreId is set in app config.
 * Android: Play Store app page (user can tap "Write a review").
 */
function openStoreReview(): boolean {
  if (Platform.OS === "ios") {
    const appStoreId =
      (Constants.expoConfig?.extra as Record<string, string> | undefined)
        ?.appStoreId ||
      (Constants.expoConfig?.ios as Record<string, string> | undefined)
        ?.appStoreId;
    if (appStoreId && appStoreId.trim()) {
      const url = `https://apps.apple.com/app/id${appStoreId.trim()}?action=write-review`;
      Linking.openURL(url).catch(() => {});
      return true;
    }
    return false;
  }
  if (Platform.OS === "android") {
    const packageName =
      (Constants.expoConfig?.android as Record<string, string> | undefined)
        ?.package || "com.jobportalmobile.app";
    const url = `https://play.google.com/store/apps/details?id=${packageName}`;
    Linking.openURL(url).catch(() => {});
    return true;
  }
  return false;
}

export class RatingService {
  private static instance: RatingService;

  static getInstance(): RatingService {
    if (!RatingService.instance) {
      RatingService.instance = new RatingService();
    }
    return RatingService.instance;
  }

  /**
   * Call once on app launch to update basic engagement stats.
   */
  async onAppLaunch() {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.APP_LAUNCH_COUNT);
      const current = value ? parseInt(value, 10) || 0 : 0;
      await AsyncStorage.setItem(
        STORAGE_KEYS.APP_LAUNCH_COUNT,
        String(current + 1)
      );
    } catch (error) {
      console.warn("RatingService.onAppLaunch error:", error);
    }
  }

  /**
   * Call this after a clearly positive event, e.g. 4–5★ feedback on a completed order.
   * Updates counters and, if conditions are met, opens the store review page (no native module).
   */
  async recordPositiveEvent() {
    try {
      const value = await AsyncStorage.getItem(
        STORAGE_KEYS.POSITIVE_EVENT_COUNT
      );
      const current = value ? parseInt(value, 10) || 0 : 0;
      const next = current + 1;
      await AsyncStorage.setItem(
        STORAGE_KEYS.POSITIVE_EVENT_COUNT,
        String(next)
      );

      await this.maybeRequestReview();
    } catch (error) {
      console.warn("RatingService.recordPositiveEvent error:", error);
    }
  }

  private async maybeRequestReview() {
    try {
      if (!(Platform.OS === "ios" || Platform.OS === "android")) {
        return;
      }

      const [
        launchCountRaw,
        positiveEventsRaw,
        lastPromptAtRaw,
        promptCountRaw,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.APP_LAUNCH_COUNT),
        AsyncStorage.getItem(STORAGE_KEYS.POSITIVE_EVENT_COUNT),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_PROMPT_AT),
        AsyncStorage.getItem(STORAGE_KEYS.PROMPT_COUNT),
      ]);

      const launchCount = launchCountRaw ? parseInt(launchCountRaw, 10) || 0 : 0;
      const positiveEvents = positiveEventsRaw
        ? parseInt(positiveEventsRaw, 10) || 0
        : 0;
      const promptCount = promptCountRaw
        ? parseInt(promptCountRaw, 10) || 0
        : 0;

      if (promptCount >= MAX_PROMPTS) {
        return;
      }

      if (launchCount < MIN_APP_LAUNCHES) {
        return;
      }

      if (positiveEvents < MIN_POSITIVE_EVENTS) {
        return;
      }

      if (lastPromptAtRaw) {
        const lastPromptAt = new Date(lastPromptAtRaw);
        const now = new Date();
        const diffDays = daysBetween(lastPromptAt, now);
        if (diffDays < MIN_DAYS_BETWEEN_PROMPTS) {
          return;
        }
      }

      const opened = openStoreReview();
      if (!opened) {
        return;
      }

      const nowIso = new Date().toISOString();
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.LAST_PROMPT_AT, nowIso),
        AsyncStorage.setItem(
          STORAGE_KEYS.PROMPT_COUNT,
          String(promptCount + 1)
        ),
      ]);
    } catch (error) {
      console.warn("RatingService.maybeRequestReview error:", error);
    }
  }
}

export default RatingService;
