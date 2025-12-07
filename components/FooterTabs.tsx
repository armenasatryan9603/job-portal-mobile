import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/hooks/useTranslation";
import * as Haptics from "expo-haptics";
import { router, usePathname } from "expo-router";
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
  const { t } = useTranslation();

  const tabs: TabItem[] = [
    {
      name: "index",
      title: t("home"),
      icon: "house.fill",
      route: "/",
    },
    {
      name: "services",
      title: t("service"),
      icon: "gearshape.fill",
      route: "/services",
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
      name: "teams",
      title: t("teams"),
      icon: "person.3.fill",
      route: "/teams",
    },
  ];

  const handleTabPress = (tab: TabItem) => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(tab.route as any);
  };

  const isActive = (tab: TabItem) => {
    if (tab.name === "index") {
      return pathname === "/" || pathname === "/index";
    }
    return pathname === tab.route;
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
