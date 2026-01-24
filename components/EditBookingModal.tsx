import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors, BorderRadius } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Booking, apiService } from "@/categories/api";
import { useTranslation } from "@/contexts/TranslationContext";
import { CalendarComponent, MarkedDate } from "@/components/CalendarComponent";
import { Button } from "@/components/ui/button";
import { TimeRangePicker } from "@/components/TimeRangePicker";

interface AvailableDay {
  date: string;
  workHours: { start: string; end: string };
  bookings: Array<{ startTime: string; endTime: string; clientId?: number }>;
}

interface EditBookingModalProps {
  visible: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSubmit: (
    scheduledDate: string,
    startTime: string,
    endTime: string
  ) => Promise<void>;
  loading?: boolean;
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  visible,
  onClose,
  booking,
  onSubmit,
  loading = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();

  const [availableDays, setAvailableDays] = useState<AvailableDay[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [workDuration, setWorkDuration] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string>("");
  const [selectedEndTime, setSelectedEndTime] = useState<string>("");

  const scrollViewRef = useRef<ScrollView>(null);

  // Helper: Format date as YYYY-MM-DD in local timezone
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Calculate date range (today to 3 months ahead)
  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    return { start: today, end: threeMonthsLater };
  }, []);

  // Initialize with current booking data
  useEffect(() => {
    if (visible && booking) {
      // Parse the current booking date
      const currentDate = new Date(booking.scheduledDate);
      setSelectedDate(currentDate);
      setSelectedStartTime(booking.startTime);
      setSelectedEndTime(booking.endTime);
      loadAvailableSlots();
    } else {
      // Reset when modal closes
      setAvailableDays([]);
      setSelectedDate(null);
      setSelectedStartTime("");
      setSelectedEndTime("");
    }
  }, [visible, booking]);

  const loadAvailableSlots = async () => {
    if (!booking?.Order) return;

    setIsLoadingSlots(true);
    try {
      const response = await apiService.getAvailableSlots(
        booking.Order.id,
        dateRange.start,
        dateRange.end
      );
      setAvailableDays(response.availableDays || []);
      setWorkDuration(response.workDurationPerClient || null);
    } catch (error) {
      console.error("Error loading available days:", error);
      Alert.alert(t("error"), t("failedToLoadAvailableSlots"));
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Get marked dates for calendar
  const markedDates = useMemo(() => {
    const marked: { [key: string]: MarkedDate } = {};

    availableDays.forEach((day) => {
      const hasAvailableTime = day.workHours !== null;

      marked[day.date] = {
        marked: hasAvailableTime,
        dotColor: hasAvailableTime ? colors.primary : colors.errorVariant,
        disabled: !hasAvailableTime,
      };
    });

    // Mark currently selected date
    if (selectedDate) {
      const dateString = formatLocalDate(selectedDate);
      if (marked[dateString]) {
        marked[dateString].selected = true;
        marked[dateString].selectedColor = colors.primary;
      } else {
        marked[dateString] = {
          selected: true,
          selectedColor: colors.primary,
        };
      }
    }

    return marked;
  }, [availableDays, selectedDate, colors.primary]);

  // Get day data for selected date
  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    const dateString = formatLocalDate(selectedDate);
    return availableDays.find((d) => d.date === dateString) || null;
  }, [selectedDate, availableDays]);

  // Handle calendar date selection
  const handleDateSelect = (date: Date | Date[]) => {
    if (Array.isArray(date)) return;

    setSelectedDate(date);
    // Reset time selection when date changes
    setSelectedStartTime("");
    setSelectedEndTime("");

    // Auto-scroll to show TimeRangePicker
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 500);
  };

  // Handle time range selection
  const handleSelectTimeRange = (startTime: string, endTime: string) => {
    setSelectedStartTime(startTime);
    setSelectedEndTime(endTime);
  };

  // Submit the updated booking
  const handleSubmit = async () => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      Alert.alert(
        t("error"),
        t("pleaseSelectDateAndTime") || "Please select a date and time"
      );
      return;
    }

    const dateString = formatLocalDate(selectedDate);

    try {
      await onSubmit(dateString, selectedStartTime, selectedEndTime);
      onClose();
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  };

  const handleClose = () => {
    setSelectedDate(null);
    setSelectedStartTime("");
    setSelectedEndTime("");
    onClose();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (!booking) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("editBooking")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
              {booking.Order?.title || t("order")}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            disabled={loading}
          >
            <IconSymbol name="xmark" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {isLoadingSlots ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={[styles.loadingText, { color: colors.tabIconDefault }]}
              >
                {t("loadingAvailableSlots") || "Loading available slots..."}
              </Text>
            </View>
          ) : (
            <>
              {/* Current Booking Info */}
              <View
                style={[styles.section, { backgroundColor: colors.background }]}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("currentBooking") || "Current Booking"}
                </Text>
                <View
                  style={[
                    styles.currentBookingCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.bookingRow}>
                    <IconSymbol
                      name="calendar"
                      size={20}
                      color={colors.tabIconDefault}
                    />
                    <Text style={[styles.bookingText, { color: colors.text }]}>
                      {formatDate(booking.scheduledDate)}
                    </Text>
                  </View>
                  <View style={styles.bookingRow}>
                    <IconSymbol
                      name="clock"
                      size={20}
                      color={colors.tabIconDefault}
                    />
                    <Text style={[styles.bookingText, { color: colors.text }]}>
                      {booking.startTime} - {booking.endTime}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Calendar Section */}
              <View
                style={[styles.section, { backgroundColor: colors.background }]}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("selectNewDate") || "Select New Date"}
                </Text>
                <Text
                  style={[styles.sectionDesc, { color: colors.tabIconDefault }]}
                >
                  {t("tapDateToSeeAvailableSlots") ||
                    "Tap a date to see available time slots"}
                </Text>

                <CalendarComponent
                  mode="single"
                  selectedDates={selectedDate ? [selectedDate] : []}
                  onDateSelect={handleDateSelect}
                  markedDates={markedDates}
                  minDate={dateRange.start}
                  maxDate={dateRange.end}
                  monthFormat="MMMM yyyy"
                  calendarProps={{
                    disableAllTouchEventsForDisabledDays: true,
                  }}
                />

                {/* Legend */}
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                    <Text style={[styles.legendText, { color: colors.text }]}>
                      {t("available") || "Available"}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: colors.errorVariant }]}
                    />
                    <Text style={[styles.legendText, { color: colors.text }]}>
                      {t("fullyBooked") || "Fully Booked"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Time Range Picker Section */}
              {selectedDate && selectedDayData && (
                <View
                  style={[
                    styles.section,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t("selectNewTime") || "Select New Time"}
                  </Text>
                  <Text
                    style={[
                      styles.sectionDesc,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {formatDate(formatLocalDate(selectedDate))}
                  </Text>

                  <TimeRangePicker
                    workHours={selectedDayData.workHours}
                    existingBookings={selectedDayData.bookings}
                    onSelectRange={handleSelectTimeRange}
                    suggestedDuration={workDuration || undefined}
                    disabled={loading}
                    scrollViewRef={scrollViewRef}
                  />

                  {selectedStartTime && selectedEndTime && (
                    <View
                      style={[
                        styles.selectedTimeCard,
                        {
                          backgroundColor: colors.primary + "15",
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <IconSymbol
                        name="checkmark.circle.fill"
                        size={20}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.selectedTimeText,
                          { color: colors.text },
                        ]}
                      >
                        {t("selected") || "Selected"}: {selectedStartTime} -{" "}
                        {selectedEndTime}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {selectedDate && !selectedDayData && (
                <View
                  style={[
                    styles.section,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <View style={styles.emptySlots}>
                    <IconSymbol
                      name="calendar.badge.exclamationmark"
                      size={32}
                      color={colors.tabIconDefault}
                    />
                    <Text
                      style={[
                        styles.emptyText,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {t("noSlotsAvailable") ||
                        "No work hours available for this date"}
                    </Text>
                  </View>
                </View>
              )}

              {/* Empty State */}
              {availableDays.length === 0 && !isLoadingSlots && (
                <View style={styles.emptyContainer}>
                  <IconSymbol
                    name="calendar.badge.exclamationmark"
                    size={48}
                    color={colors.tabIconDefault}
                  />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    {t("noAvailableSlots") || "No available time slots"}
                  </Text>
                  <Text
                    style={[styles.emptyDesc, { color: colors.tabIconDefault }]}
                  >
                    {t("noAvailableSlotsDesc") ||
                      "This service doesn't have any available work hours configured."}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Footer with actions */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            variant="outline"
            title={t("cancel") || "Cancel"}
            onPress={handleClose}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <Button
            variant="primary"
            title={
              loading
                ? t("updating") || "Updating..."
                : t("saveChanges") || "Save Changes"
            }
            onPress={handleSubmit}
            disabled={
              loading || !selectedStartTime || !selectedEndTime || !selectedDate
            }
            icon={loading ? undefined : "checkmark.circle.fill"}
            iconSize={20}
            style={{ flex: 2 }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.8,
  },
  closeButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    letterSpacing: 0.3,
  },
  sectionDesc: {
    fontSize: 14,
    marginBottom: Spacing.lg,
    lineHeight: 20,
    opacity: 0.7,
  },
  currentBookingCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  bookingText: {
    fontSize: 15,
    fontWeight: "500",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.lg,
    gap: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: Spacing.sm,
  },
  legendText: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectedTimeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  selectedTimeText: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 3,
    paddingHorizontal: Spacing.xl,
  },
  emptySlots: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "700",
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 15,
    marginTop: Spacing.sm,
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.7,
  },
  emptyText: {
    fontSize: 15,
    marginTop: Spacing.md,
    textAlign: "center",
    opacity: 0.7,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 3,
  },
  loadingText: {
    fontSize: 15,
    marginTop: Spacing.lg,
    opacity: 0.7,
  },
  footer: {
    marginBottom: Spacing.xxl,
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
});
