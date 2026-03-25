/**
 * Picks web vs native implementation at runtime via conditional require.
 */
import type { ComponentType } from "react";
import { Platform } from "react-native";

export type MapViewComponentProps = {
  initialLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  onClose?: () => void;
  showCurrentLocationButton?: boolean;
  showConfirmButton?: boolean;
};

const MapViewComponent = (
  Platform.OS === "web"
    ? require("./MapView.web").MapViewComponent
    : require("./MapView.native").MapViewComponent
) as ComponentType<MapViewComponentProps>;

export { MapViewComponent };
