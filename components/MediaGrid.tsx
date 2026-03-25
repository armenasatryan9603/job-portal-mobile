import { StyleSheet, TouchableOpacity, View, useWindowDimensions, Modal } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import React, { useState } from "react";
import { Spacing, ThemeColors } from "@/constants/styles";

const MEDIA_GRID_GAP = 8;

type ThemeColorsType = typeof ThemeColors;

export interface MediaGridItem {
  id: number;
  fileUrl: string;
  fileType: string;
}

interface MediaGridProps {
  mediaFiles: MediaGridItem[];
  colors: ThemeColorsType["light"] | ThemeColorsType["dark"];
  canDelete?: boolean;
  onDelete?: (file: MediaGridItem) => void;
  enablePreviewModal?: boolean;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  mediaFiles,
  colors,
  canDelete = false,
  onDelete,
  enablePreviewModal = true,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const mediaContentWidth = screenWidth - 2 * (Spacing.md + Spacing.md);
  const mediaItemWidthForTwo = (mediaContentWidth - MEDIA_GRID_GAP) / 2;
  const mediaItemWidthForThree =
    (mediaContentWidth - 2 * MEDIA_GRID_GAP) / 3;

  if (!mediaFiles || mediaFiles.length === 0) {
    return null;
  }

  const getItemWidthStyle = () => {
    const mediaCount = mediaFiles.length;

    if (mediaCount === 1) return { width: "100%" as const };
    if (mediaCount === 2) return { width: mediaItemWidthForTwo };
    return { width: mediaItemWidthForThree };
  };

  const itemWidthStyle = getItemWidthStyle();

  return (
    <View style={styles.mediaGrid}>
      {mediaFiles.map((mediaFile) => (
        <View
          key={mediaFile.id}
          style={[styles.mediaGridItemContainer, itemWidthStyle]}
        >
          <TouchableOpacity
            style={styles.mediaGridItem}
            onPress={() => {
              if (enablePreviewModal && mediaFile.fileType === "image") {
                setSelectedImage(mediaFile.fileUrl);
              }
              // Consumers can still hook into delete via onDelete; primary tap shows preview
            }}
            activeOpacity={0.8}
          >
            {mediaFile.fileType === "image" ? (
              <Image
                source={mediaFile.fileUrl}
                style={styles.mediaGridImage}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  styles.mediaGridPlaceholder,
                  { backgroundColor: colors.background },
                ]}
              >
                <IconSymbol
                  name="play.circle.fill"
                  size={24}
                  color={colors.tint}
                />
              </View>
            )}
          </TouchableOpacity>

          {canDelete && onDelete && (
            <TouchableOpacity
              style={[
                styles.deleteMediaButton,
                // Use card background-like color to match theme as closely as possible
                { backgroundColor: colors.background },
              ]}
              onPress={() => onDelete(mediaFile)}
              activeOpacity={0.8}
            >
              <IconSymbol
                name="xmark.circle.fill"
                size={20}
                color={colors.errorVariant}
              />
            </TouchableOpacity>
          )}
        </View>
      ))}
      {enablePreviewModal && selectedImage && (
        <Modal
          visible={!!selectedImage}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedImage(null)}
          >
            <Image
              source={selectedImage}
              style={styles.modalImage}
              contentFit="contain"
            />
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: MEDIA_GRID_GAP,
  },
  mediaGridItemContainer: {
    position: "relative",
  },
  mediaGridItem: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  mediaGridImage: {
    width: "100%",
    height: "100%",
  },
  mediaGridPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  deleteMediaButton: {
    position: "absolute",
    top: -6,
    right: -6,
    borderRadius: 12,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "90%",
    height: "90%",
  },
});

