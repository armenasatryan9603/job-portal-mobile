import * as WebBrowser from "expo-web-browser";

import { ActivityIndicator, Linking, Modal, StyleSheet, Text, View } from "react-native";
import { BorderRadius, Shadows, Spacing } from "@/constants/styles";
import React, { useRef, useState } from "react";

import { ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";

interface PaymentWebViewProps {
  visible: boolean;
  paymentUrl: string | null;
  onClose: () => void;
  onSuccess?: () => void;
  onFailure?: (error: string) => void;
}

// Deep-link paths that signal payment outcome
const SUCCESS_SIGNAL = "refillStatus=success";
const FAILURE_SIGNAL = "refillStatus=error";

export const PaymentWebView: React.FC<PaymentWebViewProps> = ({
  visible,
  paymentUrl,
  onClose,
  onSuccess,
  onFailure,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const [loading, setLoading] = useState(false);
  // Prevents double-firing when dismissBrowser() also resolves openBrowserAsync.
  const handled = useRef(false);

  React.useEffect(() => {
    if (visible && paymentUrl) {
      handleOpenBrowser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, paymentUrl]);

  const handleOpenBrowser = async () => {
    if (!paymentUrl) {
      onFailure?.("Payment URL not available");
      return;
    }

    handled.current = false;
    setLoading(true);

    // Listen for the deep link that FastBank redirects to after payment.
    // The backend processes the result and redirects to:
    //   jobportalmobile://refill?status=success  or
    //   jobportalmobile://refill?status=error
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (handled.current) return;
      handled.current = true;
      subscription.remove();
      // Dismiss the in-app browser — this also causes openBrowserAsync to resolve,
      // but the handled flag prevents that branch from running again.
      WebBrowser.dismissBrowser();

      if (url.includes(SUCCESS_SIGNAL)) {
        onSuccess?.();
      } else if (url.includes(FAILURE_SIGNAL)) {
        // Backend encodes the actual error reason as ?errorDetail=...
        let detail = "Payment was not completed.";
        try {
          const match = url.match(/[?&]errorDetail=([^&]*)/);
          if (match) detail = decodeURIComponent(match[1]);
        } catch { /* ignore */ }
        onFailure?.(detail);
      }
      // Do NOT call onClose here — the success/failure callbacks own cleanup.
      // onClose is only for manual cancellation (browser closed without a deep link).
    });

    try {
      await WebBrowser.openBrowserAsync(paymentUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: colors.tint,
        toolbarColor: colors.surface,
      });

      // Browser closed without a deep-link redirect (user cancelled manually).
      if (!handled.current) {
        handled.current = true;
        subscription.remove();
        onClose();
      }
    } catch (error: any) {
      if (!handled.current) {
        handled.current = true;
        subscription.remove();
        onFailure?.(error.message || t("failedToOpenPaymentPage"));
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible && loading}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.text, { color: colors.text }]}>
            {t("loadingPayment")}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 200,
    ...Shadows.lg,
  },
  text: {
    marginTop: Spacing.md,
    fontSize: 16,
    fontWeight: "500",
  },
});
