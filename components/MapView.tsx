import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Alert, Text, TouchableOpacity } from "react-native";
import MapView, { Marker, Region, LatLng } from "react-native-maps";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import * as Location from "expo-location";
import { useTranslation } from "@/hooks/useTranslation";

interface MapViewComponentProps {
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
}

export const MapViewComponent: React.FC<MapViewComponentProps> = ({
  initialLocation,
  onLocationSelect,
  onClose,
  showCurrentLocationButton = true,
  showConfirmButton = true,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 40.1772, // Yerevan, Armenia
    longitude: 44.5035,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(
    initialLocation
      ? {
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
        }
      : null
  );

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialLocation) {
      setRegion({
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setSelectedLocation({
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
      });
    } else {
      // Always get current location when no initial location provided
      getCurrentLocation();
    }
  }, [initialLocation]);

  // Force Yerevan location on component mount if no current location
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!selectedLocation) {
        // If no location selected after 2 seconds, ensure we're showing Yerevan
        setRegion({
          latitude: 40.1772,
          longitude: 44.5035,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [selectedLocation]);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(t("permissionDenied"), t("locationPermissionRequired"));
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setRegion(newRegion);
      setSelectedLocation({ latitude, longitude });

      // Animate to current location
      mapRef.current?.animateToRegion(newRegion, 1000);

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

      onLocationSelect({ latitude, longitude, address });
    } catch (error) {
      console.error("Error getting current location:", error);
      Alert.alert(t("error"), t("couldNotGetLocation"));

      // Fallback to Yerevan if current location fails
      setRegion({
        latitude: 40.1772,
        longitude: 44.5035,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });

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

      onLocationSelect({ latitude, longitude, address });
    } catch (error) {
      console.error("Error getting address:", error);
      onLocationSelect({
        latitude,
        longitude,
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      });
    }
  };

  const handleConfirmLocation = async () => {
    if (selectedLocation) {
      try {
        // Get address from coordinates
        const addressResponse = await Location.reverseGeocodeAsync({
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        });

        const address = addressResponse[0]
          ? `${addressResponse[0].street || ""} ${
              addressResponse[0].city || ""
            } ${addressResponse[0].region || ""} ${
              addressResponse[0].country || ""
            }`.trim()
          : initialLocation?.address ||
            `${selectedLocation.latitude.toFixed(
              6
            )}, ${selectedLocation.longitude.toFixed(6)}`;

        onLocationSelect({
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          address,
        });

        // Close the map after confirming
        onClose?.();
      } catch (error) {
        console.error("Error getting address:", error);
        // Fallback to coordinates if reverse geocoding fails
        onLocationSelect({
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          address:
            initialLocation?.address ||
            `${selectedLocation.latitude.toFixed(
              6
            )}, ${selectedLocation.longitude.toFixed(6)}`,
        });

        // Close the map after confirming
        onClose?.();
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        mapType={isDark ? "satellite" : "standard"}
        customMapStyle={
          isDark
            ? [
                {
                  elementType: "geometry",
                  stylers: [{ color: "#242f3e" }],
                },
                {
                  elementType: "labels.text.stroke",
                  stylers: [{ color: "#242f3e" }],
                },
                {
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#746855" }],
                },
              ]
            : undefined
        }
      >
        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title={t("selectedLocation")}
            description={
              initialLocation?.address ||
              `${selectedLocation.latitude.toFixed(
                6
              )}, ${selectedLocation.longitude.toFixed(6)}`
            }
          />
        )}
      </MapView>

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        {showCurrentLocationButton && (
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.surface }]}
            onPress={getCurrentLocation}
            disabled={loading}
          >
            <IconSymbol name="location.fill" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}

        {onClose && (
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.surface }]}
            onPress={onClose}
          >
            <IconSymbol name="xmark" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Confirm Button */}
      {showConfirmButton && selectedLocation && (
        <View style={styles.confirmContainer}>
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            onPress={handleConfirmLocation}
          >
            <Text style={styles.confirmButtonText}>{t("confirmLocation")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View
            style={[
              styles.loadingContainer,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.loadingText, { color: colors.text }]}>
              {t("gettingLocation")}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  controlsContainer: {
    position: "absolute",
    top: 20,
    right: 20,
    gap: 10,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  confirmButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmButtonText: {
    // Note: Should use colors.textInverse dynamically - consider inline style
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  loadingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
