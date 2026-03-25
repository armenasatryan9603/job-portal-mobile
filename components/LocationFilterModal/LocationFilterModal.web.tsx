/**
 * Web: react-native-maps is not supported. Same filters (location + radius) without map tiles.
 */
import * as Location from "expo-location";

import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";

import { Button } from "../ui/button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { LocationFilterModalProps } from "./LocationFilterModal.types";
import { ThemeColors } from "@/constants/styles";
import { useIsWeb } from "@/utils/isWeb";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";

export const LocationFilterModal: React.FC<LocationFilterModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialLocation,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const isDesktopWeb = useIsWeb();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(initialLocation || null);
  const [radius, setRadius] = useState(initialLocation?.radius || 10);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ latitude: number; longitude: number; address: string }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (initialLocation) {
        setSelectedLocation({
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          address: initialLocation.address,
        });
        setRadius(initialLocation.radius);
      } else {
        getCurrentLocation().catch(() => {});
      }
    }
  }, [visible, initialLocation]);

  const getDeltaForRadius = (radiusKm: number): number => {
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

      setSelectedLocation({ latitude, longitude, address });
    } catch (error) {
      Alert.alert(t("error"), t("couldNotGetLocation"));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
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
    setSelectedLocation(result);
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
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Modal
      visible={visible}
      animationType={isDesktopWeb ? 'fade' : 'slide'}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            {t("selectLocationAndRadius")}
          </Text>
          <Button
            onPress={handleConfirm}
            disabled={!selectedLocation || loading}
            title={t("apply")}
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.searchBox,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t("searchLocation") || "Search location..."}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
            />
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : null}
          </View>

          {searchResults.length > 0 && (
            <View
              style={[
                styles.resultsList,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              {searchResults.map((result, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.resultRow,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => handleSelectSearchResult(result)}
                >
                  <Text style={{ color: colors.text }} numberOfLines={2}>
                    {result.address}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View
            style={[
              styles.mapPlaceholder,
              {
                backgroundColor: isDark ? "#1f2937" : "#e5e7eb",
                borderColor: colors.border,
              },
            ]}
          >
            <IconSymbol name="map" size={40} color={colors.textSecondary} />
            <Text style={[styles.placeholderText, { color: colors.text }]}
            >
              Map preview is not available on web. Search above or use your
              current location.
            </Text>
            <TouchableOpacity
              style={[
                styles.locBtn,
                { backgroundColor: colors.primary },
              ]}
              onPress={getCurrentLocation}
              disabled={loading}
            >
              <IconSymbol name="location.fill" size={18} color="#fff" />
              <Text style={styles.locBtnText}>{t("currentLocation")}</Text>
            </TouchableOpacity>
          </View>

          {selectedLocation && (
            <Text
              style={[styles.addressText, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {selectedLocation.address}
            </Text>
          )}
        </ScrollView>

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
              {t("radius")}
            </Text>
            <Text style={[styles.radiusValue, { color: colors.primary }]}>
              {radius} km
            </Text>
          </View>
          <View style={styles.presetButtons}>
            {[1, 5, 10, 25, 50, 75, 100, 150, 200].map((preset) => (
              <Button
                key={preset}
                title={`${preset} km`}
                variant={radius === preset ? "primary" : "outline"}
                onPress={() => handleRadiusChange(preset)}
                style={[
                  styles.presetButton,
                  {
                    backgroundColor:
                      radius === preset ? colors.primary : colors.background,
                    borderColor: colors.border,
                  },
                ]}
              />
            ))}
          </View>
          {selectedLocation && (
            <Text
              style={[styles.locationText, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {selectedLocation.address} · radius {radius} km (~
              {getDeltaForRadius(radius).toFixed(2)}°)
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
    paddingTop: 50,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  resultsList: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    maxHeight: 200,
    overflow: "hidden",
  },
  resultRow: {
    padding: 12,
    borderBottomWidth: 1,
  },
  mapPlaceholder: {
    minHeight: 280,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  placeholderText: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  locBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  locBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  addressText: {
    marginTop: 12,
    fontSize: 14,
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
  locationText: {
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
});
