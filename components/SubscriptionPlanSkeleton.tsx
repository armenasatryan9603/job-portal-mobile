import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { ThemeColors, BorderRadius } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface SubscriptionPlanSkeletonProps {
  itemCount?: number;
}

export const SubscriptionPlanSkeleton: React.FC<
  SubscriptionPlanSkeletonProps
> = ({ itemCount = 3 }) => {
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
    outputRange: [0.5, 0.9],
  });

  const SkeletonBox = ({
    width,
    height,
    borderRadius = 8,
    style,
  }: {
    width?: number | string;
    height: number;
    borderRadius?: number;
    style?: any;
  }) => (
    <Animated.View
      style={[
        {
          width: width || "100%",
          height,
          borderRadius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );

  const PlanSkeletonItem = () => (
    <View
      style={[
        styles.planCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.planHeader}>
        <SkeletonBox height={16} width="60%" style={{ marginBottom: 8 }} />
        <View style={styles.priceRow}>
          <SkeletonBox height={18} width={80} style={{ marginRight: 6 }} />
          <SkeletonBox height={12} width={60} />
        </View>
      </View>
      <SkeletonBox height={12} width="90%" style={{ marginBottom: 8 }} />
      <View style={styles.featuresContainer}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.featureItem}>
            <SkeletonBox width={12} height={12} borderRadius={6} />
            <SkeletonBox height={11} width="80%" style={{ marginLeft: 6 }} />
          </View>
        ))}
      </View>
      <View style={styles.cardFooter}>
        <SkeletonBox height={11} width={70} />
        <SkeletonBox width={14} height={14} borderRadius={7} />
      </View>
    </View>
  );

  return (
    <>
      {Array.from({ length: itemCount }).map((_, index) => (
        <PlanSkeletonItem key={index} />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  planCard: {
    padding: 12,
    borderRadius: BorderRadius.md,
    marginBottom: 10,
    borderWidth: 1,
  },
  planHeader: {
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  featuresContainer: {
    marginBottom: 8,
    gap: 4,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
});
