import React, { useState, useEffect, useMemo } from "react";
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
  onDone: (times: string[]) => void;
  selectedDate: Date | null;
  selectedTimes: string[];
  formatDateForDisplay: (date: Date) => string;
  defaultTimes?: string[];
}

export const TimePicker: React.FC<TimePickerProps> = ({
  visible,
  onClose,
  onDone,
  selectedDate,
  selectedTimes,
  formatDateForDisplay,
  defaultTimes = [],
}) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  const [localSelectedTimes, setLocalSelectedTimes] = useState<string[]>([]);

  // Initialize local state when modal opens
  useEffect(() => {
    if (visible) {
      const initialTimes =
        selectedTimes.length > 0 ? selectedTimes : defaultTimes;
      setLocalSelectedTimes([...initialTimes]);
    }
  }, [visible, selectedTimes, defaultTimes]);

  const handleCancel = () => {
    setLocalSelectedTimes(selectedTimes.length > 0 ? [...selectedTimes] : []);
    onClose();
  };

  const handleDone = () => {
    onDone(localSelectedTimes);
    onClose();
  };

  const toggleTime = (time: string) => {
    setLocalSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push(
          `${hour.toString().padStart(2, "0")}:${minute
            .toString()
            .padStart(2, "0")}`
        );
      }
    }
    return slots;
  }, []);

  const getTimeBasedColor = (time: string) => {
    const [hourStr, minuteStr] = time.split(":");
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const timeDecimal = hour + minute / 60;
    const isLight = colorScheme === "light";

    // Create smooth gradient: peak at noon, darkest at midnight
    const normalizedTime = (timeDecimal / 24) * 2 * Math.PI;
    const shiftedTime = normalizedTime - Math.PI / 2;
    const brightness = Math.sin(shiftedTime);
    const normalizedBrightness = (brightness + 1) / 2;

    if (isLight) {
      const minBrightness = 224; // #e0e0e0
      const maxBrightness = 255; // #ffffff
      const value = Math.round(
        minBrightness + (maxBrightness - minBrightness) * normalizedBrightness
      );
      return `rgb(${value}, ${value}, ${value})`;
    } else {
      const minBrightness = 15; // #0f0f0f
      const maxBrightness = 42; // #2a2a2a
      const value = Math.round(
        minBrightness + (maxBrightness - minBrightness) * normalizedBrightness
      );
      return `rgb(${value}, ${value}, ${value})`;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <View
          style={[styles.modalHeader, { borderBottomColor: colors.border }]}
        >
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.modalCloseButton}
          >
            <Text style={[styles.modalCloseText, { color: colors.tint }]}>
              {t("cancel")}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {selectedDate && formatDateForDisplay(selectedDate)}
          </Text>
          <TouchableOpacity onPress={handleDone} style={styles.modalDoneButton}>
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
              {timeSlots.map((time) => {
                const isSelected = localSelectedTimes.includes(time);
                return (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeSlot,
                      {
                        backgroundColor: getTimeBasedColor(time),
                        borderColor: isSelected ? colors.tint : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => toggleTime(time)}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        {
                          color: colors.text,
                        },
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
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
    justifyContent: "center",
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
});
