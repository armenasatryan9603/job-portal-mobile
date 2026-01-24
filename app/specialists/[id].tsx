import { Footer, FooterButton } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { Badge } from "@/components/ui/badge";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors, Typography } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useLocalSearchParams } from "expo-router";
import { useRateUnits, RateUnit } from "@/hooks/useRateUnits";
import { formatPriceRangeDisplay } from "@/utils/currencyRateUnit";
import React, { useState, useEffect } from "react";
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
} from "react-native";
import { apiService, SpecialistProfile } from "@/categories/api";
import { useAnalytics } from "@/hooks/useAnalytics";
import AnalyticsService from "@/categories/AnalyticsService";
import { SpecialistDetailSkeleton } from "@/components/SpecialistDetailSkeleton";
import { HiringDialog } from "@/components/HiringDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { useMyOrders } from "@/hooks/useApi";

export default function SpecialistDetailScreen() {
  useAnalytics("SpecialistDetail");
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { data: rateUnitsData } = useRateUnits();
  const rateUnits: RateUnit[] = rateUnitsData || [];
  const { isAuthenticated, user } = useAuth();
  const { showLoginModal } = useModal();
  const { data: ordersData } = useMyOrders();

  // API state management
  const [specialist, setSpecialist] = useState<SpecialistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerImage, setBannerImage] = useState<string | null>(null);

  // Hiring dialog state
  const [hiringDialogVisible, setHiringDialogVisible] = useState(false);
  const [hiringLoading, setHiringLoading] = useState(false);

  const userOrders = ordersData?.orders || [];

  const specialistId = parseInt(id as string);

  // Fetch specialist details from API
  useEffect(() => {
    if (specialistId) {
      fetchSpecialistDetails();
    }
  }, [specialistId]);

  const fetchSpecialistDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const specialistData = await apiService.getSpecialistById(specialistId);

      setSpecialist(specialistData);
      // Extract banner URL from User object
      const bannerUrl = specialistData.User.bannerUrl || null;
      setBannerImage(bannerUrl);
      // Track specialist view
      AnalyticsService.getInstance().logSpecialistViewed(
        specialistId.toString()
      );
    } catch (err) {
      console.error("Error fetching specialist details:", err);
      setError(t("failedToLoadSpecialistDetails"));
      Alert.alert(t("error"), t("failedToLoadSpecialistDetails"));
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return <SpecialistDetailSkeleton />;
  }

  // Show error state
  if (error || !specialist) {
    return (
      <Layout
        header={
          <Header
            showBackButton
            title={t("specialistNotFound")}
            onBackPress={() => router.back()}
          />
        }
        footer={null}
      >
        <View
          style={[
            styles.errorContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error || t("specialistNotFound")}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={fetchSpecialistDetails}
          >
            <Text
              style={[styles.retryButtonText, { color: colors.background }]}
            >
              {t("retry")}
            </Text>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }

  const handleHireSpecialist = () => {
    if (!specialist) return;

    // Track hire specialist action
    AnalyticsService.getInstance().logEvent("hire_specialist_initiated", {
      specialist_id: specialist.id.toString(),
    });

    // Check if user is authenticated
    if (!isAuthenticated) {
      // User is not logged in, show login modal
      showLoginModal();
      return;
    }

    // Check if user has existing orders
    if (userOrders.length > 0) {
      // User has orders, show hiring dialog
      setHiringDialogVisible(true);
    } else {
      // User has no orders, redirect to create order page
      router.push(`/orders/create?specialistId=${specialistId}`);
    }
  };

  const handleHiringSubmit = async (message: string, orderId: number) => {
    if (!specialist) return;

    try {
      setHiringLoading(true);
      const result = await apiService.hireSpecialist({
        specialistId: specialist.id,
        message,
        orderId,
      });

      // Track successful hiring
      AnalyticsService.getInstance().logEvent("specialist_hired", {
        specialist_id: specialist.id.toString(),
        order_id: orderId.toString(),
      });

      // Navigate to the conversation after successful hiring
      if (result.conversation?.id) {
        router.push(`/chat/${result.conversation.id}`);
      } else {
        Alert.alert(t("success"), t("hiringRequestSent"));
      }

      setHiringDialogVisible(false);
    } catch (error) {
      console.error("Error hiring specialist:", error);
      Alert.alert(t("error"), t("failedToSendHiringRequest"));
    } finally {
      setHiringLoading(false);
    }
  };

  const handleHiringClose = () => {
    setHiringDialogVisible(false);
  };

  const formatTimeDifference = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInMs = now.getTime() - created.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInDays < 30) {
      return { value: t("recently"), label: t("newMember") };
    } else if (diffInMonths < 12) {
      return {
        value: `${diffInMonths} month${diffInMonths === 1 ? "" : "s"}`,
        label: t("memberFor"),
      };
    } else {
      return {
        value: `${diffInYears} year${diffInYears === 1 ? "" : "s"}`,
        label: t("memberFor"),
      };
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <IconSymbol key={i} name="star.fill" size={16} color={colors.rating} />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <IconSymbol
          key="half"
          name="star.leadinghalf.filled"
          size={16}
          color={colors.rating}
        />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <IconSymbol key={`empty-${i}`} name="star" size={16} color={colors.border} />
      );
    }

    return stars;
  };

  const header = (
    <Header
      title={t("specialistProfile")}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  return (
    <Layout header={header}>
      <ScrollView
        style={{ flex: 1, marginBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Specialist Overview */}
          <ResponsiveCard padding={0} style={{ overflow: "hidden" }}>
            <View style={styles.overviewSection}>
              {bannerImage && (
                <View style={styles.bannerWrapper}>
                  <ImageBackground
                    source={{ uri: bannerImage }}
                    style={styles.bannerBackground}
                    imageStyle={styles.bannerImageStyle}
                  >
                    {/* Overlay for better text readability */}
                    <View style={styles.bannerOverlay} />
                  </ImageBackground>
                </View>
              )}
              {/* Header with avatar and basic info */}
              <View style={styles.specialistHeader}>
                <View style={styles.avatarContainer}>
                  {specialist.User?.avatarUrl ? (
                    <Image
                      source={{ uri: specialist.User?.avatarUrl }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        styles.defaultAvatar,
                        { backgroundColor: colors.border },
                      ]}
                    >
                      <IconSymbol
                        name="person.fill"
                        size={45}
                        color={colors.tabIconDefault}
                      />
                    </View>
                  )}
                  {/* Verification badge on avatar */}
                  {specialist.User?.verified && (
                    <View style={styles.verificationBadge}>
                      <IconSymbol
                        name="checkmark.seal.fill"
                        size={24}
                        color={colors.success}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.specialistInfo}>
                  <Text style={[styles.specialistName, { color: colors.text }]}>
                    {specialist.User?.name || t("deletedUser")}
                  </Text>
                  <Text
                    style={[styles.specialistTitle, { color: colors.tint }]}
                  >
                    {specialist.User?.name || t("specialist")}
                  </Text>

                  {/* Rating with better design */}
                  <View style={styles.ratingContainer}>
                    {specialist.reviewCount && specialist.reviewCount > 0 ? (
                      <>
                        <View style={styles.ratingBadge}>
                          <View style={styles.stars}>
                            {renderStars(specialist.averageRating || 0)}
                          </View>
                          <Text
                            style={[
                              styles.ratingNumber,
                              { color: colors.text },
                            ]}
                          >
                            {specialist.averageRating || 0}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.reviewCount,
                            { color: colors.tabIconDefault },
                          ]}
                        >
                          ({specialist.reviewCount || 0} {t("reviews")})
                        </Text>
                      </>
                    ) : (
                      <Text
                        style={[
                          styles.notRatedText,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {t("notRatedYet")}
                      </Text>
                    )}
                  </View>

                  {/* Status badges */}
                  <View style={styles.badgesContainer}>
                    <Badge
                      text={specialist.User?.verified ? t("verified") : t("pending")}
                      variant={specialist.User?.verified ? "verified" : "pending"}
                      icon={specialist.User?.verified ? "checkmark.circle.fill" : "clock.fill"}
                      iconSize={14}
                      size="md"
                    />

                    {specialist.experienceYears && (
                      <Badge
                        text={`${specialist.experienceYears} ${t("yearsExperience") || "years"}`}
                        variant="default"
                        backgroundColor={colors.tint + "20"}
                        textColor={colors.tint}
                        size="md"
                      />
                    )}
                  </View>
                </View>
              </View>
              {/*  */}
              <View style={{ gap: 10, marginTop: 40 }}>
                {/* Bio section with better styling */}
                <Text style={[styles.bio, { color: colors.text }]}>
                  {specialist.User.bio || t("professionalSpecialistReady")}
                </Text>

                {/* Quick stats */}
                <View style={styles.quickStats}>
                  <View
                    style={[
                      styles.statItem,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <IconSymbol
                      name="briefcase.fill"
                      size={16}
                      color={colors.tint}
                    />
                    <Text style={[styles.statNumber, { color: colors.text }]}>
                      {specialist._count?.Proposals || 0}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {t("projects")}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statItem,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <IconSymbol name="star.fill" size={16} color={colors.rating} />
                    <Text style={[styles.statNumber, { color: colors.text }]}>
                      {(specialist.averageRating || 0).toFixed(1)}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {t("rating")}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statItem,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <IconSymbol name="calendar" size={16} color={colors.tint} />
                    {(() => {
                      const timeInfo = formatTimeDifference(
                        specialist.User.createdAt
                      );
                      return (
                        <>
                          <Text style={[styles.bio, { color: colors.text }]}>
                            {timeInfo.value}
                          </Text>
                          <Text
                            style={[
                              styles.statLabel,
                              { color: colors.tabIconDefault },
                            ]}
                          >
                            {timeInfo.label}
                          </Text>
                        </>
                      );
                    })()}
                  </View>
                </View>
              </View>
              {specialist.User?.id !== user?.id && (
                <TouchableOpacity
                  style={[
                    styles.hireButton,
                    {
                      backgroundColor: colors.tint,
                    },
                  ]}
                  onPress={handleHireSpecialist}
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
            {/* </View> */}
          </ResponsiveCard>

          {/* Specialist Details */}
          <ResponsiveCard>
            <View style={styles.detailsGrid}>
              {/* Price Range */}
              <View
                style={[
                  styles.detailCard,
                  { backgroundColor: colors.background },
                ]}
              >
                <View
                  style={[
                    styles.detailIconContainer,
                    { backgroundColor: colors.tint + "15" },
                  ]}
                >
                  <IconSymbol
                    name="dollarsign.circle.fill"
                    size={18}
                    color={colors.tint}
                  />
                </View>
                <View style={styles.detailCardContent}>
                  <Text
                    style={[
                      styles.detailCardLabel,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t("hourlyRate")}
                  </Text>
                  <Text
                    style={[styles.detailCardValue, { color: colors.text }]}
                  >
                    {specialist.priceMin && specialist.priceMax
                      ? formatPriceRangeDisplay(
                          specialist.priceMin,
                          specialist.priceMax,
                          specialist.currency,
                          specialist.rateUnit,
                          rateUnits,
                          language
                        )
                      : t("negotiable")}
                  </Text>
                </View>
              </View>

              {/* Location */}
              <View
                style={[
                  styles.detailCard,
                  { backgroundColor: colors.background },
                ]}
              >
                <View
                  style={[
                    styles.detailIconContainer,
                    { backgroundColor: colors.tint + "15" },
                  ]}
                >
                  <IconSymbol
                    name="location.fill"
                    size={18}
                    color={colors.tint}
                  />
                </View>
                <View style={styles.detailCardContent}>
                  <Text
                    style={[
                      styles.detailCardLabel,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t("location")}
                  </Text>
                  <Text
                    style={[styles.detailCardValue, { color: colors.text }]}
                  >
                    {specialist.location || t("remote")}
                  </Text>
                </View>
              </View>

              {/* Experience */}
              <View
                style={[
                  styles.detailCard,
                  { backgroundColor: colors.background },
                ]}
              >
                <View
                  style={[
                    styles.detailIconContainer,
                    { backgroundColor: colors.tint + "15" },
                  ]}
                >
                  <IconSymbol
                    name="briefcase.fill"
                    size={18}
                    color={colors.tint}
                  />
                </View>
                <View style={styles.detailCardContent}>
                  <Text
                    style={[
                      styles.detailCardLabel,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t("experience")}
                  </Text>
                  <Text
                    style={[styles.detailCardValue, { color: colors.text }]}
                  >
                    {specialist.experienceYears || 0} {t("years")}
                  </Text>
                </View>
              </View>

              {/* Projects Completed */}
              <View
                style={[
                  styles.detailCard,
                  { backgroundColor: colors.background },
                ]}
              >
                <View
                  style={[
                    styles.detailIconContainer,
                    { backgroundColor: colors.success + "15" },
                  ]}
                >
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={18}
                    color={colors.success}
                  />
                </View>
                <View style={styles.detailCardContent}>
                  <Text
                    style={[
                      styles.detailCardLabel,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t("projects")}
                  </Text>
                  <Text
                    style={[styles.detailCardValue, { color: colors.text }]}
                  >
                    {specialist._count?.Proposals || 0} {t("sent")}
                  </Text>
                </View>
              </View>
            </View>
          </ResponsiveCard>

          {/* Skills */}
          <ResponsiveCard style={{ paddingTop: 0 }}>
            <View style={styles.skillsHeader}>
              {specialist.Category?.technologies &&
                specialist.Category.technologies.length > 0 && (
                  <View
                    style={[
                      styles.skillsCount,
                      { backgroundColor: colors.tint + "15" },
                    ]}
                  >
                    <Text
                      style={[styles.skillsCountText, { color: colors.tint }]}
                    >
                      {specialist.Category.technologies.length}
                    </Text>
                  </View>
                )}
            </View>

            <View style={styles.skillsContainer}>
              {specialist.Category?.technologies &&
              specialist.Category.technologies.length > 0 ? (
                specialist.Category.technologies.map((skill, index) => (
                  <View
                    key={index}
                    style={[
                      styles.modernSkillTag,
                      {
                        backgroundColor: colors.tint + "10",
                        borderColor: colors.tint + "30",
                      },
                    ]}
                  >
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={14}
                      color={colors.tint}
                    />
                    <Text
                      style={[styles.modernSkillText, { color: colors.tint }]}
                    >
                      {skill.name}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.noSkillsContainer}>
                  <IconSymbol
                    name="exclamationmark.circle"
                    size={24}
                    color={colors.tabIconDefault}
                  />
                  <Text
                    style={[
                      styles.noSkillsText,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t("noSkillsListedYet")}
                  </Text>
                </View>
              )}
            </View>
          </ResponsiveCard>

          {/* Service Information */}
          {specialist.Category && (
            <ResponsiveCard>
              <View style={styles.serviceInfo}>
                <View style={styles.serviceItem}>
                  <IconSymbol
                    name="briefcase.fill"
                    size={16}
                    color={colors.tint}
                  />
                  <Text style={[styles.serviceText, { color: colors.text }]}>
                    {t("category")}: {specialist.Category.name}
                  </Text>
                </View>
                {specialist.Category.description && (
                  <View style={styles.serviceItem}>
                    <IconSymbol
                      name="info.circle.fill"
                      size={16}
                      color={colors.tint}
                    />
                    <Text style={[styles.serviceText, { color: colors.text }]}>
                      {specialist.Category.description}
                    </Text>
                  </View>
                )}
                {specialist.Category.completionRate != null && (
                  <View style={styles.serviceItem}>
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={16}
                      color={colors.tint}
                    />
                    <Text style={[styles.serviceText, { color: colors.text }]}>
                      {t("serviceSuccessRate")}:{" "}
                      {specialist.Category.completionRate}%
                    </Text>
                  </View>
                )}
              </View>
            </ResponsiveCard>
          )}

          {/* Reviews */}
          {specialist.reviews && specialist.reviews.length > 0 && (
            <ResponsiveCard>
              <View style={styles.reviewsList}>
                {specialist.reviews.map((review) => (
                  <View key={review.id} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewerInfo}>
                        <Text
                          style={[styles.reviewerName, { color: colors.text }]}
                        >
                          {review.Reviewer?.name || t("deletedUser")}
                        </Text>
                        <View style={styles.reviewRating}>
                          {renderStars(review.rating)}
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.reviewDate,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {new Date(review.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    {review.Order?.title && (
                      <Text
                        style={[styles.reviewProject, { color: colors.tint }]}
                      >
                        {t("project")}: {review.Order.title}
                      </Text>
                    )}
                    {review.comment && (
                      <Text
                        style={[styles.reviewComment, { color: colors.text }]}
                      >
                        {review.comment}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </ResponsiveCard>
          )}

          {/* Contact Information */}
          <ResponsiveCard>
            <View style={styles.contactInfo}>
              {specialist.User.email && (
                <View style={styles.contactItem}>
                  <IconSymbol
                    name="envelope.fill"
                    size={16}
                    color={colors.tint}
                  />
                  <Text style={[styles.contactText, { color: colors.text }]}>
                    {specialist.User.email}
                  </Text>
                </View>
              )}
              <View style={styles.contactItem}>
                <IconSymbol name="calendar" size={16} color={colors.tint} />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  {t("memberSince")}:{" "}
                  {new Date(specialist.User.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </ResponsiveCard>
        </ResponsiveContainer>
      </ScrollView>

      <HiringDialog
        visible={hiringDialogVisible}
        onClose={handleHiringClose}
        onSubmit={handleHiringSubmit}
        specialistName={specialist?.User.name || ""}
        specialistId={specialist?.id || 0}
        userOrders={userOrders}
        loading={hiringLoading}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  overviewSection: {
    position: "relative",
    gap: 20,
    padding: 16,
    backgroundColor: "transparent",
  },
  bannerWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    zIndex: 0,
    overflow: "hidden",
  },
  bannerBackground: {
    width: "100%",
    height: "100%",
  },
  bannerImageStyle: {
    resizeMode: "cover",
    opacity: 0.5,
  },
  bannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  specialistHeader: {
    gap: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  defaultAvatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  verificationBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 2,
  },
  specialistInfo: {
    flex: 1,
    gap: 8,
  },
  specialistName: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28,
  },
  specialistTitle: {
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stars: {
    flexDirection: "row",
    gap: 2,
  },
  ratingNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  reviewCount: {
    fontSize: 14,
    fontWeight: "500",
  },
  notRatedText: {
    fontSize: 14,
    fontWeight: "500",
    fontStyle: "italic",
  },
  badgesContainer: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  bio: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
  },
  quickStats: {
    flexDirection: "row",
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    gap: 6,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  footerButtons: {
    margin: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    marginBottom: 20,
  },
  // Details Section Styles
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  detailCard: {
    flex: 1,
    minWidth: "47%",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    gap: 10,
  },
  detailIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  detailCardContent: {
    flex: 1,
    gap: 2,
  },
  detailCardLabel: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.7,
  },
  detailCardValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Skills Section Styles
  skillsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  skillsCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillsCountText: {
    fontSize: 12,
    fontWeight: "700",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  modernSkillTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  modernSkillText: {
    fontSize: 14,
    fontWeight: "600",
  },
  noSkillsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
  },
  noSkillsText: {
    fontSize: 16,
    fontWeight: "500",
  },
  certificationsList: {
    gap: 12,
  },
  certificationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  certificationText: {
    fontSize: 15,
    flex: 1,
    fontWeight: "500",
  },
  languagesList: {
    gap: 12,
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  languageText: {
    fontSize: 15,
    flex: 1,
    fontWeight: "500",
  },
  reviewsList: {
    gap: 12,
  },
  reviewItem: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
    marginRight: 10,
  },
  reviewerName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: "row",
  },
  reviewProject: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
    opacity: 0.8,
  },
  reviewComment: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  reviewDate: {
    fontSize: 13,
    opacity: 0.7,
  },
  serviceInfo: {
    gap: 12,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  serviceText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
  },
  contactInfo: {
    gap: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactText: {
    fontSize: 15,
    flex: 1,
  },
});
