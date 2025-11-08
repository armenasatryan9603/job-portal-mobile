import { getApiBaseUrl } from "@/config/api";

const API_BASE_URL = getApiBaseUrl();

export interface UploadResponse {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  error?: string;
}

export interface MediaFile {
  uri: string;
  type: "image" | "video";
  fileName: string;
  mimeType: string;
  fileSize: number;
}

class FileUploadService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Upload a single file directly to Google Cloud Storage
   */
  async uploadProfilePicture(file: MediaFile): Promise<UploadResponse> {
    try {
      // Step 1: Get presigned URL from backend for profile picture
      const presignedResponse = await this.getPresignedUrl(
        file.fileName,
        file.type,
        file.mimeType,
        0 // Use 0 as orderId for profile pictures
      );

      if (!presignedResponse) {
        throw new Error("Failed to get presigned URL");
      }

      // Step 2: Upload file directly to Google Cloud Storage
      const uploadSuccess = await this.uploadToCloudStorage(
        file,
        presignedResponse.uploadUrl
      );

      if (!uploadSuccess) {
        throw new Error("Failed to upload to cloud storage");
      }

      return {
        success: true,
        fileUrl: presignedResponse.fileUrl,
        fileName: presignedResponse.fileName,
      };
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async uploadFile(
    file: MediaFile,
    orderId: number,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> {
    try {
      // Step 1: Get presigned URL from backend
      const presignedResponse = await this.getPresignedUrl(
        file.fileName,
        file.type,
        file.mimeType,
        orderId
      );

      if (!presignedResponse) {
        throw new Error("Failed to get presigned URL");
      }

      // Step 2: Upload file directly to Google Cloud Storage
      const uploadSuccess = await this.uploadToCloudStorage(
        file,
        presignedResponse.uploadUrl
      );

      if (!uploadSuccess) {
        throw new Error("Failed to upload to cloud storage");
      }

      // Step 3: Save file record to database
      const mediaData = {
        orderId,
        fileName: file.fileName, // Use original file name, not GCS path
        fileUrl: presignedResponse.fileUrl,
        fileType: file.type,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
      };

      const dbResponse = await this.saveMediaRecord(mediaData);

      return {
        success: true,
        fileUrl: presignedResponse.fileUrl,
        fileName: presignedResponse.fileName,
      };
    } catch (error) {
      console.error("File upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  /**
   * Upload multiple files with progress tracking
   */
  async uploadMultipleFiles(
    files: MediaFile[],
    orderId: number,
    onProgress?: (completed: number, total: number) => void
  ): Promise<UploadResponse[]> {
    const results: UploadResponse[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const result = await this.uploadFile(file, orderId);
        results.push(result);

        // Call progress callback
        if (onProgress) {
          onProgress(i + 1, files.length);
        }
      } catch (error) {
        console.error(`Failed to upload file ${file.fileName}:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }

    return results;
  }

  /**
   * Create order with media files in a single transaction
   * This ensures that if media upload fails, the order is not created
   */
  async createOrderWithMedia(
    orderData: {
      serviceId?: number;
      title: string;
      description: string;
      budget: number;
      availableDates?: string[];
      location?: string;
      skills?: string[];
    },
    files: MediaFile[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ order: any; mediaFiles: UploadResponse[] }> {
    try {
      // Step 1: Upload all files first and collect their URLs
      const uploadedFiles: Array<{
        fileName: string;
        fileUrl: string;
        fileType: string;
        mimeType: string;
        fileSize: number;
      }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          // Get presigned URL for this file (using a temporary order ID of 0)
          const presignedResponse = await this.getPresignedUrl(
            file.fileName,
            file.type,
            file.mimeType,
            0 // Temporary order ID
          );

          if (!presignedResponse) {
            throw new Error("Failed to get presigned URL");
          }

          // Upload file directly to Google Cloud Storage
          const uploadSuccess = await this.uploadToCloudStorage(
            file,
            presignedResponse.uploadUrl
          );

          if (!uploadSuccess) {
            throw new Error("Failed to upload to cloud storage");
          }

          // Add to uploaded files list
          uploadedFiles.push({
            fileName: file.fileName, // Use original file name, not GCS path
            fileUrl: presignedResponse.fileUrl,
            fileType: file.type,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
          });

          // Call progress callback
          if (onProgress) {
            onProgress(i + 1, files.length);
          }
        } catch (error) {
          console.error(`Failed to upload file ${file.fileName}:`, error);
          throw new Error(
            `Failed to upload file ${file.fileName}: ${
              error instanceof Error ? error.message : "Upload failed"
            }`
          );
        }
      }

      // Step 2: Create order with media files in a single transaction
      const token = await this.getAuthToken();

      if (!token) {
        throw new Error(
          "Authentication required. Please log in and try again."
        );
      }

      const response = await fetch(`${this.baseUrl}/orders/create-with-media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...orderData,
          mediaFiles: uploadedFiles,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to create order with media files"
        );
      }

      const order = await response.json();

      // Step 3: Return success results for all files
      const mediaFiles: UploadResponse[] = uploadedFiles.map((file) => ({
        success: true,
        fileUrl: file.fileUrl,
        fileName: file.fileName,
      }));

      return { order, mediaFiles };
    } catch (error) {
      console.error("Error creating order with media files:", error);
      throw error;
    }
  }

  /**
   * Get presigned URL for direct upload to Google Cloud Storage
   */
  async getPresignedUrl(
    fileName: string,
    fileType: string,
    mimeType: string,
    orderId: number
  ): Promise<{ uploadUrl: string; fileUrl: string; fileName: string } | null> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(
        `${this.baseUrl}/media-files/presigned-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            fileName,
            mimeType,
            orderId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get presigned URL: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting presigned URL:", error);
      return null;
    }
  }

  /**
   * Save media record to database
   */
  async saveMediaRecord(mediaData: {
    orderId: number;
    fileName: string;
    fileUrl: string;
    fileType: string;
    mimeType: string;
    fileSize: number;
  }): Promise<any> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.baseUrl}/media-files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(mediaData),
      });

      if (!response.ok) {
        throw new Error(`Failed to save media record: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error saving media record:", error);
      throw error;
    }
  }

  /**
   * Upload file directly to Google Cloud Storage using presigned URL
   */
  async uploadToCloudStorage(
    file: MediaFile,
    uploadUrl: string
  ): Promise<boolean> {
    try {
      // For React Native, we need to read the file as blob/binary data
      // and upload it directly to the presigned URL
      const response = await fetch(file.uri);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.mimeType,
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        console.error(
          "Upload failed:",
          uploadResponse.status,
          uploadResponse.statusText
        );
        const errorText = await uploadResponse.text();
        console.error("Error response:", errorText);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error uploading to cloud storage:", error);
      return false;
    }
  }

  /**
   * Get auth token from storage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      return await AsyncStorage.getItem("auth_token");
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: MediaFile): { valid: boolean; error?: string } {
    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.fileSize > maxSize) {
      return {
        valid: false,
        error: "File size exceeds 50MB limit",
      };
    }

    // Check file type
    const allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    const allowedVideoTypes = [
      "video/mp4",
      "video/mov",
      "video/avi",
      "video/quicktime",
    ];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

    if (!allowedTypes.includes(file.mimeType)) {
      return {
        valid: false,
        error: "File type not supported",
      };
    }

    return { valid: true };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();

// Export default
export default fileUploadService;
