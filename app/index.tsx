import { router } from "expo-router";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { usePlatformStats } from "@/hooks/useApi";

import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  BorderRadius,
  createThemeShadow,
  Spacing,
  ThemeColors,
} from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useModal } from "@/contexts/ModalContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { useAnalytics, useAnalyticsService } from "@/hooks/useAnalytics";

export default function WelcomeScreen() {
  // Track screen view
  useAnalytics("Welcome");
  const analytics = useAnalyticsService();
  const { user, logout, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { showLoginModal } = useModal();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const { data: platformStats, isLoading: statsLoading } = usePlatformStats();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const formatCount = (value?: number) => {
    if (value === undefined || value === null) {
      return statsLoading ? "…" : "—";
    }
    return value.toLocaleString();
  };

  const formatRating = (value?: number) => {
    if (value === undefined || value === null) {
      return statsLoading ? "…" : "—";
    }
    return `${value.toFixed(1)}★`;
  };

  const supportAvailability =
    statsLoading && !platformStats
      ? "…"
      : platformStats?.supportAvailability || "24/7";

  const handleLogout = () => {
    Alert.alert(t("logout"), t("areYouSure"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("logout"),
        style: "destructive",
        onPress: async () => {
          analytics.logEvent("logout_initiated");
          await logout();
        },
      },
    ]);
  };

  const quickActions = [
    {
      title: t("browseServices"),
      description: t("findSpecialists"),
      icon: "briefcase.fill",
      route: "/services",
      color: "#4CAF50",
      gradient: ["#4CAF50", "#45A049"],
    },
    {
      title: t("postJob"),
      description: t("postJobDesc"),
      icon: "plus.circle.fill",
      route: "/orders/create",
      color: "#2196F3",
      gradient: ["#2196F3", "#1976D2"],
    },
    {
      title: t("myOrders"),
      description: t("myOrdersDesc"),
      icon: "list.bullet.rectangle.fill",
      route: "/orders",
      color: "#FF9800",
      gradient: ["#FF9800", "#F57C00"],
    },
    {
      title: t("savedOrders"),
      description: t("savedOrdersDesc"),
      icon: "bookmark.fill",
      route: "/orders?saved=true",
      color: "#E91E63",
      gradient: ["#E91E63", "#C2185B"],
    },
    {
      title: t("findSpecialistsTitle"),
      description: t("findSpecialistsDesc"),
      icon: "person.2.fill",
      route: "/specialists",
      color: "#9C27B0",
      gradient: ["#9C27B0", "#7B1FA2"],
    },
  ];

  const features = [
    {
      title: t("professionalServices"),
      description: t("professionalServicesDesc"),
      icon: "star.fill",
    },
    {
      title: t("securePayments"),
      description: t("securePaymentsDesc"),
      icon: "creditcard.fill",
    },
    {
      title: t("qualityReviews"),
      description: t("qualityReviewsDesc"),
      icon: "star.circle.fill",
    },
    {
      title: t("support24"),
      description: t("support24Desc"),
      icon: "headphones",
    },
  ];

  const header = (
    <Header
      title={t("welcome")}
      subtitle={
        user?.name ? `${t("hello")}, ${user.name}!` : t("welcomeToJobPortal")
      }
      showNotificationsButton={isAuthenticated}
      showChatButton={isAuthenticated}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
    />
  );

  return (
    <Layout header={header} onLogout={handleLogout}>
      <ScrollView
        style={{ flex: 1, marginBottom: 6 * Spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Hero Section */}
          <ResponsiveCard
            marginBlock={0}
            marginHorizontal={0}
            style={[styles.heroSection, { backgroundColor: colors.primary }]}
          >
            <View>
              <View style={styles.heroContent}>
                <View style={styles.heroTextContainer}>
                  <View style={styles.heroBadge}>
                    <IconSymbol name="star.fill" size={14} color="white" />
                    <ThemedText style={styles.heroBadgeText}>
                      {t("trustedByClients")}
                    </ThemedText>
                  </View>
                  {/* Trusted by 5,000+ clients */}
                  <ThemedText style={styles.heroTitle}>
                    {user
                      ? `${t("welcomeBack")}, ${user.name}!`
                      : t("findPerfectSpecialist")}
                  </ThemedText>
                  <ThemedText style={styles.heroSubtitle}>
                    {user
                      ? t("readyToStartNextProject")
                      : t("connectWithSkilledProfessionals")}
                  </ThemedText>
                </View>

                <View style={styles.heroImage}>
                  <View style={styles.heroIconContainer}>
                    <IconSymbol name="person.2.fill" size={40} color="white" />
                  </View>
                  <View style={styles.heroIconContainer}>
                    <IconSymbol name="briefcase.fill" size={40} color="white" />
                  </View>
                  <View style={styles.heroIconContainer}>
                    <IconSymbol name="star.fill" size={40} color="white" />
                  </View>
                </View>
              </View>
              <View style={styles.heroActions}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => {
                    analytics.logEvent("button_clicked", {
                      button_name: "browse_services",
                      location: "home_hero",
                    });
                    router.push("/services");
                  }}
                >
                  <IconSymbol
                    name="briefcase.fill"
                    size={18}
                    color={colors.primary}
                  />
                  <ThemedText style={styles.primaryButtonText}>
                    {user ? t("browseServices") : t("getStarted")}
                  </ThemedText>
                </TouchableOpacity>

                {!user && (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => {
                      analytics.logEvent("button_clicked", {
                        button_name: "login",
                        location: "home_hero",
                      });
                      showLoginModal();
                    }}
                  >
                    <IconSymbol
                      name="person.fill"
                      size={18}
                      color={colors.primary}
                    />
                    <ThemedText style={styles.primaryButtonText}>
                      {t("getStarted")}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ResponsiveCard>

          {/* Quick Actions */}
          <View style={styles.sectionContainer}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              {t("quickActions")}
            </ThemedText>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.actionCard,
                    {
                      backgroundColor: colors.surface,
                      ...createThemeShadow(isDark, 2),
                    },
                  ]}
                  onPress={() => {
                    analytics.logEvent("quick_action_clicked", {
                      action_name: action.title,
                      route: action.route,
                    });
                    router.push(action.route as any);
                  }}
                >
                  <View
                    style={[
                      styles.actionIcon,
                      { backgroundColor: action.color },
                    ]}
                  >
                    <IconSymbol
                      name={action.icon as any}
                      size={24}
                      color="white"
                    />
                  </View>
                  <View style={styles.actionContent}>
                    <ThemedText
                      style={[styles.actionTitle, { color: colors.text }]}
                    >
                      {action.title}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.actionDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {action.description}
                    </ThemedText>
                  </View>
                  <IconSymbol
                    name="chevron.right"
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Features */}
          <View style={styles.sectionContainer}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              {t("whyChooseJobPortal")}
            </ThemedText>
            <View style={styles.featuresGrid}>
              {features.map((feature, index) => (
                <View
                  key={index}
                  style={[
                    styles.featureCard,
                    {
                      backgroundColor: colors.surface,
                      ...createThemeShadow(isDark, 1),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.featureIcon,
                      { backgroundColor: colors.primary + "20" },
                    ]}
                  >
                    <IconSymbol
                      name={feature.icon as any}
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.featureContent}>
                    <ThemedText
                      style={[styles.featureTitle, { color: colors.text }]}
                    >
                      {feature.title}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.featureDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {feature.description}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Stats */}
          <View style={styles.sectionContainer}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              {t("platformStatistics")}
            </ThemedText>
            <View style={styles.statsContainer}>
              <View style={styles.statsRow}>
                <View
                  style={[styles.statCard, { backgroundColor: colors.surface }]}
                >
                  <ThemedText
                    style={[styles.statNumber, { color: colors.primary }]}
                  >
                    {formatCount(platformStats?.activeSpecialists)}
                  </ThemedText>
                  <ThemedText
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t("activeSpecialists")}
                  </ThemedText>
                </View>
                <View
                  style={[styles.statCard, { backgroundColor: colors.surface }]}
                >
                  <ThemedText
                    style={[styles.statNumber, { color: colors.primary }]}
                  >
                    {formatCount(platformStats?.completedProjects)}
                  </ThemedText>
                  <ThemedText
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t("completedProjects")}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View
                  style={[styles.statCard, { backgroundColor: colors.surface }]}
                >
                  <ThemedText
                    style={[styles.statNumber, { color: colors.primary }]}
                  >
                    {formatRating(platformStats?.averageRating)}
                  </ThemedText>
                  <ThemedText
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t("averageRating")}
                  </ThemedText>
                </View>
                <View
                  style={[styles.statCard, { backgroundColor: colors.surface }]}
                >
                  <ThemedText
                    style={[styles.statNumber, { color: colors.primary }]}
                  >
                    {supportAvailability}
                  </ThemedText>
                  <ThemedText
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t("supportAvailable")}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  // Container
  container: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  // Hero section
  heroSection: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    alignSelf: "flex-start",
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: Spacing.md,
    lineHeight: 38,
    color: "white",
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: Spacing.xl,
    color: "rgba(255, 255, 255, 0.9)",
  },
  heroActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    minHeight: 48,
    backgroundColor: "white",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0a7ea4",
  },
  heroImage: {
    flexDirection: "column",
    width: 120,
    height: 120,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    gap: Spacing.sm,
  },
  heroIconContainer: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Section containers
  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: Spacing.lg,
  },

  // Quick actions
  quickActionsGrid: {
    gap: Spacing.md,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  actionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Features
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  featureCard: {
    width: "48%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  featureContent: {
    alignItems: "center",
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },

  // Stats
  statsContainer: {
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
