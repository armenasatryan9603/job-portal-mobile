import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemeColors, Typography } from "@/constants/styles";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { MapViewComponent } from "@/components/MapView";
import { Modal } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/hooks/useTranslation";

interface BasicInformationFormProps {
  formData: {
    title?: string;
    name?: string;
    description: string;
    budget?: string;
    location: string;
  };
  errors: {
    title?: string;
    name?: string;
    description: string;
    budget?: string;
    location: string;
  };
  onFieldChange: (field: string, value: string) => void;
  onLocationChange?: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  titleLabel?: string;
  titlePlaceholder?: string;
}

export const BasicInformationForm: React.FC<BasicInformationFormProps> = ({
  formData,
  errors,
  onFieldChange,
  onLocationChange,
  titleLabel,
  titlePlaceholder,
}) => {
  const { t } = useTranslation();
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

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t("basicInformation")}
      </Text>

      {(formData.title !== undefined || formData.name !== undefined) && (
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>
            {titleLabel || t("jobTitle")} *
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.background,
                borderColor: (errors.title || errors.name) ? colors.error : colors.border,
                color: colors.text,
              },
            ]}
            value={formData.title || formData.name || ""}
            onChangeText={(value) => onFieldChange(formData.title !== undefined ? "title" : "name", value)}
            placeholder={titlePlaceholder || t("orderTitlePlaceholder")}
            placeholderTextColor={colors.tabIconDefault}
          />
          {(errors.title || errors.name) ? (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errors.title || errors.name}
            </Text>
          ) : null}
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          {t("description")} *
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: colors.background,
              borderColor: errors.description ? colors.error : colors.border,
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
          {t("location")} *
        </Text>

        {/* Manual Location Input with Map Shortcut */}
        <View>
          <View style={styles.manualLocationInputWrapper}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  borderColor: errors.location ? colors.error : colors.border,
                  color: colors.text,
                  paddingRight: 48,
                },
              ]}
              value={formData.location}
              onChangeText={(value) => onFieldChange("location", value)}
              placeholder={t("locationPlaceholder")}
              placeholderTextColor={colors.tabIconDefault}
            />
            <TouchableOpacity
              style={[
                styles.mapIconButton,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
              ]}
              onPress={handleOpenMap}
            >
              <IconSymbol name="map" size={16} color={'#fff'} />
            </TouchableOpacity>
          </View>
          {errors.location ? (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errors.location}
            </Text>
          ) : null}
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
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
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
  manualLocationInputWrapper: {
    position: "relative",
  },
  mapIconButton: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: [{ translateY: -16 }],
    borderWidth: 1,
    borderRadius: 6,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
