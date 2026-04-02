import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { RelativePathString, router } from "expo-router";
import { isWeb, useIsWeb } from "@/utils/isWeb";

import { Platform } from "react-native";

interface NavigationContextType {
  // Sidebar state
  sidebarVisible: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;

  // Back navigation
  goBack: () => void;
  canGoBack: boolean;

  // Navigation helpers
  navigateTo: (route: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
}) => {
  const wideWeb = useIsWeb();
  // Desktop-width web: sidebar column open by default. Native / narrow web: drawer closed.
  const [sidebarVisible, setSidebarVisible] = useState(() => isWeb());

  useEffect(() => {
    if (Platform.OS !== "web") return;
    setSidebarVisible(wideWeb);
  }, [wideWeb]);

  const openSidebar = () => {
    setSidebarVisible(true);
  };

  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  const toggleSidebar = () => {
    setSidebarVisible((prev) => !prev);
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const canGoBack = router.canGoBack();

  const navigateTo = (route: string) => {
    if (!wideWeb) {
      closeSidebar();
    }
    router.push(route as RelativePathString);
  };

  const value: NavigationContextType = {
    sidebarVisible,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    goBack,
    canGoBack,
    navigateTo,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
};
