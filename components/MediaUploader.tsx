import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fileUploadService } from "@/services/fileUpload";
import { useTranslation } from "@/hooks/useTranslation";

interface MediaFile {
  uri: string;
  type: "image" | "video";
  fileName: string;
  mimeType: string;
  fileSize: number;
}

interface MediaUploaderProps {
  onMediaChange: (mediaFiles: MediaFile[]) => void;
  maxFiles?: number;
  onUploadProgress?: (completed: number, total: number) => void;
  value?: MediaFile[]; // Controlled component: accept initial/external mediaFiles
  selectedBannerIndex?: number; // Index of the selected banner image
  onBannerSelect?: (index: number | null) => void; // Callback when banner is selected
  existingBannerId?: number; // ID of existing banner image (for editing)
}

const { width } = Dimensions.get("window");
const ITEM_SIZE = (width - 60) / 3; // 3 items per row with padding

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  onMediaChange,
  maxFiles = 10,
  value,
  selectedBannerIndex,
  onBannerSelect,
  existingBannerId,
}) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const [imageLoadingStates, setImageLoadingStates] = useState<
    Record<number, boolean>
  >({});
  const [imageErrorStates, setImageErrorStates] = useState<
    Record<number, boolean>
  >({});
  const colors = ThemeColors[colorScheme ?? "light"];
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(value || []);

  // Sync with external value prop (controlled component)
  useEffect(() => {
    if (value !== undefined) {
      setMediaFiles(value);
    }
  }, [value]);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("permissionRequired"), t("cameraRollPermissionMessage"));
      return false;
    }
    return true;
  };

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("permissionRequired"), t("cameraPermissionMessage"));
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets) {
      const newMediaFiles: MediaFile[] = [];

      for (const asset of result.assets) {
        const mediaFile: MediaFile = {
          uri: asset.uri,
          type: asset.type === "video" ? "video" : "image",
          fileName:
            asset.fileName ||
            `media_${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
          mimeType: asset.type === "video" ? "video/mp4" : "image/jpeg",
          fileSize: asset.fileSize || 0,
        };

        // Validate file
        const validation = fileUploadService.validateFile(mediaFile);
        if (validation.valid) {
          newMediaFiles.push(mediaFile);
        } else {
          Alert.alert(
            t("error"),
            `${asset.fileName || "File"}: ${validation.error}`
          );
        }
      }

      if (newMediaFiles.length > 0) {
        const updatedFiles = [...mediaFiles, ...newMediaFiles].slice(
          0,
          maxFiles
        );
        setMediaFiles(updatedFiles);
        onMediaChange(updatedFiles);
      }
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newMediaFile: MediaFile = {
        uri: asset.uri,
        type: asset.type === "video" ? "video" : "image",
        fileName:
          asset.fileName ||
          `camera_${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
        mimeType: asset.type === "video" ? "video/mp4" : "image/jpeg",
        fileSize: asset.fileSize || 0,
      };

      // Validate file
      const validation = fileUploadService.validateFile(newMediaFile);
      if (validation.valid) {
        const updatedFiles = [...mediaFiles, newMediaFile].slice(0, maxFiles);
        setMediaFiles(updatedFiles);
        onMediaChange(updatedFiles);
      } else {
        Alert.alert(
          t("error"),
          `${asset.fileName || "File"}: ${validation.error}`
        );
      }
    }
  };

  const removeMedia = (index: number) => {
    const updatedFiles = mediaFiles.filter((_, i) => i !== index);
    setMediaFiles(updatedFiles);
    onMediaChange(updatedFiles);
  };

  const showActionSheet = () => {
    Alert.alert(t("selectMedia"), t("selectMediaSource"), [
      {
        text: t("camera"),
        onPress: takePhoto,
      },
      {
        text: t("photoLibrary"),
        onPress: pickImage,
      },
      {
        text: t("cancel"),
        style: "cancel",
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t("mediaFiles")} ({mediaFiles.length}/{maxFiles})
      </Text>
      <Text style={[styles.sectionSubtitle, { color: colors.tabIconDefault }]}>
        {t("mediaFilesDescription")}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.mediaContainer}
      >
        {/* Add Media Button */}
        {mediaFiles.length < maxFiles && (
          <TouchableOpacity
            style={[
              styles.addMediaButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={showActionSheet}
          >
            <IconSymbol name="plus" size={24} color={colors.tint} />
            <Text style={[styles.addMediaText, { color: colors.tint }]}>
              {t("addMedia")}
            </Text>
          </TouchableOpacity>
        )}

        {/* Media Files */}
        {mediaFiles.map((media, index) => {
          const isBanner = selectedBannerIndex === index;
          const isExistingBanner =
            existingBannerId && (media as any).id === existingBannerId;
          const showBannerBadge = isBanner || isExistingBanner;

          return (
            <View key={index} style={styles.mediaItem}>
              <View style={styles.mediaWrapper}>
                {media.type === "image" ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (onBannerSelect) {
                        onBannerSelect(isBanner ? null : index);
                      }
                    }}
                    activeOpacity={0.8}
                    style={styles.imageContainer}
                  >
                    {imageLoadingStates[index] && (
                      <View
                        style={[
                          styles.imageSkeleton,
                          { backgroundColor: colors.border },
                        ]}
                      >
                        <ActivityIndicator size="small" color={colors.tint} />
                      </View>
                    )}
                    <Image
                      source={{ uri: media.uri }}
                      style={[
                        styles.mediaImage,
                        showBannerBadge ? styles.bannerImage : undefined,
                        imageLoadingStates[index] && styles.imageHidden,
                      ]}
                      resizeMode="cover"
                      onLoadStart={() => {
                        setImageLoadingStates((prev) => ({
                          ...prev,
                          [index]: true,
                        }));
                        setImageErrorStates((prev) => ({
                          ...prev,
                          [index]: false,
                        }));
                      }}
                      onLoad={() => {
                        setImageLoadingStates((prev) => ({
                          ...prev,
                          [index]: false,
                        }));
                      }}
                      onError={() => {
                        setImageLoadingStates((prev) => ({
                          ...prev,
                          [index]: false,
                        }));
                        setImageErrorStates((prev) => ({
                          ...prev,
                          [index]: true,
                        }));
                      }}
                    />
                    {imageErrorStates[index] && (
                      <View
                        style={[
                          styles.imageSkeleton,
                          { backgroundColor: colors.border },
                        ]}
                      >
                        <IconSymbol
                          name="photo"
                          size={20}
                          color={colors.tabIconDefault}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[
                      styles.videoPlaceholder,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <IconSymbol
                      name="play.circle.fill"
                      size={32}
                      color={colors.tint}
                    />
                  </View>
                )}

                {/* Remove Button */}
                <TouchableOpacity
                  style={[
                    styles.removeButton,
                    { backgroundColor: colors.error },
                  ]}
                  onPress={() => removeMedia(index)}
                >
                  <IconSymbol name="xmark" size={12} color="white" />
                </TouchableOpacity>

                {/* Banner Badge - Show on selected banner image */}
                {showBannerBadge && media.type === "image" && (
                  <View
                    style={[
                      styles.bannerBadge,
                      { backgroundColor: colors.tint },
                    ]}
                  >
                    <IconSymbol name="star.fill" size={14} color="white" />
                    <Text style={styles.bannerBadgeText}>Banner</Text>
                  </View>
                )}

                {/* Media Type Badge */}
                <View
                  style={[styles.typeBadge, { backgroundColor: colors.tint }]}
                >
                  <IconSymbol
                    name={media.type === "image" ? "photo" : "video"}
                    size={10}
                    color="white"
                  />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {mediaFiles.length > 0 && (
        <View style={styles.mediaInfo}>
          <Text
            style={[styles.mediaInfoText, { color: colors.tabIconDefault }]}
          >
            {mediaFiles.length} {t("filesSelected")}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  mediaContainer: {
    marginBottom: 12,
    paddingTop: 10,
  },
  addMediaButton: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    gap: 8,
  },
  addMediaText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  mediaItem: {
    marginRight: 12,
  },
  mediaWrapper: {
    position: "relative",
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  imageHidden: {
    opacity: 0,
  },
  imageSkeleton: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  typeBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaInfo: {
    alignItems: "center",
  },
  mediaInfoText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  bannerImage: {
    borderWidth: 3,
    borderColor: "#FFD700",
  },
  bannerBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  bannerBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "white",
  },
});
