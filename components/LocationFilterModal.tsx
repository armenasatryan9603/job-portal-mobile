import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import MapView, { Circle, Marker, Region } from "react-native-maps";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import * as Location from "expo-location";

interface LocationFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (location: {
    latitude: number;
    longitude: number;
    address: string;
    radius: number; // in km
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    radius: number;
  };
}

const { width, height } = Dimensions.get("window");

export const LocationFilterModal: React.FC<LocationFilterModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialLocation,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const mapRef = useRef<MapView>(null);

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(initialLocation || null);
  const [radius, setRadius] = useState(initialLocation?.radius || 10); // Default 10km
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: 40.1772, // Yerevan, Armenia (fallback)
    longitude: 44.5035,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Get user's current location when modal opens
  useEffect(() => {
    if (visible) {
      if (initialLocation) {
        const delta = getDeltaForRadius(initialLocation.radius);
        setSelectedLocation({
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          address: initialLocation.address,
        });
        setRadius(initialLocation.radius);
        const newRegion = {
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: delta,
          longitudeDelta: delta,
        };
        setRegion(newRegion);
        // Ensure map animates to location
        setTimeout(() => {
          mapRef.current?.animateToRegion(newRegion, 500);
        }, 100);
      } else {
        // Get current location or use default
        getCurrentLocation().catch(() => {
          // If location fails, at least show the default region
        });
      }
    }
  }, [visible, initialLocation]);

  const getDeltaForRadius = (radiusKm: number): number => {
    // Convert radius in km to approximate delta for map view
    // 1 degree latitude ≈ 111 km
    return (radiusKm * 2) / 111;
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(t("permissionDenied"), t("locationPermissionRequired"));
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

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
      setSelectedLocation(newLocation);

      // Update map region
      const delta = getDeltaForRadius(radius);
      setRegion({
        latitude,
        longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      });

      // Animate map to location
      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: delta,
          longitudeDelta: delta,
        },
        1000
      );
    } catch (error) {
      Alert.alert(t("error"), t("couldNotGetLocation"));
    } finally {
      setLoading(false);
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    try {
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
        : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

      setSelectedLocation({ latitude, longitude, address });
    } catch (error) {
      setSelectedLocation({
        latitude,
        longitude,
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      });
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onConfirm({
        ...selectedLocation,
        radius,
      });
      onClose();
    }
  };

  const handleRadiusChange = (value: number) => {
    setRadius(value);
    if (selectedLocation) {
      const delta = getDeltaForRadius(value);
      mapRef.current?.animateToRegion(
        {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          latitudeDelta: delta,
          longitudeDelta: delta,
        },
        300
      );
    }
  };

  // Simplified: Only use preset buttons, no slider

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("selectLocationAndRadius") || "Select Location & Radius"}
          </Text>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!selectedLocation || loading}
            style={[
              styles.confirmButton,
              {
                backgroundColor:
                  selectedLocation && !loading ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.confirmButtonText,
                {
                  color:
                    selectedLocation && !loading
                      ? "white"
                      : colors.textSecondary,
                },
              ]}
            >
              {t("apply") || "Apply"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          {region && (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={region}
              region={region}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsMyLocationButton={false}
              showsCompass={true}
              showsScale={true}
              mapType="standard"
              loadingEnabled={true}
            >
              {selectedLocation && (
                <>
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.latitude,
                      longitude: selectedLocation.longitude,
                    }}
                    title={selectedLocation.address}
                  />
                  <Circle
                    center={{
                      latitude: selectedLocation.latitude,
                      longitude: selectedLocation.longitude,
                    }}
                    radius={radius * 1000} // Convert km to meters
                    fillColor="rgba(0, 122, 255, 0.1)"
                    strokeColor="rgba(0, 122, 255, 0.5)"
                    strokeWidth={2}
                  />
                </>
              )}
            </MapView>
          )}

          {/* Current Location Button */}
          <TouchableOpacity
            style={[
              styles.currentLocationButton,
              { backgroundColor: colors.background },
            ]}
            onPress={getCurrentLocation}
            disabled={loading}
          >
            <IconSymbol name="location.fill" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Radius Selection */}
        <View
          style={[
            styles.radiusContainer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <View style={styles.radiusHeader}>
            <Text style={[styles.radiusLabel, { color: colors.text }]}>
              {t("radius") || "Radius"}
            </Text>
            <Text style={[styles.radiusValue, { color: colors.primary }]}>
              {radius} km
            </Text>
          </View>
          {/* Preset buttons */}
          <View style={styles.presetButtons}>
            {[1, 5, 10, 25, 50, 75, 100, 150, 200].map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetButton,
                  {
                    backgroundColor:
                      radius === preset ? colors.primary : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleRadiusChange(preset)}
              >
                <Text
                  style={[
                    styles.presetButtonText,
                    {
                      color: radius === preset ? "white" : colors.text,
                    },
                  ]}
                >
                  {preset} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedLocation && (
            <Text
              style={[styles.locationText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {selectedLocation.address}
            </Text>
          )}
        </View>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingTop: 50, // Account for status bar
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
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
  mapContainer: {
    flex: 1,
    position: "relative",
    minHeight: 300,
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  currentLocationButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  radiusContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  radiusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  radiusLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  radiusValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  presetButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 8,
  },
  presetButton: {
    minWidth: "30%",
    flexBasis: "30%",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  presetButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  locationText: {
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
});
