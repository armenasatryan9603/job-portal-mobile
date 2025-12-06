import React, { memo } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";

interface User {
  id: number;
  name: string;
  avatarUrl?: string;
}

interface UserAvatarProps {
  user: User;
  size?: number;
  style?: any;
}

export const UserAvatar = memo(({ user, size = 50, style }: UserAvatarProps) => {
  const { isDark } = useTheme();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  if (user.avatarUrl) {
    return (
      <Image
        source={{ uri: user.avatarUrl }}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
          style,
        ]}
      />
    );
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.avatar,
        styles.avatarPlaceholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.avatarText, { color: colors.tabIconDefault }]}>
        {initials}
      </Text>
    </View>
  );
});

UserAvatar.displayName = "UserAvatar";

const styles = StyleSheet.create({
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
  },
});

