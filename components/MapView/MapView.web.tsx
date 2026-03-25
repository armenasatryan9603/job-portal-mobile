/**
 * Web implementation: react-native-maps is not supported on web.
 * Same UX as native (search, GPS, confirm) without an interactive map tile.
 */
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
import React, { useEffect, useRef, useState } from "react";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/hooks/useTranslation";

type LatLng = { latitude: number; longitude: number };

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
    if (!initialLocation) {
      getCurrentLocation();
    }
  }, [initialLocation]);

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

      setSelectedLocation({ latitude, longitude });
      onLocationSelect({ latitude, longitude, address });
    } catch (error) {
      console.error("Error getting current location:", error);
      Alert.alert(t("error"), t("couldNotGetLocation"));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setSearchResults([]);

    if (!query.trim()) {
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const geocodeResponse = await Location.geocodeAsync(query);

        if (geocodeResponse.length > 0) {
          const results = await Promise.all(
            geocodeResponse.map(async (result) => {
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
    setSelectedLocation({
      latitude: result.latitude,
      longitude: result.longitude,
    });
    onLocationSelect(result);
  };

  const handleConfirmLocation = async () => {
    if (selectedLocation) {
      try {
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

        onClose?.();
      } catch (error) {
        console.error("Error getting address:", error);
        onLocationSelect({
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          address:
            initialLocation?.address ||
            `${selectedLocation.latitude.toFixed(
              6
            )}, ${selectedLocation.longitude.toFixed(6)}`,
        });

        onClose?.();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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

      <View
        style={[
          styles.mapPlaceholder,
          {
            backgroundColor: isDark ? "#1f2937" : "#e5e7eb",
            borderColor: colors.border,
          },
        ]}
      >
        <IconSymbol name="map" size={48} color={colors.textSecondary} />
        <Text style={[styles.placeholderTitle, { color: colors.text }]}>
          {t("selectedLocation") || "Selected location"}
        </Text>
        {selectedLocation ? (
          <Text
            style={[styles.placeholderCoords, { color: colors.textSecondary }]}
          >
            {selectedLocation.latitude.toFixed(5)},{" "}
            {selectedLocation.longitude.toFixed(5)}
          </Text>
        ) : (
          <Text style={[styles.placeholderHint, { color: colors.textSecondary }]}>
            Search or use your current location
          </Text>
        )}
      </View>

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
  mapPlaceholder: {
    flex: 1,
    minHeight: 200,
    marginTop: 120,
    marginHorizontal: 0,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  placeholderCoords: {
    marginTop: 8,
    fontSize: 14,
  },
  placeholderHint: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
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
