import { Spacing, ThemeColors, BorderRadius } from "@/constants/styles";
import { Header } from "@/components/Header";
import { router } from "expo-router";
import { ScrollView, useColorScheme, View, StyleSheet } from "react-native";
import { Layout } from "@/components/Layout";
import { useTranslation } from "@/contexts/TranslationContext";

const CalendarSkeleton = () => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  return (
    <Layout>
      <Header
        title={t("calendar")}
        showBackButton
        onBackPress={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.skeletonTopRow}>
          <View
            style={[
              styles.skeletonTitle,
              { backgroundColor: colors.border + "40" },
            ]}
          />
          <View style={styles.skeletonToggleGroup}>
            {[1, 2].map((i) => (
              <View
                key={`view-toggle-${i}`}
                style={[
                  styles.skeletonSquare,
                  { backgroundColor: colors.border + "30" },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.skeletonFilterRow}>
          {[1, 2].map((i) => (
            <View
              key={`filter-${i}`}
              style={[
                styles.skeletonPill,
                { backgroundColor: colors.border + "30" },
              ]}
            />
          ))}
        </View>

        <View
          style={[
            styles.skeletonMonthCard,
            { backgroundColor: colors.border + "30" },
          ]}
        />

        <View style={styles.skeletonCalendarGrid}>
          {Array.from({ length: 6 }).map((_, row) => (
            <View key={`row-${row}`} style={styles.skeletonCalendarRow}>
              {Array.from({ length: 7 }).map((_, col) => (
                <View
                  key={`cell-${row}-${col}`}
                  style={[
                    styles.skeletonDay,
                    { backgroundColor: colors.border + "35" },
                    col === 6 && { marginRight: 0 },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.skeletonLegend}>
          <View
            style={[
              styles.skeletonLine,
              { width: "35%", backgroundColor: colors.border + "40" },
            ]}
          />
          <View style={styles.skeletonLegendRow}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <View
                key={`legend-${idx}`}
                style={[
                  styles.skeletonLegendPill,
                  { backgroundColor: colors.border + "30" },
                ]}
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
