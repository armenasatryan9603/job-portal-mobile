import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { LocationPicker } from "@/components/LocationPicker";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { apiService, UserProfile, UpdateUserProfileData } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { fileUploadService } from "@/services/fileUpload";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { user, setUser } = useAuth();

  // API state management
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile picture state management
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<any>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  // Test mode state
  const [testUserId, setTestUserId] = useState(1);
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    bio: "",
  });

  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  // Fetch user profile on component mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // Refetch profile when test user ID changes
  useEffect(() => {
    if (!user) {
      fetchProfile();
    }
  }, [testUserId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      let profileData: UserProfile;

      if (user) {
        // Authenticated user - get their profile from backend
        profileData = await apiService.getUserProfile();
      } else {
        // Test mode - get real user data from backend by ID (no auth required)
        console.log(
          `Test mode: Loading user profile for editing - user ID ${testUserId}`
        );
        profileData = await apiService.getUserById(testUserId);
      }

      setProfile(profileData);
      setFormData({
        name: profileData.name,
        phone: profileData.phone || "",
        email: profileData.email || "",
        bio: profileData.bio || "",
      });
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile. Please try again.");
      const { t } = useLanguage();

      // Don't show alert in test mode to avoid blocking the UI
      if (user) {
        Alert.alert(t("error"), t("failedToLoadProfile"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      setError(null);

      let avatarUrl = profilePicture;

      // If a new image was selected, upload it to storage first
      if (selectedImageFile) {
        console.log("Uploading selected image:", selectedImageFile.fileName);

        const uploadResult = await fileUploadService.uploadProfilePicture(
          selectedImageFile
        );

        if (uploadResult.success && uploadResult.fileUrl) {
          console.log("Image uploaded successfully:", uploadResult.fileUrl);
          avatarUrl = uploadResult.fileUrl;
        } else {
          throw new Error(uploadResult.error || "Failed to upload image");
        }
      }

      const updateData: UpdateUserProfileData = {
        name: formData.name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        bio: formData.bio || undefined,
        avatarUrl: avatarUrl || undefined,
      };

      let updatedProfile: UserProfile;

      if (user) {
        // Authenticated user - update via auth profile endpoint
        updatedProfile = await apiService.updateUserProfile(updateData);
      } else {
        // Test mode - update via user ID endpoint (no auth required)
        console.log(
          `Test mode: Updating user profile for user ID ${testUserId}`
        );
        updatedProfile = await apiService.updateUserById(
          testUserId,
          updateData
        );
      }

      setProfile(updatedProfile);

      // Update the user object in AuthContext with the new avatarUrl
      if (user && updatedProfile.avatarUrl) {
        const updatedUser = {
          ...user,
          avatarUrl: updatedProfile.avatarUrl,
          name: updatedProfile.name,
          email: updatedProfile.email,
          phone: updatedProfile.phone,
          bio: updatedProfile.bio,
        };
        // Update AsyncStorage with the new user data
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
        // Update the user in AuthContext
        setUser(updatedUser);
      }

      // Profile updated successfully
      // Navigate back with the updated user ID to trigger refresh
      if (user) {
        router.back();
      } else {
        // In test mode, pass the user ID to ensure the profile page shows the right user
        router.replace(`/profile/profile?refreshUserId=${testUserId}`);
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      Alert.alert(t("error"), t("failedToUpdateProfile"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationSelect = (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    setUserLocation(location);
  };

  const handleChangePhoto = async () => {
    try {
      // Request permissions
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Required",
          "Permission to access camera roll is required!"
        );
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

        console.log("Image selected for profile picture:", mediaFile.fileName);

        // Show local preview immediately
        setProfilePicture(asset.uri);
        setSelectedImageFile(mediaFile);

        Alert.alert(
          "Image Selected",
          "Image selected! Tap Save Changes to upload and apply."
        );
      }
    } catch (error) {
      console.error("Error selecting profile picture:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const header = (
    <Header
      title={t("editProfile")}
      subtitle={
        user
          ? t("updateProfessionalInfo")
          : `${t("testModeEditing")} ${testUserId}`
      }
      showBackButton={true}
      onBackPress={handleCancel}
    />
  );

  // Show loading state
  if (loading) {
    return (
      <Layout header={header}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t("loadingProfile")}
          </Text>
        </View>
      </Layout>
    );
  }

  // Show error state
  if (error || !profile) {
    return (
      <Layout header={header}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error || t("profileNotFound")}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={fetchProfile}
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

  return (
    <Layout header={header}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          {/* Combined Profile and Form Section */}
          <ResponsiveCard style={{ marginBottom: 20 }}>
            <View style={styles.combinedSection}>
              {/* Profile Photo */}
              <View style={styles.avatarContainer}>
                {profilePicture || profile.avatarUrl ? (
                  <Image
                    source={{ uri: profilePicture || profile.avatarUrl }}
                    style={styles.profileAvatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.profileAvatar,
                      styles.defaultAvatar,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <IconSymbol
                      name="person.fill"
                      size={40}
                      color={colors.tabIconDefault}
                    />
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.editIconButton,
                    { backgroundColor: colors.tint },
                  ]}
                  onPress={handleChangePhoto}
                >
                  <IconSymbol
                    name="pencil"
                    size={14}
                    color={colors.background}
                  />
                </TouchableOpacity>
              </View>

              {/* Form Fields */}
              <View style={styles.formSection}>
                {/* Name Input */}
                <View style={styles.compactInputGroup}>
                  <Text
                    style={[styles.compactInputLabel, { color: colors.text }]}
                  >
                    {t("fullName")}
                  </Text>
                  <TextInput
                    style={[
                      styles.compactTextInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={formData.name}
                    onChangeText={(value) => updateField("name", value)}
                    placeholder={t("enterFullName")}
                    placeholderTextColor={colors.tabIconDefault}
                  />
                </View>

                {/* Email Input */}
                <View style={styles.compactInputGroup}>
                  <Text
                    style={[styles.compactInputLabel, { color: colors.text }]}
                  >
                    {t("emailAddress")}
                  </Text>
                  <TextInput
                    style={[
                      styles.compactTextInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={formData.email}
                    onChangeText={(value) => updateField("email", value)}
                    placeholder={t("enterEmailAddress")}
                    placeholderTextColor={colors.tabIconDefault}
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                </View>

                {/* Phone Input */}
                <View style={styles.compactInputGroup}>
                  <Text
                    style={[styles.compactInputLabel, { color: colors.text }]}
                  >
                    {t("phoneNumber")}
                  </Text>
                  <TextInput
                    style={[
                      styles.compactTextInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={formData.phone}
                    onChangeText={(value) => updateField("phone", value)}
                    placeholder={t("enterPhoneNumber")}
                    placeholderTextColor={colors.tabIconDefault}
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Bio Input */}
                <View style={styles.compactInputGroup}>
                  <Text
                    style={[styles.compactInputLabel, { color: colors.text }]}
                  >
                    {t("bio")}
                  </Text>
                  <TextInput
                    style={[
                      styles.compactTextArea,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={formData.bio}
                    onChangeText={(value) => updateField("bio", value)}
                    placeholder={t("tellUsAboutYourself")}
                    placeholderTextColor={colors.tabIconDefault}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>
          </ResponsiveCard>

          {/* Fixed Save Button */}
          <View style={styles.fixedSaveButton}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.tint },
                saving && { opacity: 0.7 },
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text
                  style={[styles.saveButtonText, { color: colors.background }]}
                >
                  {t("saveChanges")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ResponsiveContainer>
      </ScrollView>

      <LocationPicker
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={userLocation || undefined}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  // Combined Section
  combinedSection: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 20,
  },
  avatarContainer: {
    position: "relative",
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIconButton: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },

  // Form Section
  formSection: {
    width: "100%",
    gap: 16,
  },
  compactInputGroup: {
    gap: 6,
  },
  compactInputLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  compactTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  compactTextArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
  },

  // Fixed Save Button
  fixedSaveButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 100, // Account for tab bar
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

  // Common styles
  defaultAvatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
