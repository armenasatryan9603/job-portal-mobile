import { Animated, ScrollView, StyleSheet, View, useColorScheme } from "react-native";
import { BorderRadius, Spacing, ThemeColors } from "@/constants/styles";
import { useEffect, useRef } from "react";

import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveContainer } from "@/components/ResponsiveContainer";
import { router } from "expo-router";
import { useTranslation } from "@/contexts/TranslationContext";

const CalendarSkeleton = () => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0.9],
  });

  const SkeletonBox = ({
    width,
    height,
    borderRadius = 8,
    style,
  }: {
    width?: number | string;
    height: number;
    borderRadius?: number;
    style?: any;
  }) => (
    <Animated.View
      style={[
        {
          width: width || "100%",
          height,
          borderRadius,
          backgroundColor: colors.backgroundSecondary,
          opacity,
        },
        style,
      ]}
    />
  );

  const header = <Header title={t("calendar")} showBackButton onBackPress={() => router.back()}/>

  return (
    <Layout header={header}>
      <ResponsiveContainer>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header row: title + 2 view-toggle buttons */}
          <View style={styles.skeletonTopRow}>
            <SkeletonBox height={20} width="50%" borderRadius={BorderRadius.md} />
            <View style={styles.skeletonToggleGroup}>
              {[1, 2].map((i) => (
                <SkeletonBox
                  key={`view-toggle-${i}`}
                  height={40}
                  width={40}
                  borderRadius={BorderRadius.md}
                />
              ))}
            </View>
          </View>

          {/* Filter tab row: 3 outline buttons with icon + label */}
          <View style={[styles.skeletonFilterCard, { borderColor: colors.border }]}>
            <View style={styles.skeletonFilterRow}>
              {[1, 2, 3].map((i) => (
                <View
                  key={`filter-${i}`}
                  style={[styles.skeletonFilterBtn, { borderColor: colors.border }]}
                >
                  <SkeletonBox height={12} width={12} borderRadius={4} />
                  <SkeletonBox height={11} width={44} borderRadius={4} />
                </View>
              ))}
            </View>
          </View>

          {/* Calendar card */}
          <View style={[styles.skeletonCalendarCard, { borderColor: colors.border }]}>

            {/* Header: prev button + month title + next button */}
            <View style={styles.skeletonCalendarHeader}>
              <SkeletonBox height={34} width={34} borderRadius={10} />
              <SkeletonBox height={16} width="40%" borderRadius={8} />
              <SkeletonBox height={34} width={34} borderRadius={10} />
            </View>

            {/* Day-name row with column separators */}
            <View style={styles.skeletonWeekRow}>
              {Array.from({ length: 7 }).map((_, col) => (
                <View
                  key={`hdr-${col}`}
                  style={[
                    styles.skeletonHeaderCell,
                    col < 6 && { borderRightWidth: 1, borderRightColor: colors.border },
                  ]}
                >
                  <SkeletonBox height={10} width={18} borderRadius={4} />
                </View>
              ))}
            </View>

            {/* Divider */}
            <View style={[styles.skeletonDivider, { backgroundColor: colors.border }]} />

            {/* Week rows */}
            {Array.from({ length: 6 }).map((_, row) => (
              <View
                key={`row-${row}`}
                style={[
                  styles.skeletonWeekRow,
                  row > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                {Array.from({ length: 7 }).map((_, col) => (
                  <View
                    key={`cell-${row}-${col}`}
                    style={[
                      styles.skeletonDayCell,
                      col < 6 && { borderRightWidth: 1, borderRightColor: colors.border },
                    ]}
                  >
                    <SkeletonBox height={38} width={38} borderRadius={19} />
                  </View>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.skeletonLegend}>
            <SkeletonBox
              height={12}
              width="35%"
              borderRadius={BorderRadius.sm}
              style={styles.skeletonLine}
            />
            <View style={styles.skeletonLegendRow}>
              {Array.from({ length: 4 }).map((_, idx) => (
                <SkeletonBox
                  key={`legend-${idx}`}
                  height={34}
                  width={80}
                  borderRadius={BorderRadius.md}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </ResponsiveContainer>
    </Layout>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingTop: 0
  },
  skeletonLine: {
    height: 12,
    borderRadius: BorderRadius.sm,
    marginBottom: 8,
  },
  skeletonTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  skeletonToggleGroup: {
    flexDirection: "row",
    gap: 8,
  },
  skeletonFilterCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  skeletonFilterRow: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
  },
  skeletonFilterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  skeletonCalendarCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  skeletonCalendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  skeletonWeekRow: {
    flexDirection: "row",
  },
  skeletonHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  skeletonDivider: {
    height: 1,
  },
  skeletonDayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  skeletonLegend: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  skeletonLegendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  skeletonLegendPill: {
    height: 34,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    minWidth: 80,
  },
});

export default CalendarSkeleton;
