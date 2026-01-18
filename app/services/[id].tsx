import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ImageBackground,
  FlatList,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/useTranslation";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeColors, Spacing, BorderRadius } from "@/constants/styles";
import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Button } from "@/components/ui/button";
import { apiService } from "@/categories/api";
import { useAuth } from "@/contexts/AuthContext";
import { Image } from "expo-image";
import { CountBadge } from "@/components/CountBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { MapViewComponent } from "@/components/MapView";
import { parseLocationCoordinates } from "@/utils/locationParsing";
import { handleBannerUpload as handleBannerUploadUtil } from "@/utils/bannerUpload";
import { UserAvatar } from "@/components/UserAvatar";
import { TopTabs } from "@/components/TopTabs";
import OrderItem from "@/app/orders/Item";

export default function MarketDetailScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const marketId = parseInt(id as string, 10);

  // State for banner editing
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // State for review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  // State for map modal
  const [showMapModal, setShowMapModal] = useState(false);

  // State for orders/reviews tab
  const [activeTab, setActiveTab] = useState<"orders" | "reviews">("orders");

  // Fetch market data
  const {
    data: market,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["market", marketId],
    queryFn: () => apiService.getMarketById(marketId),
    enabled: !!marketId,
  });

  // Fetch reviews separately
  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ["market-reviews", marketId],
    queryFn: () => apiService.getMarketReviews(marketId, 1, 20),
    enabled: !!marketId,
  });

  // Fetch subscription info
  const { data: subscription } = useQuery({
    queryKey: ["market-subscription", marketId],
    queryFn: () => apiService.getMarketActiveSubscription(marketId),
    enabled: !!marketId && !!user,
  });

  // Update local state when market data loads
  useEffect(() => {
    if (market) {
      setBannerImage(market.BannerImage?.fileUrl || null);
    }
  }, [market]);

  // Check permissions
  const currentMember = market?.Members?.find((m: any) => m.userId === user?.id);
  const isAdmin = currentMember?.role === "admin" || currentMember?.role === "owner";

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (marketId) {
        refetch();
        refetchReviews();
      }
    }, [marketId, refetch, refetchReviews])
  );

  // Banner upload handler
  const handleBannerUpload = async () => {
    setUploadingBanner(true);
    try {
      await handleBannerUploadUtil({
        fileNamePrefix: `market_banner_${marketId}`,
        onUploadSuccess: async (fileUrl, fileName) => {
          // Create market media file
          const mediaFile = await apiService.uploadMarketMediaFile({
            marketId,
            fileName,
            fileUrl,
            fileType: "image",
            mimeType: "image/jpeg",
            fileSize: 0, // File size not needed for existing upload
          });

          // Set as banner
          await apiService.setMarketBanner(marketId, mediaFile.id);
          setBannerImage(fileUrl);
          queryClient.invalidateQueries({ queryKey: ["market", marketId] });
          Alert.alert(t("success"), t("bannerUpdated"));
        },
        onError: (error) => {
          Alert.alert(t("error"), error || t("failedToUploadBanner"));
        },
        permissionRequiredText: t("permissionRequired"),
        permissionToAccessText: t("permissionToAccessCameraRoll"),
        uploadFailedText: t("uploadFailed"),
        failedToSelectImageText: t("failedToSelectImage"),
        failedToUploadText: t("failedToUploadBanner"),
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  // Review handlers
  const handleOpenReviewModal = () => {
    if (userReview) {
      // Editing existing review
      setReviewRating(userReview.rating);
      setReviewComment(userReview.comment || "");
      setEditingReviewId(userReview.id);
    } else {
      // Creating new review
      setReviewRating(0);
      setReviewComment("");
      setEditingReviewId(null);
    }
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      Alert.alert(t("error"), t("pleaseSelectRating"));
      return;
    }

    try {
      if (editingReviewId) {
        // Update existing review
        await apiService.updateMarketReview(editingReviewId, {
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        });
      } else {
        // Create new review
        await apiService.createMarketReview({
          marketId,
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["market", marketId] });
      queryClient.invalidateQueries({ queryKey: ["market-reviews", marketId] });
      setShowReviewModal(false);
      setReviewRating(0);
      setReviewComment("");
      setEditingReviewId(null);
    } catch (error: any) {
      console.error("Error submitting review:", error);
      Alert.alert(t("error"), error.message || t("failedToSubmitReview"));
    }
  };


  if (isLoading) {
    return (
      <Layout>
        <Header title={t("marketDetails")} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </Layout>
    );
  }

  if (error || !market) {
    return (
      <Layout>
        <Header title={t("marketDetails")} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {t("marketNotFound")}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={() => refetch()}
          >
            <Text style={[styles.retryButtonText, { color: colors.background }]}>
              {t("retry")}
            </Text>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }

  const reviews = reviewsData?.reviews || [];
  const isOwner = market?.createdBy === user?.id;
  const userReview = reviews?.find((r: any) => r.reviewerId === user?.id);
  const hasReviewed = !!userReview;


  // Get localized name and description based on current language
  const getLocalizedName = () => {
    if (language === "en" && market.nameEn) return market.nameEn;
    if (language === "ru" && market.nameRu) return market.nameRu;
    if (language === "hy" && market.nameHy) return market.nameHy;
    return market.name;
  };

  const getLocalizedDescription = () => {
    if (language === "en" && market.descriptionEn) return market.descriptionEn;
    if (language === "ru" && market.descriptionRu) return market.descriptionRu;
    if (language === "hy" && market.descriptionHy) return market.descriptionHy;
    return market.description;
  };

  // Get status badge color
  const getStatusColor = () => {
    switch (market.status) {
      case "active":
        return "#4CAF50";
      case "pending_review":
        return "#FF9800";
      case "rejected":
        return "#F44336";
      case "closed":
        return "#9E9E9E";
      case "draft":
        return "#2196F3";
      default:
        return colors.tabIconDefault;
    }
  };

  // Get status label
  const getStatusLabel = () => {
    switch (market.status) {
      case "active":
        return t("active");
      case "pending_review":
        return t("pendingReview");
      case "rejected":
        return t("rejected");
      case "closed":
        return t("closed");
      case "draft":
        return t("draft");
      default:
        return market.status;
    }
  };


  const header = (
    <Header
      title={t("marketDetails")}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  return (
    <Layout header={header}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Banner Section */}
          <ResponsiveCard padding={0} style={{ overflow: "hidden" }}>
            <View style={{ paddingTop: bannerImage ? 0 : 140 }}>
              {bannerImage ? (
                <ImageBackground
                  source={{ uri: bannerImage }}
                  style={styles.bannerImage}
                  imageStyle={styles.bannerImageStyle}
                >
                  <View style={styles.bannerOverlay} />
                </ImageBackground>
              ) : (
                <View
                  style={[
                    styles.bannerPlaceholder,
                    { backgroundColor: colors.border },
                  ]}
                >
                  <IconSymbol
                    name="photo"
                    size={28}
                    color={colors.tabIconDefault}
                  />
                  {isOwner && (
                    <Text
                      style={[
                        styles.bannerPlaceholderText,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {t("addBanner")}
                    </Text>
                  )}
                </View>
              )}
              {isOwner && (
                <TouchableOpacity
                  style={styles.bannerTapArea}
                  onPress={handleBannerUpload}
                  disabled={uploadingBanner}
                  activeOpacity={0.8}
                >
                  {uploadingBanner && (
                    <View style={styles.bannerLoadingOverlay}>
                      <ActivityIndicator size="small" color={colors.tint} />
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Market Header */}
              <View style={styles.marketHeader}>
                <View style={styles.marketInfo}>
                    <Text style={[styles.marketName, { color: colors.text }]}>
                      {getLocalizedName()}
                    </Text>
                    {market.verified && (
                      <View style={styles.verifiedBadge}>
                        <IconSymbol
                          name="checkmark.seal.fill"
                          size={16}
                          color="#4CAF50"
                        />
                        <Text style={styles.verifiedText}>
                          {t("verified")}
                        </Text>
                      </View>
                    )}

                  {/* Status Badge */}
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + "20" }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                    <Text style={[styles.statusText, { color: getStatusColor() }]}>
                      {getStatusLabel()}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    {market.rating > 0 && (
                      <View style={styles.ratingContainer}>
                        <IconSymbol name="star.fill" size={16} color="#FFD700" />
                        <Text style={[styles.rating, { color: colors.text }]}>
                          {market.rating.toFixed(1)}
                        </Text>
                        <Text
                          style={[
                            styles.reviewCount,
                            { color: colors.tabIconDefault },
                          ]}
                        >
                          ({market._count?.Reviews || market.reviewCount || 0})
                        </Text>
                      </View>
                    )}
                    {market.location && (
                      <TouchableOpacity
                        style={styles.locationContainer}
                        onPress={() => {
                          const locationCoordinates = parseLocationCoordinates(
                            market.location
                          );
                          if (locationCoordinates) {
                            setShowMapModal(true);
                          }
                        }}
                        disabled={!parseLocationCoordinates(market.location)}
                        activeOpacity={parseLocationCoordinates(market.location) ? 0.6 : 1}
                      >
                        <IconSymbol
                          name="location.fill"
                          size={14}
                          color={
                            parseLocationCoordinates(market.location)
                              ? colors.tint
                              : colors.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.location,
                            {
                              color: parseLocationCoordinates(market.location)
                                ? colors.tint
                                : colors.textSecondary,
                              textDecorationLine: parseLocationCoordinates(
                                market.location
                              )
                                ? "underline"
                                : "none",
                            },
                          ]}
                        >
                          {parseLocationCoordinates(market.location)?.address ||
                            market.location}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.joinDateContainer}>
                    <IconSymbol
                      name="calendar"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.joinDate,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("joined")}{" "}
                      {new Date(market.joinDate).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ResponsiveCard>

          {/* Description Section */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("about")}
              </Text>
            </View>

            <Text style={[styles.description, { color: colors.text }]}>
              {getLocalizedDescription() || t("noDescription")}
            </Text>
          </ResponsiveCard>

          {/* Creator Information */}
          {market.Creator && (
            <ResponsiveCard>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("createdBy")}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.creatorItem}
                onPress={() => router.push(`/profile/profile?userId=${market.Creator.id}`)}
              >
                {market.Creator.avatarUrl ? (
                  <Image
                    source={{ uri: market.Creator.avatarUrl }}
                    style={styles.creatorAvatar}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.creatorAvatar, { backgroundColor: colors.border }]}>
                    <IconSymbol
                      name="person.fill"
                      size={20}
                      color={colors.tabIconDefault}
                    />
                  </View>
                )}
                <View style={styles.creatorInfo}>
                  <Text style={[styles.creatorName, { color: colors.text }]}>
                    {market.Creator.name}
                  </Text>
                  {market.Creator.verified && (
                    <View style={styles.creatorVerified}>
                      <IconSymbol
                        name="checkmark.seal.fill"
                        size={12}
                        color="#4CAF50"
                      />
                      <Text style={styles.creatorVerifiedText}>
                        {t("verified")}
                      </Text>
                    </View>
                  )}
                </View>
                <IconSymbol
                  name="chevron.right"
                  size={16}
                  color={colors.tabIconDefault}
                />
              </TouchableOpacity>
            </ResponsiveCard>
          )}

          {/* Rejection Reason (if rejected) */}
          {market.status === "rejected" && market.rejectionReason && (
            <ResponsiveCard>
              <View style={styles.rejectionContainer}>
                <IconSymbol
                  name="exclamationmark.triangle.fill"
                  size={20}
                  color="#F44336"
                />
                <View style={styles.rejectionInfo}>
                  <Text style={[styles.rejectionTitle, { color: colors.text }]}>
                    {t("rejectionReason")}
                  </Text>
                  <Text style={[styles.rejectionText, { color: colors.text }]}>
                    {market.rejectionReason}
                  </Text>
                </View>
              </View>
            </ResponsiveCard>
          )}

          {/* Market Metadata */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("marketInformation")}
              </Text>
            </View>
            <View style={styles.metadataContainer}>
              <View style={styles.metadataRow}>
                <IconSymbol
                  name="calendar"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={[styles.metadataLabel, { color: colors.textSecondary }]}>
                  {t("createdAt")}:
                </Text>
                <Text style={[styles.metadataValue, { color: colors.text }]}>
                  {new Date(market.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.metadataRow}>
                <IconSymbol
                  name="clock"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={[styles.metadataLabel, { color: colors.textSecondary }]}>
                  {t("updatedAt")}:
                </Text>
                <Text style={[styles.metadataValue, { color: colors.text }]}>
                  {new Date(market.updatedAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.metadataRow}>
                <IconSymbol
                  name="person.3.fill"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={[styles.metadataLabel, { color: colors.textSecondary }]}>
                  {t("members")}:
                </Text>
                <Text style={[styles.metadataValue, { color: colors.text }]}>
                  {market._count?.Members || market.Members?.length || 0}
                </Text>
              </View>
              <View style={styles.metadataRow}>
                <IconSymbol
                  name="doc.text.fill"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={[styles.metadataLabel, { color: colors.textSecondary }]}>
                  {t("orders")}:
                </Text>
                <Text style={[styles.metadataValue, { color: colors.text }]}>
                  {market._count?.Orders || market.Orders?.length || 0}
                </Text>
              </View>
            </View>
          </ResponsiveCard>

          {/* Roles Section */}
          {market.Roles && market.Roles.length > 0 && (
            <ResponsiveCard>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("roles")}
                </Text>
                <CountBadge count={market.Roles.length} />
              </View>
              {market.Roles.map((role: any) => (
                <View
                  key={role.id}
                  style={[
                    styles.roleItem,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.roleInfo}>
                    <Text style={[styles.roleName, { color: colors.text }]}>
                      {role.name}
                    </Text>
                    {role.description && (
                      <Text
                        style={[
                          styles.roleDescription,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {role.description}
                      </Text>
                    )}
                  </View>
                  {role.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>
                        {t("default")}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </ResponsiveCard>
          )}

          {/* Gallery Section */}
          {market.Gallery && market.Gallery.length > 0 && (
            <ResponsiveCard>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("gallery")}
                </Text>
                <CountBadge count={market.Gallery.length} />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.galleryScroll}
              >
                {market.Gallery.map((file: any) => (
                  <TouchableOpacity
                    key={file.id}
                    onPress={() => {
                      // Could open full screen image viewer
                    }}
                  >
                    <Image
                      source={{ uri: file.fileUrl }}
                      style={styles.galleryImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ResponsiveCard>
          )}

          {/* Members Section */}
          {market.Members && market.Members.length > 0 && (
            <ResponsiveCard>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("members")}
                </Text>
                <CountBadge count={market.Members.length} />
              </View>
              {market.Members.filter((m: any) => m.status === "accepted").map(
                (member: any) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.memberItem,
                      { borderBottomColor: colors.border },
                    ]}
                    onPress={() => router.push(`/profile/profile?userId=${member.User?.id}`)}
                  >
                    <UserAvatar user={member.User} size={40} />
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: colors.text }]}>
                        {member.User?.name || t("unknown")}
                      </Text>
                      <Text
                        style={[
                          styles.memberRole,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {member.Role?.name || member.role || t("member")}
                      </Text>
                    </View>
                    <IconSymbol
                      name="chevron.right"
                      size={16}
                      color={colors.tabIconDefault}
                    />
                  </TouchableOpacity>
                )
              )}
            </ResponsiveCard>
          )}

          {/* Subscription Section */}
          {isOwner && subscription && (
            <ResponsiveCard>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("subscription")}
                </Text>
              </View>
              <View style={styles.subscriptionInfo}>
                <Text style={[styles.subscriptionPlan, { color: colors.text }]}>
                  {subscription.Plan?.name || t("noSubscription")}
                </Text>
                {subscription.endDate && (
                  <Text
                    style={[
                      styles.subscriptionDate,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t("expires")}:{" "}
                    {new Date(subscription.endDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </ResponsiveCard>
          )}

          {/* Orders and Reviews Section with Tabs */}
          <ResponsiveCard style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 0 }}>
            <TopTabs
              tabs={[
                {
                  key: "orders",
                  label: `${t("attachedOrders")} (${market.Orders?.length || 0})`,
                },
                {
                  key: "reviews",
                  label: `${t("reviews")} (${reviews.length})`,
                },
              ]}
              style={{ borderTopLeftRadius: BorderRadius.md, borderTopRightRadius: BorderRadius.md }}
              activeTab={activeTab}
              onTabChange={(tabKey) => setActiveTab(tabKey as "orders" | "reviews")}
              compact={true}
            />
          </ResponsiveCard>
          
            {activeTab === "orders" ? (
              <>
                {!market.Orders || market.Orders.length === 0 ? (
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
                  <FlatList
                    data={market.Orders}
                    renderItem={({ item: marketOrder }) => (
                      <OrderItem
                        order={marketOrder.Order}
                      />
                    )}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.ordersList}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                    numColumns={2}
                    columnWrapperStyle={{ justifyContent: "space-between", marginRight: -Spacing.sm }}
                  />
                )}
              </>
            ) : (
              <ResponsiveCard>
                <View style={styles.sectionHeader}>
                  <View style={styles.reviewsHeaderRight}>
                    {market.rating > 0 && (
                      <View style={styles.ratingBadge}>
                        <IconSymbol name="star.fill" size={14} color="#FFD700" />
                        <Text style={[styles.ratingBadgeText, { color: colors.text }]}>
                          {market.rating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                    {user && !hasReviewed && (
                      <Button
                        onPress={handleOpenReviewModal}
                        title={t("submitMarketReview")}
                        variant="primary"
                        icon="star"
                        iconSize={14}
                        iconPosition="left"
                        backgroundColor={colors.primary}
                      />
                    )}
                  </View>
                </View>

                {reviews.length > 0 ? (
                  reviews.map((review: any) => (
                    <View
                      key={review.id}
                      style={[
                        styles.reviewItem,
                        { borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewerInfo}>
                          <Text
                            style={[styles.reviewerName, { color: colors.text }]}
                          >
                            {review.Reviewer?.name || t("anonymous")}
                          </Text>
                          <View style={styles.reviewRating}>
                            {[...Array(5)].map((_, i) => (
                              <IconSymbol
                                key={i}
                                name="star.fill"
                                size={12}
                                color={i < review.rating ? "#FFD700" : colors.border}
                              />
                            ))}
                          </View>
                        </View>
                        <View style={styles.reviewHeaderRight}>
                          <Text
                            style={[
                              styles.reviewDate,
                              { color: colors.tabIconDefault },
                            ]}
                          >
                            {new Date(review.createdAt).toLocaleDateString()}
                          </Text>
                          {user && review.reviewerId === user.id && (
                            <TouchableOpacity
                              onPress={() => {
                                setReviewRating(review.rating);
                                setReviewComment(review.comment || "");
                                setEditingReviewId(review.id);
                                setShowReviewModal(true);
                              }}
                              style={styles.editReviewButton}
                            >
                              <IconSymbol
                                name="pencil"
                                size={16}
                                color={colors.tint}
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      {review.comment && (
                        <Text
                          style={[styles.reviewComment, { color: colors.text }]}
                        >
                          {review.comment}
                        </Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text
                    style={[
                      styles.noReviews,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t("noReviews")}
                  </Text>
                )}
              </ResponsiveCard>
            )}

        </ResponsiveContainer>
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.background }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingReviewId ? `${t("edit")} ${t("reviews")?.toLowerCase() || t("submitMarketReview")}` : t("submitMarketReview")}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowReviewModal(false);
                  setReviewRating(0);
                  setReviewComment("");
                  setEditingReviewId(null);
                }}
              >
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingSection}>
              <Text style={[styles.ratingLabel, { color: colors.text }]}>
                {t("rating")}
              </Text>
              <View style={styles.starsContainer}>
                {[...Array(5)].map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setReviewRating(i + 1)}
                  >
                    <IconSymbol
                      name="star.fill"
                      size={32}
                      color={i < reviewRating ? "#FFD700" : colors.border}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.commentSection}>
              <Text style={[styles.commentLabel, { color: colors.text }]}>
                {t("comment")} ({t("optional")})
              </Text>
              <TextInput
                style={[
                  styles.commentInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder={t("writeYourReview")}
                placeholderTextColor={colors.tabIconDefault}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <Button
                variant="outline"
                title={t("cancel")}
                onPress={() => {
                  setShowReviewModal(false);
                  setReviewRating(0);
                  setReviewComment("");
                  setEditingReviewId(null);
                }}
                backgroundColor={colors.background}
                textColor={colors.text}
              />
              <Button
                variant="primary"
                title={t("submit")}
                onPress={handleSubmitReview}
                backgroundColor={colors.primary}
                textColor="white"
                disabled={reviewRating === 0}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Map Modal */}
      {parseLocationCoordinates(market.location) && (
        <Modal
          visible={showMapModal}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowMapModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <MapViewComponent
              initialLocation={parseLocationCoordinates(market.location)!}
              onLocationSelect={() => {}}
              onClose={() => setShowMapModal(false)}
              showCurrentLocationButton={false}
              showConfirmButton={false}
            />
          </View>
        </Modal>
      )}

    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  bannerImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: '100%',
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
  bannerPlaceholder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bannerPlaceholderText: {
    fontSize: 14,
    fontWeight: "600",
  },
  bannerTapArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  marketHeader: {
    padding: Spacing.card,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  marketInfo: {
    flex: 1,
  },
  marketName: {
    fontSize: 24,
    fontWeight: "700",
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#4CAF5020",
  },
  verifiedText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontSize: 16,
    fontWeight: "600",
  },
  reviewCount: {
    fontSize: 14,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontSize: 14,
  },
  joinDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  joinDate: {
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sectionDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 16,
    opacity: 0.7,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  galleryScroll: {
    marginHorizontal: -Spacing.card,
    paddingHorizontal: Spacing.card,
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  memberItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 0,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  orderStatus: {
    fontSize: 14,
  },
  subscriptionInfo: {
    gap: 8,
  },
  subscriptionPlan: {
    fontSize: 16,
    fontWeight: "600",
  },
  subscriptionDate: {
    fontSize: 14,
  },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: "row",
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editReviewButton: {
    padding: 4,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
  },
  noReviews: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.card,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  ratingSection: {
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  creatorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  creatorVerified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  creatorVerifiedText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
  },
  rejectionContainer: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F4433620",
  },
  rejectionInfo: {
    flex: 1,
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  metadataContainer: {
    gap: 12,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  metadataValue: {
    fontSize: 14,
    flex: 1,
  },
  roleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#2196F320",
  },
  defaultBadgeText: {
    fontSize: 12,
    color: "#2196F3",
    fontWeight: "600",
  },
  reviewsHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#FFD70020",
  },
  ratingBadgeText: {
    fontSize: 14,
    fontWeight: "600",
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
    marginHorizontal: Spacing.lg,
  },
});
