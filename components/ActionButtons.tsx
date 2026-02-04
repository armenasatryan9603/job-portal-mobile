import { StyleSheet, View } from "react-native";

import { Button } from "./ui/button";
import React from "react";
import { ResponsiveCard } from "./ResponsiveContainer";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";

export interface ActionButtonConfig {
  title: string;
  onPress: () => void;
  icon?: string;
  iconSize?: number;
  iconPosition?: "left" | "right";
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  backgroundColor?: string;
  textColor?: string;
}

export interface ActionButtonsProps {
  editButton?: ActionButtonConfig;
  deleteButton?: ActionButtonConfig;
  previewButton?: ActionButtonConfig;
  saveButton: ActionButtonConfig;
  showBorderTop?: boolean;
  singleButtonContainer?: boolean;
  wrapInCard?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  editButton,
  deleteButton,
  previewButton,
  saveButton,
  showBorderTop = false,
  singleButtonContainer = false,
  wrapInCard = true,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  const hasSecondaryButtons = !!(editButton || deleteButton || previewButton);

  const buttonsContent = (
    <View
      style={[
        styles.actionButtons,
        showBorderTop && { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 20 },
        singleButtonContainer && !hasSecondaryButtons && styles.singleButtonContainer,
      ]}
    >
        {editButton && (
          <Button
            variant={editButton.variant || "outline"}
            icon={editButton.icon || "pencil"}
            iconSize={editButton.iconSize || 16}
            iconPosition={editButton.iconPosition || "left"}
            title={editButton.title}
            onPress={editButton.onPress}
            backgroundColor={editButton.backgroundColor || colors.background}
            textColor={editButton.textColor || colors.text}
            disabled={editButton.disabled}
            loading={editButton.loading}
            style={{ flex: 1, maxWidth: '33%' }}
          />
        )}
        {deleteButton && (
          <Button
            variant={deleteButton.variant || "outline"}
            icon={deleteButton.icon || "trash"}
            iconSize={deleteButton.iconSize || 16}
            iconPosition={deleteButton.iconPosition || "left"}
            title={deleteButton.title}
            onPress={deleteButton.onPress}
            textColor={deleteButton.textColor || colors.errorVariant}
            disabled={deleteButton.disabled}
            loading={deleteButton.loading}
            style={{ flex: 1, maxWidth: '33%' }}
          />
        )}
        {previewButton && (
          <Button
            variant={previewButton.variant || "outline"}
            icon={previewButton.icon || "eye"}
            iconSize={previewButton.iconSize || 16}
            iconPosition={previewButton.iconPosition || "left"}
            title={previewButton.title}
            onPress={previewButton.onPress}
            backgroundColor={previewButton.backgroundColor}
            textColor={previewButton.textColor}
            disabled={previewButton.disabled}
            loading={previewButton.loading}
            style={{ flex: 1, maxWidth: '33%' }}
          />
        )}
        <Button
          style={{ minWidth: 80, flex: 1, maxWidth: '33%' }}
          onPress={saveButton.onPress}
          title={saveButton.title}
          variant={saveButton.variant || "primary"}
          backgroundColor={saveButton.backgroundColor || colors.primary}
          textColor={saveButton.textColor}
          disabled={saveButton.disabled}
          loading={saveButton.loading}
          icon={saveButton.icon}
          iconSize={saveButton.iconSize}
          iconPosition={saveButton.iconPosition}
        />
    </View>
  );

  if (wrapInCard) {
    return <ResponsiveCard>{buttonsContent}</ResponsiveCard>;
  }

  return buttonsContent;
};

const styles = StyleSheet.create({
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  singleButtonContainer: {
    justifyContent: "center",
  },
});
