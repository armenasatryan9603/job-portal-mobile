import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { DateData } from "react-native-calendars";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ResponsiveCard } from "./ResponsiveContainer";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";

export interface MarkedDate {
  selected?: boolean;
  marked?: boolean;
  dotColor?: string;
  dots?: Array<{ key: string; color: string; selectedDotColor?: string }>;
  disabled?: boolean;
  disableTouchEvent?: boolean;
  selectedColor?: string;
  customStyles?: any;
}

export interface CalendarComponentProps {
  mode?: "single" | "multiple";
  selectedDates?: Date[];
  onDateSelect?: (dates: Date | Date[]) => void;
  markedDates?: { [date: string]: MarkedDate };
  minDate?: Date;
  maxDate?: Date;
  theme?: "light" | "dark";
  monthFormat?: string;
  onMonthChange?: (month: DateData) => void;
  hideDayNames?: boolean;
  hideArrows?: boolean;
  firstDay?: number;
  calendarProps?: any;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_ABBREVS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const CalendarComponent: React.FC<CalendarComponentProps> = ({
  mode = "single",
  selectedDates = [],
  onDateSelect,
  markedDates: customMarkedDates = {},
  minDate,
  maxDate,
  theme: themeOverride,
  onMonthChange,
  hideDayNames = false,
  hideArrows = false,
  firstDay = 1,
}) => {
  const colorScheme = useColorScheme();
  const effectiveTheme = themeOverride || colorScheme || "light";
  const colors = ThemeColors[effectiveTheme];

  const [displayDate, setDisplayDate] = useState(() => selectedDates[0] ?? new Date());

  const todayStr = formatDate(new Date());

  const selectedSet = useMemo(
    () => new Set(selectedDates.map(formatDate)),
    [selectedDates]
  );

  // Ordered day-name headers based on firstDay
  const dayHeaders = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => DAY_ABBREVS[(i + firstDay) % 7]);
  }, [firstDay]);

  // All cells for the visible month (nulls for padding)
  const calendarCells = useMemo(() => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = (firstOfMonth.getDay() - firstDay + 7) % 7;

    const cells: (Date | null)[] = Array(leadingBlanks).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [displayDate, firstDay]);

  const navigate = (direction: -1 | 1) => {
    const next = new Date(displayDate.getFullYear(), displayDate.getMonth() + direction, 1);
    setDisplayDate(next);
    onMonthChange?.({
      year: next.getFullYear(),
      month: next.getMonth() + 1,
      day: 1,
      dateString: formatDate(next),
      timestamp: next.getTime(),
    });
  };

  const handleDayPress = (date: Date) => {
    if (!onDateSelect) return;
    if (minDate && date < minDate) return;
    if (maxDate && date > maxDate) return;

    const dateStr = formatDate(date);
    const custom = customMarkedDates[dateStr];
    if (custom?.disabled || custom?.disableTouchEvent) return;

    if (mode === "single") {
      onDateSelect(date);
    } else {
      if (selectedSet.has(dateStr)) {
        onDateSelect(selectedDates.filter((d) => formatDate(d) !== dateStr));
      } else {
        onDateSelect([...selectedDates, date]);
      }
    }
  };

  return (
    <ResponsiveCard>
        {/* ── Header ── */}
        <View style={styles.header}>
          {!hideArrows ? (
            <TouchableOpacity
              onPress={() => navigate(-1)}
              style={[styles.navButton, { backgroundColor: colors.backgroundSecondary }]}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={16} color={colors.text} />
            </TouchableOpacity>
          ) : <View style={styles.navButton} />}

          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {MONTH_NAMES[displayDate.getMonth()]} {displayDate.getFullYear()}
          </Text>

          {!hideArrows ? (
            <TouchableOpacity
              onPress={() => navigate(1)}
              style={[styles.navButton, { backgroundColor: colors.backgroundSecondary }]}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.right" size={16} color={colors.text} />
            </TouchableOpacity>
          ) : <View style={styles.navButton} />}
        </View>

        {/* ── Day-name row ── */}
        {!hideDayNames && (
          <>
            <View style={[styles.weekRow, styles.weekHeaderRow]}>
              {dayHeaders.map((name, colIdx) => (
                <View
                  key={name}
                  style={[
                    styles.weekCell,
                    colIdx < 6 && { borderRightWidth: 1, borderRightColor: colors.border },
                  ]}
                >
                  <Text style={[styles.weekDayText, { color: colors.textSecondary }]}>
                    {name}
                  </Text>
                </View>
              ))}
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </>
        )}

        {/* ── Day grid (grouped into week rows) ── */}
        <View style={styles.grid}>
          {Array.from({ length: calendarCells.length / 7 }, (_, week) => (
            <View
              key={`week-${week}`}
              style={[
                styles.weekRow,
                week > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
            >
              {calendarCells.slice(week * 7, week * 7 + 7).map((date, dayIdx) => {
                const cellKey = date ? formatDate(date) : `blank-${week}-${dayIdx}`;
                const isLastCol = dayIdx === 6;

                if (!date) {
                  return (
                    <View
                      key={cellKey}
                      style={[
                        styles.cell,
                        !isLastCol && { borderRightWidth: 1, borderRightColor: colors.border },
                      ]}
                    />
                  );
                }

                const dateStr = formatDate(date);
                const isSelected = selectedSet.has(dateStr);
                const isToday = dateStr === todayStr;
                const custom = customMarkedDates[dateStr];
                const isDisabled =
                  !!(custom?.disabled || custom?.disableTouchEvent) ||
                  (!!minDate && date < minDate) ||
                  (!!maxDate && date > maxDate);

                const dots: Array<{ key: string; color: string; selectedDotColor?: string }> =
                  custom?.dots ??
                  (custom?.marked
                    ? [{ key: "default", color: custom.dotColor ?? colors.primary }]
                    : []);

                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[
                      styles.cell,
                      !isLastCol && { borderRightWidth: 1, borderRightColor: colors.border },
                    ]}
                    onPress={() => handleDayPress(date)}
                    disabled={isDisabled}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isSelected && { backgroundColor: custom?.selectedColor ?? colors.primary },
                        !isSelected && isToday && [styles.todayOutline, { borderColor: colors.primary }],
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          { color: isDisabled ? colors.textTertiary : colors.text },
                          isSelected && styles.dayTextSelected,
                          !isSelected && isToday && { color: colors.primary, fontWeight: "700" },
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </View>

                    {dots.length > 0 && (
                      <View style={styles.dotsRow}>
                        {dots.slice(0, 3).map((dot) => (
                          <View
                            key={dot.key}
                            style={[
                              styles.dot,
                              {
                                backgroundColor: isSelected
                                  ? (dot.selectedDotColor ?? "#fff")
                                  : dot.color,
                              },
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
    </ResponsiveCard>
  );
};

const CIRCLE = 38;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  weekRow: {
    flexDirection: "row",
  },
  weekHeaderRow: {
    marginBottom: 0,
  },
  divider: {
    height: 1,
    marginBottom: 0,
  },
  weekCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  grid: {},
  cell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  dayCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  todayOutline: {
    borderWidth: 1.5,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
