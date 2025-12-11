import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { MapViewComponent } from "@/components/MapView";
import { Modal } from "react-native";
import { useTranslation } from "@/hooks/useTranslation";

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
  onFieldChange,
  onLocationChange,
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

      <View>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          {t("location")}
        </Text>

        {/* Manual Location Input with Map Shortcut */}
        <View>
          <View style={styles.manualLocationInputWrapper}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
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
              <IconSymbol name="map" size={16} color="white" />
            </TouchableOpacity>
          </View>
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
