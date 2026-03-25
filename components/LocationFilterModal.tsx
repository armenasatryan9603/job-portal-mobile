/**
 * Picks web vs native implementation at runtime via conditional require.
 */
import type { ComponentType } from "react";
import type { LocationFilterModalProps } from "./LocationFilterModal/LocationFilterModal.types";
import { Platform } from "react-native";

const LocationFilterModal: ComponentType<LocationFilterModalProps> =
  Platform.OS === "web"
    ? require("./ui/LocationFilterModal/LocationFilterModal.web").LocationFilterModal
    : require("./ui/LocationFilterModal/LocationFilterModal.native").LocationFilterModal;

export { LocationFilterModal };
export type { LocationFilterModalProps } from "./LocationFilterModal/LocationFilterModal.types";
