import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ResponsiveCard } from "@/components/ResponsiveContainer";

interface FloatingSkeletonProps {
  count?: number;
  itemHeight?: number;
  showImage?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  showDetails?: boolean;
  showTags?: boolean;
}

export const FloatingSkeleton: React.FC<FloatingSkeletonProps> = ({
  count = 5,
  itemHeight = 200,
  showImage = true,
  showTitle = true,
  showDescription = true,
  showDetails = true,
  showTags = true,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const SkeletonItem = () => (
    <ResponsiveCard style={{ minHeight: itemHeight }}>
      {showImage && (
        <Animated.View
          style={[
            styles.skeletonImage,
            {
              backgroundColor: colors.border,
              opacity,
            },
          ]}
        />
      )}
      <View style={styles.skeletonContent}>
        {showTitle && (
          <Animated.View
            style={[
              styles.skeletonTitle,
              {
                backgroundColor: colors.border,
                opacity,
              },
            ]}
          />
        )}
        {showDescription && (
          <>
            <Animated.View
              style={[
                styles.skeletonDescription,
                {
                  backgroundColor: colors.border,
                  opacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonDescription,
                {
                  backgroundColor: colors.border,
                  opacity,
                  width: "85%",
                },
              ]}
            />
          </>
        )}
        {showDetails && (
          <View style={styles.skeletonDetails}>
            <Animated.View
              style={[
                styles.skeletonDetailItem,
                {
                  backgroundColor: colors.border,
                  opacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonDetailItem,
                {
                  backgroundColor: colors.border,
                  opacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonDetailItem,
                {
                  backgroundColor: colors.border,
                  opacity,
                },
              ]}
            />
          </View>
        )}
        {showTags && (
          <View style={styles.skeletonTags}>
            <Animated.View
              style={[
                styles.skeletonTag,
                {
                  backgroundColor: colors.border,
                  opacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonTag,
                {
                  backgroundColor: colors.border,
                  opacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonTag,
                {
                  backgroundColor: colors.border,
                  opacity,
                },
              ]}
            />
          </View>
        )}
      </View>
    </ResponsiveCard>
  );

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonItem key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeletonImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  skeletonContent: {
    gap: 8,
  },
  skeletonTitle: {
    height: 20,
    borderRadius: 6,
    width: "70%",
    marginBottom: 2,
  },
  skeletonDescription: {
    height: 14,
    borderRadius: 4,
    width: "100%",
    marginBottom: 2,
  },
  skeletonDetails: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  skeletonDetailItem: {
    height: 14,
    borderRadius: 4,
    flex: 1,
    minWidth: 80,
  },
  skeletonTags: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  skeletonTag: {
    height: 20,
    borderRadius: 10,
    width: 70,
  },
});
