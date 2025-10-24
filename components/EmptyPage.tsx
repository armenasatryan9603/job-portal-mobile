import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";

interface EmptyPageProps {
  type: "loading" | "error" | "empty";
  title?: string;
  subtitle?: string;
  icon?: string;
  buttonText?: string;
  onButtonPress?: () => void;
  onRetry?: () => void;
  searchQuery?: string;
  isMyContent?: boolean;
}

export const EmptyPage: React.FC<EmptyPageProps> = ({
  type,
  title,
  subtitle,
  icon,
  buttonText,
  onButtonPress,
  onRetry,
  searchQuery,
  isMyContent = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  if (type === "loading") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>
    );
  }

  if (type === "error") {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={onRetry}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {buttonText}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (type === "empty") {
    return (
      <View style={styles.container}>
        <IconSymbol
          name={icon || "doc.text"}
          size={48}
          color={colors.tabIconDefault}
        />
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          {subtitle}
        </Text>
        {onButtonPress && buttonText && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={onButtonPress}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              {buttonText}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 16,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
