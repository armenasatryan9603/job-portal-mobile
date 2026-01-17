import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { EmptyPage } from "@/components/EmptyPage";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CalendarComponent, MarkedDate } from "@/components/CalendarComponent";
import {
  ThemeColors,
  Shadows,
  BorderRadius,
  Spacing,
} from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useProposalsByUser, useMyOrders } from "@/hooks/useApi";
import { router } from "expo-router";
import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
} from "react-native";
import { useAnalytics } from "@/hooks/useAnalytics";
import CalendarNotificationService from "@/categories/CalendarNotificationService";
import { CountBadge } from "@/components/CountBadge";
import { apiService, Booking } from "@/categories/api";
import { EditBookingModal } from "@/components/EditBookingModal";
import { pusherService } from "@/categories/pusherService";
import CalendarSkeleton from "./Skeleton";
import { Button } from "@/components/ui/button";

interface Application {
  id: number;
  orderId: number;
  status: string;
  createdAt: string;
  Order: {
    id: number;
    title: string;
    availableDates: string[];
    status: string;
  };
}

interface DateGroupedApplication {
  date: string;
  dateLabel: string;
  applications: Application[];
}

type ViewMode = "calendar" | "list";
type DateFilterMode = "applied" | "scheduled" | "checkIns";

// Helper functions for date handling (using local time, not UTC)
const normalizeDate = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

// Get date key in YYYY-MM-DD format using local time (not UTC)
const getDateKey = (date: Date): string => {
  const normalized = normalizeDate(date);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, "0");
  const day = String(normalized.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function CalendarScreen() {
  useAnalytics("Calendar");
  const { user } = useAuth();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [dateFilterMode, setDateFilterMode] =
    useState<DateFilterMode>("scheduled");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(false);

  // Fetch proposals the user submitted
  const {
    data: userProposalsData,
    isLoading: isLoadingUserProposals,
    error: userProposalsError,
    refetch: refetchUserProposals,
  } = useProposalsByUser(user?.id || 0);

  // Fetch orders the user created (to get proposals received on those orders)
  const {
    data: myOrdersData,
    isLoading: isLoadingMyOrders,
    error: myOrdersError,
    refetch: refetchMyOrders,
  } = useMyOrders();

  // Fetch bookings
  const fetchBookings = async () => {
    if (!user) return;

    setIsLoadingBookings(true);
    try {
      const data = await apiService.getMyBookings();
      setBookings(data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  // Fetch bookings when component mounts (always fetch, not just when switching to checkIns)
  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  // Subscribe to Pusher events for real-time booking updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = pusherService.subscribeToUserUpdates(
      user.id,
      () => {}, // conversation updates
      undefined, // status updates
      undefined, // order status updates
      () => {
        // On any notification, refetch bookings
        fetchBookings();
      }
    );

    return unsubscribe;
  }, [user]);

  // Combine loading and error states (only show loading on initial load, not when switching tabs)
  const isLoading = isLoadingUserProposals || isLoadingMyOrders;
  const error = userProposalsError || myOrdersError;
  const refetch = () => {
    refetchUserProposals();
    refetchMyOrders();
    fetchBookings();
  };

  // Process bookings and group by date (always process, not just when in checkIns mode)
  const groupedBookings = useMemo(() => {
    const dateMap = new Map<string, Booking[]>();

    bookings.forEach((booking) => {
      if (booking.status === "cancelled") return; // Skip cancelled bookings

      // Normalize date to YYYY-MM-DD format (remove time component if present)
      const bookingDate = new Date(booking.scheduledDate);
      const dateKey = getDateKey(bookingDate);

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(booking);
    });

    // Convert to array and sort
    const grouped = Array.from(dateMap.entries())
      .map(([dateKey, bookings]) => {
        const date = new Date(dateKey);
        return {
          date: dateKey,
          dateLabel: date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          bookings: bookings,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return grouped;
  }, [bookings]);

  // Process applications and group by date (separate for applied and scheduled)
  const groupedApplications = useMemo(() => {
    // Collect proposals the user submitted
    const userSubmittedProposals: Application[] =
      userProposalsData?.proposals || [];

    // Collect proposals received on orders the user created
    const receivedProposals: Application[] = [];
    if (myOrdersData?.orders) {
      myOrdersData.orders.forEach((order: any) => {
        if (order.Proposals && Array.isArray(order.Proposals)) {
          order.Proposals.forEach((proposal: any) => {
            // Only include proposals that are not from the user themselves
            // (to avoid duplicates if user applied to their own order)
            if (
              proposal.userId !== user?.id &&
              proposal.id &&
              proposal.createdAt
            ) {
              receivedProposals.push({
                id: proposal.id,
                orderId: order.id,
                status: proposal.status || "pending",
                createdAt: proposal.createdAt,
                Order: {
                  id: order.id,
                  title: order.title || `Order #${order.id}`,
                  availableDates: order.availableDates || [],
                  status: order.status || "open",
                },
              });
            }
          });
        }
      });
    }

    // Combine both types of proposals
    const applications: Application[] = [
      ...userSubmittedProposals,
      ...receivedProposals,
    ];
    const appliedDateMap = new Map<string, Application[]>();
    const scheduledDateMap = new Map<string, Application[]>();

    applications.forEach((app) => {
      // Add application date (createdAt) to applied dates
      const appDate = new Date(app.createdAt);
      const appDateKey = getDateKey(appDate);
      if (!appliedDateMap.has(appDateKey)) {
        appliedDateMap.set(appDateKey, []);
      }
      appliedDateMap.get(appDateKey)!.push(app);

      // Add scheduled dates (availableDates) to scheduled dates
      if (app.Order?.availableDates) {
        app.Order.availableDates.forEach((dateStr: string) => {
          try {
            const scheduledDate = new Date(dateStr);
            const scheduledDateKey = getDateKey(scheduledDate);
            if (!scheduledDateMap.has(scheduledDateKey)) {
              scheduledDateMap.set(scheduledDateKey, []);
            }
            // Only add if not already added for this date
            const existing = scheduledDateMap.get(scheduledDateKey)!;
            if (!existing.find((a) => a.id === app.id)) {
              existing.push(app);
            }
          } catch (e) {
            console.error("Error parsing date:", dateStr, e);
          }
        });
      }
    });

    // Select the appropriate map based on filter mode
    const dateMap =
      dateFilterMode === "applied"
        ? appliedDateMap
        : dateFilterMode === "scheduled"
        ? scheduledDateMap
        : new Map(); // Return empty map for checkIns mode (bookings are handled separately)

    // Convert to array and sort
    const grouped: DateGroupedApplication[] = Array.from(dateMap.entries())
      .map(([dateKey, apps]) => {
        const date = new Date(dateKey);
        return {
          date: dateKey,
          dateLabel: date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          applications: apps,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return grouped;
  }, [userProposalsData, myOrdersData, dateFilterMode, user?.id]);

  // Get applications for a specific date
  const getApplicationsForDate = (date: Date): Application[] => {
    const dateKey = getDateKey(date);
    const group = groupedApplications.find((g) => g.date === dateKey);
    return group?.applications || [];
  };

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date): Booking[] => {
    const dateKey = getDateKey(date);
    const group = groupedBookings.find((g) => g.date === dateKey);
    return group?.bookings || [];
  };

  // Schedule notifications for accepted jobs when data changes
  useEffect(() => {
    const scheduleNotifications = async () => {
      if (!user || isLoading || error) {
        return;
      }

      try {
        // Collect all proposals with accepted status and scheduled dates
        const scheduledJobs: {
          orderId: number;
          orderTitle: string;
          scheduledDate: string;
          proposalId: number;
        }[] = [];

        // Get user submitted proposals
        const userProposals = userProposalsData?.proposals || [];

        // Get proposals received on user's orders
        const receivedProposals: Application[] = [];
        if (myOrdersData?.orders) {
          myOrdersData.orders.forEach((order: any) => {
            if (order.Proposals && Array.isArray(order.Proposals)) {
              order.Proposals.forEach((proposal: any) => {
                if (
                  proposal.userId !== user?.id &&
                  proposal.id &&
                  proposal.createdAt
                ) {
                  receivedProposals.push({
                    id: proposal.id,
                    orderId: order.id,
                    status: proposal.status || "pending",
                    createdAt: proposal.createdAt,
                    Order: {
                      id: order.id,
                      title: order.title || `Order #${order.id}`,
                      availableDates: order.availableDates || [],
                      status: order.status || "open",
                    },
                  });
                }
              });
            }
          });
        }

        // Combine all proposals
        const allProposals = [...userProposals, ...receivedProposals];

        // Extract accepted jobs with scheduled dates
        allProposals.forEach((proposal: any) => {
          if (
            proposal.status === "accepted" &&
            proposal.Order?.availableDates
          ) {
            proposal.Order.availableDates.forEach((dateStr: string) => {
              scheduledJobs.push({
                orderId: proposal.Order.id,
                orderTitle:
                  proposal.Order.title || `Order #${proposal.Order.id}`,
                scheduledDate: dateStr,
                proposalId: proposal.id,
              });
            });
          }
        });

        // Schedule notifications
        const notificationService = CalendarNotificationService.getInstance();
        await notificationService.scheduleJobNotifications(scheduledJobs);
      } catch (err) {
        console.error("Error scheduling calendar notifications:", err);
      }
    };

    scheduleNotifications();
  }, [userProposalsData, myOrdersData, user, isLoading, error]);

  const normalizeDate = (date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "pending":
        return "#FFA500"; // Orange
      case "accepted":
        return "#4CAF50"; // Green
      case "rejected":
        return "#F44336"; // Red
      case "cancelled":
      case "specialist-canceled":
        return "#9E9E9E"; // Gray
      default:
        return colors.tabIconDefault;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "pending":
        return t("pending");
      case "accepted":
        return t("accepted");
      case "rejected":
        return t("rejected");
      case "cancelled":
        return t("cancelled");
      case "specialist-canceled":
        return t("cancelled");
      default:
        return status;
    }
  };

  const handleDateSelect = (date: Date) => {
    // Check if there's data for this date based on current filter mode
    let hasData = false;

    if (dateFilterMode === "checkIns") {
      const bookings = getBookingsForDate(date);
      hasData = bookings.length > 0;
    } else {
      const apps = getApplicationsForDate(date);
      hasData = apps.length > 0;
    }

    if (hasData) {
      setSelectedDate(date);
      if (viewMode === "calendar") {
        setViewMode("list");
      }
    }
  };

  // Build marked dates for calendar
  const markedDatesForCalendar = useMemo(() => {
    const marked: { [key: string]: MarkedDate } = {};

    // Mark dates for applications (proposals)
    if (dateFilterMode !== "checkIns") {
      groupedApplications.forEach((group) => {
        const dateString = group.date; // Already in YYYY-MM-DD format
        const apps = group.applications;

        if (apps.length > 0) {
          // Get unique status colors for this date
          const statusColors = Array.from(
            new Set(apps.map((app) => getStatusColor(app.status)))
          );

          // Use the primary status color for styling
          const primaryColor = statusColors[0];

          marked[dateString] = {
            customStyles: {
              container: {
                backgroundColor: primaryColor + "10",
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: primaryColor,
              },
              text: {
                color: colors.text,
                fontWeight: "600",
              },
            },
          };
        }
      });
    }

    // Mark dates for bookings (check-ins)
    if (dateFilterMode === "checkIns") {
      groupedBookings.forEach((group) => {
        const dateString = group.date;
        const bookingsOnDate = group.bookings;

        if (bookingsOnDate.length > 0) {
          marked[dateString] = {
            customStyles: {
              container: {
                backgroundColor: "#9333EA15",
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: "#9333EA",
              },
              text: {
                color: colors.text,
                fontWeight: "600",
              },
            },
          };
        }
      });
    }

    // Mark selected date
    if (selectedDate) {
      const dateString = normalizeDate(selectedDate)
        .toISOString()
        .split("T")[0];
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
  }, [
    groupedApplications,
    groupedBookings,
    dateFilterMode,
    selectedDate,
    colors.text,
    colors.primary,
  ]);

  const renderCalendarView = () => {
    return (
      <View>
        <CalendarComponent
          mode="single"
          selectedDates={selectedDate ? [selectedDate] : []}
          onDateSelect={(date) => {
            if (!Array.isArray(date)) {
              handleDateSelect(date);
            }
          }}
          markedDates={markedDatesForCalendar}
          monthFormat="MMMM yyyy"
          firstDay={1} // Monday
          onMonthChange={(month) => {
            const newMonth = new Date(month.year, month.month - 1, 1);
            setCurrentMonth(newMonth);
          }}
        />

        {/* Legend */}
        <View
          style={[
            styles.legend,
            {
              backgroundColor: (colors as any).surface || colors.background,
              borderTopColor: colors.border,
              ...Shadows.sm,
            },
          ]}
        >
          <Text style={[styles.legendTitle, { color: colors.text }]}>
            {t("status")}
          </Text>
          <View style={styles.legendItems}>
            {dateFilterMode === "checkIns" ? (
              // Show booking legend for check-ins mode
              <View
                style={[
                  styles.legendItem,
                  {
                    backgroundColor: colors.background,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: BorderRadius.md,
                  },
                ]}
              >
                <View
                  style={[
                    styles.legendDot,
                    {
                      backgroundColor: "#9333EA",
                      shadowColor: "#9333EA",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.3,
                      shadowRadius: 2,
                      elevation: 2,
                    },
                  ]}
                />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  {t("booked")}
                </Text>
              </View>
            ) : (
              // Show status legends for applications mode
              [
                { status: "pending", label: t("pending") },
                { status: "accepted", label: t("accepted") },
                { status: "rejected", label: t("rejected") },
                { status: "cancelled", label: t("cancelled") },
              ].map((item) => (
                <View
                  key={item.status}
                  style={[
                    styles.legendItem,
                    {
                      backgroundColor: colors.background,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: BorderRadius.md,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.legendDot,
                      {
                        backgroundColor: getStatusColor(item.status),
                        shadowColor: getStatusColor(item.status),
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.3,
                        shadowRadius: 2,
                        elevation: 2,
                      },
                    ]}
                  />
                  <Text style={[styles.legendText, { color: colors.text }]}>
                    {item.label}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    );
  };

  // Handler functions for bookings
  const handleEditBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowEditBookingModal(true);
  };

  const handleCancelBooking = async (booking: Booking) => {
    Alert.alert(
      t("confirmCancelBooking"),
      `${t("scheduledDate")}: ${booking.scheduledDate}\n${
        booking.startTime
      } - ${booking.endTime}`,
      [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: t("confirmCancel"),
          style: "destructive",
          onPress: async () => {
            try {
              await apiService.cancelBooking(booking.id);
              Alert.alert(t("success"), t("bookingCancelledSuccess"));
              fetchBookings(); // Refresh bookings list
            } catch (error) {
              console.error("Error cancelling booking:", error);
              Alert.alert(t("error"), t("failedToCancelBooking"));
            }
          },
        },
      ]
    );
  };

  const handleSubmitEditBooking = async (
    scheduledDate: string,
    startTime: string,
    endTime: string
  ) => {
    if (!selectedBooking) return;

    setEditingBooking(true);
    try {
      await apiService.updateBooking(selectedBooking.id, {
        scheduledDate,
        startTime,
        endTime,
      });
      Alert.alert(t("success"), t("bookingUpdated"));
      fetchBookings(); // Refresh bookings list
      setShowEditBookingModal(false);
      setSelectedBooking(null);
    } catch (error: any) {
      console.error("Error updating booking:", error);
      Alert.alert(t("error"), error.message || t("failedToUpdateBooking"));
    } finally {
      setEditingBooking(false);
    }
  };

  const renderListView = () => {
    // Handle bookings view
    if (dateFilterMode === "checkIns") {
      const displayData = selectedDate
        ? groupedBookings.filter((g) => g.date === getDateKey(selectedDate))
        : groupedBookings;

      if (displayData.length === 0) {
        return (
          <EmptyPage
            type="empty"
            title={t("noBookings")}
            subtitle={selectedDate ? t("noBookingsOnDate") : t("noBookingsYet")}
            icon="calendar"
          />
        );
      }

      return (
        <FlatList
          style={[
            styles.container,
            { backgroundColor: colors.background, marginTop: Spacing.lg },
          ]}
          data={displayData}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <View style={styles.dateGroup}>
              <View
                style={[
                  styles.dateHeader,
                  {
                    backgroundColor:
                      (colors as any).surface || colors.background,
                    borderBottomColor: colors.border,
                    ...Shadows.sm,
                  },
                ]}
              >
                <View style={styles.dateHeaderContent}>
                  <View
                    style={[
                      styles.dateHeaderIndicator,
                      { backgroundColor: "#9333EA" }, // Purple for bookings
                    ]}
                  />
                  <Text style={[styles.dateHeaderText, { color: colors.text }]}>
                    {item.dateLabel}
                  </Text>
                </View>
                <CountBadge count={item.bookings.length} color="#9333EA" />
              </View>
              {item.bookings.map((booking) => {
                const isMyOrderBooking = booking.Order?.Client?.id === user?.id;
                const canEdit = isMyOrderBooking;

                return (
                  <TouchableOpacity
                    key={booking.id}
                    style={[
                      styles.applicationCard,
                      {
                        backgroundColor:
                          (colors as any).surface || colors.background,
                        borderColor: colors.border,
                        ...Shadows.md,
                      },
                    ]}
                    onPress={() => router.push(`/orders/${booking.orderId}`)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.applicationHeader}>
                      <View style={styles.applicationTitleContainer}>
                        <Text
                          style={[
                            styles.applicationTitle,
                            { color: colors.text },
                          ]}
                          numberOfLines={2}
                        >
                          {booking.Order?.title ||
                            t("order") + " #" + booking.orderId}
                        </Text>
                        {isMyOrderBooking && booking.Client && (
                          <Text
                            style={[
                              styles.applicationMetaText,
                              { color: colors.tabIconDefault, marginTop: 4 },
                            ]}
                          >
                            {t("bookedBy")}: {booking.Client.name}
                          </Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: "#9333EA" + "20",
                            borderWidth: 1,
                            borderColor: "#9333EA" + "40",
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: "#9333EA" },
                          ]}
                        />
                        <Text style={[styles.statusText, { color: "#9333EA" }]}>
                          {t("booked")}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.applicationMetaContainer}>
                      <View style={styles.applicationMeta}>
                        <IconSymbol
                          name="clock.fill"
                          size={14}
                          color={colors.tabIconDefault}
                        />
                        <Text
                          style={[
                            styles.applicationMetaText,
                            { color: colors.tabIconDefault },
                          ]}
                        >
                          {booking.startTime} - {booking.endTime}
                        </Text>
                      </View>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.bookingActions}>
                      {canEdit && (
                        <TouchableOpacity
                          style={[
                            styles.bookingActionButton,
                            {
                              backgroundColor: colors.primary + "15",
                              borderColor: colors.primary,
                            },
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleEditBooking(booking);
                          }}
                        >
                          <IconSymbol
                            name="pencil"
                            size={16}
                            color={colors.primary}
                          />
                          <Text
                            style={[
                              styles.bookingActionText,
                              { color: colors.primary },
                            ]}
                          >
                            {t("edit")}
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.bookingActionButton,
                          {
                            backgroundColor: "#FF3B30" + "15",
                            borderColor: "#FF3B30",
                          },
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCancelBooking(booking);
                        }}
                      >
                        <IconSymbol
                          name="xmark.circle"
                          size={16}
                          color="#FF3B30"
                        />
                        <Text
                          style={[
                            styles.bookingActionText,
                            { color: "#FF3B30" },
                          ]}
                        >
                          {t("remove")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      );
    }

    // Handle applications view
    const displayData = selectedDate
      ? groupedApplications.filter((g) => g.date === getDateKey(selectedDate))
      : groupedApplications;

    if (displayData.length === 0) {
      const emptyTitle =
        dateFilterMode === "applied"
          ? t("noAppliedApplications")
          : t("noScheduledApplications") || t("noApplications");
      const emptySubtitle =
        dateFilterMode === "applied"
          ? selectedDate
            ? t("noAppliedOnDate")
            : t("noAppliedDesc")
          : selectedDate
          ? t("noScheduledOnDate")
          : t("noScheduledDesc");

      return (
        <EmptyPage
          type="empty"
          title={emptyTitle}
          subtitle={emptySubtitle}
          icon="doc.text"
        />
      );
    }

    return (
      <FlatList
        style={[
          styles.container,
          { backgroundColor: colors.background, marginTop: Spacing.lg },
        ]}
        data={displayData}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => (
          <View style={styles.dateGroup}>
            <View
              style={[
                styles.dateHeader,
                {
                  backgroundColor: (colors as any).surface || colors.background,
                  borderBottomColor: colors.border,
                  ...Shadows.sm,
                },
              ]}
            >
              <View style={styles.dateHeaderContent}>
                <View
                  style={[
                    styles.dateHeaderIndicator,
                    { backgroundColor: colors.tint },
                  ]}
                />
                <Text style={[styles.dateHeaderText, { color: colors.text }]}>
                  {item.dateLabel}
                </Text>
              </View>
              <CountBadge
                count={item.applications.length}
                color={colors.tint}
              />
            </View>
            {item.applications.map((app) => (
              <TouchableOpacity
                key={app.id}
                style={[
                  styles.applicationCard,
                  {
                    backgroundColor:
                      (colors as any).surface || colors.background,
                    borderColor: colors.border,
                    ...Shadows.md,
                  },
                ]}
                onPress={() => router.push(`/orders/${app.orderId}`)}
                activeOpacity={0.8}
              >
                <View style={styles.applicationHeader}>
                  <View style={styles.applicationTitleContainer}>
                    <Text
                      style={[styles.applicationTitle, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {app.Order?.title || t("order") + " #" + app.orderId}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusColor(app.status) + "20",
                        borderWidth: 1,
                        borderColor: getStatusColor(app.status) + "40",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(app.status) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(app.status) },
                      ]}
                    >
                      {getStatusLabel(app.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.applicationMetaContainer}>
                  <View style={styles.applicationMeta}>
                    <IconSymbol
                      name="clock.fill"
                      size={14}
                      color={colors.tabIconDefault}
                    />
                    <Text
                      style={[
                        styles.applicationMetaText,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {t("applicationDate")}:{" "}
                      {new Date(app.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                  {app.Order?.availableDates &&
                    app.Order.availableDates.length > 0 && (
                      <View style={styles.applicationMeta}>
                        <IconSymbol
                          name="calendar"
                          size={14}
                          color={colors.tabIconDefault}
                        />
                        <Text
                          style={[
                            styles.applicationMetaText,
                            { color: colors.tabIconDefault },
                          ]}
                        >
                          {t("scheduledDate")}:{" "}
                          {app.Order.availableDates
                            .map((d: string) =>
                              new Date(d).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            )
                            .join(", ")}
                        </Text>
                      </View>
                    )}
                </View>
                <View style={styles.viewDetailsContainer}>
                  <View
                    style={[
                      styles.viewDetailsButton,
                      { backgroundColor: colors.tint + "15" },
                    ]}
                  >
                    <Text
                      style={[styles.viewDetailsText, { color: colors.tint }]}
                    >
                      {t("viewDetails")}
                    </Text>
                    <IconSymbol
                      name="chevron.right"
                      size={16}
                      color={colors.tint}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  if (error) {
    return (
      <Layout>
        <Header
          title={t("calendar")}
          showBackButton
          onBackPress={() => router.back()}
        />
        <EmptyPage
          type="error"
          title={t("error")}
          buttonText={t("retry")}
          onRetry={() => refetch()}
        />
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <Header
          title={t("calendar")}
          showBackButton
          onBackPress={() => router.back()}
        />
        <EmptyPage
          type="empty"
          title={t("loginRequired")}
          subtitle={t("loginToViewCalendar")}
          icon="person.badge.plus"
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <View style={{ paddingTop: 2 * Spacing.xxl }}>
        <Header
          title={t("myApplications")}
          showBackButton
          onBackPress={() => {
            if (viewMode === "list") {
              setViewMode("calendar");
              setSelectedDate(null);
            } else {
              router.back();
            }
          }}
          rightComponent={
            <View style={styles.headerControls}>
              <View style={styles.viewToggle}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    viewMode === "calendar" && {
                      backgroundColor: colors.tint,
                      ...Shadows.sm,
                    },
                    {
                      borderColor:
                        viewMode === "calendar" ? colors.tint : colors.border,
                      borderWidth: viewMode === "calendar" ? 0 : 1,
                    },
                  ]}
                  onPress={() => {
                    setViewMode("calendar");
                    setSelectedDate(null);
                  }}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    name="calendar"
                    size={18}
                    color={
                      viewMode === "calendar"
                        ? colors.background
                        : colors.tabIconDefault
                    }
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    viewMode === "list" && {
                      backgroundColor: colors.tint,
                      ...Shadows.sm,
                    },
                    {
                      borderColor:
                        viewMode === "list" ? colors.tint : colors.border,
                      borderWidth: viewMode === "list" ? 0 : 1,
                    },
                  ]}
                  onPress={() => setViewMode("list")}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    name="list.bullet"
                    size={18}
                    color={
                      viewMode === "list"
                        ? colors.background
                        : colors.tabIconDefault
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
          }
        />
        <View style={styles.dateFilterToggle}>
          <Button
            variant={dateFilterMode === "applied" ? "primary" : "outline"}
            icon="checkmark.circle"
            iconSize={14}
            textStyle={{ fontSize: 12 }}
            style={{ paddingHorizontal: Spacing.sm }}
            iconPosition="left"
            title={t("applied")}
            onPress={() => {
              setDateFilterMode("applied");
              setSelectedDate(null);
            }}
          />
          <Button
            variant={dateFilterMode === "scheduled" ? "primary" : "outline"}
            icon="clock.fill"
            iconSize={14}
            textStyle={{ fontSize: 12 }}
            style={{ paddingHorizontal: Spacing.sm }}
            iconPosition="left"
            title={t("scheduledDate")}
            onPress={() => {
              setDateFilterMode("scheduled");
              setSelectedDate(null);
            }}
          />
          <Button
            variant={dateFilterMode === "checkIns" ? "primary" : "outline"}
            icon="calendar"
            iconSize={14}
            textStyle={{ fontSize: 12 }}
            style={{ paddingHorizontal: Spacing.sm }}
            iconPosition="left"
            title={t("checkIns")}
            onPress={() => {
              setDateFilterMode("checkIns");
              setSelectedDate(null);
            }}
          />
        </View>
      </View>
      {viewMode === "calendar" ? (
        <ScrollView contentContainerStyle={styles.content}>
          {renderCalendarView()}
        </ScrollView>
      ) : (
        renderListView()
      )}

      {/* Edit Booking Modal */}
      <EditBookingModal
        visible={showEditBookingModal}
        onClose={() => {
          setShowEditBookingModal(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
        onSubmit={handleSubmitEditBooking}
        loading={editingBooking}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 2 * Spacing.xxxl,
  },
  content: {
    padding: Spacing.md,
  },
  headerControls: {
    flexDirection: "column",
    gap: 8,
    alignItems: "flex-end",
  },
  viewToggle: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "transparent",
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dateFilterToggle: {
    justifyContent: "center",
    marginTop: Spacing.lg,
    flexDirection: "row",
    gap: 6,
  },
  dateFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: 4,
    minWidth: 80,
  },
  dateFilterText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  legend: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    borderTopWidth: 0,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: Spacing.md,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  legendItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: "500",
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  dateGroup: {
    marginBottom: Spacing.xl,
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.md,
    borderBottomWidth: 0,
  },
  dateHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  dateHeaderIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  applicationCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.md,
  },
  applicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  applicationTitleContainer: {
    flex: 1,
  },
  applicationTitle: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  applicationMetaContainer: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  applicationMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 0,
  },
  applicationMetaText: {
    fontSize: 13,
    lineHeight: 18,
  },
  viewDetailsContainer: {
    marginTop: Spacing.md,
    alignItems: "flex-end",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  bookingActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  bookingActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
  },
  bookingActionText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
