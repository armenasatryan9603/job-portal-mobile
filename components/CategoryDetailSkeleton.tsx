import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ScrollView } from "react-native";
import { ThemeColors, Spacing, BorderRadius } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { Layout } from "@/components/Layout";
import { Header } from "@/components/Header";
import { useTranslation } from "@/contexts/TranslationContext";
import { router } from "expo-router";

interface CategoryDetailSkeletonProps {
  header?: React.ReactNode;
}

export const CategoryDetailSkeleton: React.FC<CategoryDetailSkeletonProps> = ({
  header,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const SkeletonBox = ({
    width,
    height,
    borderRadius = 8,
    style,
  }: {
    width?: number | string;
    height: number;
    borderRadius?: number;
    style?: any;
  }) => (
    <Animated.View
      style={[
        {
          width: width || "100%",
          height,
          borderRadius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );

  const defaultHeader = (
    <Header
      title={t("loading")}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  return (
    <Layout header={header || defaultHeader}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ResponsiveContainer>
          {/* Category Overview Skeleton */}
          <ResponsiveCard padding={0}>
            {/* Image skeleton */}
            <SkeletonBox
              height={160}
              width="100%"
              borderRadius={0}
              style={styles.serviceImage}
            />
            <View style={styles.overviewContent}>
              {/* Name skeleton */}
              <SkeletonBox
                height={28}
                width="70%"
                style={{ marginBottom: Spacing.sm }}
              />
              {/* Description skeleton */}
              <SkeletonBox
                height={16}
                width="100%"
                style={{ marginBottom: 4 }}
              />
              <SkeletonBox
                height={16}
                width="90%"
                style={{ marginBottom: Spacing.md }}
              />
              {/* Stats skeleton */}
              <View style={styles.statItem}>
                <SkeletonBox width={14} height={14} borderRadius={7} />
                <SkeletonBox
                  width={100}
                  height={14}
                  style={{ marginLeft: 6 }}
                />
              </View>
              <View style={styles.statItem}>
                <SkeletonBox width={14} height={14} borderRadius={7} />
                <SkeletonBox
                  width={120}
                  height={14}
                  style={{ marginLeft: 6 }}
                />
              </View>
              <View style={styles.statItem}>
                <SkeletonBox width={14} height={14} borderRadius={7} />
                <SkeletonBox
                  width={110}
                  height={14}
                  style={{ marginLeft: 6 }}
                />
              </View>
            </View>
          </ResponsiveCard>

          {/* Features Section Skeleton */}
          <ResponsiveCard>
            <SkeletonBox
              height={24}
              width="50%"
              style={{ marginBottom: Spacing.md }}
            />
            {[1, 2, 3, 4].map((index) => (
              <View key={index} style={styles.featureItem}>
                <SkeletonBox width={14} height={14} borderRadius={7} />
                <SkeletonBox
                  width="85%"
                  height={14}
                  style={{ marginLeft: 8 }}
                />
              </View>
            ))}
          </ResponsiveCard>

          {/* Technologies Section Skeleton */}
          <ResponsiveCard>
            <SkeletonBox
              height={24}
              width="60%"
              style={{ marginBottom: Spacing.md }}
            />
            <View style={styles.technologiesContainer}>
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.techTag,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <SkeletonBox width={60} height={16} borderRadius={12} />
                </View>
              ))}
            </View>
          </ResponsiveCard>

          {/* Sub-categories Grid Skeleton */}
          <View style={styles.gridContainer}>
            {[1, 2].map((rowIndex) => (
              <View key={rowIndex} style={styles.gridRow}>
                {[1, 2, 3].map((colIndex) => (
                  <View
                    key={colIndex}
                    style={[
                      styles.gridItem,
                      { marginHorizontal: Spacing.xs },
                    ]}
                  >
                    <View
                      style={[
                        styles.gridCard,
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <SkeletonBox
                        height={80}
                        width="100%"
                        borderRadius={0}
                      />
                      <View style={styles.gridCardContent}>
                        <SkeletonBox
                          height={16}
                          width="85%"
                          style={{ marginBottom: Spacing.xs }}
                        />
                        <SkeletonBox
                          height={16}
                          width="70%"
                          style={{ marginBottom: Spacing.xs }}
                        />
                        <View style={styles.gridServiceStats}>
                          <View style={styles.gridStatItem}>
                            <SkeletonBox width={12} height={12} borderRadius={6} />
                            <SkeletonBox
                              width={30}
                              height={12}
                              style={{ marginLeft: 4 }}
                            />
                          </View>
                          <View style={styles.gridStatItem}>
                            <SkeletonBox width={12} height={12} borderRadius={6} />
                            <SkeletonBox
                              width={20}
                              height={12}
                              style={{ marginLeft: 4 }}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>

          {/* Action Buttons Skeleton */}
          <ResponsiveCard>
            <View style={styles.buttonsContainer}>
              <SkeletonBox
                height={44}
                width="100%"
                borderRadius={BorderRadius.lg}
                style={{ marginBottom: Spacing.sm }}
              />
              <SkeletonBox
                height={44}
                width="100%"
                borderRadius={BorderRadius.lg}
                style={{ marginBottom: Spacing.sm }}
              />
              <SkeletonBox
                height={44}
                width="100%"
                borderRadius={BorderRadius.lg}
              />
            </View>
          </ResponsiveCard>
        </ResponsiveContainer>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  serviceImage: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  overviewContent: {
    padding: Spacing.lg,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  technologiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: Spacing.md,
  },
  techTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 6,
  },
  gridContainer: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  gridRow: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  gridItem: {
    flex: 1,
  },
  gridCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  gridCardContent: {
    padding: Spacing.sm,
  },
  gridServiceStats: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  gridStatItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonsContainer: {
    gap: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
