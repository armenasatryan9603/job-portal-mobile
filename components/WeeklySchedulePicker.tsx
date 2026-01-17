import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { ThemeColors, Spacing, BorderRadius } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/TranslationContext";
import { TopTabs } from "@/components/TopTabs";
import { CalendarComponent, MarkedDate } from "@/components/CalendarComponent";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Button } from "@/components/ui/button";

export interface DaySchedule {
  enabled: boolean;
  workHours?: { start: string; end: string };
  // slots removed - clients now book custom time ranges
}

export interface WeeklySchedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

interface WeeklySchedulePickerProps {
  value: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
  workDurationPerClient: number;
  disabled?: boolean;
}

export const WeeklySchedulePicker: React.FC<WeeklySchedulePickerProps> = ({
  value,
  onChange,
  workDurationPerClient,
  disabled = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();

  // Debug: Log the value prop
  useEffect(() => {
    console.log("WeeklySchedulePicker received value:", value);
    console.log("Value keys:", Object.keys(value || {}));
  }, [value]);

  const [activeTab, setActiveTab] = useState<"pattern" | "preview">("pattern");
  const [defaultStartTime, setDefaultStartTime] = useState("09:00");
  const [defaultEndTime, setDefaultEndTime] = useState("17:00");

  // Initialize default times from existing schedule
  useEffect(() => {
    if (value && Object.keys(value).length > 0) {
      // Find first enabled day with work hours to set as default
      const enabledDay = Object.values(value).find(
        (day) => day?.enabled && day?.workHours
      );
      if (enabledDay?.workHours) {
        setDefaultStartTime(enabledDay.workHours.start);
        setDefaultEndTime(enabledDay.workHours.end);
      }
    }
  }, []);

  const days = [
    { key: "monday", label: t("monday") || "Monday" },
    { key: "tuesday", label: t("tuesday") || "Tuesday" },
    { key: "wednesday", label: t("wednesday") || "Wednesday" },
    { key: "thursday", label: t("thursday") || "Thursday" },
    { key: "friday", label: t("friday") || "Friday" },
    { key: "saturday", label: t("saturday") || "Saturday" },
    { key: "sunday", label: t("sunday") || "Sunday" },
  ];

  const tabs = [
    { key: "pattern", label: t("weeklyPattern") || "Weekly Pattern" },
    { key: "preview", label: t("calendarPreview") || "Calendar Preview" },
  ];

  // Slot generation removed - clients now book custom time ranges within work hours

  // Apply default hours to all working days
  const handleApplyToAllDays = () => {
    if (!defaultStartTime || !defaultEndTime) {
      Alert.alert(
        t("error"),
        t("pleaseSetDefaultHours") || "Please set default work hours first"
      );
      return;
    }

    const newSchedule: WeeklySchedule = {};
    days.forEach((day) => {
      // Apply to weekdays by default
      const isWeekend = day.key === "saturday" || day.key === "sunday";
      if (!isWeekend) {
        newSchedule[day.key as keyof WeeklySchedule] = {
          enabled: true,
          workHours: { start: defaultStartTime, end: defaultEndTime },
          // No slots - clients book custom time ranges
        };
      } else {
        newSchedule[day.key as keyof WeeklySchedule] = { enabled: false };
      }
    });

    onChange(newSchedule);
  };

  // Toggle day enabled/disabled
  const toggleDay = (dayKey: string) => {
    const currentDay = value[dayKey as keyof WeeklySchedule];
    const newSchedule = { ...value };

    if (currentDay?.enabled) {
      // Disable day
      newSchedule[dayKey as keyof WeeklySchedule] = { enabled: false };
    } else {
      // Enable day with default hours
      newSchedule[dayKey as keyof WeeklySchedule] = {
        enabled: true,
        workHours: { start: defaultStartTime, end: defaultEndTime },
        // No slots - clients book custom time ranges
      };
    }

    onChange(newSchedule);
  };

  // Update work hours for a specific day
  const updateDayWorkHours = (dayKey: string, start: string, end: string) => {
    const newSchedule = { ...value };

    newSchedule[dayKey as keyof WeeklySchedule] = {
      enabled: true,
      workHours: { start, end },
      // No slots - clients book custom time ranges
    };

    onChange(newSchedule);
  };

  // Get marked dates for calendar preview
  const previewMarkedDates = useMemo(() => {
    const marked: { [key: string]: MarkedDate } = {};
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    // Mark next 3 months of dates based on weekly schedule
    const currentDate = new Date(today);
    while (currentDate <= threeMonthsLater) {
      const dayOfWeek = currentDate.getDay();
      const dayName = dayNames[dayOfWeek];
      const daySchedule = value[dayName as keyof WeeklySchedule];

      if (daySchedule?.enabled) {
        const dateString = currentDate.toISOString().split("T")[0];
        marked[dateString] = {
          marked: true,
          dotColor: colors.primary,
          selectedColor: colors.primary,
        };
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return marked;
  }, [value, colors.primary]);

  // Render Weekly Pattern Tab
  const renderPatternTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Default Hours Section */}
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("defaultWorkHours") || "Default Work Hours"}
        </Text>
        <Text style={[styles.sectionDesc, { color: colors.tabIconDefault }]}>
          {t("defaultWorkHoursDesc") ||
            "Set default hours to apply to all working days"}
        </Text>
        <Text style={[styles.suggestionText, { color: colors.tabIconDefault }]}>
          {t("recommendedDuration") || "Recommended duration"}:{" "}
          {workDurationPerClient} {t("minutes") || "minutes"}
        </Text>
        <Text
          style={[styles.suggestionSubtext, { color: colors.tabIconDefault }]}
        >
          {t("clientsCanBookCustomRange") ||
            "Clients can book any time range within your work hours"}
        </Text>

        <View style={styles.timeRow}>
          <View style={styles.timeInputContainer}>
            <Text style={[styles.timeLabel, { color: colors.text }]}>
              {t("startTime") || "Start"}
            </Text>
            <TextInput
              style={[
                styles.timeInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={defaultStartTime}
              onChangeText={setDefaultStartTime}
              placeholder="09:00"
              placeholderTextColor={colors.tabIconDefault}
              editable={!disabled}
            />
          </View>

          <IconSymbol
            name="arrow.right"
            size={20}
            color={colors.tabIconDefault}
          />

          <View style={styles.timeInputContainer}>
            <Text style={[styles.timeLabel, { color: colors.text }]}>
              {t("endTime") || "End"}
            </Text>
            <TextInput
              style={[
                styles.timeInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={defaultEndTime}
              onChangeText={setDefaultEndTime}
              placeholder="17:00"
              placeholderTextColor={colors.tabIconDefault}
              editable={!disabled}
            />
          </View>
        </View>

        <Button
          variant="outline"
          title={t("applyToAllWorkingDays") || "Apply to All Working Days"}
          onPress={handleApplyToAllDays}
          disabled={disabled}
          icon="arrow.down.circle"
          iconSize={18}
        />
      </View>

      {/* Day-by-Day Schedule */}
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("dayByDaySchedule") || "Day-by-Day Schedule"}
        </Text>

        {days.map((day) => {
          const daySchedule = value[day.key as keyof WeeklySchedule];
          const isEnabled = daySchedule?.enabled || false;
          const workHoursDisplay = daySchedule?.workHours
            ? `${daySchedule.workHours.start} - ${daySchedule.workHours.end}`
            : "";

          return (
            <View
              key={day.key}
              style={[styles.dayRow, { borderBottomColor: colors.border }]}
            >
              <TouchableOpacity
                style={styles.dayHeader}
                onPress={() => toggleDay(day.key)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <View style={styles.dayInfo}>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: isEnabled ? colors.primary : colors.border,
                        backgroundColor: isEnabled
                          ? colors.primary
                          : "transparent",
                      },
                    ]}
                  >
                    {isEnabled && (
                      <IconSymbol name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.dayLabel,
                      {
                        color: isEnabled ? colors.text : colors.tabIconDefault,
                      },
                    ]}
                  >
                    {day.label}
                  </Text>
                </View>

                {isEnabled && workHoursDisplay && (
                  <Text
                    style={[styles.slotCount, { color: colors.tabIconDefault }]}
                  >
                    {workHoursDisplay}
                  </Text>
                )}
              </TouchableOpacity>

              {isEnabled && daySchedule?.workHours && (
                <View style={styles.dayTimeRow}>
                  <TextInput
                    style={[
                      styles.dayTimeInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={daySchedule.workHours.start}
                    onChangeText={(newStart) => {
                      if (daySchedule.workHours) {
                        updateDayWorkHours(
                          day.key,
                          newStart,
                          daySchedule.workHours.end
                        );
                      }
                    }}
                    placeholder="09:00"
                    placeholderTextColor={colors.tabIconDefault}
                    editable={!disabled}
                  />

                  <Text
                    style={[
                      styles.timeSeparator,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    —
                  </Text>

                  <TextInput
                    style={[
                      styles.dayTimeInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={daySchedule.workHours.end}
                    onChangeText={(newEnd) => {
                      if (daySchedule.workHours) {
                        updateDayWorkHours(
                          day.key,
                          daySchedule.workHours.start,
                          newEnd
                        );
                      }
                    }}
                    placeholder="17:00"
                    placeholderTextColor={colors.tabIconDefault}
                    editable={!disabled}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  // Render Calendar Preview Tab
  const renderPreviewTab = () => {
    const hasSchedule = Object.values(value).some((day) => day?.enabled);

    if (!hasSchedule) {
      return (
        <View style={styles.emptyPreview}>
          <IconSymbol name="calendar" size={48} color={colors.tabIconDefault} />
          <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
            {t("setWeeklyPatternFirst") ||
              "Set your weekly pattern first to see the calendar preview"}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("next3Months") || "Next 3 Months"}
          </Text>
          <Text style={[styles.sectionDesc, { color: colors.tabIconDefault }]}>
            {t("previewYourAvailability") ||
              "Preview your availability. Marked dates show when you'll be available."}
          </Text>

          <CalendarComponent
            mode="single"
            markedDates={previewMarkedDates}
            minDate={new Date()}
            maxDate={
              new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 3 months
            }
            monthFormat="MMMM yyyy"
            calendarProps={{
              disableAllTouchEventsForDisabledDays: true,
            }}
          />

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.primary }]}
              />
              <Text style={[styles.legendText, { color: colors.text }]}>
                {t("workingDay") || "Working Day"}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: colors.tabIconDefault },
                ]}
              />
              <Text style={[styles.legendText, { color: colors.text }]}>
                {t("dayOff") || "Day Off"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <TopTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as "pattern" | "preview")}
      />

      {activeTab === "pattern" && renderPatternTab()}
      {activeTab === "preview" && renderPreviewTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  section: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  timeInput: {
    height: 48,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 17,
    textAlign: "center",
    fontWeight: "600",
  },
  dayRow: {
    borderBottomWidth: 1,
    paddingVertical: Spacing.lg,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  dayInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dayLabel: {
    fontSize: 17,
    fontWeight: "600",
  },
  slotCount: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.7,
  },
  dayTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingLeft: 42,
    gap: Spacing.sm,
  },
  dayTimeInput: {
    height: 44,
    flex: 1,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    textAlign: "center",
    fontWeight: "600",
  },
  timeSeparator: {
    marginHorizontal: Spacing.xs,
    fontSize: 18,
    fontWeight: "700",
    opacity: 0.5,
  },
  emptyPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 3,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    lineHeight: 24,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  legendText: {
    fontSize: 14,
    fontWeight: "500",
  },
  suggestionText: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  suggestionSubtext: {
    fontSize: 13,
    fontStyle: "italic",
    marginTop: Spacing.sm,
    opacity: 0.7,
    lineHeight: 18,
  },
});
