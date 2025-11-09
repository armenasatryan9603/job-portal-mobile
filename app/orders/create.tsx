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
  Image,
  Modal,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { apiService, Service } from "@/services/api";
import { fileUploadService, MediaFile } from "@/services/fileUpload";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";

export default function CreateOrderScreen() {
  const { serviceId, orderId } = useLocalSearchParams();
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedBannerIndex, setSelectedBannerIndex] = useState<number | null>(
    null
  );
  const [existingBannerId, setExistingBannerId] = useState<number | null>(null);

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

  // Handle serviceId and orderId from URL params
  useEffect(() => {
    if (serviceId) {
      const serviceIdNum = parseInt(serviceId as string);
      setFormData((prev) => ({ ...prev, serviceId: serviceIdNum }));
    }

    // If orderId is provided, load existing order for editing
    if (orderId) {
      const loadOrderForEdit = async () => {
        try {
          const orderData = await apiService.getOrderById(
            parseInt(orderId as string)
          );

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
            const dates = orderData.availableDates.map(
              (dateStr) => new Date(dateStr)
            );
            setSelectedDates(dates);
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

      // If orderId exists, update the order; otherwise create a new one
      if (orderId) {
        // Update existing order
        await apiService.updateOrder(parseInt(orderId as string), orderData);
      } else {
        // Create new order
        await apiService.createOrder(orderData);
      }

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

      const currentOrderId = orderId ? parseInt(orderId as string) : null;

      // If editing an existing order
      if (currentOrderId) {
        // Separate new files (local URIs) from existing files (HTTP URLs)
        const newFiles = mediaFiles.filter(
          (file) =>
            file.uri.startsWith("file://") || file.uri.startsWith("content://")
        );
        const existingFiles = mediaFiles.filter(
          (file) =>
            file.uri.startsWith("http://") || file.uri.startsWith("https://")
        );

        // Upload new files with the actual orderId
        if (newFiles.length > 0) {
          await fileUploadService.uploadMultipleFiles(newFiles, currentOrderId);
        }

        // Update the order
        await apiService.updateOrder(currentOrderId, orderData);

        // Handle banner image update
        if (selectedBannerIndex !== null) {
          // Reload the order to get all media files with their IDs
          const updatedOrder = await apiService.getOrderById(currentOrderId);

          if (updatedOrder.MediaFiles && updatedOrder.MediaFiles.length > 0) {
            // Find the media file at the selected index
            const bannerFile = mediaFiles[selectedBannerIndex];

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
                selectedIndex: selectedBannerIndex,
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

        // Application submitted successfully
        router.replace("/orders");
      } else {
        // Creating a new order
        // Use transactional order creation with media files
        if (mediaFiles.length > 0) {
          const { order } = await fileUploadService.createOrderWithMedia(
            orderData,
            mediaFiles
          );

          // Set banner image if selected
          if (selectedBannerIndex !== null && order.id) {
            // Reload order to get media file IDs
            const updatedOrder = await apiService.getOrderById(order.id);
            if (
              updatedOrder.MediaFiles &&
              selectedBannerIndex < updatedOrder.MediaFiles.length
            ) {
              const bannerFile = updatedOrder.MediaFiles[selectedBannerIndex];
              await apiService.setBannerImage(order.id, bannerFile.id);
            }
          }

          // Application submitted successfully
          router.replace("/orders");
        } else {
          // No media files, use regular order creation
          await apiService.createOrder(orderData);

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
                {t("tapImageToSetAsBanner") ||
                  "Tap an image to set it as the banner"}
              </Text>
            )}
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
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mediaGridItemContainer: {
    width: "30%",
    position: "relative",
  },
  mediaGridItem: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  mediaGridImage: {
    width: "100%",
    height: "100%",
  },
  mediaGridPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  deleteMediaButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "white",
    borderRadius: 12,
    zIndex: 10,
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
    textAlign: "center",
    opacity: 0.7,
  },
});
