import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/hooks/useTranslation";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

interface TabItem {
  name: string;
  title: string;
  icon: string;
  route: string;
}

export const FooterTabs: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const pathname = usePathname();
  const { myOrders, myJobs } = useLocalSearchParams<{
    myOrders?: string;
    myJobs?: string;
  }>();
  const { t } = useTranslation();

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
      icon: "gearshape.fill",
      route: "/categories",
    },
    {
      name: "orders",
      title: t("orders"),
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
      // Orders tab is not active when viewing My Orders or My Jobs
      if (pathname !== "/orders") return false;
      if (myOrders === "true" || myJobs === "true") return false;
      return true;
    }
    return pathname === tab.route;
  };

  const handleTabPress = (tab: TabItem) => {
    // If user taps the already-active tab, do nothing.
    if (isActive(tab)) return;

    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(tab.route as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabBar, { borderTopColor: colors.border }]}>
        {tabs.map((tab) => {
          const active = isActive(tab);
          const isMiddleTab = tab.name === "orders";

          if (isMiddleTab) {
            return (
              <Pressable
                key={tab.name}
                style={styles.tab}
                onPress={() => handleTabPress(tab)}
              >
                <View style={styles.middleTabContainer}>
                  <View
                    style={[
                      styles.middleTabCircle,
                      {
                        backgroundColor: active
                          ? colors.tint
                          : colors.background,
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
                    styles.tabLabel,
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
              style={styles.tab}
              onPress={() => handleTabPress(tab)}
            >
              <IconSymbol
                size={28}
                name={tab.icon as any}
                color={active ? colors.tint : colors.tabIconDefault}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: active ? colors.tint : colors.tabIconDefault,
                  },
                ]}
              >
                {tab.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    paddingBottom: Platform.OS === "ios" ? 0 : 15,
    left: 0,
    right: 0,
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingBottom: 20,
  },
  tab: {
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
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 4,
  },
});
