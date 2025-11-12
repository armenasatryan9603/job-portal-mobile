import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { DateTimeSelector } from "./DateTimeSelector";
import { useTranslation } from "@/hooks/useTranslation";

interface SkillsAndRequirementsFormProps {
  formData: {
    skills: string;
    availableDates: string;
  };
  errors: {
    skills: string;
    availableDates: string;
  };
  selectedDates: Date[];
  selectedDateTimes: { [key: string]: string[] };
  onFieldChange: (field: string, value: string) => void;
  onDatesChange: (dates: Date[]) => void;
  onDateTimesChange: (dateTimes: { [key: string]: string[] }) => void;
}

export const SkillsAndRequirementsForm: React.FC<
  SkillsAndRequirementsFormProps
> = ({
  formData,
  errors,
  selectedDates,
  selectedDateTimes,
  onFieldChange,
  onDatesChange,
  onDateTimesChange,
}) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t("requiredSkills")}
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
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
      </View>

      <View style={styles.inputGroup}>
        <DateTimeSelector
          selectedDates={selectedDates}
          selectedDateTimes={selectedDateTimes}
          onDatesChange={onDatesChange}
          onDateTimesChange={onDateTimesChange}
          error={errors.availableDates}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
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
