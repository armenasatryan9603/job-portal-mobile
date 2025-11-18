/**
 * Comprehensive style constants for the Job Portal Mobile App
 * This file contains all reusable style constants organized by category
 */

import { Platform, StyleSheet } from "react-native";

// ============================================================================
// SPACING CONSTANTS
// ============================================================================

export const Spacing = {
  // Base spacing unit (8px)
  xs: 4, // 4px
  sm: 8, // 8px
  md: 12, // 12px
  lg: 16, // 16px
  xl: 20, // 20px
  xxl: 24, // 24px
  xxxl: 32, // 32px

  // Specific spacing
  container: 16, // Container padding
  card: 20, // Card padding
  section: 24, // Section spacing
  item: 12, // Item spacing
  button: 12, // Button padding
  input: 8, // Input padding
} as const;

// ============================================================================
// BORDER RADIUS CONSTANTS
// ============================================================================

export const BorderRadius = {
  xs: 4, // Small elements
  sm: 6, // Small buttons, tags
  md: 8, // Buttons, inputs
  lg: 12, // Cards, containers
  xl: 16, // Large cards
  xxl: 20, // Buttons, pills
  round: 50, // Circular elements
} as const;

// ============================================================================
// TYPOGRAPHY CONSTANTS
// ============================================================================

export const Typography = {
  // Font sizes
  xs: 11, // Small labels, badges
  sm: 12, // Small text, captions
  md: 13, // Default text
  lg: 14, // Body text
  xl: 16, // Large body text
  xxl: 18, // Headings
  xxxl: 20, // Section titles
  xxxxl: 22, // Page titles
  xxxxxl: 24, // Hero titles
  xxxxxxl: 28, // Large hero titles

  // Font weights
  light: "300" as const,
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,

  // Line heights
  tight: 1.2,
  relaxed: 1.6,
  loose: 1.8,

  // Additional line height values
  lineHeightTight: 1.2,
  lineHeightNormal: 1.4,
  lineHeightRelaxed: 1.6,
  lineHeightLoose: 1.8,
} as const;

// ============================================================================
// COMPONENT SIZES
// ============================================================================

export const ComponentSizes = {
  // Button heights
  button: {
    sm: 32, // Small buttons
    md: 40, // Default buttons
    lg: 44, // Large buttons
    xl: 48, // Extra large buttons
  },

  // Input heights
  input: {
    sm: 36, // Small inputs
    md: 44, // Default inputs
    lg: 48, // Large inputs
  },

  // Icon sizes
  icon: {
    xs: 12, // Small icons
    sm: 14, // Default icons
    md: 16, // Medium icons
    lg: 20, // Large icons
    xl: 24, // Extra large icons
    xxl: 30, // Hero icons
  },

  // Avatar sizes
  avatar: {
    sm: 40, // Small avatars
    md: 60, // Default avatars
    lg: 70, // Large avatars
    xl: 100, // Extra large avatars
  },

  // Card dimensions
  card: {
    minHeight: 80,
    maxWidth: 600,
  },
} as const;

// ============================================================================
// SHADOW CONSTANTS
// ============================================================================

export const Shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },

  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

// Theme-aware shadow functions
export const createThemeShadow = (isDark: boolean, elevation: number = 2) => {
  const shadowColor = isDark
    ? ThemeColors.dark.shadow
    : ThemeColors.light.shadow;
  const shadowOpacity = isDark
    ? 0.6 + elevation * 0.15
    : 0.25 + elevation * 0.1;

  return {
    shadowColor,
    shadowOffset: { width: 0, height: elevation / 1.5 },
    shadowOpacity,
    shadowRadius: elevation * 2,
    elevation: elevation * 4,
  };
};

// ============================================================================
// STATUS COLORS
// ============================================================================

export const StatusColors = {
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
  info: "#2196F3",
  primary: "#0a7ea4",
  secondary: "#6c757d",

  // Status specific
  open: "#4CAF50",
  inProgress: "#FF9800",
  completed: "#2196F3",
  cancelled: "#F44336",
  available: "#4CAF50",
  unavailable: "#9E9E9E",
} as const;

// ============================================================================
// THEME-AWARE COLORS
// ============================================================================

export const ThemeColors = {
  light: {
    // Background colors
    background: "#F5F5F5",
    backgroundSecondary: "#E8E8E8",
    backgroundTertiary: "#E0E0E0",
    surface: "#FFFFFF",
    surfaceSecondary: "#F8F9FA",

    // Text colors
    text: "#11181C",
    textSecondary: "#687076",
    textTertiary: "#9BA1A6",
    textInverse: "#FFFFFF",

    // Border colors
    border: "#787b82",
    borderSecondary: "#6B7280",
    borderTertiary: "#D1D5DB",

    // Interactive colors
    primary: "#0a7ea4",
    primaryHover: "#086A8A",
    primaryPressed: "#065A73",
    secondary: "#6c757d",
    secondaryHover: "#5A6268",
    secondaryPressed: "#495057",

    // Legacy colors for backward compatibility
    tint: "#0a7ea4",
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: "#0a7ea4",

    // Status colors (light mode)
    success: "#4CAF50",
    successLight: "#E8F5E8",
    warning: "#FF9800",
    warningLight: "#FFF3E0",
    error: "#F44336",
    errorLight: "#FFEBEE",
    info: "#2196F3",
    infoLight: "#E3F2FD",

    // Shadow colors
    shadow: "rgba(0, 0, 0, 0.1)",
    shadowLight: "rgba(0, 0, 0, 0.05)",
    shadowDark: "rgba(0, 0, 0, 0.2)",

    // Overlay colors
    overlay: "rgba(0, 0, 0, 0.5)",
    overlayLight: "rgba(0, 0, 0, 0.3)",
    overlayDark: "rgba(0, 0, 0, 0.7)",
  },

  dark: {
    // Background colors
    background: "#151718",
    backgroundSecondary: "#1F2937",
    backgroundTertiary: "#374151",
    surface: "#1F2937",
    surfaceSecondary: "#374151",

    // Text colors
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    textTertiary: "#6B7280",
    textInverse: "#11181C",

    // Border colors
    border: "#5a5a5e",
    borderSecondary: "#374151",
    borderTertiary: "#4B5563",

    // Interactive colors
    primary: "#0a7ea4",
    primaryHover: "#0D8BB8",
    primaryPressed: "#0B7A9F",
    secondary: "#6c757d",
    secondaryHover: "#7A8288",
    secondaryPressed: "#8B9399",

    // Legacy colors for backward compatibility
    tint: "#fff",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#fff",

    // Status colors (dark mode)
    success: "#4CAF50",
    successLight: "#1B5E20",
    warning: "#FF9800",
    warningLight: "#E65100",
    error: "#F44336",
    errorLight: "#B71C1C",
    info: "#2196F3",
    infoLight: "#0D47A1",

    // Shadow colors
    shadow: "rgba(0, 0, 0, 0.3)",
    shadowLight: "rgba(0, 0, 0, 0.2)",
    shadowDark: "rgba(0, 0, 0, 0.5)",

    // Overlay colors
    overlay: "rgba(0, 0, 0, 0.7)",
    overlayLight: "rgba(0, 0, 0, 0.5)",
    overlayDark: "rgba(0, 0, 0, 0.9)",
  },
} as const;

// ============================================================================
// COMMON STYLE PATTERNS
// ============================================================================

// Separate View and Text styles to avoid type conflicts
export const ViewStyles = StyleSheet.create({
  // Container patterns
  container: {
    flex: 1,
    width: "100%",
  },

  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  column: {
    flexDirection: "column",
  },

  // Spacing patterns
  gapXs: { gap: Spacing.xs },
  gapSm: { gap: Spacing.sm },
  gapMd: { gap: Spacing.md },
  gapLg: { gap: Spacing.lg },
  gapXl: { gap: Spacing.xl },

  // Margin patterns
  marginXs: { margin: Spacing.xs },
  marginSm: { margin: Spacing.sm },
  marginMd: { margin: Spacing.md },
  marginLg: { margin: Spacing.lg },
  marginXl: { margin: Spacing.xl },

  marginBottomXs: { marginBottom: Spacing.xs },
  marginBottomSm: { marginBottom: Spacing.sm },
  marginBottomMd: { marginBottom: Spacing.md },
  marginBottomLg: { marginBottom: Spacing.lg },
  marginBottomXl: { marginBottom: Spacing.xl },

  marginTopXs: { marginTop: Spacing.xs },
  marginTopSm: { marginTop: Spacing.sm },
  marginTopMd: { marginTop: Spacing.md },
  marginTopLg: { marginTop: Spacing.lg },
  marginTopXl: { marginTop: Spacing.xl },

  // Padding patterns
  paddingXs: { padding: Spacing.xs },
  paddingSm: { padding: Spacing.sm },
  paddingMd: { padding: Spacing.md },
  paddingLg: { padding: Spacing.lg },
  paddingXl: { padding: Spacing.xl },

  paddingHorizontalXs: { paddingHorizontal: Spacing.xs },
  paddingHorizontalSm: { paddingHorizontal: Spacing.sm },
  paddingHorizontalMd: { paddingHorizontal: Spacing.md },
  paddingHorizontalLg: { paddingHorizontal: Spacing.lg },
  paddingHorizontalXl: { paddingHorizontal: Spacing.xl },

  paddingVerticalXs: { paddingVertical: Spacing.xs },
  paddingVerticalSm: { paddingVertical: Spacing.sm },
  paddingVerticalMd: { paddingVertical: Spacing.md },
  paddingVerticalLg: { paddingVertical: Spacing.lg },
  paddingVerticalXl: { paddingVertical: Spacing.xl },

  // Button patterns
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
    minHeight: ComponentSizes.button.md,
    paddingHorizontal: Spacing.button,
    paddingVertical: Spacing.button,
  },

  buttonSm: {
    minHeight: ComponentSizes.button.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },

  buttonLg: {
    minHeight: ComponentSizes.button.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },

  buttonXl: {
    minHeight: ComponentSizes.button.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },

  // Input patterns
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.input,
    paddingVertical: Spacing.input,
    fontSize: Typography.lg,
    minHeight: ComponentSizes.input.md,
  },

  inputSm: {
    minHeight: ComponentSizes.input.sm,
    fontSize: Typography.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },

  inputLg: {
    minHeight: ComponentSizes.input.lg,
    fontSize: Typography.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },

  // Card patterns
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.card,
    margin: Spacing.lg,
    ...Shadows.md,
  },

  cardSm: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    margin: Spacing.md,
    ...Shadows.sm,
  },

  cardLg: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    margin: Spacing.xl,
    ...Shadows.lg,
  },

  // Tag patterns
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
  },

  tagSm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },

  tagLg: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
  },

  // Badge patterns
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },

  badgeSm: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },

  badgeLg: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },

  // Avatar patterns
  avatar: {
    width: ComponentSizes.avatar.md,
    height: ComponentSizes.avatar.md,
    borderRadius: BorderRadius.round,
  },

  avatarSm: {
    width: ComponentSizes.avatar.sm,
    height: ComponentSizes.avatar.sm,
    borderRadius: BorderRadius.round,
  },

  avatarLg: {
    width: ComponentSizes.avatar.lg,
    height: ComponentSizes.avatar.lg,
    borderRadius: BorderRadius.round,
  },

  avatarXl: {
    width: ComponentSizes.avatar.xl,
    height: ComponentSizes.avatar.xl,
    borderRadius: BorderRadius.round,
  },

  // Grid patterns
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  gridItem: {
    marginBottom: Spacing.md,
  },

  // Divider patterns
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginVertical: Spacing.lg,
  },

  dividerSm: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginVertical: Spacing.md,
  },

  dividerLg: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginVertical: Spacing.xl,
  },

  // Loading patterns
  loading: {
    opacity: 0.5,
  },

  disabled: {
    opacity: 0.5,
  },

  // Platform specific styles
  platformShadow: Platform.select({
    ios: {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
});

// Text-specific styles
export const TextStyles = StyleSheet.create({
  // Typography patterns
  textXs: {
    fontSize: Typography.xs,
    fontWeight: Typography.normal,
    lineHeight: 14,
  },

  textSm: {
    fontSize: Typography.sm,
    fontWeight: Typography.normal,
    lineHeight: 16,
  },

  textMd: {
    fontSize: Typography.md,
    fontWeight: Typography.normal,
    lineHeight: 18,
  },

  textLg: {
    fontSize: Typography.lg,
    fontWeight: Typography.normal,
    lineHeight: 20,
  },

  textXl: {
    fontSize: Typography.xl,
    fontWeight: Typography.normal,
    lineHeight: 22,
  },

  textBold: {
    fontWeight: Typography.bold,
  },

  textSemibold: {
    fontWeight: Typography.semibold,
  },

  textMedium: {
    fontWeight: Typography.medium,
  },

  // Title patterns
  titleXs: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
  },

  titleSm: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },

  titleMd: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
  },

  titleLg: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
  },

  titleXl: {
    fontSize: Typography.xl,
    fontWeight: Typography.semibold,
  },

  titleXxl: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
  },

  titleXxxl: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.bold,
  },

  titleXxxxl: {
    fontSize: Typography.xxxxl,
    fontWeight: Typography.bold,
  },

  // Section title pattern
  sectionTitle: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.bold,
    marginBottom: Spacing.lg,
  },
});

// Combined styles for backward compatibility
export const CommonStyles = {
  ...ViewStyles,
  ...TextStyles,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get responsive font size based on screen width
 */
export const getResponsiveFontSize = (
  baseSize: number,
  screenWidth: number
): number => {
  if (screenWidth < 375) return baseSize - 1; // Small phones
  if (screenWidth > 768) return baseSize + 1; // Tablets
  return baseSize;
};

/**
 * Get responsive spacing based on screen width
 */
export const getResponsiveSpacing = (
  baseSpacing: number,
  screenWidth: number
): number => {
  if (screenWidth < 375) return baseSpacing - 2; // Small phones
  if (screenWidth > 768) return baseSpacing + 2; // Tablets
  return baseSpacing;
};

/**
 * Create consistent shadow styles
 */
export const createShadow = (elevation: number, color: string = "#000") => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: elevation / 2 },
  shadowOpacity: 0.1 + elevation * 0.05,
  shadowRadius: elevation,
  elevation: elevation,
});

/**
 * Create theme-aware border styles
 */
export const createThemeBorder = (
  isDark: boolean,
  width: number = 1,
  variant: "primary" | "secondary" | "tertiary" = "primary"
) => {
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;
  const borderColor =
    variant === "primary"
      ? colors.border
      : variant === "secondary"
      ? colors.borderSecondary
      : colors.borderTertiary;

  return {
    borderWidth: width,
    borderColor,
  };
};

/**
 * Create consistent border styles (legacy)
 */
export const createBorder = (
  width: number = 1,
  color: string = "rgba(0,0,0,0.1)"
) => ({
  borderWidth: width,
  borderColor: color,
});

/**
 * Create theme-aware background styles
 */
export const createThemeBackground = (
  isDark: boolean,
  variant:
    | "primary"
    | "secondary"
    | "tertiary"
    | "surface"
    | "surfaceSecondary" = "primary"
) => {
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;
  const backgroundColor =
    variant === "primary"
      ? colors.background
      : variant === "secondary"
      ? colors.backgroundSecondary
      : variant === "tertiary"
      ? colors.backgroundTertiary
      : variant === "surface"
      ? colors.surface
      : colors.surfaceSecondary;

  return { backgroundColor };
};

/**
 * Create consistent background styles (legacy)
 */
export const createBackground = (color: string, opacity: number = 1) => ({
  backgroundColor:
    opacity < 1 ? `${color}${Math.round(opacity * 255).toString(16)}` : color,
});

/**
 * Create theme-aware text styles
 */
export const createThemeText = (
  isDark: boolean,
  variant: "primary" | "secondary" | "tertiary" | "inverse" = "primary"
) => {
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;
  const color =
    variant === "primary"
      ? colors.text
      : variant === "secondary"
      ? colors.textSecondary
      : variant === "tertiary"
      ? colors.textTertiary
      : colors.textInverse;

  return { color };
};

// ============================================================================
// EXPORT ALL CONSTANTS
// ============================================================================

export default {
  Spacing,
  BorderRadius,
  Typography,
  ComponentSizes,
  Shadows,
  StatusColors,
  ThemeColors,
  CommonStyles,
  getResponsiveFontSize,
  getResponsiveSpacing,
  createShadow,
  createThemeShadow,
  createBorder,
  createThemeBorder,
  createBackground,
  createThemeBackground,
  createThemeText,
};
