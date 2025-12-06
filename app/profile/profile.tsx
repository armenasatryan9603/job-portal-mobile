import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Button } from "@/components/ui/button";
import {
  BorderRadius,
  Spacing,
  ThemeColors,
  Typography,
} from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect, useCallback } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { ContactInfo } from "@/components/ContactInfo";
import { AccountInfo } from "@/components/AccountInfo";
import { LanguagesSection } from "@/components/LanguagesSection";
import { WorkSamplesSection } from "@/components/WorkSamplesSection";
import AnalyticsService from "@/services/AnalyticsService";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function ProfileScreen() {
  useAnalytics("Profile");
  const { user, updateUser } = useAuth();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];

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
  const [uploadingPicture, setUploadingPicture] = useState(false);

  // Bio editing state management
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  // Test mode state - will use real backend data
  const [testUserId, setTestUserId] = useState(1);

  // Determine which user ID to use
  const targetUserId = userId ? parseInt(userId as string) : testUserId;

  // Skills/Services management
  const skills = useSkills(userId ? targetUserId : user?.id);

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

                // Track profile update
                AnalyticsService.getInstance().logEvent("profile_updated", {
                  update_type: "avatar",
                });

                // Update the user object in AuthContext with the new avatarUrl
                await updateUser({
                  avatarUrl: uploadResult.fileUrl,
                });

                // Also update local profile state
                if (profile) {
                  setProfile({
                    ...profile,
                    avatarUrl: uploadResult.fileUrl,
                  });
                }
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

  // Sync bioText with profile.bio when profile changes
  useEffect(() => {
    if (profile) {
      setBioText(profile.bio || "");
    }
  }, [profile?.bio]);

  const handleStartEditBio = () => {
    setBioText(profile?.bio || "");
    setIsEditingBio(true);
  };

  const handleCancelEditBio = () => {
    setBioText(profile?.bio || "");
    setIsEditingBio(false);
  };

  const handleSaveBio = async () => {
    if (!user || !profile) return;

    try {
      setSavingBio(true);

      // Update profile on backend
      const updatedProfile = await apiService.updateUserProfile({
        bio: bioText.trim() || undefined,
      });

      // Track profile update
      AnalyticsService.getInstance().logEvent("profile_updated", {
        update_type: "bio",
      });

      // Update local profile state
      setProfile({
        ...profile,
        bio: updatedProfile.bio,
      });

      // Update user in AuthContext
      await updateUser({
        bio: updatedProfile.bio || undefined,
      });

      setIsEditingBio(false);
    } catch (error) {
      console.error("Error updating bio:", error);
      Alert.alert(t("error"), t("failedToUpdateProfile"));
    } finally {
      setSavingBio(false);
    }
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
              {t("retry")}
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
            {t("noProfileDataAvailable")}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchProfile}
          >
            <Text
              style={[styles.retryButtonText, { color: colors.textInverse }]}
            >
              {t("retry")}
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

          {/* Bio */}
          <ResponsiveCard>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("about")}
              </Text>
              {!userId && !isEditingBio && (
                <Button
                  onPress={handleStartEditBio}
                  title={t("edit")}
                  variant="primary"
                  icon="pencil"
                  iconSize={14}
                  backgroundColor={colors.primary}
                />
              )}
            </View>

            {isEditingBio ? (
              <View style={styles.bioEditContainer}>
                <TextInput
                  style={[
                    styles.bioTextInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={bioText}
                  onChangeText={setBioText}
                  placeholder={t("tellUsAboutYourself")}
                  placeholderTextColor={colors.tabIconDefault}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={500}
                />
                {bioText.length > 400 && (
                  <Text
                    style={[
                      styles.characterCount,
                      { color: colors.tabIconDefault },
                      bioText.length > 480 && { color: "#FF6B6B" },
                    ]}
                  >
                    {bioText.length}/500 {t("charactersRemaining")}
                  </Text>
                )}
                <View style={styles.bioEditActions}>
                  <Button
                    variant="outline"
                    icon="xmark"
                    iconSize={14}
                    title={t("cancel")}
                    iconPosition="left"
                    backgroundColor={colors.background}
                    textColor={colors.text}
                    onPress={handleCancelEditBio}
                    disabled={savingBio}
                  />
                  <Button
                    variant="primary"
                    icon="checkmark"
                    iconSize={14}
                    title={t("save")}
                    iconPosition="left"
                    backgroundColor={colors.primary}
                    textColor="white"
                    onPress={handleSaveBio}
                    disabled={savingBio}
                  />
                </View>
              </View>
            ) : (
              <>
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
              </>
            )}
          </ResponsiveCard>

          {/* Languages Section */}
          <LanguagesSection
            profile={profile}
            userId={userId ? targetUserId : undefined}
            onProfileUpdate={(updatedProfile) => {
              setProfile(updatedProfile);
            }}
          />

          {/* Contact Information */}
          <ContactInfo
            profile={profile}
            hasActiveChat={hasActiveChat}
            userId={userId ? targetUserId : undefined}
            onProfileUpdate={(updatedProfile) => {
              setProfile(updatedProfile);
            }}
          />

          {/* Account Information */}
          <AccountInfo
            profile={profile}
            userId={userId ? targetUserId : undefined}
            onProfileUpdate={(updatedProfile) => {
              setProfile(updatedProfile);
            }}
          />

          {/* Payments entry point */}
          {!userId && (
            <ResponsiveCard>
              <View style={styles.paymentsPreview}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t("paymentsOverview")}
                  </Text>
                  <Text
                    style={[
                      styles.paymentsPreviewSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("paymentsOverviewDescription")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.paymentsCta, { borderColor: colors.primary }]}
                  onPress={() => router.push("/profile/payments")}
                >
                  <Text
                    style={[styles.paymentsCtaText, { color: colors.text }]}
                  >
                    {t("managePaymentsCta")}
                  </Text>
                  <IconSymbol
                    name="chevron.right"
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </ResponsiveCard>
          )}

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

          {/* Work Samples Section (for specialists only) */}
          {profile.role === "specialist" && (
            <ResponsiveCard>
              <WorkSamplesSection
                userId={userId ? targetUserId : user?.id}
                colors={colors}
                isOwnProfile={!userId}
              />
            </ResponsiveCard>
          )}

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
                    {t("retry")}
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

  // Credit card preview styles moved to dedicated screen
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
  editBioButton: {
    padding: 0,
    minWidth: 32,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  bioEditContainer: {
    gap: 12,
  },
  bioTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  bioEditActions: {
    flexDirection: "row",
    gap: 10,
  },
  bioActionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  bioCancelButton: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  bioSaveButton: {
    borderWidth: 0,
  },
  bioActionButtonText: {
    fontSize: 14,
    fontWeight: "600",
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
  paymentsPreview: {
    gap: Spacing.sm,
  },
  paymentsPreviewSubtitle: {
    fontSize: Typography.md,
    marginTop: Spacing.xs,
    lineHeight: Typography.lineHeightRelaxed * Typography.md,
  },
  paymentsCta: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xs,
  },
  paymentsCtaText: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
  },
});
