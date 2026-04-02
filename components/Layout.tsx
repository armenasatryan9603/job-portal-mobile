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
  useWindowDimensions,
} from "react-native";
import { Spacing, ThemeColors } from "@/constants/styles";

import { AdBanner } from "@/components/adBanner/AdBanner";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Logo } from "./Logo";
import { MainTabs } from "@/components/MainTabs";
import React from "react";
import { WEB_MAIN_CONTENT_MAX_WIDTH } from "@/constants/layout";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useIsWeb } from "@/utils/isWeb";
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
  showMainTabs?: boolean;
  onLogout?: () => void;
  /** Web: max width of the main column (header/body/footer). Default from `WEB_MAIN_CONTENT_MAX_WIDTH`. */
  maxContentWidth?: number;
}

const { height } = Dimensions.get("window");
const SIDE_ADS_MIN_VIEWPORT_WIDTH = 1024;

export const Layout: React.FC<LayoutProps> = ({
  children,
  header,
  footer,
  backgroundColor,
  padding = 0,
  showSidebar = true,
  showMainTabs = true,
  onLogout,
  maxContentWidth,
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
    openSidebar,
    closeSidebar,
    navigateTo,
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

  const sidebarWidth = 280;
  const sidebarCollapsedWidthWeb = 72;
  const isWeb = useIsWeb();
  const { width: viewportWidth } = useWindowDimensions();
  const showSideAds = isWeb && viewportWidth >= SIDE_ADS_MIN_VIEWPORT_WIDTH;
  /** Web: collapsed = icon rail; expanded = full drawer. Native: boolean is open/closed overlay. */
  const webSidebarCollapsed = isWeb && showSidebar && !sidebarVisible;
  const webMainInsetLeft =
    isWeb && showSidebar
      ? padding +
        (sidebarVisible ? sidebarWidth : sidebarCollapsedWidthWeb)
      : padding;

  const webMainMaxWidth =
    maxContentWidth ?? WEB_MAIN_CONTENT_MAX_WIDTH;
  /** Centered capped width (web); full width on native. No flex — use for header/footer. */
  const webMainColumnStyle = isWeb
    ? {
        maxWidth: webMainMaxWidth,
        width: "100%" as const,
        alignSelf: "center" as const,
      }
    : { width: "100%" as const };
  /** Main column + flex so body fills remaining height. */
  const webBodyInnerStyle = [
    webMainColumnStyle,
    { flex: 1, alignSelf: "stretch" as const },
  ];

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {showMainTabs && (
        <MainTabs
          contentInsetLeft={isWeb && showSidebar ? webMainInsetLeft : 0}
          contentMaxWidth={isWeb ? webMainMaxWidth : undefined}
        />
      )}
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={bgColor}
        translucent={false}
      />


      {/* Overlay when drawer is open: native + narrow web (desktop web has no dimmed backdrop) */}
      {sidebarVisible && !isWeb && (
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
              width:
                isWeb && showSidebar
                  ? sidebarVisible
                    ? sidebarWidth
                    : sidebarCollapsedWidthWeb
                  : sidebarWidth,
              backgroundColor: colors.background,
              borderRightColor: colors.border,
              transform: [{ translateX: isWeb ? 0 : sidebarAnimation }],
              opacity: isWeb ? 1 : sidebarOpacity,
              pointerEvents: isWeb
                ? "auto"
                : sidebarVisible
                  ? "auto"
                  : "none",
            },
          ]}
        >
          {/* Logo Section */}
          <View
            style={[
              styles.logoSection,
              {
                paddingTop: insets.top - 8,
                borderBottomColor: colors.border,
              },
              webSidebarCollapsed && styles.logoSectionCollapsedWeb,
            ]}
          >
            {webSidebarCollapsed ? (
              <Logo
                size={40}
                type="short"
                variant="small"
                onPress={() => {
                  openSidebar();
                  router.push("/");
                }}
                style={{ alignSelf: "center", height: 44 }}
              />
            ) : (
              <View style={{ backgroundColor: '#fff', borderRadius: 4 }}>
                <Logo
                  size={44}
                  type="full"
                  onPress={() => {
                    closeSidebar();
                    router.push("/");
                  }}
                  style={styles.sidebarLogo}
                />
              </View>
            )}
          </View>

          {/* User Profile Section */}
          <TouchableOpacity
            style={[
              styles.userSection,
              { borderBottomColor: colors.border },
              webSidebarCollapsed && styles.userSectionCollapsedWeb,
            ]}
            onPress={isAuthenticated ? () => navigateTo("/profile/profile") : showLoginModal}
          >
            <View
              style={[
                styles.userInfo,
                webSidebarCollapsed && styles.userInfoCollapsedWeb,
              ]}
            >
              {isAuthenticated ? (
                <>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: colors.tint },
                      webSidebarCollapsed && styles.avatarCollapsedWeb,
                    ]}
                  >
                    {user?.avatarUrl && !imageError ? (
                      <Image
                        key={`avatar-${user?.id ?? "guest"}-${user?.avatarUrl ?? ""}`}
                        source={{
                          uri: user.avatarUrl,
                          cache: "default",
                        }}
                        style={[
                          styles.avatarImage,
                          webSidebarCollapsed && styles.avatarImageCollapsedWeb,
                        ]}
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
                        size={webSidebarCollapsed ? 20 : 24}
                        color={colors.background}
                      />
                    )}
                  </View>
                  {!webSidebarCollapsed && (
                    <>
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
                          {user
                            ? user.phone || t("viewProfile")
                            : t("viewProfile")}
                        </Text>
                      </View>
                      <IconSymbol
                        name="chevron.right"
                        size={16}
                        color={colors.tabIconDefault}
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  <View
                    style={[
                      styles.guestIcon,
                      { backgroundColor: colors.tint },
                      webSidebarCollapsed && styles.avatarCollapsedWeb,
                    ]}
                  >
                    <IconSymbol
                      name="person.badge.plus"
                      size={webSidebarCollapsed ? 20 : 24}
                      color={colors.background}
                    />
                  </View>
                  {!webSidebarCollapsed && (
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
                  )}
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {isAuthenticated ? (
              <>
                {/* Authenticated User Menu */}
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    webSidebarCollapsed && styles.menuItemCollapsedWeb,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => navigateTo("/calendar")}
                >
                  <IconSymbol
                    name="calendar"
                    size={webSidebarCollapsed ? 22 : 20}
                    color={colors.tint}
                  />
                  {!webSidebarCollapsed && (
                    <Text style={[styles.menuItemText, { color: colors.text }]}>
                      {t("calendar")}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    webSidebarCollapsed && styles.menuItemCollapsedWeb,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => navigateTo("/services?myServices=true")}
                >
                  <IconSymbol
                    name="building.2.fill"
                    size={webSidebarCollapsed ? 22 : 20}
                    color={colors.tint}
                  />
                  {!webSidebarCollapsed && (
                    <Text style={[styles.menuItemText, { color: colors.text }]}>
                      {t("myServices")}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    webSidebarCollapsed && styles.menuItemCollapsedWeb,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => navigateTo("/orders?myOrders=true")}
                >
                  <IconSymbol
                    name="doc.text.fill"
                    size={webSidebarCollapsed ? 22 : 20}
                    color={colors.tint}
                  />
                  {!webSidebarCollapsed && (
                    <Text style={[styles.menuItemText, { color: colors.text }]}>
                      {t("myOrders")}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    webSidebarCollapsed && styles.menuItemCollapsedWeb,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => navigateTo("/orders?myJobs=true")}
                >
                  <IconSymbol
                    name="briefcase.fill"
                    size={webSidebarCollapsed ? 22 : 20}
                    color={colors.tint}
                  />
                  {!webSidebarCollapsed && (
                    <Text style={[styles.menuItemText, { color: colors.text }]}>
                      {t("myJobs")}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    webSidebarCollapsed && styles.menuItemCollapsedWeb,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => navigateTo("/orders?saved=true")}
                >
                  <IconSymbol
                    name="bookmark.fill"
                    size={webSidebarCollapsed ? 22 : 20}
                    color={colors.tint}
                  />
                  {!webSidebarCollapsed && (
                    <Text style={[styles.menuItemText, { color: colors.text }]}>
                      {t("savedOrders")}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Guest User Menu */}
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    webSidebarCollapsed && styles.menuItemCollapsedWeb,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={showLoginModal}
                >
                  <IconSymbol
                    name="person.badge.plus"
                    size={webSidebarCollapsed ? 22 : 20}
                    color={colors.tint}
                  />
                  {!webSidebarCollapsed && (
                    <Text style={[styles.menuItemText, { color: colors.text }]}>
                      {t("getStarted")}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={[
                styles.menuItem,
                webSidebarCollapsed && styles.menuItemCollapsedWeb,
                { borderBottomColor: colors.border },
              ]}
              onPress={() => navigateTo("/profile/settings")}
            >
              <IconSymbol
                name="gearshape.fill"
                size={webSidebarCollapsed ? 22 : 20}
                color={colors.tint}
              />
              {!webSidebarCollapsed && (
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  {t("settings")}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.menuItem,
                webSidebarCollapsed && styles.menuItemCollapsedWeb,
                { borderBottomColor: colors.border },
              ]}
              onPress={() => navigateTo("/profile/help")}
            >
              <IconSymbol
                name="questionmark.circle.fill"
                size={webSidebarCollapsed ? 22 : 20}
                color={colors.tint}
              />
              {!webSidebarCollapsed && (
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  {t("helpAndSupport")}
                </Text>
              )}
            </TouchableOpacity>
            {isAuthenticated && (
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  webSidebarCollapsed && styles.menuItemCollapsedWeb,
                  { borderBottomColor: "transparent" },
                ]}
                onPress={handleLogout}
              >
                <IconSymbol
                  name="rectangle.portrait.and.arrow.right"
                  size={webSidebarCollapsed ? 22 : 20}
                  color={colors.danger}
                />
                {!webSidebarCollapsed && (
                  <Text style={[styles.menuItemText, { color: colors.danger }]}>
                    {t("logout")}
                  </Text>
                )}
              </TouchableOpacity>
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
              paddingLeft: webMainInsetLeft,
            },
          ]}
        >
          <View style={webMainColumnStyle}>{header}</View>
        </View>
      )}

      {/* Body */}
      <View
        style={[
          styles.body,
          {
            backgroundColor: bgColor,
            padding,
            paddingLeft: webMainInsetLeft,
          },
          isWeb && styles.bodyWeb,
        ]}
      >
        {showSideAds && (
          <View
            style={[
              styles.sideAdColumn,
              { position: "sticky" as any, top: 80 },
            ]}
          >
            <AdBanner />
          </View>
        )}
        <View style={webBodyInnerStyle}>{children}</View>
        {showSideAds && (
          <View
            style={[
              styles.sideAdColumn,
              { position: "sticky" as any, top: 80 },
            ]}
          >
            <AdBanner />
          </View>
        )}
      </View>

      {/* Footer */}
      {footer && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: bgColor,
              paddingLeft: webMainInsetLeft,
            },
          ]}
        >
          <View style={webMainColumnStyle}>{footer}</View>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
    minHeight: height * 0.6,
  },
  bodyWeb: {
    flexDirection: "row" as const,
  },
  sideAdColumn: {
    width: 300,
    paddingTop: Spacing.xl,
    alignItems: "center" as const,
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
  /** Web collapsed sidebar (icon rail) */
  logoSectionCollapsedWeb: {
    alignItems: "center",
    paddingHorizontal: 4,
  },
  userSectionCollapsedWeb: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  userInfoCollapsedWeb: {
    justifyContent: "center",
    gap: 0,
  },
  avatarCollapsedWeb: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarImageCollapsedWeb: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  menuItemCollapsedWeb: {
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingVertical: 14,
    gap: 0,
  },
});
