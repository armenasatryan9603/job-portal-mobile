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
      const currentUserParticipant = conv.Participants.find(
        (p) => p.userId === user?.id && p.isActive
      );
      const lastMessage = conv.Messages[0];

      // Don't count messages sent by current user as unread
      if (!lastMessage || lastMessage.senderId === user?.id) {
        return sum;
      }

      // If no lastReadAt, consider it unread
      if (!currentUserParticipant?.lastReadAt) {
        return sum + 1;
      }

      // Check if message is newer than lastReadAt
      const lastReadTime = new Date(currentUserParticipant.lastReadAt);
      const messageTime = new Date(lastMessage.createdAt);
      return messageTime > lastReadTime ? sum + 1 : sum;
    }, 0);
  };

  // Update unread count whenever conversations change
  useEffect(() => {
    if (user?.id) {
      const unreadCount = calculateUnreadCount(conversations);
      setUnreadMessagesCount(unreadCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, user?.id]);

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

      // Merge with existing conversations to preserve any local updates (like lastReadAt)
      // that might be newer than what the backend returns
      setConversations((prevConversations) => {
        const merged = sorted.map((backendConv) => {
          const localConv = prevConversations.find(
            (c) => c.id === backendConv.id
          );

          // If local conversation has a newer lastReadAt, use it
          if (localConv) {
            const localParticipant = localConv.Participants.find(
              (p) => p.isActive
            );
            const backendParticipant = backendConv.Participants.find(
              (p) => p.isActive
            );

            if (
              localParticipant?.lastReadAt &&
              backendParticipant?.lastReadAt
            ) {
              const localLastRead = new Date(localParticipant.lastReadAt);
              const backendLastRead = new Date(backendParticipant.lastReadAt);

              // Use the newer lastReadAt (local might be more recent if just updated)
              if (localLastRead > backendLastRead) {
                return {
                  ...backendConv,
                  Participants: backendConv.Participants.map((p) =>
                    p.isActive
                      ? { ...p, lastReadAt: localParticipant.lastReadAt }
                      : p
                  ),
                };
              }
            } else if (
              localParticipant?.lastReadAt &&
              !backendParticipant?.lastReadAt
            ) {
              // Local has lastReadAt but backend doesn't - use local
              return {
                ...backendConv,
                Participants: backendConv.Participants.map((p) =>
                  p.isActive
                    ? { ...p, lastReadAt: localParticipant.lastReadAt }
                    : p
                ),
              };
            }
          }

          return backendConv;
        });

        return merged;
      });
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

      return sorted;
    });
  };

  // Remove a conversation from the list (when deleted)
  const removeConversation = (conversationId: number) => {
    setConversations((prev) =>
      prev.filter((conv) => conv.id !== conversationId)
    );
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

  // Global subscription to catch new messages, update conversation list, and trigger notifications
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let unsubscribe: (() => void) | undefined;

    const setupPusher = async () => {
      await pusherService.initialize();
      unsubscribe = pusherService.subscribeToUserUpdates(
        user.id,
        (data: any) => {
          if (!data?.conversationId) return;

          setConversations((prevConversations) => {
            const existingConv = prevConversations.find(
              (conv) => conv.id === data.conversationId
            );

            if (existingConv) {
              const updated = prevConversations.map((conv) =>
                conv.id === data.conversationId
                  ? {
                      ...conv,
                      updatedAt: data.updatedAt || conv.updatedAt,
                      Messages: data.lastMessage
                        ? [
                            {
                              ...data.lastMessage,
                              Sender: data.lastMessage.Sender,
                            },
                          ]
                        : conv.Messages,
                    }
                  : conv
              );
              const sorted = [...updated].sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime()
              );
              return sorted;
            } else {
              refreshConversations();
              return prevConversations;
            }
          });

          if (
            data.lastMessage?.senderId &&
            data.lastMessage.senderId !== user.id
          ) {
            NotificationService.getInstance().triggerChatReminderForMessage(
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
        (statusData: {
          conversationId: number;
          status: string;
          updatedAt: string;
        }) => {
          updateConversation(statusData.conversationId, {
            status: statusData.status,
            updatedAt: statusData.updatedAt,
          });
        },
        (orderStatusData: {
          orderId: number;
          status: string;
          updatedAt: string;
        }) => {
          setConversations((prevConversations) => {
            const updated = prevConversations.map((conv) => {
              if (conv.Order?.id === orderStatusData.orderId) {
                return {
                  ...conv,
                  Order: {
                    ...conv.Order,
                    status: orderStatusData.status,
                  },
                };
              }
              return conv;
            });
            const sorted = [...updated].sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime()
            );
            const unreadCount = calculateUnreadCount(sorted);
            setUnreadMessagesCount(unreadCount);
            return sorted;
          });
        }
      );
    };

    setupPusher();

    return () => {
      if (unsubscribe) unsubscribe();
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
