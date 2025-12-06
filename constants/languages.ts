/**
 * Language proficiency levels
 */
export enum LanguageProficiencyLevel {
  NATIVE = "native",
  FLUENT = "fluent",
  ADVANCED = "advanced",
  UPPER_INTERMEDIATE = "upper-intermediate",
  INTERMEDIATE = "intermediate",
  ELEMENTARY = "elementary",
  BEGINNER = "beginner",
}

/**
 * Language interface
 */
export interface Language {
  code: string; // ISO 639-1 language code
  name: string; // Display name in English
  nameRu?: string; // Display name in Russian
  nameHy?: string; // Display name in Armenian
}

/**
 * User language with proficiency level
 */
export interface UserLanguage {
  code: string;
  level: LanguageProficiencyLevel;
}

/**
 * Available languages for selection
 * Common languages for the job portal
 */
export const AVAILABLE_LANGUAGES: Language[] = [
  { code: "en", name: "English", nameRu: "Английский", nameHy: "Անգլերեն" },
  { code: "ru", name: "Russian", nameRu: "Русский", nameHy: "Ռուսերեն" },
  { code: "hy", name: "Armenian", nameRu: "Армянский", nameHy: "Հայերեն" },
  { code: "fr", name: "French", nameRu: "Французский", nameHy: "Ֆրանսերեն" },
  { code: "de", name: "German", nameRu: "Немецкий", nameHy: "Գերմաներեն" },
  { code: "es", name: "Spanish", nameRu: "Испанский", nameHy: "Իսպաներեն" },
  { code: "it", name: "Italian", nameRu: "Итальянский", nameHy: "Իտալերեն" },
  { code: "pt", name: "Portuguese", nameRu: "Португальский", nameHy: "Պորտուգալերեն" },
  { code: "zh", name: "Chinese", nameRu: "Китайский", nameHy: "Չիներեն" },
  { code: "ja", name: "Japanese", nameRu: "Японский", nameHy: "Ճապոներեն" },
  { code: "ko", name: "Korean", nameRu: "Корейский", nameHy: "Կորեերեն" },
  { code: "ar", name: "Arabic", nameRu: "Арабский", nameHy: "Արաբերեն" },
  { code: "tr", name: "Turkish", nameRu: "Турецкий", nameHy: "Թուրքերեն" },
  { code: "pl", name: "Polish", nameRu: "Польский", nameHy: "Լեհերեն" },
  { code: "uk", name: "Ukrainian", nameRu: "Украинский", nameHy: "Ուկրաիներեն" },
  { code: "he", name: "Hebrew", nameRu: "Иврит", nameHy: "Եբրայերեն" },
  { code: "fa", name: "Persian", nameRu: "Персидский", nameHy: "Պարսկերեն" },
  { code: "hi", name: "Hindi", nameRu: "Хинди", nameHy: "Հինդի" },
];

/**
 * Proficiency level options with display names
 */
export const PROFICIENCY_LEVELS: Array<{
  value: LanguageProficiencyLevel;
  label: string;
  labelRu?: string;
  labelHy?: string;
}> = [
  {
    value: LanguageProficiencyLevel.NATIVE,
    label: "Native",
    labelRu: "Родной",
    labelHy: "Մայրենի",
  },
  {
    value: LanguageProficiencyLevel.FLUENT,
    label: "Fluent",
    labelRu: "Свободно",
    labelHy: "Ազատ",
  },
  {
    value: LanguageProficiencyLevel.ADVANCED,
    label: "Advanced",
    labelRu: "Продвинутый",
    labelHy: "Ընդլայնված",
  },
  {
    value: LanguageProficiencyLevel.UPPER_INTERMEDIATE,
    label: "Upper-Intermediate",
    labelRu: "Выше среднего",
    labelHy: "Բարձր միջին",
  },
  {
    value: LanguageProficiencyLevel.INTERMEDIATE,
    label: "Intermediate",
    labelRu: "Средний",
    labelHy: "Միջին",
  },
  {
    value: LanguageProficiencyLevel.ELEMENTARY,
    label: "Elementary",
    labelRu: "Базовый",
    labelHy: "Տարրական",
  },
  {
    value: LanguageProficiencyLevel.BEGINNER,
    label: "Beginner",
    labelRu: "Начальный",
    labelHy: "Սկսնակ",
  },
];

/**
 * Get language by code
 */
export function getLanguageByCode(code: string): Language | undefined {
  return AVAILABLE_LANGUAGES.find((lang) => lang.code === code);
}

/**
 * Get proficiency level label
 */
export function getProficiencyLevelLabel(
  level: LanguageProficiencyLevel,
  language: "en" | "ru" | "hy" = "en"
): string {
  const proficiency = PROFICIENCY_LEVELS.find((p) => p.value === level);
  if (!proficiency) return level;

  switch (language) {
    case "ru":
      return proficiency.labelRu || proficiency.label;
    case "hy":
      return proficiency.labelHy || proficiency.label;
    default:
      return proficiency.label;
  }
}

