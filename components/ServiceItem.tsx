import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DaySchedule, WeeklySchedule } from "./WeeklySchedulePicker";
import React, { useMemo, useState } from "react";
import { Spacing, ThemeColors, Typography } from "@/constants/styles";

import { Badge } from "@/components/ui/badge";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { router } from "expo-router";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";

interface ServiceItemProps {
  service: {
    id: number;
    name: string;
    nameEn?: string;
    nameRu?: string;
    nameHy?: string;
    description?: string;
    BannerImage?: {
      id: number;
      fileUrl: string;
      fileType: string;
    } | null;
    weeklySchedule?: WeeklySchedule;
    rating?: number;
    verified?: boolean;
    location?: string;
    _count?: {
      Members?: number;
      Orders?: number;
      Reviews?: number;
    };
    Members?: any[];
    Orders?: any[];
    status?: string;
    createdBy?: number;
  };
  onPress?: () => void;
  isOwner?: boolean;
}

export const ServiceItem: React.FC<ServiceItemProps> = ({
  service,
  onPress,
  isOwner = false,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(true);

  // Helper function to get localized name
  const getLocalizedName = (): string => {
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

  const displayName = getLocalizedName();

  // Get today's schedule
  const todaySchedule = useMemo(() => {
    if (!service.weeklySchedule) return null;

    const today = new Date();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayName = dayNames[today.getDay()] as keyof WeeklySchedule;
    const schedule = service.weeklySchedule[dayName] as DaySchedule | undefined;

    if (schedule?.enabled && schedule?.workHours) {
      return schedule.workHours;
    }
    return null;
  }, [service.weeklySchedule]);

  // Check if currently open
  const isOpenNow = useMemo(() => {
    if (!todaySchedule) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    return currentTime >= todaySchedule.start && currentTime <= todaySchedule.end;
  }, [todaySchedule]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      if (isOwner) {
        router.push(`/services/create?id=${service.id}`);
      } else {
        router.push(`/services/${service.id}`);
      }
    }
  };

  const memberCount = service._count?.Members || service.Members?.length || 0;

  // Status configuration
  const statusConfig = {
    active: { color: colors.success, icon: "checkmark.circle.fill" },
    draft: { color: colors.warning, icon: "clock.circle.fill" },
    inactive: { color: colors.textTertiary, icon: "xmark.circle.fill" },
    pending: { color: colors.warning, icon: "clock.circle.fill" },
  };

  const getStatusColor = (status?: string) =>
    statusConfig[status as keyof typeof statusConfig]?.color ||
    statusConfig.active.color;

  const getStatusIcon = (status?: string) =>
    statusConfig[status as keyof typeof statusConfig]?.icon ||
    statusConfig.active.icon;

  const serviceStatus = service.status || "active";

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1} style={styles.wrapper}>
      <ResponsiveCard padding={0} marginHorizontal={0} marginBlock={Spacing.xs} style={styles.card}>
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
            source={{
              uri: service.BannerImage?.fileUrl || "",
            }}
            style={[
              styles.bannerImage,
              imageLoading && styles.bannerImageHidden,
            ]}
            contentFit="cover"
            cachePolicy="memory-disk"
            onLoadStart={() => {
              const hasUri = !!service.BannerImage?.fileUrl;
              setImageLoading(hasUri);
              setImageError(!hasUri);
            }}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            transition={150}
          />
          {imageError && (
            <View style={[styles.bannerImageSkeleton, { backgroundColor: colors.border }]}>
              <IconSymbol
                name="building.2"
                size={18}
                color={colors.tabIconDefault}
              />
            </View>
          )}
        </View>

        <View style={[styles.contentContainer, { padding: Spacing.sm }]}>
          {/* Header */}
          <View style={styles.serviceHeader}>
            <View style={styles.serviceTitleContainer}>
              <Text style={[styles.serviceTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                {displayName}
              </Text>
              {service.verified && (
                <View style={styles.verifiedBadge}>
                  <IconSymbol
                    name="checkmark.seal.fill"
                    size={12}
                    color={colors.success}
                  />
                </View>
              )}
            </View>
            <Badge
              text={t(serviceStatus) || serviceStatus}
              icon={getStatusIcon(serviceStatus)}
              iconSize={10}
              backgroundColor={getStatusColor(serviceStatus)}
              textColor={colors.textInverse}
              iconColor={colors.textInverse}
              size="sm"
              style={{ marginLeft: 4 }}
            />
          </View>

          {/* Description */}
          {service.description && service.description.trim() && (
            <Text
              style={[styles.serviceDescription, { color: colors.tabIconDefault }]}
              numberOfLines={2}
            >
              {service.description}
            </Text>
          )}

          {/* Service Details - 2x2 Grid */}
          <View style={styles.serviceDetails}>
            {/* Row 1 */}
            <View style={styles.detailRow}>
              {/* Cell 1: Rating */}
              <View style={styles.detailCell}>
                <IconSymbol
                  name="star.fill"
                  size={12}
                  color={(service.rating ?? 0) > 0 ? colors.rating : colors.tabIconDefault}
                />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {(service.rating ?? 0) > 0 ? service.rating!.toFixed(1) : "N/A"}
                </Text>
              </View>

              {/* Cell 2: Hours */}
              <View style={styles.detailCell}>
                <IconSymbol
                  name={isOpenNow ? "clock.fill" : "clock"}
                  size={12}
                  color={isOpenNow ? colors.openNow : colors.tint}
                />
                <Text
                  style={[
                    styles.detailText,
                    {
                      color: isOpenNow ? colors.openNow : colors.text,
                      fontWeight: isOpenNow ? "600" : "500",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {isOpenNow
                    ? (t("openNow") || "Open Now")
                    : todaySchedule
                    ? `${todaySchedule?.start || ""} - ${todaySchedule?.end || ""}`
                    : (t("hoursNotSet") || "Hours not set")}
                </Text>
              </View>
            </View>

            {/* Row 2 */}
            <View style={styles.detailRow}>
              {/* Cell 3: Location */}
              <View style={styles.detailCell}>
                <IconSymbol
                  name="location.fill"
                  size={12}
                  color={service.location && service.location.trim() ? colors.tint : colors.tabIconDefault}
                />
                <Text
                  style={[styles.detailText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {service.location && service.location.trim()
                    ? service.location
                    : (t("noLocation") || "No location")}
                </Text>
              </View>

              {/* Cell 4: Members */}
              <View style={styles.detailCell}>
                <IconSymbol
                  name="person.3.fill"
                  size={12}
                  color={memberCount > 0 ? colors.tint : colors.tabIconDefault}
                />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {memberCount > 0
                    ? `${memberCount} ${memberCount === 1 ? (t("member") || "member") : (t("members") || "members")}`
                    : (t("noMembers") || "No members")}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ResponsiveCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    marginHorizontal: Spacing.xs,
    height: 240,
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
  serviceName: {
    fontSize: 12,
    fontWeight: Typography.bold,
    textAlign: "right",
    position: "absolute",
    bottom: 5,
    left: 10,
    zIndex: 1,
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  serviceTitleContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: 8,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    lineHeight: 18,
  },
  verifiedBadge: {
    marginLeft: 4,
    padding: 2,
  },
  serviceDescription: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: "column",
    marginBottom: 0,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 6,
    justifyContent: "space-between",
  },
  detailCell: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  detailText: {
    fontSize: 10,
    fontWeight: "500",
    marginLeft: 4,
    flexShrink: 1,
  },
  card: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-start",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
});
