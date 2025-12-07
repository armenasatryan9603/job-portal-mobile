import { RelativePathString, router } from "expo-router";
import React, { createContext, ReactNode, useContext, useState } from "react";

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
  navigateToProfile: () => void;
  navigateToSettings: () => void;
  navigateToMyOrders: () => void;
  navigateToMyJobs: () => void;
  navigateToCalendar: () => void;
  navigateToSavedOrders: () => void;
  navigateToHelp: () => void;
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
  const [sidebarVisible, setSidebarVisible] = useState(false);

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
    closeSidebar();
    router.push(route as RelativePathString);
  };

  const navigateToProfile = () => {
    closeSidebar();
    router.push("/profile/profile");
  };

  const navigateToSettings = () => {
    closeSidebar();
    router.push("/profile/settings");
  };

  const navigateToMyOrders = () => {
    closeSidebar();
    router.push("/orders?myOrders=true");
  };

  const navigateToMyJobs = () => {
    closeSidebar();
    router.push("/orders?myJobs=true");
  };

  const navigateToCalendar = () => {
    closeSidebar();
    router.push("/calendar");
  };

  const navigateToSavedOrders = () => {
    closeSidebar();
    router.push("/orders?saved=true");
  };

  const navigateToHelp = () => {
    closeSidebar();
    router.push("/profile/help");
  };

  const value: NavigationContextType = {
    sidebarVisible,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    goBack,
    canGoBack,
    navigateTo,
    navigateToProfile,
    navigateToSettings,
    navigateToMyOrders,
    navigateToMyJobs,
    navigateToCalendar,
    navigateToSavedOrders,
    navigateToHelp,
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
