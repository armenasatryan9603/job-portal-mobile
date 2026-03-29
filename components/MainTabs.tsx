import * as Haptics from "expo-haptics";

import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams, usePathname } from "expo-router";

import { IconSymbol } from "@/components/ui/icon-symbol";
import React from "react";
import { ThemeColors } from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useIsWeb } from "@/utils/isWeb";
import { useNavigation } from "@/contexts/NavigationContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useUnreadCount } from "@/contexts/UnreadCountContext";

export type MainTabsProps = {
  /** Web: left inset so the tab row lines up with main content (past sidebar). */
  contentInsetLeft?: number;
  /** Web: same max width as `Layout` main column. */
  contentMaxWidth?: number;
};

interface TabItem {
  name: string;
  title: string;
  icon: string;
  route: string;
}

/** Desktop web: slightly larger compact bar; narrow web uses native-style bottom bar */
const WEB_TAB_ICON_SIZE = 24;
const WEB_ACTION_ICON_SIZE = 24;

export const MainTabs: React.FC<MainTabsProps> = ({
  contentInsetLeft = 0,
  contentMaxWidth,
}) => {
  const isWeb = useIsWeb();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const pathname = usePathname();
  const { myOrders, myJobs } = useLocalSearchParams<{
    myOrders?: string;
    myJobs?: string;
  }>();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { toggleSidebar } = useNavigation();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();

  const tabs: TabItem[] = [
    {
      name: "index",
      title: t("general"),
      icon: "house.fill",
      route: "/",
    },
    {
      name: "categories",
      title: t("category"),
      icon: "square.grid.2x2.fill",
      route: "/categories",
    },
    {
      name: "orders",
      title: t("jobs"),
      icon: "list.bullet",
      route: "/orders",
    },
    {
      name: "specialists",
      title: t("specialist"),
      icon: "person.2.fill",
      route: "/specialists",
    },
    {
      name: "services",
      title: t("services"),
      icon: "briefcase.fill",
      route: "/services",
    },
  ];

  const isActive = (tab: TabItem) => {
    if (tab.name === "index") {
      return pathname === "/" || pathname === "/index";
    }
    if (tab.name === "orders") {
      if (pathname !== "/orders") return false;
      if (myOrders === "true" || myJobs === "true") return false;
      return true;
    }
    return pathname === tab.route;
  };

  const haptic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // no-op (web / unsupported)
    }
  };

  const handleTabPress = async (tab: TabItem) => {
    if (isActive(tab)) return;
    await haptic();
    router.push(tab.route as any);
  };

  const goNotifications = async () => {
    if (!isAuthenticated) return;
    await haptic();
    router.push("/notifications");
  };

  const goChat = async () => {
    if (!isAuthenticated) return;
    await haptic();
    router.push("/chat");
  };

  const actionIconSize = isWeb ? WEB_ACTION_ICON_SIZE : 22;

  const rightActions = isAuthenticated && (
    <View style={styles.rightActions}>
      <Pressable style={styles.iconButton} onPress={goNotifications}>
        <IconSymbol name="bell" size={actionIconSize} color={colors.text} />
        {unreadNotificationsCount > 0 && (
          <View
            style={[styles.badge, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.badgeText}>
              {unreadNotificationsCount > 99
                ? "99+"
                : unreadNotificationsCount}
            </Text>
          </View>
        )}
      </Pressable>

      <Pressable style={styles.iconButton} onPress={goChat}>
        <IconSymbol name="message" size={actionIconSize} color={colors.text} />
        {unreadMessagesCount > 0 && (
          <View
            style={[styles.badge, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.badgeText}>
              {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );

  if (isWeb) {
    /** Sidebar is z-index 999; anything in the left inset sits under it — keep the menu control in the main column. */
    const webColumnAlign =
      contentInsetLeft > 0 && contentMaxWidth != null
        ? ("flex-start" as const)
        : ("center" as const);

    return (
      <View
        style={[
          styles.webContainer,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={[styles.insetRow, { paddingLeft: contentInsetLeft }]}>
          <View
            style={[
              styles.maxWidthColumn,
              { alignSelf: webColumnAlign },
              contentMaxWidth != null
                ? { maxWidth: contentMaxWidth }
                : undefined,
            ]}
          >
            <View style={styles.webMainRow}>
              <Pressable
                style={styles.webSidebarButton}
                onPress={() => {
                  void haptic();
                  toggleSidebar();
                }}
                accessibilityRole="button"
                accessibilityLabel="Open menu"
              >
                <IconSymbol
                  name="line.3.horizontal"
                  size={WEB_ACTION_ICON_SIZE}
                  color={colors.text}
                />
              </Pressable>
              <View style={styles.webTabsRow}>
                {tabs.map((tab) => {
                  const active = isActive(tab);
                  return (
                    <Pressable
                      key={tab.name}
                      style={styles.webTab}
                      onPress={() => handleTabPress(tab)}
                    >
                      <IconSymbol
                        size={WEB_TAB_ICON_SIZE}
                        name={tab.icon as any}
                        color={active ? colors.tint : colors.tabIconDefault}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.webTabLabel,
                          {
                            color: active
                              ? colors.tint
                              : colors.tabIconDefault,
                          },
                        ]}
                      >
                        {tab.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {rightActions}
            </View>
          </View>
        </View>
      </View>
    );
  }

  /* iOS / Android: bottom tab bar */
  return (
    <View
      style={[
        styles.nativeContainer,
        { backgroundColor: colors.surface },
      ]}
    >
      <View
        style={[
          styles.nativeTabBar,
          { borderTopColor: colors.border },
        ]}
      >
        <View style={styles.nativeTabsRow}>
          {tabs.map((tab) => {
            const active = isActive(tab);
            const isMiddleTab = tab.name === "orders";

            if (isMiddleTab) {
              return (
                <Pressable
                  key={tab.name}
                  style={styles.nativeTab}
                  onPress={() => handleTabPress(tab)}
                >
                  <View style={styles.middleTabContainer}>
                    <View
                      style={[
                        styles.middleTabCircle,
                        {
                          // asdf
                          backgroundColor: active
                            ? colors.tint
                            : colors.surface,
                          borderWidth: active ? 0 : 1.5,
                          borderColor: active
                            ? "transparent"
                            : colors.border || "rgba(0,0,0,0.1)",
                          shadowOpacity: active ? 0.25 : 0.12,
                          shadowRadius: active ? 12 : 8,
                          elevation: active ? 12 : 6,
                          shadowOffset: {
                            width: 0,
                            height: active ? 6 : 4,
                          },
                        },
                      ]}
                    >
                      <IconSymbol
                        size={30}
                        name={tab.icon as any}
                        color={active ? colors.background : colors.tint}
                      />
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.nativeTabLabel,
                      {
                        color: active ? colors.tint : colors.tabIconDefault,
                        fontWeight: active ? "700" : "500",
                        fontSize: active ? 11 : 10,
                      },
                    ]}
                  >
                    {tab.title}
                  </Text>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={tab.name}
                style={styles.nativeTab}
                onPress={() => handleTabPress(tab)}
              >
                <IconSymbol
                  size={28}
                  name={tab.icon as any}
                  color={active ? colors.tint : colors.tabIconDefault}
                />
                <Text
                  style={[
                    styles.nativeTabLabel,
                    { color: active ? colors.tint : colors.tabIconDefault },
                  ]}
                >
                  {tab.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  webContainer: {
    width: "100%",
    borderBottomWidth: 1,
    zIndex: 11,
  },
  insetRow: {
    width: "100%",
  },
  maxWidthColumn: {
    width: "100%",
    alignSelf: "center",
  },
  webMainRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
    minHeight: 52,
  },
  webSidebarButton: {
    padding: 6,
    marginRight: 4,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  webTabsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    minWidth: 0,
  },
  webTab: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  webTabLabel: {
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "center",
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    marginLeft: 4,
  },
  iconButton: {
    position: "relative",
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
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
  nativeContainer: {
    position: "absolute",
    paddingBottom: Platform.OS === "ios" ? 0 : 15,
    left: 0,
    right: 0,
    zIndex: 11,
    bottom: 0,
  },
  nativeTabBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 20 : Platform.OS === "web" ? 0 : 30,
  },
  nativeTabsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    minWidth: 0,
  },
  nativeTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    justifyContent: "flex-end",
    position: "relative",
  },
  middleTabContainer: {
    height: 24,
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 8,
    overflow: "visible",
  },
  middleTabCircle: {
    width: 64,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    top: -20,
    shadowColor: "#000",
  },
  nativeTabLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 4,
  },
});
