import {
  Modal,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import React, { useState } from "react";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { MapViewComponent } from "@/components/MapView";
import { ThemeColors } from "@/constants/styles";
import { parseLocationCoordinates } from "@/utils/locationParsing";

type ThemeColor = (typeof ThemeColors)[keyof typeof ThemeColors];

type LocationWithMapProps = {
  colors: ThemeColor;
  locationString?: string | null;
  label?: string;
  /**
   * Text to show when there is no location string or coordinates (e.g. "remote").
   */
  remoteText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  valueTextStyle?: StyleProp<TextStyle>;
  /**
   * Icon size, defaults to 20 (to match order details).
   */
  iconSize?: number;
  /**
   * Icon/text color when coordinates are available.
   * Defaults to colors.tint.
   */
  enabledColor?: string;
  /**
   * Icon/text color when coordinates are NOT available.
   * Defaults to colors.tabIconDefault.
   */
  disabledColor?: string;
  /**
   * Whether to underline the text when coordinates are available.
   * Defaults to true.
   */
  underlineOnEnabled?: boolean;
};

export function LocationWithMap({
  colors,
  locationString,
  label,
  remoteText,
  containerStyle,
  labelStyle,
  valueTextStyle,
  iconSize = 20,
  enabledColor,
  disabledColor,
  underlineOnEnabled = true,
}: LocationWithMapProps) {
  const [showMapModal, setShowMapModal] = useState(false);

  const displayLocation = locationString || "";
  const locationCoordinates = parseLocationCoordinates(displayLocation);
  const isInteractive = !!locationCoordinates;

  const resolvedEnabledColor = enabledColor || colors.tint;
  const resolvedDisabledColor = disabledColor || colors.tabIconDefault;

  const textColor = isInteractive ? resolvedEnabledColor : resolvedDisabledColor;

  const displayText =
    locationCoordinates?.address ||
    displayLocation ||
    remoteText ||
    "";

  const handlePress = () => {
    if (isInteractive) {
      setShowMapModal(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.container, containerStyle]}
        onPress={handlePress}
        disabled={!isInteractive}
        activeOpacity={isInteractive ? 0.6 : 1}
      >
        <IconSymbol
          name="location.fill"
          size={iconSize}
          color={textColor}
        />
        <View style={styles.content}>
          {label ? (
            <Text style={[styles.label, { color: colors.tabIconDefault }, labelStyle]}>
              {label}
            </Text>
          ) : null}
          <Text
            style={[
              styles.value,
              { color: colors.text, textDecorationLine: isInteractive && underlineOnEnabled ? "underline" : "none" },
              { color: textColor },
              valueTextStyle,
            ]}
          >
            {displayText}
          </Text>
        </View>
      </TouchableOpacity>

      {locationCoordinates && (
        <Modal
          visible={showMapModal}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowMapModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <MapViewComponent
              initialLocation={locationCoordinates}
              onLocationSelect={() => {}}
              onClose={() => setShowMapModal(false)}
              showCurrentLocationButton={false}
              showConfirmButton={false}
            />
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
    opacity: 0.7,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
  },
});

