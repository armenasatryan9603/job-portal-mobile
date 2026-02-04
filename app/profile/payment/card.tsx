import { BorderRadius, Spacing, ThemeColors } from "@/constants/styles";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import AnalyticsService from "@/categories/AnalyticsService";
import type { CreditCard } from "@/types/creditCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";

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

type PaymentHistoryCardProps = {
  item: PaymentHistoryItem;
  index: number;
  totalLength: number;
  statusColors: Record<PaymentHistoryStatus, string>;
  statusLabel: (status: PaymentHistoryStatus) => string;
  getTransactionTypeLabel: (type: PaymentHistoryItem["type"]) => string;
  formatDate: (isoDate: string) => string;
};

export function PaymentHistoryCard({
  item,
  index,
  totalLength,
  statusColors,
  statusLabel,
  getTransactionTypeLabel,
  formatDate,
}: PaymentHistoryCardProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  return (
    <View style={styles.historyRow}>
      <View style={styles.timelineColumn}>
        <View
          style={[
            styles.timelineDot,
            { borderColor: colors.primary, backgroundColor: colors.surface },
          ]}
        />
        {index !== totalLength - 1 && (
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
                  : colors.borderSecondary
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
  );
}

const styles = StyleSheet.create({
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
});

type CreditCardItemProps = {
  card: CreditCard;
  isLoading: boolean;
  onSetDefault: (cardId: string) => Promise<boolean>;
  onRemove: (cardId: string) => Promise<boolean>;
};

export function CreditCardItem({
  card,
  isLoading,
  onSetDefault,
  onRemove,
}: CreditCardItemProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  return (
    <View
      style={[
        styles.cardItem,
        {
          borderColor: colors.border,
          backgroundColor: colors.warningLight,
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
          <Text style={[styles.cardNumber, { color: colors.text }]}>
            •••• •••• •••• {card.cardNumber}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {t("cardEndingIn")} {card.cardNumber}
          </Text>
          {card.isDefault && (
            <View
              style={[
                styles.defaultPill,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <IconSymbol name="star.fill" size={12} color={colors.primary} />
              <Text
                style={[styles.defaultPillText, { color: colors.primary }]}
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
            style={[styles.actionButton, { borderColor: colors.border }]}
            onPress={async () => {
              AnalyticsService.getInstance().logEvent("credit_card_action", {
                action: "set_default",
                card_id: card.id.toString(),
              });
              await onSetDefault(card.id);
            }}
            disabled={isLoading}
          >
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
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
          onPress={async () => {
            AnalyticsService.getInstance().logEvent("credit_card_action", {
              action: "remove",
              card_id: card.id.toString(),
            });
            await onRemove(card.id);
          }}
          disabled={isLoading}
        >
          <Text style={[styles.actionButtonText, { color: colors.error }]}>
            {t("remove")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
