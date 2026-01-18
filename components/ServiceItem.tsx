import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors, Typography } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { WeeklySchedule, DaySchedule } from "./WeeklySchedulePicker";

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
    active: { color: "#4CAF50", icon: "checkmark.circle.fill" },
    draft: { color: "#FF9800", icon: "clock.circle.fill" },
    inactive: { color: "#9E9E9E", icon: "xmark.circle.fill" },
    pending: { color: "#FF9800", icon: "clock.circle.fill" },
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
                    color="#4CAF50"
                  />
                </View>
              )}
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(serviceStatus) },
              ]}
            >
              <IconSymbol
                name={getStatusIcon(serviceStatus) as any}
                size={10}
                color="white"
              />
              <Text style={styles.statusText}>
                {t(serviceStatus) || serviceStatus}
              </Text>
            </View>
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

          {/* Service Details */}
          <View style={styles.serviceDetails}>
            {/* Rating */}
            {(service.rating ?? 0) > 0 && (
              <View style={styles.detailItem}>
                <IconSymbol
                  name="star.fill"
                  size={12}
                  color="#FFD700"
                />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {service.rating!.toFixed(1)}
                </Text>
              </View>
            )}

            {/* Hours */}
            {todaySchedule ? (
              <View style={styles.detailItem}>
                <IconSymbol
                  name={isOpenNow ? "clock.fill" : "clock"}
                  size={12}
                  color={isOpenNow ? "#34C759" : colors.tint}
                />
                <Text
                  style={[
                    styles.detailText,
                    {
                      color: isOpenNow ? "#34C759" : colors.text,
                      fontWeight: isOpenNow ? "600" : "500",
                    },
                  ]}
                >
                  {isOpenNow
                    ? (t("openNow") || "Open Now")
                    : `${todaySchedule?.start || ""} - ${todaySchedule?.end || ""}`}
                </Text>
              </View>
            ) : (
              <View style={styles.detailItem}>
                <IconSymbol name="clock" size={12} color={colors.tint} />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {t("hoursNotSet") || "Hours not set"}
                </Text>
              </View>
            )}

            {/* Location */}
            {service.location && service.location.trim() && (
              <View style={styles.detailItem}>
                <IconSymbol
                  name="location.fill"
                  size={12}
                  color={colors.tint}
                />
                <Text
                  style={[styles.detailText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {service.location}
                </Text>
              </View>
            )}

            {/* Members */}
            {memberCount > 0 && (
              <View style={styles.detailItem}>
                <IconSymbol
                  name="person.3.fill"
                  size={12}
                  color={colors.tint}
                />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {memberCount} {memberCount === 1 ? (t("member") || "member") : (t("members") || "members")}
                </Text>
              </View>
            )}

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
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
    color: "white",
    marginLeft: 4,
  },
  serviceDescription: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 0,
    alignItems: "flex-start",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    marginBottom: 4,
    flexShrink: 1,
    maxWidth: "100%",
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
