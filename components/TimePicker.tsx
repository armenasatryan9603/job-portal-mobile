import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/hooks/useTranslation";

interface TimePickerProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  selectedTimes: string[];
  onTimeToggle: (time: string) => void;
  formatDateForDisplay: (date: Date) => string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  visible,
  onClose,
  selectedDate,
  selectedTimes,
  onTimeToggle,
  formatDateForDisplay,
}) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        slots.push(timeString);
      }
    }
    return slots;
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
            {selectedDate && formatDateForDisplay(selectedDate)}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.modalDoneButton}>
            <Text style={[styles.modalDoneText, { color: colors.tint }]}>
              {t("done")}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.timePickerContainer}>
          <Text
            style={[
              styles.timePickerSubtitle,
              { color: colors.tabIconDefault },
            ]}
          >
            {t("selectAvailableTimes")}
          </Text>

          <ScrollView style={styles.timeSlotsContainer}>
            <View style={styles.timeSlotsGrid}>
              {generateTimeSlots().map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    {
                      backgroundColor: selectedTimes.includes(time)
                        ? colors.tint
                        : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => onTimeToggle(time)}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      {
                        color: selectedTimes.includes(time)
                          ? colors.background
                          : colors.text,
                      },
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {selectedTimes.length > 0 && (
            <View
              style={[
                styles.selectedTimesSummary,
                { borderTopColor: colors.border },
              ]}
            >
              <Text style={[styles.summaryTitle, { color: colors.text }]}>
                {t("selectedTimes")} ({selectedTimes.length})
              </Text>
              <View style={styles.selectedTimesContainer}>
                {selectedTimes.map((time, index) => (
                  <View
                    key={index}
                    style={[
                      styles.selectedTimeChip,
                      { backgroundColor: colors.tint },
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectedTimeText,
                        { color: colors.background },
                      ]}
                    >
                      {time}
                    </Text>
                  </View>
                ))}
              </View>
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
  timePickerContainer: {
    flex: 1,
    padding: 16,
  },
  timePickerSubtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  timeSlotsContainer: {
    flex: 1,
  },
  timeSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlot: {
    width: "22%",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectedTimesSummary: {
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  selectedTimesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedTimeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  selectedTimeText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
