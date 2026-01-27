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
  success: "#16A34A",      // completed / payment success
  warning: "#F59E0B",      // in progress / attention
  error: "#EF4444",
  info: "#2196F3",
  primary: "#0A7EA4",
  secondary: "#4B5563",

  // Status specific
  open: "#22C55E",
  inProgress: "#F59E0B",
  completed: "#2563EB",
  cancelled: "#EF4444",
  available: "#4ADE80",
  unavailable: "#9CA3AF",
} as const;

// ============================================================================
// THEME-AWARE COLORS
// ============================================================================

export const ThemeColors = {
  light: {
    // Background colors
    background: "#F5F7FA",
    backgroundSecondary: "#EEF1F5",
    backgroundTertiary: "#E5E7EB",
    surface: "#FFFFFF",
    surfaceSecondary: "#F8FAFC",

    // Text colors
    text: "#0F172A",
    textSecondary: "#475569",
    textTertiary: "#94A3B8",
    textInverse: "#FFFFFF",

    // Border colors
    border: "#E2E8F0",
    borderSecondary: "#CBD5E1",
    borderTertiary: "#E5E7EB",

    // Interactive colors
    primary: "#0A7EA4",
    primaryHover: "#086A8A",
    primaryPressed: "#065A73",

    secondary: "#4B5563",
    secondaryHover: "#374151",
    secondaryPressed: "#1F2937",

    // Legacy
    tint: "#0A7EA4",
    icon: "#64748B",
    tabIconDefault: "#64748B",
    tabIconSelected: "#0A7EA4",

    // Status colors
    success: "#16A34A",
    successLight: "#DCFCE7",

    warning: "#F59E0B",
    warningLight: "#FEF3C7",

    error: "#EF4444",
    errorLight: "#FEE2E2",
    errorVariant: "#FF3B30",

    info: "#2563EB",
    infoLight: "#DBEAFE",

    // Semantic colors
    rating: "#FACC15",
    openNow: "#22C55E",
    danger: "#EF4444",
    link: "#2563EB",

    accent: "#6366F1",          // analytics / highlights
    accentSecondary: "#4F46E5", // controlled use

    orange: "#F59E0B",
    iosGray: "#8E8E93",

    // Shadows
    shadow: "rgba(15, 23, 42, 0.1)",
    shadowLight: "rgba(15, 23, 42, 0.05)",
    shadowDark: "rgba(15, 23, 42, 0.2)",

    // Overlay
    overlay: "rgba(15, 23, 42, 0.5)",
    overlayLight: "rgba(15, 23, 42, 0.3)",
    overlayDark: "rgba(15, 23, 42, 0.7)",
  },

  dark: {
    // Background colors
    background: "#0F172A",
    backgroundSecondary: "#1E293B",
    backgroundTertiary: "#334155",
    surface: "#1E293B",
    surfaceSecondary: "#334155",

    // Text colors
    text: "#E5E7EB",
    textSecondary: "#CBD5E1",
    textTertiary: "#94A3B8",
    textInverse: "#0F172A",

    // Border colors
    border: "#334155",
    borderSecondary: "#475569",
    borderTertiary: "#64748B",

    // Interactive colors
    primary: "#0A7EA4",
    primaryHover: "#0D8BB8",
    primaryPressed: "#0B7A9F",

    secondary: "#4B5563",
    secondaryHover: "#6B7280",
    secondaryPressed: "#9CA3AF",

    // Legacy
    tint: "#FFFFFF",
    icon: "#CBD5E1",
    tabIconDefault: "#CBD5E1",
    tabIconSelected: "#FFFFFF",

    // Status colors
    success: "#22C55E",
    successLight: "#14532D",

    warning: "#F59E0B",
    warningLight: "#78350F",

    error: "#EF4444",
    errorLight: "#7F1D1D",
    errorVariant: "#FF3B30",

    info: "#3B82F6",
    infoLight: "#1E3A8A",

    // Semantic colors
    rating: "#FACC15",
    openNow: "#22C55E",
    danger: "#EF4444",
    link: "#3B82F6",

    accent: "#6366F1",
    accentSecondary: "#4F46E5",

    orange: "#F59E0B",
    iosGray: "#9CA3AF",

    // Shadows
    shadow: "rgba(0, 0, 0, 0.4)",
    shadowLight: "rgba(0, 0, 0, 0.25)",
    shadowDark: "rgba(0, 0, 0, 0.6)",

    // Overlay
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
