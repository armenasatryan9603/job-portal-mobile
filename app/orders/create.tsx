import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Category, apiService } from "@/categories/api";
import { MediaFile, fileUploadService } from "@/categories/fileUpload";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { ThemeColors, Typography } from "@/constants/styles";
import {
  WeeklySchedule,
  WeeklySchedulePicker,
} from "@/components/WeeklySchedulePicker";
import { router, useLocalSearchParams } from "expo-router";

import { AIPreviewModal } from "@/components/AIPreviewModal";
import { API_CONFIG } from "@/config/api";
import { ActionButtons } from "@/components/ActionButtons";
import AnalyticsService from "@/categories/AnalyticsService";
import { BasicInformationForm } from "@/components/BasicInformationForm";
import { BecomeSpecialistModal } from "@/components/BecomeSpecialistModal";
import { BreakOverlapModal } from "@/components/BreakOverlapModal";
import { Button } from "@/components/ui/button";
import { CategorySelector } from "@/components/ServiceSelector";
import { Header } from "@/components/Header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LOCATION_COUNTRY_SEPARATOR } from "@/utils/countryExtraction";
import { Layout } from "@/components/Layout";
import { MediaUploader } from "@/components/MediaUploader";
import { SkillsAndRequirementsForm } from "@/components/SkillsAndRequirementsForm";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/useApi";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { useKeyboardAwarePress } from "@/hooks/useKeyboardAwarePress";
import { useLanguage } from "@/contexts/LanguageContext";
import { useModal } from "@/contexts/ModalContext";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/contexts/TranslationContext";

// Note: Slot generation removed - clients now book custom time ranges within work hours

export default function CreateOrderScreen() {
  useAnalytics("CreateOrder");
  const { serviceId, orderId } = useLocalSearchParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { isAuthenticated, user, updateUser } = useAuth();
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
  const { isKeyboardVisible } = useKeyboardAwarePress();

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
    isoCountryCode?: string;
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
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [useAIEnhancement, setUseAIEnhancement] = useState<boolean>(true);
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
  const [orderType, setOrderType] = useState<"one_time" | "permanent">(
    "one_time"
  );
  const [workDurationPerClient, setWorkDurationPerClient] =
    useState<string>("");
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});
  const [checkinRequiresApproval, setCheckinRequiresApproval] =
    useState<boolean>(false);
  const [isSpecialist, setIsSpecialist] = useState<boolean>(false);
  const [showBecomeSpecialistModal, setShowBecomeSpecialistModal] =
    useState(false);
  const [resourceBookingMode, setResourceBookingMode] = useState<
    "select" | "auto" | "multi" | null
  >(null);
  const [requiredResourceCount, setRequiredResourceCount] = useState<string>("");
  const [orderMarkets, setOrderMarkets] = useState<Array<{
    id: number;
    name: string;
    nameEn?: string;
    nameRu?: string;
    nameHy?: string;
  }>>([]);
  const [showBreakOverlapModal, setShowBreakOverlapModal] = useState(false);
  const [overlappingBookings, setOverlappingBookings] = useState<any[]>([]);
  const [pendingScheduleData, setPendingScheduleData] = useState<any>(null);
  const canAddAnotherQuestion = () =>
    questions.length === 0 || questions[questions.length - 1].trim().length > 0;

  // Form persistence - only for new orders (not editing)
  // NOTE: We intentionally do NOT persist mediaFiles or banner selection.
  const persistedFormData = useMemo(
    () => ({
      formData,
      skillIds,
      newSkillNames,
      currency,
      rateUnit,
      selectedLocation,
      categoryId: selectedService?.id || null,
      selectedDates: selectedDates.map((d: Date) => d.toISOString()),
      selectedDateTimes,
      questions,
      orderType,
      workDurationPerClient,
      weeklySchedule,
      checkinRequiresApproval,
      useAIEnhancement,
      resourceBookingMode,
      requiredResourceCount,
    }),
    [
      formData,
      skillIds,
      newSkillNames,
      currency,
      rateUnit,
      selectedLocation,
      selectedService,
      selectedDates,
      selectedDateTimes,
      questions,
      orderType,
      workDurationPerClient,
      weeklySchedule,
      checkinRequiresApproval,
      useAIEnhancement,
      resourceBookingMode,
      requiredResourceCount,
    ]
  );

  // Default form data (initial state) - used to exclude defaults from persistence
  const defaultPersistedFormData = useMemo(
    () => ({
      formData: {
        title: "",
        description: "",
        budget: "",
        location: "",
        skills: "",
        availableDates: "",
        categoryId: serviceId ? parseInt(serviceId as string) : null,
      },
      skillIds: [],
      newSkillNames: [],
      currency: "AMD",
      rateUnit: "per project",
      selectedLocation: null,
      categoryId: serviceId ? parseInt(serviceId as string) : null,
      selectedDates: [],
      selectedDateTimes: {},
      questions: [],
      orderType: "one_time" as const,
      workDurationPerClient: "",
      weeklySchedule: {},
      checkinRequiresApproval: false,
      useAIEnhancement: false,
      resourceBookingMode: null,
      requiredResourceCount: "",
    }),
    [serviceId]
  );

  const { clearSavedData } = useFormPersistence({
    storageKey: "create_order_draft",
    formData: persistedFormData,
    defaultData: defaultPersistedFormData,
    enabled: !orderId, // Only persist for new orders
    alertTitle: t("continueForm"),
    alertMessage: t("unsavedChangesContinue"),
    continueText: t("continue"),
    startFreshText: t("startFresh"),
    onRestore: (data: typeof persistedFormData) => {
      setFormData(data.formData);
      setSkillIds(data.skillIds || []);
      setNewSkillNames(data.newSkillNames || []);
      setSelectedLocation(data.selectedLocation);
      if (data.categoryId && categoriesData?.categories) {
        const category = categoriesData.categories.find(
          (c) => c.id === data.categoryId
        );
        if (category) setSelectedService(category);
      }
      if (data.selectedDates) {
        setSelectedDates(data.selectedDates.map((d) => new Date(d)));
      }
      setSelectedDateTimes(data.selectedDateTimes || {});
      setQuestions(data.questions || []);
      setOrderType(data.orderType || "one_time");
      setWorkDurationPerClient(data.workDurationPerClient || "");
      setWeeklySchedule(data.weeklySchedule || {});
      setCheckinRequiresApproval(data.checkinRequiresApproval || false);
      setUseAIEnhancement(data.useAIEnhancement || false);
      setResourceBookingMode(data.resourceBookingMode || null);
      setRequiredResourceCount(data.requiredResourceCount || "");
      // mediaFiles and banner index are intentionally not restored from draft
    },
    onClear: () => {
      // Reset form when user chooses to start fresh
    },
  });

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
      (u) => u.value?.toLowerCase() === value?.toLowerCase()
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

  const getLocalizedMarketName = (market: {
    name: string;
    nameEn?: string;
    nameRu?: string;
    nameHy?: string;
  }): string => {
    if (language === "en" && market.nameEn) return market.nameEn;
    if (language === "ru" && market.nameRu) return market.nameRu;
    if (language === "hy" && market.nameHy) return market.nameHy;
    return market.name;
  };

  // Refs for scrolling to error fields
  const scrollViewRef = useRef<ScrollView>(null);
  const serviceSectionRef = useRef<View>(null);
  const basicInfoSectionRef = useRef<View>(null);
  const priceSectionRef = useRef<View>(null);
  const skillsSectionRef = useRef<View>(null);
  const questionsSectionRef = useRef<View>(null);

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

  // Check if user is a specialist
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user?.id) return;

      try {
        // Check if user has categories (is a specialist)
        const profile = await apiService.getUserProfile();
        const userCategories = (profile as any).UserCategories || [];
        setIsSpecialist(userCategories.length > 0);
        
        // Update AsyncStorage cache with full profile data
        await updateUser(profile);
      } catch (error) {
        console.error("Error checking user status:", error);
        setIsSpecialist(false);
      }
    };

    checkUserStatus();
  }, [user?.id, user?.role]); // Also watch for role changes

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

        // Suggest budget based on category prices (averagePrice, or min/midpoint when minPrice/maxPrice exist)
        const defaultBudget =
          category.averagePrice ??
          (category.minPrice != null && category.maxPrice != null
            ? Math.round((category.minPrice + category.maxPrice) / 2)
            : category.minPrice);
        if (defaultBudget != null) {
          setFormData((prev) => ({
            ...prev,
            budget: defaultBudget.toString(),
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

          const TranslatedContent = {
            name: '',
            description: ''
          }

          switch (language) {
            case "ru":
                TranslatedContent.name = orderData.titleRu || orderData.title;
                TranslatedContent.description = orderData.descriptionRu || orderData.description;
              break;
              case "hy":
                TranslatedContent.name = orderData.titleHy || orderData.title;
                TranslatedContent.description = orderData.descriptionHy || orderData.description;
              break;
              case "en":
                TranslatedContent.name = orderData.titleEn || orderData.title;
                TranslatedContent.description = orderData.descriptionEn || orderData.description;
              break;
            default:
              TranslatedContent.name = orderData.title;
              TranslatedContent.description = orderData.description;
          }
          

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

          // Load permanent order specific fields
          if (orderData.orderType) {
            setOrderType(orderData.orderType as "one_time" | "permanent");
          }
          if (orderData.workDurationPerClient) {
            setWorkDurationPerClient(
              orderData.workDurationPerClient.toString()
            );
          }
          if (orderData.checkinRequiresApproval !== undefined) {
            setCheckinRequiresApproval((orderData as any).checkinRequiresApproval);
          }
          // Load resource booking mode fields
          if (orderData.resourceBookingMode) {
            setResourceBookingMode(orderData.resourceBookingMode);
          }
          if (orderData.requiredResourceCount) {
            setRequiredResourceCount(
              orderData.requiredResourceCount.toString()
            );
          }
          // Check if order belongs to a market
          if ((orderData as any).Markets && (orderData as any).Markets.length > 0) {
            const markets = (orderData as any).Markets.map((marketOrder: any) => ({
              id: marketOrder.Market?.id,
              name: marketOrder.Market?.name || "",
              nameEn: marketOrder.Market?.nameEn,
              nameRu: marketOrder.Market?.nameRu,
              nameHy: marketOrder.Market?.nameHy,
            })).filter((m: any) => m.id);
            setOrderMarkets(markets);
          }
          if (orderData.weeklySchedule) {
            console.log(
              "Loading weeklySchedule from order:",
              orderData.weeklySchedule
            );
            setWeeklySchedule(orderData.weeklySchedule);
          } else if (
            orderData.orderType === "permanent" &&
            orderData.workDurationPerClient
          ) {
            // Generate default weekly schedule for orders created before this feature
            console.log(
              "Generating default weeklySchedule for existing permanent order"
            );
            const defaultSchedule: WeeklySchedule = {
              monday: {
                enabled: true,
                workHours: { start: "09:00", end: "17:00" },
              },
              tuesday: {
                enabled: true,
                workHours: { start: "09:00", end: "17:00" },
              },
              wednesday: {
                enabled: true,
                workHours: { start: "09:00", end: "17:00" },
              },
              thursday: {
                enabled: true,
                workHours: { start: "09:00", end: "17:00" },
              },
              friday: {
                enabled: true,
                workHours: { start: "09:00", end: "17:00" },
              },
              saturday: { enabled: false },
              sunday: { enabled: false },
              subscribeAheadDays: 90,
            };

            // No need to generate slots - clients book custom time ranges
            setWeeklySchedule(defaultSchedule);
          } else {
            console.log("No weeklySchedule found in order data");
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
      selectedService?: Category | null;
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
      case "budget": {
        if (!value || value === "") {
          return t("pleaseEnterValidBudget");
        }
        const budgetStr = value.toString().trim();
        if (!budgetStr) {
          return t("pleaseEnterValidBudget");
        }
        if (isNaN(parseFloat(budgetStr))) {
          return t("budgetMustBeNumber");
        }
        const budgetNum = parseFloat(budgetStr);
        if (budgetNum <= 0) {
          return t("budgetMustBePositive");
        }
        const categoryMin = additionalData?.selectedService?.minPrice;
        const categoryMax = additionalData?.selectedService?.maxPrice;
        if (categoryMin != null && budgetNum < categoryMin) {
          return t("budgetBelowCategoryMin");
        }
        if (categoryMax != null && budgetNum > categoryMax) {
          return t("budgetAboveCategoryMax");
        }
        if (categoryMin == null && categoryMax == null) {
          if (budgetNum < 1) return t("budgetTooLow");
          if (budgetNum > 1000000) return t("budgetTooHigh");
        }
        return "";
      }
      case "location":
        // Location is required
        if (!value || (typeof value === "string" && !value.trim())) {
          return t("pleaseEnterLocation");
        }
        const locationStr = typeof value === "string" ? value.trim() : value.toString().trim();
        if (locationStr.length < 3) {
          return t("locationTooShort");
        }
        if (locationStr.length > 200) {
          return t("locationTooLong");
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

    // Real-time validation with additional data for date validation and category budget range
    const error = validateField(field, value, {
      selectedDates,
      selectedDateTimes,
      selectedService,
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
      { field: "location", ref: basicInfoSectionRef },
      { field: "budget", ref: priceSectionRef },
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
              (x, y) => {
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

  const handleOrderTypeChange = (newType: "one_time" | "permanent") => {
    // Show confirmation alert when switching order types
    if (orderType !== newType) {
      // Switching from permanent to one_time
      if (orderType === "permanent" && newType === "one_time") {
        Alert.alert(
          t("changeToOneTimeOrder"),
          t("changeToOneTimeOrderDesc"),
          [
            {
              text: t("cancel"),
              style: "cancel",
            },
            {
              text: t("change"),
              style: "destructive",
              onPress: () => {
                setOrderType(newType);
                // Clear permanent-specific fields
                setWorkDurationPerClient("");
                setWeeklySchedule({});
                setCheckinRequiresApproval(false);
              },
            },
          ],
          { cancelable: true }
        );
        return;
      }

      // Switching from one_time to permanent
      if (orderType === "one_time" && newType === "permanent") {
        // First check if user is a specialist
        if (!isSpecialist && user?.role !== "specialist") {
          setShowBecomeSpecialistModal(true);
          return;
        }

        Alert.alert(
          t("changeToBookableOrder"),
          t("changeToBookableOrderDesc"),
          [
            {
              text: t("cancel"),
              style: "cancel",
            },
            {
              text: t("change"),
              onPress: () => {
                setOrderType(newType);
              },
            },
          ],
          { cancelable: true }
        );
        return;
      }
    }

    setOrderType(newType);
  };

  const handleCategorySelect = (category: Category | null) => {
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

    // Suggest budget based on category prices (averagePrice, or min/midpoint when minPrice/maxPrice exist)
    const defaultBudget =
      category.averagePrice ??
      (category.minPrice != null && category.maxPrice != null
        ? Math.round((category.minPrice + category.maxPrice) / 2)
        : category.minPrice);
    if (defaultBudget != null) {
      setFormData((prev) => ({
        ...prev,
        budget: defaultBudget.toString(),
      }));
    }

    // Clear service error
    setErrors((prev) => ({ ...prev, categoryId: "" }));
  };

  const handleLocationChange = (location: {
    latitude: number;
    longitude: number;
    address: string;
    isoCountryCode?: string;
  }) => {
    setSelectedLocation(location);
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
        selectedService,
      }),
      description: validateField("description", formData.description, {
        selectedDates,
        selectedDateTimes,
        selectedService,
      }),
      budget: validateField("budget", formData.budget, {
        selectedDates,
        selectedDateTimes,
        selectedService,
      }),
      location: validateField(
        "location",
        selectedLocation
          ? `${selectedLocation.address} (${selectedLocation.latitude}, ${selectedLocation.longitude})`
          : formData.location,
        {
          selectedDates,
          selectedDateTimes,
          selectedService,
        }
      ),
      skills: validateField("skills", formData.skills, {
        selectedDates,
        selectedDateTimes,
        selectedService,
      }),
      availableDates: validateField("availableDates", formData.availableDates, {
        selectedDates,
        selectedDateTimes,
        selectedService,
      }),
      categoryId: validateField("categoryId", formData.categoryId || "", {
        selectedDates,
        selectedDateTimes,
        selectedService,
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
      location: (() => {
        const base =
          selectedLocation
            ? `${selectedLocation.address} (${selectedLocation.latitude}, ${selectedLocation.longitude})`
            : formData.location.trim();
        const iso = selectedLocation?.isoCountryCode;
        return iso ? `${base}${LOCATION_COUNTRY_SEPARATOR}${iso}` : base;
      })(),
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
          router.push("/profile/payment/refill-credits");
          return;
        }

        Alert.alert(t("error"), t("failedToGetAIPreview") || errorMessage);
        return;
      }
    }

    // If no AI enhancement, proceed with normal save
    await saveOrder(baseOrderData, false);
  };

  // Helper: Convert time string to minutes since midnight
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Helper: Check if two time ranges overlap
  const timeRangesOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    const start1Minutes = timeToMinutes(start1);
    const end1Minutes = timeToMinutes(end1);
    const start2Minutes = timeToMinutes(start2);
    const end2Minutes = timeToMinutes(end2);

    return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
  };

  // Helper: Get day name from date string (YYYY-MM-DD)
  const getDayNameFromDate = (dateString: string): string => {
    const date = new Date(dateString + "T00:00:00");
    const dayOfWeek = date.getDay();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    return dayNames[dayOfWeek];
  };

  // Check for break overlaps, disabled days, and work hours conflicts with existing bookings
  const checkBreakOverlaps = async (
    schedule: WeeklySchedule,
    orderId: number
  ): Promise<any[]> => {
    try {
      // Fetch existing bookings and current order
      const [bookings, currentOrder] = await Promise.all([
        apiService.getOrderBookings(orderId),
        apiService.getOrderById(orderId),
      ]);

      // Filter only confirmed/pending bookings
      const activeBookings = bookings.filter(
        (b: any) => b.status === "confirmed" || b.status === "pending"
      );

      // Get old schedule for comparison
      const oldSchedule = (currentOrder as any)?.weeklySchedule || {};

      const overlapping: any[] = [];

      // Iterate through each day in the schedule
      const dayKeys = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];

      for (const dayKey of dayKeys) {
        const daySchedule = (schedule as any)[dayKey] as any;
        const oldDaySchedule = (oldSchedule as any)[dayKey] as any;
        const wasEnabled = oldDaySchedule?.enabled;
        const isEnabled = daySchedule?.enabled;

        // Check bookings for this day of week
        for (const booking of activeBookings) {
          const bookingDayName = getDayNameFromDate(booking.scheduledDate);
          if (bookingDayName !== dayKey) continue;

          // Case 1: Day was enabled but now disabled - booking conflicts
          if (wasEnabled && !isEnabled) {
            overlapping.push(booking);
            continue;
          }

          // Case 2: Day is enabled - check work hours and breaks
          if (isEnabled && daySchedule?.workHours) {
            const workStart = timeToMinutes(daySchedule.workHours.start);
            const workEnd = timeToMinutes(daySchedule.workHours.end);
            const bookingStart = timeToMinutes(booking.startTime);
            const bookingEnd = timeToMinutes(booking.endTime);

            // Check if booking falls outside new work hours
            if (bookingStart < workStart || bookingEnd > workEnd) {
              overlapping.push(booking);
              continue;
            }

            // Case 3: Check break overlaps (existing logic)
            if (daySchedule?.breaks && daySchedule.breaks.length > 0) {
              for (const breakItem of daySchedule.breaks) {
                if (
                  timeRangesOverlap(
                    breakItem.start,
                    breakItem.end,
                    booking.startTime,
                    booking.endTime
                  )
                ) {
                  overlapping.push(booking);
                  break; // Found overlap, no need to check other breaks
                }
              }
            }
          }
        }
      }

      // Remove duplicates (same booking might overlap with multiple issues)
      const uniqueOverlapping = overlapping.filter(
        (booking, index, self) =>
          index === self.findIndex((b) => b.id === booking.id)
      );

      return uniqueOverlapping;
    } catch (error) {
      console.error("Error checking schedule conflicts:", error);
      return [];
    }
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
      const finalOrderData = {
        ...orderData,
        currency,
        rateUnit,
        orderType,
        workDurationPerClient:
          orderType === "permanent" && workDurationPerClient
            ? parseInt(workDurationPerClient)
            : undefined,
        weeklySchedule:
          orderType === "permanent" && Object.keys(weeklySchedule).length > 0
            ? weeklySchedule
            : undefined,
        checkinRequiresApproval:
          orderType === "permanent" ? checkinRequiresApproval : false,
        resourceBookingMode: resourceBookingMode || undefined,
        requiredResourceCount:
          resourceBookingMode === "multi" && requiredResourceCount
            ? parseInt(requiredResourceCount)
            : undefined,
      };
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
        // Check for break overlaps if schedule has breaks
        if (
          orderType === "permanent" &&
          finalOrderData.weeklySchedule &&
          Object.keys(finalOrderData.weeklySchedule).length > 0
        ) {
          const overlaps = await checkBreakOverlaps(
            finalOrderData.weeklySchedule,
            currentOrderId
          );

          if (overlaps.length > 0) {
            // Store the order data to save after user decides
            setPendingScheduleData(finalOrderData);
            setOverlappingBookings(overlaps);
            setShowBreakOverlapModal(true);
            setIsSubmitting(false);
            return;
          }
        }

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

        router.replace(`/orders/${orderId}?preview=true`);
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

          // Clear saved form data on success
          await clearSavedData();

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

          // Clear saved form data on success
          await clearSavedData();

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
      console.error("Error saving order:", error);

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
        router.push("/profile/payment/refill-credits");
        return;
      }

      Alert.alert(
        t("error"),
        errorMessage.includes("Insufficient credit balance") ||
        errorMessage.includes("insufficient credit")
          ? t("insufficientCredits") || "Insufficient credits"
          : errorMessage.includes("Failed to submit application")
          ? errorMessage
          : t("failedToSubmitApplication") + ": " + errorMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle break overlap modal actions
  const handleBreakOverlap = async () => {
        if (!pendingScheduleData) return;

        setShowBreakOverlapModal(false);
        setIsSubmitting(true);

        try {
          const currentOrderId = orderId ? parseInt(orderId as string) : null;
          if (!currentOrderId) return;

          // Separate new files (local URIs) from existing files (HTTP URLs)
          const newFiles = mediaFiles.filter(
            (file) =>
              file.uri.startsWith("file://") || file.uri.startsWith("content://")
          );

          // Upload new files with the actual orderId
          if (newFiles.length > 0) {
            await fileUploadService.uploadMultipleFiles(newFiles, currentOrderId);
          }

          // Save with breaks as-is (overlapping)
          await apiService.updateOrder(currentOrderId, pendingScheduleData);

          // Handle banner image update (same logic as in saveOrder)
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
            const updatedOrder = await apiService.getOrderById(currentOrderId);
            if (updatedOrder.MediaFiles && updatedOrder.MediaFiles.length > 0) {
              const bannerFile = mediaFiles[bannerIndexToUse];
              let targetMediaFile = null;

              if ((bannerFile as any).id) {
                targetMediaFile = updatedOrder.MediaFiles.find(
                  (mf: any) => mf.id === (bannerFile as any).id
                );
              } else {
                targetMediaFile = updatedOrder.MediaFiles.find(
                  (mf: any) =>
                    mf.fileType === "image" && mf.fileName === bannerFile.fileName
                );
              }

              if (targetMediaFile && targetMediaFile.fileType === "image") {
                try {
                  await apiService.setBannerImage(
                    currentOrderId,
                    targetMediaFile.id
                  );
                } catch (error) {
                  console.error("Error setting banner image:", error);
                }
              }
            }
          }

          await queryClient.invalidateQueries({ queryKey: ["orders"] });
          Alert.alert(t("success"), t("orderUpdatedSuccessfully") || "Order updated successfully");
          router.back();
        } catch (error: any) {
          console.error("Error saving order:", error);
          Alert.alert(t("error"), error?.message || t("failedToUpdateOrder") || "Failed to update order");
        } finally {
          setIsSubmitting(false);
          setPendingScheduleData(null);
          setOverlappingBookings([]);
        }
      };

      const handleMakePriority = async () => {
        if (!pendingScheduleData) return;

        setShowBreakOverlapModal(false);
        setIsSubmitting(true);

        try {
          const currentOrderId = orderId ? parseInt(orderId as string) : null;
          if (!currentOrderId) return;

          // Create modified schedule with breaks excluded on priority booking dates
          const modifiedSchedule = { ...pendingScheduleData.weeklySchedule };
          const breakExclusions: { [date: string]: Array<{ start: string; end: string }> } = {};

          // For each overlapping booking, mark break exclusions on that date
          for (const booking of overlappingBookings) {
            const bookingDayName = getDayNameFromDate(booking.scheduledDate);
            const daySchedule = (modifiedSchedule as any)[bookingDayName] as any;

            if (daySchedule?.breaks) {
              // Find breaks that overlap with this booking
              const overlappingBreaks = daySchedule.breaks.filter((breakItem: any) =>
                timeRangesOverlap(
                  breakItem.start,
                  breakItem.end,
                  booking.startTime,
                  booking.endTime
                )
              );

              if (overlappingBreaks.length > 0) {
                // Store exclusions for this date
                if (!breakExclusions[booking.scheduledDate]) {
                  breakExclusions[booking.scheduledDate] = [];
                }
                breakExclusions[booking.scheduledDate].push(...overlappingBreaks);

                // Remove overlapping breaks from the schedule for this day
                daySchedule.breaks = daySchedule.breaks.filter(
                  (breakItem: any) =>
                    !overlappingBreaks.some(
                      (ob: any) =>
                        ob.start === breakItem.start && ob.end === breakItem.end
                    )
                );
              }
            }
          }

          // Add breakExclusions to the schedule
          (modifiedSchedule as any).breakExclusions = breakExclusions;

          const finalOrderData = {
            ...pendingScheduleData,
            weeklySchedule: modifiedSchedule,
          };

          // Separate new files (local URIs) from existing files (HTTP URLs)
          const newFiles = mediaFiles.filter(
            (file) =>
              file.uri.startsWith("file://") || file.uri.startsWith("content://")
          );

          // Upload new files with the actual orderId
          if (newFiles.length > 0) {
            await fileUploadService.uploadMultipleFiles(newFiles, currentOrderId);
          }

          // Save with modified schedule (breaks excluded on priority dates)
          await apiService.updateOrder(currentOrderId, finalOrderData);

          // Handle banner image update (same logic as in saveOrder)
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
            const updatedOrder = await apiService.getOrderById(currentOrderId);
            if (updatedOrder.MediaFiles && updatedOrder.MediaFiles.length > 0) {
              const bannerFile = mediaFiles[bannerIndexToUse];
              let targetMediaFile = null;

              if ((bannerFile as any).id) {
                targetMediaFile = updatedOrder.MediaFiles.find(
                  (mf: any) => mf.id === (bannerFile as any).id
                );
              } else {
                targetMediaFile = updatedOrder.MediaFiles.find(
                  (mf: any) =>
                    mf.fileType === "image" && mf.fileName === bannerFile.fileName
                );
              }

              if (targetMediaFile && targetMediaFile.fileType === "image") {
                try {
                  await apiService.setBannerImage(
                    currentOrderId,
                    targetMediaFile.id
                  );
                } catch (error) {
                  console.error("Error setting banner image:", error);
                }
              }
            }
          }

          await queryClient.invalidateQueries({ queryKey: ["orders"] });
          Alert.alert(
            t("success"),
            t("orderUpdatedWithPriorityBreaks") ||
              "Order updated successfully. Breaks excluded on priority booking dates."
          );
          router.back();
        } catch (error: any) {
          console.error("Error saving order:", error);
          Alert.alert(t("error"), error?.message || t("failedToUpdateOrder") || "Failed to update order");
        } finally {
          setIsSubmitting(false);
          setPendingScheduleData(null);
          setOverlappingBookings([]);
        }
      };

      const handleCancelBreakOverlap = () => {
        setShowBreakOverlapModal(false);
        setPendingScheduleData(null);
        setOverlappingBookings([]);
        setIsSubmitting(false);
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
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  const [focusedSection, setFocusedSection] = useState<"skills" | "questions" | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    );
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (!isKeyboardVisible || !focusedSection) return;

    const sectionRef = focusedSection === "skills" ? skillsSectionRef : questionsSectionRef;
    if (!sectionRef.current || !scrollViewRef.current) return;

    setTimeout(() => {
      sectionRef.current?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
        },
        () => {}
      );
    }, Platform.OS === "ios" ? 300 : 150);
  }, [isKeyboardVisible, focusedSection]);

  return (
    <Layout header={header}>
      <ScrollView 
        ref={scrollViewRef} 
        style={{ flex: 1, marginBottom: 86 }}
        contentContainerStyle={{ 
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 50 : 0 
        }}
      >
        <ResponsiveContainer>
          {/* Order Type Selector - Compact Modern Design */}
          <ResponsiveCard>
            <View style={styles.orderTypeHeader}>
              <Text style={[styles.orderTypeTitle, { color: colors.text }]}>
                {t("orderType")}
              </Text>
            </View>

            {/* Compact Toggle Buttons */}
            <View style={styles.orderTypeToggleContainer}>
              <Button
                variant={orderType === "one_time" ? "primary" : "outline"}
                onPress={() => !orderId && handleOrderTypeChange("one_time")}
                disabled={!!orderId}
                icon="checkmark.circle.fill"
                iconSize={16}
                iconPosition="left"
                title={t("oneTimeOrder")}
                style={{ flex: 1 }}
              />
              <Button
                variant={orderType === "permanent" ? "primary" : "outline"}
                onPress={() => !orderId && handleOrderTypeChange("permanent")}
                disabled={!!orderId}
                icon="repeat.circle.fill"
                iconSize={16}
                iconPosition="left"
                title={t("permanentOrder")}
                style={{ flex: 1 }}
              />
            </View>

            {/* Subtle description */}
            <Text
              style={[
                styles.orderTypeDescription,
                { color: colors.tabIconDefault },
              ]}
            >
              {orderType === "one_time"
                ? t("oneTimeOrderDesc")
                : t("permanentOrderDesc")}
            </Text>
            {orderId && (
              <Text
                style={[
                  styles.orderTypeDescription,
                  { color: colors.tabIconDefault, fontStyle: "italic" },
                ]}
              >
                {t("orderTypeCannotBeChanged")}
              </Text>
            )}

            {/* Work Duration Input (only for permanent orders) */}
            {orderType === "permanent" && (
              <View style={styles.workDurationContainer}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  {t("workDurationPerClient")}
                </Text>
                <View style={styles.durationInputWrapper}>
                  <TextInput
                    style={[
                      styles.durationInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={workDurationPerClient}
                    onChangeText={setWorkDurationPerClient}
                    placeholder="60"
                    placeholderTextColor={colors.tabIconDefault}
                    keyboardType="numeric"
                  />
                  <Text
                    style={[
                      styles.durationUnit,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t("minutesPerSession")}
                  </Text>
                </View>
              </View>
            )}

            {/* Check-in Approval Toggle (only for permanent orders) */}
            {orderType === "permanent" && (
              <View style={styles.approvalContainer}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() =>
                    setCheckinRequiresApproval(!checkinRequiresApproval)
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: checkinRequiresApproval
                          ? colors.primary
                          : "transparent",
                        borderColor: checkinRequiresApproval
                          ? colors.primary
                          : colors.borderTertiary,
                      },
                    ]}
                  >
                    {checkinRequiresApproval && (
                      <IconSymbol name="checkmark" size={14} color={colors.textInverse} />
                    )}
                  </View>
                  <View style={styles.checkboxLabelContainer}>
                    <Text
                      style={[styles.checkboxLabel, { color: colors.text }]}
                    >
                      {t("requireApprovalForCheckins")}
                    </Text>
                    <Text
                      style={[
                        styles.checkboxDescription,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {t("requireApprovalForCheckinsDesc")}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </ResponsiveCard>

          {/* Market Information and Resource Booking Mode */}
          {orderMarkets.length > 0 && (
            <ResponsiveCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("marketInformation") || "Market Information"}
              </Text>
              
              {/* Market Reference */}
              <View style={styles.marketReferenceContainer}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  {t("belongsToMarket") || "Belongs to Market"}
                </Text>
                {orderMarkets.map((market) => (
                  <TouchableOpacity
                    key={market.id}
                    onPress={() => router.push(`/services/${market.id}`)}
                    style={styles.marketLink}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.marketLinkText,
                        { color: colors.primary },
                      ]}
                    >
                      {getLocalizedMarketName(market)}
                    </Text>
                    <IconSymbol
                      name="chevron.right"
                      size={16}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Resource Booking Mode (only for permanent orders) */}
              {orderType === "permanent" && (
                <View style={styles.resourceModeContainer}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    {t("resourceBookingMode")}
                  </Text>

                  <View style={styles.resourceModeOptions}>
                    <TouchableOpacity
                      style={[
                        styles.resourceModeOption,
                        {
                          backgroundColor:
                            resourceBookingMode === "select"
                              ? colors.primary + "08"
                              : "transparent",
                          borderLeftWidth: resourceBookingMode === "select" ? 2 : 0,
                          borderLeftColor: colors.primary,
                        },
                      ]}
                      onPress={() => setResourceBookingMode("select")}
                      activeOpacity={0.6}
                    >
                      <View style={styles.resourceModeOptionContent}>
                        <View
                          style={[
                            styles.radioButton,
                            {
                              borderColor:
                                resourceBookingMode === "select"
                                  ? colors.primary
                                  : colors.border + "50",
                              backgroundColor:
                                resourceBookingMode === "select"
                                  ? colors.primary
                                  : "transparent",
                            },
                          ]}
                        >
                          {resourceBookingMode === "select" && (
                            <View
                              style={[
                                styles.radioButtonDot,
                                { backgroundColor: colors.textInverse },
                              ]}
                            />
                          )}
                        </View>
                        <View style={styles.resourceModeOptionText}>
                          <Text
                            style={[
                              styles.resourceModeOptionTitle,
                              { color: colors.text },
                            ]}
                          >
                            {t("clientSelectsSpecialist")}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.resourceModeOption,
                        {
                          backgroundColor:
                            resourceBookingMode === "auto"
                              ? colors.primary + "08"
                              : "transparent",
                          borderLeftWidth: resourceBookingMode === "auto" ? 2 : 0,
                          borderLeftColor: colors.primary,
                        },
                      ]}
                      onPress={() => setResourceBookingMode("auto")}
                      activeOpacity={0.6}
                    >
                      <View style={styles.resourceModeOptionContent}>
                        <View
                          style={[
                            styles.radioButton,
                            {
                              borderColor:
                                resourceBookingMode === "auto"
                                  ? colors.primary
                                  : colors.border + "50",
                              backgroundColor:
                                resourceBookingMode === "auto"
                                  ? colors.primary
                                  : "transparent",
                            },
                          ]}
                        >
                          {resourceBookingMode === "auto" && (
                            <View
                              style={[
                                styles.radioButtonDot,
                                { backgroundColor: colors.textInverse },
                              ]}
                            />
                          )}
                        </View>
                        <View style={styles.resourceModeOptionText}>
                          <Text
                            style={[
                              styles.resourceModeOptionTitle,
                              { color: colors.text },
                            ]}
                          >
                            {t("systemAssignsAutomatically")}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.resourceModeOption,
                        {
                          backgroundColor:
                            resourceBookingMode === "multi"
                              ? colors.primary + "08"
                              : "transparent",
                          borderLeftWidth: resourceBookingMode === "multi" ? 2 : 0,
                          borderLeftColor: colors.primary,
                        },
                      ]}
                      onPress={() => setResourceBookingMode("multi")}
                      activeOpacity={0.6}
                    >
                      <View style={styles.resourceModeOptionContent}>
                        <View
                          style={[
                            styles.radioButton,
                            {
                              borderColor:
                                resourceBookingMode === "multi"
                                  ? colors.primary
                                  : colors.border + "50",
                              backgroundColor:
                                resourceBookingMode === "multi"
                                  ? colors.primary
                                  : "transparent",
                            },
                          ]}
                        >
                          {resourceBookingMode === "multi" && (
                            <View
                              style={[
                                styles.radioButtonDot,
                                { backgroundColor: colors.textInverse },
                              ]}
                            />
                          )}
                        </View>
                        <View style={styles.resourceModeOptionText}>
                          <Text
                            style={[
                              styles.resourceModeOptionTitle,
                              { color: colors.text },
                            ]}
                          >
                            {t("requiresMultipleSpecialists")}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                  </View>

                  {/* Multi-specialist configuration */}
                  {resourceBookingMode === "multi" && (
                    <View style={styles.multiSpecialistConfig}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>
                        {t("requiredSpecialistsCount")}
                      </Text>
                      <TextInput
                        style={[
                          styles.durationInput,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border + "40",
                            color: colors.text,
                          },
                        ]}
                        value={requiredResourceCount}
                        onChangeText={setRequiredResourceCount}
                        placeholder="2"
                        placeholderTextColor={colors.tabIconDefault}
                        keyboardType="numeric"
                      />
                    </View>
                  )}
                </View>
              )}
            </ResponsiveCard>
          )}

          {/* Weekly Schedule (only for permanent orders) */}
          {orderType === "permanent" &&
            workDurationPerClient &&
            parseInt(workDurationPerClient) > 0 && (
              <ResponsiveCard>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("setWeeklySchedule")}
                </Text>
                <Text
                  style={[styles.sectionDesc, { color: colors.tabIconDefault }]}
                >
                  {t("setWeeklyScheduleDesc")}
                </Text>
                <WeeklySchedulePicker
                  value={weeklySchedule}
                  onChange={setWeeklySchedule}
                  workDurationPerClient={parseInt(workDurationPerClient)}
                  disabled={isSubmitting}
                />
              </ResponsiveCard>
            )}

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
              <CategorySelector
                selectedService={selectedService}
                onServiceSelect={handleCategorySelect}
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
                <>
                  <Text style={[styles.priceHint, { color: colors.tint }]}>
                    {t("budgetSuggestionNote")} {t("youCanChangeThis")}
                  </Text>
                  {selectedService.minPrice != null &&
                    selectedService.maxPrice != null && (
                      <Text
                        style={[
                          styles.priceHint,
                          { color: colors.textSecondary, marginTop: 2 },
                        ]}
                      >
                        {t("budgetRange")}: {selectedService.minPrice} –{" "}
                        {selectedService.maxPrice}
                      </Text>
                    )}
                </>
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
                        borderColor: errors.budget ? colors.error : colors.border,
                        borderTopColor: errors.budget
                          ? colors.error
                          : colors.border,
                        borderBottomColor: errors.budget
                          ? colors.error
                          : colors.border,
                        borderLeftColor: errors.budget
                          ? colors.error
                          : colors.border,
                        borderRightColor: colors.border, // Keep inner border normal
                        color: colors.text,
                      },
                    ]}
                    value={formData.budget}
                    onChangeText={(value) => updateField("budget", value)}
                    placeholder={
                      selectedService
                        ? selectedService.minPrice != null &&
                          selectedService.maxPrice != null
                          ? `${selectedService.minPrice} – ${selectedService.maxPrice}`
                          : `${selectedService.averagePrice ?? selectedService.minPrice ?? 0}`
                        : t("budgetPlaceholder")
                    }
                    placeholderTextColor={colors.tabIconDefault}
                    keyboardType="numeric"
                    editable={!isConvertingCurrency}
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
                        borderColor: errors.budget ? colors.error : colors.border,
                        borderTopColor: errors.budget
                          ? colors.error
                          : colors.border,
                        borderBottomColor: errors.budget
                          ? colors.error
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
                        borderColor: errors.budget ? colors.error : colors.border,
                        borderTopColor: errors.budget
                          ? colors.error
                          : colors.border,
                        borderBottomColor: errors.budget
                          ? colors.error
                          : colors.border,
                        borderRightColor: errors.budget
                          ? colors.error
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
                <Text style={{ color: colors.error, marginBottom: 10 }}>
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
              skillIds={skillIds}
              newSkillNames={newSkillNames}
              onInputFocus={() => setFocusedSection("skills")}
              onInputBlur={() => setFocusedSection(null)}
            />
          </View>

          {/* Questions Section */}
          {orderType === "one_time" && (
          <ResponsiveCard style={{ position: "relative" }}>
            <View ref={questionsSectionRef}>
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
                  onFocus={() => setFocusedSection("questions")}
                  onBlur={() => setFocusedSection(null)}
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
                  <IconSymbol name="trash" size={18} color={colors.errorVariant} />
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
                  right: 11,
                  top: 3,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  opacity: canAddAnotherQuestion() ? 1 : 0.5,
                },
              ]}
            >
              <IconSymbol name="plus.circle" size={20} color={colors.tint} />
            </TouchableOpacity>
          </ResponsiveCard>
          )}

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
                    <IconSymbol name="checkmark" size={14} color={colors.textInverse} />
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
            {/* Action Buttons */}
            <ActionButtons
              deleteButton={
                orderId
                  ? {
                      title: t("delete"),
                      onPress: handleDeleteOrder,
                      textColor: colors.errorVariant,
                    }
                  : undefined
              }
              previewButton={
                orderId
                  ? {
                      title: t("preview"),
                      onPress: () => {
                        router.push(`/orders/${orderId}?preview=true`);
                      },
                    }
                  : undefined
              }
              saveButton={{
                title: orderId ? t("save") : t("apply"),
                onPress: handleApply,
                disabled: isSubmitting,
                loading: isSubmitting,
              }}
              showBorderTop={true}
              singleButtonContainer={!orderId}
              wrapInCard={false}
            />
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

      {/* Become Specialist Modal */}
      <BecomeSpecialistModal
        visible={showBecomeSpecialistModal}
        onClose={() => setShowBecomeSpecialistModal(false)}
      />

      <BreakOverlapModal
        visible={showBreakOverlapModal}
        overlappingBookings={overlappingBookings}
        onOverlap={handleBreakOverlap}
        onMakePriority={handleMakePriority}
        onCancel={handleCancelBreakOverlap}
      />

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
                        style={[styles.addCustomButtonText, { color: colors.textInverse }]}
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
    // Note: borderColor should be set inline: { borderColor: colors.errorVariant }
    gap: 6,
    flex: 1,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    // Note: color should be set inline: { color: colors.errorVariant }
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
  sectionDesc: {
    fontSize: 14,
    marginBottom: 12,
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
  // Modern compact order type styles
  orderTypeHeader: {
    marginBottom: 12,
  },
  orderTypeTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  orderTypeToggleContainer: {
    flexDirection: "row",
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  orderTypeToggle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  orderTypeToggleText: {
    fontSize: 14,
  },
  orderTypeDescription: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.6,
    marginBottom: 4,
  },
  workDurationContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  durationInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  durationInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "600",
  },
  durationUnit: {
    fontSize: 13,
    fontWeight: "500",
  },
  approvalContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  checkboxDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  checkboxLabelContainer: {
    flex: 1,
  },
  resourceModeContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  fieldDescription: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
    opacity: 0.7,
  },
  resourceModeOptions: {
    gap: 6,
    marginTop: 8,
  },
  resourceModeOption: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    paddingLeft: 8,
  },
  resourceModeOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  radioButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioButtonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resourceModeOptionText: {
    flex: 1,
  },
  resourceModeOptionTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  resourceModeOptionDesc: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.65,
  },
  multiSpecialistConfig: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  marketReferenceContainer: {
    marginBottom: 16,
  },
  marketLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.02)",
    marginTop: 8,
  },
  marketLinkText: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
});
