import React, { useState } from "react";
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "./ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";

interface LogoProps {
  size?: number; // Default: 40
  style?: ViewStyle;
  onPress?: () => void; // Optional navigation to home
  variant?: "default" | "small" | "large"; // Predefined sizes
}

const SIZE_VARIANTS = {
  small: 24,
  default: 40,
  large: 80,
};

export const Logo: React.FC<LogoProps> = ({
  size,
  style,
  onPress,
  variant = "default",
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const logoSize = size || SIZE_VARIANTS[variant];
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const logoContent = imageError ? (
    <View
      style={[
        styles.placeholder,
        { width: logoSize, height: logoSize, backgroundColor: colors.border },
      ]}
    >
      <IconSymbol
        name="photo"
        size={logoSize * 0.5}
        color={colors.tabIconDefault}
      />
    </View>
  ) : (
    <Image
      source={require("@/assets/images/icon.png")}
      style={[
        styles.image,
        { width: logoSize, height: logoSize },
        style as StyleProp<ImageStyle>,
      ]}
      resizeMode="contain"
      onError={handleImageError}
    />
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {logoContent}
      </TouchableOpacity>
    );
  }

  return <View style={style}>{logoContent}</View>;
};

const styles = StyleSheet.create({
  image: {
    width: 40,
    height: 40,
  },
  placeholder: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
