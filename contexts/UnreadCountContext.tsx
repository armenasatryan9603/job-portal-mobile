import React, {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from "react";
import NotificationService from "@/services/NotificationService";

interface UnreadCountContextType {
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  setUnreadNotificationsCount: (count: number) => void;
  setUnreadMessagesCount: (count: number) => void;
  incrementUnreadNotifications: () => void;
  incrementUnreadMessages: () => void;
  decrementUnreadNotifications: () => Promise<void>;
  decrementUnreadMessages: () => void;
  resetUnreadNotifications: () => Promise<void>;
  resetUnreadMessages: () => void;
  refreshNotificationCount: () => Promise<void>;
}

const UnreadCountContext = createContext<UnreadCountContextType | undefined>(
  undefined
);

interface UnreadCountProviderProps {
  children: ReactNode;
}

export const UnreadCountProvider: React.FC<UnreadCountProviderProps> = ({
  children,
}) => {
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    initializeNotifications();

    // Set up interval to refresh notification count
    const interval = setInterval(async () => {
      await refreshNotificationCount();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const initializeNotifications = async () => {
    try {
      await NotificationService.getInstance().initialize();
      await refreshNotificationCount();
    } catch (error) {
      console.error("Error initializing notifications:", error);
    }
  };

  const refreshNotificationCount = async () => {
    try {
      const count = await NotificationService.getInstance().getUnreadCount();
      setUnreadNotificationsCount(count);
    } catch (error) {
      console.error("Error refreshing notification count:", error);
    }
  };

  const incrementUnreadNotifications = () => {
    setUnreadNotificationsCount((prev) => prev + 1);
  };

  const incrementUnreadMessages = () => {
    setUnreadMessagesCount((prev) => prev + 1);
  };

  const decrementUnreadNotifications = async () => {
    setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    await refreshNotificationCount(); // Refresh from storage
  };

  const decrementUnreadMessages = () => {
    setUnreadMessagesCount((prev) => Math.max(0, prev - 1));
  };

  const resetUnreadNotifications = async () => {
    setUnreadNotificationsCount(0);
    await refreshNotificationCount(); // Refresh from storage
  };

  const resetUnreadMessages = () => {
    setUnreadMessagesCount(0);
  };

  const value: UnreadCountContextType = {
    unreadNotificationsCount,
    unreadMessagesCount,
    setUnreadNotificationsCount,
    setUnreadMessagesCount,
    incrementUnreadNotifications,
    incrementUnreadMessages,
    decrementUnreadNotifications,
    decrementUnreadMessages,
    resetUnreadNotifications,
    resetUnreadMessages,
    refreshNotificationCount,
  };

  return (
    <UnreadCountContext.Provider value={value}>
      {children}
    </UnreadCountContext.Provider>
  );
};

export const useUnreadCount = (): UnreadCountContextType => {
  const context = useContext(UnreadCountContext);
  if (context === undefined) {
    throw new Error(
      "useUnreadCount must be used within an UnreadCountProvider"
    );
  }
  return context;
};
