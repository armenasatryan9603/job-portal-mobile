import { Footer, FooterButton } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
  ResponsiveGrid,
} from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { apiService, SpecialistProfile } from "@/services/api";

export default function SpecialistDetailScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  // API state management
  const [specialist, setSpecialist] = useState<SpecialistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      console.log("specialistData:", JSON.stringify(specialistData, null, 2));
      setSpecialist(specialistData);
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
    return (
      <Layout
        header={
          <Header
            showBackButton
            title="Loading..."
            onBackPress={() => router.back()}
          />
        }
        footer={null}
      >
        <View
          style={[
            styles.loadingContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading specialist details...
          </Text>
        </View>
      </Layout>
    );
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
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }

  const handleHireSpecialist = () => {
    router.push(`/orders/create?specialistId=${specialistId}`);
  };

  const handleSendMessage = () => {
    // Navigate to messaging or contact form
    console.log(t("sendMessageToSpecialist"));
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
        <IconSymbol key={i} name="star.fill" size={16} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <IconSymbol
          key="half"
          name="star.leadinghalf.filled"
          size={16}
          color="#FFD700"
        />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <IconSymbol key={`empty-${i}`} name="star" size={16} color="#E0E0E0" />
      );
    }

    return stars;
  };

  const header = (
    <Header
      title={t("specialistProfile")}
      subtitle={specialist.User.name}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  const footer = (
    <Footer>
      <View style={styles.footerButtons}>
        <FooterButton
          title={t("hire")}
          onPress={handleHireSpecialist}
          variant="primary"
          icon="✓"
        />
        <FooterButton
          title={t("message")}
          onPress={handleSendMessage}
          variant="secondary"
          icon="💬"
        />
      </View>
    </Footer>
  );

  return (
    <Layout header={header} footer={footer}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          {/* Specialist Overview */}
          <ResponsiveCard style={styles.overviewCard}>
            <View style={styles.overviewSection}>
              {/* Header with avatar and basic info */}
              <View style={styles.specialistHeader}>
                <View style={styles.avatarContainer}>
                  {specialist.User.avatarUrl ? (
                    <Image
                      source={{ uri: specialist.User.avatarUrl }}
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
                  {specialist.User.verified && (
                    <View style={styles.verificationBadge}>
                      <IconSymbol
                        name="checkmark.seal.fill"
                        size={24}
                        color="#4CAF50"
                      />
                    </View>
                  )}
                </View>

                <View style={styles.specialistInfo}>
                  <Text style={[styles.specialistName, { color: colors.text }]}>
                    {specialist.User.name}
                  </Text>
                  <Text
                    style={[styles.specialistTitle, { color: colors.tint }]}
                  >
                    {specialist.Service?.name || t("specialist")}
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
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: specialist.User.verified
                            ? "#4CAF50"
                            : "#FFA500",
                        },
                      ]}
                    >
                      <IconSymbol
                        name={
                          specialist.User.verified
                            ? "checkmark.circle.fill"
                            : "clock.fill"
                        }
                        size={14}
                        color="white"
                      />
                      <Text style={styles.statusBadgeText}>
                        {specialist.User.verified
                          ? t("verified")
                          : t("pending")}
                      </Text>
                    </View>

                    {specialist.experienceYears && (
                      <View
                        style={[
                          styles.experienceBadge,
                          { backgroundColor: colors.tint + "20" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.experienceBadgeText,
                            { color: colors.tint },
                          ]}
                        ></Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Bio section with better styling */}
              <View style={styles.bioSection}>
                <Text style={[styles.bioTitle, { color: colors.text }]}>
                  About
                </Text>
                <Text style={[styles.bio, { color: colors.text }]}>
                  {specialist.User.bio ||
                    "Professional specialist ready to help with your project."}
                </Text>
              </View>

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
                    size={20}
                    color={colors.tint}
                  />
                  <Text style={[styles.statNumber, { color: colors.text }]}>
                    {specialist._count?.Proposals || 0}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.tabIconDefault }]}
                  >
                    Projects
                  </Text>
                </View>

                <View
                  style={[
                    styles.statItem,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <IconSymbol name="star.fill" size={20} color="#FFD700" />
                  <Text style={[styles.statNumber, { color: colors.text }]}>
                    {specialist.averageRating?.toFixed(1) || "0.0"}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.tabIconDefault }]}
                  >
                    Rating
                  </Text>
                </View>

                <View
                  style={[
                    styles.statItem,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <IconSymbol name="calendar" size={20} color={colors.tint} />
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
          </ResponsiveCard>

          {/* Specialist Details */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Professional Details
            </Text>

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
                    size={24}
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
                    Hourly Rate
                  </Text>
                  <Text
                    style={[styles.detailCardValue, { color: colors.text }]}
                  >
                    {specialist.priceMin && specialist.priceMax
                      ? `$${specialist.priceMin}-${specialist.priceMax}`
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
                    size={24}
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
                    Location
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
                    size={24}
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
                    Experience
                  </Text>
                  <Text
                    style={[styles.detailCardValue, { color: colors.text }]}
                  >
                    {specialist.experienceYears || 0} years
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
                    { backgroundColor: "#4CAF50" + "15" },
                  ]}
                >
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={24}
                    color="#4CAF50"
                  />
                </View>
                <View style={styles.detailCardContent}>
                  <Text
                    style={[
                      styles.detailCardLabel,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    Projects
                  </Text>
                  <Text
                    style={[styles.detailCardValue, { color: colors.text }]}
                  >
                    {specialist._count?.Proposals || 0} sent
                  </Text>
                </View>
              </View>
            </View>
          </ResponsiveCard>

          {/* Skills */}
          <ResponsiveCard>
            <View style={styles.skillsHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Skills & Technologies
              </Text>
              {specialist.Service?.technologies?.length && (
                <View
                  style={[
                    styles.skillsCount,
                    { backgroundColor: colors.tint + "15" },
                  ]}
                >
                  <Text
                    style={[styles.skillsCountText, { color: colors.tint }]}
                  >
                    {specialist.Service.technologies.length}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.skillsContainer}>
              {specialist.Service?.technologies?.length ? (
                specialist.Service.technologies.map((skill, index) => (
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
                      {skill}
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
                    No skills listed yet
                  </Text>
                </View>
              )}
            </View>
          </ResponsiveCard>

          {/* Service Information */}
          {specialist.Service && (
            <ResponsiveCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Service Information
              </Text>
              <View style={styles.serviceInfo}>
                <View style={styles.serviceItem}>
                  <IconSymbol
                    name="briefcase.fill"
                    size={16}
                    color={colors.tint}
                  />
                  <Text style={[styles.serviceText, { color: colors.text }]}>
                    Service: {specialist.Service.name}
                  </Text>
                </View>
                {specialist.Service.description && (
                  <View style={styles.serviceItem}>
                    <IconSymbol
                      name="info.circle.fill"
                      size={16}
                      color={colors.tint}
                    />
                    <Text style={[styles.serviceText, { color: colors.text }]}>
                      {specialist.Service.description}
                    </Text>
                  </View>
                )}
                {specialist.Service.completionRate && (
                  <View style={styles.serviceItem}>
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={16}
                      color={colors.tint}
                    />
                    <Text style={[styles.serviceText, { color: colors.text }]}>
                      Service Success Rate: {specialist.Service.completionRate}%
                    </Text>
                  </View>
                )}
              </View>
            </ResponsiveCard>
          )}

          {/* Reviews */}
          {specialist.reviews && specialist.reviews.length > 0 && (
            <ResponsiveCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Reviews ({specialist.reviewCount})
              </Text>
              <View style={styles.reviewsList}>
                {specialist.reviews.map((review) => (
                  <View key={review.id} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewerInfo}>
                        <Text
                          style={[styles.reviewerName, { color: colors.text }]}
                        >
                          {review.Reviewer.name}
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
                        Project: {review.Order.title}
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Contact Information
            </Text>
            <View style={styles.contactInfo}>
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
              {specialist.User.phone && (
                <View style={styles.contactItem}>
                  <IconSymbol name="phone.fill" size={16} color={colors.tint} />
                  <Text style={[styles.contactText, { color: colors.text }]}>
                    {specialist.User.phone}
                  </Text>
                </View>
              )}
              <View style={styles.contactItem}>
                <IconSymbol name="calendar" size={16} color={colors.tint} />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  Member since:{" "}
                  {new Date(specialist.User.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </ResponsiveCard>
        </ResponsiveContainer>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
  // Overview Section Styles
  overviewCard: {
    marginBottom: 16,
  },
  overviewSection: {
    gap: 20,
  },
  specialistHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
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
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  experienceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  experienceBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bioSection: {
    gap: 8,
  },
  bioTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  bio: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
  },
  quickStats: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  footerButtons: {
    margin: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  // Details Section Styles
  detailsGrid: {
    gap: 12,
  },
  detailCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 16,
    marginBottom: 8,
  },
  detailIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  detailCardContent: {
    flex: 1,
    gap: 4,
  },
  detailCardLabel: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.8,
  },
  detailCardValue: {
    fontSize: 16,
    fontWeight: "700",
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
    padding: 20,
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
  portfolioImage: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    marginBottom: 12,
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
