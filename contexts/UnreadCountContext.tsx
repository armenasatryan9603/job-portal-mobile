import React, {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from "react";
import NotificationService from "@/services/NotificationService";
import { useUnreadNotificationCount } from "@/hooks/useApi";

interface UnreadCountContextType {
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  setUnreadMessagesCount: (count: number) => void;
}

const UnreadCountContext = createContext<UnreadCountContextType | undefined>(
  undefined
);

interface UnreadCountProviderProps {
  children: ReactNode;
}

// Inner component to use hooks (hooks can only be used in components)
const UnreadCountProviderInner: React.FC<{
  children: ReactNode;
  setUnreadNotificationsCount: (count: number) => void;
  setUnreadMessagesCount: (count: number) => void;
}> = ({ children, setUnreadNotificationsCount, setUnreadMessagesCount }) => {
  // Use TanStack Query for unread count (has minimal 60-second polling as fallback)
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  // Sync TanStack Query data to context state for Header badge
  useEffect(() => {
    setUnreadNotificationsCount(unreadCount);
  }, [unreadCount, setUnreadNotificationsCount]);

  // Initialize notifications on mount (only once)
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        await NotificationService.getInstance().initialize();
      } catch (error) {
        console.error("Error initializing notifications:", error);
      }
    };
    initializeNotifications();
  }, []);

  return <>{children}</>;
};

export const UnreadCountProvider: React.FC<UnreadCountProviderProps> = ({
  children,
}) => {
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const value: UnreadCountContextType = {
    unreadNotificationsCount,
    unreadMessagesCount,
    setUnreadMessagesCount,
  };

  return (
    <UnreadCountContext.Provider value={value}>
      <UnreadCountProviderInner
        setUnreadNotificationsCount={setUnreadNotificationsCount}
        setUnreadMessagesCount={setUnreadMessagesCount}
      >
        {children}
      </UnreadCountProviderInner>
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
