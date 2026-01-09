import React, {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from "react";
import { chatService, Conversation } from "@/services/chatService";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { pusherService } from "@/services/pusherService";
import NotificationService from "@/services/NotificationService";

interface ConversationsContextType {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  refreshConversations: () => Promise<void>;
  updateConversation: (
    conversationId: number,
    updates: Partial<Conversation>
  ) => void;
  removeConversation: (conversationId: number) => void;
}

const ConversationsContext = createContext<
  ConversationsContextType | undefined
>(undefined);

interface ConversationsProviderProps {
  children: ReactNode;
}

export const ConversationsProvider: React.FC<ConversationsProviderProps> = ({
  children,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const { setUnreadMessagesCount } = useUnreadCount();

  // Calculate unread count from conversations
  const calculateUnreadCount = (convs: Conversation[]): number => {
    return convs.reduce((sum, conv) => {
      const currentUserParticipant = conv.Participants.find((p) => p.isActive);
      const lastMessage = conv.Messages[0];

      // ✅ FIX: Don't count messages sent by current user as unread
      if (!lastMessage || lastMessage.senderId === user?.id) {
        return sum;
      }

      if (lastMessage && currentUserParticipant?.lastReadAt) {
        const lastReadTime = new Date(currentUserParticipant.lastReadAt);
        const messageTime = new Date(lastMessage.createdAt);
        return messageTime > lastReadTime ? sum + 1 : sum;
      } else if (lastMessage && !currentUserParticipant?.lastReadAt) {
        return sum + 1;
      }
      return sum;
    }, 0);
  };

  // Fetch conversations
  const refreshConversations = async () => {
    if (!isAuthenticated || !user) {
      setConversations([]);
      setUnreadMessagesCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await chatService.getConversations();

      // Sort conversations by updatedAt (most recent first)
      const sorted = [...response.conversations].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setConversations(sorted);

      // Update unread count
      const unreadCount = calculateUnreadCount(sorted);
      setUnreadMessagesCount(unreadCount);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load conversations"
      );
      console.error("Error loading conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  // Update a specific conversation in the list
  const updateConversation = (
    conversationId: number,
    updates: Partial<Conversation>
  ) => {
    setConversations((prev) => {
      const updated = prev.map((conv) =>
        conv.id === conversationId ? { ...conv, ...updates } : conv
      );

      // Sort by updatedAt (most recent first)
      const sorted = [...updated].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      // Recalculate unread count after update
      const unreadCount = calculateUnreadCount(sorted);
      setUnreadMessagesCount(unreadCount);

      return sorted;
    });
  };

  // Remove a conversation from the list (when deleted)
  const removeConversation = (conversationId: number) => {
    setConversations((prev) => {
      const filtered = prev.filter((conv) => conv.id !== conversationId);

      // Recalculate unread count after removal
      const unreadCount = calculateUnreadCount(filtered);
      setUnreadMessagesCount(unreadCount);

      return filtered;
    });
  };

  // Fetch conversations when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshConversations();
    } else {
      setConversations([]);
      setUnreadMessagesCount(0);
    }
  }, [isAuthenticated, user?.id]);

  // Global subscription to catch new messages and trigger notifications
  // This works even when user is not on chat screens
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    pusherService.initialize();

    // Subscribe to user updates to catch all new messages
    const unsubscribe = pusherService.subscribeToUserUpdates(
      user.id,
      (data: {
        conversationId: number;
        lastMessage: any;
        updatedAt: string;
      }) => {
        // Check if this is a new message from another user
        if (
          data.lastMessage &&
          data.lastMessage.senderId !== user.id
        ) {
          const notificationService = NotificationService.getInstance();
          notificationService.triggerChatReminderForMessage(
            data.conversationId,
            {
              id: data.lastMessage.id,
              senderId: data.lastMessage.senderId,
              content: data.lastMessage.content,
              Sender: data.lastMessage.Sender,
            }
          );
        }
      },
      undefined, // conversation-status-updated (not needed here)
      undefined // order-status-updated (not needed here)
    );

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, user?.id]);

  const value: ConversationsContextType = {
    conversations,
    loading,
    error,
    refreshConversations,
    updateConversation,
    removeConversation,
  };

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
};

export const useConversations = (): ConversationsContextType => {
  const context = useContext(ConversationsContext);
  if (context === undefined) {
    throw new Error(
      "useConversations must be used within a ConversationsProvider"
    );
  }
  return context;
};
