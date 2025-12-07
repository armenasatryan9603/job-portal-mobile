import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  ThemeColors,
  Shadows,
  BorderRadius,
  Spacing,
} from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface CalendarGridProps {
  currentMonth: Date;
  onMonthNavigate: (direction: "prev" | "next") => void;
  onDatePress?: (date: Date) => void;
  getDateIndicators?: (date: Date) => {
    colors?: string[];
    count?: number;
  };
  isDateSelected?: (date: Date) => boolean;
  renderDateContent?: (date: Date) => React.ReactNode;
  showMonthNavigation?: boolean;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentMonth,
  onMonthNavigate,
  onDatePress,
  getDateIndicators,
  isDateSelected,
  renderDateContent,
  showMonthNavigation = true,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const [containerWidth, setContainerWidth] = React.useState(0);
  const GAP = 4; // Gap between calendar days in pixels
  const dayWidth = containerWidth > 0 ? (containerWidth - 6 * GAP) / 7 : 0; // 7 days with 6 gaps between them

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }
    return days;
  };

  const normalizeDate = (date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const isToday = (date: Date): boolean => {
    const today = normalizeDate(new Date());
    const checkDate = normalizeDate(date);
    return today.toDateString() === checkDate.toDateString();
  };

  const days = getDaysInMonth(currentMonth);
  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <View style={styles.calendarContainer}>
      {showMonthNavigation && (
        <View
          style={[
            styles.monthNavigation,
            {
              backgroundColor: (colors as any).surface || colors.background,
              borderBottomColor: colors.border,
              ...Shadows.sm,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => onMonthNavigate("prev")}
            style={[
              styles.navButton,
              {
                backgroundColor: colors.tint + "15",
              },
            ]}
            activeOpacity={0.7}
          >
            <IconSymbol name="chevron.left" size={20} color={colors.tint} />
          </TouchableOpacity>
          <View style={styles.monthTitleContainer}>
            <Text style={[styles.monthTitle, { color: colors.text }]}>
              {currentMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onMonthNavigate("next")}
            style={[
              styles.navButton,
              {
                backgroundColor: colors.tint + "15",
              },
            ]}
            activeOpacity={0.7}
          >
            <IconSymbol name="chevron.right" size={20} color={colors.tint} />
          </TouchableOpacity>
        </View>
      )}

      {/* Day Headers */}
      <View
        style={styles.dayHeaders}
        onLayout={(e) => {
          if (containerWidth === 0) {
            setContainerWidth(e.nativeEvent.layout.width);
          }
        }}
      >
        {dayHeaders.map((day, index) => {
          const isLastInRow = index === 6;
          const headerStyle =
            dayWidth > 0
              ? { width: dayWidth, marginRight: isLastInRow ? 0 : GAP }
              : {};

          return (
            <View key={day} style={[styles.dayHeader, headerStyle]}>
              <Text
                style={[
                  styles.dayHeaderText,
                  {
                    color: colors.tabIconDefault,
                    fontWeight: "600",
                  },
                ]}
              >
                {day}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Calendar Grid */}
      <View
        style={styles.calendarGrid}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {days.map((date, index) => {
          const isLastInRow = index % 7 === 6; // 7th item in each row (0-indexed, so 6)
          const dayStyle =
            dayWidth > 0
              ? { width: dayWidth, marginRight: isLastInRow ? 0 : GAP }
              : {};

          if (!date) {
            return <View key={index} style={[styles.calendarDay, dayStyle]} />;
          }

          const selected = isDateSelected?.(date) || false;
          const today = isToday(date);
          const indicators = getDateIndicators?.(date);
          const hasIndicators =
            indicators && (indicators.colors?.length || 0) > 0;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.calendarDay,
                dayStyle,
                {
                  backgroundColor: selected
                    ? colors.tint
                    : today && hasIndicators
                    ? colors.tint + "15"
                    : "transparent",
                  borderColor: colors.border,
                  borderWidth: 1,
                },
                selected && {
                  borderColor: colors.tint,
                  borderWidth: 2,
                  ...Shadows.sm,
                },
                today &&
                  !selected && {
                    borderColor: colors.tint,
                    borderWidth: 1.5,
                  },
              ]}
              onPress={() => onDatePress?.(date)}
              activeOpacity={0.7}
              disabled={!onDatePress}
            >
              <View style={styles.calendarDayContent}>
                {renderDateContent ? (
                  renderDateContent(date)
                ) : (
                  <Text
                    style={[
                      styles.calendarDayText,
                      {
                        color: selected
                          ? colors.background
                          : today
                          ? colors.tint
                          : colors.text,
                        fontWeight: today || selected ? "700" : "500",
                      },
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                )}
                {indicators &&
                  indicators.colors &&
                  indicators.colors.length > 0 && (
                    <View style={styles.indicatorsContainer}>
                      {indicators.colors.slice(0, 3).map((color, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.indicator,
                            {
                              backgroundColor: color,
                              shadowColor: color,
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.3,
                              shadowRadius: 2,
                              elevation: 2,
                            },
                          ]}
                        />
                      ))}
                      {indicators.count && indicators.count > 3 && (
                        <View
                          style={[
                            styles.indicatorCountBadge,
                            { backgroundColor: colors.tint },
                          ]}
                        >
                          <Text
                            style={[
                              styles.indicatorCount,
                              { color: colors.background },
                            ]}
                          >
                            +{indicators.count - 3}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calendarContainer: {
    flex: 1,
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    borderBottomWidth: 0,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dayHeaders: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    paddingHorizontal: 0,
  },
  dayHeader: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  dayHeaderText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: Spacing.lg,
    paddingHorizontal: 0,
  },
  calendarDay: {
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    position: "relative",
    minHeight: 44,
  },
  calendarDayContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  calendarDayText: {
    fontSize: 15,
  },
  indicatorsContainer: {
    position: "absolute",
    bottom: 4,
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  indicatorCountBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
    minWidth: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  indicatorCount: {
    fontSize: 8,
    fontWeight: "700",
  },
});
