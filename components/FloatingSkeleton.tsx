import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { ThemeColors, Spacing } from "@/constants/styles";
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
  variant?: "list" | "grid" | "grid2";
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
  variant = "list",
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

  const GridSkeletonItem = () => (
    <View style={[styles.gridCard, { backgroundColor: colors.surface }]}>
      <Animated.View
        style={[
          styles.gridServiceImage,
          {
            backgroundColor: colors.border,
            opacity,
          },
        ]}
      />
      <View style={styles.gridCardContent}>
        <Animated.View
          style={[
            styles.gridServiceName,
            {
              backgroundColor: colors.border,
              opacity,
              marginBottom: 4,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.gridServiceName,
            {
              backgroundColor: colors.border,
              opacity,
              width: "60%",
            },
          ]}
        />
        <View style={styles.gridServiceStats}>
          <Animated.View
            style={[
              styles.gridStatItem,
              {
                backgroundColor: colors.border,
                opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.gridStatItem,
              {
                backgroundColor: colors.border,
                opacity,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );

  const Grid2SkeletonItem = () => (
    <ResponsiveCard padding={0} marginHorizontal={Spacing.xs} marginBlock={Spacing.xs}>
      <Animated.View
        style={[
          styles.grid2Image,
          {
            backgroundColor: colors.border,
            opacity,
          },
        ]}
      />
      <View style={styles.grid2CardContent}>
        <View style={styles.grid2Header}>
          <Animated.View
            style={[
              styles.grid2Title,
              {
                backgroundColor: colors.border,
                opacity,
                flex: 1,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.grid2Badge,
              {
                backgroundColor: colors.border,
                opacity,
              },
            ]}
          />
        </View>
        <Animated.View
          style={[
            styles.grid2Price,
            {
              backgroundColor: colors.border,
              opacity,
            },
          ]}
        />
        <View style={styles.grid2Details}>
          <Animated.View
            style={[
              styles.grid2DetailItem,
              {
                backgroundColor: colors.border,
                opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.grid2DetailItem,
              {
                backgroundColor: colors.border,
                opacity,
                width: 25,
              },
            ]}
          />
        </View>
        <Animated.View
          style={[
            styles.grid2Button,
            {
              backgroundColor: colors.border,
              opacity,
            },
          ]}
        />
      </View>
    </ResponsiveCard>
  );

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

  if (variant === "grid2") {
    // Render grid layout (2 items per row)
    const rows = Math.ceil(count / 2);
    return (
      <View style={styles.grid2Container}>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.grid2Row}>
            {Array.from({ length: 2 }).map((_, colIndex) => {
              const itemIndex = rowIndex * 2 + colIndex;
              if (itemIndex >= count) {
                // Empty placeholder for incomplete rows
                return (
                  <View
                    key={`placeholder-${colIndex}`}
                    style={styles.grid2ItemPlaceholder}
                  />
                );
              }
              return (
                <View key={`item-${itemIndex}`} style={styles.grid2Item}>
                  <Grid2SkeletonItem />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  if (variant === "grid") {
    // Render grid layout (3 items per row)
    const rows = Math.ceil(count / 3);
    return (
      <View style={styles.container}>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.gridRow}>
            {Array.from({ length: 3 }).map((_, colIndex) => {
              const itemIndex = rowIndex * 3 + colIndex;
              if (itemIndex >= count) {
                // Empty placeholder for incomplete rows
                return (
                  <View
                    key={`placeholder-${colIndex}`}
                    style={{ flex: 1, marginHorizontal: Spacing.xs }}
                  />
                );
              }
              return (
                <View
                  key={`item-${itemIndex}`}
                  style={{ flex: 1, marginHorizontal: Spacing.xs }}
                >
                  <GridSkeletonItem />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

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
  gridRow: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  gridCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  gridServiceImage: {
    width: "100%",
    height: 80,
  },
  gridCardContent: {
    padding: Spacing.sm,
  },
  gridServiceName: {
    height: 16,
    borderRadius: 4,
    width: "100%",
  },
  gridServiceStats: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  gridStatItem: {
    height: 14,
    width: 35,
    borderRadius: 4,
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
  grid2Container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  grid2Row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  grid2Item: {
    flex: 1,
  },
  grid2ItemPlaceholder: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  grid2Image: {
    width: "100%",
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  grid2CardContent: {
    padding: Spacing.sm,
  },
  grid2Header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  grid2Title: {
    height: 12,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  grid2Badge: {
    height: 16,
    width: 45,
    borderRadius: 12,
  },
  grid2Price: {
    height: 14,
    width: "50%",
    borderRadius: 4,
    marginBottom: Spacing.xs,
  },
  grid2Details: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  grid2DetailItem: {
    height: 9,
    width: 35,
    borderRadius: 4,
  },
  grid2Button: {
    height: 28,
    width: "100%",
    borderRadius: 8,
    marginTop: Spacing.xs,
  },
});
