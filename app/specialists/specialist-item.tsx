import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { RateUnit } from "@/hooks/useRateUnits";
import React from "react";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { SpecialistProfile } from "@/categories/api";
import { ThemeColors } from "@/constants/styles";
import { formatPriceRangeDisplay } from "@/utils/currencyRateUnit";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/contexts/TranslationContext";

interface SpecialistItemProps {
  specialist: SpecialistProfile;
  onPress: (specialistId: number) => void;
  onHire: (specialist: SpecialistProfile) => void;
  onImageError: (specialistId: number) => void;
  imageErrors: Set<number>;
  rateUnits: RateUnit[];
}

const renderStars = (rating: number, colors: typeof ThemeColors.light) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <IconSymbol key={i} name="star.fill" size={14} color={colors.rating} />
    );
  }

  if (hasHalfStar) {
    stars.push(
      <IconSymbol
        key="half"
        name="star.leadinghalf.filled"
        size={14}
        color={colors.rating}
      />
    );
  }

  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      <IconSymbol key={`empty-${i}`} name="star" size={14} color="#E0E0E0" />
    );
  }

  return stars;
};

export const SpecialistItem: React.FC<SpecialistItemProps> = ({
  specialist,
  onPress,
  onHire,
  onImageError,
  imageErrors,
  rateUnits,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => onPress(specialist.id)}
    >
      <ResponsiveCard padding={0}>
        <View style={styles.specialistCard}>
          <View style={styles.specialistHeader}>
            <View
              style={[
                styles.avatarContainer,
                { backgroundColor: colors.border },
              ]}
            >
              {specialist.User?.avatarUrl &&
              !imageErrors.has(specialist.id) ? (
                <Image
                  source={{ uri: specialist.User?.avatarUrl }}
                  style={styles.avatar}
                  onError={() => onImageError(specialist.id)}
                />
              ) : (
                <View style={styles.defaultAvatar}>
                  <IconSymbol
                    name="person.fill"
                    size={30}
                    color={colors.tabIconDefault}
                  />
                </View>
              )}
            </View>
            <View style={styles.specialistInfo}>
              <Text style={[styles.specialistName, { color: colors.text }]}>
                {specialist.User?.name || t("deletedUser")}
              </Text>
              <Text style={[styles.specialistTitle, { color: colors.tint }]}>
                {specialist.Category?.name || t("specialist")}
              </Text>
              <View style={styles.ratingContainer}>
                {specialist.averageRating && specialist.averageRating > 0 ? (
                  <>
                    <View style={styles.stars}>
                      {renderStars(specialist.averageRating, colors as typeof ThemeColors.light)}
                    </View>
                    <Text style={[styles.ratingText, { color: colors.text }]}>
                      {specialist.averageRating.toFixed(1)} (
                      {specialist.reviewCount || 0})
                    </Text>
                  </>
                ) : (
                  <Text
                    style={[
                      styles.ratingText,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t("notRatedYet")}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.availabilityBadge}>
              <View
                style={[
                  styles.availabilityDot,
                  {
                    backgroundColor: specialist.User?.verified
                      ? colors.success
                      : colors.warning,
                  },
                ]}
              />
              <Text style={[styles.availabilityText, { color: colors.text }]}>
                {specialist.User?.verified ? t("verified") : t("unverified")}
              </Text>
            </View>
          </View>

          <Text style={[styles.bio, { color: colors.tabIconDefault }]}>
            {specialist.User.bio || t("defaultSpecialistBio")}
          </Text>

          <View style={styles.specialistDetails}>
            <View style={styles.detailItem}>
              <IconSymbol
                name="dollarsign.circle.fill"
                size={16}
                color={colors.tint}
              />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {specialist.priceMin && specialist.priceMax
                  ? formatPriceRangeDisplay(
                      specialist.priceMin,
                      specialist.priceMax,
                      specialist.currency,
                      specialist.rateUnit,
                      rateUnits,
                      language
                    )
                  : t("priceNegotiable")}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <IconSymbol
                name="location.fill"
                size={16}
                color={colors.tint}
              />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {specialist.location || t("remote")}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <IconSymbol
                name="briefcase.fill"
                size={16}
                color={colors.tint}
              />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {specialist.experienceYears || 0} {t("yearsExp")}
              </Text>
            </View>
          </View>

          <View style={styles.skillsContainer}>
            {specialist.Category?.technologies
              ?.slice(0, 5)
              .map((skill, index) => (
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
                    {skill.name}
                  </Text>
                </View>
              )) || (
              <Text
                style={[styles.skillText, { color: colors.tabIconDefault }]}
              >
                {t("noSkillsListed")}
              </Text>
            )}
            {(specialist.Category?.technologies?.length || 0) > 5 && (
              <Text
                style={[
                  styles.moreSkillsText,
                  { color: colors.tabIconDefault },
                ]}
              >
                +{(specialist.Category?.technologies?.length || 0) - 5}{" "}
                {t("more")}
              </Text>
            )}
          </View>

          <View style={styles.specialistFooter}>
            <View style={styles.statsContainer}>
              <Text style={[styles.statText, { color: colors.text }]}>
                {specialist._count?.Proposals || 0} {t("proposalsSent")}
              </Text>
              <Text style={[styles.statText, { color: colors.text }]}>
                {specialist.experienceYears || 0} {t("yearsExperience")}
              </Text>
            </View>
            {specialist.User?.id !== user?.id && (
              <TouchableOpacity
                style={[
                  styles.hireButton,
                  {
                    backgroundColor: colors.tint,
                  },
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  onHire(specialist);
                }}
              >
                <Text
                  style={[
                    styles.hireButtonText,
                    { color: colors.background },
                  ]}
                >
                  {t("hire")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ResponsiveCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  specialistCard: {
    padding: 20,
    borderRadius: 16,
  },
  specialistHeader: {
    flexDirection: "row",
    marginBottom: 16,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  defaultAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  specialistInfo: {
    flex: 1,
  },
  specialistName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    lineHeight: 26,
  },
  specialistTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    opacity: 0.8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stars: {
    flexDirection: "row",
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
  },
  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  availabilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  availabilityText: {
    fontSize: 13,
    fontWeight: "600",
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    opacity: 0.8,
  },
  specialistDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    fontWeight: "600",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  skillTag: {
    paddingHorizontal: 10,
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
  specialistFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  statsContainer: {
    flex: 1,
  },
  statText: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 2,
  },
  hireButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 70,
  },
  hireButtonText: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
});
