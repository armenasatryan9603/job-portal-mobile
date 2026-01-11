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
          backgroundColor: colors.surface,
          borderLeftColor: "transparent",
          shadowColor: "#000",
        },
      ]}
    >
      <View style={styles.notificationContent}>
        {/* Icon Container */}
        <View
          style={[
            styles.notificationIconContainer,
            {
              backgroundColor: colors.border + "20",
            },
          ]}
        >
          <SkeletonBox width={24} height={24} borderRadius={12} />
        </View>

        {/* Text Container */}
        <View style={styles.notificationTextContainer}>
          {/* Header: Title and Timestamp */}
          <View style={styles.notificationHeader}>
            <View style={styles.titleContainer}>
              <SkeletonBox
                height={17}
                width="70%"
                borderRadius={4}
                style={{ marginRight: 8 }}
              />
              {/* Show unread badge for some items */}
              {showBadge && (
                <SkeletonBox width={8} height={8} borderRadius={4} />
              )}
            </View>
            <SkeletonBox height={12} width={60} borderRadius={4} />
          </View>

          {/* Message */}
          <View style={{ marginTop: 8 }}>
            <SkeletonBox height={15} width="100%" borderRadius={4} />
            <SkeletonBox
              height={15}
              width="85%"
              borderRadius={4}
              style={{ marginTop: 6 }}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  notificationItem: {
    marginBottom: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    overflow: "hidden",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 18,
    paddingLeft: 16,
  },
  notificationIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  notificationTextContainer: {
    flex: 1,
    paddingRight: 4,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
    minHeight: 24,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
});
