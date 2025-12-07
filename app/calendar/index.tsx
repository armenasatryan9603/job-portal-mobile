import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { EmptyPage } from "@/components/EmptyPage";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CalendarGrid } from "@/components/CalendarGrid";
import {
  ThemeColors,
  Shadows,
  BorderRadius,
  Spacing,
} from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useProposalsByUser } from "@/hooks/useApi";
import { router } from "expo-router";
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from "react-native";
import { useAnalytics } from "@/hooks/useAnalytics";

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
type DateFilterMode = "applied" | "scheduled";

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

  const { data, isLoading, error, refetch } = useProposalsByUser(user?.id || 0);

  // Process applications and group by date (separate for applied and scheduled)
  const processedApplications = useMemo(() => {
    if (!data?.proposals) return [];

    const applications: Application[] = data.proposals;
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
      dateFilterMode === "applied" ? appliedDateMap : scheduledDateMap;

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
  }, [data, dateFilterMode]);

  // Get applications for a specific date
  const getApplicationsForDate = (date: Date): Application[] => {
    const dateKey = getDateKey(date);
    const group = processedApplications.find((g) => g.date === dateKey);
    return group?.applications || [];
  };

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

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateSelect = (date: Date) => {
    const apps = getApplicationsForDate(date);
    if (apps.length > 0) {
      setSelectedDate(date);
      if (viewMode === "calendar") {
        setViewMode("list");
      }
    }
  };

  const renderCalendarView = () => {
    return (
      <View>
        <CalendarGrid
          currentMonth={currentMonth}
          onMonthNavigate={navigateMonth}
          onDatePress={handleDateSelect}
          getDateIndicators={(date) => {
            const apps = getApplicationsForDate(date);
            if (apps.length === 0) return {};
            const statusColors = Array.from(
              new Set(apps.map((app) => getStatusColor(app.status)))
            );
            return {
              colors: statusColors,
              count: apps.length,
            };
          }}
          isDateSelected={(date) => {
            if (!selectedDate) return false;
            return (
              normalizeDate(selectedDate).toDateString() ===
              normalizeDate(date).toDateString()
            );
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
            {[
              { status: "pending", label: t("pending") },
              { status: "accepted", label: t("accepted") || "Accepted" },
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
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderListView = () => {
    const displayData = selectedDate
      ? processedApplications.filter((g) => g.date === getDateKey(selectedDate))
      : processedApplications;

    if (displayData.length === 0) {
      return (
        <EmptyPage
          type="empty"
          title={t("noApplications") || "No Applications"}
          subtitle={
            selectedDate
              ? t("noApplicationsOnDate") ||
                "No applications found for this date"
              : t("noApplicationsDesc") || "You haven't applied to any jobs yet"
          }
          icon="doc.text"
        />
      );
    }

    return (
      <FlatList
        style={[styles.container, { backgroundColor: colors.background }]}
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
              <View
                style={[
                  styles.dateCountBadge,
                  { backgroundColor: colors.tint + "20" },
                ]}
              >
                <Text style={[styles.dateCount, { color: colors.tint }]}>
                  {item.applications.length}
                </Text>
              </View>
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
    return (
      <Layout>
        <Header
          title={t("calendar")}
          showBackButton
          onBackPress={() => router.back()}
        />
        <EmptyPage type="loading" title={t("loading")} />
      </Layout>
    );
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
          title={t("error") || "Error"}
          buttonText={t("retry") || "Retry"}
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
      <View style={{ paddingTop: 2 * Spacing.xxxl }}>
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
              <View style={styles.dateFilterToggle}>
                <TouchableOpacity
                  style={[
                    styles.dateFilterButton,
                    dateFilterMode === "applied" && {
                      backgroundColor: colors.tint,
                      ...Shadows.sm,
                    },
                    {
                      borderColor:
                        dateFilterMode === "applied"
                          ? colors.tint
                          : colors.border,
                      borderWidth: dateFilterMode === "applied" ? 0 : 1,
                    },
                  ]}
                  onPress={() => setDateFilterMode("applied")}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    name="clock.fill"
                    size={14}
                    color={
                      dateFilterMode === "applied"
                        ? colors.background
                        : colors.tabIconDefault
                    }
                  />
                  <Text
                    style={[
                      styles.dateFilterText,
                      {
                        color:
                          dateFilterMode === "applied"
                            ? colors.background
                            : colors.tabIconDefault,
                      },
                    ]}
                  >
                    {t("applied") || "Applied"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dateFilterButton,
                    dateFilterMode === "scheduled" && {
                      backgroundColor: colors.tint,
                      ...Shadows.sm,
                    },
                    {
                      borderColor:
                        dateFilterMode === "scheduled"
                          ? colors.tint
                          : colors.border,
                      borderWidth: dateFilterMode === "scheduled" ? 0 : 1,
                    },
                  ]}
                  onPress={() => setDateFilterMode("scheduled")}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    name="calendar"
                    size={14}
                    color={
                      dateFilterMode === "scheduled"
                        ? colors.background
                        : colors.tabIconDefault
                    }
                  />
                  <Text
                    style={[
                      styles.dateFilterText,
                      {
                        color:
                          dateFilterMode === "scheduled"
                            ? colors.background
                            : colors.tabIconDefault,
                      },
                    ]}
                  >
                    {t("scheduledDate") || "Scheduled"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        />
      </View>
      {viewMode === "calendar" ? (
        <ScrollView contentContainerStyle={styles.content}>
          {renderCalendarView()}
        </ScrollView>
      ) : (
        renderListView()
      )}
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
    marginTop: Spacing.lg,
    flexDirection: "row",
    gap: 6,
    backgroundColor: "transparent",
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
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
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
    fontSize: 12,
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
  dateCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    minWidth: 32,
    alignItems: "center",
  },
  dateCount: {
    fontSize: 13,
    fontWeight: "700",
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
});
