import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import NotificationService, {
  ChatReminderPayload,
} from "@/services/NotificationService";

interface ChatReminder {
  conversationId: number;
  messageId?: string;
  senderId?: string;
  title: string;
  body: string;
}

interface ChatReminderContextValue {
  reminder: ChatReminder | null;
  dismissReminder: () => void;
  setActiveConversationId: (conversationId: number | null) => void;
}

const ChatReminderContext = createContext<ChatReminderContextValue | undefined>(
  undefined
);

export const ChatReminderProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [reminder, setReminder] = useState<ChatReminder | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = NotificationService.getInstance().onChatReminder(
      (payload: ChatReminderPayload) => {
        if (!payload.conversationId) {
          return;
        }

        const conversationId = Number(payload.conversationId);
        if (Number.isNaN(conversationId)) {
          return;
        }

        setReminder({
          conversationId,
          messageId: payload.messageId,
          senderId: payload.senderId,
          title: payload.title,
          body: payload.body,
        });
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (reminder) {
      timeoutRef.current = setTimeout(() => {
        setReminder(null);
      }, 6000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [reminder]);

  const dismissReminder = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setReminder(null);
  }, []);

  const setActiveConversationId = useCallback((conversationId: number | null) => {
    NotificationService.getInstance().setActiveConversationId(
      conversationId ?? null
    );
  }, []);

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

