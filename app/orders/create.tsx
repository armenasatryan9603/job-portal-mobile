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
import { ThemeColors } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
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
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Button } from "@/components/ui/button";
import { apiService, Service } from "@/services/api";
import { fileUploadService, MediaFile } from "@/services/fileUpload";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { useQueryClient } from "@tanstack/react-query";

export default function CreateOrderScreen() {
  const { serviceId, orderId } = useLocalSearchParams();
  const { t } = useTranslation();
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
    serviceId: serviceId ? parseInt(serviceId as string) : null,
  });

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
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

  // Refs for scrolling to error fields
  const scrollViewRef = useRef<ScrollView>(null);
  const serviceSectionRef = useRef<View>(null);
  const basicInfoSectionRef = useRef<View>(null);
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
    serviceId: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle serviceId and orderId from URL params
  useEffect(() => {
    if (serviceId) {
      const serviceIdNum = parseInt(serviceId as string);
      setFormData((prev) => ({ ...prev, serviceId: serviceIdNum }));
      // Set AI enhancement to true for new orders (checked by default)
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
            serviceId: orderData.serviceId || null,
          });

          // Set selected service if available
          if (orderData.Service) {
            setSelectedService(orderData.Service);
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
        } catch (error) {
          console.error("Error loading order for edit:", error);
          Alert.alert(t("error"), t("failedToLoadOrder"));
        }
      };

      loadOrderForEdit();
    }
  }, [serviceId, orderId]);

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
          return t("titleTooShort") || "Title must be at least 3 characters";
        }
        if (titleStr.length > 100) {
          return t("titleTooLong") || "Title must be less than 100 characters";
        }
        return "";
      case "description":
        if (!value || (typeof value === "string" && !value.trim())) {
          return t("pleaseEnterDescription");
        }
        const descStr =
          typeof value === "string" ? value.trim() : value.toString();
        if (descStr.length < 10) {
          return (
            t("descriptionTooShort") ||
            "Description must be at least 10 characters"
          );
        }
        if (descStr.length > 2000) {
          return (
            t("descriptionTooLong") ||
            "Description must be less than 2000 characters"
          );
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
          return t("budgetMustBeNumber") || "Budget must be a valid number";
        }
        const budgetNum = parseFloat(budgetStr);
        if (budgetNum <= 0) {
          return t("budgetMustBePositive") || "Budget must be greater than 0";
        }
        if (budgetNum < 1) {
          return t("budgetTooLow") || "Budget must be at least $1";
        }
        if (budgetNum > 1000000) {
          return t("budgetTooHigh") || "Budget must be less than $1,000,000";
        }
        return "";
      case "location":
        // Location is optional, but if provided, validate format
        if (value && typeof value === "string" && value.trim()) {
          const locationStr = value.trim();
          if (locationStr.length < 3) {
            return (
              t("locationTooShort") || "Location must be at least 3 characters"
            );
          }
          if (locationStr.length > 200) {
            return (
              t("locationTooLong") ||
              "Location must be less than 200 characters"
            );
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
            return t("tooManySkills") || "Maximum 20 skills allowed";
          }
          // Check if any skill is too long
          const longSkill = skillsArray.find((skill) => skill.length > 50);
          if (longSkill) {
            return (
              t("skillTooLong") || "Each skill must be less than 50 characters"
            );
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
      { field: "budget", ref: basicInfoSectionRef },
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

  const handleServiceSelect = (service: Service | null) => {
    // Prevent service changes when order is in_progress
    if (orderStatus === "in_progress") {
      return;
    }

    if (!service) {
      setSelectedService(null);
      setFormData((prev) => ({ ...prev, serviceId: null }));
      setErrors((prev) => ({ ...prev, serviceId: "" }));
      return;
    }

    setSelectedService(service);
    setFormData((prev) => ({ ...prev, serviceId: service.id }));

    // Suggest budget based on service prices
    if (service.averagePrice) {
      setFormData((prev) => ({
        ...prev,
        budget: service.averagePrice!.toString(),
      }));
    }

    // Clear service error
    setErrors((prev) => ({ ...prev, serviceId: "" }));
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
      serviceId: validateField("serviceId", formData.serviceId || "", {
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
      const orderData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        budget: parseFloat(formData.budget),
        serviceId: formData.serviceId!,
        location: selectedLocation
          ? `${selectedLocation.address} (${selectedLocation.latitude}, ${selectedLocation.longitude})`
          : formData.location.trim() || undefined,
        skills: formData.skills.trim()
          ? formData.skills
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s)
          : undefined,
        availableDates:
          formatAllDatesWithTimes().length > 0
            ? formatAllDatesWithTimes()
            : undefined,
        useAIEnhancement: useAIEnhancement, // For both new and existing orders
      };

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

    Alert.alert(
      t("deleteOrder") || "Delete Order",
      t("areYouSureDeleteOrder") ||
        "Are you sure you want to delete this order? This action cannot be undone.",
      [
        {
          text: t("cancel") || "Cancel",
          style: "cancel",
        },
        {
          text: t("delete") || "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await apiService.deleteOrder(parseInt(orderId as string));
              Alert.alert(
                t("success") || "Success",
                t("orderDeletedSuccessfully") || "Order deleted successfully",
                [
                  {
                    text: t("ok") || "OK",
                    onPress: () => {
                      router.replace("/orders");
                    },
                  },
                ]
              );
            } catch (error: any) {
              console.error("Error deleting order:", error);
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : typeof error === "string"
                  ? error
                  : t("unknownError");
              Alert.alert(
                t("error") || "Error",
                t("failedToDeleteOrder") ||
                  "Failed to delete order: " + errorMessage
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleApply = async () => {
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      Alert.alert(
        t("error") || "Error",
        t("authenticationRequired") || "Please log in to create an order.",
        [
          {
            text: t("ok") || "OK",
            onPress: () => {
              showLoginModal();
            },
          },
        ]
      );
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
      serviceId: validateField("serviceId", formData.serviceId || "", {
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
    const baseOrderData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      budget: parseFloat(formData.budget),
      serviceId: formData.serviceId!,
      location: selectedLocation
        ? `${selectedLocation.address} (${selectedLocation.latitude}, ${selectedLocation.longitude})`
        : formData.location.trim() || undefined,
      skills: formData.skills.trim()
        ? formData.skills
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s)
        : undefined,
      availableDates:
        formatAllDatesWithTimes().length > 0
          ? formatAllDatesWithTimes()
          : undefined,
    };

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

        Alert.alert(
          t("error") || "Error",
          t("failedToGetAIPreview") ||
            "Failed to get AI preview: " + errorMessage
        );
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
      const finalOrderData = { ...orderData };
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
                console.log(
                  "Banner image set successfully:",
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

        // Application submitted successfully
        router.replace("/orders");
      } else {
        // Creating a new order
        // Use transactional order creation with media files
        if (mediaFiles.length > 0) {
          const { order } = await fileUploadService.createOrderWithMedia(
            finalOrderData,
            mediaFiles
          );

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

          // Invalidate orders queries to refresh the list
          await queryClient.invalidateQueries({ queryKey: ["orders"] });

          // Application submitted successfully
          router.replace("/orders");
        } else {
          // No media files, use regular order creation
          await apiService.createOrder(finalOrderData);

          // Invalidate orders queries to refresh the list
          await queryClient.invalidateQueries({ queryKey: ["orders"] });

          // Application submitted successfully
          router.replace("/orders");
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
        Alert.alert(
          t("error") || "Error",
          t("authenticationRequired") || "Please log in again to continue.",
          [
            {
              text: t("ok") || "OK",
              onPress: () => {
                // Optionally redirect to login
                router.replace("/");
              },
            },
          ]
        );
      } else {
        Alert.alert(
          t("error") || "Error",
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

      Alert.alert(
        t("error") || "Error",
        t("failedToGetAIPreview") || "Failed to get AI preview: " + errorMessage
      );
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
          {/* Service Selection */}
          <ResponsiveCard>
            <View ref={serviceSectionRef}>
              <ServiceSelector
                selectedService={selectedService}
                onServiceSelect={handleServiceSelect}
                error={errors.serviceId}
                disabled={orderStatus === "in_progress"}
              />
            </View>
          </ResponsiveCard>

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
                selectedService={selectedService}
                onFieldChange={updateField}
                onLocationChange={handleLocationChange}
              />
            </View>
          </ResponsiveCard>

          {/* Skills and Requirements */}
          <ResponsiveCard>
            <View ref={skillsSectionRef}>
              <SkillsAndRequirementsForm
                formData={{
                  skills: formData.skills,
                  availableDates: formData.availableDates,
                }}
                errors={{
                  skills: errors.skills,
                  availableDates: errors.availableDates,
                }}
                selectedDates={selectedDates}
                selectedDateTimes={selectedDateTimes}
                onFieldChange={updateField}
                onDatesChange={setSelectedDates}
                onDateTimesChange={setSelectedDateTimes}
              />
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
                        : colors.border,
                    },
                  ]}
                >
                  {useAIEnhancement && (
                    <IconSymbol name="checkmark" size={14} color="white" />
                  )}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                  {t("improveWithAI") || "Improve with AI"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    t("aiEnhancement") || "AI Enhancement",
                    t("aiEnhancementDescription") ||
                      "AI will detect the language of your text, fix transliteration issues (e.g., Armenian written with Latin characters), translate to all three languages (English, Russian, Armenian), and improve grammar and clarity. This service costs 2 credits.",
                    [{ text: t("ok") || "OK" }]
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
                <Button
                  variant="outline"
                  icon="trash"
                  iconSize={16}
                  iconPosition="left"
                  title={t("delete")}
                  textColor="#FF3B30"
                  onPress={handleDeleteOrder}
                />
              )}
              <Button
                onPress={handleApply}
                title={orderId ? t("save") || "Save" : t("apply") || "Apply"}
                variant="primary"
                disabled={isSubmitting}
                loading={isSubmitting}
                textColor={colors.background}
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
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "90%",
    height: "90%",
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
    flex: 1,
  },
  infoButton: {
    padding: 4,
    marginLeft: 8,
  },
});
