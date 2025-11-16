import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  BorderRadius,
  Spacing,
  ThemeColors,
  Typography,
} from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useCreditCard } from "@/contexts/CreditCardContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect, useCallback } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { apiService, UserProfile, Review } from "@/services/api";
import { fileUploadService } from "@/services/fileUpload";
import { chatService } from "@/services/chatService";
import { SkillsSection } from "@/components/SkillsSection";
import { ServicesSelectionModal } from "@/components/ServicesSelectionModal";
import { useSkills } from "@/hooks/useSkills";

export default function ProfileScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const { creditCards, removeCreditCard, setDefaultCard, isLoading } =
    useCreditCard();

  // Get URL parameters for handling refresh from edit screen and viewing other users
  const { refreshUserId, userId } = useLocalSearchParams();

  // API state management
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reviews state management
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // Chat relationship state management
  const [hasActiveChat, setHasActiveChat] = useState(false);

  // Profile picture state management
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<any>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  // Test mode state - will use real backend data
  const [testUserId, setTestUserId] = useState(1);

  // Determine which user ID to use
  const targetUserId = userId ? parseInt(userId as string) : testUserId;

  // Skills/Services management
  const skills = useSkills(userId ? targetUserId : user?.id);

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  // Fetch user profile from API
  useEffect(() => {
    fetchProfile();
  }, [userId]);

  // Refetch profile when test user ID changes
  useEffect(() => {
    if (!user) {
      fetchProfile();
    }
  }, [testUserId, targetUserId]);

  // Handle refresh from edit screen with specific user ID
  useEffect(() => {
    if (refreshUserId && !user) {
      const userId = parseInt(refreshUserId as string);
      if (userId && userId !== testUserId) {
        console.log(`Updating test user ID to ${userId} from edit screen`);
        setTestUserId(userId);
      }
    }
  }, [refreshUserId]);

  // Track if this is the initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Refresh profile data when screen comes into focus (e.g., returning from edit screen)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if this is not the initial load
      if (!isInitialLoad) {
        console.log("Profile screen focused, refreshing data...");
        fetchProfile();
      }
    }, [isInitialLoad])
  );

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      let profileData: UserProfile;

      if (userId) {
        // Viewing specific user - get their profile by ID
        console.log(`Loading user profile for user ID ${targetUserId}`);
        profileData = await apiService.getUserById(targetUserId);
      } else if (user) {
        // Authenticated user - get their own profile from backend
        console.log("Fetching authenticated user profile");
        profileData = await apiService.getUserProfile();
      } else {
        // Test mode - get real user data from backend by ID (no auth required)
        console.log(`Loading user profile for user ID ${targetUserId}`);
        profileData = await apiService.getUserById(targetUserId);
      }

      console.log("Profile data loaded:", profileData);
      setProfile(profileData);

      // Mark that initial load is complete
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }

      // Fetch reviews after profile is loaded
      fetchReviews(profileData.id);

      // Check chat relationship for contact info visibility
      checkChatRelationship(profileData.id);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(t("failedToLoadProfile"));

      // Don't show alert in test mode to avoid blocking the UI
      if (user) {
        Alert.alert(t("error"), t("failedToLoadProfile"));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (userId: number) => {
    try {
      setReviewsLoading(true);
      setReviewsError(null);

      const reviewsResponse = await apiService.getReviewsByReviewer(
        userId,
        1,
        10
      );
      setReviews(reviewsResponse.reviews);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setReviewsError(t("failedToLoadReviews"));
    } finally {
      setReviewsLoading(false);
    }
  };

  const checkChatRelationship = async (profileUserId: number) => {
    // If user is viewing their own profile, always show contact info
    if (user?.id && user.id === profileUserId) {
      setHasActiveChat(true);
      return;
    }

    // If user is not authenticated, don't show contact info for other users
    if (!user?.id) {
      setHasActiveChat(false);
      return;
    }

    try {
      // Get all conversations for the current user
      const conversations = await chatService.getConversations();

      // Check if there's an active conversation with the profile user
      const hasConversation = conversations.conversations.some((conv) => {
        const hasParticipant = conv.Participants.some(
          (participant) =>
            participant.userId === profileUserId && participant.isActive
        );
        return hasParticipant;
      });

      setHasActiveChat(hasConversation);
    } catch (err) {
      console.error("Error checking chat relationship:", err);
      setHasActiveChat(false); // Default to no access if error
    }
  };

  const handleProfilePictureUpload = async () => {
    try {
      // Request permissions
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(t("permissionRequired"), t("permissionToAccessCameraRoll"));
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile picture
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Store the selected image file for later upload
        const mediaFile = {
          uri: asset.uri,
          fileName: `profile_${Date.now()}.jpg`,
          type: "image" as const,
          mimeType: "image/jpeg",
          fileSize: asset.fileSize || 0,
        };

        // Show local preview immediately
        setProfilePicture(asset.uri);
        setSelectedImageFile(mediaFile);

        // Upload to storage and update profile immediately
        setUploadingPicture(true);

        try {
          const uploadResult = await fileUploadService.uploadProfilePicture(
            mediaFile
          );

          if (uploadResult.success && uploadResult.fileUrl) {
            console.log(
              "Profile picture uploaded successfully:",
              uploadResult.fileUrl
            );
            setProfilePicture(uploadResult.fileUrl);

            // Update user profile with new avatar URL
            if (user) {
              try {
                await apiService.updateUserProfile({
                  avatarUrl: uploadResult.fileUrl,
                });
                console.log("User profile updated with new avatar URL");
              } catch (error) {
                console.error("Error updating user profile:", error);
                Alert.alert(t("error"), t("imageUploadFailedToUpdateProfile"));
              }
            }
          } else {
            throw new Error(uploadResult.error || t("uploadFailed"));
          }
        } catch (error) {
          console.error("Error uploading profile picture:", error);
          Alert.alert(t("error"), t("failedToUploadProfilePicture"));
        } finally {
          setUploadingPicture(false);
        }
      }
    } catch (error) {
      console.error("Error selecting profile picture:", error);
      Alert.alert(t("error"), t("failedToSelectImage"));
    }
  };

  const handleEditProfile = () => {
    router.push("/profile/edit");
  };

  const header = (
    <Header
      title={userId ? t("userProfile") : t("profile")}
      subtitle={
        user
          ? t("manageAccountPreferences")
          : userId
          ? t("viewingUserProfile")
          : t("testModeDemo")
      }
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  // Show loading state
  if (loading) {
    return (
      <Layout header={header}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t("loadingProfile")}
          </Text>
        </View>
      </Layout>
    );
  }

  // Show error state
  if (error && !loading) {
    return (
      <Layout header={header}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchProfile}
          >
            <Text
              style={[styles.retryButtonText, { color: colors.textInverse }]}
            >
              Retry
            </Text>
          </TouchableOpacity>
          <Text style={[styles.debugText, { color: colors.tabIconDefault }]}>
            {t("debugUserAuthenticated")} {user ? t("yes") : t("no")}
            {!user && ` | Test User ID: ${testUserId}`}
          </Text>
        </View>
      </Layout>
    );
  }

  // Show loading or empty state if no profile yet
  if (!profile) {
    return (
      <Layout header={header}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            No profile data available
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchProfile}
          >
            <Text
              style={[styles.retryButtonText, { color: colors.textInverse }]}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }

  return (
    <Layout header={header}>
      <ScrollView
        style={{
          // backgroundColor: "red",
          flex: 1,
          marginBottom: 4 * Spacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Profile Header */}
          <ResponsiveCard>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {profilePicture || profile.avatarUrl ? (
                  <Image
                    source={{ uri: profilePicture || profile.avatarUrl }}
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
                      size={30}
                      color={colors.textSecondary}
                    />
                  </View>
                )}
                {!userId && (
                  <TouchableOpacity
                    style={[
                      styles.editImageButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={handleProfilePictureUpload}
                    disabled={uploadingPicture}
                  >
                    {uploadingPicture ? (
                      <ActivityIndicator size={16} color="white" />
                    ) : (
                      <IconSymbol name="camera.fill" size={16} color="white" />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.profileInfo}>
                <View style={styles.nameAndEditContainer}>
                  <Text style={[styles.profileName, { color: colors.text }]}>
                    {profile.name}
                  </Text>
                  {!userId && (
                    <TouchableOpacity
                      style={styles.editProfileButton}
                      onPress={handleEditProfile}
                    >
                      <IconSymbol
                        name="pencil"
                        size={16}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <Text
                  style={[styles.profileTitle, { color: colors.textSecondary }]}
                >
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </Text>

                <View style={styles.ratingContainer}>
                  <IconSymbol
                    name={
                      profile.verified
                        ? "checkmark.seal.fill"
                        : "checkmark.seal"
                    }
                    size={16}
                    color={profile.verified ? "#4CAF50" : colors.textSecondary}
                  />
                  <Text style={[styles.rating, { color: colors.text }]}>
                    {profile.verified
                      ? t("verifiedAccount")
                      : t("unverifiedAccount")}
                  </Text>
                </View>

                <View style={styles.locationContainer}>
                  <IconSymbol
                    name="calendar"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.location, { color: colors.textSecondary }]}
                  >
                    {t("memberSince")}{" "}
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          </ResponsiveCard>

          {/* Contact Information - Only show if user has active chat or is viewing own profile */}
          {hasActiveChat && (
            <ResponsiveCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("contactInformation")}
              </Text>
              <View style={styles.contactInfo}>
                <View style={styles.contactItem}>
                  <IconSymbol
                    name="envelope.fill"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.contactText, { color: colors.text }]}>
                    {t("email")}: {profile.email}
                  </Text>
                </View>

                <View style={styles.contactItem}>
                  <IconSymbol
                    name="phone.fill"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.contactText, { color: colors.text }]}>
                    {t("phone")}: {profile.phone || t("notProvided")}
                  </Text>
                </View>

                <View style={styles.contactItem}>
                  <IconSymbol
                    name="dollarsign.circle.fill"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.contactText, { color: colors.text }]}>
                    {t("creditBalance")}:{" "}
                    {(profile.creditBalance || 0).toFixed(2)}
                  </Text>
                  {!userId && (
                    <TouchableOpacity
                      style={[
                        styles.refillButtonSmall,
                        { backgroundColor: colors.tint },
                      ]}
                      onPress={() => router.push("/profile/refill-credits")}
                    >
                      <IconSymbol
                        name="plus.circle.fill"
                        size={14}
                        color="black"
                      />
                      <Text style={styles.refillButtonTextSmall}>
                        {t("refill")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.contactItem}>
                  <IconSymbol
                    name="person.fill"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.contactText, { color: colors.text }]}>
                    {t("role")}:{" "}
                    {profile.role.charAt(0).toUpperCase() +
                      profile.role.slice(1)}
                  </Text>
                </View>
              </View>
            </ResponsiveCard>
          )}

          {/* Contact Information Not Available */}
          {!hasActiveChat && userId && (
            <ResponsiveCard>
              <View style={styles.contactRestrictedContainer}>
                <IconSymbol
                  name="lock.fill"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    styles.contactRestrictedTitle,
                    { color: colors.text },
                  ]}
                >
                  {t("contactInformationRestricted")}
                </Text>
                <Text
                  style={[
                    styles.contactRestrictedDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("contactInformationOnlyVisibleWithActiveChat")}
                </Text>
              </View>
            </ResponsiveCard>
          )}

          {/* Bio */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("about")}
            </Text>
            {profile.bio ? (
              <Text style={[styles.bioText, { color: colors.text }]}>
                {profile.bio}
              </Text>
            ) : (
              <Text
                style={[
                  styles.bioText,
                  { color: colors.textSecondary, fontStyle: "italic" },
                ]}
              >
                {t("noBioProvided")}
              </Text>
            )}
          </ResponsiveCard>

          {/* Account Information */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("accountInformation")}
            </Text>
            <View style={styles.accountInfo}>
              <View style={styles.accountItem}>
                <IconSymbol
                  name="person.badge.shield.checkmark.fill"
                  size={16}
                  color={profile.verified ? "#4CAF50" : colors.textSecondary}
                />
                <Text style={[styles.accountText, { color: colors.text }]}>
                  {t("verificationStatus")}{" "}
                  {profile.verified ? t("verified") : t("unverified")}
                </Text>
              </View>
              <View style={styles.accountItem}>
                <IconSymbol name="calendar" size={16} color={colors.primary} />
                <Text style={[styles.accountText, { color: colors.text }]}>
                  {t("joined")}:{" "}
                  {new Date(profile.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.accountItem}>
                <IconSymbol
                  name="dollarsign.circle.fill"
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.accountText, { color: colors.text }]}>
                  {t("creditBalance")}:{" "}
                  {(profile.creditBalance || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </ResponsiveCard>

          {/* Skills/Services Section */}
          <ResponsiveCard>
            <SkillsSection
              userServices={skills.userServices}
              servicesLoading={skills.servicesLoading}
              servicesError={skills.servicesError}
              userId={userId as string}
              colors={colors}
              onEditSkills={skills.openServicesModal}
              onRemoveSkill={skills.removeSkill}
              onRetry={skills.fetchServices}
              onToggleNotification={skills.toggleServiceNotification}
              serviceNotifications={skills.serviceNotifications}
            />
          </ResponsiveCard>

          {/* Reviews Given */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("reviewsGiven")} ({reviews.length})
            </Text>

            {reviewsLoading ? (
              <View style={styles.reviewsLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  style={[styles.reviewsLoadingText, { color: colors.text }]}
                >
                  {t("loadingReviews")}
                </Text>
              </View>
            ) : reviewsError ? (
              <View style={styles.reviewsErrorContainer}>
                <Text
                  style={[
                    styles.reviewsErrorText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {reviewsError}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.reviewsRetryButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => profile && fetchReviews(profile.id)}
                >
                  <Text
                    style={[
                      styles.reviewsRetryButtonText,
                      { color: colors.textInverse },
                    ]}
                  >
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            ) : reviews.length === 0 ? (
              <View style={styles.emptyReviewsContainer}>
                <IconSymbol
                  name="star"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.emptyReviewsTitle, { color: colors.text }]}
                >
                  {t("noReviewsYet")}
                </Text>
                <Text
                  style={[
                    styles.emptyReviewsDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("completeFirstOrderToLeaveReview")}
                </Text>
              </View>
            ) : (
              <View style={styles.userReviewsList}>
                {reviews.map((review) => (
                  <View
                    key={review.id}
                    style={[
                      styles.userReviewItem,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={styles.userReviewHeader}>
                      <View style={styles.reviewProjectInfo}>
                        <Text
                          style={[
                            styles.reviewProjectTitle,
                            { color: colors.text },
                          ]}
                        >
                          {review.Order.title || t("untitledProject")}
                        </Text>
                        <Text
                          style={[
                            styles.reviewServiceName,
                            { color: colors.tint },
                          ]}
                        >
                          {review.Order.Service?.name || t("service")}
                        </Text>
                      </View>
                      <View style={styles.userReviewRating}>
                        {[...Array(5)].map((_, i) => (
                          <IconSymbol
                            key={i}
                            name="star.fill"
                            size={14}
                            color={
                              i < review.rating ? "#FFD700" : colors.border
                            }
                          />
                        ))}
                      </View>
                    </View>

                    {review.comment && (
                      <Text
                        style={[
                          styles.userReviewComment,
                          { color: colors.text },
                        ]}
                      >
                        {review.comment}
                      </Text>
                    )}

                    <View style={styles.userReviewFooter}>
                      <Text
                        style={[
                          styles.userReviewDate,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {new Date(review.createdAt).toLocaleDateString()}
                      </Text>
                      {review.Order.budget && (
                        <Text
                          style={[
                            styles.reviewBudget,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Budget: ${review.Order.budget}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ResponsiveCard>

          {/* Payment Methods - Only show for own profile */}
          {!userId && (
            <ResponsiveCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("paymentMethods")}
              </Text>

              {creditCards.length === 0 ? (
                <View style={styles.emptyState}>
                  <IconSymbol
                    name="creditcard"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.emptyStateTitle, { color: colors.text }]}
                  >
                    {t("noCreditCardsAdded")}
                  </Text>
                  <Text
                    style={[
                      styles.emptyStateDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("addCreditCardToMakePayments")}
                  </Text>
                </View>
              ) : (
                <>
                  {creditCards.map((card) => (
                    <View
                      key={card.id}
                      style={[
                        styles.creditCardItem,
                        { borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={styles.cardInfo}>
                        <View
                          style={[
                            styles.cardIcon,
                            { backgroundColor: colors.primary + "20" },
                          ]}
                        >
                          <IconSymbol
                            name="creditcard.fill"
                            size={20}
                            color={colors.primary}
                          />
                        </View>
                        <View style={styles.cardDetails}>
                          <View style={styles.cardHeader}>
                            <Text
                              style={[
                                styles.cardNumber,
                                { color: colors.text },
                              ]}
                            >
                              •••• •••• •••• {card.cardNumber}
                            </Text>
                            {card.isDefault && (
                              <View
                                style={[
                                  styles.defaultBadge,
                                  { backgroundColor: colors.primary },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.defaultBadgeText,
                                    { color: colors.textInverse },
                                  ]}
                                >
                                  {t("default")}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text
                            style={[
                              styles.cardName,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {card.cardholderName}
                          </Text>
                          <Text
                            style={[
                              styles.cardExpiry,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {t("expires")} {card.expiryMonth.padStart(2, "0")}/
                            {card.expiryYear.slice(-2)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardActions}>
                        {!card.isDefault && (
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              { borderColor: colors.border },
                            ]}
                            onPress={() => setDefaultCard(card.id)}
                            disabled={isLoading}
                          >
                            <Text
                              style={[
                                styles.actionButtonText,
                                { color: colors.text },
                              ]}
                            >
                              {t("setDefault")}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.removeButton,
                            { borderColor: colors.error },
                          ]}
                          onPress={() => removeCreditCard(card.id)}
                          disabled={isLoading}
                        >
                          <Text
                            style={[
                              styles.actionButtonText,
                              { color: colors.error },
                            ]}
                          >
                            {t("remove")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.addCardButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => router.push("/profile/add-credit-card")}
              >
                <IconSymbol name="plus" size={20} color={colors.textInverse} />
                <Text
                  style={[
                    styles.addCardButtonText,
                    { color: colors.textInverse },
                  ]}
                >
                  {t("addCreditCard")}
                </Text>
              </TouchableOpacity>
            </ResponsiveCard>
          )}
        </ResponsiveContainer>
      </ScrollView>

      {/* Services Selection Modal */}
      <ServicesSelectionModal
        visible={skills.showServicesModal}
        availableServices={skills.availableServices}
        userServices={skills.userServices}
        searchQuery={skills.searchQuery}
        colors={colors}
        onClose={skills.closeServicesModal}
        onSave={skills.saveUserServices}
        onSearchChange={skills.setSearchQuery}
        onToggleService={skills.toggleServiceSelection}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  // Profile header
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editImageButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
  },
  nameAndEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
  },
  editProfileButton: {
    padding: 4,
  },
  profileTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: "600",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  location: {
    fontSize: 14,
    fontWeight: "500",
  },

  // Section titles
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },

  // Contact information
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
  refillButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  refillButtonTextSmall: {
    fontSize: 12,
    fontWeight: "600",
    color: "black",
  },

  // Skills
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 14,
    fontWeight: "500",
  },

  // Credit Card Styles
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.semibold,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyStateDescription: {
    fontSize: Typography.md,
    textAlign: "center",
    lineHeight: Typography.lineHeightRelaxed * Typography.md,
  },
  creditCardItem: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  cardDetails: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  cardNumber: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
  },
  defaultBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  defaultBadgeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
  },
  cardName: {
    fontSize: Typography.md,
    marginBottom: 2,
  },
  cardExpiry: {
    fontSize: Typography.sm,
  },
  cardActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  removeButton: {
    // Additional styles for remove button if needed
  },
  actionButtonText: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
  },
  addCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  addCardButtonText: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
  },
  // Loading and Error States
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
  // New styles for updated profile
  defaultAvatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
  },
  accountInfo: {
    gap: 12,
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accountText: {
    fontSize: 15,
    flex: 1,
  },
  // Reviews styles
  reviewsLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 10,
  },
  reviewsLoadingText: {
    fontSize: 14,
  },
  reviewsErrorContainer: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
  },
  reviewsErrorText: {
    fontSize: 14,
    textAlign: "center",
  },
  reviewsRetryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  reviewsRetryButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyReviewsContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyReviewsTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyReviewsDescription: {
    fontSize: 14,
    textAlign: "center",
  },
  userReviewsList: {
    gap: 16,
  },
  userReviewItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  userReviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewProjectInfo: {
    flex: 1,
    marginRight: 10,
  },
  reviewProjectTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  reviewServiceName: {
    fontSize: 13,
    fontWeight: "500",
  },
  userReviewRating: {
    flexDirection: "row",
    gap: 2,
  },
  userReviewComment: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 8,
  },
  userReviewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userReviewDate: {
    fontSize: 12,
  },
  reviewBudget: {
    fontSize: 12,
    fontWeight: "500",
  },
  // Test mode styles
  testModeDescription: {
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  testModeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  testUserButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  testUserButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  debugText: {
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
  },
  // Contact restricted styles
  contactRestrictedContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  contactRestrictedTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    textAlign: "center",
  },
  contactRestrictedDescription: {
    fontSize: Typography.md,
    textAlign: "center",
    lineHeight: Typography.lineHeightRelaxed * Typography.md,
    paddingHorizontal: Spacing.lg,
  },
});
