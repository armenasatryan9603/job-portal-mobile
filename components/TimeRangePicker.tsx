import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  LayoutChangeEvent,
} from "react-native";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { ThemeColors, Spacing, BorderRadius } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/TranslationContext";

interface TimeRangePickerProps {
  workHours: { start: string; end: string };
  existingBookings: Array<{
    startTime: string;
    endTime: string;
    clientId?: number;
  }>;
  breaks?: Array<{ start: string; end: string }>;
  onSelectRange: (startTime: string, endTime: string) => void;
  suggestedDuration?: number; // in minutes
  disabled?: boolean;
  scrollViewRef?: React.RefObject<ScrollView | null>;
}

interface TimeBlock {
  type: "available" | "booked" | "break";
  startMinutes: number;
  endMinutes: number;
  startTime: string;
  endTime: string;
}

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  workHours,
  existingBookings,
  breaks = [],
  onSelectRange,
  suggestedDuration,
  disabled = false,
  scrollViewRef,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();

  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(
    null
  );
  const [sliderValues, setSliderValues] = useState<[number, number]>([0, 60]);
  const [timelineWidth, setTimelineWidth] = useState<number>(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const sliderContainerRef = useRef<View>(null);

  // Convert time string to minutes since midnight
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes to time string
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };

  // Format duration in minutes to readable format (e.g., "1h 30min" or "45min")
  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0
        ? `${hours} ${t("hours")} ${mins} ${t("minutes")}`
        : `${hours} ${t("hours")}`;
    }
    return `${minutes} ${t("minutes")}`;
  };

  // Get total minutes in the work day
  const workStartMinutes = timeToMinutes(workHours.start);
  const workEndMinutes = timeToMinutes(workHours.end);
  const totalWorkMinutes = workEndMinutes - workStartMinutes;

  // Build timeline blocks (available, booked, and breaks)
  const timelineBlocks = useMemo((): TimeBlock[] => {
    const blocks: TimeBlock[] = [];

    // Combine bookings and breaks, then sort by start time
    const allTimeSlots: Array<{
      start: number;
      end: number;
      type: "booked" | "break";
    }> = [
      ...existingBookings.map((b) => ({
        start: timeToMinutes(b.startTime),
        end: timeToMinutes(b.endTime),
        type: "booked" as const,
      })),
      ...breaks.map((b) => ({
        start: timeToMinutes(b.start),
        end: timeToMinutes(b.end),
        type: "break" as const,
      })),
    ].sort((a, b) => a.start - b.start);

    let currentTime = workStartMinutes;

    // Build alternating available/booked/break blocks
    allTimeSlots.forEach((slot) => {
      // Add available block before this slot
      if (currentTime < slot.start) {
        blocks.push({
          type: "available",
          startMinutes: currentTime,
          endMinutes: slot.start,
          startTime: minutesToTime(currentTime),
          endTime: minutesToTime(slot.start),
        });
      }

      // Add booked or break block
      blocks.push({
        type: slot.type,
        startMinutes: slot.start,
        endMinutes: slot.end,
        startTime: minutesToTime(slot.start),
        endTime: minutesToTime(slot.end),
      });

      currentTime = slot.end;
    });

    // Add final available block if there's time left
    if (currentTime < workEndMinutes) {
      blocks.push({
        type: "available",
        startMinutes: currentTime,
        endMinutes: workEndMinutes,
        startTime: minutesToTime(currentTime),
        endTime: minutesToTime(workEndMinutes),
      });
    }

    return blocks;
  }, [workHours, existingBookings, breaks, workStartMinutes, workEndMinutes]);

  // Get available blocks only
  const availableBlocks = timelineBlocks.filter((b) => b.type === "available");

  // Handle block selection
  const handleBlockSelect = (index: number) => {
    if (disabled) return;

    const block = availableBlocks[index];
    const blockDuration = block.endMinutes - block.startMinutes;

    if (selectedBlockIndex === index) {
      // Deselect block
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }).start(() => setSelectedBlockIndex(null));
    } else {
      // Select block and initialize slider
      setSelectedBlockIndex(index);
      // Initialize with suggestedDuration if provided, otherwise 60 minutes, but not more than block duration
      const initialDuration = Math.min(
        suggestedDuration && suggestedDuration > 0 ? suggestedDuration : 60,
        blockDuration
      );
      setSliderValues([0, initialDuration]);

      // Animate expansion
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }).start();

      // Auto-scroll to show slider
      setTimeout(() => {
        scrollViewRef?.current?.scrollTo({
          y: 2500,
          animated: true,
        });
      }, 600);
    }
  };

  // Get selected appointment times
  const getSelectedTimes = (): { start: string; end: string } | null => {
    if (selectedBlockIndex === null) return null;

    const block = availableBlocks[selectedBlockIndex];
    const startMinutes = block.startMinutes + sliderValues[0];
    const endMinutes = block.startMinutes + sliderValues[1];

    return {
      start: minutesToTime(startMinutes),
      end: minutesToTime(endMinutes),
    };
  };

  // Confirm time selection
  const handleConfirm = () => {
    const times = getSelectedTimes();

    if (!times) {
      Alert.alert(t("selectSlot"), t("pleaseSelectTimeSlot"));
      return;
    }

    onSelectRange(times.start, times.end);

    // Reset with animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start(() => {
      setSelectedBlockIndex(null);
      setSliderValues([0, 60]);
    });
  };

  // Calculate block width as percentage
  const getBlockWidth = (block: TimeBlock): string => {
    const duration = block.endMinutes - block.startMinutes;
    const percentage = (duration / totalWorkMinutes) * 100;
    return `${percentage}%`;
  };

  // Calculate block position as percentage
  const getBlockPosition = (block: TimeBlock): string => {
    const offset = block.startMinutes - workStartMinutes;
    const percentage = (offset / totalWorkMinutes) * 100;
    return `${percentage}%`;
  };

  const selectedTimes = getSelectedTimes();
  const selectedBlock =
    selectedBlockIndex !== null ? availableBlocks[selectedBlockIndex] : null;
  const selectedDuration = selectedTimes
    ? sliderValues[1] - sliderValues[0]
    : null;

  // Handle timeline layout
  const handleTimelineLayout = (event: LayoutChangeEvent) => {
    setTimelineWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {workHours.start} - {workHours.end}
        </Text>
        {suggestedDuration && (
          <Text style={[styles.suggestion, { color: colors.tabIconDefault }]}>
            {t("suggested")}: {formatDuration(suggestedDuration)}
          </Text>
        )}
        <Text style={[styles.instruction, { color: colors.tabIconDefault }]}>
          {t("tapAvailableBlockToSelect")}
        </Text>
      </View>

      {/* Timeline Visualization */}
      <View style={styles.timelineSection}>
        {/* Time labels */}
        <View style={styles.timeLabels}>
          <Text style={[styles.timeLabel, { color: colors.tabIconDefault }]}>
            {workHours.start}
          </Text>
          <Text style={[styles.timeLabel, { color: colors.tabIconDefault }]}>
            {workHours.end}
          </Text>
        </View>

        {/* Timeline bar with blocks */}
        <View
          style={[styles.timelineBar, { backgroundColor: colors.border }]}
          onLayout={handleTimelineLayout}
        >
          {timelineBlocks.map((block, index) => {
            const isAvailable = block.type === "available";
            const availableIndex = isAvailable
              ? availableBlocks.findIndex(
                  (b) => b.startMinutes === block.startMinutes
                )
              : -1;
            const isSelected = availableIndex === selectedBlockIndex;

            const isBreak = block.type === "break";
            const breakColor = "#FF9500"; // Orange color for breaks

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.timelineBlock,
                  {
                    width: getBlockWidth(block) as any,
                    left: getBlockPosition(block) as any,
                    backgroundColor: isBreak
                      ? breakColor + "80"
                      : isAvailable
                      ? isSelected
                        ? colors.primary
                        : colors.primary + "60"
                      : colors.tabIconDefault + "40",
                  },
                  isSelected && styles.timelineBlockSelected,
                ]}
                onPress={() => isAvailable && handleBlockSelect(availableIndex)}
                disabled={!isAvailable || disabled || isBreak}
                activeOpacity={isBreak ? 1 : 0.8}
              >
                <Text
                  style={[
                    styles.blockLabel,
                    {
                      color: isBreak
                        ? "#FFF"
                        : isSelected
                        ? "#FFF"
                        : colors.text,
                    },
                  ]}
                >
                  {isBreak
                    ? t("break") || "Break"
                    : formatDuration(block.endMinutes - block.startMinutes)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: colors.primary + "60" },
              ]}
            />
            <Text style={[styles.legendText, { color: colors.tabIconDefault }]}>
              {t("available")}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: colors.tabIconDefault + "40" },
              ]}
            />
            <Text style={[styles.legendText, { color: colors.tabIconDefault }]}>
              {t("booked")}
            </Text>
          </View>
          {breaks.length > 0 && (
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: "#FF9500" + "80" },
                ]}
              />
              <Text style={[styles.legendText, { color: colors.tabIconDefault }]}>
                {t("break") || "Break"}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Expanded Range Slider (when block selected) */}
      {selectedBlockIndex !== null && selectedBlock && (
        <Animated.View
          ref={sliderContainerRef}
          collapsable={false}
          style={[
            styles.sliderContainer,
            {
              backgroundColor: colors.background,
              borderColor: colors.primary,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderTitle, { color: colors.text }]}>
              {t("adjustYourTime")}
            </Text>
            <Text
              style={[styles.sliderSubtitle, { color: colors.tabIconDefault }]}
            >
              {selectedBlock.startTime} - {selectedBlock.endTime} (
              {formatDuration(
                selectedBlock.endMinutes - selectedBlock.startMinutes
              )}{" "}
              {t("available")})
            </Text>
          </View>

          {/* Selected time display */}
          {selectedTimes && (
            <View
              style={[
                styles.selectedTimeBox,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Text
                style={[styles.selectedTimeBoxText, { color: colors.primary }]}
              >
                {selectedTimes.start} → {selectedTimes.end}
              </Text>
              <Text
                style={[styles.selectedDurationBox, { color: colors.primary }]}
              >
                {selectedDuration ? formatDuration(selectedDuration) : ""}
              </Text>
            </View>
          )}

          {/* Two-handle range slider */}
          <View style={styles.multiSliderContainer}>
            <Text style={[styles.multiSliderLabel, { color: colors.text }]}>
              {t("dragToAdjustRange")}
            </Text>

            <MultiSlider
              values={sliderValues}
              onValuesChange={(values) => {
                // Enforce minimum duration if suggestedDuration is provided
                if (suggestedDuration && suggestedDuration > 0 && selectedBlock) {
                  const maxEnd = selectedBlock.endMinutes - selectedBlock.startMinutes;
                  let newStart = values[0];
                  let newEnd = values[1];
                  const duration = newEnd - newStart;
                  
                  // If duration is below minimum, adjust the appropriate handle
                  if (duration < suggestedDuration) {
                    // Determine which handle moved by comparing with current slider values
                    const startDelta = Math.abs(values[0] - sliderValues[0]);
                    const endDelta = Math.abs(values[1] - sliderValues[1]);
                    const startMoved = startDelta > endDelta;
                    
                    if (startMoved) {
                      // Start handle moved - constrain it so duration doesn't go below minimum
                      newStart = Math.max(0, newEnd - suggestedDuration);
                    } else {
                      // End handle moved - constrain it so duration doesn't go below minimum
                      newEnd = Math.min(maxEnd, newStart + suggestedDuration);
                    }
                  }
                  
                  // Ensure values stay within bounds
                  newStart = Math.max(0, Math.min(newStart, maxEnd - suggestedDuration));
                  newEnd = Math.max(newStart + suggestedDuration, Math.min(newEnd, maxEnd));
                  
                  values[0] = newStart;
                  values[1] = newEnd;
                }
                setSliderValues([values[0], values[1]]);
              }}
              min={0}
              max={selectedBlock.endMinutes - selectedBlock.startMinutes}
              step={5}
              sliderLength={timelineWidth > 0 ? timelineWidth - 60 : 280}
              selectedStyle={{ backgroundColor: colors.primary }}
              unselectedStyle={{ backgroundColor: colors.border }}
              markerStyle={{
                backgroundColor: colors.primary,
                height: 30,
                width: 30,
                borderRadius: 15,
                borderWidth: 2,
                borderColor: "#FFF",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
              }}
              pressedMarkerStyle={{
                height: 35,
                width: 35,
                borderRadius: 17.5,
              }}
              containerStyle={styles.multiSlider}
            />

            {/* Time markers */}
            <View style={styles.timeMarkers}>
              <Text style={[styles.timeMarker, { color: colors.primary }]}>
                {selectedTimes?.start}
              </Text>
              <Text style={[styles.timeMarker, { color: colors.primary }]}>
                {selectedTimes?.end}
              </Text>
            </View>
          </View>

          {/* Confirm button */}
          <TouchableOpacity
            style={[
              styles.confirmButtonExpanded,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmButtonText}>
              {t("confirmAppointment")}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.sm,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    letterSpacing: 0.3,
  },
  suggestion: {
    fontSize: 15,
    marginBottom: Spacing.xs,
    opacity: 0.8,
    fontWeight: "500",
  },
  instruction: {
    fontSize: 13,
    fontStyle: "italic",
    marginTop: Spacing.sm,
    opacity: 0.7,
    lineHeight: 18,
  },
  timelineSection: {
    marginBottom: Spacing.xl,
  },
  timeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "700",
    opacity: 0.8,
  },
  timelineBar: {
    height: 70,
    borderRadius: BorderRadius.lg,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineBlock: {
    position: "absolute",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  timelineBlockSelected: {
    borderWidth: 4,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  blockLabel: {
    fontSize: 10,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.lg,
    gap: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  legendDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  legendText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sliderContainer: {
    borderWidth: 3,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  sliderHeader: {
    marginBottom: Spacing.lg,
  },
  sliderTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    letterSpacing: 0.3,
  },
  sliderSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  selectedTimeBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginBottom: Spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedTimeBoxText: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1,
  },
  selectedDurationBox: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: Spacing.sm,
    opacity: 0.9,
  },
  multiSliderContainer: {
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  multiSliderLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: Spacing.lg,
    textAlign: "center",
    opacity: 0.8,
  },
  multiSlider: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  timeMarkers: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  timeMarker: {
    fontSize: 17,
    fontWeight: "800",
  },
  confirmButtonExpanded: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});
