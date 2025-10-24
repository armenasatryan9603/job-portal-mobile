import {
  ComponentSizes,
  Shadows,
  Spacing,
  StatusColors,
  ThemeColors,
  ViewStyles,
} from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import {
  DimensionValue,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface FooterProps {
  children?: React.ReactNode;
  backgroundColor?: string;
  showBorder?: boolean;
  padding?: number;
}

export const Footer: React.FC<FooterProps> = ({
  children,
  backgroundColor,
  showBorder = true,
  padding = Spacing.xl,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const bgColor = backgroundColor || colors.background;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          padding,
          borderTopWidth: showBorder ? 1 : 0,
          borderTopColor: showBorder ? "rgba(0,0,0,0.1)" : "transparent",
        },
      ]}
    >
      <View
        style={[
          { flexDirection: "row", alignItems: "center" },
          { gap: Spacing.md },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

// Common footer components
export const FooterButton: React.FC<{
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  width?: DimensionValue;
  icon?: string;
}> = ({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  width,
  icon,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  const getButtonStyle = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: colors.tint,
          borderColor: colors.tint,
          ...Shadows.md,
        };
      case "secondary":
        return {
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderWidth: 1.5,
          ...Shadows.sm,
        };
      case "danger":
        return {
          backgroundColor: StatusColors.error,
          borderColor: StatusColors.error,
          ...Shadows.md,
        };
      default:
        return {
          backgroundColor: colors.tint,
          borderColor: colors.tint,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "primary":
      case "danger":
        return colors.background;
      case "secondary":
        return colors.text;
      default:
        return colors.background;
    }
  };

  return (
    <TouchableOpacity
      style={[
        ViewStyles.button,
        getButtonStyle(),
        disabled && ViewStyles.disabled,
        width ? { width } : null,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {icon && (
        <Text style={[styles.buttonIcon, { color: getTextColor() }]}>
          {icon}
        </Text>
      )}
      <Text style={[styles.buttonText, { color: getTextColor() }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export const FooterText: React.FC<{
  text: string;
  onPress?: () => void;
  color?: string;
}> = ({ text, onPress, color }) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const textColor = color || colors.text;

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress}>
        <Text style={[styles.footerText, { color: textColor }]}>{text}</Text>
      </TouchableOpacity>
    );
  }

  return <Text style={[styles.footerText, { color: textColor }]}>{text}</Text>;
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === "ios" ? Spacing.xxl : Spacing.md,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  buttonIcon: {
    fontSize: ComponentSizes.icon.md,
    fontWeight: "600",
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  footerText: {
    fontSize: 14,
    textAlign: "center",
    marginVertical: Spacing.sm,
  },
});
