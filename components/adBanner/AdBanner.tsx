/**
 * Picks web vs native implementation at runtime via conditional require.
 */
import type { ComponentType } from "react";
import { Platform } from "react-native";

const AdBanner: ComponentType =
  Platform.OS === "web"
    ? require("./AdBanner.web").AdBanner
    : require("./AdBanner.native").AdBanner;

export { AdBanner };
