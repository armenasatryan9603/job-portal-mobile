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

interface OrderDetailSkeletonProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const OrderDetailSkeleton: React.FC<OrderDetailSkeletonProps> = ({
  header,
  footer,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
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

  return (
    <Layout header={header} footer={footer}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ResponsiveContainer>
          {/* Order Overview Skeleton */}
          <ResponsiveCard>
            <View>
              <SkeletonBox
                height={28}
                width="85%"
                style={{ marginBottom: 12 }}
              />
              <SkeletonBox
                height={16}
                width="100%"
                style={{ marginBottom: 4 }}
              />
              <SkeletonBox
                height={16}
                width="90%"
                style={{ marginBottom: 12 }}
              />
              <SkeletonBox
                height={24}
                width={120}
                borderRadius={16}
                style={{ marginBottom: 16 }}
              />
              <SkeletonBox height={44} width="100%" borderRadius={8} />
            </View>
          </ResponsiveCard>

          {/* Order Details Skeleton */}
          <ResponsiveCard>
            <View style={styles.detailsContainer}>
              {[1, 2, 3, 4].map((item) => (
                <View key={item} style={styles.detailItem}>
                  <SkeletonBox width={20} height={20} borderRadius={10} />
                  <View style={styles.detailContent}>
                    <SkeletonBox
                      height={13}
                      width={60}
                      style={{ marginBottom: 4 }}
                    />
                    <SkeletonBox height={15} width="70%" />
                  </View>
                </View>
              ))}
            </View>
          </ResponsiveCard>

          {/* Media Files Skeleton */}
          <ResponsiveCard>
            <View style={styles.mediaGrid}>
              {[1, 2, 3].map((item) => (
                <SkeletonBox
                  key={item}
                  width="30%"
                  height={100}
                  borderRadius={8}
                  style={{ aspectRatio: 1 }}
                />
              ))}
            </View>
          </ResponsiveCard>

          {/* Skills Skeleton */}
          <ResponsiveCard>
            <View style={styles.skillsContainer}>
              {[1, 2, 3, 4].map((item) => (
                <SkeletonBox
                  key={item}
                  width={80}
                  height={32}
                  borderRadius={20}
                />
              ))}
            </View>
          </ResponsiveCard>

          {/* Client Information Skeleton */}
          <ResponsiveCard>
            <View style={styles.clientHeader}>
              <View style={styles.clientMainInfo}>
                <SkeletonBox width={50} height={50} borderRadius={25} />
                <View style={styles.clientNameContainer}>
                  <SkeletonBox
                    height={18}
                    width={120}
                    style={{ marginBottom: 6 }}
                  />
                  <SkeletonBox height={14} width={80} borderRadius={10} />
                </View>
              </View>
            </View>
            <View style={styles.clientDetails}>
              <View style={styles.clientDetailItem}>
                <SkeletonBox width={16} height={16} borderRadius={8} />
                <SkeletonBox height={13} width={150} />
              </View>
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
  detailsContainer: {
    gap: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  detailContent: {
    flex: 1,
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  clientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  clientMainInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  clientNameContainer: {
    flex: 1,
    gap: 6,
  },
  clientDetails: {
    gap: 12,
  },
  clientDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
