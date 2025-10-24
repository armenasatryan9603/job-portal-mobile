import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Service } from "@/services/api";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { MapViewComponent } from "@/components/MapView";
import { Modal } from "react-native";

interface BasicInformationFormProps {
  formData: {
    title: string;
    description: string;
    budget: string;
    location: string;
  };
  errors: {
    title: string;
    description: string;
    budget: string;
    location: string;
  };
  selectedService: Service | null;
  onFieldChange: (field: string, value: string) => void;
  onLocationChange?: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
}

export const BasicInformationForm: React.FC<BasicInformationFormProps> = ({
  formData,
  errors,
  selectedService,
  onFieldChange,
  onLocationChange,
}) => {
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const [mapVisible, setMapVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  const handleLocationSelect = (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    setSelectedLocation(location);
    onFieldChange("location", location.address);
    onLocationChange?.(location);
  };

  const handleOpenMap = () => {
    setMapVisible(true);
  };

  const handleClearLocation = () => {
    setSelectedLocation(null);
    onFieldChange("location", "");
  };

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t("basicInformation")}
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          {t("jobTitle")} *
        </Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.background,
              borderColor: errors.title ? "#ff4444" : colors.border,
              color: colors.text,
            },
          ]}
          value={formData.title}
          onChangeText={(value) => onFieldChange("title", value)}
          placeholder={t("orderTitlePlaceholder")}
          placeholderTextColor={colors.tabIconDefault}
        />
        {errors.title ? (
          <Text style={[styles.errorText, { color: "#ff4444" }]}>
            {errors.title}
          </Text>
        ) : null}
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          {t("description")} *
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: colors.background,
              borderColor: errors.description ? "#ff4444" : colors.border,
              color: colors.text,
            },
          ]}
          value={formData.description}
          onChangeText={(value) => onFieldChange("description", value)}
          placeholder={t("orderDescriptionPlaceholder")}
          placeholderTextColor={colors.tabIconDefault}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        {errors.description ? (
          <Text style={[styles.errorText, { color: "#ff4444" }]}>
            {errors.description}
          </Text>
        ) : null}
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          {t("budget")} (USD) *
        </Text>
        {selectedService ? (
          <Text style={[styles.budgetSuggestion, { color: colors.tint }]}>
            {t("budgetSuggestionNote")} {t("youCanChangeThis")}
          </Text>
        ) : (
          <Text
            style={[styles.budgetSuggestion, { color: colors.tabIconDefault }]}
          >
            {t("selectServiceFirstForBudgetSuggestion")}
          </Text>
        )}
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.background,
              borderColor: errors.budget ? "#ff4444" : colors.border,
              color: colors.text,
            },
          ]}
          value={formData.budget}
          onChangeText={(value) => onFieldChange("budget", value)}
          placeholder={
            selectedService
              ? `${selectedService.averagePrice || 0}`
              : t("budgetPlaceholder")
          }
          placeholderTextColor={colors.tabIconDefault}
          keyboardType="numeric"
          editable={!!selectedService}
        />
        {errors.budget ? (
          <Text style={[styles.errorText, { color: "#ff4444" }]}>
            {errors.budget}
          </Text>
        ) : null}
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          {t("location")}
        </Text>

        {/* Location Display - Compact */}
        {selectedLocation ? (
          <View
            style={[
              styles.locationDisplayCompact,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.locationInfoCompact}>
              <IconSymbol
                name="location.fill"
                size={16}
                color={colors.primary}
              />
              <Text
                style={[styles.locationAddressCompact, { color: colors.text }]}
              >
                {selectedLocation.address}
              </Text>
              <TouchableOpacity
                style={[
                  styles.clearButtonCompact,
                  { backgroundColor: colors.error },
                ]}
                onPress={handleClearLocation}
              >
                <IconSymbol name="xmark" size={12} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Direct Map Access Button */}
        <TouchableOpacity
          style={[
            styles.mapAccessButton,
            {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
          ]}
          onPress={handleOpenMap}
        >
          <IconSymbol name="map" size={20} color="white" />
          <Text style={styles.mapAccessButtonText}>
            {selectedLocation ? t("changeLocation") : t("pinLocationOnMap")}
          </Text>
        </TouchableOpacity>

        {/* Manual Location Input */}
        <View style={styles.manualLocationContainer}>
          <Text
            style={[
              styles.manualLocationLabel,
              { color: colors.textSecondary },
            ]}
          >
            {t("orEnterManually")}
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={formData.location}
            onChangeText={(value) => onFieldChange("location", value)}
            placeholder={t("locationPlaceholder")}
            placeholderTextColor={colors.tabIconDefault}
          />
        </View>
      </View>

      {/* Map Modal */}
      <Modal
        visible={mapVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setMapVisible(false)}
      >
        <MapViewComponent
          initialLocation={selectedLocation || undefined}
          onLocationSelect={handleLocationSelect}
          onClose={() => setMapVisible(false)}
          showCurrentLocationButton={true}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 120,
  },
  budgetSuggestion: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  locationDisplayCompact: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  locationInfoCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationAddressCompact: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  clearButtonCompact: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mapAccessButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapAccessButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  manualLocationContainer: {
    marginTop: 8,
  },
  manualLocationLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontStyle: "italic",
  },
});
