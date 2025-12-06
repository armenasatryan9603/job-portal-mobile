import React from "react";
import { View, StyleSheet } from "react-native";

interface CircularProgressProps {
  percentage: number;
  size: number;
  strokeWidth: number;
  backgroundColor: string;
  progressColor: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size,
  strokeWidth,
  backgroundColor,
  progressColor,
}) => {
  // If 100%, show a complete filled circle
  if (percentage >= 100) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: progressColor,
            },
          ]}
        />
      </View>
    );
  }

  // Calculate how many quarters to fill
  const quarters = Math.floor((percentage / 100) * 4);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background circle */}
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
          },
        ]}
      />
      {/* Progress quarters */}
      {quarters > 0 && (
        <>
          {/* Top-right (0-25%) */}
          {quarters >= 1 && (
            <View
              style={[
                styles.quarter,
                {
                  width: size / 2,
                  height: size / 2,
                  top: 0,
                  right: 0,
                  borderTopWidth: strokeWidth,
                  borderRightWidth: strokeWidth,
                  borderTopRightRadius: size / 2,
                  borderColor: progressColor,
                },
              ]}
            />
          )}
          {/* Bottom-right (25-50%) */}
          {quarters >= 2 && (
            <View
              style={[
                styles.quarter,
                {
                  width: size / 2,
                  height: size / 2,
                  bottom: 0,
                  right: 0,
                  borderBottomWidth: strokeWidth,
                  borderRightWidth: strokeWidth,
                  borderBottomRightRadius: size / 2,
                  borderColor: progressColor,
                },
              ]}
            />
          )}
          {/* Bottom-left (50-75%) */}
          {quarters >= 3 && (
            <View
              style={[
                styles.quarter,
                {
                  width: size / 2,
                  height: size / 2,
                  bottom: 0,
                  left: 0,
                  borderBottomWidth: strokeWidth,
                  borderLeftWidth: strokeWidth,
                  borderBottomLeftRadius: size / 2,
                  borderColor: progressColor,
                },
              ]}
            />
          )}
          {/* Top-left (75-100%) */}
          {quarters >= 4 && (
            <View
              style={[
                styles.quarter,
                {
                  width: size / 2,
                  height: size / 2,
                  top: 0,
                  left: 0,
                  borderTopWidth: strokeWidth,
                  borderLeftWidth: strokeWidth,
                  borderTopLeftRadius: size / 2,
                  borderColor: progressColor,
                },
              ]}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    position: "absolute",
  },
  quarter: {
    position: "absolute",
  },
});
