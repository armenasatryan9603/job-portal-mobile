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

interface ServiceCreateSkeletonProps {
  header?: React.ReactNode;
  isEditMode?: boolean;
}

export const ServiceCreateSkeleton: React.FC<ServiceCreateSkeletonProps> = ({
  header,
  isEditMode = false,
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

  return (
    <Layout header={header}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ResponsiveContainer>
          {/* Basic Information Skeleton */}
          <ResponsiveCard>
            <View>
              {/* Name field */}
              <SkeletonBox
                height={14}
                width={80}
                style={{ marginBottom: 8 }}
              />
              <SkeletonBox
                height={48}
                width="100%"
                borderRadius={8}
                style={{ marginBottom: 16 }}
              />

              {/* Description field */}
              <SkeletonBox
                height={14}
                width={100}
                style={{ marginBottom: 8 }}
              />
              <SkeletonBox
                height={120}
                width="100%"
                borderRadius={8}
                style={{ marginBottom: 16 }}
              />

              {/* Location field */}
              <SkeletonBox
                height={14}
                width={70}
                style={{ marginBottom: 8 }}
              />
              <SkeletonBox
                height={48}
                width="100%"
                borderRadius={8}
              />
            </View>
          </ResponsiveCard>

          {/* Weekly Schedule - Business Hours Skeleton */}
          <ResponsiveCard>
            <SkeletonBox
              height={24}
              width="60%"
              style={{ marginBottom: 8 }}
            />
            <SkeletonBox
              height={16}
              width="90%"
              style={{ marginBottom: 16 }}
            />

            {/* Schedule tabs skeleton */}
            <View style={styles.tabsContainer}>
              <SkeletonBox
                height={40}
                width="45%"
                borderRadius={8}
                style={{ marginRight: 8 }}
              />
              <SkeletonBox
                height={40}
                width="45%"
                borderRadius={8}
              />
            </View>

            {/* Schedule content skeleton */}
            <View style={styles.scheduleContent}>
              <SkeletonBox
                height={16}
                width="50%"
                style={{ marginBottom: 12 }}
              />
              <View style={styles.timeInputsRow}>
                <SkeletonBox
                  height={40}
                  width="45%"
                  borderRadius={8}
                />
                <SkeletonBox
                  height={20}
                  width={16}
                  borderRadius={10}
                />
                <SkeletonBox
                  height={40}
                  width="45%"
                  borderRadius={8}
                />
              </View>
              <SkeletonBox
                height={40}
                width="100%"
                borderRadius={8}
                style={{ marginTop: 12 }}
              />

              {/* Days list skeleton */}
              <View style={styles.daysList}>
                {[1, 2, 3, 4, 5, 6, 7].map((item) => (
                  <View key={item} style={styles.dayItem}>
                    <View style={styles.dayHeader}>
                      <SkeletonBox
                        width={20}
                        height={20}
                        borderRadius={6}
                        style={{ marginRight: 12 }}
                      />
                      <SkeletonBox
                        height={16}
                        width={80}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </ResponsiveCard>

          {/* Media Upload Skeleton */}
          <ResponsiveCard>
            <SkeletonBox
              height={24}
              width="50%"
              style={{ marginBottom: 16 }}
            />
            <View style={styles.mediaGrid}>
              {[1, 2, 3, 4].map((item) => (
                <View key={item} style={styles.mediaItem}>
                  <SkeletonBox
                    width="100%"
                    height={100}
                    borderRadius={8}
                    style={{ aspectRatio: 1 }}
                  />
                </View>
              ))}
            </View>
            <SkeletonBox
              height={40}
              width="100%"
              borderRadius={8}
              style={{ marginTop: 12 }}
            />
          </ResponsiveCard>

          {/* Attached Orders Section Skeleton */}
          <ResponsiveCard>
            <View style={styles.sectionHeader}>
              <SkeletonBox
                height={24}
                width={140}
              />
              <SkeletonBox
                height={36}
                width={100}
                borderRadius={8}
              />
            </View>

            {/* Empty orders state skeleton */}
            <View style={styles.emptyOrdersContainer}>
              <SkeletonBox
                width={48}
                height={48}
                borderRadius={24}
                style={{ marginBottom: 12 }}
              />
              <SkeletonBox
                height={18}
                width={150}
                style={{ marginBottom: 8 }}
              />
              <SkeletonBox
                height={14}
                width={200}
              />
            </View>
          </ResponsiveCard>

          {/* User Management Skeleton - Only in edit mode */}
          {isEditMode && (
            <ResponsiveCard>
              <View style={styles.sectionHeader}>
                <SkeletonBox
                  height={24}
                  width={120}
                />
                <SkeletonBox
                  height={36}
                  width={100}
                  borderRadius={8}
                />
              </View>

              {/* Members list skeleton */}
              <View style={styles.membersList}>
                {[1, 2, 3].map((item) => (
                  <View key={item} style={styles.memberItem}>
                    <View style={styles.memberHeader}>
                      <SkeletonBox
                        width={50}
                        height={50}
                        borderRadius={25}
                        style={{ marginRight: 12 }}
                      />
                      <View style={styles.memberInfo}>
                        <SkeletonBox
                          height={16}
                          width={120}
                          style={{ marginBottom: 6 }}
                        />
                        <SkeletonBox
                          height={14}
                          width={80}
                        />
                      </View>
                      <SkeletonBox
                        width={24}
                        height={24}
                        borderRadius={12}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </ResponsiveCard>
          )}

          {/* Action Buttons Skeleton */}
          <ResponsiveCard>
            <View style={styles.actionButtons}>
              {isEditMode && (
                <>
                  <SkeletonBox
                    height={44}
                    width={100}
                    borderRadius={8}
                  />
                  <SkeletonBox
                    height={44}
                    width={100}
                    borderRadius={8}
                  />
                </>
              )}
              <SkeletonBox
                height={44}
                width={120}
                borderRadius={8}
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
  tabsContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  scheduleContent: {
    marginTop: 16,
  },
  timeInputsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  daysList: {
    marginTop: 16,
    gap: 12,
  },
  dayItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  mediaItem: {
    width: "30%",
    aspectRatio: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyOrdersContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  membersList: {
    gap: 12,
  },
  memberItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberInfo: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
});
