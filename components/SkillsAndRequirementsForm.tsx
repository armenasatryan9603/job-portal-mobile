import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/hooks/useTranslation";
import { ResponsiveCard } from "./ResponsiveContainer";

interface SkillsAndRequirementsFormProps {
  formData: {
    skills: string;
  };
  errors: {
    skills: string;
  };
  onFieldChange: (field: string, value: string) => void;
}

export const SkillsAndRequirementsForm: React.FC<
  SkillsAndRequirementsFormProps
> = ({ formData, onFieldChange }) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  return (
    <ResponsiveCard>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t("requiredSkills")}
      </Text>

      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
        {t("skills")} (comma-separated)
      </Text>
      <TextInput
        style={[
          styles.textInput,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        value={formData.skills}
        onChangeText={(value) => onFieldChange("skills", value)}
        placeholder={t("skillsPlaceholder")}
        placeholderTextColor={colors.tabIconDefault}
      />
    </ResponsiveCard>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 16,
  },
});
