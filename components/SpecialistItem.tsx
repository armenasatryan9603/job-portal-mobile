import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { User } from "@/categories/api";
import { UserAvatar } from "./UserAvatar";

interface SpecialistItemProps {
  specialist: User;
  onAdd?: (userId: number) => void;
  onToggle?: (userId: number) => void;
  isSelected?: boolean;
  selectionMode?: boolean;
}

export const SpecialistItem = memo(
  ({
    specialist,
    onAdd,
    onToggle,
    isSelected,
    selectionMode,
  }: SpecialistItemProps) => {
    const { isDark } = useTheme();
    const colors = ThemeColors[isDark ? "dark" : "light"];

    const handlePress = () => {
      if (selectionMode && onToggle) {
        onToggle(specialist.id);
      } else if (onAdd) {
        onAdd(specialist.id);
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.searchResultItem,
          {
            backgroundColor: colors.background,
            borderColor: isSelected ? colors.tint : colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
        onPress={handlePress}
      >
        {selectionMode && (
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: isSelected ? colors.tint : "transparent",
                borderColor: isSelected ? colors.tint : colors.border,
              },
            ]}
          >
            {isSelected && (
              <IconSymbol name="checkmark" size={14} color="#fff" />
            )}
          </View>
        )}
        <UserAvatar user={specialist} size={50} />
        <View style={styles.peerInfo}>
          <Text style={[styles.peerName, { color: colors.text }]}>
            {specialist.name}
          </Text>
          {specialist.email && (
            <Text style={[styles.peerEmail, { color: colors.tabIconDefault }]}>
              {specialist.email}
            </Text>
          )}
        </View>
        {!selectionMode && (
          <IconSymbol name="plus.circle" size={24} color={colors.tint} />
        )}
      </TouchableOpacity>
    );
  }
);

SpecialistItem.displayName = "SpecialistItem";

const styles = StyleSheet.create({
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  peerInfo: {
    flex: 1,
  },
  peerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  peerEmail: {
    fontSize: 14,
    marginTop: 2,
  },
});
