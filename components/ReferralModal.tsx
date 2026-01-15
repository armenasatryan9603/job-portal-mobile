import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Share,
  Clipboard,
  Platform,
} from "react-native";
import { IconSymbol } from "./ui/icon-symbol";
import { ThemeColors, Typography } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { apiService } from "@/categories/api";

interface ReferralModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ReferralStats {
  referralCode: string | null;
  totalReferrals: number;
  totalEarned: number;
  pendingRewards: number;
  referrals: Array<{
    id: number;
    referredUserName: string;
    rewardAmount: number;
    status: string;
    createdAt: Date;
  }>;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  visible,
  onClose,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const { t } = useTranslation();
  const { user } = useAuth();

  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    if (visible && user) {
      loadReferralStats();
    }
  }, [visible, user]);

  const loadReferralStats = async () => {
    try {
      setLoading(true);
      const response = await apiService.getReferralStats();
      setStats({
        referralCode: response.referralCode,
        totalReferrals: response.totalReferrals,
        totalEarned: response.totalEarned,
        pendingRewards: response.pendingRewards,
        referrals: response.referrals.map((r) => ({
          id: r.id,
          referredUserName: r.referredUserName,
          rewardAmount: r.rewardAmount,
          status: r.status,
          createdAt: new Date(r.createdAt),
        })),
      });
    } catch (error) {
      console.error("Error loading referral stats:", error);
      Alert.alert(t("error"), t("failedToLoadReferralStats"));
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setShareLoading(true);

      if (!stats?.referralCode) {
        Alert.alert(t("error"), t("noReferralCode"));
        return;
      }

      // Get share link from backend
      const shareData = await apiService.getReferralShareLink();
      const shareLink = shareData.shareLink;
      const message =
        shareData.message ||
        `${t("joinMeOnThisPlatform")} ${t("useMyReferralCode")}: ${
          stats.referralCode
        } ${t("weBothGetCredits")}!`;

      await Share.share({
        message: `${message}\n\n${shareLink}`,
        url: shareLink,
        title: t("referralInvitation"),
      });
    } catch (error) {
      console.error("Error sharing:", error);
      Alert.alert(t("error"), "Failed to get share link. Please try again.");
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      if (!stats?.referralCode) {
        Alert.alert(t("error"), t("noReferralCode"));
        return;
      }

      await Clipboard.setString(stats.referralCode);
      Alert.alert(t("success"), t("referralCodeCopied"));
    } catch (error) {
      console.error("Error copying code:", error);
      Alert.alert(t("error"), t("failedToCopyCode"));
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("referralProgram")}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              {t("loadingReferralStats")}
            </Text>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Referral Code Section */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("yourReferralCode")}
              </Text>
              <View style={styles.codeContainer}>
                <Text style={[styles.referralCode, { color: colors.primary }]}>
                  {stats?.referralCode || "REF123"}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.copyButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleCopyCode}
                >
                  <IconSymbol name="doc.on.doc" size={16} color="white" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[
                  styles.shareButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleShare}
                disabled={shareLoading}
              >
                {shareLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <IconSymbol
                      name="square.and.arrow.up"
                      size={20}
                      color="white"
                    />
                    <Text style={styles.shareButtonText}>
                      {t("shareReferralLink")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Stats Section */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("referralStats")}
              </Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>
                    {stats?.totalReferrals || 0}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t("totalReferrals")}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>
                    {stats?.totalEarned || 0}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t("creditsEarned")}
                  </Text>
                </View>
              </View>
            </View>

            {/* How It Works */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("howItWorks")}
              </Text>
              <View style={styles.stepsContainer}>
                <View style={styles.step}>
                  <View
                    style={[
                      styles.stepNumber,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.text }]}>
                    {t("shareYourReferralCode")}
                  </Text>
                </View>
                <View style={styles.step}>
                  <View
                    style={[
                      styles.stepNumber,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.text }]}>
                    {t("friendSignsUpWithCode")}
                  </Text>
                </View>
                <View style={styles.step}>
                  <View
                    style={[
                      styles.stepNumber,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.text }]}>
                    {t("bothGetCredits")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Recent Referrals */}
            {stats?.referrals && stats.referrals.length > 0 && (
              <View
                style={[styles.section, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("recentReferrals")}
                </Text>
                {stats.referrals.map((referral) => (
                  <View key={referral.id} style={styles.referralItem}>
                    <View style={styles.referralInfo}>
                      <Text
                        style={[styles.referralName, { color: colors.text }]}
                      >
                        {referral.referredUserName}
                      </Text>
                      <Text
                        style={[
                          styles.referralDate,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {formatDate(referral.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.referralReward}>
                      <Text
                        style={[styles.rewardAmount, { color: colors.primary }]}
                      >
                        +{referral.rewardAmount} {t("credits")}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              referral.status === "completed"
                                ? colors.primary + "20"
                                : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color:
                                referral.status === "completed"
                                  ? colors.primary
                                  : colors.textSecondary,
                            },
                          ]}
                        >
                          {referral.status === "completed"
                            ? t("completed")
                            : t("pending")}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 0 : 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    marginBottom: 12,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  referralCode: {
    fontSize: 24,
    fontWeight: "700",
    flex: 1,
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  shareButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  stepsContainer: {
    gap: 16,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  stepText: {
    flex: 1,
    fontSize: 16,
  },
  referralItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    fontSize: 16,
    fontWeight: "500",
  },
  referralDate: {
    fontSize: 14,
    marginTop: 2,
  },
  referralReward: {
    alignItems: "flex-end",
  },
  rewardAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
