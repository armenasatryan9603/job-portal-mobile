import { IconSymbol } from "@/components/ui/icon-symbol";
import { ComponentSizes, Spacing, ThemeColors } from "@/constants/styles";
import { useNavigation } from "@/contexts/NavigationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  centerTitle?: boolean;
  backgroundColor?: string;
  showNotificationsButton?: boolean;
  showChatButton?: boolean;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  leftComponent,
  rightComponent,
  centerTitle = true,
  backgroundColor,
  showNotificationsButton = false,
  showChatButton = false,
  unreadNotificationsCount = 0,
  unreadMessagesCount = 0,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const bgColor = backgroundColor || colors.background;
  const { toggleSidebar } = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.content}>
        {/* Left side - Back button, left component, sidebar button, or empty space */}
        <View style={styles.leftSection}>
          {leftComponent ? (
            leftComponent
          ) : showBackButton ? (
            <TouchableOpacity onPress={onBackPress}>
              <IconSymbol
                name="chevron.left"
                size={Platform.OS === "android" ? 34 : 20}
                color={colors.text}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={toggleSidebar}>
              <IconSymbol
                name="line.3.horizontal"
                size={Platform.OS === "android" ? 32 : 28}
                color={colors.text}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Center - Title */}
        <View style={[styles.centerSection, centerTitle && styles.centerTitle]}>
          {title && (
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text
              style={[styles.subtitle, { color: colors.tabIconDefault }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.rightSection}>
          {rightComponent ? (
            rightComponent
          ) : (
            <View style={styles.rightButtonsContainer}>
              {showNotificationsButton && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => router.push("/notifications")}
                >
                  <IconSymbol
                    name="bell"
                    size={Platform.OS === "android" ? 24 : 20}
                    color={colors.text}
                  />
                  {unreadNotificationsCount > 0 && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {unreadNotificationsCount > 99
                          ? "99+"
                          : unreadNotificationsCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              {showChatButton && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => router.push("/chat")}
                >
                  <IconSymbol
                    name="message"
                    size={Platform.OS === "android" ? 24 : 20}
                    color={colors.text}
                  />
                  {unreadMessagesCount > 0 && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.container,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: ComponentSizes.button.lg,
    paddingBottom: Spacing.sm,
  },
  leftSection: {
    flex: 1,
    alignItems: "flex-start",
  },
  centerSection: {
    flex: 2,
    alignItems: "flex-start",
    paddingHorizontal: Spacing.md,
  },
  centerTitle: {
    alignItems: "center",
  },
  rightSection: {
    flex: 1,
    alignItems: "flex-end",
  },
  rightButtonsContainer: {
    flexDirection: "row",
    gap: 16,
  },
  iconButton: {
    position: "relative",
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
});
