import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BorderRadius, Spacing, ThemeColors } from "@/constants/styles";
import { CalendarComponent, MarkedDate } from "@/components/CalendarComponent";
import React, { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TopTabs } from "@/components/TopTabs";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/TranslationContext";

export interface DaySchedule {
  enabled: boolean;
  workHours?: { start: string; end: string };
  // slots removed - clients now book custom time ranges
  breaks?: Array<{ start: string; end: string }>;
}

export interface WeeklySchedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
  subscribeAheadDays?: number;
}

interface WeeklySchedulePickerProps {
  value: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
  workDurationPerClient?: number; // Optional - only used for display recommendation
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

  const [activeTab, setActiveTab] = useState<"pattern" | "preview">("pattern");
  const [defaultStartTime, setDefaultStartTime] = useState("09:00");
  const [defaultEndTime, setDefaultEndTime] = useState("17:00");
  const [subscribeAheadInput, setSubscribeAheadInput] = useState(
    value.subscribeAheadDays != null ? value.subscribeAheadDays.toString() : ""
  );

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

  // Keep local subscribe-ahead input in sync with external value
  useEffect(() => {
    if (value.subscribeAheadDays != null) {
      setSubscribeAheadInput(value.subscribeAheadDays.toString());
    }
  }, [value.subscribeAheadDays]);

  const days = [
    { key: "monday", label: t("monday") },
    { key: "tuesday", label: t("tuesday") },
    { key: "wednesday", label: t("wednesday") },
    { key: "thursday", label: t("thursday") },
    { key: "friday", label: t("friday") },
    { key: "saturday", label: t("saturday") },
    { key: "sunday", label: t("sunday") },
  ];

  const tabs = [
    { key: "pattern", label: t("weeklyPattern")  },
    { key: "preview", label: t("calendarPreview")  },
  ];

  // Slot generation removed - clients now book custom time ranges within work hours

  // Apply default hours to all working days
  const handleApplyToAllDays = () => {
    if (!defaultStartTime || !defaultEndTime) {
      Alert.alert(
        t("error"),
        t("pleaseSetDefaultHours") 
      );
      return;
    }

    const newSchedule: WeeklySchedule = {
      subscribeAheadDays: value.subscribeAheadDays || 90, // Preserve existing value
    };
    days.forEach((day) => {
      // Apply to weekdays by default
      const isWeekend = day.key === "saturday" || day.key === "sunday";
      const dayKey = day.key as keyof WeeklySchedule;
      if (dayKey !== "subscribeAheadDays") {
        if (!isWeekend) {
          (newSchedule as any)[dayKey] = {
            enabled: true,
            workHours: { start: defaultStartTime, end: defaultEndTime },
            // No slots - clients book custom time ranges
          };
        } else {
          (newSchedule as any)[dayKey] = { enabled: false };
        }
      }
    });

    onChange(newSchedule);
  };

  // Toggle day enabled/disabled
  const toggleDay = (dayKey: string) => {
    if (dayKey === "subscribeAheadDays") return; // Don't toggle subscribeAheadDays
    
    const currentDay = (value as any)[dayKey] as DaySchedule | undefined;
    const newSchedule = { ...value };

    if (currentDay?.enabled) {
      // Disable day
      (newSchedule as any)[dayKey] = { enabled: false };
    } else {
      // Enable day with default hours
      (newSchedule as any)[dayKey] = {
        enabled: true,
        workHours: { start: defaultStartTime, end: defaultEndTime },
        // No slots - clients book custom time ranges
      };
    }

    onChange(newSchedule);
  };

  // Update work hours for a specific day
  const updateDayWorkHours = (dayKey: string, start: string, end: string) => {
    if (dayKey === "subscribeAheadDays") return; // Don't update subscribeAheadDays
    
    const newSchedule = { ...value };
    const currentDay = (value as any)[dayKey] as DaySchedule | undefined;

    (newSchedule as any)[dayKey] = {
      enabled: true,
      workHours: { start, end },
      breaks: currentDay?.breaks || [],
      // No slots - clients book custom time ranges
    };

    onChange(newSchedule);
  };

  // Helper: Convert time string to minutes since midnight
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Helper: Convert minutes since midnight to time string (HH:MM)
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };

  // Helper: Validate break times
  const validateBreak = (
    breakStart: string,
    breakEnd: string,
    workHours: { start: string; end: string },
    existingBreaks: Array<{ start: string; end: string }>,
    excludeIndex?: number
  ): string | null => {
    // Validate format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(breakStart) || !timeRegex.test(breakEnd)) {
      return t("invalidTimeFormat") || "Invalid time format. Use HH:MM";
    }

    const startMinutes = timeToMinutes(breakStart);
    const endMinutes = timeToMinutes(breakEnd);
    const workStartMinutes = timeToMinutes(workHours.start);
    const workEndMinutes = timeToMinutes(workHours.end);

    // Check start < end
    if (startMinutes >= endMinutes) {
      return t("breakStartMustBeBeforeEnd") || "Break start time must be before end time";
    }

    // Check within work hours
    if (startMinutes < workStartMinutes || endMinutes > workEndMinutes) {
      return t("breakMustBeWithinWorkHours") || "Break must be within work hours";
    }

    // Check overlap with existing breaks
    const filteredBreaks = existingBreaks.filter((_, idx) => idx !== excludeIndex);
    for (const existingBreak of filteredBreaks) {
      const existingStart = timeToMinutes(existingBreak.start);
      const existingEnd = timeToMinutes(existingBreak.end);
      
      // Check if breaks overlap
      if (
        (startMinutes < existingEnd && endMinutes > existingStart)
      ) {
        return t("breaksCannotOverlap") || "Breaks cannot overlap with each other";
      }
    }

    return null;
  };

  // Add break to a day
  const addBreak = (dayKey: string) => {
    if (dayKey === "subscribeAheadDays") return;
    
    const daySchedule = (value as any)[dayKey] as DaySchedule | undefined;
    if (!daySchedule?.enabled || !daySchedule?.workHours) {
      Alert.alert(t("error"), t("pleaseSetWorkHoursFirst") || "Please set work hours first");
      return;
    }

    const workHours = daySchedule.workHours;
    const existingBreaks = daySchedule.breaks || [];
    const workStartMinutes = timeToMinutes(workHours.start);
    const workEndMinutes = timeToMinutes(workHours.end);
    const defaultBreakDuration = 60; // 1 hour in minutes
    
    // Calculate next available break time
    let defaultStartMinutes: number = 0;
    let defaultEndMinutes: number = 0;

    if (existingBreaks.length === 0) {
      // No existing breaks, use default lunch time (12:00-13:00) if it fits, otherwise use work start
      const lunchStart = timeToMinutes("12:00");
      const lunchEnd = lunchStart + defaultBreakDuration;
      
      if (lunchStart >= workStartMinutes && lunchEnd <= workEndMinutes) {
        defaultStartMinutes = lunchStart;
        defaultEndMinutes = lunchEnd;
      } else {
        // Use work start time
        defaultStartMinutes = workStartMinutes;
        defaultEndMinutes = Math.min(workStartMinutes + defaultBreakDuration, workEndMinutes);
      }
    } else {
      // Sort existing breaks by start time
      const sortedBreaks = [...existingBreaks].sort((a, b) => 
        timeToMinutes(a.start) - timeToMinutes(b.start)
      );

      // Try to find a gap between breaks or after the last break
      let foundSlot = false;
      
      // Check gap after work start and before first break
      const firstBreakStart = timeToMinutes(sortedBreaks[0].start);
      if (firstBreakStart - workStartMinutes >= defaultBreakDuration) {
        defaultStartMinutes = workStartMinutes;
        defaultEndMinutes = workStartMinutes + defaultBreakDuration;
        foundSlot = true;
      } else {
        // Check gaps between breaks
        for (let i = 0; i < sortedBreaks.length - 1; i++) {
          const currentBreakEnd = timeToMinutes(sortedBreaks[i].end);
          const nextBreakStart = timeToMinutes(sortedBreaks[i + 1].start);
          const gap = nextBreakStart - currentBreakEnd;
          
          if (gap >= defaultBreakDuration) {
            defaultStartMinutes = currentBreakEnd;
            defaultEndMinutes = currentBreakEnd + defaultBreakDuration;
            foundSlot = true;
            break;
          }
        }
        
        // If no gap found, try after the last break
        if (!foundSlot) {
          const lastBreakEnd = timeToMinutes(sortedBreaks[sortedBreaks.length - 1].end);
          if (workEndMinutes - lastBreakEnd >= defaultBreakDuration) {
            defaultStartMinutes = lastBreakEnd;
            defaultEndMinutes = Math.min(lastBreakEnd + defaultBreakDuration, workEndMinutes);
            foundSlot = true;
          }
        }
      }

      // If no suitable slot found, show error
      if (!foundSlot) {
        Alert.alert(
          t("error"),
          t("noSpaceForBreak") || "No available time slot for a new break. Please adjust existing breaks or work hours."
        );
        return;
      }
    }

    const defaultStart = minutesToTime(defaultStartMinutes);
    const defaultEnd = minutesToTime(defaultEndMinutes);

    // Validate the calculated break (should always pass, but double-check)
    const validationError = validateBreak(
      defaultStart,
      defaultEnd,
      workHours,
      existingBreaks
    );

    if (validationError) {
      Alert.alert(t("error"), validationError);
      return;
    }

    const newSchedule = { ...value };
    (newSchedule as any)[dayKey] = {
      ...daySchedule,
      breaks: [...existingBreaks, { start: defaultStart, end: defaultEnd }],
    };

    onChange(newSchedule);
  };

  // Update break time
  const updateBreak = (
    dayKey: string,
    breakIndex: number,
    field: "start" | "end",
    newTime: string
  ) => {
    if (dayKey === "subscribeAheadDays") return;
    
    const daySchedule = (value as any)[dayKey] as DaySchedule | undefined;
    if (!daySchedule?.enabled || !daySchedule?.workHours) return;

    const existingBreaks = [...(daySchedule.breaks || [])];
    const breakToUpdate = { ...existingBreaks[breakIndex] };
    breakToUpdate[field] = newTime;

    // Validate break
    const validationError = validateBreak(
      breakToUpdate.start,
      breakToUpdate.end,
      daySchedule.workHours,
      existingBreaks,
      breakIndex
    );

    if (validationError) {
      Alert.alert(t("error"), validationError);
      return;
    }

    existingBreaks[breakIndex] = breakToUpdate;

    const newSchedule = { ...value };
    (newSchedule as any)[dayKey] = {
      ...daySchedule,
      breaks: existingBreaks,
    };

    onChange(newSchedule);
  };

  // Delete break
  const deleteBreak = (dayKey: string, breakIndex: number) => {
    if (dayKey === "subscribeAheadDays") return;
    
    const daySchedule = (value as any)[dayKey] as DaySchedule | undefined;
    if (!daySchedule) return;

    const existingBreaks = [...(daySchedule.breaks || [])];
    existingBreaks.splice(breakIndex, 1);

    const newSchedule = { ...value };
    (newSchedule as any)[dayKey] = {
      ...daySchedule,
      breaks: existingBreaks,
    };

    onChange(newSchedule);
  };

  // Get marked dates for calendar preview
  const previewMarkedDates = useMemo(() => {
    const marked: { [key: string]: MarkedDate } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const aheadDays = value.subscribeAheadDays || 90;
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + aheadDays);

    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    // Mark dates based on weekly schedule up to subscribeAheadDays
    const currentDate = new Date(today);
    while (currentDate <= maxDate) {
      const dayOfWeek = currentDate.getDay();
      const dayName = dayNames[dayOfWeek];
      const daySchedule = (value as any)[dayName] as DaySchedule | undefined;

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
      <View style={[styles.section, { backgroundColor: colors.background, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("defaultWorkHours")}
        </Text>
        <Text style={[styles.sectionDesc, { color: colors.tabIconDefault }]}>
          {t("defaultWorkHoursDesc")}
        </Text>
        {workDurationPerClient && (
          <Text style={[styles.suggestionText, { color: colors.tabIconDefault }]}>
            {t("recommendedDuration")}:{" "}
            {workDurationPerClient} {t("minutes")}
          </Text>
        )}
        <Text
          style={[styles.suggestionSubtext, { color: colors.tabIconDefault }]}
        >
          {t("clientsCanBookCustomRange")}
        </Text>

        <View style={styles.timeRow}>
          <View style={styles.timeInputContainer}>
            <Text style={[styles.timeLabel, { color: colors.text }]}>
              {t("startTime")}
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
            size={16}
            color={colors.tabIconDefault}
            style={{ marginTop: 18 }}
          />

          <View style={styles.timeInputContainer}>
            <Text style={[styles.timeLabel, { color: colors.text }]}>
              {t("endTime")}
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
          title={t("applyToAllWorkingDays")}
          onPress={handleApplyToAllDays}
          disabled={disabled}
          icon="arrow.down.circle"
          iconSize={14}
        />
      </View>

      {/* Subscribe Ahead Days */}
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("subscribeAheadDays")}
        </Text>
        <Text style={[styles.sectionDesc, { color: colors.tabIconDefault }]}>
          {t("subscribeAheadDaysDesc")}
        </Text>
        <View style={styles.subscribeAheadRow}>
          <TextInput
            style={[
              styles.subscribeAheadInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={subscribeAheadInput}
            onChangeText={(text) => {
              const digitsOnly = text.replace(/[^0-9]/g, "");
              setSubscribeAheadInput(digitsOnly);

              const parsed = parseInt(digitsOnly, 10);
              const nextValue: WeeklySchedule = {
                ...value,
                subscribeAheadDays: Number.isNaN(parsed) ? undefined : parsed,
              };

              onChange(nextValue);
            }}
            placeholder="90"
            placeholderTextColor={colors.tabIconDefault}
            keyboardType="numeric"
            editable={!disabled}
          />
          <Text style={[styles.subscribeAheadLabel, { color: colors.text }]}>
            {t("days") || "days"}
          </Text>
        </View>
      </View>

      {/* Day-by-Day Schedule */}
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("dayByDaySchedule")}
        </Text>

        {days.map((day) => {
          const daySchedule = (value as any)[day.key] as DaySchedule | undefined;
          const isEnabled = daySchedule?.enabled || false;
          const workHoursDisplay = daySchedule?.workHours
            ? `${(daySchedule as DaySchedule).workHours!.start} - ${(daySchedule as DaySchedule).workHours!.end}`
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
                      <IconSymbol name="checkmark" size={12} color="#FFFFFF" />
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
                <>
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
                      value={(daySchedule as DaySchedule).workHours!.start}
                      onChangeText={(newStart) => {
                        const schedule = daySchedule as DaySchedule;
                        if (schedule.workHours) {
                          updateDayWorkHours(
                            day.key,
                            newStart,
                            schedule.workHours.end
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
                      value={(daySchedule as DaySchedule).workHours!.end}
                      onChangeText={(newEnd) => {
                        const schedule = daySchedule as DaySchedule;
                        if (schedule.workHours) {
                          updateDayWorkHours(
                            day.key,
                            schedule.workHours.start,
                            newEnd
                          );
                        }
                      }}
                      placeholder="17:00"
                      placeholderTextColor={colors.tabIconDefault}
                      editable={!disabled}
                    />
                  </View>

                  {/* Breaks Section */}
                  <View style={styles.breaksSection}>
                    <View style={styles.breaksHeader}>
                      <Text style={[styles.breaksTitle, { color: colors.text }]}>
                        {t("breaks") || "Breaks"}
                      </Text>
                      {!disabled && (
                        <TouchableOpacity
                          onPress={() => addBreak(day.key)}
                          style={styles.addBreakButton}
                          activeOpacity={0.7}
                        >
                          <IconSymbol
                            name="plus.circle.fill"
                            size={18}
                            color={colors.primary}
                          />
                          <Text style={[styles.addBreakText, { color: colors.primary }]}>
                            {t("addBreak") || "Add Break"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {daySchedule.breaks && daySchedule.breaks.length > 0 && (
                      <View style={styles.breaksList}>
                        {daySchedule.breaks.map((breakItem, breakIndex) => (
                          <View
                            key={breakIndex}
                            style={[
                              styles.breakItem,
                              {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <View style={styles.breakTimeRow}>
                              <TextInput
                                style={[
                                  styles.breakTimeInput,
                                  {
                                    backgroundColor: colors.background,
                                    borderColor: colors.border,
                                    color: colors.text,
                                  },
                                ]}
                                value={breakItem.start}
                                onChangeText={(newStart) =>
                                  updateBreak(day.key, breakIndex, "start", newStart)
                                }
                                placeholder="12:00"
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
                                  styles.breakTimeInput,
                                  {
                                    backgroundColor: colors.background,
                                    borderColor: colors.border,
                                    color: colors.text,
                                  },
                                ]}
                                value={breakItem.end}
                                onChangeText={(newEnd) =>
                                  updateBreak(day.key, breakIndex, "end", newEnd)
                                }
                                placeholder="13:00"
                                placeholderTextColor={colors.tabIconDefault}
                                editable={!disabled}
                              />
                            </View>

                            {!disabled && (
                              <TouchableOpacity
                                onPress={() => deleteBreak(day.key, breakIndex)}
                                style={styles.deleteBreakButton}
                                activeOpacity={0.7}
                              >
                                <IconSymbol
                                  name="trash"
                                  size={16}
                                  color={colors.errorVariant}
                                />
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </>
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
          <IconSymbol name="calendar" size={36} color={colors.tabIconDefault} />
          <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
            {t("setWeeklyPatternFirst")}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("next3Months")}
          </Text>
          <Text style={[styles.sectionDesc, { color: colors.tabIconDefault }]}>
            {t("previewYourAvailability")}
          </Text>

          <CalendarComponent
            mode="single"
            markedDates={previewMarkedDates}
            minDate={new Date()}
            maxDate={(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const aheadDays = value.subscribeAheadDays || 90;
              const maxDate = new Date(today);
              maxDate.setDate(maxDate.getDate() + aheadDays);
              return maxDate;
            })()}
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
                {t("workingDay")}
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
                {t("dayOff")}
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
        style={{ borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg }}
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
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  sectionDesc: {
    fontSize: 12,
    marginBottom: Spacing.md,
    lineHeight: 16,
    opacity: 0.7,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  timeInput: {
    height: 40,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    fontSize: 15,
    textAlign: "center",
    fontWeight: "600",
  },
  dayRow: {
    borderBottomWidth: 1,
    paddingVertical: Spacing.sm,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs / 2,
  },
  dayInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  slotCount: {
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.7,
  },
  dayTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingLeft: 36,
    gap: Spacing.xs,
  },
  dayTimeInput: {
    height: 36,
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
  },
  timeSeparator: {
    marginHorizontal: Spacing.xs / 2,
    fontSize: 14,
    fontWeight: "700",
    opacity: 0.5,
  },
  emptyPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    lineHeight: 20,
    opacity: 0.7,
  },
  subscribeAheadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  subscribeAheadInput: {
    height: 40,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    fontSize: 15,
    textAlign: "center",
    fontWeight: "600",
    minWidth: 80,
  },
  subscribeAheadLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.md,
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "500",
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  suggestionSubtext: {
    fontSize: 11,
    fontStyle: "italic",
    marginTop: Spacing.xs,
    opacity: 0.7,
    lineHeight: 15,
  },
  breaksSection: {
    marginTop: Spacing.md,
    paddingLeft: 36,
  },
  breaksHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  breaksTitle: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.8,
  },
  addBreakButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  addBreakText: {
    fontSize: 12,
    fontWeight: "600",
  },
  breaksList: {
    gap: Spacing.sm,
  },
  breakItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  breakTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.xs,
  },
  breakTimeInput: {
    height: 32,
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: 12,
    textAlign: "center",
    fontWeight: "600",
  },
  deleteBreakButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
});
