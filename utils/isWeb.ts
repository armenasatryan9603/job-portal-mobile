import { Dimensions, Platform, useWindowDimensions } from "react-native";

import { WEB_LAYOUT_MIN_WIDTH } from "@/constants/layout";

/**
 * One-shot check (e.g. `useState` initializers). Does not update on resize — prefer `useIsWeb()` in UI.
 * True only when `Platform.OS === "web"` **and** window width ≥ `WEB_LAYOUT_MIN_WIDTH`.
 */
export function isWeb(): boolean {
  if (Platform.OS !== "web") return false;
  return Dimensions.get("window").width >= WEB_LAYOUT_MIN_WIDTH;
}

/**
 * Reactive version for components. Narrow browser windows on web behave like mobile.
 * True only when `Platform.OS === "web"` **and** width ≥ `WEB_LAYOUT_MIN_WIDTH`.
 */
export function useIsWeb(): boolean {
  const { width } = useWindowDimensions();
  if (Platform.OS !== "web") return false;
  return width >= WEB_LAYOUT_MIN_WIDTH;
}
