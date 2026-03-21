import { BorderRadius, Shadows, Spacing, ThemeColors } from "@/constants/styles";
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
  cardWrapper: {
    gap: Spacing.md,
  },
  cardFaceContainer: {
    position: "relative",
  },
  cardFace: {
    backgroundColor: "#0B2E45",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    overflow: "hidden",
    minHeight: 180,
    ...Shadows.lg,
  },
  cardDecorCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -70,
    right: -50,
  },
  cardDecorCircle2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(10,126,164,0.25)",
    bottom: -60,
    left: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  cardBrandText: {
    fontSize: 15,
    fontWeight: "800",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  cardDefaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(250,204,21,0.18)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.35)",
  },
  cardDefaultBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FACC15",
  },
  cardRemoveBtn: {
    position: "absolute",
    top: -10,
    right: -10,
    width: 28,
    height: 28,
    borderRadius: BorderRadius.round,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.md,
    zIndex: 10,
  },
  cardChip: {
    width: 38,
    height: 28,
    backgroundColor: "#D4A537",
    borderRadius: 5,
    marginBottom: Spacing.xl,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  cardChipLine: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  cardChipLineV: {
    position: "absolute",
    width: 1,
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  cardNumberText: {
    fontSize: 19,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 2.5,
    marginBottom: Spacing.md,
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardMetaRight: {
    alignItems: "flex-end",
  },
  cardMetaLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  cardMetaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
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
    <View style={styles.cardWrapper}>
      {/* Card face */}
      <View style={styles.cardFaceContainer}>
      <View style={styles.cardFace}>
        <View style={styles.cardDecorCircle1} />
        <View style={styles.cardDecorCircle2} />

        <View style={styles.cardTopRow}>
          <Text style={styles.cardBrandText}>
            {card.cardType.toUpperCase()}
          </Text>
          {card.isDefault && (
            <View style={styles.cardDefaultBadge}>
              <IconSymbol name="star.fill" size={10} color="#FACC15" />
              <Text style={styles.cardDefaultBadgeText}>{t("default")}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardChip}>
          <View style={[styles.cardChipLine, { top: "33%" }]} />
          <View style={[styles.cardChipLine, { top: "66%" }]} />
          <View style={[styles.cardChipLineV, { left: "33%" }]} />
          <View style={[styles.cardChipLineV, { left: "66%" }]} />
        </View>

        <Text style={styles.cardNumberText}>
          •••• •••• •••• {card.cardNumber.slice(-4)}
        </Text>

        <View style={styles.cardBottomRow}>
          <View>
            <Text style={styles.cardMetaLabel}>{t("cardHolder") || "Card Holder"}</Text>
            <Text style={styles.cardMetaValue}>
              {card.cardholderName || "—"}
            </Text>
          </View>
          <View style={styles.cardMetaRight}>
            <Text style={styles.cardMetaLabel}>{t("expires") || "Expires"}</Text>
            <Text style={styles.cardMetaValue}>
              {card.expiryMonth}/{card.expiryYear.slice(-2)}
            </Text>
          </View>
        </View>
      </View>

        <TouchableOpacity
          style={styles.cardRemoveBtn}
          onPress={async () => {
            AnalyticsService.getInstance().logEvent("credit_card_action", {
              action: "remove",
              card_id: card.id.toString(),
            });
            await onRemove(card.id);
          }}
          disabled={isLoading}
        >
          <IconSymbol name="xmark" size={11} color="#fff" />
        </TouchableOpacity>
      </View>

      {!card.isDefault && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.primary + "12",
              borderColor: colors.primary + "35",
            },
          ]}
          onPress={async () => {
            AnalyticsService.getInstance().logEvent("credit_card_action", {
              action: "set_default",
              card_id: card.id.toString(),
            });
            await onSetDefault(card.id);
          }}
          disabled={isLoading}
        >
          <IconSymbol name="star" size={14} color={colors.primary} />
          <Text style={[styles.actionButtonText, { color: colors.primary }]}>
            {t("setDefault")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
