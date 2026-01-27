import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BorderRadius, Spacing, ThemeColors } from "@/constants/styles";
import { CalendarComponent, MarkedDate } from "@/components/CalendarComponent";
import CheckInModalSkeleton, {
  CheckInSpecialistsSkeleton,
} from "@/components/CheckInModalSkeleton";
import { Order, apiService } from "@/categories/api";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "react-native";
import { TimeRangePicker } from "@/components/TimeRangePicker";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/TranslationContext";

interface AvailableDay {
  date: string;
  workHours: { start: string; end: string };
  bookings: Array<{ startTime: string; endTime: string; clientId?: number }>;
  capacity?: { total: number; booked: number; available: number };
}

interface SelectedBooking {
  date: string;
  startTime: string;
  endTime: string;
  dateLabel: string;
  resourceId?: number;
}

interface Resource {
  id: number;
  name: string;
  nameEn?: string;
  nameRu?: string;
  nameHy?: string;
  type: string;
  MarketMember?: {
    User?: {
      id: number;
      name: string;
      email: string;
      avatarUrl?: string;
    };
  };
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
  const [availableResources, setAvailableResources] = useState<any[]>([]);
  const [selectedResource, setSelectedResource] = useState<number | null>(null); // This will store marketMemberId for select mode
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [resourcesLoaded, setResourcesLoaded] = useState(false); // Track when specialists have finished loading
  const [isSelectingDate, setIsSelectingDate] = useState(false); // Track when a date is being selected

  // Ref for auto-scrolling
  const scrollViewRef = useRef<ScrollView>(null);

  // Helper: Format date as YYYY-MM-DD in local timezone (avoids timezone issues)
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Calculate date range (today to subscribeAheadDays ahead)
  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weeklySchedule = (order as any)?.weeklySchedule;
    const aheadDays = weeklySchedule?.subscribeAheadDays || 90;
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + aheadDays);
    return { start: today, end: maxDate };
  }, [order]);

  // Fetch available days when modal opens
  useEffect(() => {
    if (visible && order) {
      // Load initial slots for calendar
      loadAvailableSlots();
      // Load market specialists if in select mode
      if ((order as any).resourceBookingMode === "select") {
        setResourcesLoaded(false);
        loadResources();
      }
    } else {
      // Reset when modal closes
      setAvailableDays([]);
      setSelectedDate(null);
      setSelectedBookings([]);
      setSelectedResource(null);
      setAvailableResources([]);
      setResourcesLoaded(false);
      setIsSelectingDate(false);
    }
  }, [visible, order]);

  // Reload slots when specialist selection changes (for select mode)
  useEffect(() => {
    if (visible && order && (order as any).resourceBookingMode === "select") {
      // Reload slots when specialist is selected or changed
      // This ensures time slots are filtered by the selected specialist
      if (selectedResource) {
        loadAvailableSlots(false); // Don't show loading indicator on specialist change
        
        // Auto-scroll to time slot section after specialist is selected
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 300);
      }
    }
  }, [selectedResource]);

  // Clear isSelectingDate when resources finish loading or after timeout
  useEffect(() => {
    if (isSelectingDate && resourcesLoaded) {
      const timer = setTimeout(() => {
        setIsSelectingDate(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSelectingDate, resourcesLoaded]);

  const loadResources = async () => {
    if (!order) return;

    // Only load specialists if order has select mode
    if ((order as any).resourceBookingMode !== "select") {
      return;
    }

    setIsLoadingResources(true);
    try {
      // First try to get market from order's Markets relation
      let marketId: number | null = null;
      let markets = (order as any).Markets;
      
      console.log("Order Markets from initial order:", markets);
      
      // If Markets not included, try to fetch order with Markets relation
      if (!markets || markets.length === 0) {
        console.log("Markets not in initial order, fetching order with Markets...");
        try {
          const orderWithMarkets = await apiService.getOrderById(order.id);
          markets = (orderWithMarkets as any).Markets;
          console.log("Order Markets from API:", markets);
        } catch (error) {
          console.error("Error fetching order with Markets:", error);
        }
      }
      
      if (markets && markets.length > 0) {
        // Markets is an array of MarketOrder objects, each has marketId
        marketId = markets[0].marketId || markets[0].Market?.id;
        console.log("Extracted marketId:", marketId);
      }

      if (!marketId) {
        console.log("No market found for order", order.id);
        setAvailableResources([]);
        setIsLoadingResources(false);
        return;
      }

      console.log("Loading specialists for market", marketId);
      const market = await apiService.getMarketById(marketId);
      console.log("Market data:", {
        id: market.id,
        name: market.name,
        membersCount: market.Members?.length || 0,
        members: market.Members?.map((m: any) => ({
          id: m.id,
          userId: m.userId,
          status: m.status,
          isActive: m.isActive,
          userName: m.User?.name,
        })),
      });
      
      // Get active, accepted market members (specialists)
      const specialists = (market.Members || []).filter(
        (member: any) => member.status === "accepted" && member.isActive
      );
      console.log("Filtered specialists:", specialists.length, specialists.map((s: any) => ({
        id: s.id,
        name: s.User?.name,
        status: s.status,
        isActive: s.isActive,
      })));
      setAvailableResources(specialists);
    } catch (error) {
      console.error("Error loading market specialists:", error);
      // Don't show error - specialists are optional
      setAvailableResources([]);
    } finally {
      setIsLoadingResources(false);
      setResourcesLoaded(true);
      setIsSelectingDate(false);
    }
  };

  const loadAvailableSlots = async (showLoading: boolean = true) => {
    if (!order) return;

    if (showLoading) {
      setIsLoadingSlots(true);
    }
    try {
      // For select mode, pass marketMemberId to filter slots by specialist
      const marketMemberId = 
        (order as any).resourceBookingMode === "select" && selectedResource
          ? selectedResource
          : undefined;

      // Load available slots (filtered by specialist if in select mode)
      const response = await apiService.getAvailableSlots(
        order.id,
        dateRange.start,
        dateRange.end,
        marketMemberId
      );
      setAvailableDays(response.availableDays as AvailableDay[] || []);
      setWorkDuration(response.workDurationPerClient || null);
    } catch (error) {
      console.error("Error loading available days:", error);
      if (showLoading) {
        Alert.alert(t("error"), t("failedToLoadAvailableSlots"));
      }
    } finally {
      if (showLoading) {
        setIsLoadingSlots(false);
      }
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
        dotColor: hasAvailableTime ? colors.primary : colors.errorVariant,
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

  // Extract breaks for selected date from weekly schedule
  const selectedDateBreaks = useMemo(() => {
    if (!selectedDate || !order) return [];

    const weeklySchedule = (order as any)?.weeklySchedule;
    if (!weeklySchedule) return [];

    // Get day name from selected date
    const dayOfWeek = selectedDate.getDay();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayName = dayNames[dayOfWeek] as keyof typeof weeklySchedule;

    const daySchedule = weeklySchedule[dayName] as any;
    if (!daySchedule?.breaks || daySchedule.breaks.length === 0) {
      return [];
    }

    // Check for break exclusions (priority bookings)
    const breakExclusions = weeklySchedule.breakExclusions || {};
    const dateString = formatLocalDate(selectedDate);
    const exclusionsForDate = breakExclusions[dateString] || [];

    // Filter out excluded breaks
    const breaks = daySchedule.breaks.filter((breakItem: { start: string; end: string }) => {
      return !exclusionsForDate.some(
        (exclusion: { start: string; end: string }) =>
          exclusion.start === breakItem.start && exclusion.end === breakItem.end
      );
    });

    return breaks;
  }, [selectedDate, order]);

  // Handle calendar date selection
  const handleDateSelect = (date: Date | Date[]) => {
    if (Array.isArray(date)) return;

    setIsSelectingDate(true);
    setSelectedDate(date);
    // Reset resource selection when date changes
    setSelectedResource(null);
    setSelectedBookings([]);

    // Auto-scroll to show next section
    // For select mode, wait until specialist is selected before scrolling
    // For other modes, scroll immediately after date selection
    if ((order as any).resourceBookingMode !== "select") {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 500);
    }
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

    // Add booking (resourceId stores marketMemberId for select mode)
    setSelectedBookings((prev) => [
      ...prev,
      { date: dateString, startTime, endTime, dateLabel, resourceId: selectedResource || undefined },
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
      // Format bookings for submission (include marketMemberId if in select mode)
      const formattedBookings = selectedBookings.map((b) => ({
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        ...((order as any).resourceBookingMode === "select" && b.resourceId
          ? { marketMemberId: b.resourceId }
          : {}),
      }));
      await onSubmit(formattedBookings);
      setSelectedBookings([]);
      setSelectedDate(null);
      setSelectedResource(null);
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

  // Check if approval is required
  const requiresApproval = order.checkinRequiresApproval === true;

  const specialistLoading = isLoadingResources || isLoadingSlots || isSelectingDate || !resourcesLoaded

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
              {requiresApproval
                ? t("requestBooking")
                : t("checkIn")}
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

        <ScrollView ref={scrollViewRef} style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoadingSlots ? (
            <CheckInModalSkeleton
              showCalendar
              showSpecialists={(order as any).resourceBookingMode === "select"}
              showSummary
            />
          ) : (
            <>
              {/* Calendar Section */}
              <View
                style={[styles.section, { backgroundColor: colors.background }]}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("selectDate")}
                </Text>
                <Text
                  style={[styles.sectionDesc, { color: colors.tabIconDefault }]}
                >
                  {t("tapDateToSeeAvailableSlots")}
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
                      {t("available")}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: colors.errorVariant }]}
                    />
                    <Text style={[styles.legendText, { color: colors.text }]}>
                      {t("fullyBooked")}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Specialist Selection (only for select mode, shown after date is selected) */}
              {(order as any).resourceBookingMode === "select" &&
                selectedDate &&
                (resourcesLoaded || isSelectingDate) && (
                  <View
                    style={[
                      styles.section,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    {!specialistLoading && <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t("selectSpecialist")}
                    </Text>
}
                    
                    {specialistLoading ? (
                      <CheckInSpecialistsSkeleton />
                    ) : availableResources.length === 0 ? (
                      <View style={{ paddingVertical: 16, alignItems: "center" }}>
                        <Text style={[{ color: colors.tabIconDefault }, { fontSize: 14 }]}>
                          {t("noSpecialistsAvailable")}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.resourceListContainer}>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.resourceList}
                        >
                          {availableResources.map((member) => {
                            const isSelected = selectedResource === member.id;
                            const specialistName = member.User?.name || "Specialist";
                            const specialistAvatar = member.User?.avatarUrl;
                            const specialistRole = member.role || "Specialist";

                            return (
                              <TouchableOpacity
                                key={member.id}
                                style={[
                                  styles.resourceItem,
                                  {
                                    backgroundColor: isSelected
                                      ? colors.primary + "15"
                                      : colors.background,
                                    borderColor: isSelected
                                      ? colors.primary
                                      : colors.border,
                                  },
                                ]}
                                onPress={() => {
                                  setSelectedResource(member.id);
                                  setSelectedBookings([]);
                                }}
                                activeOpacity={0.7}
                              >
                                {specialistAvatar ? (
                                  <Image
                                    source={{ uri: specialistAvatar }}
                                    style={styles.resourceAvatar}
                                  />
                                ) : (
                                  <View
                                    style={[
                                      styles.resourceAvatar,
                                      {
                                        backgroundColor: colors.primary + "20",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      },
                                    ]}
                                  >
                                    <IconSymbol
                                      name="person.circle.fill"
                                      size={20}
                                      color={colors.primary}
                                    />
                                  </View>
                                )}
                                <View style={styles.resourceTextContainer}>
                                  <Text
                                    style={[
                                      styles.resourceName,
                                      { color: colors.text },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {specialistName}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.resourceRole,
                                      { color: colors.tabIconDefault },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {specialistRole}
                                  </Text>
                                </View>
                                {isSelected && (
                                  <View style={styles.resourceCheckmark}>
                                    <IconSymbol
                                      name="checkmark.circle.fill"
                                      size={16}
                                      color={colors.primary}
                                    />
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}

              {/* Time Range Picker Section (shown when a date is selected) */}
              {selectedDate &&
                selectedDayData &&
                // For select mode, wait until resources are loaded, and require a specialist
                // if there are any specialists available
                ((order as any).resourceBookingMode !== "select" ||
                  (resourcesLoaded &&
                    (availableResources.length === 0 || selectedResource))) && (
                <View
                  style={[
                    styles.section,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t("selectTimeRange")}
                  </Text>
                  <Text
                    style={[
                      styles.sectionDesc,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {formatDate(formatLocalDate(selectedDate))}
                  </Text>

                  {/* Capacity Information (for multi mode) */}
                  {(order as any).resourceBookingMode === "multi" &&
                    selectedDayData.capacity && (
                      <View
                        style={[
                          styles.capacityInfo,
                          {
                            backgroundColor: colors.primary + "10",
                            borderColor: colors.primary + "30",
                          },
                        ]}
                      >
                        <IconSymbol
                          name="person.3.fill"
                          size={20}
                          color={colors.primary}
                        />
                        <View style={styles.capacityInfoText}>
                          <Text
                            style={[
                              styles.capacityInfoTitle,
                              { color: colors.text },
                            ]}
                          >
                            {t("capacity")}
                          </Text>
                          <Text
                            style={[
                              styles.capacityInfoValue,
                              { color: colors.primary },
                            ]}
                          >
                            {selectedDayData.capacity.available} /{" "}
                            {selectedDayData.capacity.total}{" "}
                            {t("spotsAvailable")}
                          </Text>
                        </View>
                      </View>
                    )}

                  <TimeRangePicker
                    workHours={selectedDayData.workHours}
                    existingBookings={selectedDayData.bookings}
                    breaks={selectedDateBreaks}
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
                      {t("noSlotsAvailable")}
                    </Text>
                  </View>
                </View>
              )}

              {/* Approval Required Info Banner */}
              {requiresApproval && selectedBookings.length > 0 && (
                <View
                  style={[
                    styles.infoBanner,
                    {
                      backgroundColor: colors.primary + "15",
                      borderColor: colors.primary + "30",
                    },
                  ]}
                >
                  <IconSymbol
                    name="info.circle.fill"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.infoBannerText, { color: colors.text }]}
                  >
                    {t("bookingRequiresApproval")}
                  </Text>
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
                    {requiresApproval
                      ? t("selectedBookingRequests")
                      : t("selectedBookings")}{" "}
                    ({selectedBookings.length})
                  </Text>

                  {selectedBookings.map((booking, index) => {
                    // Find specialist name if resourceBookingMode is "select"
                    const specialist = (order as any).resourceBookingMode === "select" && booking.resourceId
                      ? availableResources.find((r) => r.id === booking.resourceId)
                      : null;
                    
                    return (
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
                            {(order as any).resourceBookingMode === "select" && specialist && (
                              <Text
                                style={[
                                  styles.bookingTime,
                                  { color: colors.tabIconDefault, marginTop: 2 },
                                ]}
                              >
                                {t("specialist")}: {specialist.MarketMember?.User?.name || specialist.name}
                              </Text>
                            )}
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveBooking(index)}
                          style={styles.removeButton}
                        >
                          <IconSymbol
                            name="xmark.circle.fill"
                            size={22}
                            color={colors.errorVariant}
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
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
                    {t("noAvailableSlots")}
                  </Text>
                  <Text
                    style={[styles.emptyDesc, { color: colors.tabIconDefault }]}
                  >
                    {t("noAvailableSlotsDesc")}
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
            title={t("cancel")}
            onPress={handleClose}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <Button
            variant="primary"
            title={
              loading
                ? requiresApproval
                  ? t("submittingRequest")
                  : t("checkingIn")
                : requiresApproval
                  ? t("submitBookingRequest")
                  : t("confirmBookings")
            }
            onPress={handleSubmit}
            disabled={loading || selectedBookings.length === 0}
            icon={
              loading
                ? undefined
                : requiresApproval
                  ? "paperplane.fill"
                  : "checkmark.circle.fill"
            }
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
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  resourceListContainer: {
    marginTop: 12,
  },
  resourceList: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  resourceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    minWidth: 120,
    position: "relative",
  },
  resourceAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  resourceTextContainer: {
    flex: 1,
  },
  resourceName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  resourceRole: {
    fontSize: 12,
    opacity: 0.7,
  },
  resourceCheckmark: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  capacityInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  capacityInfoText: {
    flex: 1,
  },
  capacityInfoTitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  capacityInfoValue: {
    fontSize: 16,
    fontWeight: "700",
  },
});
