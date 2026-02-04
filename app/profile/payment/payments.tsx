import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BorderRadius,
  Spacing,
  ThemeColors,
  Typography,
} from "@/constants/styles";
import { CreditCardItem, PaymentHistoryCard } from "./card";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { useEffect, useState } from "react";

import AnalyticsService from "@/categories/AnalyticsService";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Layout } from "@/components/Layout";
import { apiService } from "@/categories/api";
import { router } from "expo-router";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { useCreditCard } from "@/contexts/CreditCardContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";

type PaymentHistoryStatus = "completed" | "pending" | "failed";

type PaymentHistoryItem = {
  id: string;
  type:
    | "refill"
    | "payout"
    | "order_application"
    | "rejection_refund"
    | "selection_refund";
  amount: number;
  currency: string;
  status: PaymentHistoryStatus;
  method: string;
  reference: string;
  createdAt: string;
  description?: string;
};

export default function PaymentsScreen() {
  useAnalytics("Payments");
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const { creditCards, removeCreditCard, setDefaultCard, isLoading } =
    useCreditCard();
  const { user } = useAuth();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>(
    []
  );
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const response = await apiService.getCreditTransactions(1, 50);

      // Map backend transactions to PaymentHistoryItem format
      const mappedHistory: PaymentHistoryItem[] = response.transactions.map(
        (tx) => {
          // Determine transaction type
          let type: PaymentHistoryItem["type"] = "refill";
          if (tx.type === "order_application") {
            type = "order_application";
          } else if (
            tx.type === "rejection_refund" ||
            tx.type === "selection_refund"
          ) {
            type = tx.type as "rejection_refund" | "selection_refund";
          } else if (tx.type === "refill") {
            type = "refill";
          }

          // Determine status
          let status: PaymentHistoryStatus = "completed";
          if (tx.status === "pending") {
            status = "pending";
          } else if (tx.status === "failed") {
            status = "failed";
          }

          // Get payment method from metadata or default
          const method = tx.metadata?.paymentMethod || "Credit Card";

          return {
            id: tx.id.toString(),
            type,
            amount: Math.abs(tx.amount), // Always show positive amount
            currency: "USD",
            status,
            method,
            reference: tx.referenceId || tx.id.toString(),
            createdAt: tx.createdAt,
            description: tx.description || undefined,
          };
        }
      );

      setPaymentHistory(mappedHistory);
    } catch (error: any) {
      console.error("Error fetching payment history:", error);
      setHistoryError(error.message || t("failedToLoadPaymentHistory"));
    } finally {
      setHistoryLoading(false);
    }
  };

  const header = (
    <Header
      title={t("paymentsOverview")}
      subtitle={t("paymentsOverviewDescription")}
      showBackButton
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
      onBackPress={() => router.back()}
    />
  );

  const statusColors: Record<PaymentHistoryStatus, string> = {
    completed: colors.success,
    pending: colors.borderSecondary,
    failed: colors.danger,
  };

  const statusLabel = (status: PaymentHistoryStatus) => {
    switch (status) {
      case "completed":
        return t("paymentStatusCompleted");
      case "pending":
        return t("paymentStatusPending");
      case "failed":
      default:
        return t("paymentStatusFailed");
    }
  };

  const getTransactionTypeLabel = (type: PaymentHistoryItem["type"]) => {
    switch (type) {
      case "refill":
        return t("refill");
      case "order_application":
        return t("orderApplication");
      case "rejection_refund":
        return t("rejectionRefund");
      case "selection_refund":
        return t("selectionRefund");
      default:
        return t("payment");
    }
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Layout header={header}>
      <ScrollView
        style={{ flex: 1, marginBottom: 4 * Spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Summary */}
          <ResponsiveCard>
            <View style={styles.summaryHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("paymentsSummary")}
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("paymentsOverviewDescription")}
                </Text>
              </View>
            </View>

            <View style={styles.summaryMetrics}>
              <View
                style={[
                  styles.summaryMetric,
                  {
                    backgroundColor: colors.primary + "10",
                    borderColor: colors.primary + "25",
                  },
                ]}
              >
                <View
                  style={[
                    styles.metricIcon,
                    { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <IconSymbol
                    name="creditcard"
                    size={16}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.metricLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("creditBalance")}
                  </Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {(user?.creditBalance || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryActions}>
              <Button
                title={t("refillCredits")}
                variant="primary"
                icon="plus"
                iconSize={14}
                backgroundColor={colors.primary}
                onPress={() => {
                  AnalyticsService.getInstance().logEvent("button_clicked", {
                    button_name: "refill_credits",
                    location: "payments_screen",
                  });
                  router.push("/profile/payment/refill-credits");
                }}
              />
            </View>
          </ResponsiveCard>

          {/* Payment Methods */}
          <ResponsiveCard>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("paymentMethods")}
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("addAndManagePaymentOptions")}
                </Text>
              </View>

              <Button
                title={t("addCreditCard")}
                variant="primary"
                icon="plus"
                iconSize={14}
                backgroundColor={colors.primary}
                onPress={() => router.push("/profile/add-credit-card")}
              />
            </View>

            {creditCards.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol
                  name="creditcard"
                  size={40}
                  color={colors.textSecondary}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {t("noCreditCardsAdded")}
                </Text>
                <Text
                  style={[
                    styles.emptyDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("addCreditCardToMakePayments")}
                </Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {creditCards.map((card) => (
                  <CreditCardItem
                    key={card.id}
                    card={card}
                    isLoading={isLoading}
                    onSetDefault={setDefaultCard}
                    onRemove={removeCreditCard}
                  />
                ))}
              </View>
            )}
          </ResponsiveCard>

          {/* Payment History */}
          <ResponsiveCard>
            <View style={styles.historyHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("paymentHistory")}
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {t("viewPaymentHistory")}
              </Text>
            </View>

            {historyLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={[
                    styles.emptyDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("loadingPaymentHistory")}
                </Text>
              </View>
            ) : historyError ? (
              <View style={styles.emptyState}>
                <IconSymbol
                  name="questionmark.circle.fill"
                  size={40}
                  color={colors.error}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {t("error")}
                </Text>
                <Text
                  style={[
                    styles.emptyDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {historyError}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.retryButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={fetchPaymentHistory}
                >
                  <Text
                    style={[
                      styles.retryButtonText,
                      { color: colors.textInverse },
                    ]}
                  >
                    {t("retry")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : paymentHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol
                  name="clock.arrow.circlepath"
                  size={40}
                  color={colors.textSecondary}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {t("noPaymentHistory")}
                </Text>
                <Text
                  style={[
                    styles.emptyDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("noPaymentHistoryDescription")}
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {paymentHistory.map((item, index) => (
                  <PaymentHistoryCard
                    key={item.id}
                    item={item}
                    index={index}
                    totalLength={paymentHistory.length}
                    statusColors={statusColors}
                    statusLabel={statusLabel}
                    getTransactionTypeLabel={getTransactionTypeLabel}
                    formatDate={formatDate}
                  />
                ))}
              </View>
            )}
          </ResponsiveCard>
        </ResponsiveContainer>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: Spacing.lg,
  },
  summaryMetrics: {
    gap: Spacing.md,
  },
  summaryMetric: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.round,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  summaryActions: {
    flexWrap: "wrap",
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: "center",
    flexWrap: "wrap",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  cardsList: {
    gap: Spacing.md,
  },
  historyHeader: {
    marginBottom: Spacing.md,
  },
  historyList: {
    gap: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
