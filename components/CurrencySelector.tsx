import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";

import { Spacing, ThemeColors, Typography } from "@/constants/styles";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";

type CurrencySelectorProps = {
  /**
   * Currently selected currency (e.g. "AMD")
   */
  value: string;
  /**
   * Called when user picks a new currency
   */
  onChange: (currency: string) => void;
  /**
   * List of available currency codes
   */
  options?: string[];
  /**
   * Optional title for the modal header
   */
  modalTitle?: string;
  /**
   * Optional container style for the trigger button wrapper
   */
  containerStyle?: ViewStyle;
  /**
   * Optional style overrides for the trigger button
   */
  buttonStyle?: ViewStyle;
  /**
   * Optional style overrides for the trigger button text
   */
  textStyle?: TextStyle;
  /**
   * Optional override for chevron icon color
   */
  iconColor?: string;
};

const DEFAULT_OPTIONS = ["USD", "EUR", "AMD", "RUB"];

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  modalTitle,
  containerStyle,
  buttonStyle,
  textStyle,
  iconColor,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const [visible, setVisible] = useState(false);

  const title = modalTitle || t("selectCurrency");

  return (
    <>
      <View style={containerStyle}>
        <TouchableOpacity
          style={[
            styles.selectorButton,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
            buttonStyle,
          ]}
          onPress={() => setVisible(true)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.selectorText,
              {
                color: colors.text,
              },
              textStyle,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {value}
          </Text>
          <IconSymbol
            name="chevron.down"
            size={14}
            color={iconColor || colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {title}
              </Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <IconSymbol name="xmark" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.modalOption,
                  {
                    backgroundColor:
                      value === option ? colors.primary + "10" : "transparent",
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => {
                  onChange(option);
                  setVisible(false);
                }}
              >
                <Text
                  style={[styles.modalOptionText, { color: colors.text }]}
                >
                  {option}
                </Text>
                {value === option && (
                  <IconSymbol
                    name="checkmark"
                    size={16}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
  },
});

export default CurrencySelector;

