import * as Location from "expo-location";

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { LatLng, Marker, Region } from "react-native-maps";
import React, { useEffect, useRef, useState } from "react";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ latitude: number; longitude: number; address: string }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setSearchResults([]);

    if (!query.trim()) {
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const geocodeResponse = await Location.geocodeAsync(query);

        if (geocodeResponse.length > 0) {
          const results = await Promise.all(
            geocodeResponse.map(async (result) => {
              // Try to get formatted address via reverse geocoding
              try {
                const reverseGeocode = await Location.reverseGeocodeAsync({
                  latitude: result.latitude,
                  longitude: result.longitude,
                });
                const address = reverseGeocode[0]
                  ? `${reverseGeocode[0].street || ""} ${
                      reverseGeocode[0].city || ""
                    } ${reverseGeocode[0].region || ""} ${
                      reverseGeocode[0].country || ""
                    }`.trim() || query
                  : query;
                return {
                  latitude: result.latitude,
                  longitude: result.longitude,
                  address,
                };
              } catch {
                return {
                  latitude: result.latitude,
                  longitude: result.longitude,
                  address: query,
                };
              }
            })
          );
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Error searching location:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSelectSearchResult = (result: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    setSearchQuery("");
    setSearchResults([]);
    const newRegion = {
      latitude: result.latitude,
      longitude: result.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setRegion(newRegion);
    setSelectedLocation({
      latitude: result.latitude,
      longitude: result.longitude,
    });
    mapRef.current?.animateToRegion(newRegion, 1000);
    onLocationSelect(result);
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: isDark
                ? "rgba(30, 30, 30, 0.95)"
                : "rgba(255, 255, 255, 0.95)",
              borderColor: isFocused ? colors.primary : "rgba(0, 0, 0, 0.1)",
              shadowColor: isFocused ? colors.primary : "#000",
            },
          ]}
        >
          <View style={styles.searchIconContainer}>
            <IconSymbol
              name="magnifyingglass"
              size={20}
              color={isFocused ? colors.primary : colors.textSecondary}
            />
          </View>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t("searchLocation") || "Search location..."}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          <View style={styles.searchActionsContainer}>
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconSymbol
                  name="xmark.circle.fill"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View
            style={[
              styles.searchResultsContainer,
              {
                backgroundColor: isDark
                  ? "rgba(30, 30, 30, 0.98)"
                  : "rgba(255, 255, 255, 0.98)",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
              },
            ]}
          >
            <ScrollView
              style={styles.searchResultsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {searchResults.map((result, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.searchResultItem,
                    {
                      borderBottomColor:
                        index < searchResults.length - 1
                          ? isDark
                            ? "rgba(255, 255, 255, 0.08)"
                            : "rgba(0, 0, 0, 0.08)"
                          : "transparent",
                    },
                  ]}
                  onPress={() => handleSelectSearchResult(result)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.resultIconContainer,
                      { backgroundColor: colors.primary + "15" },
                    ]}
                  >
                    <IconSymbol
                      name="mappin.circle.fill"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.resultTextContainer}>
                    <Text
                      style={[styles.searchResultText, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {result.address}
                    </Text>
                  </View>
                  <IconSymbol
                    name="chevron.right"
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

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
  searchContainer: {
    position: "absolute",
    top: 36,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  searchIconContainer: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    fontWeight: "500",
  },
  searchActionsContainer: {
    marginLeft: 12,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  clearButton: {
    padding: 4,
  },
  searchResultsContainer: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: 280,
    overflow: "hidden",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  searchResultsList: {
    maxHeight: 280,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  resultIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTextContainer: {
    flex: 1,
  },
  searchResultText: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
  },
  controlsContainer: {
    position: "absolute",
    top: 100,
    right: 16,
    gap: 12,
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
