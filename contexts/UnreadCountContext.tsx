import React, {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from "react";
import NotificationService from "@/services/NotificationService";
import { useUnreadNotificationCount } from "@/hooks/useApi";
import { pusherService } from "@/services/pusherService";
import { useAuth } from "@/contexts/AuthContext";

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

export const UnreadCountProvider: React.FC<UnreadCountProviderProps> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Use TanStack Query for unread count (has minimal 60-second polling as fallback)
  const { data: unreadCount = 0, refetch } = useUnreadNotificationCount();

  // Sync TanStack Query data to context state for Header badge
  useEffect(() => {
    setUnreadNotificationsCount(unreadCount);
  }, [unreadCount]);

  // Initialize notifications on mount (only once)
  useEffect(() => {
    NotificationService.getInstance()
      .initialize()
      .catch((error) =>
        console.error("Error initializing notifications:", error)
      );
  }, []);

  // Listen to Pusher notification events for real-time updates
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let unsubscribe: (() => void) | undefined;

    pusherService.initialize().then(() => {
      unsubscribe = pusherService.subscribeToNotifications(
        user.id,
        (notificationData: any) => {
          // Increment count immediately
          setUnreadNotificationsCount((prev) => prev + 1);

          // Trigger notification toast
          NotificationService.getInstance().triggerNotificationToast({
            id: notificationData.notificationId,
            title: notificationData.title,
            message: notificationData.message,
            type: notificationData.type,
            data: notificationData.data,
          });

          // Refetch for accuracy
          refetch();
        }
      );
    });

    return () => unsubscribe?.();
  }, [isAuthenticated, user?.id, refetch]);

  const value: UnreadCountContextType = {
    unreadNotificationsCount,
    unreadMessagesCount,
    setUnreadMessagesCount,
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
