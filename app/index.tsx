import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BorderRadius,
  Spacing,
  ThemeColors,
  Typography,
  createThemeShadow,
} from "@/constants/styles";
import { useAnalytics, useAnalyticsService } from "@/hooks/useAnalytics";

import { AdBanner } from "@/components/AdBanner";
import { Header } from "@/components/Header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { ThemedText } from "@/components/themed-text";
import { UserAvatar } from "@/components/UserAvatar";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { usePlatformStats } from "@/hooks/useApi";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";

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
      title: t("findJobs"),
      description: t("findJobsDesc"),
      icon: "briefcase.fill",
      route: "/orders/create",
      color: "#2196F3",
      gradient: ["#2196F3", "#1976D2"],
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
      title: t("browseCategories"),
      description: t("findSpecialists"),
      icon: "briefcase.fill",
      route: "/categories",
      color: colors.success,
      gradient: [colors.success, "#45A049"], // Note: Second gradient color could be added to design system
    },
    {
      title: t("findSpecialistsTitle"),
      description: t("findSpecialistsDesc"),
      icon: "person.2.fill",
      route: "/specialists",
      color: "#9C27B0",
      gradient: ["#9C27B0", "#7B1FA2"],
    },
    {
      title: t("servicesForMe"),
      description: t("servicesForMeDesc"),
      icon: "briefcase.fill",
      route: "/services",
      color: colors.warning,
      gradient: [colors.warning, "#F57C00"], // Note: Second gradient color could be added to design system
    },
  ];

  const features = [
    {
      title: t("professionalCategories"),
      description: t("professionalCategoriesDesc"),
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
        user?.name ? `${t("hello")}, ${user.name}!` : t("welcomeToHotWork")
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
          {/* User Profile Card */}
          <ResponsiveCard
            marginBlock={0}
            marginHorizontal={0}
            style={[
              styles.userCardWrapper,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                ...createThemeShadow(isDark, 3),
              },
            ]}
          >
            {user ? (
              <TouchableOpacity
                style={styles.userCardContent}
                onPress={() => {
                  analytics.logEvent("button_clicked", {
                    button_name: "view_profile",
                    location: "home_user_card",
                  });
                  router.push("/profile/profile");
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.avatarContainer, { borderColor: colors.border }]}>
                  <UserAvatar user={user} size={56} />
                  {user.verified && (
                    <View style={[styles.verifiedBadge, { backgroundColor: colors.success }]}>
                      <IconSymbol
                        name="checkmark.seal.fill"
                        size={12}
                        color={colors.textInverse}
                      />
                    </View>
                  )}
                </View>
                <View style={styles.userInfo}>
                  <ThemedText
                    style={[styles.welcomeText, { color: colors.textSecondary }]}
                  >
                    {t("welcomeBack")}
                  </ThemedText>
                  <View style={styles.userNameRow}>
                    <ThemedText
                      style={[styles.userName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {user.name}
                    </ThemedText>
                  </View>
                  <View style={styles.userMetaRow}>
                    <ThemedText
                      style={[styles.userRole, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </ThemedText>
                    {user.creditBalance !== undefined && (
                      <>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <View style={styles.creditContainer}>
                          <IconSymbol
                            name="creditcard.fill"
                            size={12}
                            color={colors.primary}
                          />
                          <ThemedText
                            style={[styles.creditText, { color: colors.primary }]}
                          >
                            {user.creditBalance}
                          </ThemedText>
                        </View>
                      </>
                    )}
                  </View>
                </View>
                <View style={[styles.arrowContainer, { backgroundColor: colors.backgroundSecondary }]}>
                  <IconSymbol
                    name="chevron.right"
                    size={18}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.loginPrompt}>
                <View style={[styles.loginIconContainer, { backgroundColor: colors.backgroundSecondary }]}>
                  <IconSymbol
                    name="person.circle.fill"
                    size={32}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.loginTextContainer}>
                  <ThemedText
                    style={[styles.loginTitle, { color: colors.text }]}
                  >
                    {t("signUpToAccess")}
                  </ThemedText>
                  <ThemedText
                    style={[styles.loginSubtitle, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {t("signUpToAccessDescription")}
                  </ThemedText>
                </View>
                <View style={styles.loginButtons}>
                  <TouchableOpacity
                    style={[styles.loginButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      analytics.logEvent("button_clicked", {
                        button_name: "login",
                        location: "home_user_card",
                      });
                      showLoginModal();
                    }}
                    activeOpacity={0.8}
                  >
                    <ThemedText style={styles.loginButtonText}>
                      {t("login")}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.signupButton,
                      { 
                        backgroundColor: colors.surface,
                        borderColor: colors.primary,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => {
                      analytics.logEvent("button_clicked", {
                        button_name: "signup",
                        location: "home_user_card",
                      });
                      showLoginModal();
                    }}
                    activeOpacity={0.8}
                  >
                    <ThemedText
                      style={[styles.signupButtonText, { color: colors.primary }]}
                    >
                      {t("signup")}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ResponsiveCard>

          <View style={styles.adSlotPlaceholder}>
            <AdBanner />
          </View>

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
                      color={colors.textInverse}
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
  container: {
    padding: Spacing.md,
    gap: Spacing.xl,
  },
  adSlotPlaceholder: {
    alignItems: "center",
  },
  // User Card
  userCardWrapper: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  userCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatarContainer: {
    position: "relative",
    borderWidth: 2,
    borderRadius: 30,
    padding: 2,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    // Note: Should use colors.surface or colors.textInverse dynamically - consider inline style
    borderColor: "white",
  },
  userInfo: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  welcomeText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  userMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: 2,
  },
  userRole: {
    fontSize: 13,
    fontWeight: "500",
  },
  divider: {
    width: 1,
    height: 12,
  },
  creditContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: "transparent",
  },
  creditText: {
    fontSize: 12,
    fontWeight: "600",
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  // Login Prompt
  loginPrompt: {
    alignItems: "center",
    gap: Spacing.md,
  },
  loginIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  loginTextContainer: {
    alignItems: "center",
    gap: Spacing.xs / 2,
    marginBottom: Spacing.xs,
  },
  loginTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  loginSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: Spacing.md,
  },
  loginButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    width: "100%",
    marginTop: Spacing.xs,
  },
  loginButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: "700",
    // Note: Should use colors.textInverse dynamically - consider inline style
    color: "white",
  },
  signupButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  signupButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },

  // Section containers
  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
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
