import {
  BorderRadius,
  ComponentSizes,
  Spacing,
  ThemeColors,
  createThemeShadow,
} from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import React from "react";
import {
  Dimensions,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

const { width } = Dimensions.get("window");

interface ResponsiveContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  backgroundColor?: string;
  padding?: number;
  maxWidth?: number;
  centerContent?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  scrollable = true,
  backgroundColor,
  padding = 0,
  maxWidth = ComponentSizes.card.maxWidth, // Max width for tablet/desktop
  centerContent = true,
}) => {
  const { isDark } = useTheme();
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const bgColor = backgroundColor || colors.background;

  const containerStyle = {
    flex: 1,
    width: "100%" as const,
    backgroundColor: bgColor,
    padding,
    maxWidth: centerContent ? Math.min(width, maxWidth) : width,
    alignSelf: centerContent ? ("center" as const) : ("stretch" as const),
  };

  if (scrollable) {
    return (
      <ScrollView
        style={[styles.scrollView, { backgroundColor: bgColor }]}
        contentContainerStyle={[containerStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[containerStyle]}>{children}</View>;
};

// Responsive grid component
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode;
  columns?: number;
  spacing?: number;
  backgroundColor?: string;
}> = ({ children, columns = 2, spacing = Spacing.lg, backgroundColor }) => {
  const { isDark } = useTheme();
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const bgColor = backgroundColor || colors.background;

  const getColumns = () => {
    if (width < 600) return 1; // Mobile: 1 column
    if (width < 900) return 2; // Tablet: 2 columns
    return columns; // Desktop: custom columns
  };

  const actualColumns = getColumns();
  const itemWidth = (width - spacing * (actualColumns + 1)) / actualColumns;

  return (
    <View
      style={[
        { flexDirection: "row", flexWrap: "wrap" },
        { backgroundColor: bgColor },
      ]}
    >
      {React.Children.map(children, (child, index) => (
        <View
          style={[
            { marginBottom: Spacing.md },
            {
              width: itemWidth,
              marginRight: (index + 1) % actualColumns === 0 ? 0 : spacing,
              marginBottom: spacing,
            },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

// Responsive card component
export const ResponsiveCard: React.FC<{
  children: React.ReactNode;
  padding?: number;
  marginBlock?: number;
  marginHorizontal?: number;
  backgroundColor?: string;
  borderRadius?: number;
  shadow?: boolean;
  shadowElevation?: number;
  style?: StyleProp<ViewStyle>;
}> = ({
  children,
  padding = Spacing.md,
  marginBlock = Spacing.xs,
  marginHorizontal = Spacing.md,
  backgroundColor,
  borderRadius = BorderRadius.lg,
  shadow = true,
  shadowElevation = 6,
  style,
}) => {
  const { isDark } = useTheme();
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const bgColor = backgroundColor || colors.surface;

  return (
    <View
      style={[
        {
          backgroundColor: bgColor,
          padding,
          marginBlock,
          marginHorizontal,
          borderRadius,
          ...(shadow && createThemeShadow(isDark, shadowElevation)),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
});
