import { SelectableItem, SelectableItemsForm } from "./SelectableItemsForm";

import React from "react";
import { Skill } from "@/categories/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSkills } from "@/hooks/useApi";
import { useTranslation } from "@/hooks/useTranslation";

interface SkillsAndRequirementsFormProps {
  formData: {
    skills: string;
  };
  errors: {
    skills: string;
  };
  onFieldChange: (field: string, value: string) => void;
  onSkillIdsChange?: (skillIds: number[], newSkillNames?: string[]) => void;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
}

export const SkillsAndRequirementsForm: React.FC<
  SkillsAndRequirementsFormProps
> = ({ formData, errors, onFieldChange, onSkillIdsChange, onInputFocus, onInputBlur }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  
  // Fetch all skills from cache
  const { data: allSkills = [] } = useSkills();
  
  // Helper function to get skill name based on selected language
  const getSkillName = (skill: Skill): string => {
    switch (language) {
      case "ru":
        return skill.nameRu || skill.nameEn || skill.nameHy || "";
      case "hy":
        return skill.nameHy || skill.nameEn || skill.nameRu || "";
      case "en":
      default:
        return skill.nameEn || skill.nameRu || skill.nameHy || "";
    }
  };
  
  // Convert skills to SelectableItem format
  const skillsAsItems: SelectableItem[] = allSkills.map((skill: Skill) => ({
    ...skill, // Include all skill properties first
    id: skill.id,
    name: getSkillName(skill), // Use name based on selected language
    // nameEn, nameRu, nameHy are already included from ...skill
  }));

  return (
    <SelectableItemsForm
      title={t("requiredSkills")}
      placeholder={t("addSkill")}
      items={skillsAsItems}
      selectedItems={formData.skills}
      errors={errors}
      errorKey="skills"
      multi={true}
      allowCreate={true}
      showDescription={true}
      onSelectionChange={(selected) => {
        // selected will be a string (comma-separated) for multi mode
        if (typeof selected === "string") {
          onFieldChange("skills", selected);
        }
      }}
      onItemIdsChange={onSkillIdsChange ? (itemIds, newItemNames) => {
        // Convert to number[] for backward compatibility
        const skillIds = itemIds.filter((id): id is number => typeof id === "number");
        onSkillIdsChange(skillIds, newItemNames);
      } : undefined}
      onInputFocus={onInputFocus}
      onInputBlur={onInputBlur}
    />
  );
};
