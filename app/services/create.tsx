import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MediaFile, fileUploadService } from "@/categories/fileUpload";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import { AddMarketMemberModal } from "@/components/AddMemberModal";
import { AttachOrderModal } from "@/components/AttachOrderModal";
import { BasicInformationForm } from "@/components/BasicInformationForm";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Layout } from "@/components/Layout";
import { MediaUploader } from "@/components/MediaUploader";
import { Order } from "@/categories/api";
import { ServiceCreateSkeleton } from "@/components/ServiceCreateSkeleton";
import { TeamMemberItem } from "@/components/TeamMemberItem";
import { apiService } from "@/categories/api";
import { parseLocationCoordinates } from "@/utils/locationParsing";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useSpecialistSearch } from "@/hooks/useSpecialistSearch";
import { useTranslation } from "@/hooks/useTranslation";

export default function CreateMarketScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const isEditMode = !!id;
  const marketId = id ? parseInt(id as string, 10) : null;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
  });

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);


  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedBannerIndex, setSelectedBannerIndex] = useState<number | null>(
    null
  );
  const [existingBannerId, setExistingBannerId] = useState<number | null>(null);
  const [marketStatus, setMarketStatus] = useState<string | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});
  const [marketMembers, setMarketMembers] = useState<Array<{
    id: number;
    marketId: number;
    userId: number;
    role: string;
    status: "pending" | "accepted" | "rejected";
    joinedAt: string;
    isActive: boolean;
    User: {
      id: number;
      name: string;
      email?: string;
      avatarUrl?: string;
    };
  }>>([]);
  const [availableRoles, setAvailableRoles] = useState<Array<{ name: string; nameEn?: string; nameRu?: string; nameHy?: string }>>([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  
  // Attached orders state
  const [attachedOrders, setAttachedOrders] = useState<Array<{ id: number; orderId: number; Order: Order }>>([]);
  const [showAttachOrderModal, setShowAttachOrderModal] = useState(false);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderSearchResults, setOrderSearchResults] = useState<Order[]>([]);
  const [isSearchingOrders, setIsSearchingOrders] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [errors, setErrors] = useState({
    name: "",
    description: "",
    location: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for scrolling to error fields
  const scrollViewRef = useRef<ScrollView>(null);
  const basicInfoSectionRef = useRef<View>(null);

  // Specialist search for member invitations
  // Filter out existing market members and creator
  const existingMemberIds = useMemo(
    () => marketMembers.map((m) => m.userId),
    [marketMembers]
  );

  const {
    searchQuery,
    setSearchQuery,
    allSpecialists,
    searchResults,
    setSearchResults,
    isSearching,
    loadingSpecialists,
    hasMoreSpecialists,
    searchSpecialists,
    loadAllSpecialists,
    handleLoadMore,
    setAllSpecialists,
  } = useSpecialistSearch(null); // We'll filter manually for markets


  // Fetch market data if in edit mode
  const { data: market, isLoading: isLoadingMarket } = useQuery({
    queryKey: ["market", marketId],
    queryFn: () => apiService.getMarketById(marketId!),
    enabled: isEditMode && !!marketId,
  });

  // Populate form when market data loads
  useEffect(() => {
    if (market && isEditMode) {
      setFormData({
        name: market.name || "",
        description: market.description || "",
        location: market.location || "",
      });

      // Parse location if it has coordinates
      const parsedLocation = parseLocationCoordinates(market.location);
      if (parsedLocation) {
        setSelectedLocation(parsedLocation);
      }

      // Store market status
      setMarketStatus(market.status || null);

      // Load weekly schedule
      if ((market as any).weeklySchedule) {
        setWeeklySchedule((market as any).weeklySchedule);
      }

      // Load market members
      if (market.Members && Array.isArray(market.Members)) {
        setMarketMembers(market.Members.map((m: any) => ({
          id: m.id,
          marketId: m.marketId,
          userId: m.userId,
          role: m.role,
          status: m.status,
          joinedAt: m.joinedAt,
          isActive: m.isActive,
          User: m.User,
        })));
      }

      // Load available roles
      if (market.Roles && Array.isArray(market.Roles) && market.Roles.length > 0) {
        setAvailableRoles(market.Roles.map((r: any) => ({
          name: r.name,
          nameEn: r.nameEn,
          nameRu: r.nameRu,
          nameHy: r.nameHy,
        })));
      } else {
        // Load default roles if no custom roles
        apiService.getDefaultMarketRoles().then((roles) => {
          if (roles && roles.length > 0) {
            setAvailableRoles(roles.map((r: any) => ({
              name: r.name,
              nameEn: r.nameEn,
              nameRu: r.nameRu,
              nameHy: r.nameHy,
            })));
          }
        }).catch(console.error);
      }

      // Load existing media files
      // Backend returns MediaFiles, but we also check Gallery for compatibility
      const mediaFilesData = (market as any).MediaFiles || (market as any).Gallery || [];
      if (mediaFilesData.length > 0) {
        const existingMediaFiles: MediaFile[] = mediaFilesData.map(
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
        if (market.bannerImageId) {
          setExistingBannerId(market.bannerImageId);
          const bannerIndex = existingMediaFiles.findIndex(
            (mf: any) => mf.id === market.bannerImageId
          );
          if (bannerIndex !== -1) {
            setSelectedBannerIndex(bannerIndex);
          }
        }
      }

      // Load existing attached orders
      if (market.Orders && Array.isArray(market.Orders)) {
        setAttachedOrders(market.Orders.map((mo: any) => ({
          id: mo.id,
          orderId: mo.orderId,
          Order: mo.Order,
        })));
      }
    }
  }, [market, isEditMode]);

  // Load user's permanent orders
  useEffect(() => {
    if (isAuthenticated && user) {
      setLoadingOrders(true);
      apiService.getMyOrders()
        .then((response: any) => {
          const orders = response.orders || response || [];
          // Filter for permanent orders only
          const permanentOrders = orders.filter((order: Order) => order.orderType === "permanent");
          setAllOrders(permanentOrders);
        })
        .catch((error) => {
          console.error("Error loading orders:", error);
        })
        .finally(() => {
          setLoadingOrders(false);
        });
    }
  }, [isAuthenticated, user]);

  // Search orders
  const searchOrders = useCallback((query: string) => {
    if (query.length < 2) {
      setOrderSearchResults([]);
      setIsSearchingOrders(false);
      return;
    }

    setIsSearchingOrders(true);
    const lowerQuery = query.toLowerCase();
    const filtered = allOrders.filter((order) =>
      order.title.toLowerCase().includes(lowerQuery) ||
      order.description?.toLowerCase().includes(lowerQuery)
    );
    setOrderSearchResults(filtered);
    setIsSearchingOrders(false);
  }, [allOrders]);

  // Trigger search when query changes
  useEffect(() => {
    if (orderSearchQuery.length >= 2) {
      searchOrders(orderSearchQuery);
    } else {
      setOrderSearchResults([]);
    }
  }, [orderSearchQuery, searchOrders]);

  const validateField = (
    field: string,
    value: string | null | undefined
  ) => {
    switch (field) {
      case "name":
        if (!value || (typeof value === "string" && !value.trim())) {
          return t("pleaseEnterMarketName") || "Please enter market name";
        }
        const nameStr =
          typeof value === "string" ? value.trim() : (value ? String(value) : "");
        if (nameStr.length < 3) {
          return t("nameTooShort") || "Name is too short (minimum 3 characters)";
        }
        if (nameStr.length > 100) {
          return t("nameTooLong") || "Name is too long (maximum 100 characters)";
        }
        return "";
      case "description":
        // Description is optional, but if provided, validate format
        if (value && typeof value === "string" && value.trim()) {
          const descStr = value.trim();
          if (descStr.length < 10) {
            return t("descriptionTooShort") || "Description is too short (minimum 10 characters)";
          }
          if (descStr.length > 2000) {
            return t("descriptionTooLong") || "Description is too long (maximum 2000 characters)";
          }
        }
        return "";
      case "location":
        // Location is optional, but if provided, validate format
        if (value && typeof value === "string" && value.trim()) {
          const locationStr = value.trim();
          if (locationStr.length < 3) {
            return t("locationTooShort") || "Location is too short";
          }
          if (locationStr.length > 200) {
            return t("locationTooLong") || "Location is too long";
          }
        }
        return "";
      default:
        return "";
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Real-time validation
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  // Function to scroll to the first error field
  const scrollToFirstError = (validationErrors: typeof errors) => {
    const fieldOrder = [
      { field: "name", ref: basicInfoSectionRef },
      { field: "description", ref: basicInfoSectionRef },
      { field: "location", ref: basicInfoSectionRef },
    ];

    // Find the first error
    for (const { field, ref } of fieldOrder) {
      const errorMessage =
        validationErrors[field as keyof typeof validationErrors];
      if (
        errorMessage &&
        typeof errorMessage === "string" &&
        errorMessage.trim() !== ""
      ) {
        if (ref.current && scrollViewRef.current) {
          try {
            ref.current.measureLayout(
              scrollViewRef.current as any,
              (x, y, width, height) => {
                if (scrollViewRef.current) {
                  scrollViewRef.current.scrollTo({
                    y: Math.max(0, y - 100),
                    animated: true,
                  });
                }
              },
              () => {
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
        break;
      }
    }
  };


  const handleSubmit = async () => {
    // Validate all required fields before submission
    const validationErrors = {
      name: validateField("name", formData.name),
      description: validateField("description", formData.description),
      location: validateField("location", formData.location),
    };

    setErrors(validationErrors);

    // Check if there are any validation errors
    const hasErrors = Object.values(validationErrors).some(
      (error) => error !== ""
    );
    if (hasErrors) {
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
      const marketData: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        location: selectedLocation
          ? `${selectedLocation.address} (${selectedLocation.latitude}, ${selectedLocation.longitude})`
          : formData.location.trim() || undefined,
        weeklySchedule:
          Object.keys(weeklySchedule).length > 0
            ? weeklySchedule
            : undefined,
      };

      // If marketId exists, update the market; otherwise create a new one
      if (marketId) {
        // Update existing market
        // Separate new files (local URIs) from existing files (HTTP URLs)
        const newFiles = mediaFiles.filter(
          (file) =>
            file.uri.startsWith("file://") || file.uri.startsWith("content://")
        );

        // Upload new files
        if (newFiles.length > 0) {
          for (const file of newFiles) {
            try {
              // First upload the file to get the URL
              const uploadResult = await fileUploadService.uploadFile(file, null);
              if (uploadResult.success && uploadResult.fileUrl) {
                // Then create the market media file record
                await apiService.uploadMarketMediaFile({
                  marketId,
                  fileName: uploadResult.fileName || file.fileName,
                  fileUrl: uploadResult.fileUrl,
                  fileType: file.type,
                  mimeType: file.mimeType,
                  fileSize: file.fileSize,
                });
              } else {
                console.error("Failed to upload file:", uploadResult.error);
              }
            } catch (error) {
              console.error("Error uploading file:", error);
            }
          }
        }

        // Update the market
        await apiService.updateMarket(marketId, marketData);

        // Handle banner image update
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
          // Reload the market to get all media files with their IDs
          const updatedMarket = await apiService.getMarketById(marketId);
          const updatedMediaFiles = (updatedMarket as any).MediaFiles || (updatedMarket as any).Gallery || [];

          if (updatedMediaFiles.length > 0) {
            const bannerFile = mediaFiles[bannerIndexToUse];

            // Try to find the matching media file in the database
            let targetMediaFile = null;

            // If it's an existing file (has ID), use that ID directly
            if ((bannerFile as any).id) {
              targetMediaFile = updatedMediaFiles.find(
                (mf: any) => mf.id === (bannerFile as any).id
              );
            } else {
              // For new files, match by filename
              targetMediaFile = updatedMediaFiles.find(
                (mf: any) =>
                  mf.fileType === "image" && mf.fileName === bannerFile.fileName
              );
            }

            // Set banner image if we found a match
            if (targetMediaFile && targetMediaFile.fileType === "image") {
              try {
                await apiService.setMarketBanner(
                  marketId,
                  targetMediaFile.id
                );
              } catch (error) {
                console.error("Error setting banner image:", error);
              }
            }
          }
        }

        // Handle order attachments/detachments
        if (market.Orders) {
          const existingOrderIds = market.Orders.map((mo: any) => mo.orderId);
          const newOrderIds = attachedOrders.map((mo) => mo.orderId);
          
          // Find orders to attach (in new but not in existing)
          const ordersToAttach = newOrderIds.filter(
            (id: number) => !existingOrderIds.includes(id)
          );
          
          // Find orders to detach (in existing but not in new)
          const ordersToDetach = existingOrderIds.filter(
            (id: number) => !newOrderIds.includes(id)
          );
          
          // Attach new orders
          for (const orderId of ordersToAttach) {
            try {
              await apiService.attachOrderToMarket(marketId, orderId);
            } catch (error: any) {
              console.error(`Error attaching order ${orderId}:`, error);
              // Continue with other orders even if one fails
            }
          }
          
          // Detach removed orders
          for (const orderId of ordersToDetach) {
            try {
              await apiService.detachOrderFromMarket(marketId, orderId);
            } catch (error: any) {
              console.error(`Error detaching order ${orderId}:`, error);
              // Continue with other orders even if one fails
            }
          }
        }

        // Invalidate markets queries to refresh the list
        await queryClient.invalidateQueries({ queryKey: ["markets"] });
        await queryClient.invalidateQueries({ queryKey: ["market", marketId] });

        // Market updated successfully
        Alert.alert(t("success"), t("marketUpdated"), [
          {
            text: t("ok"),
            onPress: () => {
              router.back();
            },
          },
        ]);
      } else {
        // Creating a new market
        let createdMarket: any;
        
        // Use transactional market creation with media files
        if (mediaFiles.length > 0) {
          // First create the market
          createdMarket = await apiService.createMarket(marketData);

          // Then upload media files
          for (const file of mediaFiles) {
            try {
              // First upload the file to get the URL
              const uploadResult = await fileUploadService.uploadFile(file, null);
              if (uploadResult.success && uploadResult.fileUrl) {
                // Then create the market media file record
                await apiService.uploadMarketMediaFile({
                  marketId: createdMarket.id,
                  fileName: uploadResult.fileName || file.fileName,
                  fileUrl: uploadResult.fileUrl,
                  fileType: file.type,
                  mimeType: file.mimeType,
                  fileSize: file.fileSize,
                });
              } else {
                console.error("Failed to upload file:", uploadResult.error);
              }
            } catch (error) {
              console.error("Error uploading file:", error);
            }
          }

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
          if (bannerIndexToUse !== null && createdMarket.id) {
            // Reload market to get media file IDs
            const updatedMarket = await apiService.getMarketById(createdMarket.id);
            const updatedMediaFiles = (updatedMarket as any).MediaFiles || (updatedMarket as any).Gallery || [];
            if (updatedMediaFiles.length > 0) {
              const bannerFile = updatedMediaFiles.find(
                (mf: any) => mf.fileType === "image"
              );
              if (bannerFile) {
                await apiService.setMarketBanner(createdMarket.id, bannerFile.id);
              }
            }
          }

          // Handle order attachments for new market
          if (attachedOrders.length > 0 && createdMarket.id) {
            for (const marketOrder of attachedOrders) {
              try {
                await apiService.attachOrderToMarket(createdMarket.id, marketOrder.orderId);
              } catch (error: any) {
                console.error(`Error attaching order ${marketOrder.orderId}:`, error);
                // Continue with other orders even if one fails
              }
            }
          }

          // Invalidate markets queries to refresh the list
          await queryClient.invalidateQueries({ queryKey: ["markets"] });

          // Show success message
          Alert.alert(t("success"), t("marketCreated") , [
            {
              text: t("ok"),
              onPress: () => {
                router.replace(`/services/${createdMarket.id}`);
              },
            },
          ]);
        } else {
          // No media files, use regular market creation
          createdMarket = await apiService.createMarket(marketData);

          // Handle order attachments for new market
          if (attachedOrders.length > 0 && createdMarket.id) {
            for (const marketOrder of attachedOrders) {
              try {
                await apiService.attachOrderToMarket(createdMarket.id, marketOrder.orderId);
              } catch (error: any) {
                console.error(`Error attaching order ${marketOrder.orderId}:`, error);
                // Continue with other orders even if one fails
              }
            }
          }

          // Invalidate markets queries to refresh the list
          await queryClient.invalidateQueries({ queryKey: ["markets"] });

          // Show success message
          Alert.alert(t("success"), t("marketCreated") , [
            {
              text: t("ok"),
              onPress: () => {
                router.replace(`/services/${createdMarket.id}`);
              },
            },
          ]);
        }
      }
    } catch (error: any) {
      console.error("Error creating/updating market:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : t("unknownError") ;

      Alert.alert(
        t("error"),
        (isEditMode ? t("failedToUpdateMarket") : t("failedToCreateMarket")) +
          ": " +
          errorMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMarket = () => {
    if (!marketId) return;

    Alert.alert(t("deleteMarket") , t("areYouSureDeleteMarket") , [
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
            await apiService.deleteMarket(marketId);
            Alert.alert(t("success"), t("marketDeletedSuccessfully") , [
              {
                text: t("ok"),
                onPress: () => {
                  router.replace("/services");
                },
              },
            ]);
          } catch (error: any) {
            console.error("Error deleting market:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : typeof error === "string"
                ? error
                : t("unknownError") ;
            Alert.alert(
              t("error"),
              (t("failedToDeleteMarket") ) + ": " + errorMessage
            );
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  if (isEditMode && isLoadingMarket) {
    const header = (
      <Header
        title={t("editMarket")}
        subtitle={t("editMarketDescription")}
        showBackButton={true}
        onBackPress={() => router.back()}
      />
    );
    return <ServiceCreateSkeleton header={header} isEditMode={true} />;
  }

  const header = (
    <Header
      title={isEditMode ? t("editMarket") : t("createMarket")}
      subtitle={isEditMode ? t("editMarketDescription") : t("createNewService")}
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
                  name: formData.name,
                  description: formData.description,
                  location: formData.location,
                }}
                errors={{
                  name: errors.name,
                  description: errors.description,
                  location: errors.location,
                }}
                onFieldChange={updateField}
                onLocationChange={(location) => {
                  // Parse location string to extract coordinates if needed
                  // The location address is already set by BasicInformationForm
                }}
                titleLabel={t("marketName")}
                titlePlaceholder={t("marketNamePlaceholder")}
              />
            </View>
          </ResponsiveCard>

          {/* Weekly Schedule - Business Hours */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("businessHours")}
            </Text>
            <Text
              style={[styles.sectionDesc, { color: colors.tabIconDefault }]}
            >
              {t("setBusinessHoursDesc")}
            </Text>
            <WeeklySchedulePicker
              value={weeklySchedule}
              onChange={setWeeklySchedule}
              disabled={isSubmitting}
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
                {t("tapImageToSetAsBanner")}
              </Text>
            )}
          </ResponsiveCard>

          {/* Attached Orders Section */}
          <ResponsiveCard>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <Text style={[styles.sectionTitle, { color: colors.text, width: '60%' }]}>
                {t("attachedOrders")} ({attachedOrders.length})
              </Text>
              <Button
                onPress={() => setShowAttachOrderModal(true)}
                title={t("attach")}
                variant="primary"
                icon="plus.circle"
                iconSize={14}
                backgroundColor={colors.primary}
              />
            </View>

            {attachedOrders.length === 0 ? (
              <View style={styles.emptyOrdersContainer}>
                <IconSymbol
                  name="doc.text"
                  size={48}
                  color={colors.tabIconDefault}
                />
                <Text
                  style={[styles.emptyOrdersTitle, { color: colors.text }]}
                >
                  {t("noOrdersAttached")}
                </Text>
                <Text
                  style={[
                    styles.emptyOrdersDescription,
                    { color: colors.tabIconDefault },
                  ]}
                >
                  {t("attachPermanentOrdersToService")}
                </Text>
              </View>
            ) : (
              <View style={styles.ordersList}>
                {attachedOrders.map((marketOrder) => (
                  <View
                    key={marketOrder.id}
                    style={[
                      styles.orderCard,
                      { borderColor: colors.border, backgroundColor: colors.background },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.orderCardContent}
                      onPress={() => {
                        router.push(`/orders/${marketOrder.Order.id}`);
                      }}
                    >
                      <View style={styles.orderCardInfo}>
                        <Text
                          style={[styles.orderCardTitle, { color: colors.text }]}
                        >
                          {marketOrder.Order.title}
                        </Text>
                        <View style={styles.orderCardMeta}>
                          <View style={styles.orderCardMetaItem}>
                            <IconSymbol
                              name="dollarsign.circle"
                              size={14}
                              color={colors.tabIconDefault}
                            />
                            <Text
                              style={[
                                styles.orderCardMetaText,
                                { color: colors.tabIconDefault },
                              ]}
                            >
                              {marketOrder.Order.currency === "USD"
                                ? "$"
                                : marketOrder.Order.currency === "EUR"
                                ? "€"
                                : ""}
                              {marketOrder.Order.budget.toLocaleString()}
                            </Text>
                          </View>
                          {marketOrder.Order.Category && (
                            <View style={styles.orderCardMetaItem}>
                              <IconSymbol
                                name="tag"
                                size={14}
                                color={colors.tabIconDefault}
                              />
                              <Text
                                style={[
                                  styles.orderCardMetaText,
                                  { color: colors.tabIconDefault },
                                ]}
                              >
                                {marketOrder.Order.Category.nameEn ||
                                  marketOrder.Order.Category.name}
                              </Text>
                            </View>
                          )}
                          <View style={styles.orderCardMetaItem}>
                            <IconSymbol
                              name="circle.fill"
                              size={8}
                              color={
                                marketOrder.Order.status === "open"
                                  ? colors.openNow
                                  : marketOrder.Order.status === "in_progress"
                                  ? colors.link
                                  : colors.iosGray
                              }
                            />
                            <Text
                              style={[
                                styles.orderCardMetaText,
                                { color: colors.tabIconDefault },
                              ]}
                            >
                              {t(marketOrder.Order.status)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setAttachedOrders((prev) =>
                            prev.filter((mo) => mo.id !== marketOrder.id)
                          );
                        }}
                        style={styles.removeOrderButton}
                      >
                        <IconSymbol
                          name="xmark.circle.fill"
                          size={24}
                          color={colors.errorVariant}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ResponsiveCard>

          {/* User Management - Only show in edit mode */}
          {isEditMode && marketId && (
            <ResponsiveCard>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("teamMembers")} ({marketMembers.length})
                </Text>
                <Button
                  onPress={() => setShowAddMemberModal(true)}
                  title={t("add")}
                  variant="primary"
                  icon="person.badge.plus"
                  iconSize={14}
                  backgroundColor={colors.primary}
                />
              </View>

              {marketMembers.length === 0 ? (
                <View style={styles.emptyMembersContainer}>
                  <IconSymbol
                    name="person.3"
                    size={48}
                    color={colors.tabIconDefault}
                  />
                  <Text
                    style={[styles.emptyMembersTitle, { color: colors.text }]}
                  >
                    {t("noMembers")}
                  </Text>
                  <Text
                    style={[
                      styles.emptyMembersDescription,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t("addMembersToGetStarted")}
                  </Text>
                </View>
              ) : (
                <View>
                  {marketMembers.map((member) => (
                    <TeamMemberItem
                      key={member.id}
                      member={member}
                      canRemove={member.role !== "owner"}
                      canEditRole={member.role !== "owner"}
                      availableRoles={availableRoles}
                      showLeadBadge={false}
                      useMemberIdForRemove={true}
                      onRemove={async (memberId) => {
                        try {
                          // Double-check: prevent removing owner
                          const memberToRemove = marketMembers.find((m) => m.id === memberId);
                          if (memberToRemove?.role === "owner") {
                            Alert.alert(
                              t("error"),
                              t("cannotRemoveOwner")
                            );
                            return;
                          }
                          
                          await apiService.removeMarketMember(marketId, memberId);
                          setMarketMembers((prev) =>
                            prev.filter((m) => m.id !== memberId)
                          );
                        } catch (error: any) {
                          Alert.alert(t("error"), error.message || t("failedToRemoveMember"));
                        }
                      }}
                      onRoleChange={async (memberId, newRole) => {
                        try {
                          // Prevent changing owner's role
                          const memberToUpdate = marketMembers.find((m) => m.id === memberId);
                          if (memberToUpdate?.role === "owner") {
                            Alert.alert(
                              t("error"),
                              t("cannotChangeOwnerRole")
                            );
                            return;
                          }
                          
                          await apiService.updateMarketMember(marketId, memberId, newRole);
                          setMarketMembers((prev) =>
                            prev.map((m) =>
                              m.id === memberId ? { ...m, role: newRole } : m
                            )
                          );
                        } catch (error: any) {
                          Alert.alert(t("error"), error.message || t("failedToUpdateRole"));
                        }
                      }}
                    />
                  ))}
                </View>
              )}
            </ResponsiveCard>
          )}

          {/* Action Buttons */}
          <ResponsiveCard>
            <View
              style={[
                styles.actionButtons,
                // { borderTopColor: colors.border },
                !marketId && styles.singleButtonContainer,
              ]}
            >
              {marketId && (
                <>
                  <Button
                    variant="outline"
                    icon="trash"
                    iconSize={16}
                    iconPosition="left"
                    title={t("delete")}
                    textColor={colors.errorVariant}
                    onPress={handleDeleteMarket}
                  />
                  <Button
                    variant="outline"
                    icon="eye"
                    iconSize={16}
                    iconPosition="left"
                    title={t("preview")}
                    onPress={() => {
                      router.push(`/services/${marketId}?preview=true`);
                    }}
                  />
                </>
              )}
              <Button
                style={{ minWidth: 80 }}
                onPress={handleSubmit}
                title={marketId ? t("save") : t("createMarket")}
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


      {/* Add Member Modal - Only show in edit mode */}
      {isEditMode && marketId && (
        <AddMarketMemberModal
          visible={showAddMemberModal}
          onClose={() => {
            setShowAddMemberModal(false);
            setSearchQuery("");
            setSearchResults([]);
          }}
          onAddMember={async (userId, role) => {
            try {
              await apiService.addMarketMember(marketId, userId, role);
              // Reload market to get updated members
              const updatedMarket = await apiService.getMarketById(marketId);
              if (updatedMarket.Members) {
                setMarketMembers(updatedMarket.Members.map((m: any) => ({
                  id: m.id,
                  marketId: m.marketId,
                  userId: m.userId,
                  role: m.role,
                  status: m.status,
                  joinedAt: m.joinedAt,
                  isActive: m.isActive,
                  User: m.User,
                })));
              }
              setShowAddMemberModal(false);
              setSearchQuery("");
              setSearchResults([]);
              setAllSpecialists((prev) => prev.filter((s) => s.id !== userId));
            } catch (error: any) {
              Alert.alert(t("error"), error.message || t("failedToAddMember"));
            }
          }}
          onAddMembers={async (members) => {
            try {
              const addedMemberIds: number[] = [];
              for (const { userId, role } of members) {
                try {
                  await apiService.addMarketMember(marketId, userId, role);
                  addedMemberIds.push(userId);
                } catch (error: any) {
                  console.error(`Error adding member ${userId}:`, error);
                }
              }
              // Reload market to get updated members
              const updatedMarket = await apiService.getMarketById(marketId);
              if (updatedMarket.Members) {
                setMarketMembers(updatedMarket.Members.map((m: any) => ({
                  id: m.id,
                  marketId: m.marketId,
                  userId: m.userId,
                  role: m.role,
                  status: m.status,
                  joinedAt: m.joinedAt,
                  isActive: m.isActive,
                  User: m.User,
                })));
              }
              setAllSpecialists((prev) =>
                prev.filter((s) => !addedMemberIds.includes(s.id))
              );
              if (addedMemberIds.length > 0) {
                setShowAddMemberModal(false);
                setSearchQuery("");
                setSearchResults([]);
              }
            } catch (error: any) {
              Alert.alert(t("error"), error.message || t("failedToAddMembers"));
            }
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={searchSpecialists}
          allSpecialists={allSpecialists.filter(
            (s) => s.id !== market?.createdBy && !existingMemberIds.includes(s.id)
          )}
          searchResults={searchResults.filter(
            (s) => s.id !== market?.createdBy && !existingMemberIds.includes(s.id)
          )}
          isSearching={isSearching}
          loadingSpecialists={loadingSpecialists}
          hasMoreSpecialists={hasMoreSpecialists}
          onLoadMore={handleLoadMore}
          onLoadInitial={() => {
            if (allSpecialists.length === 0) {
              loadAllSpecialists(1, false);
            }
          }}
          availableRoles={availableRoles}
          defaultRole="member"
        />
      )}

      {/* Attach Order Modal */}
      <AttachOrderModal
        visible={showAttachOrderModal}
        onClose={() => {
          setShowAttachOrderModal(false);
          setOrderSearchQuery("");
          setOrderSearchResults([]);
        }}
        onAttachOrders={async (orderIds) => {
          try {
            // Add selected orders to attachedOrders state
            // We'll need to get the full order objects from allOrders
            const ordersToAttach = allOrders.filter((order) =>
              orderIds.includes(order.id)
            );
            
            // Also check search results in case the order is only in search results
            const ordersFromSearch = orderSearchResults.filter((order) =>
              orderIds.includes(order.id) && !ordersToAttach.find((o) => o.id === order.id)
            );
            
            const allOrdersToAttach = [...ordersToAttach, ...ordersFromSearch];
            
            setAttachedOrders((prev) => {
              const newOrders = allOrdersToAttach.map((order) => ({
                id: Date.now() + order.id, // Temporary ID for new attachments
                orderId: order.id,
                Order: order,
              }));
              return [...prev, ...newOrders];
            });
            
            setShowAttachOrderModal(false);
            setOrderSearchQuery("");
            setOrderSearchResults([]);
          } catch (error) {
            console.error("Error attaching orders:", error);
          }
        }}
        searchQuery={orderSearchQuery}
        onSearchChange={setOrderSearchQuery}
        allOrders={allOrders}
        searchResults={orderSearchResults}
        isSearching={isSearchingOrders}
        loadingOrders={loadingOrders}
        attachedOrderIds={attachedOrders.map((mo) => mo.orderId)}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    marginBottom: 16,
  },
  sectionDesc: {
    fontSize: 14,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  manualLocationInputWrapper: {
    position: "relative",
  },
  mapIconButton: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerHint: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 8,
    opacity: 0.7,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  singleButtonContainer: {
    justifyContent: "center",
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
  emptyMembersContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyMembersTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyMembersDescription: {
    fontSize: 14,
    textAlign: "center",
  },
  emptyOrdersContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyOrdersTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyOrdersDescription: {
    fontSize: 14,
    textAlign: "center",
  },
  ordersList: {
    gap: 8,
  },
  orderCard: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  orderCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  orderCardInfo: {
    flex: 1,
  },
  orderCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  orderCardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  orderCardMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orderCardMetaText: {
    fontSize: 12,
    fontWeight: "500",
  },
  removeOrderButton: {
    padding: 4,
  },
});
