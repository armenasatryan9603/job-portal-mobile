import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Button } from "./ui/button";
import { Category } from "@/categories/api";
import { IconSymbol } from "@/components/ui/icon-symbol";
import React from "react";
import { ThemeColors } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";

type ThemeColorsType = typeof ThemeColors;

interface ServicesSelectionModalProps {
  visible: boolean;
  availableServices: Category[];
  userServices: Category[];
  searchQuery: string;
  colors: ThemeColorsType["light"] | ThemeColorsType["dark"];
  onClose: () => void;
  onSave: () => void;
  onSearchChange: (query: string) => void;
  onToggleService: (category: Category) => void;
}

export const ServicesSelectionModal: React.FC<ServicesSelectionModalProps> = ({
  visible,
  availableServices,
  userServices,
  searchQuery,
  colors,
  onClose,
  onSave,
  onSearchChange,
  onToggleService,
}) => {
  const { t } = useTranslation();
  const filteredServices = availableServices.filter(
    (service) =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("selectYourSkills")}
          </Text>
            <Button
              variant="primary"
              title={t("save")}
              onPress={onSave}
            />
        </View>

        <View
          style={[styles.searchContainer, { borderBottomColor: colors.border }]}
        >
          <IconSymbol
            name="magnifyingglass"
            size={16}
            color={colors.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t("searchCategories")}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={onSearchChange}
          />
        </View>

        <ScrollView style={styles.content}>
          {filteredServices.map((service) => {
            const isSelected = userServices.some((s) => s.id === service.id);
            return (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceItem,
                  {
                    backgroundColor: isSelected
                      ? colors.primary + "20"
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => onToggleService(service)}
              >
                {service.imageUrl && (
                  <Image
                    source={{ uri: service.imageUrl }}
                    style={styles.serviceImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.serviceInfo}>
                  <Text style={[styles.serviceName, { color: colors.text }]}>
                    {service.name}
                  </Text>
                  {service.description && (
                    <Text
                      style={[
                        styles.serviceDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {service.description}
                    </Text>
                  )}
                  {service.averagePrice && (
                    <Text
                      style={[styles.servicePrice, { color: colors.primary }]}
                    >
                      ${service.averagePrice}/hour
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.selectionIndicator,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : "transparent",
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {isSelected && (
                    <IconSymbol name="checkmark" size={12} color={colors.textInverse} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  serviceDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 13,
    fontWeight: "500",
  },
  selectionIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
