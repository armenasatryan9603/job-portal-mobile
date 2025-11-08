import { Footer, FooterButton } from "@/components/Footer";
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
import { ThemeColors } from "@/constants/styles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { apiService, Service } from "@/services/api";
import { fileUploadService, MediaFile } from "@/services/fileUpload";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";

export default function CreateOrderScreen() {
  const { serviceId } = useLocalSearchParams();
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { isAuthenticated, user } = useAuth();
  const { showLoginModal } = useModal();

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

  // Format dates with times for form submission in JSON string format
  const formatAllDatesWithTimes = () => {
    const dateTimeObjects = selectedDates.map((date) => {
      const key = date.toDateString();
      const times = selectedDateTimes[key] || [];
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return {
        date: dateStr,
        times: times,
      };
    });

    // Convert to JSON string format that can be parsed back
    return dateTimeObjects.map((obj) => JSON.stringify(obj));
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

  // Handle serviceId from URL params
  useEffect(() => {
    if (serviceId) {
      const serviceIdNum = parseInt(serviceId as string);
      setFormData((prev) => ({ ...prev, serviceId: serviceIdNum }));
    }
  }, [serviceId]);

  const validateField = (field: string, value: string | number) => {
    switch (field) {
      case "title":
        if (!value || (typeof value === "string" && !value.trim())) {
          return t("pleaseEnterTitle");
        }
        return "";
      case "description":
        if (!value || (typeof value === "string" && !value.trim())) {
          return t("pleaseEnterDescription");
        }
        return "";
      case "budget":
        if (!value || parseFloat(value.toString()) <= 0) {
          return t("pleaseEnterValidBudget");
        }
        return "";
      case "location":
        // Location is optional, no validation needed
        return "";
      case "skills":
        // Skills are optional, no validation needed
        return "";
      case "availableDates":
        // Available dates are optional, no validation needed
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

    // Real-time validation
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleServiceSelect = (service: Service) => {
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
      title: validateField("title", formData.title),
      description: validateField("description", formData.description),
      budget: validateField("budget", formData.budget),
      location: validateField("location", formData.location),
      skills: validateField("skills", formData.skills),
      availableDates: validateField("availableDates", formData.availableDates),
      serviceId: validateField("serviceId", formData.serviceId || ""),
    };

    setErrors(validationErrors);

    // Check if there are any validation errors
    const hasErrors = Object.values(validationErrors).some(
      (error) => error !== ""
    );
    if (hasErrors) {
      Alert.alert(t("error"), t("pleaseFixValidationErrors"));
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
      };

      // Call the API to create the order
      await apiService.createOrder(orderData);

      // Order posted successfully
      router.replace("/orders");
    } catch (error) {
      console.error("Error posting order:", error);
      Alert.alert(t("error"), t("failedToCreateOrder"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
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
      title: validateField("title", formData.title),
      description: validateField("description", formData.description),
      budget: validateField("budget", formData.budget),
      location: validateField("location", formData.location),
      skills: validateField("skills", formData.skills),
      availableDates: validateField("availableDates", formData.availableDates),
      serviceId: validateField("serviceId", formData.serviceId || ""),
    };

    setErrors(validationErrors);

    // Check if there are any validation errors
    const hasErrors = Object.values(validationErrors).some(
      (error) => error !== ""
    );
    if (hasErrors) {
      Alert.alert(t("error"), t("pleaseFixValidationErrors"));
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
      };

      // Use transactional order creation with media files
      if (mediaFiles.length > 0) {
        const { order } = await fileUploadService.createOrderWithMedia(
          orderData,
          mediaFiles
        );

        // Application submitted successfully
        router.replace("/orders");
      } else {
        // No media files, use regular order creation
        await apiService.createOrder(orderData);

        // Application submitted successfully
        router.replace("/orders");
      }
    } catch (error: any) {
      console.error("Error creating order:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : "Unknown error";

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

  // console.log("mediaFilesssssssss", JSON.stringify(mediaFiles, null, 2));

  const footer = (
    <Footer>
      <View style={styles.footerButtons}>
        <FooterButton
          title={t("postOrder")}
          onPress={handleSubmit}
          variant="primary"
          disabled={isSubmitting}
        />
        <FooterButton
          title={t("cancel")}
          onPress={handleCancel}
          variant="secondary"
        />
      </View>
    </Footer>
  );

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
      <ScrollView style={{ flex: 1, marginBottom: 100 }}>
        <ResponsiveContainer>
          {/* Service Selection */}
          <ResponsiveCard>
            <ServiceSelector
              selectedService={selectedService}
              onServiceSelect={handleServiceSelect}
              error={errors.serviceId}
            />
          </ResponsiveCard>

          {/* Basic Information */}
          <ResponsiveCard>
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
          </ResponsiveCard>

          {/* Skills and Requirements */}
          <ResponsiveCard>
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
          </ResponsiveCard>

          {/* Media Upload */}
          <ResponsiveCard>
            <MediaUploader onMediaChange={setMediaFiles} maxFiles={10} />
          </ResponsiveCard>

          {/* Action Buttons */}
          <ResponsiveCard>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  {
                    backgroundColor: colors.tint,
                    opacity: isSubmitting ? 0.6 : 1,
                  },
                ]}
                onPress={handleApply}
                disabled={isSubmitting}
              >
                <Text
                  style={[styles.applyButtonText, { color: colors.background }]}
                >
                  {t("apply")}
                </Text>
              </TouchableOpacity>
            </View>
          </ResponsiveCard>
        </ResponsiveContainer>
      </ScrollView>
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
    alignItems: "center",
    marginTop: 10,
  },
  applyButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
