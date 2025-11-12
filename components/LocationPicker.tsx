import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { MapViewComponent } from "./MapView";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "@/hooks/useTranslation";

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  visible,
  onClose,
  onLocationSelect,
  initialLocation,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(initialLocation || null);
  const [manualAddress, setManualAddress] = useState(
    initialLocation?.address || ""
  );
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (visible && !location) {
      requestLocationPermission();
    }
    // Auto-open map when LocationPicker opens
    if (visible) {
      setShowMap(true);
    }
  }, [visible]);

  const requestLocationPermission = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(t("permissionDenied"), t("locationPermissionRequired"));
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;

      // Get address from coordinates
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      const address = addressResponse[0]
        ? `${addressResponse[0].street || ""} ${
            addressResponse[0].city || ""
          } ${addressResponse[0].region || ""} ${
            addressResponse[0].country || ""
          }`.trim()
        : t("currentLocation");

      const newLocation = { latitude, longitude, address };
      setLocation(newLocation);
      setManualAddress(address);
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert(t("error"), t("couldNotGetLocation"));
    } finally {
      setLoading(false);
    }
  };

  const handleManualAddressSearch = async () => {
    if (!manualAddress.trim()) return;

    try {
      setLoading(true);
      const geocodeResponse = await Location.geocodeAsync(manualAddress);

      if (geocodeResponse.length > 0) {
        const { latitude, longitude } = geocodeResponse[0];
        const newLocation = { latitude, longitude, address: manualAddress };
        setLocation(newLocation);
      } else {
        Alert.alert(t("error"), t("couldNotFindAddress"));
      }
    } catch (error) {
      console.error("Error geocoding address:", error);
      Alert.alert(t("error"), t("couldNotFindAddress"));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (location) {
      onLocationSelect(location);
      onClose();
    }
  };

  const handleMapLocationSelect = (selectedLocation: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    setLocation(selectedLocation);
    setManualAddress(selectedLocation.address);
    setShowMap(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("setLocation")}
          </Text>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!location}
            style={[
              styles.confirmButton,
              { backgroundColor: location ? colors.primary : colors.border },
            ]}
          >
            <Text
              style={[
                styles.confirmButtonText,
                { color: location ? "white" : colors.textSecondary },
              ]}
            >
              {t("confirm")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Manual Address Input */}
        <View
          style={[styles.inputContainer, { backgroundColor: colors.surface }]}
        >
          <TextInput
            style={[
              styles.addressInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder={t("enterAddressManually")}
            placeholderTextColor={colors.textSecondary}
            value={manualAddress}
            onChangeText={setManualAddress}
            onSubmitEditing={handleManualAddressSearch}
          />
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.primary }]}
            onPress={handleManualAddressSearch}
            disabled={loading}
          >
            <IconSymbol name="magnifyingglass" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Current Location Button */}
        <View style={styles.locationButtonContainer}>
          <TouchableOpacity
            style={[
              styles.currentLocationButton,
              { borderColor: colors.border },
            ]}
            onPress={requestLocationPermission}
            disabled={loading}
          >
            <IconSymbol name="location.fill" size={20} color={colors.primary} />
            <Text
              style={[styles.currentLocationText, { color: colors.primary }]}
            >
              {loading ? t("gettingLocation") : t("useCurrentLocation")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Show Map Button */}
        <View style={styles.mapButtonContainer}>
          <TouchableOpacity
            style={[styles.mapButton, { borderColor: colors.border }]}
            onPress={() => setShowMap(true)}
          >
            <IconSymbol name="map" size={20} color={colors.primary} />
            <Text style={[styles.mapButtonText, { color: colors.primary }]}>
              {t("showOnMap")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Location Display */}
        {/* <View
          style={[
            styles.locationDisplayContainer,
            { backgroundColor: colors.surface },
          ]}
        >
          {location ? (
            <View style={styles.locationInfo}>
              <IconSymbol
                name="location.fill"
                size={24}
                color={colors.primary}
              />
              <View style={styles.locationDetails}>
                <Text style={[styles.locationTitle, { color: colors.text }]}>
                  {t("selectedLocation")}
                </Text>
                <Text
                  style={[
                    styles.locationAddress,
                    { color: colors.textSecondary },
                  ]}
                >
                  {location.address}
                </Text>
                <Text
                  style={[
                    styles.locationCoords,
                    { color: colors.textSecondary },
                  ]}
                >
                  {location.latitude.toFixed(6)},{" "}
                  {location.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noLocationInfo}>
              <IconSymbol
                name="location"
                size={24}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.noLocationText, { color: colors.textSecondary }]}
              >
                {t("noLocationSelected")}
              </Text>
            </View>
          )}
        </View> */}

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text
            style={[styles.instructionsText, { color: colors.textSecondary }]}
          >
            {t("useCurrentLocationOrEnter")}
          </Text>
        </View>
      </View>

      {/* Map View Modal */}
      <Modal
        visible={showMap}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowMap(false)}
      >
        <MapViewComponent
          initialLocation={location || undefined}
          onLocationSelect={handleMapLocationSelect}
          onClose={() => setShowMap(false)}
          showCurrentLocationButton={true}
        />
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  addressInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchButton: {
    padding: 10,
    borderRadius: 8,
  },
  locationButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  currentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  currentLocationText: {
    fontSize: 16,
    fontWeight: "500",
  },
  mapButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  mapButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  locationDisplayContainer: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    justifyContent: "center",
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  locationDetails: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  locationAddress: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 14,
    fontFamily: "monospace",
  },
  noLocationInfo: {
    alignItems: "center",
    gap: 12,
  },
  noLocationText: {
    fontSize: 16,
    textAlign: "center",
  },
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  instructionsText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
