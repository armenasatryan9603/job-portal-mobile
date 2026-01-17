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
import { Order, apiService } from "@/categories/api";
import { useTranslation } from "@/contexts/TranslationContext";
import { CalendarComponent, MarkedDate } from "@/components/CalendarComponent";
import { Button } from "@/components/ui/button";
import { TimeRangePicker } from "@/components/TimeRangePicker";

interface AvailableDay {
  date: string;
  workHours: { start: string; end: string };
  bookings: Array<{ startTime: string; endTime: string; clientId?: number }>;
}

interface SelectedBooking {
  date: string;
  startTime: string;
  endTime: string;
  dateLabel: string;
}

interface CheckInModalProps {
  visible: boolean;
  onClose: () => void;
  order: Order | null;
  onSubmit: (
    selectedSlots: Array<{ date: string; startTime: string; endTime: string }>
  ) => Promise<void>;
  loading?: boolean;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  visible,
  onClose,
  order,
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
  const [selectedBookings, setSelectedBookings] = useState<SelectedBooking[]>(
    []
  );

  // Ref for auto-scrolling
  const scrollViewRef = useRef<ScrollView>(null);

  // Helper: Format date as YYYY-MM-DD in local timezone (avoids timezone issues)
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

  // Fetch available days when modal opens
  useEffect(() => {
    if (visible && order) {
      loadAvailableSlots();
    } else {
      // Reset when modal closes
      setAvailableDays([]);
      setSelectedDate(null);
      setSelectedBookings([]);
    }
  }, [visible, order]);

  const loadAvailableSlots = async () => {
    if (!order) return;

    setIsLoadingSlots(true);
    try {
      const response = await apiService.getAvailableSlots(
        order.id,
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
      // Check if day has available time (not fully booked)
      const hasAvailableTime = day.workHours !== null;

      marked[day.date] = {
        marked: hasAvailableTime,
        dotColor: hasAvailableTime ? colors.primary : "#FF3B30",
        disabled: !hasAvailableTime,
      };
    });

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

    // Auto-scroll to show TimeRangePicker
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 500);
  };

  // Add time range to selected bookings
  const handleAddTimeRange = (startTime: string, endTime: string) => {
    if (!selectedDate) return;

    const dateString = formatLocalDate(selectedDate);
    const dateLabel = selectedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    // Check for duplicate
    const isDuplicate = selectedBookings.some(
      (b) =>
        b.date === dateString &&
        b.startTime === startTime &&
        b.endTime === endTime
    );

    if (isDuplicate) {
      Alert.alert(t("alreadySelected"), t("thisTimeRangeAlreadyAdded"));
      return;
    }

    // Add booking
    setSelectedBookings((prev) => [
      ...prev,
      { date: dateString, startTime, endTime, dateLabel },
    ]);
  };

  // Remove a booking from the summary
  const handleRemoveBooking = (index: number) => {
    setSelectedBookings((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit all selected bookings
  const handleSubmit = async () => {
    if (selectedBookings.length === 0) {
      Alert.alert(t("selectTimeSlots"), t("pleaseSelectAtLeastOneSlot"));
      return;
    }

    try {
      await onSubmit(selectedBookings);
      setSelectedBookings([]);
      setSelectedDate(null);
      onClose();
    } catch (error) {
      console.error("Error checking in:", error);
    }
  };

  const handleClose = () => {
    setSelectedBookings([]);
    setSelectedDate(null);
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

  if (!order) return null;

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
              {t("checkIn")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
              {order.title}
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
              {/* Calendar Section */}
              <View
                style={[styles.section, { backgroundColor: colors.background }]}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("selectDate") || "Select Date"}
                </Text>
                <Text
                  style={[styles.sectionDesc, { color: colors.tabIconDefault }]}
                >
                  {t("tapDateToSeeAvailableSlots") ||
                    "Tap a date to see available time slots. Marked dates have availability."}
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
                      style={[styles.legendDot, { backgroundColor: "#FF3B30" }]}
                    />
                    <Text style={[styles.legendText, { color: colors.text }]}>
                      {t("fullyBooked") || "Fully Booked"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Time Range Picker Section (shown when a date is selected) */}
              {selectedDate && selectedDayData && (
                <View
                  style={[
                    styles.section,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t("selectTimeRange") || "Select Time Range"}
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
                    onSelectRange={handleAddTimeRange}
                    suggestedDuration={workDuration || undefined}
                    disabled={loading}
                    scrollViewRef={scrollViewRef}
                  />
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

              {/* Selected Bookings Summary */}
              {selectedBookings.length > 0 && (
                <View
                  style={[
                    styles.section,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t("selectedBookings")} ({selectedBookings.length})
                  </Text>

                  {selectedBookings.map((booking, index) => (
                    <View
                      key={`${booking.date}-${booking.startTime}-${booking.endTime}-${index}`}
                      style={[
                        styles.bookingItem,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.bookingInfo}>
                        <IconSymbol
                          name="calendar"
                          size={20}
                          color={colors.primary}
                        />
                        <View style={styles.bookingText}>
                          <Text
                            style={[styles.bookingDate, { color: colors.text }]}
                          >
                            {booking.dateLabel}
                          </Text>
                          <Text
                            style={[
                              styles.bookingTime,
                              { color: colors.tabIconDefault },
                            ]}
                          >
                            {booking.startTime} - {booking.endTime}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveBooking(index)}
                        style={styles.removeButton}
                      >
                        <IconSymbol
                          name="xmark.circle.fill"
                          size={22}
                          color="#FF3B30"
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
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
                ? t("checkingIn") || "Checking In..."
                : t("confirmBookings") || "Confirm Bookings"
            }
            onPress={handleSubmit}
            disabled={loading || selectedBookings.length === 0}
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
  timeSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  timeSlot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    minWidth: 120,
    gap: Spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeSlotText: {
    fontSize: 15,
    fontWeight: "600",
  },
  bookingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  bookingText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  bookingDate: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  bookingTime: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: "500",
  },
  removeButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
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
