import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ScrollView } from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Layout } from "@/components/Layout";

interface NotificationDetailSkeletonProps {
  header: React.ReactNode;
}

export const NotificationDetailSkeleton: React.FC<
  NotificationDetailSkeletonProps
> = ({ header }) => {
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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrapper}>
          {/* Header Section */}
          <View style={styles.notificationHeader}>
            <View style={styles.notificationIconContainer}>
              <View
                style={[
                  styles.iconWrapper,
                  {
                    backgroundColor: colors.border + "20",
                  },
                ]}
              >
                <SkeletonBox width={22} height={22} borderRadius={11} />
              </View>
            </View>
            <View style={styles.notificationInfo}>
              <SkeletonBox height={20} width="70%" borderRadius={4} />
              <SkeletonBox
                height={14}
                width="40%"
                borderRadius={4}
                style={{ marginTop: 6 }}
              />
            </View>
          </View>

          {/* Content Section */}
          <View style={styles.contentSection}>
            <SkeletonBox height={16} width="100%" borderRadius={4} />
            <SkeletonBox
              height={16}
              width="95%"
              borderRadius={4}
              style={{ marginTop: 8 }}
            />
            <SkeletonBox
              height={16}
              width="90%"
              borderRadius={4}
              style={{ marginTop: 8 }}
            />
            <SkeletonBox
              height={16}
              width="85%"
              borderRadius={4}
              style={{ marginTop: 8 }}
            />
          </View>

          {/* Related Data Section (sometimes shown) */}
          {Math.random() > 0.5 && (
            <View style={styles.relatedDataSection}>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.relatedDataItem}>
                <SkeletonBox height={14} width={100} borderRadius={4} />
                <SkeletonBox
                  height={14}
                  width="60%"
                  borderRadius={4}
                  style={{ marginLeft: 12 }}
                />
              </View>
              <View
                style={[
                  styles.relatedDataItem,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: 0.5,
                  },
                ]}
              >
                <SkeletonBox height={14} width={100} borderRadius={4} />
                <SkeletonBox
                  height={14}
                  width="50%"
                  borderRadius={4}
                  style={{ marginLeft: 12 }}
                />
              </View>
            </View>
          )}

          {/* Action Button */}
          <View style={styles.actionButtonContainer}>
            <SkeletonBox
              height={48}
              width="100%"
              borderRadius={12}
            />
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  notificationIconContainer: {
    marginRight: 12,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationInfo: {
    flex: 1,
  },
  contentSection: {
    marginBottom: 32,
  },
  divider: {
    height: 0.5,
    marginBottom: 20,
  },
  relatedDataSection: {
    marginBottom: 32,
  },
  relatedDataItem: {
    flexDirection: "row",
    paddingBottom: 16,
    marginBottom: 16,
  },
  actionButtonContainer: {
    marginTop: 8,
  },
});
