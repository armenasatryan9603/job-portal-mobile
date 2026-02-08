import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Order, apiService } from "@/categories/api";
import React, { useState } from "react";
import { Spacing, ThemeColors, Typography } from "@/constants/styles";

import { ApplyButton } from "@/components/ApplyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckInModal } from "@/components/CheckInModal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import { MapViewComponent } from "@/components/MapView";
import { PriceCurrency } from "@/components/PriceCurrency";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { getLocationDisplay } from "@/utils/countryExtraction";
import { markOrderAsViewed } from "@/utils/viewedOrdersStorage";
import { parseLocationCoordinates } from "@/utils/locationParsing";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";

interface OrderItemProps {
  order: Order;
  isMyOrders?: boolean;
  isMyJobs?: boolean;
  hasAppliedToOrder?: (orderId: number) => boolean;
  isViewed?: boolean;
  isSaved?: boolean;
  onOrderViewed?: (orderId: number) => void;
  onApplyToOrder?: (order: Order) => void;
  onCancelProposal?: (order: Order) => void;
  onSaveToggle?: (orderId: number, isSaved: boolean) => void;
  onCheckIn?: (order: Order) => void;
  onPublishOrder?: (order: Order) => void;
}

const OrderItem = ({
  order,
  isMyOrders = false,
  isMyJobs = false,
  hasAppliedToOrder = () => false,
  isViewed = false,
  isSaved = false,
  onOrderViewed,
  onApplyToOrder,
  onCancelProposal,
  onSaveToggle,
  onCheckIn,
  onPublishOrder,
}: OrderItemProps) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const hasBannerImage = !!order.BannerImage?.fileUrl;
  const [imageLoading, setImageLoading] = useState(hasBannerImage);
  const [imageError, setImageError] = useState(!hasBannerImage);
  const [saved, setSaved] = useState(isSaved);
  const [saving, setSaving] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Helper function to get localized title/description
  const getLocalizedText = (
    field: "title" | "description",
    language: string
  ): string => {
    const fieldKey = field === "title" ? "title" : "description";
    const langKey = language === "en" ? "En" : language === "ru" ? "Ru" : "Hy";
    const multilingualKey = `${fieldKey}${langKey}` as
      | "titleEn"
      | "titleRu"
      | "titleHy"
      | "descriptionEn"
      | "descriptionRu"
      | "descriptionHy";

    // Try multilingual field first
    if (order[multilingualKey]) {
      return order[multilingualKey]!;
    }

    // Fallback to original field
    return order[fieldKey] || "";
  };

  const displayTitle = getLocalizedText("title", language);
  const displayDescription = getLocalizedText("description", language);

  // Helper function to get localized service name
  const getLocalizedServiceName = (service?: {
    name?: string;
    nameEn?: string;
    nameRu?: string;
    nameHy?: string;
  }): string => {
    if (!service) return "";

    switch (language) {
      case "ru":
        return (
          service.nameRu ||
          service.nameEn ||
          service.nameHy ||
          service.name ||
          ""
        );
      case "hy":
        return (
          service.nameHy ||
          service.nameEn ||
          service.nameRu ||
          service.name ||
          ""
        );
      case "en":
      default:
        return (
          service.nameEn ||
          service.nameRu ||
          service.nameHy ||
          service.name ||
          ""
        );
    }
  };

  const displayServiceName = getLocalizedServiceName(order.Category);
  const locationDisplay = getLocationDisplay(order.location);
  const locationCoordinates = parseLocationCoordinates(locationDisplay);

  // Status configuration for Badge component
  const getStatusVariant = (status: string): "success" | "warning" | "info" | "error" | "pending" | "default" => {
    switch (status) {
      case "open":
        return "success";
      case "in_progress":
        return "warning";
      case "completed":
        return "info";
      case "cancelled":
        return "error";
      case "pending":
        return "pending";
      default:
        return "default";
    }
  };

  const hasBudget = order.budget !== undefined && order.budget !== null;

  const handleSaveToggle = async (e: any) => {
    e.stopPropagation(); // Prevent triggering order press
    if (!user?.id) return;

    setSaving(true);
    try {
      if (saved) {
        await apiService.unsaveOrder(order.id);
        setSaved(false);
        onSaveToggle?.(order.id, false);
      } else {
        await apiService.saveOrder(order.id);
        setSaved(true);
        onSaveToggle?.(order.id, true);
      }
    } catch (error) {
      console.error("Error toggling save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleOrderPress = async (order: Order) => {
    // Mark order as viewed when opening (only for non-myOrders)
    if (!isMyOrders) {
      await markOrderAsViewed(order.id);
      // Update parent state immediately for instant visual feedback
      if (onOrderViewed) {
        onOrderViewed(order.id);
      }
    }

    // For other orders, open in view mode
    router.push(`/orders/${order.id}`);
  };

  const handleApplyToOrder = (order: Order) => {
    if (onApplyToOrder) {
      onApplyToOrder(order);
    }
  };

  const handleCancelProposal = (order: Order) => {
    if (onCancelProposal) {
      onCancelProposal(order);
    }
  };

  const handleCheckIn = (order: Order) => {
    if (onCheckIn) {
      onCheckIn(order);
    } else {
      // Fallback: open modal directly
      setShowCheckInModal(true);
    }
  };

  const handleSubmitCheckIn = async (
    selectedSlots: Array<{ date: string; startTime: string; endTime: string; marketMemberId?: number; message?: string }>
  ) => {
    setCheckInLoading(true);
    try {
      const result = await apiService.checkInToOrder(order.id, selectedSlots);

      // Handle partial success (some bookings succeeded, some failed)
      if (result.errors && result.errors.length > 0) {
        console.warn("Some bookings failed:", result.errors);
        
        // Check if any errors are market conflict errors
        const marketConflictErrors = result.errors.filter((err: any) =>
          err.error?.includes("another order from the same service") ||
          err.error?.includes("same service")
        );

        if (marketConflictErrors.length > 0) {
          // Show market conflict alert
          const conflictMessage = marketConflictErrors.length === 1
            ? marketConflictErrors[0].error
            : `${marketConflictErrors.length} ${t("slotsSelected")} ${t("conflictWithMarketOrder")}`;
          
          Alert.alert(
            t("bookingConflict"),
            conflictMessage,
            [{ text: t("ok") }]
          );
          setCheckInLoading(false);
          return;
        } else if (result.bookings && result.bookings.length > 0) {
          // Some succeeded, some failed (non-market conflicts)
          const errorMessages = result.errors.map((err: any) => err.error).join("\n");
          Alert.alert(
            t("partialSuccess"),
            `${t("someBookingsSucceeded")}.\n${t("someBookingsFailed")}:\n${errorMessages}`
          );
          setCheckInLoading(false);
          return;
        }
      }

      Alert.alert(t("success"), t("checkInSuccess"));
      setShowCheckInModal(false);
    } catch (error: any) {
      console.error("Error checking in:", error);
      
      // Check if error is a market conflict
      const errorMessage = error?.message || error?.toString() || "";
      if (
        errorMessage.includes("another order from the same service") ||
        errorMessage.includes("same service")
      ) {
        Alert.alert(
          t("bookingConflict"),
          errorMessage || t("marketBookingConflict")
        );
      } else {
        Alert.alert(t("error"), t("checkInFailed"));
      }
    } finally {
      setCheckInLoading(false);
    }
  };

  // Update saved state when isSaved prop changes
  React.useEffect(() => {
    setSaved(isSaved);
  }, [isSaved]);

  // Reset image state when order changes
  React.useEffect(() => {
    const hasImage = !!order.BannerImage?.fileUrl;
    setImageLoading(hasImage);
    setImageError(!hasImage);
  }, [order.BannerImage?.fileUrl]);

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity 
        onPress={() => handleOrderPress(order)} 
        activeOpacity={1}
        style={styles.touchable}
      >
        <ResponsiveCard
          padding={0}
          marginHorizontal={0}
          marginBlock={Spacing.xs}
          style={[
            isViewed && styles.viewedCard,
            isViewed && { borderWidth: 2, borderColor: colors.border },
            styles.card,
          ]}
        >
        {isViewed && (
          <View style={[styles.viewedTag, { backgroundColor: colors.border }]}>
            <IconSymbol name="eye" size={12} color={colors.tabIconDefault} />
            <Text
              style={[styles.viewedTagText, { color: colors.tabIconDefault }]}
            >
              {t("viewed")}
            </Text>
          </View>
        )}
        {/* Banner Image */}
        <View style={styles.bannerImageContainer}>
          {order.Category && displayServiceName && (
            <Text style={[styles.serviceName]}>{displayServiceName}</Text>
          )}
          {hasBannerImage ? (
            <>
              {imageLoading && (
                <View
                  style={[
                    styles.bannerImageSkeleton,
                    { backgroundColor: colors.border },
                  ]}
                >
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              )}
              {order.BannerImage?.fileUrl && (
                <Image
                  source={{
                    uri: order.BannerImage.fileUrl,
                  }}
                  style={[
                    styles.bannerImage,
                    (imageLoading || imageError) && styles.bannerImageHidden,
                  ]}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  onLoadStart={() => {
                    setImageLoading(true);
                    setImageError(false);
                  }}
                  onLoad={() => {
                    setImageLoading(false);
                    setImageError(false);
                  }}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                  transition={150}
                />
              )}
              {imageError && !imageLoading && (
                <View style={[styles.bannerImageSkeleton, { backgroundColor: colors.border }]}>
                  <IconSymbol
                    name="photo"
                    size={24}
                    color={colors.tabIconDefault}
                  />
                </View>
              )}
            </>
          ) : (
            <View style={[styles.bannerImageSkeleton, { backgroundColor: colors.border }]}>
              <IconSymbol
                name="photo"
                size={24}
                color={colors.tabIconDefault}
              />
            </View>
          )}
        </View>
        <View style={styles.contentContainer}>
          {/* Header with Title and Status */}
          <View style={styles.orderHeader}>
            <View style={styles.orderTitleContainer}>
              <Text style={[styles.orderTitle, { color: colors.text }]} numberOfLines={1}>
                {displayTitle}
              </Text>
              {/* Bookmark Button */}
              {user?.id && !isMyOrders && user.id !== order.clientId && (
                <TouchableOpacity
                  onPress={handleSaveToggle}
                  style={styles.bookmarkButton}
                  disabled={saving}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.tint} />
                  ) : (
                    <IconSymbol
                      name={saved ? "bookmark.fill" : "bookmark"}
                      size={16}
                      color={saved ? colors.tint : colors.tabIconDefault}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
            <Badge
              text={t(`${order.status}`)}
              variant={getStatusVariant(order.status)}
              // icon={getStatusIcon(order.status)}
              iconSize={10}
              size="sm"
            />
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            {hasBudget ? (
              <PriceCurrency
                price={order.budget}
                currency={order.currency}
                rateUnit={order.rateUnit}
                showOriginal={false}
                style={{ ...styles.priceText, color: colors.tabIconDefault }}
              />
            ) : (
              <Text style={[styles.priceText, { color: colors.tabIconDefault }]}>
                {t("notProvided")}
              </Text>
            )}
          </View>

          {/* Details Row */}
          <View style={styles.orderDetails}>
            {locationDisplay && (
              <View style={styles.detailItem}>
                <IconSymbol
                  name="location.fill"
                  size={10}
                  color={colors.tabIconDefault}
                />
                <Text
                  style={[styles.detailText, { color: colors.tabIconDefault }]}
                  numberOfLines={1}
                >
                  {locationDisplay.length > 20
                    ? locationDisplay.substring(0, 20) + "..."
                    : locationDisplay}
                </Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <IconSymbol name="person.fill" size={10} color={colors.tabIconDefault} />
              <Text style={[styles.detailText, { color: colors.tabIconDefault }]}>
                {order._count?.Proposals ?? order.Proposals?.length ?? 0}
              </Text>
            </View>
          </View>

          {/* Action Button */}
          <View style={styles.actionButtons}>
            {/* Check-In Button - Only show for permanent orders (not owner) */}
            {!isMyOrders &&
              user?.id !== order.clientId &&
              (order as any).orderType === "permanent" && (
                <Button
                  variant="primary"
                  onPress={() => handleCheckIn(order)}
                  icon="calendar.badge.plus"
                  iconSize={14}
                  iconPosition="left"
                  title={t("checkIn")}
                />
              )}

            {/* Apply Button - Only show for one-time orders (not owner) */}
            {!isMyOrders &&
              user?.id !== order.clientId &&
              (order as any).orderType !== "permanent" && (
                <ApplyButton
                  order={order}
                  hasAppliedToOrder={hasAppliedToOrder}
                  onApply={handleApplyToOrder}
                />
              )}

            {/* Cancel Button - Only show for My Jobs */}
            {isMyJobs && order.Proposals && order.Proposals.length > 0 && (
              <Button
                variant="outline"
                onPress={() => handleCancelProposal(order)}
                icon="xmark.circle"
                iconSize={14}
                iconPosition="left"
                title={t("cancel")}
                textColor={colors.errorVariant}
              />
            )}

            {/* Publish Button - Only show for draft permanent orders in My Orders */}
            {isMyOrders &&
              user?.id === order.clientId &&
              (order as any).orderType === "permanent" &&
              (order as any).status === "draft" &&
              onPublishOrder && (
                <Button
                  variant="primary"
                  icon="paperplane.fill"
                  iconSize={14}
                  iconPosition="left"
                  title={t("publish")}
                  onPress={() => onPublishOrder(order)}
                />
              )}
          </View>
        </View>
        </ResponsiveCard>
      </TouchableOpacity>

      {/* Map Modal */}
      {locationCoordinates && (
        <Modal
          visible={showMapModal}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowMapModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <MapViewComponent
              initialLocation={locationCoordinates}
              onLocationSelect={() => {}}
              onClose={() => setShowMapModal(false)}
              showCurrentLocationButton={false}
              showConfirmButton={false}
            />
          </View>
        </Modal>
      )}

      {/* Check-In Modal */}
      <CheckInModal
        visible={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        order={order}
        onSubmit={handleSubmitCheckIn}
        loading={checkInLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  touchable: {
    flex: 1,
  },
  card: {
    flex: 1,
  },
  bannerImageContainer: {
    width: "100%",
    height: 120,
    position: "relative",
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  bannerImageHidden: {
    opacity: 0,
  },
  bannerImageSkeleton: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    zIndex: 1000,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    padding: Spacing.sm,
    flex: 1,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  orderTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing.xs,
  },
  orderTitle: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
    lineHeight: 16,
  },
  bookmarkButton: {
    padding: 2,
    marginLeft: Spacing.xs / 2,
  },
  priceContainer: {
    marginBottom: Spacing.xs,
  },
  priceText: {
    fontSize: 10,
    fontWeight: "700",
  },
  orderDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs / 2,
    flexShrink: 1,
  },
  detailText: {
    fontSize: 9,
    fontWeight: "500",
  },
  serviceName: {
    fontSize: 10,
    fontWeight: Typography.bold,
    textAlign: "right",
    position: "absolute",
    bottom: Spacing.xs / 2,
    left: Spacing.xs,
    zIndex: 1,
    // Note: Should use colors.textInverse dynamically - consider inline style
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionButtons: {
    marginTop: "auto",
    paddingTop: Spacing.xs,
  },
  appliedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  appliedButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  viewedCard: {
    opacity: 0.85,
  },
  viewedTag: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 1000,
  },
  viewedTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
});

export default OrderItem;
