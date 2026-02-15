import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Order } from "@/categories/api";
import { PriceCurrency } from "./PriceCurrency";
import React from "react";
import { ThemeColors } from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useMySubscription } from "@/hooks/useApi";
import { useTranslation } from "@/contexts/TranslationContext";

interface ApplyButtonProps {
  order: Order;
  hasAppliedToOrder?: (orderId: number) => boolean;
  onApply: (order: Order) => void;
  style?: any;
  variant?: "primary" | "secondary" | "outline" | "ghost";
}

export const ApplyButton: React.FC<ApplyButtonProps> = ({
  order,
  hasAppliedToOrder = () => false,
  onApply,
  style,
  variant = "primary",
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { data: subscription } = useMySubscription();

  // Check if user has active subscription
  const hasActiveSubscription =
    subscription &&
    subscription.status === "active" &&
    new Date(subscription.endDate) > new Date();

  // Determine text color based on variant
  const getTextColor = () => {
    switch (variant) {
      case "primary":
        return "#fff";
      case "secondary":
        return colors.textInverse || "#fff";
      case "outline":
      case "ghost":
        return colors.tint;
      default:
        return "#fff";
    }
  };

  const textColor = getTextColor();

  // Don't show button if:
  // - Order is not open
  // - User has already applied
  // - User is the order owner
  if (
    order.status !== "open" ||
    hasAppliedToOrder(order.id) ||
    user?.id === order.clientId
  ) {
    // Show "Applied" button if user has applied
    if (
      hasAppliedToOrder(order.id) &&
      user?.id !== order.clientId &&
      order.status === "open"
    ) {
      return (
        <Button
          style={style}
          onPress={() => {}}
          variant={variant}
          icon="checkmark.circle.fill"
          iconSize={12}
          iconPosition="left"
          disabled={true}
        >
          <Text style={[styles.appliedButtonText, { color: textColor }]}>
            {t("applied")}
          </Text>
        </Button>
      );
    }
    return null;
  }

  return (
    <Button
      style={{ ...style, ...styles.container }}
      onPress={() => onApply(order)}
      variant={variant}
    >
      <View style={styles.applyButtonContent}>
        <Text
          style={[styles.applyButtonText, { color: textColor }]}
          numberOfLines={1}
        >
          {t("apply")}
        </Text>
        {!hasActiveSubscription && order.creditCost && (
          <PriceCurrency
            price={order.creditCost}
            currency={order.currency}
            showOriginal={false}
            showRateUnit={false}
            style={{ ...styles.applyButtonPrice, color: textColor }}
          />
        )}
      </View>
    </Button>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    gap: 10,
  },
  applyButtonContent: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 2,
  },
  applyButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  applyButtonPriceContainer: {
    alignItems: "center",
    gap: 1,
  },
  applyButtonPrice: {
    fontSize: 11,
    fontWeight: "600",
  },
  appliedButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
