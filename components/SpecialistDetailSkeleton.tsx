import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ScrollView } from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { Layout } from "@/components/Layout";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useTranslation } from "@/contexts/TranslationContext";
import { router } from "expo-router";

interface SpecialistDetailSkeletonProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const SpecialistDetailSkeleton: React.FC<
  SpecialistDetailSkeletonProps
> = ({ header, footer }) => {
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
      title={t("specialistProfile")}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  const defaultFooter = (
    <Footer>
      <View style={styles.footerButtons}>
        <SkeletonBox width={120} height={44} borderRadius={8} />
        <SkeletonBox width={120} height={44} borderRadius={8} />
      </View>
    </Footer>
  );

  return (
    <Layout header={header || defaultHeader} footer={footer || defaultFooter}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ResponsiveContainer>
          {/* Specialist Overview Skeleton */}
          <ResponsiveCard
            padding={0}
            style={{ overflow: "hidden", marginBottom: 16 }}
          >
            <View style={styles.overviewSection}>
              {/* Banner skeleton - positioned absolutely at top */}
              <View style={styles.bannerWrapper}>
                <SkeletonBox height={200} width="100%" />
              </View>

              {/* Content wrapper */}
              <View style={styles.contentWrapper}>
                {/* Header with avatar and basic info */}
                <View style={styles.specialistHeader}>
                  <View style={styles.avatarContainer}>
                    <SkeletonBox width={100} height={100} borderRadius={50} />
                  </View>

                  <View style={styles.specialistInfo}>
                    <SkeletonBox
                      height={28}
                      width="80%"
                      style={{ marginBottom: 8 }}
                    />
                    <SkeletonBox
                      height={18}
                      width="60%"
                      style={{ marginBottom: 12 }}
                    />

                    {/* Rating skeleton */}
                    <View style={styles.ratingContainer}>
                      <View style={styles.ratingBadge}>
                        <SkeletonBox width={80} height={16} />
                        <SkeletonBox
                          width={30}
                          height={16}
                          style={{ marginLeft: 6 }}
                        />
                      </View>
                      <SkeletonBox
                        width={100}
                        height={14}
                        style={{ marginLeft: 12 }}
                      />
                    </View>

                    {/* Status badges skeleton */}
                    <View style={styles.badgesContainer}>
                      <SkeletonBox width={80} height={28} borderRadius={16} />
                      <SkeletonBox width={60} height={28} borderRadius={16} />
                    </View>
                  </View>
                </View>

                {/* Bio section skeleton */}
                <View style={styles.bioSection}>
                  <SkeletonBox
                    height={16}
                    width="100%"
                    style={{ marginBottom: 4 }}
                  />
                  <SkeletonBox
                    height={16}
                    width="95%"
                    style={{ marginBottom: 4 }}
                  />
                  <SkeletonBox height={16} width="85%" />
                </View>

                {/* Quick stats skeleton */}
                <View style={styles.quickStats}>
                  {[1, 2, 3].map((item) => (
                    <View key={item} style={styles.statItem}>
                      <SkeletonBox width={16} height={16} borderRadius={8} />
                      <SkeletonBox
                        height={16}
                        width={30}
                        style={{ marginTop: 6 }}
                      />
                      <SkeletonBox
                        height={11}
                        width={50}
                        style={{ marginTop: 4 }}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </ResponsiveCard>

          {/* Specialist Details Skeleton */}
          <ResponsiveCard>
            <View style={styles.detailsGrid}>
              {[1, 2, 3, 4].map((item) => (
                <View key={item} style={styles.detailCard}>
                  <SkeletonBox width={32} height={32} borderRadius={16} />
                  <View style={styles.detailCardContent}>
                    <SkeletonBox
                      height={11}
                      width={60}
                      style={{ marginBottom: 2 }}
                    />
                    <SkeletonBox height={13} width="80%" />
                  </View>
                </View>
              ))}
            </View>
          </ResponsiveCard>

          {/* Skills Section Skeleton */}
          <ResponsiveCard style={{ paddingTop: 0 }}>
            <View style={styles.skillsHeader}>
              <SkeletonBox width={30} height={20} borderRadius={12} />
            </View>
            <View style={styles.skillsContainer}>
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <SkeletonBox
                  key={item}
                  width={100}
                  height={32}
                  borderRadius={20}
                />
              ))}
            </View>
          </ResponsiveCard>

          {/* Service Information Skeleton */}
          <ResponsiveCard>
            <View style={styles.serviceInfo}>
              {[1, 2, 3].map((item) => (
                <View key={item} style={styles.serviceItem}>
                  <SkeletonBox width={16} height={16} borderRadius={8} />
                  <SkeletonBox height={15} width="85%" />
                </View>
              ))}
            </View>
          </ResponsiveCard>

          {/* Reviews Skeleton - Only show if reviews exist */}
          <ResponsiveCard>
            <View style={styles.reviewsList}>
              {[1, 2].map((item) => (
                <View key={item} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <SkeletonBox
                        height={18}
                        width={120}
                        style={{ marginBottom: 4 }}
                      />
                      <View style={styles.reviewRating}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <SkeletonBox
                            key={star}
                            width={14}
                            height={14}
                            borderRadius={7}
                            style={{ marginRight: 2 }}
                          />
                        ))}
                      </View>
                    </View>
                    <SkeletonBox width={80} height={13} />
                  </View>
                  <SkeletonBox
                    height={15}
                    width="70%"
                    style={{ marginTop: 8, marginBottom: 8 }}
                  />
                  <SkeletonBox
                    height={15}
                    width="100%"
                    style={{ marginBottom: 4 }}
                  />
                  <SkeletonBox height={15} width="90%" />
                </View>
              ))}
            </View>
          </ResponsiveCard>

          {/* Contact Information Skeleton */}
          <ResponsiveCard>
            <View style={styles.contactInfo}>
              {[1, 2].map((item) => (
                <View key={item} style={styles.contactItem}>
                  <SkeletonBox width={16} height={16} borderRadius={8} />
                  <SkeletonBox height={15} width="80%" />
                </View>
              ))}
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
    paddingBottom: 20,
  },
  overviewSection: {
    position: "relative",
    gap: 20,
    padding: 16,
    backgroundColor: "transparent",
  },
  bannerWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    zIndex: 0,
    overflow: "hidden",
  },
  contentWrapper: {
    position: "relative",
    zIndex: 1,
    gap: 20,
  },
  specialistHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  avatarContainer: {
    position: "relative",
  },
  specialistInfo: {
    flex: 1,
    gap: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgesContainer: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  bioSection: {
    gap: 8,
  },
  quickStats: {
    flexDirection: "row",
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    gap: 6,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  detailCard: {
    flex: 1,
    minWidth: "47%",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    gap: 10,
  },
  detailCardContent: {
    flex: 1,
    gap: 2,
  },
  skillsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  serviceInfo: {
    gap: 12,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  reviewItem: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
    marginRight: 10,
  },
  reviewsList: {
    gap: 12,
  },
  reviewRating: {
    flexDirection: "row",
    gap: 2,
  },
  contactInfo: {
    gap: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
});
