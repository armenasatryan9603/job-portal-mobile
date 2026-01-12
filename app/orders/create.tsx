import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { ServiceSelector } from "@/components/ServiceSelector";
import { BasicInformationForm } from "@/components/BasicInformationForm";
import { SkillsAndRequirementsForm } from "@/components/SkillsAndRequirementsForm";
import { MediaUploader } from "@/components/MediaUploader";
import { AIPreviewModal } from "@/components/AIPreviewModal";
import { ThemeColors, Typography } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Button } from "@/components/ui/button";
import { apiService, Category } from "@/services/api";
import { fileUploadService, MediaFile } from "@/services/fileUpload";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { useQueryClient } from "@tanstack/react-query";
import AnalyticsService from "@/services/AnalyticsService";
import { API_CONFIG } from "@/config/api";
import { DateTimeSelector } from "@/components/DateTimeSelector";
import { useCategories } from "@/hooks/useApi";

export default function CreateOrderScreen() {
  const { serviceId, orderId } = useLocalSearchParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { isAuthenticated, user } = useAuth();
  const { showLoginModal } = useModal();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
    location: "",
    skills: "",
    availableDates: "",
    categoryId: serviceId ? parseInt(serviceId as string) : null,
  });

  const [skillIds, setSkillIds] = useState<number[]>([]);
  const [newSkillNames, setNewSkillNames] = useState<string[]>([]);

  const [currency, setCurrency] = useState<string>("AMD");
  const [previousCurrency, setPreviousCurrency] = useState<string | null>(null);
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);
  const [rateUnit, setRateUnit] = useState<string>("per project");
  const currencyOptions = ["USD", "EUR", "AMD", "RUB"];

  // Rate units from API with translations
  const [rateUnitOptions, setRateUnitOptions] = useState<
    Array<{
      value: string;
      labelEn: string;
      labelRu: string;
      labelHy: string;
    }>
  >([]);
  const [showAddCustomRateUnit, setShowAddCustomRateUnit] =
    useState<boolean>(false);
  const [newCustomRateUnit, setNewCustomRateUnit] = useState<string>("");

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  const [selectedService, setSelectedService] = useState<Category | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedDateTimes, setSelectedDateTimes] = useState<{
    [key: string]: string[];
  }>({});
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedBannerIndex, setSelectedBannerIndex] = useState<number | null>(
    null
  );
  const [existingBannerId, setExistingBannerId] = useState<number | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [useAIEnhancement, setUseAIEnhancement] = useState<boolean>(false); // Unchecked by default (checked only for new orders)
  const [showAIPreview, setShowAIPreview] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [aiPreviewData, setAiPreviewData] = useState<{
    original: { title: string; description: string };
    enhanced: {
      titleEn: string;
      titleRu: string;
      titleHy: string;
      descriptionEn: string;
      descriptionRu: string;
      descriptionHy: string;
      detectedLanguage: string;
    };
  } | null>(null);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showRateUnitModal, setShowRateUnitModal] = useState(false);
  const canAddAnotherQuestion = () =>
    questions.length === 0 || questions[questions.length - 1].trim().length > 0;

  const formatRateUnitLabel = (value: string) => {
    if (!value) {
      // Find default from API options
      const defaultUnit = rateUnitOptions.find(
        (u) => u.value === "per project"
      );
      if (defaultUnit) {
        return getRateUnitLabelForLanguage(defaultUnit, language);
      }
      return t("perProject");
    }

    // Find the rate unit in our options
    const unit = rateUnitOptions.find(
      (u) => u.value.toLowerCase() === value.toLowerCase()
    );

    if (unit) {
      return getRateUnitLabelForLanguage(unit, language);
    }

    // For custom values not in the API, return the original value with proper formatting
    return value.replace(/_/g, " ").trim();
  };

  const getRateUnitLabelForLanguage = (
    unit: { value: string; labelEn: string; labelRu: string; labelHy: string },
    lang: string
  ): string => {
    switch (lang) {
      case "ru":
        return unit.labelRu;
      case "hy":
        return unit.labelHy;
      case "en":
      default:
        return unit.labelEn;
    }
  };

  // Refs for scrolling to error fields
  const scrollViewRef = useRef<ScrollView>(null);
  const serviceSectionRef = useRef<View>(null);
  const basicInfoSectionRef = useRef<View>(null);
  const priceSectionRef = useRef<View>(null);
  const skillsSectionRef = useRef<View>(null);

  // Format dates with times for form submission in JSON string format
  const formatAllDatesWithTimes = () => {
    return selectedDates.map((date) => {
      const key = date.toDateString();
      const times = selectedDateTimes[key] || [];
      // Store date in ISO format (YYYY-MM-DD) - easy to parse back
      const isoDate = date.toISOString().split("T")[0];
      return JSON.stringify({
        date: isoDate,
        times: times,
      });
    });
  };

  const [errors, setErrors] = useState({
    title: "",
    description: "",
    budget: "",
    location: "",
    skills: "",
    availableDates: "",
    categoryId: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch services (same hook used by ServiceSelector to avoid duplicate calls)
  const { data: categoriesData } = useCategories(1, 100, undefined, language);

  // Fetch rate units from API on component mount
  useEffect(() => {
    const fetchRateUnits = async () => {
      try {
        const response = await apiService.getRateUnits();
        if (response.success && response.rateUnits) {
          setRateUnitOptions(response.rateUnits);
        }
      } catch (error) {
        console.error("Error fetching rate units:", error);
      }
    };

    fetchRateUnits();
  }, []);

  // Convert currency when currency changes
  useEffect(() => {
    const convertCurrency = async () => {
      // Skip conversion if:
      // - No previous currency set (initial load)
      // - Currency hasn't actually changed
      // - No budget value exists
      // - Already converting
      if (
        previousCurrency === null ||
        currency === previousCurrency ||
        !formData.budget ||
        formData.budget.trim() === "" ||
        isConvertingCurrency
      ) {
        // Update previous currency on initial load
        if (previousCurrency === null) {
          setPreviousCurrency(currency);
        }
        return;
      }

      const budgetValue = parseFloat(formData.budget);
      if (isNaN(budgetValue) || budgetValue <= 0) {
        setPreviousCurrency(currency);
        return;
      }

      setIsConvertingCurrency(true);
      try {
        // Helper function to fetch with timeout
        const fetchWithTimeout = async (
          url: string,
          timeout: number = 5000
        ): Promise<Response> => {
          return Promise.race([
            fetch(url),
            new Promise<Response>((_, reject) =>
              setTimeout(() => reject(new Error("Request timeout")), timeout)
            ) as Promise<Response>,
          ]);
        };

        let rate: number | null = null;
        let lastError: Error | null = null;

        // Try Frankfurter API first (supports major currencies)
        try {
          const response = await fetchWithTimeout(
            `${API_CONFIG.FRANKFURTER_API_URL}/latest?from=${previousCurrency}&to=${currency}`
          );

          if (response.ok) {
            const data = await response.json();
            rate = data.rates?.[currency];
          }
        } catch (error) {
          lastError = error as Error;
        }

        // If Frankfurter doesn't support these currencies, try exchangerate-api.com
        if (!rate || typeof rate !== "number") {
          try {
            const response = await fetchWithTimeout(
              `https://api.exchangerate-api.com/v4/latest/${previousCurrency}`
            );

            if (response.ok) {
              const data = await response.json();
              rate = data.rates?.[currency];
            }
          } catch (fallbackError) {
            lastError = fallbackError as Error;
          }
        }

        // If still no rate, try exchangerate.host (supports 170+ currencies)
        if (!rate || typeof rate !== "number") {
          try {
            const response = await fetchWithTimeout(
              `https://api.exchangerate.host/latest?base=${previousCurrency}&symbols=${currency}`
            );

            if (response.ok) {
              const data = await response.json();
              rate = data.rates?.[currency];
            }
          } catch (secondFallbackError) {
            lastError = secondFallbackError as Error;
          }
        }

        if (rate && typeof rate === "number") {
          const convertedValue = budgetValue * rate;
          // Round to 2 decimal places
          const roundedValue = Math.round(convertedValue * 100) / 100;
          setFormData((prev) => ({
            ...prev,
            budget: roundedValue.toString(),
          }));
        } else {
          throw new Error(
            `Currency conversion not available for ${previousCurrency} to ${currency}. ${
              lastError?.message || t("pleaseEnterPriceManually")
            }`
          );
        }
      } catch (error: any) {
        console.error("Error converting currency:", error);
        // If conversion fails, show alert but still allow currency change
        const errorMessage =
          error?.message ||
          "Failed to convert currency. Please enter the price manually.";
        Alert.alert(t("error"), t("currencyConversionFailed") || errorMessage);
      } finally {
        setIsConvertingCurrency(false);
        setPreviousCurrency(currency);
      }
    };

    convertCurrency();
  }, [currency, previousCurrency, formData.budget]);

  // Handle serviceId and orderId from URL params
  useEffect(() => {
    if (serviceId && categoriesData?.categories) {
      const categoryIdNum = parseInt(serviceId as string);
      setFormData((prev) => ({ ...prev, categoryId: categoryIdNum }));
      // Set AI enhancement to true for new orders (checked by default)
      setUseAIEnhancement(true);

      // Find the category from already-fetched categories list
      const category = categoriesData.categories.find(
        (c) => c.id === categoryIdNum
      );
      if (category) {
        setSelectedService(category);

        // Suggest budget based on category prices
        if (category.averagePrice) {
          setFormData((prev) => ({
            ...prev,
            budget: category.averagePrice!.toString(),
          }));
        }
      }
    } else if (serviceId) {
      // If categoryId is provided but categories haven't loaded yet, just set the ID
      const categoryIdNum = parseInt(serviceId as string);
      setFormData((prev) => ({ ...prev, categoryId: categoryIdNum }));
      setUseAIEnhancement(true);
    }

    // If orderId is provided, load existing order for editing
    if (orderId) {
      // Set AI enhancement to false when editing (not checked by default)
      setUseAIEnhancement(false);

      const loadOrderForEdit = async () => {
        try {
          const orderData = await apiService.getOrderById(
            parseInt(orderId as string)
          );

          // Store order status
          setOrderStatus(orderData.status || null);

          // Populate form with existing data
          setFormData({
            title: orderData.title || "",
            description: orderData.description || "",
            budget: orderData.budget?.toString() || "",
            location: orderData.location || "",
            skills: orderData.skills?.join(", ") || "",
            availableDates: orderData.availableDates?.join(", ") || "",
            categoryId: orderData.categoryId || null,
          });

          // Populate currency/rate unit if available
          const loadedCurrency = (orderData as any).currency || "AMD";
          setCurrency(loadedCurrency);
          setPreviousCurrency(loadedCurrency); // Set previous currency when loading order
          const loadedRateUnit = (orderData as any).rateUnit || "per project";
          // Add to options if it's a custom value not already in the list
          setRateUnitOptions((prev) => {
            if (!prev.includes(loadedRateUnit)) {
              return [...prev, loadedRateUnit];
            }
            return prev;
          });
          setRateUnit(loadedRateUnit);

          // Set selected service if available
          if (orderData.Category) {
            setSelectedService(orderData.Category);
          }

          // Parse available dates
          if (orderData.availableDates && orderData.availableDates.length > 0) {
            const parsedDates: Date[] = [];
            const parsedDateTimes: { [key: string]: string[] } = {};

            orderData.availableDates.forEach((dateStr: string) => {
              try {
                const { date, times = [] } = JSON.parse(dateStr);
                if (!date) return;

                // Try parsing as ISO date first (YYYY-MM-DD)
                let parsedDate = new Date(date);

                // If invalid, try old format (backward compatibility)
                if (isNaN(parsedDate.getTime())) {
                  // Old format: "Jan 15" - skip it, will be fixed on next save
                  return;
                }

                parsedDates.push(parsedDate);
                parsedDateTimes[parsedDate.toDateString()] = times;
              } catch (error) {
                console.warn("Failed to parse date:", dateStr);
              }
            });

            if (parsedDates.length > 0) {
              setSelectedDates(parsedDates);
              setSelectedDateTimes(parsedDateTimes);
            }
          }

          // Load existing media files
          if (orderData.MediaFiles && orderData.MediaFiles.length > 0) {
            const existingMediaFiles: MediaFile[] = orderData.MediaFiles.map(
              (mf: any) => ({
                uri: mf.fileUrl,
                type: mf.fileType as "image" | "video",
                fileName: mf.fileName,
                mimeType: mf.mimeType,
                fileSize: mf.fileSize || 0,
                id: mf.id, // Store ID for banner selection
              })
            );
            setMediaFiles(existingMediaFiles);

            // Set existing banner image if available
            if (orderData.bannerImageId) {
              setExistingBannerId(orderData.bannerImageId);
              const bannerIndex = existingMediaFiles.findIndex(
                (mf: any) => mf.id === orderData.bannerImageId
              );
              if (bannerIndex !== -1) {
                setSelectedBannerIndex(bannerIndex);
              }
            }
          }

          // Load existing questions
          if (orderData.questions && orderData.questions.length > 0) {
            const sortedQuestions = orderData.questions.sort(
              (a: any, b: any) => a.order - b.order
            );
            setQuestions(sortedQuestions.map((q: any) => q.question));
          }

          // Load existing skills and skillIds from OrderSkills
          if (
            (orderData as any).OrderSkills &&
            (orderData as any).OrderSkills.length > 0
          ) {
            const orderSkills = (orderData as any).OrderSkills;
            const loadedSkillIds = orderSkills
              .map((os: any) => os.Skill?.id)
              .filter((id: number) => id !== undefined && id !== null);
            setSkillIds(loadedSkillIds);

            // Extract skill names based on current language
            const skillNames = orderSkills
              .map((os: any) => {
                const skill = os.Skill;
                if (!skill) return null;
                // Get skill name based on current language
                switch (language) {
                  case "ru":
                    return skill.nameRu || skill.nameEn || skill.nameHy;
                  case "hy":
                    return skill.nameHy || skill.nameEn || skill.nameRu;
                  case "en":
                  default:
                    return skill.nameEn || skill.nameRu || skill.nameHy;
                }
              })
              .filter(
                (name: string | null) => name !== null && name.trim() !== ""
              );

            // Update formData.skills with comma-separated skill names
            if (skillNames.length > 0) {
              setFormData((prev) => ({
                ...prev,
                skills: skillNames.join(", "),
              }));
            }
          } else if (orderData.skills && orderData.skills.length > 0) {
            // Fallback: if OrderSkills not available, use skills array
            setSkillIds([]);
            // formData.skills is already set from line 379
          } else {
            setSkillIds([]);
          }
        } catch (error) {
          console.error("Error loading order for edit:", error);
          Alert.alert(t("error"), t("failedToLoadOrder"));
        }
      };

      loadOrderForEdit();
    }
  }, [serviceId, orderId, language, categoriesData]);

  const validateField = (
    field: string,
    value: string | number | null | undefined,
    additionalData?: {
      selectedDates?: Date[];
      selectedDateTimes?: { [key: string]: string[] };
    }
  ) => {
    switch (field) {
      case "title":
        if (!value || (typeof value === "string" && !value.trim())) {
          return t("pleaseEnterTitle");
        }
        const titleStr =
          typeof value === "string" ? value.trim() : value.toString();
        if (titleStr.length < 3) {
          return t("titleTooShort");
        }
        if (titleStr.length > 100) {
          return t("titleTooLong");
        }
        return "";
      case "description":
        if (!value || (typeof value === "string" && !value.trim())) {
          return t("pleaseEnterDescription");
        }
        const descStr =
          typeof value === "string" ? value.trim() : value.toString();
        if (descStr.length < 10) {
          return t("descriptionTooShort");
        }
        if (descStr.length > 2000) {
          return t("descriptionTooLong");
        }
        return "";
      case "budget":
        if (!value || value === "") {
          return t("pleaseEnterValidBudget");
        }
        const budgetStr = value.toString().trim();
        if (!budgetStr) {
          return t("pleaseEnterValidBudget");
        }
        // Check if it's a valid number
        if (isNaN(parseFloat(budgetStr))) {
          return t("budgetMustBeNumber");
        }
        const budgetNum = parseFloat(budgetStr);
        if (budgetNum <= 0) {
          return t("budgetMustBePositive");
        }
        if (budgetNum < 1) {
          return t("budgetTooLow");
        }
        if (budgetNum > 1000000) {
          return t("budgetTooHigh");
        }
        return "";
      case "location":
        // Location is optional, but if provided, validate format
        if (value && typeof value === "string" && value.trim()) {
          const locationStr = value.trim();
          if (locationStr.length < 3) {
            return t("locationTooShort");
          }
          if (locationStr.length > 200) {
            return t("locationTooLong");
          }
        }
        return "";
      case "skills":
        // Skills are optional, but if provided, validate format
        if (value && typeof value === "string" && value.trim()) {
          const skillsStr = value.trim();
          const skillsArray = skillsStr
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s);
          if (skillsArray.length > 20) {
            return t("tooManySkills");
          }
          // Check if any skill is too long
          const longSkill = skillsArray.find((skill) => skill.length > 50);
          if (longSkill) {
            return t("skillTooLong");
          }
        }
        return "";
      case "availableDates":
        // Available dates are completely optional
        // Only validate if dates are selected
        if (
          additionalData?.selectedDates &&
          Array.isArray(additionalData.selectedDates) &&
          additionalData.selectedDates.length > 0
        ) {
          const dates = additionalData.selectedDates;
          // Check if dates are in the past (allow today's date)
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const pastDates = dates.filter((date) => {
            if (!date) return false;
            try {
              const dateOnly = new Date(date);
              dateOnly.setHours(0, 0, 0, 0);
              // Only reject dates that are strictly before today (allow today and future)
              const dateTime = dateOnly.getTime();
              const todayTime = today.getTime();
              return dateTime < todayTime;
            } catch (error) {
              console.warn("Error validating date:", date, error);
              return false;
            }
          });
        }
        // Return empty string if no dates selected (completely optional)
        return "";
      case "serviceId":
        if (!value) {
          return t("pleaseSelectServiceCategory");
        }
        return "";
      default:
        return "";
    }
  };

  const updateField = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Real-time validation with additional data for date validation
    const error = validateField(field, value, {
      selectedDates,
      selectedDateTimes,
    });
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  // Validate available dates when they change
  useEffect(() => {
    if (selectedDates.length > 0) {
      const error = validateField("availableDates", formData.availableDates, {
        selectedDates,
        selectedDateTimes,
      });
      setErrors((prev) => ({ ...prev, availableDates: error }));
    } else {
      // Clear error if no dates selected (dates are optional)
      setErrors((prev) => ({ ...prev, availableDates: "" }));
    }
  }, [selectedDates, selectedDateTimes]);

  // Function to scroll to the first error field
  const scrollToFirstError = (validationErrors: typeof errors) => {
    // Define the order of fields to check
    const fieldOrder = [
      { field: "serviceId", ref: serviceSectionRef },
      { field: "title", ref: basicInfoSectionRef },
      { field: "description", ref: basicInfoSectionRef },
      { field: "budget", ref: priceSectionRef },
      { field: "location", ref: basicInfoSectionRef },
      { field: "skills", ref: skillsSectionRef },
      { field: "availableDates", ref: skillsSectionRef },
    ];

    // Find the first error
    for (const { field, ref } of fieldOrder) {
      const errorMessage =
        validationErrors[field as keyof typeof validationErrors];
      // Check if this field has an error
      if (
        errorMessage &&
        typeof errorMessage === "string" &&
        errorMessage.trim() !== ""
      ) {
        // Try measureLayout first (measures relative to ScrollView)
        if (ref.current && scrollViewRef.current) {
          try {
            ref.current.measureLayout(
              scrollViewRef.current as any,
              (x, y, width, height) => {
                if (scrollViewRef.current) {
                  scrollViewRef.current.scrollTo({
                    y: Math.max(0, y - 100), // Add padding from top
                    animated: true,
                  });
                }
              },
              () => {
                // Fallback to measureInWindow if measureLayout fails
                ref.current?.measureInWindow((x, y, width, height) => {
                  if (scrollViewRef.current) {
                    scrollViewRef.current.scrollTo({
                      y: Math.max(0, y - 120),
                      animated: true,
                    });
                  }
                });
              }
            );
          } catch (error) {
            // Final fallback: use measure
            ref.current?.measure((x, y, width, height, pageX, pageY) => {
              if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({
                  y: Math.max(0, pageY - 120),
                  animated: true,
                });
              }
            });
          }
        }
        break; // Stop at first error found
      }
    }
  };

  const handleServiceSelect = (category: Category | null) => {
    // Prevent service changes when order is in_progress
    if (orderStatus === "in_progress") {
      return;
    }

    if (!category) {
      setSelectedService(null);
      setFormData((prev) => ({ ...prev, categoryId: null }));
      setErrors((prev) => ({ ...prev, categoryId: "" }));
      return;
    }

    setSelectedService(category);
    setFormData((prev) => ({ ...prev, categoryId: category.id }));

    // Suggest budget based on service prices
    if (category.averagePrice) {
      setFormData((prev) => ({
        ...prev,
        budget: category.averagePrice!.toString(),
      }));
    }

    // Clear service error
    setErrors((prev) => ({ ...prev, categoryId: "" }));
  };

  const handleLocationChange = (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    setSelectedLocation(location);
  };

  const handleSubmit = async () => {
    // Validate all required fields before submission
    const validationErrors = {
      title: validateField("title", formData.title, {
        selectedDates,
        selectedDateTimes,
      }),
      description: validateField("description", formData.description, {
        selectedDates,
        selectedDateTimes,
      }),
      budget: validateField("budget", formData.budget, {
        selectedDates,
        selectedDateTimes,
      }),
      location: validateField("location", formData.location, {
        selectedDates,
        selectedDateTimes,
      }),
      skills: validateField("skills", formData.skills, {
        selectedDates,
        selectedDateTimes,
      }),
      availableDates: validateField("availableDates", formData.availableDates, {
        selectedDates,
        selectedDateTimes,
      }),
      categoryId: validateField("categoryId", formData.categoryId || "", {
        selectedDates,
        selectedDateTimes,
      }),
    };

    setErrors(validationErrors);

    // Check if there are any validation errors
    const hasErrors = Object.values(validationErrors).some(
      (error) => error !== ""
    );
    if (hasErrors) {
      // Scroll to first error after state and layout are updated
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToFirstError(validationErrors);
        }, 100);
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for API call
      const orderData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        budget: parseFloat(formData.budget),
        currency,
        rateUnit,
        categoryId: formData.categoryId!,
        location: selectedLocation
          ? `${selectedLocation.address} (${selectedLocation.latitude}, ${selectedLocation.longitude})`
          : formData.location.trim() || undefined,
        availableDates:
          formatAllDatesWithTimes().length > 0
            ? formatAllDatesWithTimes()
            : undefined,
        useAIEnhancement: useAIEnhancement, // For both new and existing orders
        questions: questions.filter((q) => q.trim().length > 0),
      };

      // Handle skills: send skillIds for existing skills, and skills array for new skills
      if (skillIds.length > 0 || newSkillNames.length > 0) {
        if (skillIds.length > 0) {
          orderData.skillIds = skillIds;
        }
        // If there are new skills (without IDs), send them as skills array
        // Backend will create them via findOrCreateSkills
        if (newSkillNames.length > 0) {
          orderData.skills = newSkillNames;
        }
      } else if (formData.skills.trim()) {
        // Fallback: if no skillIds or newSkillNames, use skills string (backward compatibility)
        orderData.skills = formData.skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s);
      }

      // If orderId exists, update the order; otherwise create a new one
      if (orderId) {
        // Update existing order
        await apiService.updateOrder(parseInt(orderId as string), orderData);
      } else {
        // Create new order
        await apiService.createOrder(orderData);
      }

      // Invalidate orders queries to refresh the list
      await queryClient.invalidateQueries({ queryKey: ["orders"] });

      // Order posted successfully
      router.replace("/orders");
    } catch (error: any) {
      console.error("Error posting order:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : t("unknownError");

      // Check if it's an insufficient credits error and AI enhancement was enabled
      if (
        (errorMessage.includes("Insufficient credit balance") ||
          errorMessage.includes("insufficient credit")) &&
        useAIEnhancement
      ) {
        // Directly navigate to credit refill page
        router.push("/profile/refill-credits");
      } else {
        Alert.alert(t("error"), t("failedToCreateOrder"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = () => {
    if (!orderId) return;

    Alert.alert(t("deleteOrder"), t("areYouSureDeleteOrder"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            setIsSubmitting(true);
            await apiService.deleteOrder(parseInt(orderId as string));
            Alert.alert(t("success"), t("orderDeletedSuccessfully"), [
              {
                text: t("ok"),
                onPress: () => {
                  router.replace("/orders");
                },
              },
            ]);
          } catch (error: any) {
            console.error("Error deleting order:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : typeof error === "string"
                ? error
                : t("unknownError");
            Alert.alert(
              t("error"),
              t("failedToDeleteOrder") + ": " + errorMessage
            );
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  const handleApply = async () => {
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      Alert.alert(t("error"), t("authenticationRequired"), [
        {
          text: t("ok"),
          onPress: () => {
            showLoginModal();
          },
        },
      ]);
      return;
    }

    // Validate all required fields before submission
    const validationErrors = {
      title: validateField("title", formData.title, {
        selectedDates,
        selectedDateTimes,
      }),
      description: validateField("description", formData.description, {
        selectedDates,
        selectedDateTimes,
      }),
      budget: validateField("budget", formData.budget, {
        selectedDates,
        selectedDateTimes,
      }),
      location: validateField("location", formData.location, {
        selectedDates,
        selectedDateTimes,
      }),
      skills: validateField("skills", formData.skills, {
        selectedDates,
        selectedDateTimes,
      }),
      availableDates: validateField("availableDates", formData.availableDates, {
        selectedDates,
        selectedDateTimes,
      }),
      categoryId: validateField("categoryId", formData.categoryId || "", {
        selectedDates,
        selectedDateTimes,
      }),
    };

    setErrors(validationErrors);

    // Check if there are any validation errors
    const hasErrors = Object.values(validationErrors).some(
      (error) => error !== ""
    );
    if (hasErrors) {
      // Scroll to first error after state and layout are updated
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToFirstError(validationErrors);
        }, 100);
      });
      return;
    }

    // Prepare base order data
    const baseOrderData: any = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      budget: parseFloat(formData.budget),
      currency,
      rateUnit,
      categoryId: formData.categoryId!,
      location: selectedLocation
        ? `${selectedLocation.address} (${selectedLocation.latitude}, ${selectedLocation.longitude})`
        : formData.location.trim() || undefined,
      availableDates:
        formatAllDatesWithTimes().length > 0
          ? formatAllDatesWithTimes()
          : undefined,
      questions: questions.filter((q) => q.trim().length > 0),
    };

    // Handle skills: send skillIds for existing skills, and skills array for new skills
    if (skillIds.length > 0 || newSkillNames.length > 0) {
      if (skillIds.length > 0) {
        baseOrderData.skillIds = skillIds;
      }
      // If there are new skills (without IDs), send them as skills array
      // Backend will create them via findOrCreateSkills
      if (newSkillNames.length > 0) {
        baseOrderData.skills = newSkillNames;
      }
    } else if (formData.skills.trim()) {
      // Fallback: if no skillIds or newSkillNames, use skills string (backward compatibility)
      baseOrderData.skills = formData.skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);
    }

    // If AI enhancement is enabled, show preview first
    if (useAIEnhancement) {
      setIsSubmitting(true);
      try {
        // Call preview endpoint
        const preview = await apiService.previewAIEnhancement({
          title: baseOrderData.title,
          description: baseOrderData.description,
        });

        // Store preview data and order data
        setAiPreviewData(preview);
        setPendingOrderData(baseOrderData);
        setShowAIPreview(true);
        setIsSubmitting(false);
        return;
      } catch (error: any) {
        setIsSubmitting(false);
        console.error("Error getting AI preview:", error);

        const errorMessage =
          error instanceof Error
            ? error.message
            : typeof error === "string"
            ? error
            : t("unknownError");

        // Check if it's an insufficient credits error
        if (
          (errorMessage.includes("Insufficient credit balance") ||
            errorMessage.includes("insufficient credit")) &&
          useAIEnhancement
        ) {
          // Directly navigate to credit refill page
          router.push("/profile/refill-credits");
          return;
        }

        Alert.alert(t("error"), t("failedToGetAIPreview") || errorMessage);
        return;
      }
    }

    // If no AI enhancement, proceed with normal save
    await saveOrder(baseOrderData, false);
  };

  // Helper function to save order (used by preview modal and direct save)
  const saveOrder = async (
    orderData: any,
    useEnhanced: boolean = false,
    enhancedData?: {
      titleEn: string;
      titleRu: string;
      titleHy: string;
      descriptionEn: string;
      descriptionRu: string;
      descriptionHy: string;
    }
  ) => {
    setIsSubmitting(true);

    try {
      // Add enhanced fields if using enhanced data
      const finalOrderData = { ...orderData, currency, rateUnit };
      if (useEnhanced && enhancedData) {
        finalOrderData.titleEn = enhancedData.titleEn;
        finalOrderData.titleRu = enhancedData.titleRu;
        finalOrderData.titleHy = enhancedData.titleHy;
        finalOrderData.descriptionEn = enhancedData.descriptionEn;
        finalOrderData.descriptionRu = enhancedData.descriptionRu;
        finalOrderData.descriptionHy = enhancedData.descriptionHy;
        finalOrderData.useAIEnhancement = true;
      } else {
        finalOrderData.useAIEnhancement = false;
      }

      const currentOrderId = orderId ? parseInt(orderId as string) : null;

      // If editing an existing order
      if (currentOrderId) {
        // Separate new files (local URIs) from existing files (HTTP URLs)
        const newFiles = mediaFiles.filter(
          (file) =>
            file.uri.startsWith("file://") || file.uri.startsWith("content://")
        );

        // Upload new files with the actual orderId
        if (newFiles.length > 0) {
          await fileUploadService.uploadMultipleFiles(newFiles, currentOrderId);
        }

        // Update the order
        await apiService.updateOrder(currentOrderId, finalOrderData);

        // Handle banner image update
        // Auto-select first image if no banner is selected
        let bannerIndexToUse = selectedBannerIndex;
        if (bannerIndexToUse === null && mediaFiles.length > 0) {
          const firstImageIndex = mediaFiles.findIndex(
            (file) => file.type === "image"
          );
          if (firstImageIndex !== -1) {
            bannerIndexToUse = firstImageIndex;
          }
        }

        if (bannerIndexToUse !== null) {
          // Reload the order to get all media files with their IDs
          const updatedOrder = await apiService.getOrderById(currentOrderId);

          if (updatedOrder.MediaFiles && updatedOrder.MediaFiles.length > 0) {
            // Find the media file at the selected index
            const bannerFile = mediaFiles[bannerIndexToUse];

            // Try to find the matching media file in the database
            let targetMediaFile = null;

            // If it's an existing file (has ID), use that ID directly
            if ((bannerFile as any).id) {
              targetMediaFile = updatedOrder.MediaFiles.find(
                (mf: any) => mf.id === (bannerFile as any).id
              );
            } else {
              // For new files, match by filename
              // The fileName should match between the local file and the uploaded file
              targetMediaFile = updatedOrder.MediaFiles.find(
                (mf: any) =>
                  mf.fileType === "image" && mf.fileName === bannerFile.fileName
              );

              // If not found by filename, try to match by finding the most recently uploaded image
              if (!targetMediaFile && newFiles.length > 0) {
                const imageFiles = updatedOrder.MediaFiles.filter(
                  (mf: any) => mf.fileType === "image"
                ).sort(
                  (a: any, b: any) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                );

                // Find the index of the selected file among new files
                const newFileIndex = newFiles.findIndex(
                  (f) => f === bannerFile
                );
                if (newFileIndex >= 0 && newFileIndex < imageFiles.length) {
                  targetMediaFile = imageFiles[newFileIndex];
                }
              }
            }

            // Set banner image if we found a match
            if (targetMediaFile && targetMediaFile.fileType === "image") {
              try {
                await apiService.setBannerImage(
                  currentOrderId,
                  targetMediaFile.id
                );
              } catch (error) {
                console.error("Error setting banner image:", error);
              }
            } else {
              console.warn("Could not find matching media file for banner", {
                selectedIndex: bannerIndexToUse,
                bannerFileName: bannerFile.fileName,
                availableFiles: updatedOrder.MediaFiles.map((mf: any) => ({
                  id: mf.id,
                  fileName: mf.fileName,
                  fileType: mf.fileType,
                })),
              });
            }
          }
        }

        // Invalidate orders queries to refresh the list
        await queryClient.invalidateQueries({ queryKey: ["orders"] });

        // Order updated successfully - show message if status changed to pending_review
        const updatedOrder = await apiService.getOrderById(currentOrderId);
        if (updatedOrder.status === "pending_review") {
          Alert.alert(t("success"), t("orderUpdatedPendingApproval"), [
            {
              text: t("ok"),
              onPress: () => {
                router.replace("/orders?myOrders=true");
              },
            },
          ]);
        } else {
          router.replace("/orders");
        }
      } else {
        // Creating a new order
        let createdOrder;
        // Use transactional order creation with media files
        if (mediaFiles.length > 0) {
          const { order } = await fileUploadService.createOrderWithMedia(
            finalOrderData,
            mediaFiles
          );
          createdOrder = order;

          // Auto-select first image if no banner is selected
          let bannerIndexToUse = selectedBannerIndex;
          if (bannerIndexToUse === null) {
            const firstImageIndex = mediaFiles.findIndex(
              (file) => file.type === "image"
            );
            if (firstImageIndex !== -1) {
              bannerIndexToUse = firstImageIndex;
            }
          }

          // Set banner image if available
          if (bannerIndexToUse !== null && order.id) {
            // Reload order to get media file IDs
            const updatedOrder = await apiService.getOrderById(order.id);
            if (
              updatedOrder.MediaFiles &&
              bannerIndexToUse < updatedOrder.MediaFiles.length
            ) {
              const bannerFile = updatedOrder.MediaFiles[bannerIndexToUse];
              await apiService.setBannerImage(order.id, bannerFile.id);
            }
          }

          // Track order creation
          if (createdOrder?.id) {
            await AnalyticsService.getInstance().logOrderCreated(
              createdOrder.id.toString(),
              finalOrderData.budget,
              "USD"
            );
          }

          // Invalidate orders queries to refresh the list
          await queryClient.invalidateQueries({ queryKey: ["orders"] });

          // Show success message with pending approval info
          Alert.alert(t("success"), t("orderCreatedPendingApproval"), [
            {
              text: t("ok"),
              onPress: () => {
                router.replace("/orders?myOrders=true");
              },
            },
          ]);
        } else {
          // No media files, use regular order creation
          createdOrder = await apiService.createOrder(finalOrderData);

          // Track order creation
          if (createdOrder?.id) {
            await AnalyticsService.getInstance().logOrderCreated(
              createdOrder.id.toString(),
              finalOrderData.budget,
              "USD"
            );
          }

          // Invalidate orders queries to refresh the list
          await queryClient.invalidateQueries({ queryKey: ["orders"] });

          // Show success message with pending approval info
          Alert.alert(t("success"), t("orderCreatedPendingApproval"), [
            {
              text: t("ok"),
              onPress: () => {
                router.replace("/orders?myOrders=true");
              },
            },
          ]);
        }
      }
    } catch (error: any) {
      console.error("Error creating order:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : t("unknownError");

      // Check if it's an insufficient credits error and AI enhancement was enabled
      if (
        (errorMessage.includes("Insufficient credit balance") ||
          errorMessage.includes("insufficient credit")) &&
        useEnhanced
      ) {
        // Directly navigate to credit refill page
        router.push("/profile/refill-credits");
        return;
      }

      // Check if it's an authentication error
      if (
        errorMessage.includes("Authentication required") ||
        errorMessage.includes("Unauthorized") ||
        errorMessage.includes("Invalid token") ||
        errorMessage.includes("expired") ||
        error?.response?.status === 401
      ) {
        Alert.alert(t("error"), t("authenticationRequired"), [
          {
            text: t("ok"),
            onPress: () => {
              // Optionally redirect to login
              router.replace("/");
            },
          },
        ]);
      } else {
        Alert.alert(
          t("error"),
          t("failedToSubmitApplication") + ": " + errorMessage
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview modal handlers
  const handleAcceptAI = async (enhanced: any) => {
    if (!pendingOrderData) return;
    setShowAIPreview(false);
    await saveOrder(pendingOrderData, true, enhanced);
  };

  const handleRejectAI = async () => {
    if (!pendingOrderData) return;
    setShowAIPreview(false);
    await saveOrder(pendingOrderData, false);
  };

  const handleCancelAI = () => {
    // Just close the modal without saving - user can continue editing
    setShowAIPreview(false);
    setAiPreviewData(null);
    setPendingOrderData(null);
  };

  const handleRetryAI = async (title: string, description: string) => {
    try {
      // Call preview endpoint with edited text
      const preview = await apiService.previewAIEnhancement({
        title: title,
        description: description,
      });

      // Update preview data with new results
      const newPreviewData = {
        original: {
          title: title,
          description: description,
        },
        enhanced: preview.enhanced,
      };
      setAiPreviewData(newPreviewData);

      // Also update pending order data with edited text
      if (pendingOrderData) {
        setPendingOrderData({
          ...pendingOrderData,
          title: title,
          description: description,
        });
      }
    } catch (error: any) {
      console.error("Error retrying AI:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : t("unknownError");

      Alert.alert(t("error"), t("failedToGetAIPreview") + ": " + errorMessage);
      throw error;
    }
  };

  const header = (
    <Header
      title={t("createOrder")}
      subtitle={t("postNewJobOpportunity")}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  return (
    <Layout header={header}>
      <ScrollView ref={scrollViewRef} style={{ flex: 1, marginBottom: 100 }}>
        <ResponsiveContainer>
          {/* Basic Information */}
          <ResponsiveCard>
            <View ref={basicInfoSectionRef}>
              <BasicInformationForm
                formData={{
                  title: formData.title,
                  description: formData.description,
                  budget: formData.budget,
                  location: formData.location,
                }}
                errors={{
                  title: errors.title,
                  description: errors.description,
                  budget: errors.budget,
                  location: errors.location,
                }}
                onFieldChange={updateField}
                onLocationChange={handleLocationChange}
              />
            </View>
          </ResponsiveCard>

          {/* Service Selection */}
          <ResponsiveCard>
            <View ref={serviceSectionRef}>
              <ServiceSelector
                selectedService={selectedService}
                onServiceSelect={handleServiceSelect}
                error={errors.categoryId}
                disabled={orderStatus === "in_progress"}
              />
            </View>
          </ResponsiveCard>

          {/* Price Section - Separate Card */}
          <ResponsiveCard>
            <View ref={priceSectionRef}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("price")}
              </Text>

              {selectedService ? (
                <Text style={[styles.priceHint, { color: colors.tint }]}>
                  {t("budgetSuggestionNote")} {t("youCanChangeThis")}
                </Text>
              ) : (
                <Text
                  style={[styles.priceHint, { color: colors.tabIconDefault }]}
                >
                  {t("selectCategoryFirstForBudgetSuggestion")}
                </Text>
              )}

              {/* Price Input Row */}
              <View style={styles.priceInputRow}>
                {/* Price Amount Input */}
                <View style={styles.priceAmountContainer}>
                  <TextInput
                    style={[
                      styles.priceInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: errors.budget ? "#ff4444" : colors.border,
                        borderTopColor: errors.budget
                          ? "#ff4444"
                          : colors.border,
                        borderBottomColor: errors.budget
                          ? "#ff4444"
                          : colors.border,
                        borderLeftColor: errors.budget
                          ? "#ff4444"
                          : colors.border,
                        borderRightColor: colors.border, // Keep inner border normal
                        color: colors.text,
                      },
                    ]}
                    value={formData.budget}
                    onChangeText={(value) => updateField("budget", value)}
                    placeholder={
                      selectedService
                        ? `${selectedService.averagePrice || 0}`
                        : t("budgetPlaceholder")
                    }
                    placeholderTextColor={colors.tabIconDefault}
                    keyboardType="numeric"
                    editable={!!selectedService && !isConvertingCurrency}
                  />
                  {isConvertingCurrency && (
                    <View style={styles.convertingIndicator}>
                      <ActivityIndicator size="small" color={colors.tint} />
                    </View>
                  )}
                </View>

                {/* Currency Selector */}
                <View style={styles.currencyContainer}>
                  <TouchableOpacity
                    style={[
                      styles.selectorButton,
                      {
                        backgroundColor: colors.background,
                        borderColor: errors.budget ? "#ff4444" : colors.border,
                        borderTopColor: errors.budget
                          ? "#ff4444"
                          : colors.border,
                        borderBottomColor: errors.budget
                          ? "#ff4444"
                          : colors.border,
                        borderLeftColor: colors.border, // Keep inner border normal
                        borderRightColor: colors.border, // Keep inner border normal
                      },
                    ]}
                    onPress={() => setShowCurrencyModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.selectorText, { color: colors.text }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {currency}
                    </Text>
                    <IconSymbol
                      name="chevron.down"
                      size={14}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Rate Unit Selector */}
                <View style={styles.rateUnitContainer}>
                  <TouchableOpacity
                    style={[
                      styles.selectorButton,
                      styles.rateUnitSelectorButton,
                      {
                        backgroundColor: colors.background,
                        borderColor: errors.budget ? "#ff4444" : colors.border,
                        borderTopColor: errors.budget
                          ? "#ff4444"
                          : colors.border,
                        borderBottomColor: errors.budget
                          ? "#ff4444"
                          : colors.border,
                        borderRightColor: errors.budget
                          ? "#ff4444"
                          : colors.border,
                        borderLeftColor: colors.border, // Keep inner border normal
                      },
                    ]}
                    onPress={() => setShowRateUnitModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.selectorText, { color: colors.text }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {formatRateUnitLabel(rateUnit)}
                    </Text>
                    <IconSymbol
                      name="chevron.down"
                      size={14}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              {errors.budget ? (
                <Text style={{ color: "#ff4444", marginBottom: 10 }}>
                  {errors.budget}
                </Text>
              ) : null}

              {/* Preview Display */}
              {formData.budget && parseFloat(formData.budget) > 0 && (
                <View>
                  <Text
                    style={[
                      styles.previewLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("willBeDisplayedAs")}
                  </Text>
                  <Text style={[styles.previewValue, { color: colors.text }]}>
                    {`${currency.toUpperCase()} ${parseFloat(
                      formData.budget
                    ).toLocaleString()} • ${formatRateUnitLabel(rateUnit)}`}
                  </Text>
                </View>
              )}
            </View>
          </ResponsiveCard>

          {/* Media Upload */}
          <ResponsiveCard>
            <MediaUploader
              onMediaChange={setMediaFiles}
              maxFiles={10}
              value={mediaFiles}
              selectedBannerIndex={selectedBannerIndex ?? undefined}
              onBannerSelect={setSelectedBannerIndex}
              existingBannerId={
                existingBannerId !== null ? existingBannerId : undefined
              }
            />
            {mediaFiles.length > 0 && (
              <Text
                style={[styles.bannerHint, { color: colors.tabIconDefault }]}
              >
                {t("tapImageToSetAsBanner")}
              </Text>
            )}
          </ResponsiveCard>

          {/* Skills and Requirements */}

          <View ref={skillsSectionRef}>
            <SkillsAndRequirementsForm
              formData={{
                skills: formData.skills,
              }}
              errors={{
                skills: errors.skills,
              }}
              onFieldChange={updateField}
              onSkillIdsChange={(ids: number[], newNames?: string[]) => {
                setSkillIds(ids);
                setNewSkillNames(newNames || []);
              }}
            />
          </View>

          <DateTimeSelector
            error={errors.availableDates}
            selectedDates={selectedDates}
            selectedDateTimes={selectedDateTimes}
            onDatesChange={setSelectedDates}
            onDateTimesChange={setSelectedDateTimes}
          />

          {/* Questions Section */}
          <ResponsiveCard style={{ position: "relative" }}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("questionsForSpecialists")}
              </Text>
            </View>

            {questions.map((question, index) => (
              <View key={index} style={styles.questionItem}>
                <TextInput
                  style={[
                    styles.questionInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder={t("enterQuestion")}
                  placeholderTextColor={colors.tabIconDefault}
                  value={question}
                  onChangeText={(text) => {
                    const newQuestions = [...questions];
                    newQuestions[index] = text;
                    setQuestions(newQuestions);
                  }}
                  multiline
                />
                <TouchableOpacity
                  onPress={() => {
                    const newQuestions = questions.filter(
                      (_, i) => i !== index
                    );
                    setQuestions(newQuestions);
                  }}
                  style={[
                    styles.deleteQuestionButton,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <IconSymbol name="trash" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => {
                if (!canAddAnotherQuestion()) return;
                setQuestions([...questions, ""]);
              }}
              disabled={!canAddAnotherQuestion()}
              style={[
                styles.addQuestionButton,
                {
                  position: "absolute",
                  right: 16,
                  top: 7,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  opacity: canAddAnotherQuestion() ? 1 : 0.5,
                },
              ]}
            >
              <IconSymbol name="plus.circle" size={20} color={colors.tint} />
            </TouchableOpacity>
          </ResponsiveCard>

          {/* Action Buttons */}
          <ResponsiveCard>
            {/* AI Enhancement Option - Show for both new and existing orders */}
            <View style={styles.aiEnhancementContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setUseAIEnhancement(!useAIEnhancement)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: useAIEnhancement
                        ? colors.primary
                        : "transparent",
                      borderColor: useAIEnhancement
                        ? colors.primary
                        : colors.borderTertiary,
                    },
                  ]}
                >
                  {useAIEnhancement && (
                    <IconSymbol name="checkmark" size={14} color="white" />
                  )}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                  {t("improveWithAI")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    t("aiEnhancement"),
                    t("aiEnhancementDescription"),
                    [{ text: t("ok") }]
                  );
                }}
                style={styles.infoButton}
              >
                <IconSymbol
                  name="info.circle"
                  size={18}
                  color={colors.tabIconDefault}
                />
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.actionButtons,
                { borderTopColor: colors.border },
                !orderId && styles.singleButtonContainer,
              ]}
            >
              {orderId && (
                <>
                  <Button
                    variant="outline"
                    icon="trash"
                    iconSize={16}
                    iconPosition="left"
                    title={t("delete")}
                    textColor="#FF3B30"
                    onPress={handleDeleteOrder}
                  />
                  <Button
                    variant="outline"
                    icon="eye"
                    iconSize={16}
                    iconPosition="left"
                    title={t("preview")}
                    onPress={() => {
                      router.push(`/orders/${orderId}?preview=true`);
                    }}
                  />
                </>
              )}
              <Button
                style={{ minWidth: 80 }}
                onPress={handleApply}
                title={orderId ? t("save") : t("apply")}
                variant="primary"
                disabled={isSubmitting}
                loading={isSubmitting}
              />
            </View>
          </ResponsiveCard>
        </ResponsiveContainer>
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          <Image
            source={{ uri: selectedImage || "" }}
            style={styles.modalImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Modal>

      {/* AI Preview Modal */}
      {aiPreviewData && (
        <AIPreviewModal
          visible={showAIPreview}
          onClose={handleCancelAI}
          original={aiPreviewData.original}
          enhanced={aiPreviewData.enhanced}
          onAccept={handleAcceptAI}
          onReject={handleRejectAI}
          onRetryAI={handleRetryAI}
          loading={isSubmitting}
        />
      )}

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.selectorModalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("selectCurrency")}
              </Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <IconSymbol name="xmark" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            {currencyOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.modalOption,
                  {
                    backgroundColor:
                      currency === option
                        ? colors.primary + "10"
                        : "transparent",
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => {
                  // Store current currency before changing
                  setPreviousCurrency(currency);
                  setCurrency(option);
                  setShowCurrencyModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: colors.text }]}>
                  {option}
                </Text>
                {currency === option && (
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

      {/* Rate Unit Selection Modal */}
      <Modal
        visible={showRateUnitModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowRateUnitModal(false);
          setShowAddCustomRateUnit(false);
          setNewCustomRateUnit("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.selectorModalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("selectRateUnit")}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowRateUnitModal(false);
                  setShowAddCustomRateUnit(false);
                  setNewCustomRateUnit("");
                }}
              >
                <IconSymbol name="xmark" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {rateUnitOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    {
                      backgroundColor:
                        rateUnit === option.value
                          ? colors.primary + "10"
                          : "transparent",
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    setRateUnit(option.value);
                    setShowRateUnitModal(false);
                  }}
                >
                  <Text
                    style={[styles.modalOptionText, { color: colors.text }]}
                  >
                    {getRateUnitLabelForLanguage(option, language)}
                  </Text>
                  {rateUnit === option.value && (
                    <IconSymbol
                      name="checkmark"
                      size={16}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}

              {/* Add Custom Option */}
              {showAddCustomRateUnit ? (
                <View style={styles.addCustomContainer}>
                  <TextInput
                    style={[
                      styles.addCustomInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={newCustomRateUnit}
                    onChangeText={setNewCustomRateUnit}
                    placeholder={t("enterCustomRateUnit")}
                    placeholderTextColor={colors.tabIconDefault}
                    autoFocus
                  />
                  <View style={styles.addCustomActions}>
                    <TouchableOpacity
                      style={[
                        styles.addCustomButton,
                        { backgroundColor: colors.background },
                      ]}
                      onPress={() => {
                        setShowAddCustomRateUnit(false);
                        setNewCustomRateUnit("");
                      }}
                    >
                      <Text
                        style={[
                          styles.addCustomButtonText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("cancel")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.addCustomButton,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={() => {
                        const trimmed = newCustomRateUnit.trim();
                        if (trimmed) {
                          const exists = rateUnitOptions.some(
                            (u) => u.value === trimmed
                          );
                          if (!exists) {
                            // Add custom rate unit with same label for all languages
                            setRateUnitOptions((prev) => [
                              ...prev,
                              {
                                value: trimmed,
                                labelEn: trimmed,
                                labelRu: trimmed,
                                labelHy: trimmed,
                              },
                            ]);
                            setRateUnit(trimmed);
                          }
                        }
                        setShowAddCustomRateUnit(false);
                        setNewCustomRateUnit("");
                        setShowRateUnitModal(false);
                      }}
                    >
                      <Text
                        style={[styles.addCustomButtonText, { color: "#fff" }]}
                      >
                        {t("add")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    {
                      borderBottomColor: colors.border,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    },
                  ]}
                  onPress={() => setShowAddCustomRateUnit(true)}
                >
                  <IconSymbol
                    name="plus.circle"
                    size={18}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.modalOptionText, { color: colors.primary }]}
                  >
                    {t("addCustom")}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  footerButtons: {
    margin: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  actionButtons: {
    paddingTop: 20,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 12,
  },
  singleButtonContainer: {
    justifyContent: "center",
  },
  applyButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
    flex: 1,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF3B30",
    gap: 6,
    flex: 1,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF3B30",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalImage: {
    width: "90%",
    height: "90%",
  },
  selectorModalContent: {
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
    fontSize: 18,
    fontWeight: "600",
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
    fontWeight: "500",
    flex: 1,
    marginLeft: 12,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  addCustomContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  addCustomInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  addCustomActions: {
    flexDirection: "row",
    gap: 12,
  },
  addCustomButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addCustomButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  bannerHint: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 8,
    opacity: 0.7,
  },
  aiEnhancementContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  infoButton: {
    padding: 4,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    marginBottom: 4,
  },
  priceHint: {
    fontSize: 12,
    marginBottom: 12,
    fontStyle: "italic",
  },
  priceInputRow: {
    flexDirection: "row",
    gap: 0,
    alignItems: "stretch",
  },
  priceAmountContainer: {
    flex: 1,
    position: "relative",
  },
  convertingIndicator: {
    position: "absolute",
    right: 12,
    top: 14,
  },
  priceInput: {
    borderWidth: 1,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "600",
    height: 48,
  },
  currencyContainer: {
    flex: 1,
  },
  rateUnitContainer: {
    flex: 1,
  },
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
  },
  rateUnitSelectorButton: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  previewLabel: {
    fontSize: 12,
    marginTop: 10,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  questionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  questionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
  deleteQuestionButton: {
    padding: 8,
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addQuestionButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    width: 45,
    height: 45,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
});
