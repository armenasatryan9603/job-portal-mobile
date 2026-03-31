import * as Linking from "expo-linking";

import {
  BorderRadius,
  Spacing,
  ThemeColors,
  Typography,
  createThemeShadow,
} from "@/constants/styles";
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import React, { useCallback, useEffect } from "react";

import Carousel from "react-native-reanimated-carousel";
import { Image } from "expo-image";
import { ThemedText } from "@/components/themed-text";
import type { TopData } from "@/categories/api";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestCountry } from "@/contexts/GuestLocationContext";
import { useModal } from "@/contexts/ModalContext";
import { useSharedValue } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useTopData } from "@/hooks/useApi";

const AUTO_PLAY_INTERVAL = 3000;
const MAX_CAROUSEL_WIDTH = 880;

type TopDataSliderProps = {
  onEmpty?: () => void;
};

function SliderCard({
  item,
  isDark,
  onPress,
  onActionPress,
}: {
  item: TopData;
  isDark: boolean;
  onPress: () => void;
  onActionPress?: () => void;
}) {
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const imageHeight = Platform.OS === "web" ? 340 : 140;
  const placeholderHeight = Platform.OS === "web" ? 320 : 120;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          ...createThemeShadow(isDark, 2),
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={[styles.image, { height: imageHeight }]}
          contentFit="cover"
        />
      ) : (
        <View
          style={[
            styles.imagePlaceholder,
            { backgroundColor: colors.backgroundSecondary, height: placeholderHeight },
          ]}
        />
      )}
      <View style={styles.cardContent}>
        <View style={styles.titleRow}>
          <ThemedText
            style={[styles.name, { color: colors.text }]}
            numberOfLines={2}
          >
            {item.name}
          </ThemedText>
          {item.action && item.action !== "open" && (
            <TouchableOpacity
              style={[styles.actionPill, { borderColor: colors.tint }]}
              onPress={onActionPress}
              activeOpacity={0.8}
            >
              <ThemedText
                style={[styles.actionText, { color: colors.tint }]}
                numberOfLines={1}
              >
                {item.action === "external"
                  ? "Link"
                  : item.action === "apply"
                    ? "Apply"
                    : item.action === "book"
                      ? "Book"
                      : ""}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function TopDataSlider({ onEmpty }: TopDataSliderProps) {
  const { isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { guestCountryIso } = useGuestCountry();
  const { showLoginModal } = useModal();
  const countryFilter = (user?.country ?? guestCountryIso) ?? undefined;
  const { data: items = [], isLoading } = useTopData(countryFilter);
  const { width: screenWidth } = useWindowDimensions();
  const progress = useSharedValue(0);

  const carouselWidth = Math.min(screenWidth, MAX_CAROUSEL_WIDTH);
  const carouselHeight = Platform.OS === "web" ? 420 : 220;
  const parallaxOffset = Math.round(carouselWidth * 0.16);

  useEffect(() => {
    if (!isLoading && items.length === 0) onEmpty?.();
  }, [isLoading, items.length, onEmpty]);

  const handlePress = useCallback((item: TopData) => {
    const url = item.url?.trim();
    if (!url) return;

    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)
    ) {
      Linking.openURL(url);
      return;
    }

    router.push(url as any);
  }, []);

  const handleActionPress = useCallback(
    (item: TopData) => {
      const action = item.action ?? "open";
      const url = item.url?.trim();

      if (action === "open") {
        handlePress(item);
        return;
      }

      if (action === "external") {
        if (url) Linking.openURL(url);
        return;
      }

      if (action === "apply" || action === "book") {
        if (!isAuthenticated) {
          showLoginModal();
          return;
        }
        if (!url) return;
        if (
          url.startsWith("http://") ||
          url.startsWith("https://") ||
          /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)
        ) {
          Linking.openURL(url);
        } else {
          router.push(url as any);
        }
      }
    },
    [handlePress, isAuthenticated, showLoginModal],
  );

  if (isLoading || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Carousel
        data={items}
        loop={items.length > 1}
        autoPlay={items.length > 1}
        autoPlayInterval={AUTO_PLAY_INTERVAL}
        pagingEnabled
        snapEnabled
        width={carouselWidth}
        height={carouselHeight}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 0.92,
          parallaxScrollingOffset: parallaxOffset,
          parallaxAdjacentItemScale: 0.75,
        }}
        onConfigurePanGesture={(gesture) => {
          gesture
            .enableTrackpadTwoFingerGesture(true)
            .activeOffsetX([-10, 10]);
        }}
        onProgressChange={(_offsetProgress: number, absoluteProgress: number) => {
          progress.value = absoluteProgress;
        }}
        renderItem={({ item }: { item: TopData }) => (
          <View style={styles.slideWrapper}>
            <SliderCard
              item={item}
              isDark={isDark}
              onPress={() => handlePress(item)}
              onActionPress={() => handleActionPress(item)}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.xs,
    alignItems: "center",
  },
  slideWrapper: {
    flex: 1,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  image: {
    width: "100%",
  },
  imagePlaceholder: {
    width: "100%",
  },
  cardContent: {
    padding: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    height: 26,
  },
  name: {
    fontSize: Typography.lg,
    fontWeight: "600",
  },
  actionPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
  },
  actionText: {
    fontSize: Typography.sm,
    fontWeight: "500",
  },
});
