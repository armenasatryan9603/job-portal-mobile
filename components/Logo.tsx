import React from "react";
import {
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import LogoFullSvg from "@/assets/images/logo-full.svg";
import LogoShortSvg from "@/assets/images/logo-short.svg";

interface LogoProps {
  size?: number; // Default: 40
  style?: ViewStyle;
  onPress?: () => void; // Optional navigation to home
  variant?: "default" | "small" | "large"; // Predefined sizes
  type?: "full" | "short"; // Logo type
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
  type = "short",
}) => {
  const logoSize = size || SIZE_VARIANTS[variant];

  // Calculate dimensions based on aspect ratio
  const aspectRatio = type === "full" ? 375 / 62.74 : 114 / 62;
  const logoHeight = logoSize;
  const logoWidth = logoSize * aspectRatio;

  const LogoComponent = type === "full" ? LogoFullSvg : LogoShortSvg;

  const logoContent = (
    <LogoComponent width={logoWidth} height={logoHeight} style={style} />
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {logoContent}
      </TouchableOpacity>
    );
  }

  return logoContent;
};
