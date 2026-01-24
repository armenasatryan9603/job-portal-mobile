import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Layout } from "@/components/Layout";

interface NotificationSkeletonProps {
  header: React.ReactNode;
  itemCount?: number;
}

export const NotificationSkeleton: React.FC<NotificationSkeletonProps> = ({
  header,
  itemCount = 5,
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

  // Notification item skeleton
  const NotificationItemSkeleton = ({
    showBadge = false,
  }: {
    showBadge?: boolean;
  }) => (
    <View
      style={[
        styles.notificationItem,
        {
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.notificationContent}>
        {/* Icon Container */}
        <View style={styles.notificationIconContainer}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: colors.border + "20",
              },
            ]}
          >
            <SkeletonBox width={22} height={22} borderRadius={11} />
          </View>
        </View>

        {/* Text Container */}
        <View style={styles.notificationTextContainer}>
          {/* Header: Title and Timestamp */}
          <View style={styles.notificationHeader}>
            <SkeletonBox
              height={16}
              width="55%"
              borderRadius={4}
            />
            <SkeletonBox height={13} width={60} borderRadius={4} />
          </View>

          {/* Message */}
          <View style={{ marginTop: 4 }}>
            <SkeletonBox height={14} width="90%" borderRadius={4} />
            <SkeletonBox
              height={14}
              width="75%"
              borderRadius={4}
              style={{ marginTop: 4 }}
            />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <Layout header={header}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.listContainer}>
          {Array.from({ length: itemCount }).map((_, index) => (
            <NotificationItemSkeleton key={index} showBadge={index % 3 === 0} />
          ))}
        </View>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 24,
  },
  notificationItem: {
    borderBottomWidth: 0.5,
    paddingVertical: 0,
    marginHorizontal: 16,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  notificationIconContainer: {
    position: "relative",
    marginRight: 12,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
});
