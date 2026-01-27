import { BorderRadius, Spacing, ThemeColors } from "@/constants/styles";
import { StyleSheet, View } from "react-native";

import React from "react";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface CheckInModalSkeletonProps {
  showCalendar?: boolean;
  showSpecialists?: boolean;
  showSummary?: boolean;
}

export const CheckInSpecialistsSkeleton: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  return (
    <View style={styles.specialistsSkeletonContainer}>
      {/* Title line */}
      <View
        style={[
          styles.line,
          {
            height: 20,
            width: "40%",
            backgroundColor: colors.border + "40",
            marginBottom: Spacing.md,
          },
        ]}
      />

      {/* Specialist chips */}
      <View style={styles.specialistsRow}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View
            key={`specialist-skeleton-${index}`}
            style={[
              styles.specialistCard,
              { borderColor: colors.border, backgroundColor: colors.border + "20" },
            ]}
          >
            <View
              style={[
                styles.specialistAvatar,
                { backgroundColor: colors.border + "40" },
              ]}
            />
            <View style={styles.specialistTextContainer}>
              <View
                style={[
                  styles.line,
                  {
                    width: "80%",
                    backgroundColor: colors.border + "40",
                    marginBottom: 6,
                  },
                ]}
              />
              <View
                style={[
                  styles.line,
                  {
                    width: "50%",
                    backgroundColor: colors.border + "30",
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const CheckInModalSkeleton: React.FC<CheckInModalSkeletonProps> = ({
  showCalendar = true,
  showSpecialists = true,
  showSummary = true,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  return (
    <View style={styles.container}>
      {showCalendar && (
        <View style={styles.section}>
          {/* Section title + description */}
          <View style={{ marginBottom: Spacing.md }}>
            <View
              style={[
                styles.line,
                {
                  width: "35%",
                  backgroundColor: colors.border + "40",
                  marginBottom: 8,
                },
              ]}
            />
            <View
              style={[
                styles.line,
                {
                  width: "60%",
                  backgroundColor: colors.border + "30",
                },
              ]}
            />
          </View>

          {/* Month header */}
          <View
            style={[
              styles.monthHeader,
              { backgroundColor: colors.border + "30" },
            ]}
          />

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {Array.from({ length: 6 }).map((_, row) => (
              <View key={`row-${row}`} style={styles.calendarRow}>
                {Array.from({ length: 7 }).map((__, col) => (
                  <View
                    key={`cell-${row}-${col}`}
                    style={[
                      styles.dayCell,
                      { backgroundColor: colors.border + "25" },
                      col === 6 && { marginRight: 0 },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Legend */}
          <View style={styles.legendContainer}>
            <View
              style={[
                styles.line,
                {
                  width: "40%",
                  backgroundColor: colors.border + "35",
                  marginBottom: Spacing.sm,
                },
              ]}
            />
            <View style={styles.legendRow}>
              {Array.from({ length: 2 }).map((_, idx) => (
                <View
                  key={`legend-${idx}`}
                  style={[
                    styles.legendPill,
                    { backgroundColor: colors.border + "25" },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      )}

      {showSpecialists && (
        <View style={styles.section}>
          <CheckInSpecialistsSkeleton />
        </View>
      )}

      {showSummary && (
        <View style={styles.section}>
          {/* Time range summary / footer skeleton */}
          <View
            style={[
              styles.line,
              {
                width: "50%",
                backgroundColor: colors.border + "40",
                marginBottom: Spacing.sm,
              },
            ]}
          />
          <View
            style={[
              styles.line,
              {
                width: "70%",
                backgroundColor: colors.border + "30",
                marginBottom: Spacing.md,
              },
            ]}
          />
          <View style={styles.summaryRow}>
            {Array.from({ length: 2 }).map((_, idx) => (
              <View
                key={`summary-pill-${idx}`}
                style={[
                  styles.summaryPill,
                  { backgroundColor: colors.border + "25" },
                ]}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  line: {
    height: 12,
    borderRadius: BorderRadius.sm,
  },
  monthHeader: {
    height: 40,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  calendarGrid: {
    marginBottom: Spacing.md,
  },
  calendarRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    marginRight: 6,
    minHeight: 36,
  },
  legendContainer: {
    paddingTop: Spacing.sm,
  },
  legendRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  legendPill: {
    height: 28,
    borderRadius: BorderRadius.md,
    minWidth: 80,
  },
  specialistsSkeletonContainer: {
    paddingVertical: Spacing.sm,
  },
  specialistsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  specialistCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    minWidth: 140,
  },
  specialistAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  specialistTextContainer: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  summaryPill: {
    height: 32,
    borderRadius: BorderRadius.lg,
    minWidth: 100,
  },
});

export default CheckInModalSkeleton;

