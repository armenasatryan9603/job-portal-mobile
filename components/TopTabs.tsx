import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { ThemeColors, Spacing } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

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
        styles.container,
        compact && styles.containerCompact,
        {
          borderBottomColor: colors.border,
        },
      ]}
    >
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
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.xs,
  },
  tabCompact: {
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.xs / 2,
  },
  tabLabel: {
    fontSize: 16,
  },
  tabLabelCompact: {
    fontSize: 14,
  },
});
