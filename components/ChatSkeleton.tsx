import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface ChatSkeletonProps {
  header?: React.ReactNode;
}

export const ChatSkeleton: React.FC<ChatSkeletonProps> = ({ header }) => {
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

  // Message bubble skeleton
  const MessageBubbleSkeleton = ({
    isRight = false,
  }: {
    isRight?: boolean;
  }) => (
    <View
      style={[
        styles.messageContainer,
        isRight ? styles.rightMessage : styles.leftMessage,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          {
            backgroundColor: isRight ? colors.primary : colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <SkeletonBox
          height={0}
          width={isRight ? "85%" : "90%"}
          borderRadius={4}
          style={{ marginBottom: 6 }}
        />
        <SkeletonBox
          height={16}
          width={isRight ? "75%" : "85%"}
          borderRadius={4}
          style={{ marginBottom: 4 }}
        />
        <View style={styles.messageFooter}>
          <SkeletonBox height={10} width={40} borderRadius={4} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Order Card Skeleton */}
      <View
        style={[
          styles.orderCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.orderCardHeader}>
          <View style={styles.orderCardLeft}>
            <SkeletonBox width={20} height={20} borderRadius={4} />
            <View style={styles.orderCardInfo}>
              <SkeletonBox
                height={16}
                width="70%"
                borderRadius={4}
                style={{ marginBottom: 6 }}
              />
              <SkeletonBox height={12} width="50%" borderRadius={4} />
            </View>
          </View>
          <SkeletonBox width={16} height={16} borderRadius={4} />
        </View>
      </View>

      {/* Messages Skeleton */}
      <View style={styles.messagesContainer}>
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <MessageBubbleSkeleton key={index} isRight={index % 3 === 0} />
        ))}
      </View>

      {/* Input Area Skeleton */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <SkeletonBox height={20} width="70%" borderRadius={4} />
          <SkeletonBox width={36} height={36} borderRadius={18} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  orderCard: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  orderCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  orderCardInfo: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    padding: 12,
  },
  messageContainer: {
    marginBottom: 8,
  },
  leftMessage: {
    alignItems: "flex-start",
  },
  rightMessage: {
    alignItems: "flex-end",
  },
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 150,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 30,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 44,
  },
});
