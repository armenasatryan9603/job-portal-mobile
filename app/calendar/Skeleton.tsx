import { Spacing, ThemeColors, BorderRadius } from "@/constants/styles";
import { Header } from "@/components/Header";
import { router } from "expo-router";
import { ScrollView, useColorScheme, View, StyleSheet, Animated } from "react-native";
import { Layout } from "@/components/Layout";
import { useTranslation } from "@/contexts/TranslationContext";
import { useEffect, useRef } from "react";

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
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );

  return (
    <Layout>
      <Header
        title={t("calendar")}
        showBackButton
        onBackPress={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.skeletonTopRow}>
          <SkeletonBox
            height={22}
            width="55%"
            borderRadius={BorderRadius.md}
            style={styles.skeletonTitle}
          />
          <View style={styles.skeletonToggleGroup}>
            {[1, 2].map((i) => (
              <SkeletonBox
                key={`view-toggle-${i}`}
                height={44}
                width={44}
                borderRadius={BorderRadius.md}
              />
            ))}
          </View>
        </View>

        <View style={styles.skeletonFilterRow}>
          {[1, 2].map((i) => (
            <SkeletonBox
              key={`filter-${i}`}
              height={40}
              width={120}
              borderRadius={20}
            />
          ))}
        </View>

        <SkeletonBox
          height={74}
          width="100%"
          borderRadius={BorderRadius.lg}
          style={styles.skeletonMonthCard}
        />

        <View style={styles.skeletonCalendarGrid}>
          {Array.from({ length: 6 }).map((_, row) => (
            <View key={`row-${row}`} style={styles.skeletonCalendarRow}>
              {Array.from({ length: 7 }).map((_, col) => (
                <SkeletonBox
                  key={`cell-${row}-${col}`}
                  height={44}
                  borderRadius={BorderRadius.md}
                  style={[
                    styles.skeletonDay,
                    col === 6 && { marginRight: 0 },
                  ]}
                />
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
    </Layout>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: Spacing.md,
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
  skeletonTitle: {
    height: 22,
    borderRadius: BorderRadius.md,
    width: "55%",
  },
  skeletonToggleGroup: {
    flexDirection: "row",
    gap: 10,
  },
  skeletonSquare: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
  },
  skeletonFilterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: Spacing.lg,
  },
  skeletonPill: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    minWidth: 120,
  },
  skeletonMonthCard: {
    height: 74,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  skeletonCalendarGrid: {
    marginBottom: Spacing.lg,
  },
  skeletonCalendarRow: {
    flexDirection: "row",
    marginBottom: Spacing.xs,
  },
  skeletonDay: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    marginRight: 6,
    minHeight: 44,
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
