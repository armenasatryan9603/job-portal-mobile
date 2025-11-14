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
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
});
