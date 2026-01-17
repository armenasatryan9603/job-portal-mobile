import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { Calendar, CalendarProps, DateData } from "react-native-calendars";
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
  /**
   * Mode: 'single' for single date, 'multiple' for multi-select
   */
  mode?: "single" | "multiple";

  /**
   * Currently selected date(s) as Date objects
   */
  selectedDates?: Date[];

  /**
   * Callback when date is selected
   */
  onDateSelect?: (dates: Date | Date[]) => void;

  /**
   * Custom marked dates configuration
   */
  markedDates?: { [date: string]: MarkedDate };

  /**
   * Minimum selectable date
   */
  minDate?: Date;

  /**
   * Maximum selectable date
   */
  maxDate?: Date;

  /**
   * Custom theme override (defaults to app theme)
   */
  theme?: "light" | "dark";

  /**
   * Month format string
   */
  monthFormat?: string;

  /**
   * Callback when month changes
   */
  onMonthChange?: (month: DateData) => void;

  /**
   * Hide day names header
   */
  hideDayNames?: boolean;

  /**
   * Hide month navigation arrows
   */
  hideArrows?: boolean;

  /**
   * First day of week (0 = Sunday, 1 = Monday, etc.)
   */
  firstDay?: number;

  /**
   * Additional props to pass to react-native-calendars
   */
  calendarProps?: Partial<CalendarProps>;
}

export const CalendarComponent: React.FC<CalendarComponentProps> = ({
  mode = "single",
  selectedDates = [],
  onDateSelect,
  markedDates: customMarkedDates = {},
  minDate,
  maxDate,
  theme: themeOverride,
  monthFormat = "MMMM yyyy",
  onMonthChange,
  hideDayNames = false,
  hideArrows = false,
  firstDay = 1, // Monday
  calendarProps = {},
}) => {
  const colorScheme = useColorScheme();
  const effectiveTheme = themeOverride || colorScheme || "light";
  const colors = ThemeColors[effectiveTheme];

  // Convert Date objects to YYYY-MM-DD strings in local timezone
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Parse YYYY-MM-DD string to Date in local timezone
  const parseDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // Build marked dates from selected dates
  const markedDates = useMemo(() => {
    const marked: { [key: string]: MarkedDate } = { ...customMarkedDates };

    selectedDates.forEach((date) => {
      const dateString = formatDate(date);
      if (!marked[dateString]) {
        marked[dateString] = {};
      }
      marked[dateString].selected = true;
      marked[dateString].selectedColor = colors.primary;
    });

    return marked;
  }, [selectedDates, customMarkedDates, colors.primary]);

  // Handle date press
  const handleDayPress = (day: DateData) => {
    if (!onDateSelect) return;

    const selectedDate = parseDate(day.dateString);

    if (mode === "single") {
      onDateSelect(selectedDate);
    } else {
      // Multiple mode: toggle selection
      const dateString = day.dateString;
      const isCurrentlySelected = selectedDates.some(
        (d) => formatDate(d) === dateString
      );

      let newDates: Date[];
      if (isCurrentlySelected) {
        // Remove date
        newDates = selectedDates.filter((d) => formatDate(d) !== dateString);
      } else {
        // Add date
        newDates = [...selectedDates, selectedDate];
      }

      onDateSelect(newDates);
    }
  };

  // Calendar theme configuration
  const calendarTheme = {
    backgroundColor: colors.background,
    calendarBackground: colors.background,
    textSectionTitleColor: colors.tabIconDefault,
    selectedDayBackgroundColor: colors.primary,
    selectedDayTextColor: "#FFFFFF",
    todayTextColor: colors.primary,
    dayTextColor: colors.text,
    textDisabledColor: colors.tabIconDefault,
    dotColor: colors.primary,
    selectedDotColor: "#FFFFFF",
    arrowColor: colors.primary,
    monthTextColor: colors.text,
    indicatorColor: colors.primary,
    textDayFontFamily: "System",
    textMonthFontFamily: "System",
    textDayHeaderFontFamily: "System",
    textDayFontWeight: "400" as const,
    textMonthFontWeight: "600" as const,
    textDayHeaderFontWeight: "500" as const,
    textDayFontSize: 15,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 13,
  };

  return (
    <Calendar
      current={selectedDates[0] ? formatDate(selectedDates[0]) : undefined}
      minDate={minDate ? formatDate(minDate) : undefined}
      maxDate={maxDate ? formatDate(maxDate) : undefined}
      onDayPress={handleDayPress}
      onMonthChange={onMonthChange}
      monthFormat={monthFormat}
      hideExtraDays={true}
      disableMonthChange={false}
      firstDay={firstDay}
      hideDayNames={hideDayNames}
      hideArrows={hideArrows}
      markedDates={markedDates}
      markingType="custom"
      theme={calendarTheme}
      style={styles.calendar}
      {...calendarProps}
    />
  );
};

const styles = StyleSheet.create({
  calendar: {
    borderRadius: 12,
  },
});
