import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { fileUploadService } from "@/categories/fileUpload";

export interface BannerUploadOptions {
  fileNamePrefix?: string;
  onUploadSuccess: (fileUrl: string, fileName: string) => Promise<void>;
  onError?: (error: string) => void;
  permissionRequiredText?: string;
  permissionToAccessText?: string;
  uploadFailedText?: string;
  failedToSelectImageText?: string;
  failedToUploadText?: string;
}

/**
 * Utility function to handle banner image upload
 * Handles permission request, image selection, and upload
 */
export async function handleBannerUpload(
  options: BannerUploadOptions
): Promise<void> {
  const {
    fileNamePrefix = "banner",
    onUploadSuccess,
    onError,
    permissionRequiredText = "Permission Required",
    permissionToAccessText = "Permission to access camera roll is required",
    uploadFailedText = "Upload failed",
    failedToSelectImageText = "Failed to select image",
    failedToUploadText = "Failed to upload banner",
  } = options;

  try {
    // Request media library permissions
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(permissionRequiredText, permissionToAccessText);
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 1], // Banner ratio
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = `${fileNamePrefix}_${Date.now()}.jpg`;

      // Upload to Vercel Blob
      const uploadResult = await fileUploadService.uploadProfilePicture({
        uri: asset.uri,
        fileName,
        type: "image",
        mimeType: "image/jpeg",
        fileSize: asset.fileSize || 0,
      });

      if (uploadResult.success && uploadResult.fileUrl) {
        // Call the success callback with the uploaded file URL
        await onUploadSuccess(
          uploadResult.fileUrl,
          uploadResult.fileName || fileName
        );
      } else {
        const errorMessage = uploadResult.error || uploadFailedText;
        throw new Error(errorMessage);
      }
    }
  } catch (error: any) {
    console.error("Error in banner upload:", error);
    const errorMessage =
      error.message || error.toString() || failedToUploadText;
    
    if (onError) {
      onError(errorMessage);
    } else {
      Alert.alert("Error", errorMessage);
    }
  }
}
