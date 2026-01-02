import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Button } from "@/components/ui/button";
import { Spacing, ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Order, apiService } from "@/services/api";
import { markOrderAsViewed } from "@/utils/viewedOrdersStorage";
import { MapViewComponent } from "@/components/MapView";
import { SkillDescriptionModal } from "@/components/SkillDescriptionModal";

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
  onDeleteOrder?: (order: Order) => void;
  onSaveToggle?: (orderId: number, isSaved: boolean) => void;
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
  onDeleteOrder,
  onSaveToggle,
}: OrderItemProps) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(true);
  const [saved, setSaved] = useState(isSaved);
  const [saving, setSaving] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [showSkillModal, setShowSkillModal] = useState(false);

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

  // Parse location to extract coordinates if available
  const parseLocationCoordinates = (
    locationString?: string
  ): { latitude: number; longitude: number; address: string } | null => {
    if (!locationString) return null;

    // Try to parse coordinates from string like "address (lat, lng)"
    const coordMatch = locationString.match(
      /^(.+?)\s*\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)$/
    );
    if (coordMatch) {
      const address = coordMatch[1].trim();
      const lat = parseFloat(coordMatch[2]);
      const lng = parseFloat(coordMatch[3]);

      // Validate coordinates
      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        return {
          latitude: lat,
          longitude: lng,
          address: address,
        };
      }
    }

    return null;
  };

  const locationCoordinates = parseLocationCoordinates(order.location);

  // Status configuration
  const statusConfig = {
    open: { color: "#4CAF50", icon: "circle.fill" },
    in_progress: { color: "#FF9800", icon: "clock.fill" },
    completed: { color: "#2196F3", icon: "checkmark.circle.fill" },
    cancelled: { color: "#F44336", icon: "xmark.circle.fill" },
    pending: { color: "#9E9E9E", icon: "clock.circle.fill" },
  };

  const getStatusColor = (status: string) =>
    statusConfig[status as keyof typeof statusConfig]?.color ||
    colors.tabIconDefault;

  const getStatusIcon = (status: string) =>
    statusConfig[status as keyof typeof statusConfig]?.icon || "circle";

  const formatRateUnit = (value?: string | null) => {
    if (!value) return t("perProject") || "per project";
    const normalized = value.replace(/_/g, " ").trim().toLowerCase();
    if (normalized === "per hour") return t("perHour") || "per hour";
    if (normalized === "per day") return t("perDay") || "per day";
    if (normalized === "per project") return t("perProject") || "per project";
    return normalized;
  };

  const currencyLabel = (order.currency || "AMD").toUpperCase();
  const rateUnitLabel = formatRateUnit(order.rateUnit);
  const budgetDisplay =
    order.budget !== undefined && order.budget !== null
      ? `${currencyLabel} ${order.budget.toLocaleString()} • ${rateUnitLabel}`
      : t("notProvided") || "Not provided";

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

    if (isMyOrders) {
      // For user's own orders, open in edit mode (create.tsx)
      router.push(`/orders/create?orderId=${order.id}`);
    } else {
      // For other orders, open in view mode
      router.push(`/orders/${order.id}`);
    }
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

  const handleDeleteOrder = (order: Order) => {
    if (onDeleteOrder) {
      onDeleteOrder(order);
    }
  };

  const handleLocationPress = (e: any) => {
    e.stopPropagation(); // Prevent triggering order press
    if (locationCoordinates) {
      setShowMapModal(true);
    }
  };

  // Update saved state when isSaved prop changes
  React.useEffect(() => {
    setSaved(isSaved);
  }, [isSaved]);

  return (
    <TouchableOpacity onPress={() => handleOrderPress(order)} activeOpacity={1}>
      <ResponsiveCard
        padding={0}
        style={[
          isViewed && styles.viewedCard,
          isViewed && { borderWidth: 2, borderColor: colors.border },
        ]}
      >
        {isViewed && (
          <View style={[styles.viewedTag, { backgroundColor: colors.border }]}>
            <IconSymbol name="eye" size={12} color={colors.tabIconDefault} />
            <Text
              style={[styles.viewedTagText, { color: colors.tabIconDefault }]}
            >
              {t("viewed") || "Viewed"}
            </Text>
          </View>
        )}
        {/* Banner Image */}
        <View style={styles.bannerImageContainer}>
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
          <Image
            source={{ uri: order.BannerImage?.fileUrl || "" }}
            style={[
              styles.bannerImage,
              imageLoading && styles.bannerImageHidden,
            ]}
            resizeMode="cover"
            onLoadStart={() => {
              setImageLoading(!!order.BannerImage?.fileUrl);
              setImageError(!order.BannerImage?.fileUrl);
            }}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
          {imageError && (
            <View style={[styles.bannerImageSkeleton]}>
              <IconSymbol
                name="photo"
                size={24}
                color={colors.tabIconDefault}
              />
            </View>
          )}
        </View>
        <View style={{ padding: Spacing.md }}>
          <View style={styles.orderHeader}>
            <View style={styles.orderTitleContainer}>
              <Text style={[styles.orderTitle, { color: colors.text }]}>
                {displayTitle}
              </Text>
              {/* Bookmark Button - Only show for authenticated users and not for own orders */}
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
                      size={20}
                      color={saved ? colors.tint : colors.tabIconDefault}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(order.status) },
              ]}
            >
              <IconSymbol
                name={getStatusIcon(order.status) as any}
                size={12}
                color="white"
              />
              <Text style={styles.statusText}>
                {order.status.replace("_", " ").toUpperCase()}
              </Text>
            </View>
          </View>

          <Text
            style={[styles.orderDescription, { color: colors.tabIconDefault }]}
            numberOfLines={2}
          >
            {displayDescription}
          </Text>

          <View style={styles.orderDetails}>
            <View style={styles.detailItem}>
              <IconSymbol
                name="dollarsign.circle.fill"
                size={16}
                color={colors.tint}
              />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {budgetDisplay}
              </Text>
            </View>
            {order.location && (
              <TouchableOpacity
                style={styles.detailItem}
                onPress={handleLocationPress}
                disabled={!locationCoordinates}
                activeOpacity={locationCoordinates ? 0.6 : 1}
              >
                <View style={styles.detailIconContainer}>
                  <IconSymbol
                    name="location.fill"
                    size={16}
                    color={
                      locationCoordinates ? colors.tint : colors.tabIconDefault
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.detailText,
                    {
                      color: locationCoordinates ? colors.tint : colors.text,
                      textDecorationLine: locationCoordinates
                        ? "underline"
                        : "none",
                    },
                  ]}
                  numberOfLines={2}
                >
                  {locationCoordinates?.address || order.location}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.detailItem}>
              <IconSymbol name="person.fill" size={16} color={colors.tint} />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {order._count?.Proposals ?? order.Proposals?.length ?? 0}{" "}
                {t("application")}
              </Text>
            </View>
          </View>

          {(() => {
            // Get skills from OrderSkills if available, otherwise fallback to order.skills
            const orderSkills = (order as any).OrderSkills;
            let skillsToDisplay: Array<{ name: string; skillId: number | null }> = [];

            if (orderSkills && Array.isArray(orderSkills) && orderSkills.length > 0) {
              // Use OrderSkills structure (preferred)
              skillsToDisplay = orderSkills.map((os: any) => {
                const skill = os.Skill;
                if (!skill) return null;
                // Get skill name based on current language
                let skillName = "";
                switch (language) {
                  case "ru":
                    skillName = skill.nameRu || skill.nameEn || skill.nameHy || "";
                    break;
                  case "hy":
                    skillName = skill.nameHy || skill.nameEn || skill.nameRu || "";
                    break;
                  case "en":
                  default:
                    skillName = skill.nameEn || skill.nameRu || skill.nameHy || "";
                    break;
                }
                return {
                  name: skillName,
                  skillId: skill.id,
                };
              }).filter((s: any) => s !== null && s.name);
            } else if (order.skills && order.skills.length > 0) {
              // Fallback to order.skills array (backward compatibility)
              skillsToDisplay = order.skills.map((skill: string) => ({
                name: skill,
                skillId: null,
              }));
            }

            if (skillsToDisplay.length === 0) return null;

            return (
              <View style={styles.skillsContainer}>
                {skillsToDisplay.slice(0, 4).map((skill, index) => (
                  <TouchableOpacity
                    key={skill.skillId || index}
                    style={[
                      styles.skillTag,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => {
                      // Navigate to orders list with skill search
                      router.push(`/orders?q=${encodeURIComponent(skill.name)}`);
                    }}
                    onLongPress={() => {
                      if (skill.skillId) {
                        setSelectedSkillId(skill.skillId);
                        setShowSkillModal(true);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.skillText, { color: colors.text }]}>
                      {skill.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                {skillsToDisplay.length > 4 && (
                  <Text
                    style={[
                      styles.moreSkillsText,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    +{skillsToDisplay.length - 4} {t("more")}
                  </Text>
                )}
              </View>
            );
          })()}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <View style={{ flex: 1, flexWrap: "nowrap" }}>
              <Text
                style={[styles.clientName, { color: colors.tabIconDefault }]}
              >
                {t("postedBy")} {order.Client.name} •{" "}
                {new Date(order.createdAt).toLocaleDateString()}
              </Text>
              {order.Service && (
                <Text style={[styles.serviceName, { color: colors.tint }]}>
                  {order.Service.name}
                </Text>
              )}
            </View>
            {/* Apply Button - Only show for other users' orders (not owner) */}
            {!isMyOrders &&
              order.status === "open" &&
              !hasAppliedToOrder(order.id) &&
              user?.id !== order.clientId &&
              order.creditCost && (
                <Button
                  onPress={() => handleApplyToOrder(order)}
                  title={`${t("apply")} (${order.creditCost} ${t("credit")})`}
                  icon="paperplane.fill"
                  variant="primary"
                />
              )}

            {/* Applied Status - Show when user has already applied */}

            {!isMyOrders &&
              order.status === "open" &&
              hasAppliedToOrder(order.id) &&
              user?.id !== order.clientId && (
                <Button
                  onPress={() => {}}
                  variant="primary"
                  icon="checkmark.circle.fill"
                  iconSize={16}
                  iconPosition="left"
                  title={t("applied")}
                  disabled={true}
                />
              )}

            {/* Cancel Button - Only show for My Jobs */}
            {isMyJobs && order.Proposals && order.Proposals.length > 0 && (
              <Button
                variant="outline"
                onPress={() => handleCancelProposal(order)}
                icon="xmark.circle"
                iconSize={16}
                iconPosition="left"
                title={t("cancel")}
                textColor="#FF3B30"
              />
            )}

            {/* Delete Button - Only show for user's own orders */}
            {isMyOrders && order.status !== "pending" && (
              <Button
                variant="outline"
                icon="trash"
                iconSize={16}
                iconPosition="left"
                title={t("delete")}
                textColor="#FF3B30"
                onPress={() => handleDeleteOrder(order)}
              />
            )}
          </View>
        </View>
      </ResponsiveCard>

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

      {/* Skill Description Modal */}
      <SkillDescriptionModal
        visible={showSkillModal}
        skillId={selectedSkillId}
        onClose={() => {
          setShowSkillModal(false);
          setSelectedSkillId(null);
        }}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bannerImageContainer: {
    width: "100%",
    height: 200,
    marginBottom: 16,
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
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  orderTitleContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: 12,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    lineHeight: 26,
  },
  bookmarkButton: {
    padding: 4,
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "white",
  },
  orderDescription: {
    fontSize: 14,
    marginBottom: 10,
  },
  orderDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    flexShrink: 1,
    maxWidth: "100%",
    flex: 1,
    minWidth: 0,
  },
  detailIconContainer: {
    marginTop: 2,
  },
  detailText: {
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
    flex: 1,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  skillTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 10,
    fontWeight: "600",
  },
  moreSkillsText: {
    fontSize: 12,
    fontStyle: "italic",
    opacity: 0.7,
  },
  clientName: {
    fontSize: 13,
    opacity: 0.7,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 2,
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
