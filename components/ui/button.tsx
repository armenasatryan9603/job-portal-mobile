import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  StyleProp,
} from "react-native";
import { IconSymbol } from "./icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";

export interface ButtonProps {
  onPress: () => void;
  title?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  icon?: string;
  iconSize?: number;
  iconPosition?: "left" | "right";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  backgroundColor?: string;
  textColor?: string;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = "primary",
  icon,
  iconSize = 16,
  iconPosition = "left",
  disabled = false,
  loading = false,
  style,
  textStyle,
  backgroundColor,
  textColor,
  children,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  // Determine button colors based on variant
  const getButtonColors = () => {
    let bg: string;
    let text: string;

    switch (variant) {
      case "primary":
        bg = backgroundColor || colors.tint;
        text = textColor || "#fff";
        break;
      case "secondary":
        bg = backgroundColor || colors.secondary;
        text = textColor || colors.textInverse;
        break;
      case "outline":
        bg = "transparent";
        text = textColor || colors.tint;
        break;
      case "ghost":
        bg = "transparent";
        text = textColor || colors.text;
        break;
      default:
        bg = backgroundColor || colors.tint;
        text = textColor || colors.textInverse;
    }

    return { bg, text };
  };

  const { bg, text } = getButtonColors();

  const buttonStyle: StyleProp<ViewStyle> = [
    styles.button,
    {
      backgroundColor: variant === "outline" ? "transparent" : bg,
      borderWidth: variant === "outline" ? 1 : 0,
      borderColor: variant === "outline" ? bg : "transparent",
      opacity: disabled || loading ? 0.6 : 1,
    },
    style,
  ];

  const finalTextStyle: StyleProp<TextStyle> = [
    styles.text,
    {
      color: variant === "outline" ? bg : text,
    },
    textStyle,
  ];

  const iconColor = textColor || (variant === "outline" ? bg : text);

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <IconSymbol name={icon as any} size={iconSize} color={iconColor} />
          )}
          {children || <Text style={finalTextStyle}>{title}</Text>}
          {icon && iconPosition === "right" && (
            <IconSymbol name={icon as any} size={iconSize} color={iconColor} />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
  },
});
