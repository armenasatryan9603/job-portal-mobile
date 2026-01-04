import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Text,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/styles";

interface PaymentWebViewProps {
  visible: boolean;
  paymentUrl: string | null;
  paymentHtml?: string; // For HTML form responses
  onClose: () => void;
  onSuccess?: () => void;
  onFailure?: (error: string) => void;
}

export const PaymentWebView: React.FC<PaymentWebViewProps> = ({
  visible,
  paymentUrl,
  paymentHtml,
  onClose,
  onSuccess,
  onFailure,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible && (paymentUrl || paymentHtml)) {
      handleOpenBrowser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, paymentUrl, paymentHtml]);

  const handleOpenBrowser = async () => {
    if (!paymentUrl && !paymentHtml) {
      onFailure?.("Payment URL not available");
      return;
    }

    setLoading(true);
    try {
      // If we have HTML form, we need to handle it differently
      // For now, if we only have HTML, show an error
      if (!paymentUrl && paymentHtml) {
        console.error("HTML form payment not yet supported in browser mode");
        onFailure?.("HTML form payment requires WebView. Please contact support.");
        onClose();
        setLoading(false);
        return;
      }

      // Open payment URL in system browser
      const result = await WebBrowser.openBrowserAsync(paymentUrl!, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: colors.tint,
        toolbarColor: colors.surface,
      });

      // Check result type
      if (result.type === "cancel") {
        // User cancelled
        onFailure?.(t("paymentCancelled"));
        onClose();
      } else if (result.type === "dismiss") {
        // Browser was dismissed
        onClose();
      } else {
        // Check URL for success/failure indicators
        const url = result.url?.toLowerCase() || "";
        
        if (
          url.includes("success") ||
          url.includes("approved") ||
          url.includes("completed") ||
          url.includes("payment-success")
        ) {
          onSuccess?.();
        } else if (
          url.includes("fail") ||
          url.includes("error") ||
          url.includes("declined") ||
          url.includes("cancelled") ||
          url.includes("payment-fail")
        ) {
          onFailure?.(t("paymentCancelledOrFailed"));
        }
        
        onClose();
      }
    } catch (error: any) {
      console.error("Error opening browser:", error);
      onFailure?.(error.message || t("failedToOpenPaymentPage"));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!visible) {
    return null;
  }

  // Show loading modal while opening browser
  return (
    <Modal
      visible={visible && loading}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.loadingOverlay}>
        <View
          style={[
            styles.loadingCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t("loadingPayment")}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 200,
    ...Shadows.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    fontWeight: "500",
  },
});

