import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ResponsiveCard } from "@/components/ResponsiveContainer";

interface FloatingSkeletonProps {
  count?: number;
  itemHeight?: number;
  showImage?: boolean;
  showAvatar?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  showDetails?: boolean;
  showTags?: boolean;
  showFooter?: boolean;
}

export const FloatingSkeleton: React.FC<FloatingSkeletonProps> = ({
  count = 5,
  itemHeight = 200,
  showImage = true,
  showAvatar = false,
  showTitle = true,
  showDescription = true,
  showDetails = true,
  showTags = true,
  showFooter = false,
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
      {showImage && !showAvatar && (
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
        {showAvatar && (
          <View style={styles.skeletonHeader}>
            <Animated.View
              style={[
                styles.skeletonAvatar,
                {
                  backgroundColor: colors.border,
                  opacity,
                },
              ]}
            />
            <View style={styles.skeletonHeaderInfo}>
              <Animated.View
                style={[
                  styles.skeletonTitle,
                  {
                    backgroundColor: colors.border,
                    opacity,
                    width: "60%",
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.skeletonSubtitle,
                  {
                    backgroundColor: colors.border,
                    opacity,
                    width: "40%",
                    marginTop: 6,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.skeletonRating,
                  {
                    backgroundColor: colors.border,
                    opacity,
                    width: "50%",
                    marginTop: 6,
                  },
                ]}
              />
            </View>
            <Animated.View
              style={[
                styles.skeletonBadge,
                {
                  backgroundColor: colors.border,
                  opacity,
                },
              ]}
            />
          </View>
        )}
        {showTitle && !showAvatar && (
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
        {showFooter && (
          <View style={styles.skeletonFooter}>
            <View style={styles.skeletonFooterStats}>
              <Animated.View
                style={[
                  styles.skeletonFooterStat,
                  {
                    backgroundColor: colors.border,
                    opacity,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.skeletonFooterStat,
                  {
                    backgroundColor: colors.border,
                    opacity,
                    marginTop: 4,
                  },
                ]}
              />
            </View>
            <Animated.View
              style={[
                styles.skeletonFooterButton,
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
  skeletonHeader: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  skeletonAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
  },
  skeletonHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  skeletonSubtitle: {
    height: 16,
    borderRadius: 4,
  },
  skeletonRating: {
    height: 14,
    borderRadius: 4,
  },
  skeletonBadge: {
    width: 60,
    height: 20,
    borderRadius: 10,
  },
  skeletonFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  skeletonFooterStats: {
    flex: 1,
  },
  skeletonFooterStat: {
    height: 12,
    borderRadius: 4,
    width: "60%",
  },
  skeletonFooterButton: {
    width: 70,
    height: 36,
    borderRadius: 10,
  },
});
