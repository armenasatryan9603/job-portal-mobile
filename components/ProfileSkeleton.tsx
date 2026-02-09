import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ScrollView } from "react-native";
import { ThemeColors, Spacing } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { Layout } from "@/components/Layout";
import { Header } from "@/components/Header";
import { useTranslation } from "@/contexts/TranslationContext";
import { router } from "expo-router";

interface ProfileSkeletonProps {
  header?: React.ReactNode;
}

export const ProfileSkeleton: React.FC<ProfileSkeletonProps> = ({
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
      title={t("profile")}
      subtitle={t("manageAccountPreferences")}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  return (
    <Layout header={header || defaultHeader}>
      <ScrollView
        style={{
          flex: 1,
          marginBottom: 4 * Spacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Profile Header with banner background */}
          <ResponsiveCard padding={0} style={{ overflow: "hidden" }}>
            <View style={styles.bannerContainer}>
              <SkeletonBox height={140} width="100%" borderRadius={0} />
            </View>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <SkeletonBox width={80} height={80} borderRadius={40} />
              </View>
              <View style={styles.profileInfo}>
                <SkeletonBox
                  height={24}
                  width="70%"
                  style={{ marginBottom: 8 }}
                />
                <SkeletonBox
                  height={16}
                  width="50%"
                  style={{ marginBottom: 8 }}
                />
                <View style={styles.ratingContainer}>
                  <SkeletonBox width={16} height={16} borderRadius={8} />
                  <SkeletonBox
                    height={14}
                    width={120}
                    style={{ marginLeft: 4 }}
                  />
                </View>
                <View style={styles.locationContainer}>
                  <SkeletonBox width={14} height={14} borderRadius={7} />
                  <SkeletonBox
                    height={14}
                    width={150}
                    style={{ marginLeft: 4, marginTop: 4 }}
                  />
                </View>
              </View>
            </View>
          </ResponsiveCard>

          {/* Bio Section */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <SkeletonBox height={20} width={60} />
              <SkeletonBox width={50} height={32} borderRadius={8} />
            </View>
            <View style={styles.bioContent}>
              <SkeletonBox height={15} width="100%" style={{ marginBottom: 4 }} />
              <SkeletonBox height={15} width="95%" style={{ marginBottom: 4 }} />
              <SkeletonBox height={15} width="85%" />
            </View>
          </ResponsiveCard>

          {/* Languages Section */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <SkeletonBox height={20} width={100} />
            </View>
            <View style={styles.languagesContainer}>
              {[1, 2, 3].map((item) => (
                <SkeletonBox
                  key={item}
                  width={80}
                  height={32}
                  borderRadius={16}
                />
              ))}
            </View>
          </ResponsiveCard>

          {/* Contact Information */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <SkeletonBox height={20} width={140} />
            </View>
            <View style={styles.contactInfo}>
              {[1, 2].map((item) => (
                <View key={item} style={styles.contactItem}>
                  <SkeletonBox width={16} height={16} borderRadius={8} />
                  <SkeletonBox height={15} width="80%" />
                </View>
              ))}
            </View>
          </ResponsiveCard>

          {/* Account Information */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <SkeletonBox height={20} width={150} />
            </View>
            <View style={styles.accountInfo}>
              {[1, 2, 3].map((item) => (
                <View key={item} style={styles.accountItem}>
                  <SkeletonBox width={16} height={16} borderRadius={8} />
                  <SkeletonBox height={15} width="70%" />
                </View>
              ))}
            </View>
          </ResponsiveCard>

          {/* Teams Section */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <SkeletonBox height={20} width={80} />
                <SkeletonBox width={24} height={24} borderRadius={12} />
              </View>
            </View>
            <View style={styles.teamsList}>
              {[1, 2].map((item) => (
                <View
                  key={item}
                  style={[styles.teamItem, { borderColor: colors.border }]}
                >
                  <View style={styles.teamItemContent}>
                    <SkeletonBox
                      height={16}
                      width="60%"
                      style={{ marginBottom: 4 }}
                    />
                    <View style={styles.teamItemMeta}>
                      <SkeletonBox width={14} height={14} borderRadius={7} />
                      <SkeletonBox
                        height={13}
                        width={60}
                        style={{ marginLeft: 4 }}
                      />
                    </View>
                  </View>
                  <SkeletonBox width={16} height={16} borderRadius={8} />
                </View>
              ))}
            </View>
          </ResponsiveCard>

          {/* Payments entry point */}
          <ResponsiveCard>
            <View style={styles.paymentsPreview}>
              <View style={{ flex: 1 }}>
                <SkeletonBox height={20} width={180} style={{ marginBottom: 8 }} />
                <SkeletonBox height={14} width="90%" style={{ marginBottom: 4 }} />
                <SkeletonBox height={14} width="75%" />
              </View>
              <SkeletonBox width={140} height={44} borderRadius={8} />
            </View>
          </ResponsiveCard>

          {/* Skills/Services Section */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <SkeletonBox height={20} width={120} />
              <SkeletonBox width={50} height={32} borderRadius={8} />
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

          {/* Price Range Section */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <SkeletonBox height={20} width={100} />
              <SkeletonBox width={50} height={32} borderRadius={8} />
            </View>
            <View style={styles.priceDisplayContainer}>
              <SkeletonBox height={16} width={150} />
            </View>
          </ResponsiveCard>

          {/* Location Section */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <SkeletonBox height={20} width={80} />
              <SkeletonBox width={50} height={32} borderRadius={8} />
            </View>
            <View style={styles.locationDisplayContainer}>
              <View style={styles.locationDisplayRow}>
                <SkeletonBox width={18} height={18} borderRadius={9} />
                <SkeletonBox height={16} width={200} />
              </View>
            </View>
          </ResponsiveCard>

          {/* Work Samples Section */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <SkeletonBox height={20} width={140} />
            </View>
            <View style={styles.workSamplesContainer}>
              {[1, 2, 3].map((item) => (
                <SkeletonBox
                  key={item}
                  width="31%"
                  height={120}
                  borderRadius={8}
                />
              ))}
            </View>
          </ResponsiveCard>

          {/* Reviews Given */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <SkeletonBox height={20} width={140} />
            </View>
            <View style={styles.reviewsList}>
              {[1, 2].map((item) => (
                <View
                  key={item}
                  style={[styles.reviewItem, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewProjectInfo}>
                      <SkeletonBox
                        height={16}
                        width="70%"
                        style={{ marginBottom: 4 }}
                      />
                      <SkeletonBox height={13} width="50%" />
                    </View>
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
                  <SkeletonBox
                    height={15}
                    width="90%"
                    style={{ marginTop: 8, marginBottom: 4 }}
                  />
                  <SkeletonBox height={15} width="75%" />
                  <View style={styles.reviewFooter}>
                    <SkeletonBox height={12} width={80} />
                    <SkeletonBox height={12} width={100} />
                  </View>
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
  bannerContainer: {
    height: 140,
    overflow: "hidden",
  },
  profileHeader: {
    padding: Spacing.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarContainer: {
    position: "relative",
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  bioContent: {
    gap: 4,
  },
  languagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  contactInfo: {
    gap: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accountInfo: {
    gap: 12,
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  teamsList: {
    gap: 12,
    marginBottom: 16,
  },
  teamItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    gap: Spacing.md,
    borderColor: "transparent", // Will be overridden by inline style if needed
  },
  teamItemContent: {
    flex: 1,
  },
  teamItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  paymentsPreview: {
    gap: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  priceDisplayContainer: {
    paddingVertical: 8,
  },
  locationDisplayContainer: {
    paddingVertical: 8,
  },
  locationDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  workSamplesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reviewsList: {
    gap: 16,
  },
  reviewItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewProjectInfo: {
    flex: 1,
    marginRight: 10,
  },
  reviewRating: {
    flexDirection: "row",
    gap: 2,
  },
  reviewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
});

