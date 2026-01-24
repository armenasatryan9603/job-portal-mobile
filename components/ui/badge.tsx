import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { IconSymbol } from "./icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { BorderRadius, Spacing, Typography } from "@/constants/styles";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "primary"
  | "secondary"
  | "pending"
  | "verified";

export interface BadgeProps {
  /**
   * Text content to display in the badge
   */
  text: string;
  /**
   * Badge variant that determines default colors
   */
  variant?: BadgeVariant;
  /**
   * Optional icon name (SF Symbols)
   */
  icon?: string | any;
  /**
   * Icon size (default: 12)
   */
  iconSize?: number;
  /**
   * Custom background color (overrides variant)
   */
  backgroundColor?: string;
  /**
   * Custom text color (overrides variant)
   */
  textColor?: string;
  /**
   * Custom icon color (overrides variant)
   */
  iconColor?: string;
  /**
   * Badge size: 'sm' | 'md' | 'lg'
   */
  size?: "sm" | "md" | "lg";
  /**
   * Custom style for the badge container
   */
  style?: ViewStyle;
  /**
   * Custom style for the text
   */
  textStyle?: TextStyle;
}

/**
 * Badge component for displaying status indicators, labels, and tags.
 * Supports multiple variants and custom styling.
 */
export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = "default",
  icon,
  iconSize = 12,
  backgroundColor,
  textColor,
  iconColor,
  size = "md",
  style,
  textStyle,
}) => {
  const { isDark } = useTheme();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  // Get variant colors
  const getVariantColors = () => {
    switch (variant) {
      case "success":
        return {
          bg: colors.success,
          text: colors.textInverse,
          icon: colors.textInverse,
        };
      case "warning":
        return {
          bg: colors.warning,
          text: colors.textInverse,
          icon: colors.textInverse,
        };
      case "error":
        return {
          bg: colors.error,
          text: colors.textInverse,
          icon: colors.textInverse,
        };
      case "info":
        return {
          bg: colors.info,
          text: colors.textInverse,
          icon: colors.textInverse,
        };
      case "primary":
        return {
          bg: colors.primary,
          text: colors.textInverse,
          icon: colors.textInverse,
        };
      case "secondary":
        return {
          bg: colors.secondary,
          text: colors.textInverse,
          icon: colors.textInverse,
        };
      case "pending":
        return {
          bg: colors.orange,
          text: colors.textInverse,
          icon: colors.textInverse,
        };
      case "verified":
        return {
          bg: colors.success,
          text: colors.textInverse,
          icon: colors.textInverse,
        };
      default:
        return {
          bg: colors.backgroundSecondary,
          text: colors.text,
          icon: colors.text,
        };
    }
  };

  const variantColors = getVariantColors();
  const finalBgColor = backgroundColor || variantColors.bg;
  const finalTextColor = textColor || variantColors.text;
  const finalIconColor = iconColor || variantColors.icon;

  // Size-based styles
  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          paddingHorizontal: Spacing.xs + 2,
          paddingVertical: 2,
          fontSize: Typography.xs,
          gap: 4,
        };
      case "lg":
        return {
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.xs,
          fontSize: Typography.sm,
          gap: 6,
        };
      default: // md
        return {
          paddingHorizontal: Spacing.sm + 2,
          paddingVertical: 4,
          fontSize: Typography.sm,
          gap: 6,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: finalBgColor,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
          borderRadius: BorderRadius.xxl,
        },
        style,
      ]}
    >
      {icon && (
        <IconSymbol
          name={icon as any}
          size={iconSize || sizeStyles.fontSize}
          color={finalIconColor}
        />
      )}
      <Text
        style={[
          styles.badgeText,
          {
            color: finalTextColor,
            fontSize: sizeStyles.fontSize,
          },
          textStyle,
        ]}
      >
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  badgeText: {
    fontWeight: Typography.semibold,
  },
});
