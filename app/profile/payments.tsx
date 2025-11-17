import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Spacing, ThemeColors } from "@/constants/styles";
import { useCreditCard } from "@/contexts/CreditCardContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { apiService } from "@/services/api";

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
    completed: "#4CAF50",
    pending: "#FFA500",
    failed: "#FF6B6B",
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

              <View
                style={[
                  styles.summaryMetric,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.metricIcon,
                    { backgroundColor: colors.tint + "10" },
                  ]}
                >
                  <IconSymbol
                    name="wallet.pass"
                    size={16}
                    color={colors.tint}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.metricLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("paymentMethods")}
                  </Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {creditCards.length}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryActions}>
              <TouchableOpacity
                style={[
                  styles.summaryActionButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => router.push("/profile/refill-credits")}
              >
                <IconSymbol name="plus" size={14} color={colors.textInverse} />
                <Text
                  style={[
                    styles.summaryActionText,
                    { color: colors.textInverse },
                  ]}
                >
                  {t("refillCredits")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.summaryActionButton,
                  {
                    borderColor: colors.border,
                    borderWidth: 1,
                    backgroundColor: colors.surface,
                  },
                ]}
                onPress={() => router.push("/profile/add-credit-card")}
              >
                <IconSymbol
                  name="creditcard.fill"
                  size={14}
                  color={colors.text}
                />
                <Text
                  style={[styles.summaryActionText, { color: colors.text }]}
                >
                  {t("addCreditCard")}
                </Text>
              </TouchableOpacity>
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
              <TouchableOpacity
                style={[
                  styles.addCardButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => router.push("/profile/add-credit-card")}
              >
                <IconSymbol name="plus" size={16} color={colors.textInverse} />
                <Text
                  style={[
                    styles.addCardButtonText,
                    { color: colors.textInverse },
                  ]}
                >
                  {t("addCreditCard")}
                </Text>
              </TouchableOpacity>
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
                  <View
                    key={card.id}
                    style={[
                      styles.cardItem,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                  >
                    <View style={styles.cardInfo}>
                      <View
                        style={[
                          styles.cardIcon,
                          { backgroundColor: colors.primary + "20" },
                        ]}
                      >
                        <IconSymbol
                          name="creditcard.fill"
                          size={20}
                          color={colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.cardNumber, { color: colors.text }]}
                        >
                          •••• •••• •••• {card.cardNumber}
                        </Text>
                        <Text
                          style={[
                            styles.cardMeta,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("cardEndingIn")} {card.cardNumber}
                        </Text>
                        {card.isDefault && (
                          <View
                            style={[
                              styles.defaultPill,
                              { backgroundColor: colors.primary + "15" },
                            ]}
                          >
                            <IconSymbol
                              name="star.fill"
                              size={12}
                              color={colors.primary}
                            />
                            <Text
                              style={[
                                styles.defaultPillText,
                                { color: colors.primary },
                              ]}
                            >
                              {t("default")}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      {!card.isDefault && (
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            { borderColor: colors.border },
                          ]}
                          onPress={() => setDefaultCard(card.id)}
                          disabled={isLoading}
                        >
                          <Text
                            style={[
                              styles.actionButtonText,
                              { color: colors.text },
                            ]}
                          >
                            {t("setDefault")}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.removeButton,
                          { borderColor: colors.error },
                        ]}
                        onPress={() => removeCreditCard(card.id)}
                        disabled={isLoading}
                      >
                        <Text
                          style={[
                            styles.actionButtonText,
                            { color: colors.error },
                          ]}
                        >
                          {t("remove")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
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
                  <View key={item.id} style={styles.historyRow}>
                    <View style={styles.timelineColumn}>
                      <View
                        style={[
                          styles.timelineDot,
                          { borderColor: colors.primary },
                        ]}
                      />
                      {index !== paymentHistory.length - 1 && (
                        <View
                          style={[
                            styles.timelineLine,
                            { backgroundColor: colors.border },
                          ]}
                        />
                      )}
                    </View>
                    <View
                      style={[
                        styles.historyCard,
                        { borderColor: colors.border },
                      ]}
                    >
                      <View style={styles.historyCardHeader}>
                        <View style={styles.historyLabel}>
                          <IconSymbol
                            name={
                              item.type === "refill" ||
                              item.type === "rejection_refund" ||
                              item.type === "selection_refund"
                                ? "arrow.down.circle"
                                : "arrow.up.circle"
                            }
                            size={16}
                            color={
                              item.type === "refill" ||
                              item.type === "rejection_refund" ||
                              item.type === "selection_refund"
                                ? colors.primary
                                : "#FFA500"
                            }
                          />
                          <Text
                            style={[
                              styles.historyTitle,
                              { color: colors.text },
                            ]}
                          >
                            {getTransactionTypeLabel(item.type)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor: statusColors[item.status] + "15",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              { color: statusColors[item.status] },
                            ]}
                          >
                            {statusLabel(item.status)}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[styles.historyAmount, { color: colors.text }]}
                      >
                        {item.type === "refill" ||
                        item.type === "rejection_refund" ||
                        item.type === "selection_refund"
                          ? "+"
                          : "-"}
                        {item.amount} {item.currency}
                      </Text>
                      {item.description && (
                        <Text
                          style={[
                            styles.historySubtitle,
                            { color: colors.textSecondary, marginTop: 4 },
                          ]}
                        >
                          {item.description}
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.historySubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {item.method} · {formatDate(item.createdAt)}
                      </Text>
                      {item.reference && (
                        <Text
                          style={[
                            styles.historyReference,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("paymentReference")}: {item.reference}
                        </Text>
                      )}
                    </View>
                  </View>
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
    fontSize: 20,
    fontWeight: "700",
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
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  summaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    flex: 1,
  },
  summaryActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: "center",
    flexWrap: "wrap",
  },
  addCardButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
    marginTop: Spacing.sm,
  },
  addCardButtonText: {
    fontWeight: "600",
    fontSize: 14,
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
  cardItem: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: "600",
  },
  defaultPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
    marginTop: Spacing.sm,
  },
  defaultPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardMeta: {
    fontSize: 13,
  },
  cardActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  removeButton: {
    borderStyle: "dashed",
  },
  historyHeader: {
    marginBottom: Spacing.md,
  },
  historyList: {
    gap: Spacing.lg,
  },
  historyRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  timelineColumn: {
    width: 18,
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderWidth: 2,
    borderRadius: 6,
    backgroundColor: "white",
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginTop: 2,
  },
  historyCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  historyCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  historyLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  historySubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  historyReference: {
    fontSize: 12,
    marginTop: 4,
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusPill: {
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
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
