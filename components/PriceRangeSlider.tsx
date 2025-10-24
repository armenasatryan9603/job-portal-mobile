import React, { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import RangeSlider from "rn-range-slider";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface PriceRangeSliderProps {
  minValue: number;
  maxValue: number;
  onValueChange: (low: number, high: number) => void;
  disabled?: boolean;
}

export const PriceRangeSlider: React.FC<PriceRangeSliderProps> = ({
  minValue,
  maxValue,
  onValueChange,
  disabled = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  const handleValueChange = useCallback((low: number, high: number) => {
    onValueChange(low, high);
  }, []);

  return (
    <View>
      <View style={styles.labelsContainer}>
        <Text style={[styles.label, { color: colors.text }]}>
          ${minValue}/hr
        </Text>
        <Text style={[styles.label, { color: colors.text }]}>
          ${maxValue}/hr
        </Text>
      </View>
      <RangeSlider
        min={0}
        max={200}
        low={minValue}
        high={maxValue}
        step={5}
        floatingLabel={false}
        disabled={disabled}
        onValueChanged={handleValueChange}
        renderThumb={() => (
          <View
            style={[
              styles.thumb,
              {
                backgroundColor: colors.tint,
                borderColor: colors.background,
              },
            ]}
          />
        )}
        renderRail={() => (
          <View
            style={[
              styles.rail,
              {
                backgroundColor: colors.border,
              },
            ]}
          />
        )}
        renderRailSelected={() => (
          <View
            style={[
              styles.railSelected,
              {
                backgroundColor: colors.tint,
              },
            ]}
          />
        )}
        renderLabel={() => null}
        renderNotch={() => null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  labelsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },

  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rail: {
    height: 4,
    borderRadius: 2,
  },
  railSelected: {
    height: 4,
    borderRadius: 2,
  },
});
