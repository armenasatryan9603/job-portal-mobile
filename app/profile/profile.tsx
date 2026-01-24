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
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { apiService, UserProfile, Review } from "@/categories/api";
import { fileUploadService } from "@/categories/fileUpload";
import { chatService } from "@/categories/chatService";
import { SkillsSection } from "@/components/SkillsSection";
import { ServicesSelectionModal } from "@/components/ServicesSelectionModal";
import { useSkills } from "@/hooks/useSkills";
import { ContactInfo } from "@/components/ContactInfo";
import { AccountInfo } from "@/components/AccountInfo";
import { LanguagesSection } from "@/components/LanguagesSection";
import { WorkSamplesSection } from "@/components/WorkSamplesSection";
import AnalyticsService from "@/categories/AnalyticsService";
import { useAnalytics } from "@/hooks/useAnalytics";
import { calculateAccountCompletion } from "@/utils/accountCompletion";
import { handleBannerUpload as handleBannerUploadUtil } from "@/utils/bannerUpload";
import { CircularProgress } from "@/components/CircularProgress";
import { LocationPicker } from "@/components/LocationPicker";
import { MapViewComponent } from "@/components/MapView";
import { CountBadge } from "@/components/CountBadge";
import { ProfileSkeleton } from "@/components/ProfileSkeleton";

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
  const isFetchingRef = useRef(false);

  // Reviews state management
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // Chat relationship state management
  const [hasActiveChat, setHasActiveChat] = useState(false);

  // Profile picture state management
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Bio editing state management
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  // Price range editing state management
  const [isEditingPrices, setIsEditingPrices] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [savingPrices, setSavingPrices] = useState(false);

  // Location editing state management
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  // Portfolio count state management
  const [portfolioCount, setPortfolioCount] = useState(0);

  // Teams state management
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

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
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
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
      setBannerImage((profileData as any).bannerUrl || null);

      // Mark that initial load is complete
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }

      // Fetch reviews after profile is loaded
      fetchReviews(profileData.id);

      // Check chat relationship for contact info visibility
      checkChatRelationship(profileData.id);

      // Fetch portfolio count for completion calculation
      fetchPortfolioCount(profileData.id);

      // Fetch teams for the profile being viewed
      fetchUserTeams(profileData.id);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(t("failedToLoadProfile"));

      // Don't show alert in test mode to avoid blocking the UI
      if (user) {
        Alert.alert(t("error"), t("failedToLoadProfile"));
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
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

  const fetchPortfolioCount = async (userId: number) => {
    try {
      const portfolioItems = await apiService.getPortfolio(userId);
      setPortfolioCount(portfolioItems.length);
    } catch (err) {
      console.error("Error fetching portfolio count:", err);
      setPortfolioCount(0); // Default to 0 if error
    }
  };

  const fetchUserTeams = async (profileUserId?: number) => {
    const targetId = profileUserId || user?.id;
    if (!targetId) return;
    try {
      setTeamsLoading(true);
      const teams = await apiService.getTeams();
      // Filter teams where the profile user is creator or member
      const userTeamsList = teams.filter((team: any) => {
        const isCreator = team.createdBy === targetId;
        const isMember = team.Members?.some(
          (member: any) => member.userId === targetId && member.isActive
        );
        return isCreator || isMember;
      });
      setUserTeams(userTeamsList);
    } catch (err) {
      console.error("Error fetching user teams:", err);
      setUserTeams([]);
    } finally {
      setTeamsLoading(false);
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

  const handleBannerTap = () => {
    if (userId || uploadingBanner) return; // Don't show options for other users or while uploading

    const options = [];
    if (bannerImage) {
      options.push({
        text: t("removeBanner"),
        onPress: handleBannerRemove,
        style: "destructive" as const,
      });
    }
    options.push({
      text: t("uploadBanner"),
      onPress: handleBannerUpload,
    });

    Alert.alert(t("bannerOptions"), t("chooseBannerAction"), [
      ...options,
      {
        text: t("cancel"),
        style: "cancel" as const,
      },
    ]);
  };

  const handleBannerRemove = async () => {
    if (!user || !profile) return;

    try {
      setUploadingBanner(true);

      // Update profile on backend with null bannerUrl
      await apiService.updateUserProfile({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore backend supports bannerUrl
        bannerUrl: null,
      });

      // Track profile update
      AnalyticsService.getInstance().logEvent("profile_updated", {
        update_type: "banner_removed",
      });

      // Update local state
      setBannerImage(null);
      if (profile) {
        setProfile({
          ...profile,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore extend profile with bannerUrl
          bannerUrl: null,
        } as UserProfile);
      }
      await updateUser({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore allow bannerUrl on user
        bannerUrl: null,
      } as any);
    } catch (error) {
      console.error("Error removing banner:", error);
      Alert.alert(t("error"), t("failedToRemoveBanner"));
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleBannerUpload = async () => {
    setUploadingBanner(true);
    try {
      await handleBannerUploadUtil({
        fileNamePrefix: "banner",
        onUploadSuccess: async (fileUrl) => {
          setBannerImage(fileUrl);
          if (user) {
            await apiService.updateUserProfile({
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore backend supports bannerUrl
              bannerUrl: fileUrl,
            });
            AnalyticsService.getInstance().logEvent("profile_updated", {
              update_type: "banner",
            });
            if (profile) {
              setProfile({
                ...profile,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore extend profile with bannerUrl
                bannerUrl: fileUrl,
              } as UserProfile);
            }
            await updateUser({
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore allow bannerUrl on user
              bannerUrl: fileUrl,
            } as any);
          }
        },
        onError: (error) => {
          Alert.alert(t("error"), error || t("failedToUploadProfilePicture"));
        },
        permissionRequiredText: t("permissionRequired"),
        permissionToAccessText: t("permissionToAccessCameraRoll"),
        uploadFailedText: t("uploadFailed"),
        failedToSelectImageText: t("failedToSelectImage"),
        failedToUploadText: t("failedToUploadProfilePicture"),
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  // Sync bioText with profile.bio when profile changes
  useEffect(() => {
    if (profile) {
      setBioText(profile.bio || "");
    }
  }, [profile?.bio]);

  // Sync price and location fields with profile when profile changes
  useEffect(() => {
    if (profile) {
      const profileAny = profile as any;
      setPriceMin(profileAny.priceMin?.toString() || "");
      setPriceMax(profileAny.priceMax?.toString() || "");
      setLocationText(profileAny.location || "");
    }
  }, [profile]);

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

  const handleStartEditPrices = () => {
    const profileAny = profile as any;
    setPriceMin(profileAny.priceMin?.toString() || "");
    setPriceMax(profileAny.priceMax?.toString() || "");
    setIsEditingPrices(true);
  };

  const handleCancelEditPrices = () => {
    const profileAny = profile as any;
    setPriceMin(profileAny.priceMin?.toString() || "");
    setPriceMax(profileAny.priceMax?.toString() || "");
    setIsEditingPrices(false);
  };

  const handleSavePrices = async () => {
    if (!user || !profile) return;

    // Validate prices
    const min = priceMin.trim() ? parseFloat(priceMin.trim()) : undefined;
    const max = priceMax.trim() ? parseFloat(priceMax.trim()) : undefined;

    if (min !== undefined && isNaN(min)) {
      Alert.alert(t("error"), t("pleaseEnterValidPrice"));
      return;
    }

    if (max !== undefined && isNaN(max)) {
      Alert.alert(t("error"), t("pleaseEnterValidPrice"));
      return;
    }

    if (min !== undefined && max !== undefined && min > max) {
      Alert.alert(t("error"), t("minimumPriceCannotBeGreaterThanMaximumPrice"));
      return;
    }

    try {
      setSavingPrices(true);

      // Update specialist profile on backend
      await apiService.updateSpecialistProfile(profile.id, {
        priceMin: min,
        priceMax: max,
      });

      // Track profile update
      AnalyticsService.getInstance().logEvent("profile_updated", {
        update_type: "prices",
      });

      // Update local profile state
      const profileAny = profile as any;
      setProfile({
        ...profile,
        ...(min !== undefined && { priceMin: min }),
        ...(max !== undefined && { priceMax: max }),
      });

      setIsEditingPrices(false);
    } catch (error: any) {
      console.error("Error updating prices:", error);
      const errorMessage = error?.message || t("failedToUpdateProfile");
      Alert.alert(t("error"), errorMessage);
    } finally {
      setSavingPrices(false);
    }
  };

  const handleStartEditLocation = () => {
    const profileAny = profile as any;
    setLocationText(profileAny.location || "");
    setIsEditingLocation(true);
  };

  const handleCancelEditLocation = () => {
    const profileAny = profile as any;
    setLocationText(profileAny.location || "");
    setIsEditingLocation(false);
    setShowLocationPicker(false);
  };

  const handleLocationSelect = (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    console.log("Location selected:", location);
    setLocationText(location.address);
    setShowLocationPicker(false);
    setShowMapView(false);
  };

  const handleMapLocationSelect = (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    console.log("Map location selected:", location);
    setLocationText(location.address);
    setShowMapView(false);
  };

  const handleSaveLocation = async () => {
    if (!user || !profile) {
      console.log("Cannot save location: user or profile missing", {
        user,
        profile,
      });
      return;
    }

    if (!locationText.trim()) {
      Alert.alert(t("error"), t("pleaseEnterLocation"));
      return;
    }

    try {
      setSavingLocation(true);
      console.log(
        "Saving location:",
        locationText.trim(),
        "for user:",
        profile.id
      );

      // Update specialist profile on backend
      const result = await apiService.updateSpecialistProfile(profile.id, {
        location: locationText.trim(),
      });

      console.log("Location update result:", result);

      // Track profile update
      AnalyticsService.getInstance().logEvent("profile_updated", {
        update_type: "location",
      });

      // Refresh profile to get updated data
      await fetchProfile();

      setIsEditingLocation(false);
    } catch (error: any) {
      console.error("Error updating location:", error);
      const errorMessage = error?.message || t("failedToUpdateProfile");
      Alert.alert(t("error"), errorMessage);
    } finally {
      setSavingLocation(false);
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

  // Show loading state only on initial load (when we don't have profile data yet)
  if (loading && !profile) {
    return <ProfileSkeleton header={header} />;
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
          {/* Profile Header with banner background */}
          <ResponsiveCard padding={0} style={{ overflow: "hidden" }}>
            <View style={[{ paddingTop: userId && !bannerImage ? 0 : 140 }]}>
              {bannerImage && (
                <Image
                  source={{ uri: bannerImage }}
                  style={styles.bannerImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              )}
              {!userId && (
                <TouchableOpacity
                  style={styles.bannerTapArea}
                  onPress={handleBannerTap}
                  activeOpacity={0.8}
                  disabled={!!userId || uploadingBanner}
                >
                  {!bannerImage && (
                    <View
                      style={[
                        styles.bannerPlaceholder,
                        { backgroundColor: colors.border, width: "100%" },
                      ]}
                    >
                      <IconSymbol
                        name="photo"
                        size={28}
                        color={colors.tabIconDefault}
                      />
                      <Text
                        style={[
                          styles.bannerPlaceholderText,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {t("addBanner")}
                      </Text>
                    </View>
                  )}
                  {uploadingBanner && (
                    <View style={styles.bannerLoadingOverlay}>
                      <ActivityIndicator size="small" color={colors.tint} />
                    </View>
                  )}
                </TouchableOpacity>
              )}

              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  {(() => {
                    const completionPercentage =
                      !userId && profile
                        ? calculateAccountCompletion(
                            profile,
                            skills.userServices.length,
                            portfolioCount
                          )
                        : 100;

                    return (
                      <>
                        {/* Circular Progress Ring */}
                        {!userId && profile && (
                          <View style={styles.progressWrapper}>
                            <CircularProgress
                              percentage={completionPercentage}
                              size={88}
                              strokeWidth={4}
                              backgroundColor={colors.border}
                              progressColor={
                                completionPercentage === 100
                                  ? colors.success
                                  : colors.primary
                              }
                            />
                          </View>
                        )}
                        {!userId ? (
                          <TouchableOpacity
                            onPress={handleProfilePictureUpload}
                            disabled={uploadingPicture}
                            activeOpacity={0.7}
                          >
                            {profilePicture || profile.avatarUrl ? (
                              <Image
                                source={{
                                  uri: profilePicture || profile.avatarUrl,
                                }}
                                style={styles.avatar}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={200}
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
                            {uploadingPicture && (
                              <View style={styles.uploadingOverlay}>
                                <ActivityIndicator size="small" color={colors.textInverse} />
                              </View>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <>
                            {profilePicture || profile.avatarUrl ? (
                              <Image
                                source={{
                                  uri: profilePicture || profile.avatarUrl,
                                }}
                                style={styles.avatar}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={200}
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
                          </>
                        )}
                        {/* Completion Percentage Badge */}
                        {!userId && profile && (
                          <View
                            style={[
                              styles.completionBadge,
                              {
                                backgroundColor:
                                  completionPercentage === 100
                                    ? colors.success
                                    : colors.primary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.completionBadgeText,
                                {
                                  color: colors.textInverse,
                                  fontSize:
                                    completionPercentage === 100 ? 9 : 11,
                                },
                              ]}
                            >
                              {completionPercentage}%
                            </Text>
                          </View>
                        )}
                      </>
                    );
                  })()}
                </View>

                <View style={styles.profileInfo}>
                  <View style={styles.nameAndEditContainer}>
                    <Text style={[styles.profileName, { color: colors.text }]}>
                      {profile.name}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.profileTitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {profile.role.charAt(0).toUpperCase() +
                      profile.role.slice(1)}
                  </Text>

                  <View style={styles.ratingContainer}>
                    <IconSymbol
                      name={
                        profile.verified
                          ? "checkmark.seal.fill"
                          : "checkmark.seal"
                      }
                      size={16}
                      color={
                        profile.verified ? colors.success : colors.textSecondary
                      }
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
            </View>
          </ResponsiveCard>

          {/* Bio */}
          <ResponsiveCard>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
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
                      bioText.length > 480 && { color: colors.danger },
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
                    textColor={colors.textInverse}
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

          {/* Teams Section - Show teams user is part of */}
          {(userTeams.length > 0 || teamsLoading) && (
            <ResponsiveCard>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {userId ? t("teams") : t("myTeams")}
                  </Text>
                  {!teamsLoading && <CountBadge count={userTeams.length} />}
                </View>
              </View>

              {teamsLoading ? (
                <View style={styles.teamsLoadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text
                    style={[styles.teamsLoadingText, { color: colors.text }]}
                  >
                    {t("loadingTeams")}
                  </Text>
                </View>
              ) : userTeams.length > 0 ? (
                <>
                  <View style={styles.teamsList}>
                    {userTeams.map((team: any) => {
                      const profileUserId = userId ? targetUserId : user?.id;
                      const isCreator = team.createdBy === profileUserId;
                      const memberCount =
                        team.Members?.filter((m: any) => m.isActive).length ||
                        0;
                      return (
                        <TouchableOpacity
                          key={team.id}
                          style={[
                            styles.teamItem,
                            { borderColor: colors.border },
                          ]}
                          onPress={() => router.push(`/teams/${team.id}`)}
                        >
                          <View style={styles.teamItemContent}>
                            <View style={styles.teamItemHeader}>
                              <Text
                                style={[
                                  styles.teamItemName,
                                  { color: colors.text },
                                ]}
                              >
                                {team.name}
                              </Text>
                              {isCreator && (
                                <View
                                  style={[
                                    styles.teamLeadBadge,
                                    { backgroundColor: colors.primary + "20" },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.teamLeadBadgeText,
                                      { color: colors.primary },
                                    ]}
                                  >
                                    {t("lead")}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.teamItemMeta}>
                              <IconSymbol
                                name="person.3.fill"
                                size={14}
                                color={colors.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.teamItemMetaText,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {memberCount} {t("members")}
                              </Text>
                            </View>
                          </View>
                          <IconSymbol
                            name="chevron.right"
                            size={16}
                            color={colors.tabIconDefault}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {!userId && (
                    <TouchableOpacity
                      style={[
                        styles.viewAllTeamsButton,
                        { borderColor: colors.primary },
                      ]}
                      onPress={() => router.push("/profile/peers")}
                    >
                      <Text
                        style={[
                          styles.viewAllTeamsButtonText,
                          { color: colors.primary },
                        ]}
                      >
                        {t("manageAllTeams")}
                      </Text>
                      <IconSymbol
                        name="chevron.right"
                        size={16}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                </>
              ) : null}
            </ResponsiveCard>
          )}

          {/* Peers & Teams entry point - Only for specialists */}
          {!userId &&
            profile?.role === "specialist" &&
            userTeams.length === 0 && (
              <ResponsiveCard>
                <View style={styles.paymentsPreview}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t("peersAndTeams")}
                    </Text>
                    <Text
                      style={[
                        styles.paymentsPreviewSubtitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("managePeersAndTeamsDescription")}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.paymentsCta,
                      { borderColor: colors.primary },
                    ]}
                    onPress={() => router.push("/profile/peers")}
                  >
                    <Text
                      style={[styles.paymentsCtaText, { color: colors.text }]}
                    >
                      {t("managePeers")}
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
                {/* Subscriptions */}
                <View style={styles.paymentsPreview}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t("subscriptions")}
                    </Text>
                    <Text
                      style={[
                        styles.paymentsPreviewSubtitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("subscriptionsDescription")}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.paymentsCta, { borderColor: colors.primary }]}
                  onPress={() => {
                    AnalyticsService.getInstance().logEvent("button_clicked", {
                      button_name: "view_subscriptions",
                      location: "payments_screen",
                    });
                    router.push("/subscriptions");
                  }}
                >
                  <Text
                    style={[styles.paymentsCtaText, { color: colors.text }]}
                  >
                    {t("viewSubscriptions")}
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

          {/* Price Range Section (for specialists only) */}
          {profile.role === "specialist" && !userId && (
            <ResponsiveCard>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("priceRange")}
                </Text>
                {!isEditingPrices && (
                  <Button
                    onPress={handleStartEditPrices}
                    title={t("edit")}
                    variant="primary"
                    icon="pencil"
                    iconSize={14}
                    backgroundColor={colors.primary}
                  />
                )}
              </View>

              {isEditingPrices ? (
                <View style={styles.priceEditContainer}>
                  <View style={styles.priceInputRow}>
                    <View style={styles.priceInputGroup}>
                      <Text style={[styles.priceLabel, { color: colors.text }]}>
                        {t("minimumPrice")} (USD)
                      </Text>
                      <View
                        style={[
                          styles.priceInputContainer,
                          { borderColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pricePrefix,
                            { color: colors.textSecondary },
                          ]}
                        >
                          $
                        </Text>
                        <TextInput
                          style={[styles.priceInput, { color: colors.text }]}
                          value={priceMin}
                          onChangeText={setPriceMin}
                          placeholder="0"
                          placeholderTextColor={colors.tabIconDefault}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <View style={styles.priceInputGroup}>
                      <Text style={[styles.priceLabel, { color: colors.text }]}>
                        {t("maximumPrice")} (USD)
                      </Text>
                      <View
                        style={[
                          styles.priceInputContainer,
                          { borderColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pricePrefix,
                            { color: colors.textSecondary },
                          ]}
                        >
                          $
                        </Text>
                        <TextInput
                          style={[styles.priceInput, { color: colors.text }]}
                          value={priceMax}
                          onChangeText={setPriceMax}
                          placeholder="0"
                          placeholderTextColor={colors.tabIconDefault}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>
                  <View style={styles.priceEditActions}>
                    <Button
                      variant="outline"
                      icon="xmark"
                      iconSize={14}
                      title={t("cancel")}
                      iconPosition="left"
                      backgroundColor={colors.background}
                      textColor={colors.text}
                      onPress={handleCancelEditPrices}
                      disabled={savingPrices}
                    />
                    <Button
                      variant="primary"
                      icon="checkmark"
                      iconSize={14}
                      title={t("save")}
                      iconPosition="left"
                      backgroundColor={colors.primary}
                      textColor={colors.textInverse}
                      onPress={handleSavePrices}
                      disabled={savingPrices}
                    />
                  </View>
                </View>
              ) : (
                <View>
                  {(() => {
                    const profileAny = profile as any;
                    const min = profileAny.priceMin;
                    const max = profileAny.priceMax;
                    if (min || max) {
                      return (
                        <Text
                          style={[styles.priceDisplay, { color: colors.text }]}
                        >
                          {min ? `$${min}` : t("notSet")} -{" "}
                          {max ? `$${max}` : t("notSet")}
                        </Text>
                      );
                    } else {
                      return (
                        <Text
                          style={[
                            styles.priceDisplay,
                            {
                              color: colors.textSecondary,
                              fontStyle: "italic",
                            },
                          ]}
                        >
                          {t("noPriceRangeSet")}
                        </Text>
                      );
                    }
                  })()}
                </View>
              )}
            </ResponsiveCard>
          )}

          {/* Location Section (for specialists only) */}
          {profile.role === "specialist" && !userId && (
            <ResponsiveCard>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("location")}
                </Text>
                {!isEditingLocation && (
                  <Button
                    onPress={handleStartEditLocation}
                    title={t("edit")}
                    variant="primary"
                    icon="pencil"
                    iconSize={14}
                    backgroundColor={colors.primary}
                  />
                )}
              </View>

              {isEditingLocation ? (
                <View style={styles.locationEditContainer}>
                  <View style={styles.locationInputContainer}>
                    <TextInput
                      style={[
                        styles.locationInput,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                      value={locationText}
                      onChangeText={setLocationText}
                      placeholder={t("locationPlaceholder")}
                      placeholderTextColor={colors.tabIconDefault}
                    />
                    <TouchableOpacity
                      style={[
                        styles.locationPickerButton,
                        { borderColor: colors.primary },
                      ]}
                      onPress={() => setShowLocationPicker(true)}
                    >
                      <IconSymbol name="map" size={18} color={colors.primary} />
                      <Text
                        style={[
                          styles.locationPickerButtonText,
                          { color: colors.primary },
                        ]}
                      >
                        {t("selectOnMap")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.locationEditActions}>
                    <Button
                      variant="outline"
                      icon="xmark"
                      iconSize={14}
                      title={t("cancel")}
                      iconPosition="left"
                      backgroundColor={colors.background}
                      textColor={colors.text}
                      onPress={handleCancelEditLocation}
                      disabled={savingLocation}
                    />
                    <Button
                      variant="primary"
                      icon="checkmark"
                      iconSize={14}
                      title={t("save")}
                      iconPosition="left"
                      backgroundColor={colors.primary}
                      textColor={colors.textInverse}
                      onPress={handleSaveLocation}
                      disabled={savingLocation}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.locationDisplayContainer}>
                  {(() => {
                    const profileAny = profile as any;
                    const location = profileAny.location;
                    if (location && location.trim().length > 0) {
                      return (
                        <View style={styles.locationDisplayRow}>
                          <IconSymbol
                            name="location.fill"
                            size={18}
                            color={colors.primary}
                          />
                          <Text
                            style={[
                              styles.locationDisplay,
                              { color: colors.text },
                            ]}
                          >
                            {location}
                          </Text>
                        </View>
                      );
                    } else {
                      return (
                        <Text
                          style={[
                            styles.locationDisplay,
                            {
                              color: colors.textSecondary,
                              fontStyle: "italic",
                            },
                          ]}
                        >
                          {t("noLocationSet")}
                        </Text>
                      );
                    }
                  })()}
                </View>
              )}
            </ResponsiveCard>
          )}

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
                {reviews.map((review, index) => (
                  <View
                    key={review.id}
                    style={[
                      {
                        borderBottomWidth: index === reviews.length - 1 ? 0 : 1,
                        paddingBottom: index === reviews.length - 1 ? 0 : 16,
                      },
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
                          {review.Order.Category?.name || t("category")}
                        </Text>
                      </View>
                      <View style={styles.userReviewRating}>
                        {[...Array(5)].map((_, i) => (
                          <IconSymbol
                            key={i}
                            name="star.fill"
                            size={14}
                            color={
                              i < review.rating ? colors.rating : colors.border
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
                          {t("budget")}: ${review.Order.budget}
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

      {/* Location Picker Modal (for manual entry) */}
      <LocationPicker
        visible={showLocationPicker}
        onClose={() => {
          console.log("LocationPicker closed");
          setShowLocationPicker(false);
        }}
        onLocationSelect={(location) => {
          console.log("LocationPicker onLocationSelect called:", location);
          handleLocationSelect(location);
        }}
        initialLocation={
          locationText
            ? {
                latitude: 0,
                longitude: 0,
                address: locationText,
              }
            : undefined
        }
      />

      {/* Map View Modal (direct map selection) */}
      {showMapView && (
        <Modal
          visible={showMapView}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => {
            console.log("MapView closed");
            setShowMapView(false);
          }}
        >
          <MapViewComponent
            initialLocation={
              locationText
                ? {
                    latitude: 0,
                    longitude: 0,
                    address: locationText,
                  }
                : undefined
            }
            onLocationSelect={handleMapLocationSelect}
            onClose={() => {
              console.log("MapView onClose called");
              setShowMapView(false);
            }}
            showCurrentLocationButton={true}
          />
        </Modal>
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  // Profile header
  profileHeader: {
    padding: Spacing.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarContainer: {
    position: "relative",
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrapper: {
    position: "absolute",
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    zIndex: 2,
  },
  defaultAvatar: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  completionBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  completionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
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
  bannerImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: 140,
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bannerPlaceholderText: {
    fontSize: 14,
    fontWeight: "600",
  },
  bannerLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
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

  // Account completion
  completionContainer: {
    paddingVertical: 4,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  completionPercentage: {
    fontSize: 18,
    fontWeight: "700",
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  completionHint: {
    fontSize: 12,
    fontStyle: "italic",
  },
  // Section titles
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
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
  // Price range styles
  priceEditContainer: {
    gap: 16,
  },
  priceInputRow: {
    flexDirection: "row",
    gap: 12,
  },
  priceInputGroup: {
    flex: 1,
    gap: 8,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  pricePrefix: {
    fontSize: 15,
    fontWeight: "600",
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 0,
  },
  priceEditActions: {
    flexDirection: "row",
    gap: 10,
  },
  priceDisplay: {
    fontSize: 16,
    fontWeight: "500",
  },
  // Location styles
  locationEditContainer: {
    gap: 16,
  },
  locationInputContainer: {
    gap: 12,
  },
  locationInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  locationPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  locationPickerButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  locationEditActions: {
    flexDirection: "row",
    gap: 10,
  },
  locationDisplayContainer: {
    paddingVertical: 8,
  },
  locationDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationDisplay: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  // Missing fields styles
  missingFieldsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  missingFieldsTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  missingFieldsDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  missingFieldsList: {
    gap: 8,
  },
  missingFieldItem: {
    paddingLeft: 12,
    borderLeftWidth: 3,
    paddingVertical: 4,
  },
  missingFieldText: {
    fontSize: 15,
    lineHeight: 22,
  },
  // Teams styles
  teamsLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 10,
  },
  teamsLoadingText: {
    fontSize: 14,
  },
  teamsList: {
    gap: 12,
    marginBottom: 16,
  },
  teamItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  teamItemContent: {
    flex: 1,
  },
  teamItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  teamItemName: {
    fontSize: 16,
    fontWeight: "600",
  },
  teamLeadBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  teamLeadBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  teamItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  teamItemMetaText: {
    fontSize: 13,
  },
  viewAllTeamsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  viewAllTeamsButtonText: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
  },
});
