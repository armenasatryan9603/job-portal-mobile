import { SelectableItem, SelectableItemsForm } from "./SelectableItemsForm";

import React, { useEffect } from "react";
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
  /** When provided, display string is synced to current language (e.g. after restore or language change). */
  skillIds?: number[];
  newSkillNames?: string[];
  onInputFocus?: () => void;
  onInputBlur?: () => void;
}

function getSkillNameForLang(
  skill: Skill,
  lang: string
): string {
  switch (lang) {
    case "ru":
      return skill.nameRu || skill.nameEn || skill.nameHy || "";
    case "hy":
      return skill.nameHy || skill.nameEn || skill.nameRu || "";
    case "en":
    default:
      return skill.nameEn || skill.nameRu || skill.nameHy || "";
  }
}

function getSkillsDisplayString(
  skillIds: number[],
  newSkillNames: string[],
  allSkills: Skill[],
  lang: string
): string {
  const parts: string[] = [];
  for (const id of skillIds) {
    const skill = allSkills.find((s) => s.id === id);
    if (skill) parts.push(getSkillNameForLang(skill, lang));
  }
  return [...parts, ...newSkillNames].filter(Boolean).join(", ");
}

export const SkillsAndRequirementsForm: React.FC<
  SkillsAndRequirementsFormProps
> = ({ formData, errors, onFieldChange, onSkillIdsChange, skillIds = [], newSkillNames = [], onInputFocus, onInputBlur }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  
  // Fetch all skills from cache
  const { data: allSkills = [] } = useSkills();
  
  // Helper function to get skill name based on selected language
  const getSkillName = (skill: Skill): string => getSkillNameForLang(skill, language);
  
  // Sync formData.skills to current language when skillIds/newSkillNames or language change (e.g. restore draft or language switch)
  useEffect(() => {
    if (skillIds.length === 0 && newSkillNames.length === 0) return;
    const derived = getSkillsDisplayString(skillIds, newSkillNames, allSkills, language);
    if (derived !== formData.skills) {
      onFieldChange("skills", derived);
    }
  }, [language, skillIds, newSkillNames, allSkills, formData.skills, onFieldChange]);

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
