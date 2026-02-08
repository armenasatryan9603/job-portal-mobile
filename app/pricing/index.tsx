import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { OrderPricing, apiService } from "@/categories/api";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const formatCurrency = (value: number) => {
  return `$${Math.round(value).toLocaleString()}`;
};

const formatCredits = (value: number) => {
  const { t } = useTranslation();
  return `${Math.round(value).toLocaleString()} ${t("credits")}`;
};

// Format percentage that's already a percentage (e.g., 5.0 -> "5.0%")
const formatPercentDirect = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `${value.toFixed(1)}%`;

// Format decimal as percentage (e.g., 0.5 -> "50%")
const formatPercent = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `${Math.round(value * 100)}%`;

const formatRange = (min: number, max?: number | null) =>
  max
    ? `${formatCurrency(min)} – ${formatCurrency(max)}`
    : `${formatCurrency(min)}+`;

export default function PriceInfoScreen() {
  useAnalytics("Pricing");
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const [pricing, setPricing] = useState<OrderPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPricing = useCallback(async () => {
    setError(null);
    try {
      const data = await apiService.getOrderPricing();
      setPricing(data || []);
    } catch (err: any) {
      setError(err?.message || t("failedToLoadPricing"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  const header = useMemo(
    () => (
      <Header
        title={t("pricingAndFees")}
        subtitle={t("viewOrderPricingDetails")}
        showBackButton
        onBackPress={() => router.back()}
      />
    ),
    [t]
  );

  const renderRow = (label: string, value: string) => (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );

  const content = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            {t("loadingPricing")}
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <IconSymbol
            name="exclamationmark.triangle.fill"
            size={28}
            color={colors.errorVariant}
          />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadPricing}
          >
            <Text style={styles.retryButtonText}>{t("retry")}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!pricing.length) {
      return (
        <View style={styles.centered}>
          <IconSymbol name="tray" size={28} color={colors.textSecondary} />
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            {t("noPricingAvailable")}
          </Text>
        </View>
      );
    }

    return pricing.map((tier) => (
      <ResponsiveCard key={tier.id} style={styles.card}>
        <View style={styles.tierHeader}>
          <View style={styles.tierTitle}>
            <IconSymbol
              name="chart.bar.fill"
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.tierLabel, { color: colors.text }]}>
              {t("budgetRange")}
            </Text>
          </View>
          <Text style={[styles.rangeValue, { color: colors.text }]}>
            {formatRange(tier.minBudget, tier.maxBudget)}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {renderRow(
          t("creditCostIndividual"),
          formatPercentDirect(tier.creditCost)
        )}
        {renderRow(
          t("creditCostTeam"),
          tier.teamCreditCost
            ? formatPercentDirect(tier.teamCreditCost)
            : t("notAvailable")
        )}
        {renderRow(
          t("refundPercentageIndividual"),
          formatPercent(tier.refundPercentage)
        )}
        {renderRow(
          t("refundPercentageTeam"),
          formatPercent(tier.teamRefundPercentage)
        )}
        {renderRow(
          t("description"),
          tier.description ? tier.description : t("notProvided")
        )}
      </ResponsiveCard>
    ));
  };

  return (
    <Layout header={header}>
      <ScrollView
        style={{ marginBottom: 4 * Spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPricing();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <ResponsiveContainer>
          <ResponsiveCard>
            <View style={styles.introHeader}>
              <IconSymbol
                name="info.circle.fill"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.introTitle, { color: colors.text }]}>
                {t("orderPricing")}
              </Text>
            </View>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              {t("orderPricingDescription")}
            </Text>
          </ResponsiveCard>
          {content()}
        </ResponsiveContainer>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  tierHeader: {
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 12,
  },
  tierTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tierLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  rangeValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.lg,
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rowLabel: {
    fontSize: 14,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },
  centered: {
    alignItems: "center",
    padding: Spacing.xl,
    gap: 10,
  },
  introHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
