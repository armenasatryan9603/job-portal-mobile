import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Button } from "@/components/ui/button";
import { ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Order, apiService } from "@/services/api";
import { markOrderAsViewed } from "@/utils/viewedOrdersStorage";

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

  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [saved, setSaved] = useState(isSaved);
  const [saving, setSaving] = useState(false);

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

  // Update saved state when isSaved prop changes
  React.useEffect(() => {
    setSaved(isSaved);
  }, [isSaved]);

  return (
    <TouchableOpacity onPress={() => handleOrderPress(order)} activeOpacity={1}>
      <ResponsiveCard
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
        {order.BannerImage && (
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
              source={{ uri: order.BannerImage.fileUrl }}
              style={[
                styles.bannerImage,
                imageLoading && styles.bannerImageHidden,
              ]}
              resizeMode="cover"
              onLoadStart={() => {
                setImageLoading(true);
                setImageError(false);
              }}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
            {imageError && (
              <View
                style={[
                  styles.bannerImageSkeleton,
                  { backgroundColor: colors.border },
                ]}
              >
                <IconSymbol
                  name="photo"
                  size={24}
                  color={colors.tabIconDefault}
                />
              </View>
            )}
          </View>
        )}
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
          numberOfLines={5}
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
              ${order.budget.toLocaleString()}
            </Text>
          </View>
          {order.location && (
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <IconSymbol
                  name="location.fill"
                  size={16}
                  color={colors.tint}
                />
              </View>
              <Text
                style={[styles.detailText, { color: colors.text }]}
                numberOfLines={2}
              >
                {order.location}
              </Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <IconSymbol name="person.fill" size={16} color={colors.tint} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {order._count?.Proposals ?? order.Proposals?.length ?? 0}{" "}
              {t("application")}
            </Text>
          </View>
        </View>

        {order.skills && order.skills.length > 0 && (
          <View style={styles.skillsContainer}>
            {order.skills.slice(0, 4).map((skill, index) => (
              <View
                key={index}
                style={[
                  styles.skillTag,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.skillText, { color: colors.text }]}>
                  {skill}
                </Text>
              </View>
            ))}
            {order.skills.length > 4 && (
              <Text
                style={[
                  styles.moreSkillsText,
                  { color: colors.tabIconDefault },
                ]}
              >
                +{order.skills.length - 4} {t("more")}
              </Text>
            )}
          </View>
        )}

        <View>
          <Text style={[styles.clientName, { color: colors.tabIconDefault }]}>
            {t("postedBy")} {order.Client.name} •{" "}
            {new Date(order.createdAt).toLocaleDateString()}
          </Text>
          {order.Service && (
            <Text style={[styles.serviceName, { color: colors.tint }]}>
              {order.Service.name}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
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
      </ResponsiveCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bannerImageContainer: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    position: "relative",
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  bannerImageHidden: {
    opacity: 0,
  },
  bannerImageSkeleton: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    borderRadius: 12,
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
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    opacity: 0.8,
  },
  orderDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 16,
    alignItems: "center",
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
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
    flex: 1,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  skillTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 12,
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
    marginTop: 12,
    justifyContent: "flex-end",
    gap: 12,
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
