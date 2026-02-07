import {
  Alert,
  Animated,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { FooterTabs } from "@/components/FooterTabs";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Logo } from "./Logo";
import React from "react";
import { ThemeColors } from "@/constants/styles";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useModal } from "@/contexts/ModalContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "@/hooks/useTranslation";

interface LayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  backgroundColor?: string;
  padding?: number;
  showSidebar?: boolean;
  showFooterTabs?: boolean;
  onLogout?: () => void;
}

const { height } = Dimensions.get("window");

export const Layout: React.FC<LayoutProps> = ({
  children,
  header,
  footer,
  backgroundColor,
  padding = 0,
  showSidebar = true,
  showFooterTabs = true,
  onLogout,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const bgColor = backgroundColor || colors.background;
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const { showLoginModal } = useModal();

  const {
    sidebarVisible,
    closeSidebar,
    navigateToProfile,
    navigateToSettings,
    navigateToMyOrders,
    navigateToMyJobs,
    navigateToCalendar,
    navigateToSavedOrders,
    navigateToHelp,
    navigateToServices,
  } = useNavigation();
  const sidebarAnimation = React.useState(new Animated.Value(-280))[0];
  const sidebarOpacity = React.useState(new Animated.Value(0))[0];
  const [imageError, setImageError] = React.useState(false);
  
  // Handle sidebar animation when visibility changes
  React.useEffect(() => {
    if (sidebarVisible) {
      Animated.parallel([
        Animated.timing(sidebarAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(sidebarOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sidebarAnimation, {
          toValue: -280,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(sidebarOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [sidebarVisible]);

  const handleLogout = async () => {
    closeSidebar();

    // If onLogout callback is provided, use it (it should handle confirmation)
    // Otherwise, show confirmation here
    if (onLogout) {
      onLogout();
    } else {
      // Show confirmation popup before logout
      Alert.alert(t("logout"), t("areYouSure"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("logout"),
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error("Error during logout:", error);
            }
          },
        },
      ]);
    }
  };

  // Reset image error when user changes
  React.useEffect(() => {
    setImageError(false);
  }, [user?.avatarUrl]);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={bgColor}
        translucent={false}
      />

      {/* Sidebar Overlay */}
      {sidebarVisible && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeSidebar}
        />
      )}

      {/* Sidebar */}
      {showSidebar && (
        <Animated.View
          style={[
            styles.sidebar,
            {
              backgroundColor: colors.background,
              borderRightColor: colors.border,
              transform: [{ translateX: sidebarAnimation }],
              opacity: sidebarOpacity,
              pointerEvents: sidebarVisible ? "auto" : "none",
            },
          ]}
        >
          {/* Logo Section */}
          <View
            style={[
              styles.logoSection,
              { paddingTop: insets.top - 8, borderBottomColor: colors.border },
            ]}
          >
            <Logo
              size={33}
              type="full"
              onPress={() => {
                closeSidebar();
                router.push("/");
              }}
              style={styles.sidebarLogo}
            />
          </View>

          {/* User Profile Section */}
          <TouchableOpacity
            style={[styles.userSection, { borderBottomColor: colors.border }]}
            onPress={isAuthenticated ? navigateToProfile : showLoginModal}
          >
            <View style={styles.userInfo}>
              {isAuthenticated ? (
                <>
                  <View
                    style={[styles.avatar, { backgroundColor: colors.tint }]}
                  >
                    {user?.avatarUrl && !imageError ? (
                      <Image
                        key={`avatar-${user.id}-${user.avatarUrl}`}
                        source={{
                          uri: user.avatarUrl,
                          cache: "default",
                        }}
                        style={styles.avatarImage}
                        onError={handleImageError}
                        onLoad={() => {
                          console.log(
                            "Layout - Avatar image loaded successfully:",
                            user.avatarUrl
                          );
                          setImageError(false);
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <IconSymbol
                        name="person.fill"
                        size={24}
                        color={colors.background}
                      />
                    )}
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={[styles.userName, { color: colors.text }]}>
                      {user ? user.name : t("welcome")}
                    </Text>
                    <Text
                      style={[
                        styles.userPhone,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {user ? user.phone || t("viewProfile") : t("viewProfile")}
                    </Text>
                  </View>
                  <IconSymbol
                    name="chevron.right"
                    size={16}
                    color={colors.tabIconDefault}
                  />
                </>
              ) : (
                <>
                  <View
                    style={[styles.guestIcon, { backgroundColor: colors.tint }]}
                  >
                    <IconSymbol
                      name="person.badge.plus"
                      size={24}
                      color={colors.background}
                    />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={[styles.userName, { color: colors.text }]}>
                      {t("guest")}
                    </Text>
                    <Text
                      style={[
                        styles.userPhone,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {t("login")}
                    </Text>
                  </View>
                  <IconSymbol
                    name="person.badge.plus"
                    size={16}
                    color={colors.tabIconDefault}
                  />
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={navigateToSettings}
            >
              <IconSymbol name="gearshape.fill" size={20} color={colors.tint} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                {t("settings")}
              </Text>
            </TouchableOpacity>
            {isAuthenticated ? (
              <>
                {/* Authenticated User Menu */}

                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={navigateToServices}
                >
                  <IconSymbol
                    name="building.2.fill"
                    size={20}
                    color={colors.tint}
                  />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>
                    {t("myServices")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={navigateToMyOrders}
                >
                  <IconSymbol
                    name="doc.text.fill"
                    size={20}
                    color={colors.tint}
                  />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>
                    {t("myOrders")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={navigateToMyJobs}
                >
                  <IconSymbol
                    name="briefcase.fill"
                    size={20}
                    color={colors.tint}
                  />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>
                    {t("myJobs")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={navigateToCalendar}
                >
                  <IconSymbol name="calendar" size={20} color={colors.tint} />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>
                    {t("calendar")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={navigateToSavedOrders}
                >
                  <IconSymbol
                    name="bookmark.fill"
                    size={20}
                    color={colors.tint}
                  />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>
                    {t("savedOrders")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={navigateToHelp}
                >
                  <IconSymbol
                    name="questionmark.circle.fill"
                    size={20}
                    color={colors.tint}
                  />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>
                    {t("helpAndSupport")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    { borderBottomColor: "transparent" },
                  ]}
                  onPress={handleLogout}
                >
                  <IconSymbol
                    name="rectangle.portrait.and.arrow.right"
                    size={20}
                    color={colors.danger}
                  />
                  <Text style={[styles.menuItemText, { color: colors.danger }]}>
                    {t("logout")}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Guest User Menu */}
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={showLoginModal}
                >
                  <IconSymbol
                    name="person.badge.plus"
                    size={20}
                    color={colors.tint}
                  />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>
                    {t("getStarted")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={navigateToHelp}
                >
                  <IconSymbol
                    name="questionmark.circle.fill"
                    size={20}
                    color={colors.tint}
                  />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>
                    {t("helpAndSupport")}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      )}

      {/* Header */}
      {header && (
        <View
          style={[
            {
              backgroundColor: bgColor,
              paddingTop: insets.top - 10,
            },
          ]}
        >
          {header}
        </View>
      )}

      {/* Body */}
      <View style={[styles.body, { backgroundColor: bgColor, padding }]}>
        {children}
      </View>

      {/* Footer */}
      {footer && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: bgColor,
            },
          ]}
        >
          {footer}
        </View>
      )}

      {/* Footer Tabs */}
      {showFooterTabs && <FooterTabs />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
    minHeight: height * 0.6, // Ensure body takes at least 60% of screen height
  },
  footer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  // Sidebar styles
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 998,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 280,
    height: "100%",
    borderRightWidth: 1,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  logoSection: {
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  sidebarLogo: {
    marginHorizontal: 8,
  },
  userSection: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  guestIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
  },
  menuItems: {
    gap: 0,
  },
  menuItem: {
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
