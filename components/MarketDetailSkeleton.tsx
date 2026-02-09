import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ScrollView, StyleProp, ViewStyle, DimensionValue } from "react-native";
import { ThemeColors, Spacing, BorderRadius } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { Layout } from "@/components/Layout";
import { Header } from "@/components/Header";
import { useTranslation } from "@/hooks/useTranslation";
import { router } from "expo-router";

interface MarketDetailSkeletonProps {
  header?: React.ReactNode;
}

export const MarketDetailSkeleton: React.FC<MarketDetailSkeletonProps> = ({
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
    outputRange: [0.5, 0.9],
  });

  const SkeletonBox = ({
    width,
    height,
    borderRadius = 8,
    style,
  }: {
    width?: DimensionValue;
    height: number;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
  }) => {
    const staticStyle: ViewStyle = {
      width: width || "100%",
      height,
      borderRadius,
      backgroundColor: colors.border,
    };

    return (
      <Animated.View
        style={[
          staticStyle,
          { opacity },
          style,
        ]}
      />
    );
  };

  const defaultHeader = (
    <Header
      title={t("marketDetails")}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  return (
    <Layout header={header || defaultHeader}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ResponsiveContainer>
          {/* Banner Section */}
          <ResponsiveCard padding={0} style={{ overflow: "hidden" }}>
            <View style={{ paddingTop: 140 }}>
              <SkeletonBox
                height={140}
                width="100%"
                borderRadius={0}
                style={styles.bannerImage}
              />

              {/* Market Header */}
              <View style={styles.marketHeader}>
                <View style={styles.marketInfo}>
                  {/* Market Name */}
                  <SkeletonBox
                    height={28}
                    width="70%"
                    style={{ marginBottom: 8 }}
                  />

                  {/* Verified Badge */}
                  <SkeletonBox
                    height={24}
                    width={100}
                    borderRadius={12}
                    style={{ marginBottom: 8 }}
                  />

                  {/* Status Badge */}
                  <SkeletonBox
                    height={24}
                    width={120}
                    borderRadius={12}
                    style={{ marginBottom: 12 }}
                  />

                  {/* Meta Row (Rating, Location) */}
                  <View style={styles.metaRow}>
                    <View style={styles.ratingContainer}>
                      <SkeletonBox width={16} height={16} borderRadius={8} />
                      <SkeletonBox
                        width={40}
                        height={16}
                        style={{ marginLeft: 4 }}
                      />
                      <SkeletonBox
                        width={50}
                        height={14}
                        style={{ marginLeft: 4 }}
                      />
                    </View>
                    <View style={styles.locationContainer}>
                      <SkeletonBox width={14} height={14} borderRadius={7} />
                      <SkeletonBox
                        width={120}
                        height={14}
                        style={{ marginLeft: 4 }}
                      />
                    </View>
                  </View>

                  {/* Join Date */}
                  <View style={styles.joinDateContainer}>
                    <SkeletonBox width={14} height={14} borderRadius={7} />
                    <SkeletonBox
                      width={150}
                      height={14}
                      style={{ marginLeft: 4 }}
                    />
                  </View>
                </View>
              </View>
            </View>
          </ResponsiveCard>

          {/* Description Section */}
          <ResponsiveCard>
            <SkeletonBox
              height={24}
              width="30%"
              style={{ marginBottom: 16 }}
            />
            <SkeletonBox height={16} width="100%" style={{ marginBottom: 4 }} />
            <SkeletonBox height={16} width="95%" style={{ marginBottom: 4 }} />
            <SkeletonBox height={16} width="85%" />
          </ResponsiveCard>

          {/* Creator Information */}
          <ResponsiveCard>
            <SkeletonBox
              height={24}
              width="40%"
              style={{ marginBottom: 16 }}
            />
            <View style={styles.creatorItem}>
              <SkeletonBox width={40} height={40} borderRadius={20} />
              <View style={styles.creatorInfo}>
                <SkeletonBox
                  height={18}
                  width={120}
                  style={{ marginBottom: 8 }}
                />
                <SkeletonBox height={20} width={80} borderRadius={10} />
              </View>
              <SkeletonBox width={16} height={16} borderRadius={8} />
            </View>
          </ResponsiveCard>

          {/* Market Metadata */}
          <ResponsiveCard>
            <SkeletonBox
              height={24}
              width="50%"
              style={{ marginBottom: 16 }}
            />
            <View style={styles.metadataContainer}>
              {[1, 2, 3, 4].map((item) => (
                <View key={item} style={styles.metadataRow}>
                  <SkeletonBox width={16} height={16} borderRadius={8} />
                  <SkeletonBox
                    height={14}
                    width={80}
                    style={{ marginLeft: 8 }}
                  />
                  <SkeletonBox
                    height={14}
                    width={100}
                    style={{ marginLeft: 8 }}
                  />
                </View>
              ))}
            </View>
          </ResponsiveCard>

          {/* Roles Section */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <SkeletonBox height={24} width="25%" />
              <SkeletonBox width={24} height={24} borderRadius={12} />
            </View>
            {[1, 2, 3].map((item) => (
              <View key={item} style={styles.roleItem}>
                <View style={styles.roleInfo}>
                  <SkeletonBox
                    height={18}
                    width="60%"
                    style={{ marginBottom: 4 }}
                  />
                  <SkeletonBox height={14} width="80%" />
                </View>
                <SkeletonBox height={20} width={60} borderRadius={10} />
              </View>
            ))}
          </ResponsiveCard>

          {/* Gallery Section */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <SkeletonBox height={24} width="30%" />
              <SkeletonBox width={24} height={24} borderRadius={12} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.galleryScroll}
            >
              {[1, 2, 3, 4].map((item) => (
                <SkeletonBox
                  key={item}
                  width={120}
                  height={120}
                  borderRadius={8}
                  style={{ marginRight: 8 }}
                />
              ))}
            </ScrollView>
          </ResponsiveCard>

          {/* Members Section */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <SkeletonBox height={24} width="35%" />
              <SkeletonBox width={24} height={24} borderRadius={12} />
            </View>
            {[1, 2, 3].map((item) => (
              <View key={item} style={styles.memberItem}>
                <SkeletonBox width={40} height={40} borderRadius={20} />
                <View style={styles.memberInfo}>
                  <SkeletonBox
                    height={18}
                    width={120}
                    style={{ marginBottom: 4 }}
                  />
                  <SkeletonBox height={14} width={80} />
                </View>
                <SkeletonBox width={16} height={16} borderRadius={8} />
              </View>
            ))}
          </ResponsiveCard>

          {/* Subscription Section */}
          <ResponsiveCard>
            <SkeletonBox
              height={24}
              width="40%"
              style={{ marginBottom: 16 }}
            />
            <View style={styles.subscriptionInfo}>
              <SkeletonBox height={18} width="60%" style={{ marginBottom: 8 }} />
              <SkeletonBox height={14} width="50%" />
            </View>
          </ResponsiveCard>

          {/* Orders and Reviews Tabs Section */}
          <ResponsiveCard
            style={{
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              paddingBottom: 0,
            }}
          >
            <View style={styles.tabsContainer}>
              <SkeletonBox height={36} width="45%" borderRadius={8} />
              <SkeletonBox height={36} width="45%" borderRadius={8} />
            </View>
          </ResponsiveCard>

          {/* Orders Grid Skeleton */}
          <View style={styles.ordersGrid}>
            {[1, 2, 3, 4].map((item) => (
              <SkeletonBox
                key={item}
                width="48%"
                height={200}
                borderRadius={BorderRadius.md}
                style={{ marginBottom: Spacing.sm }}
              />
            ))}
          </View>
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
  bannerImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  marketHeader: {
    padding: Spacing.card,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  marketInfo: {
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  joinDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  creatorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  creatorInfo: {
    flex: 1,
  },
  metadataContainer: {
    gap: 12,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  roleInfo: {
    flex: 1,
  },
  galleryScroll: {
    marginHorizontal: -Spacing.card,
    paddingHorizontal: Spacing.card,
  },
  memberItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 0,
  },
  subscriptionInfo: {
    gap: 8,
  },
  tabsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingTop: Spacing.sm,
  },
  ordersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
});
