import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Logo } from "@/components/Logo";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/hooks/useTranslation";

const STORAGE_KEY = "hotwork_app_banner_dismissed";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.jobportalmobile.app";
// Replace the placeholder below with your numeric Apple App Store ID once published.
const APP_STORE_URL = "https://apps.apple.com/app/id6757682263";

type MobileOS = "ios" | "android";

function detectMobileOS(): MobileOS | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null;
}

export const AppDownloadBanner: React.FC = () => {
  
  const [visible, setVisible] = useState(false);
  const [os, setOs] = useState<MobileOS | null>(null);
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();

  useEffect(() => {
    const detected = detectMobileOS();
    if (!detected) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {}
    setOs(detected);
    setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  };

  const openStore = () => {
    Linking.openURL(os === "ios" ? APP_STORE_URL : PLAY_STORE_URL);
  };

  if (!visible || !os) return null;

  const isIos = os === "ios";

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          shadowColor: colors.text,
        },
      ]}
    >
      <View style={styles.left}>
        <View style={[styles.iconWrap, { backgroundColor: "#fff" }]}>
          <Logo size={32} type="short" variant="small" />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.text }]}>HotWork</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isIos
              ? t("downloadOnAppStore", "Download on the App Store")
              : t("getItOnGooglePlay", "Get it on Google Play")}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={openStore}
        activeOpacity={0.8}
        style={[styles.downloadBtn, { backgroundColor: colors.tint }]}
      >
        <IconSymbol
          name={isIos ? "apple.logo" : "arrow.down.circle.fill"}
          size={14}
          color={colors.textInverse}
        />
        <Text style={[styles.downloadBtnText, { color: colors.textInverse }]}>
          {isIos ? t("appStore", "App Store") : t("playStore", "Play Store")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={dismiss}
        activeOpacity={0.7}
        style={styles.closeBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <IconSymbol name="xmark" size={14} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
    gap: 10,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexShrink: 0,
  },
  downloadBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  closeBtn: {
    padding: 4,
    flexShrink: 0,
  },
});
