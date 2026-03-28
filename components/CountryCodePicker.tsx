import { BorderRadius, Spacing, ThemeColors, Typography } from "@/constants/styles";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";

import { IconSymbol } from "./ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useIsWeb } from "@/utils/isWeb";
import useTranslation from "@/hooks/useTranslation";

interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

// List of countries mostly from Europe and Asia
const COUNTRIES: Country[] = [
  // Europe
  { name: "Armenia", code: "AM", dialCode: "+374", flag: "🇦🇲" },
  { name: "Austria", code: "AT", dialCode: "+43", flag: "🇦🇹" },
  { name: "Belarus", code: "BY", dialCode: "+375", flag: "🇧🇾" },
  { name: "Belgium", code: "BE", dialCode: "+32", flag: "🇧🇪" },
  { name: "Bulgaria", code: "BG", dialCode: "+359", flag: "🇧🇬" },
  { name: "Croatia", code: "HR", dialCode: "+385", flag: "🇭🇷" },
  { name: "Cyprus", code: "CY", dialCode: "+357", flag: "🇨🇾" },
  { name: "Czech Republic", code: "CZ", dialCode: "+420", flag: "🇨🇿" },
  { name: "Denmark", code: "DK", dialCode: "+45", flag: "🇩🇰" },
  { name: "Estonia", code: "EE", dialCode: "+372", flag: "🇪🇪" },
  { name: "Finland", code: "FI", dialCode: "+358", flag: "🇫🇮" },
  { name: "France", code: "FR", dialCode: "+33", flag: "🇫🇷" },
  { name: "Georgia", code: "GE", dialCode: "+995", flag: "🇬🇪" },
  { name: "Germany", code: "DE", dialCode: "+49", flag: "🇩🇪" },
  { name: "Greece", code: "GR", dialCode: "+30", flag: "🇬🇷" },
  { name: "Hungary", code: "HU", dialCode: "+36", flag: "🇭🇺" },
  { name: "Iceland", code: "IS", dialCode: "+354", flag: "🇮🇸" },
  { name: "Ireland", code: "IE", dialCode: "+353", flag: "🇮🇪" },
  { name: "Italy", code: "IT", dialCode: "+39", flag: "🇮🇹" },
  { name: "Latvia", code: "LV", dialCode: "+371", flag: "🇱🇻" },
  { name: "Lithuania", code: "LT", dialCode: "+370", flag: "🇱🇹" },
  { name: "Luxembourg", code: "LU", dialCode: "+352", flag: "🇱🇺" },
  { name: "Malta", code: "MT", dialCode: "+356", flag: "🇲🇹" },
  { name: "Netherlands", code: "NL", dialCode: "+31", flag: "🇳🇱" },
  { name: "Norway", code: "NO", dialCode: "+47", flag: "🇳🇴" },
  { name: "Poland", code: "PL", dialCode: "+48", flag: "🇵🇱" },
  { name: "Portugal", code: "PT", dialCode: "+351", flag: "🇵🇹" },
  { name: "Romania", code: "RO", dialCode: "+40", flag: "🇷🇴" },
  { name: "Russia", code: "RU", dialCode: "+7", flag: "🇷🇺" },
  { name: "Serbia", code: "RS", dialCode: "+381", flag: "🇷🇸" },
  { name: "Slovakia", code: "SK", dialCode: "+421", flag: "🇸🇰" },
  { name: "Slovenia", code: "SI", dialCode: "+386", flag: "🇸🇮" },
  { name: "Spain", code: "ES", dialCode: "+34", flag: "🇪🇸" },
  { name: "Sweden", code: "SE", dialCode: "+46", flag: "🇸🇪" },
  { name: "Switzerland", code: "CH", dialCode: "+41", flag: "🇨🇭" },
  { name: "Turkey", code: "TR", dialCode: "+90", flag: "🇹🇷" },
  { name: "Ukraine", code: "UA", dialCode: "+380", flag: "🇺🇦" },
  { name: "United Kingdom", code: "GB", dialCode: "+44", flag: "🇬🇧" },
  
  // Asia
  { name: "Afghanistan", code: "AF", dialCode: "+93", flag: "🇦🇫" },
  { name: "Bangladesh", code: "BD", dialCode: "+880", flag: "🇧🇩" },
  { name: "China", code: "CN", dialCode: "+86", flag: "🇨🇳" },
  { name: "India", code: "IN", dialCode: "+91", flag: "🇮🇳" },
  { name: "Indonesia", code: "ID", dialCode: "+62", flag: "🇮🇩" },
  { name: "Iran", code: "IR", dialCode: "+98", flag: "🇮🇷" },
  { name: "Iraq", code: "IQ", dialCode: "+964", flag: "🇮🇶" },
  { name: "Israel", code: "IL", dialCode: "+972", flag: "🇮🇱" },
  { name: "Japan", code: "JP", dialCode: "+81", flag: "🇯🇵" },
  { name: "Jordan", code: "JO", dialCode: "+962", flag: "🇯🇴" },
  { name: "Kazakhstan", code: "KZ", dialCode: "+7", flag: "🇰🇿" },
  { name: "Kuwait", code: "KW", dialCode: "+965", flag: "🇰🇼" },
  { name: "Kyrgyzstan", code: "KG", dialCode: "+996", flag: "🇰🇬" },
  { name: "Lebanon", code: "LB", dialCode: "+961", flag: "🇱🇧" },
  { name: "Malaysia", code: "MY", dialCode: "+60", flag: "🇲🇾" },
  { name: "Maldives", code: "MV", dialCode: "+960", flag: "🇲🇻" },
  { name: "Mongolia", code: "MN", dialCode: "+976", flag: "🇲🇳" },
  { name: "Myanmar", code: "MM", dialCode: "+95", flag: "🇲🇲" },
  { name: "Nepal", code: "NP", dialCode: "+977", flag: "🇳🇵" },
  { name: "North Korea", code: "KP", dialCode: "+850", flag: "🇰🇵" },
  { name: "Oman", code: "OM", dialCode: "+968", flag: "🇴🇲" },
  { name: "Pakistan", code: "PK", dialCode: "+92", flag: "🇵🇰" },
  { name: "Palestine", code: "PS", dialCode: "+970", flag: "🇵🇸" },
  { name: "Philippines", code: "PH", dialCode: "+63", flag: "🇵🇭" },
  { name: "Qatar", code: "QA", dialCode: "+974", flag: "🇶🇦" },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966", flag: "🇸🇦" },
  { name: "Singapore", code: "SG", dialCode: "+65", flag: "🇸🇬" },
  { name: "South Korea", code: "KR", dialCode: "+82", flag: "🇰🇷" },
  { name: "Sri Lanka", code: "LK", dialCode: "+94", flag: "🇱🇰" },
  { name: "Syria", code: "SY", dialCode: "+963", flag: "🇸🇾" },
  { name: "Taiwan", code: "TW", dialCode: "+886", flag: "🇹🇼" },
  { name: "Tajikistan", code: "TJ", dialCode: "+992", flag: "🇹🇯" },
  { name: "Thailand", code: "TH", dialCode: "+66", flag: "🇹🇭" },
  { name: "Turkmenistan", code: "TM", dialCode: "+993", flag: "🇹🇲" },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971", flag: "🇦🇪" },
  { name: "Uzbekistan", code: "UZ", dialCode: "+998", flag: "🇺🇿" },
  { name: "Vietnam", code: "VN", dialCode: "+84", flag: "🇻🇳" },
  { name: "Yemen", code: "YE", dialCode: "+967", flag: "🇾🇪" },
];

interface CountryCodePickerProps {
  visible: boolean;
  selectedCode: string;
  onSelect: (dialCode: string) => void;
  onClose: () => void;
}

export const CountryCodePicker: React.FC<CountryCodePickerProps> = ({
  visible,
  selectedCode,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();
  const isDesktopWeb = useIsWeb();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCountries = COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dialCode.includes(searchQuery) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (dialCode: string) => {
    onSelect(dialCode);
    setSearchQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType={isDesktopWeb ? 'fade' : 'slide'}
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t("selectCountry")}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Search country..."
              placeholderTextColor={colors.tabIconDefault}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Countries List */}
          <ScrollView
            style={styles.listContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {filteredCountries.map((country) => {
              const isSelected = country.dialCode === selectedCode;
              return (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.countryItem,
                    {
                      backgroundColor: isSelected
                        ? colors.tint + "20"
                        : "transparent",
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={() => handleSelect(country.dialCode)}
                >
                  <Text style={styles.flag}>{country.flag}</Text>
                  <View style={styles.countryInfo}>
                    <Text style={[styles.countryName, { color: colors.text }]}>
                      {country.name}
                    </Text>
                    <Text
                      style={[styles.countryCode, { color: colors.tabIconDefault }]}
                    >
                      {country.code}
                    </Text>
                  </View>
                  <Text style={[styles.dialCode, { color: colors.text }]}>
                    {country.dialCode}
                  </Text>
                  {isSelected && (
                    <IconSymbol
                      name="checkmark"
                      size={20}
                      color={colors.tint}
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: "80%",
    minHeight: "50%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    position: "relative",
  },
  headerTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
  },
  closeButton: {
    position: "absolute",
    right: Spacing.lg,
    padding: Spacing.sm,
  },
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.md,
  },
  listContainer: {
    flex: 1,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flag: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  countryInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  countryName: {
    fontSize: Typography.md,
    fontWeight: Typography.medium,
    marginBottom: 2,
  },
  countryCode: {
    fontSize: Typography.sm,
  },
  dialCode: {
    fontSize: Typography.md,
    fontWeight: Typography.medium,
    marginRight: Spacing.sm,
  },
  checkIcon: {
    marginLeft: Spacing.xs,
  },
});
