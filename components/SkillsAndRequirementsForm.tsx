import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useSkills } from "@/hooks/useApi";
import { SelectableItemsForm, SelectableItem } from "./SelectableItemsForm";
import { Skill } from "@/categories/api";

interface SkillsAndRequirementsFormProps {
  formData: {
    skills: string;
  };
  errors: {
    skills: string;
  };
  onFieldChange: (field: string, value: string) => void;
  onSkillIdsChange?: (skillIds: number[], newSkillNames?: string[]) => void;
}

export const SkillsAndRequirementsForm: React.FC<
  SkillsAndRequirementsFormProps
> = ({ formData, errors, onFieldChange, onSkillIdsChange }) => {
  const { t } = useTranslation();
  
  // Fetch all skills from cache
  const { data: allSkills = [], isLoading: isLoadingSkills } = useSkills();
  
  // Convert skills to SelectableItem format
  const skillsAsItems: SelectableItem[] = allSkills.map((skill: Skill) => ({
    ...skill, // Include all skill properties first
    id: skill.id,
    name: skill.nameEn || "", // Use nameEn as default name
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
    />
  );
};
