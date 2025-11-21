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
import { useTranslation } from "@/contexts/TranslationContext";
import { fileUploadService } from "@/services/fileUpload";
import { Button } from "@/components/ui/button";

export default function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { user, updateUser } = useAuth();

  // API state management
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile picture state management
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<any>(null);
  const { t } = useTranslation();

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
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get authenticated user's profile from backend
      const profileData = await apiService.getUserProfile();

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
      Alert.alert(t("error"), t("failedToLoadProfile"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !user) return;

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

      // Update authenticated user's profile via auth profile endpoint
      const updatedProfile = await apiService.updateUserProfile(updateData);

      setProfile(updatedProfile);

      // Update the user object in AuthContext with all updated fields
      if (user) {
        await updateUser({
          name: updatedProfile.name,
          email: updatedProfile.email,
          phone: updatedProfile.phone || user.phone,
          avatarUrl: updatedProfile.avatarUrl || user.avatarUrl,
          bio: updatedProfile.bio || user.bio,
        });
      }

      // Profile updated successfully - navigate back
      router.back();
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
      subtitle={t("updateProfessionalInfo")}
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

  // If user is not authenticated, show error
  if (!user) {
    return (
      <Layout header={header}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {t("authenticationRequired") ||
              "Please log in to edit your profile"}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={() => router.back()}
          >
            <Text
              style={[styles.retryButtonText, { color: colors.background }]}
            >
              {t("goBack")}
            </Text>
          </TouchableOpacity>
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
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleChangePhoto}
                >
                  <IconSymbol name="camera.fill" size={16} color="white" />
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

            <Button
              disabled={saving}
              onPress={handleSave}
              variant="primary"
              iconSize={14}
              backgroundColor={colors.primary}
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
            </Button>
          </ResponsiveCard>
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
