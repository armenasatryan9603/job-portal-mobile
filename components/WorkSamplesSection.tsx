import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  Dimensions,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Button } from "@/components/ui/button";
import { PortfolioItem, apiService } from "@/categories/api";
import { ThemeColors, Typography } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useAuth } from "@/contexts/AuthContext";
import * as ImagePicker from "expo-image-picker";

type ThemeColorsType = typeof ThemeColors;

interface WorkSamplesSectionProps {
  userId?: number;
  colors: ThemeColorsType["light"] | ThemeColorsType["dark"];
  isOwnProfile: boolean;
}

const { width } = Dimensions.get("window");
const ITEM_SIZE = (width - 60) / 3; // 3 items per row with padding

export const WorkSamplesSection: React.FC<WorkSamplesSectionProps> = ({
  userId,
  colors,
  isOwnProfile,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    if (userId) {
      loadPortfolio();
    }
  }, [userId]);

  const loadPortfolio = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const items = await apiService.getPortfolio(userId);
      setPortfolioItems(items);
    } catch (error) {
      console.error("Error loading portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async () => {
    if (!user?.id) {
      Alert.alert(t("error"), t("authenticationRequired"));
      return;
    }

    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(t("permissionRequired"), t("permissionToAccessCameraRoll"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setUploading(true);

        try {
          const mediaFile = {
            uri: asset.uri,
            fileName: `portfolio_${Date.now()}.jpg`,
            type: "image" as const,
            mimeType: "image/jpeg",
            fileSize: asset.fileSize || 0,
          };

          const uploadResult = await apiService.uploadPortfolioItem(
            {
              uri: asset.uri,
              type: "image/jpeg",
              name: mediaFile.fileName,
            },
            undefined,
            undefined
          );

          await loadPortfolio();
          Alert.alert(t("success"), t("portfolioItemUploaded"));
        } catch (error: any) {
          console.error("Error uploading portfolio item:", error);
          Alert.alert(t("error"), error.message || t("uploadFailed"));
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error("Error selecting image:", error);
      Alert.alert(t("error"), t("failedToSelectImage"));
    }
  };

  const handleDeleteItem = async (item: PortfolioItem) => {
    if (!user?.id) return;

    Alert.alert(t("deletePortfolioItem"), t("deletePortfolioItemConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await apiService.deletePortfolioItem(item.id);
            await loadPortfolio();
          } catch (error: any) {
            console.error("Error deleting portfolio item:", error);
            Alert.alert(t("error"), error.message || t("deleteFailed"));
          }
        },
      },
    ]);
  };

  const handleEditItem = (item: PortfolioItem) => {
    setEditingItem(item);
    setEditTitle(item.title || "");
    setEditDescription(item.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      await apiService.updatePortfolioItem(
        editingItem.id,
        editTitle || undefined,
        editDescription || undefined
      );
      setEditingItem(null);
      await loadPortfolio();
    } catch (error: any) {
      console.error("Error updating portfolio item:", error);
      Alert.alert(t("error"), error.message || t("updateFailed"));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t("loading")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("workSamples")}
        </Text>
        {isOwnProfile && (
          <TouchableOpacity
            onPress={handleUploadImage}
            disabled={uploading}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            {uploading ? (
              <ActivityIndicator size={16} color="white" />
            ) : (
              <IconSymbol name="plus" size={16} color="white" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {portfolioItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="photo" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {isOwnProfile ? t("noWorkSamplesYet") : t("noWorkSamplesAvailable")}
          </Text>
          {isOwnProfile && (
            <Text
              style={[styles.emptySubtext, { color: colors.textSecondary }]}
            >
              {t("uploadWorkSamplesHint")}
            </Text>
          )}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.grid}
        >
          {portfolioItems.map((item) => (
            <View key={item.id} style={styles.itemContainer}>
              <Image
                source={{ uri: item.fileUrl }}
                style={[styles.itemImage, { backgroundColor: colors.border }]}
                resizeMode="cover"
              />
              {isOwnProfile && (
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() => handleEditItem(item)}
                  >
                    <IconSymbol name="pencil" size={14} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: "#FF6B6B" },
                    ]}
                    onPress={() => handleDeleteItem(item)}
                  >
                    <IconSymbol name="trash" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              )}
              {item.title && (
                <Text
                  style={[styles.itemTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Edit Modal */}
      <Modal
        visible={editingItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("editPortfolioItem")}
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={t("title")}
              placeholderTextColor={colors.textSecondary}
              value={editTitle}
              onChangeText={setEditTitle}
            />

            <TextInput
              style={[
                styles.modalInput,
                styles.modalTextArea,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={t("description")}
              placeholderTextColor={colors.textSecondary}
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <Button
                variant="outline"
                title={t("cancel")}
                onPress={() => setEditingItem(null)}
                backgroundColor={colors.background}
                textColor={colors.text}
              />
              <Button
                variant="primary"
                title={t("save")}
                onPress={handleSaveEdit}
                backgroundColor={colors.primary}
                textColor="white"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 20,
  },
  itemContainer: {
    width: ITEM_SIZE,
  },
  itemImage: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemActions: {
    position: "absolute",
    top: 4,
    right: 4,
    flexDirection: "row",
    gap: 4,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
});
