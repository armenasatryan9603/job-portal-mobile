import * as Linking from "expo-linking";

import {
  BorderRadius,
  Spacing,
  ThemeColors,
  Typography,
  createThemeShadow,
} from "@/constants/styles";
import {
  Dimensions,
  FlatList,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useCallback, useEffect, useRef } from "react";

import { Image } from "expo-image";
import { ThemedText } from "@/components/themed-text";
import type { TopData } from "@/categories/api";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestCountry } from "@/contexts/GuestLocationContext";
import { useModal } from "@/contexts/ModalContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTopData } from "@/hooks/useApi";
import { useIsWeb } from "@/utils/isWeb";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Slot width is less than screen so previous and next cards peek equally on the sides
const SIDE_PEEK = Spacing.lg * 2;
const ITEM_WIDTH = SCREEN_WIDTH - SIDE_PEEK * 2;
const LIST_PADDING = (SCREEN_WIDTH - ITEM_WIDTH) / 2; // horizontal padding so first item can be centered
const CARD_MARGIN = Spacing.xs; // small gap between card edge and slot
const CARD_WIDTH = ITEM_WIDTH - CARD_MARGIN * 2;
const AUTO_SLIDE_INTERVAL_MS = 3000;
const SCROLL_ANIMATION_DURATION_MS = 600; // slower slide transition
const INITIAL_INDEX = 1; // start from second item when possible
const LOOP_MULTIPLIER = 500; // repeat items for infinite scroll

type TopDataSliderProps = {
  /** Called when there is no TopData so parent can render a fallback section */
  onEmpty?: () => void;
};

type TopDataSliderItemProps = {
  item: TopData;
  onPress: () => void;
  onActionPress?: () => void;
  isDark: boolean;
};

function TopDataSliderItem({
  item,
  onPress,
  onActionPress,
  isDark,
}: TopDataSliderItemProps) {
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const isWeb = useIsWeb();

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
          style={[styles.image, { height: Platform.OS === "web" ? 340 : 140 }]}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.backgroundSecondary, height: Platform.OS === "web" ? 320 : 120 }]} />
      )}
      <View style={styles.cardContent}>
        <View style={styles.titleRow}>
          <ThemedText style={[styles.name, { color: colors.text }]} numberOfLines={2}>
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
  const flatListRef = useRef<FlatList<TopData>>(null);
  const currentIndexRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const animationFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const isUserInteractingRef = useRef(false);

  const animateToIndex = useCallback((targetIndex: number) => {
    const startOffset = scrollOffsetRef.current;
    const targetOffset = targetIndex * ITEM_WIDTH;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / SCROLL_ANIMATION_DURATION_MS, 1);
      const eased = 0.5 - 0.5 * Math.cos(t * Math.PI); // ease in-out
      const x = startOffset + (targetOffset - startOffset) * eased;
      flatListRef.current?.scrollToOffset({ offset: x, animated: false });
      scrollOffsetRef.current = x;
      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        currentIndexRef.current = targetIndex;
      }
    };

    if (animationFrameRef.current != null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const handlePress = useCallback((item: TopData) => {
    const url = item.url?.trim();
    if (!url) return;

    // Open regular web URLs in browser
    if (url.startsWith("http://") || url.startsWith("https://")) {
      Linking.openURL(url);
      return;
    }

    // Deep links (e.g. instagram://, fb://) should open corresponding app
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
      Linking.openURL(url);
      return;
    }

    // Otherwise treat as internal route
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
        if (!url) return;
        // Always open externally (browser or app)
        Linking.openURL(url);
        return;
      }

      if (action === "apply" || action === "book") {
        if (!isAuthenticated) {
          showLoginModal();
          return;
        }

        if (!url) return;

        // For apply/book, allow both internal routes and deep links
        if (url.startsWith("http://") || url.startsWith("https://")) {
          Linking.openURL(url);
        } else if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
          Linking.openURL(url);
        } else {
          router.push(url as any);
        }
      }
    },
    [handlePress, isAuthenticated, showLoginModal]
  );

  const loopData = React.useMemo(() => {
    if (items.length === 0) return [];
    if (items.length === 1) return items;
    const total = items.length * LOOP_MULTIPLIER;
    return Array.from({ length: total }, (_, i) => items[i % items.length]);
  }, [items]);

  // Notify parent when there is no data so it can render its fallback section instead
  useEffect(() => {
    if (!isLoading && items.length === 0) {
      onEmpty?.();
    }
  }, [isLoading, items.length, onEmpty]);

  useEffect(() => {
    if (items.length <= 1 || loopData.length === 0) return;

    const total = loopData.length;
    const mid = Math.floor(total / 2);
    const initialIndex = mid + (items.length > 1 ? Math.min(INITIAL_INDEX, items.length - 1) : 0);

    currentIndexRef.current = initialIndex;
    scrollOffsetRef.current = initialIndex * ITEM_WIDTH;
    flatListRef.current?.scrollToIndex({
      index: initialIndex,
      animated: false,
    });

    const timer = setInterval(() => {
      if (isUserInteractingRef.current) return;
      const len = loopData.length;
      if (len === 0) return;

      let next = currentIndexRef.current + 1;
      if (next >= len - items.length) {
        next = mid + (next % items.length);
      }
      animateToIndex(next);
    }, AUTO_SLIDE_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      if (animationFrameRef.current != null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [items.length, loopData.length, animateToIndex]);

  const alignScrollToNearestItem = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>, animated: boolean) => {
      const len = loopData.length;
      if (len === 0) return;
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.max(0, Math.min(len - 1, Math.round(x / ITEM_WIDTH)));
      const aligned = idx * ITEM_WIDTH;
      const needsNudge = Math.abs(x - aligned) > 0.5;
      if (needsNudge) {
        flatListRef.current?.scrollToOffset({
          offset: aligned,
          animated,
        });
      }
      scrollOffsetRef.current = aligned;
      currentIndexRef.current = idx;
    },
    [loopData.length]
  );

  const onScrollBeginDrag = useCallback(() => {
    isUserInteractingRef.current = true;
    if (animationFrameRef.current != null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isUserInteractingRef.current = false;
      alignScrollToNearestItem(e, true);
    },
    [alignScrollToNearestItem]
  );

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const vx = e.nativeEvent.velocity?.x ?? 0;
      if (Math.abs(vx) < 0.05) {
        isUserInteractingRef.current = false;
        alignScrollToNearestItem(e, true);
      }
    },
    [alignScrollToNearestItem]
  );

  if (isLoading || items.length === 0) return null;

  const getItemLayout = (_: unknown, index: number) => ({
    length: ITEM_WIDTH,
    offset: ITEM_WIDTH * index,
    index,
  });

  return (
    <FlatList
      ref={flatListRef}
      data={loopData}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      decelerationRate="fast"
      getItemLayout={getItemLayout}
      onScrollBeginDrag={onScrollBeginDrag}
      onScrollEndDrag={onScrollEndDrag}
      onMomentumScrollEnd={onMomentumScrollEnd}
      onScroll={(e) => {
        scrollOffsetRef.current = e.nativeEvent.contentOffset.x;
      }}
      scrollEventThrottle={16}
      renderItem={({ item }) => (
        <View style={styles.itemWrapper}>
          <TopDataSliderItem
            item={item}
            isDark={isDark}
            onPress={() => handlePress(item)}
            onActionPress={() => handleActionPress(item)}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: LIST_PADDING,
  },
  itemWrapper: {
    width: ITEM_WIDTH,
    alignItems: "center",
  },
  card: {
    width: CARD_WIDTH,
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
    height: 26
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
  activeTimes: {
    fontSize: Typography.sm,
    marginTop: Spacing.xs,
  },
});
