import React, { useEffect, useRef, useMemo } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useChatReminder } from "@/contexts/ChatReminderContext";

const SWIPE_THRESHOLD = -50; // Swipe up this much to dismiss

export const ChatReminderToast: React.FC = () => {
  const { reminder, dismissReminder } = useChatReminder();
  const translateY = useRef(new Animated.Value(-120)).current;
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only capture vertical swipes
          return Math.abs(gestureState.dy) > 5;
        },
        onPanResponderMove: (_, gestureState) => {
          // Only allow upward movement (negative dy)
          if (gestureState.dy < 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy < SWIPE_THRESHOLD) {
            // Swiped up enough, dismiss
            Animated.timing(translateY, {
              toValue: -120,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              dismissReminder();
            });
          } else {
            // Not enough, spring back
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }).start();
          }
        },
      }),
    [translateY, dismissReminder]
  );

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: reminder ? 0 : -120,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [reminder, translateY]);

  if (!reminder) {
    return null;
  }

  const handlePress = () => {
    dismissReminder();

    if (reminder.type === "chat" && reminder.conversationId) {
      router.push(`/chat/${reminder.conversationId}`);
    } else if (reminder.type === "notification") {
      router.push(
        reminder.orderId ? `/orders/${reminder.orderId}` : "/notifications"
      );
    }
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.container, { transform: [{ translateY }] }]}
    >
      <Animated.View style={{ width: "100%" }} {...panResponder.panHandlers}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.9}
          style={[
            styles.toast,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.iconWrapper}>
            <IconSymbol
              name={
                reminder.type === "chat"
                  ? "bubble.left.and.text.bubble.right.fill"
                  : "bell.fill"
              }
              size={18}
              color="white"
            />
          </View>
          <View style={styles.textWrapper}>
            <Text style={[styles.title, { color: colors.text }]}>
              {reminder.title}
            </Text>
            <Text style={[styles.body, { color: colors.tabIconDefault }]}>
              {reminder.body}
            </Text>
          </View>
          <View style={styles.chevron}>
            <IconSymbol
              name="chevron.right"
              size={16}
              color={colors.tabIconDefault}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#231F7C",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
  },
  chevron: {
    marginLeft: 12,
  },
});
