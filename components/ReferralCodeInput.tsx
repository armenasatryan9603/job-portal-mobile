import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { IconSymbol } from "./ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/hooks/useTranslation";
import {
  getReferralCode,
  storeReferralCode,
  clearReferralCode,
} from "@/utils/referralStorage";

interface ReferralCodeInputProps {
  onCodeChange?: (code: string | null) => void;
  showStatus?: boolean;
}

export function ReferralCodeInput({
  onCodeChange,
  showStatus = true,
}: ReferralCodeInputProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const { t } = useTranslation();

  const [referralCode, setReferralCode] = useState("");
  const [storedCode, setStoredCode] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadStoredCode();
  }, []);

  const loadStoredCode = async () => {
    const code = await getReferralCode();
    setStoredCode(code);
    if (code) {
      setReferralCode(code);
      onCodeChange?.(code);
    }
  };

  const handleCodeChange = (text: string) => {
    // Convert to uppercase and remove spaces
    const cleaned = text.toUpperCase().replace(/\s/g, "");
    setReferralCode(cleaned);
    if (cleaned.length > 0) {
      storeReferralCode(cleaned);
      onCodeChange?.(cleaned);
    } else {
      clearReferralCode();
      onCodeChange?.(null);
    }
  };

  const handleClear = () => {
    setReferralCode("");
    clearReferralCode();
    setStoredCode(null);
    onCodeChange?.(null);
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && !referralCode) {
      loadStoredCode();
    }
  };

  if (!isExpanded && !storedCode) {
    return (
      <TouchableOpacity
        style={[styles.toggleButton, { borderColor: colors.border }]}
        onPress={handleToggle}
      >
        <IconSymbol name="gift.fill" size={16} color={colors.primary} />
        <Text style={[styles.toggleText, { color: colors.primary }]}>
          {t("haveReferralCode")}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {showStatus && storedCode && (
        <View style={styles.statusContainer}>
          <IconSymbol name="checkmark.circle.fill" size={16} color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.primary }]}>
            {t("referralCodeDetected")}: {storedCode}
          </Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <View style={[styles.inputContainer, { borderColor: colors.border }]}>
          <IconSymbol
            name="gift.fill"
            size={18}
            color={colors.tabIconDefault}
            style={styles.icon}
          />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={t("enterReferralCode")}
            placeholderTextColor={colors.tabIconDefault}
            value={referralCode}
            onChangeText={handleCodeChange}
            autoCapitalize="characters"
            maxLength={20}
            editable={true}
          />
          {referralCode.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <IconSymbol name="xmark.circle.fill" size={18} color={colors.tabIconDefault} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isExpanded && (
        <TouchableOpacity onPress={handleToggle} style={styles.collapseButton}>
          <Text style={[styles.collapseText, { color: colors.tabIconDefault }]}>
            {t("hide")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  icon: {
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  clearButton: {
    padding: 4,
  },
  collapseButton: {
    marginTop: 8,
    alignItems: "center",
  },
  collapseText: {
    fontSize: 13,
    fontWeight: "500",
  },
});

