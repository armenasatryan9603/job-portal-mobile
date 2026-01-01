import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemeColors } from "@/constants/styles";

interface CountBadgeProps {
  count?: number;
  /**
   * Custom text to display instead of count. If provided, count is ignored.
   */
  text?: string;
  /**
   * Custom primary color for the badge. If not provided, uses theme primary color.
   */
  color?: string;
  /**
   * Custom background color. If not provided, uses primary color with 20% opacity.
   */
  backgroundColor?: string;
  /**
   * Custom text color. If not provided, uses primary color.
   */
  textColor?: string;
  /**
   * Show badge only if count is greater than 0. Default: true (only applies when using count, not text)
   */
  showOnlyIfPositive?: boolean;
  /**
   * Custom style for the badge container
   */
  style?: any;
  /**
   * Custom style for the text
   */
  textStyle?: any;
}

/**
 * Reusable count badge component to display item counts after titles or in headers.
 * Automatically uses theme colors if custom colors are not provided.
 */
export function CountBadge({
  count,
  text,
  color,
  backgroundColor,
  textColor,
  showOnlyIfPositive = true,
  style,
  textStyle,
}: CountBadgeProps) {
  const { isDark } = useTheme();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const primaryColor = color || colors.primary;
  const badgeBackgroundColor = backgroundColor || primaryColor + "20";
  const badgeTextColor = textColor || primaryColor;

  // If using count (not custom text), check if we should show
  if (
    text === undefined &&
    showOnlyIfPositive &&
    (count === undefined || count <= 0)
  ) {
    return null;
  }

  // Determine display text
  const displayText =
    text !== undefined ? text : count !== undefined ? String(count) : "";

  return (
    <View
      style={[styles.badge, { backgroundColor: badgeBackgroundColor }, style]}
    >
      <Text style={[styles.badgeText, { color: badgeTextColor }, textStyle]}>
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
