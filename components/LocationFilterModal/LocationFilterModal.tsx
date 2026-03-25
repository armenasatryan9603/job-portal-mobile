/**
 * Picks web vs native implementation at runtime via conditional require.
 */
import type { ComponentType } from "react";
import { Platform } from "react-native";

import type { LocationFilterModalProps } from "./LocationFilterModal.types";

const LocationFilterModal: ComponentType<LocationFilterModalProps> =
  Platform.OS === "web"
    ? require("./LocationFilterModal.web").LocationFilterModal
    : require("./LocationFilterModal.native").LocationFilterModal;

export { LocationFilterModal };
export type { LocationFilterModalProps } from "./LocationFilterModal.types";
