import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { CalendarPicker } from "./CalendarPicker";
import { TimePicker } from "./TimePicker";
import { useTranslation } from "@/contexts/TranslationContext";

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

  const getDateKey = (date: Date) => {
    return date.toDateString();
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

  const formatDateWithTimes = (date: Date) => {
    const times = getTimesForDate(date);
    const dateStr = formatDateForDisplay(date);
    if (times.length > 0) {
      return `${dateStr} (${times.join(", ")})`;
    }
    return dateStr;
  };

  const formatAllDatesWithTimes = () => {
    return selectedDates.map((date) => formatDateWithTimes(date)).join(", ");
  };

  const toggleDateSelection = (date: Date) => {
    if (selectedDates.some((d) => d.toDateString() === date.toDateString())) {
      // Remove date
      const newDates = selectedDates.filter(
        (d) => d.toDateString() !== date.toDateString()
      );
      onDatesChange(newDates);

      // Remove associated times
      const key = getDateKey(date);
      const newDateTimes = { ...selectedDateTimes };
      delete newDateTimes[key];
      onDateTimesChange(newDateTimes);
    } else {
      // Add date
      onDatesChange([...selectedDates, date]);
    }
  };

  const toggleTimeForDate = (date: Date, time: string) => {
    const key = getDateKey(date);
    const currentTimes = getTimesForDate(date);

    if (currentTimes.includes(time)) {
      // Remove time
      const newTimes = currentTimes.filter((t) => t !== time);
      if (newTimes.length === 0) {
        // Remove date if no times selected
        const newDateTimes = { ...selectedDateTimes };
        delete newDateTimes[key];
        onDateTimesChange(newDateTimes);
      } else {
        onDateTimesChange({
          ...selectedDateTimes,
          [key]: newTimes,
        });
      }
    } else {
      // Add time
      onDateTimesChange({
        ...selectedDateTimes,
        [key]: [...currentTimes, time],
      });
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
    <View>
      <Text style={[styles.inputLabel, { color: colors.text }]}>
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
          {selectedDates.length > 0
            ? formatAllDatesWithTimes()
            : t("selectAvailableDates")}
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
        selectedDate={selectedDateForTime}
        selectedTimes={
          selectedDateForTime ? getTimesForDate(selectedDateForTime) : []
        }
        onTimeToggle={(time) =>
          selectedDateForTime && toggleTimeForDate(selectedDateForTime, time)
        }
        formatDateForDisplay={formatDateForDisplay}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
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
    marginBottom: 8,
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
    gap: 8,
  },
  dateTimeContainer: {
    marginBottom: 8,
  },
  selectedDateChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 14,
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
