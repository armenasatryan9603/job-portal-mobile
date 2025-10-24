import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface CalendarPickerProps {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
  selectedDates: Date[];
  onDateToggle: (date: Date) => void;
  currentMonth: Date;
  onMonthNavigate: (direction: "prev" | "next") => void;
  formatDateWithTimes: (date: Date) => string;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  visible,
  onClose,
  onDone,
  selectedDates,
  onDateToggle,
  currentMonth,
  onMonthNavigate,
  formatDateWithTimes,
}) => {
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(
      (selectedDate) => selectedDate.toDateString() === date.toDateString()
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <View
          style={[styles.modalHeader, { borderBottomColor: colors.border }]}
        >
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Text style={[styles.modalCloseText, { color: colors.tint }]}>
              {t("cancel")}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {t("selectAvailableDates")}
          </Text>
          <TouchableOpacity onPress={onDone} style={styles.modalDoneButton}>
            <Text style={[styles.modalDoneText, { color: colors.tint }]}>
              {t("done")}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarContainer}>
          {/* Month Navigation */}
          <View
            style={[
              styles.monthNavigation,
              { borderBottomColor: colors.border },
            ]}
          >
            <TouchableOpacity
              onPress={() => onMonthNavigate("prev")}
              style={styles.navButton}
            >
              <Text style={[styles.navButtonText, { color: colors.tint }]}>
                ‹
              </Text>
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.text }]}>
              {currentMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <TouchableOpacity
              onPress={() => onMonthNavigate("next")}
              style={styles.navButton}
            >
              <Text style={[styles.navButtonText, { color: colors.tint }]}>
                ›
              </Text>
            </TouchableOpacity>
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <Text
                  key={day}
                  style={[styles.dayHeader, { color: colors.tabIconDefault }]}
                >
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar Days */}
            <View style={styles.calendarDays}>
              {getDaysInMonth(currentMonth).map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    date &&
                      isDateSelected(date) && {
                        backgroundColor: colors.tint,
                      },
                    date && {
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => date && onDateToggle(date)}
                  disabled={!date}
                >
                  {date && (
                    <Text
                      style={[
                        styles.calendarDayText,
                        {
                          color: isDateSelected(date)
                            ? colors.background
                            : colors.text,
                        },
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Selected Dates Summary */}
          {selectedDates.length > 0 && (
            <View
              style={[
                styles.selectedDatesSummary,
                { borderTopColor: colors.border },
              ]}
            >
              <Text style={[styles.summaryTitle, { color: colors.text }]}>
                {t("selectedDates")} ({selectedDates.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.summaryDatesContainer}>
                  {selectedDates.map((date, index) => (
                    <View
                      key={index}
                      style={[
                        styles.summaryDateChip,
                        { backgroundColor: colors.tint },
                      ]}
                    >
                      <Text
                        style={[
                          styles.summaryDateText,
                          { color: colors.background },
                        ]}
                      >
                        {formatDateWithTimes(date)}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalDoneButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: "600",
  },
  calendarContainer: {
    flex: 1,
    padding: 16,
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  calendarGrid: {
    flex: 1,
  },
  dayHeaders: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 8,
  },
  calendarDays: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 8,
    margin: 1,
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: "500",
  },
  selectedDatesSummary: {
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  summaryDatesContainer: {
    flexDirection: "row",
    gap: 8,
  },
  summaryDateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  summaryDateText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
