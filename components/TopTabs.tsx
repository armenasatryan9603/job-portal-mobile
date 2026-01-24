import * as Haptics from "expo-haptics";

import { Spacing, ThemeColors } from "@/constants/styles";
import { StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native";

import { Platform } from "react-native";
import React from "react";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface Tab {
  key: string;
  label: string;
}

interface TopTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  tabStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export const TopTabs: React.FC<TopTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  style,
  compact = false,
  tabStyle,
  labelStyle,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  const handleTabPress = (tabKey: string) => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onTabChange(tabKey);
  };

  return (
      <View
        style={[
          styles.tabsContainer,
          compact && styles.tabsContainerCompact,
          {
            backgroundColor: colors.background,
          },
          style,
        ]}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                compact && styles.tabCompact,
                tabStyle,
                isActive && {
                  borderBottomColor: colors.tint,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabLabel,
                  compact && styles.tabLabelCompact,
                  labelStyle,
                  {
                    color: isActive ? colors.tint : colors.tabIconDefault,
                    fontWeight: isActive ? "700" : "500",
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    marginBottom: Spacing.xs / 2,
  },
  containerCompact: {
    marginBottom: Spacing.xs / 4,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
  },
  tabsContainerCompact: {
    paddingHorizontal: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.xs,
  },
  tabCompact: {
    marginHorizontal: Spacing.xs / 2,
  },
  tabLabel: {
    fontSize: 16,
  },
  tabLabelCompact: {
    fontSize: 14,
  },
});
