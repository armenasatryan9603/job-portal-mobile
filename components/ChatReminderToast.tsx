import React, { useEffect, useRef } from "react";
import {
  Animated,
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

export const ChatReminderToast: React.FC = () => {
  const { reminder, dismissReminder } = useChatReminder();
  const translateY = useRef(new Animated.Value(-120)).current;
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

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
    const targetConversationId = reminder.conversationId;
    dismissReminder();
    if (targetConversationId) {
      router.push(`/chat/${targetConversationId}`);
    }
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.container, { transform: [{ translateY }] }]}
    >
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
          <IconSymbol name="bubble.left.and.text.bubble.fill" size={18} color="white" />
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
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
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

