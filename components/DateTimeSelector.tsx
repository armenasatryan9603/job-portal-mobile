import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { CalendarPicker } from "./CalendarPicker";
import { TimePicker } from "./TimePicker";
import { useTranslation } from "@/contexts/TranslationContext";
import { ResponsiveCard } from "./ResponsiveContainer";

interface DateTimeSelectorProps {
  selectedDates: Date[];
  selectedDateTimes: { [key: string]: string[] };
  onDatesChange: (dates: Date[]) => void;
  onDateTimesChange: (dateTimes: { [key: string]: string[] }) => void;
  error?: string;
}

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  selectedDates,
  selectedDateTimes,
  onDatesChange,
  onDateTimesChange,
  error,
}) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDateForTime, setSelectedDateForTime] = useState<Date | null>(
    null
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const normalizeDate = (date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const getDateKey = (date: Date) => {
    const normalized = normalizeDate(date);
    return normalized.toDateString();
  };

  const generateDefaultTimes = () => {
    const times: string[] = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Skip 18:30 since we only want up to 18:00
        if (hour === 18 && minute > 0) break;
        const timeString = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        times.push(timeString);
      }
    }
    return times;
  };

  const getTimesForDate = (date: Date) => {
    const key = getDateKey(date);
    return selectedDateTimes[key] || [];
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const convertTimesToRanges = (times: string[]): string => {
    if (times.length === 0) return "";
    if (times.length === 1) return times[0];

    const sortedTimes = [...times].sort();
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };
    const minutesToTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    };

    const ranges: string[] = [];
    let rangeStart = timeToMinutes(sortedTimes[0]);
    let rangeEnd = rangeStart;

    for (let i = 1; i < sortedTimes.length; i++) {
      const currentTime = timeToMinutes(sortedTimes[i]);
      const expectedNext = rangeEnd + 30;

      if (currentTime === expectedNext) {
        rangeEnd = currentTime;
      } else {
        ranges.push(
          rangeStart === rangeEnd
            ? minutesToTime(rangeStart)
            : `${minutesToTime(rangeStart)}-${minutesToTime(rangeEnd)}`
        );
        rangeStart = currentTime;
        rangeEnd = currentTime;
      }
    }

    ranges.push(
      rangeStart === rangeEnd
        ? minutesToTime(rangeStart)
        : `${minutesToTime(rangeStart)}-${minutesToTime(rangeEnd)}`
    );

    return ranges.join(", ");
  };

  const formatDateWithTimes = (date: Date) => {
    const times = getTimesForDate(date);
    const dateStr = formatDateForDisplay(date);
    if (times.length > 0) {
      const timeRanges = convertTimesToRanges(times);
      return `${dateStr} (${timeRanges})`;
    }
    return dateStr;
  };

  const toggleDateSelection = (date: Date) => {
    const normalizedDate = normalizeDate(date);
    const dateKey = normalizedDate.toDateString();
    const isSelected = selectedDates.some(
      (d) => normalizeDate(d).toDateString() === dateKey
    );

    if (isSelected) {
      // Remove date and its times
      onDatesChange(
        selectedDates.filter((d) => normalizeDate(d).toDateString() !== dateKey)
      );
      const newDateTimes = { ...selectedDateTimes };
      delete newDateTimes[getDateKey(normalizedDate)];
      onDateTimesChange(newDateTimes);
    } else {
      // Add date
      onDatesChange([...selectedDates, normalizedDate]);
    }
  };


  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === "prev") {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const handleTimePickerOpen = (date: Date) => {
    setSelectedDateForTime(date);
    setShowTimePicker(true);
  };

  return (
    <ResponsiveCard>
      <Text
        style={[
          styles.sectionTitle,
          { color: ThemeColors[colorScheme ?? "light"].text },
        ]}
      >
        {t("availableDates")}
      </Text>

      <TouchableOpacity
        style={[
          styles.calendarInput,
          {
            backgroundColor: colors.background,
            borderColor: error ? "#ff4444" : colors.border,
          },
        ]}
        onPress={() => setShowCalendar(true)}
      >
        <Text
          style={[
            styles.calendarInputText,
            {
              color:
                selectedDates.length > 0 ? colors.text : colors.tabIconDefault,
            },
          ]}
        >
          {t("selectAvailableDates")}
        </Text>
        <Text style={[styles.calendarIcon, { color: colors.tint }]}>📅</Text>
      </TouchableOpacity>

      {selectedDates.length > 0 && (
        <View style={styles.selectedDatesContainer}>
          {selectedDates.map((date, index) => (
            <View key={index} style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={[
                  styles.selectedDateChip,
                  { backgroundColor: colors.tint },
                ]}
                onPress={() => handleTimePickerOpen(date)}
              >
                <Text
                  style={[
                    styles.selectedDateText,
                    { color: colors.background },
                  ]}
                >
                  {formatDateWithTimes(date)}
                </Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleDateSelection(date);
                  }}
                  style={styles.removeDateButton}
                >
                  <Text
                    style={[
                      styles.removeDateText,
                      { color: colors.background },
                    ]}
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {error ? (
        <Text style={[styles.errorText, { color: "#ff4444", marginTop: 8 }]}>
          {error}
        </Text>
      ) : null}

      <CalendarPicker
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onDone={() => setShowCalendar(false)}
        selectedDates={selectedDates}
        onDateToggle={toggleDateSelection}
        currentMonth={currentMonth}
        onMonthNavigate={navigateMonth}
        formatDateWithTimes={formatDateWithTimes}
      />

      <TimePicker
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onDone={(times) => {
          if (!selectedDateForTime) return;
          const key = getDateKey(selectedDateForTime);
          if (times.length === 0) {
            const newDateTimes = { ...selectedDateTimes };
            delete newDateTimes[key];
            onDateTimesChange(newDateTimes);
          } else {
            onDateTimesChange({ ...selectedDateTimes, [key]: times });
          }
        }}
        selectedDate={selectedDateForTime}
        selectedTimes={
          selectedDateForTime ? getTimesForDate(selectedDateForTime) : []
        }
        defaultTimes={generateDefaultTimes()}
        formatDateForDisplay={formatDateForDisplay}
      />
    </ResponsiveCard>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  calendarInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  calendarInputText: {
    fontSize: 16,
    flex: 1,
  },
  calendarIcon: {
    fontSize: 18,
  },
  selectedDatesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  dateTimeContainer: {
    marginBottom: 8,
  },
  selectedDateChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  selectedDateText: {
    fontSize: 12,
    fontWeight: "500",
  },
  removeDateButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  removeDateText: {
    fontSize: 20,
    lineHeight: 18,
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
