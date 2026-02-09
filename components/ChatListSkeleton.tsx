import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ResponsiveCard } from "@/components/ResponsiveContainer";

interface ChatListSkeletonProps {
  itemCount?: number;
}

export const ChatListSkeleton: React.FC<ChatListSkeletonProps> = ({
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

  // Conversation item skeleton
  const ConversationItemSkeleton = () => (
    <View
      style={[
        styles.conversationItem,
        {
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.conversationContent}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <SkeletonBox width={60} height={60} borderRadius={30} />
        </View>

        {/* Conversation Info */}
        <View style={styles.conversationInfo}>
          {/* Header: Name and Timestamp */}
          <View style={styles.conversationHeader}>
            <SkeletonBox
              height={16}
              width="50%"
              borderRadius={4}
            />
            <SkeletonBox height={13} width={60} borderRadius={4} />
          </View>

          {/* Last Message */}
          <View style={styles.lastMessageContainer}>
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Section Skeleton */}
      <ResponsiveCard padding={0}>
        <View style={styles.searchContainer}>
          <SkeletonBox width={20} height={20} borderRadius={4} />
          <SkeletonBox
            height={16}
            width="80%"
            borderRadius={4}
            style={{ marginLeft: 8 }}
          />
        </View>
      </ResponsiveCard>

      {/* Conversations List Skeleton */}
      <View style={styles.listContainer}>
        {Array.from({ length: itemCount }).map((_, index) => (
          <ConversationItemSkeleton key={index} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 80,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
    gap: 8,
    minHeight: 44,
  },
  listContainer: {
    paddingBottom: 24,
  },
  conversationItem: {
    borderBottomWidth: 0.5,
    paddingVertical: 0,
    marginHorizontal: 16,
  },
  conversationContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
    paddingRight: 8,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  lastMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
});
