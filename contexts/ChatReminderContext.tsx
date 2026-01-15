import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import NotificationService, {
  ChatReminderPayload,
  NotificationToastPayload,
} from "@/categories/NotificationService";

interface ToastReminder {
  type: "chat" | "notification";
  conversationId?: number;
  messageId?: string;
  senderId?: string;
  sender?: string;
  title: string;
  body: string;
  notificationId?: string;
  orderId?: string;
  data?: any;
}

interface ChatReminderContextValue {
  reminder: ToastReminder | null;
  dismissReminder: () => void;
  setActiveConversationId: (conversationId: number | null) => void;
}

const ChatReminderContext = createContext<ChatReminderContextValue | undefined>(
  undefined
);

export const ChatReminderProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [reminder, setReminder] = useState<ToastReminder | null>(null);

  // Listen to both chat reminders and notification toasts
  useEffect(() => {
    const notificationService = NotificationService.getInstance();

    const unsubscribeChat = notificationService.onChatReminder(
      (payload: ChatReminderPayload) => {
        if (!payload.conversationId) return;

        const conversationId = Number(payload.conversationId);
        if (Number.isNaN(conversationId)) return;

        setReminder({
          type: "chat",
          conversationId,
          messageId: payload.messageId,
          senderId: payload.senderId,
          sender: payload.sender,
          title: payload.title,
          body: payload.body,
        });
      }
    );

    const unsubscribeNotification = notificationService.onNotificationToast(
      (payload: NotificationToastPayload) => {
        setReminder({
          type: "notification",
          title: payload.title,
          body: payload.body,
          sender: payload.sender,
          notificationId: payload.id,
          orderId: payload.data?.orderId,
          data: payload.data,
        });
      }
    );

    return () => {
      unsubscribeChat();
      unsubscribeNotification();
    };
  }, []);

  // Auto-dismiss reminder after 6 seconds
  useEffect(() => {
    if (!reminder) return;

    const timeout = setTimeout(() => setReminder(null), 6000);
    return () => clearTimeout(timeout);
  }, [reminder]);

  const dismissReminder = useCallback(() => setReminder(null), []);

  const setActiveConversationId = useCallback(
    (conversationId: number | null) => {
      NotificationService.getInstance().setActiveConversationId(
        conversationId ?? null
      );
    },
    []
  );

  const value: ChatReminderContextValue = {
    reminder,
    dismissReminder,
    setActiveConversationId,
  };

  return (
    <ChatReminderContext.Provider value={value}>
      {children}
    </ChatReminderContext.Provider>
  );
};

export const useChatReminder = (): ChatReminderContextValue => {
  const context = useContext(ChatReminderContext);
  if (!context) {
    throw new Error(
      "useChatReminder must be used within a ChatReminderProvider"
    );
  }
  return context;
};
