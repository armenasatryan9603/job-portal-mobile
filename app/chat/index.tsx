import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useFocusEffect } from "expo-router";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { chatService, Conversation } from "@/services/chatService";
import { pusherService } from "@/services/pusherService";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/contexts/ConversationsContext";
import AnalyticsService from "@/services/AnalyticsService";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function ChatScreen() {
  useAnalytics("ChatList");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    conversations,
    loading,
    error,
    refreshConversations,
    updateConversation,
    removeConversation,
  } = useConversations();
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);
  const conversationsRef = useRef(conversations);

  // Keep ref in sync with conversations
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Refresh conversations when screen comes into focus
  // This ensures read status is synced from backend when app reopens
  useFocusEffect(
    useCallback(() => {
      if (user?.id && !isRefreshingRef.current && !loading) {
        isRefreshingRef.current = true;
        refreshConversations().finally(() => {
          isRefreshingRef.current = false;
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id])
  );

  // Subscribe to user updates for real-time conversation list updates
  useEffect(() => {
    if (!user?.id) return;

    // Initialize Pusher
    pusherService.initialize();

    // Subscribe to user-specific updates
    const unsubscribe = pusherService.subscribeToUserUpdates(
      user.id,
      (data: {
        conversationId: number;
        lastMessage: any;
        updatedAt: string;
      }) => {
        // Use ref to access latest conversations state
        const existingConv = conversationsRef.current.find(
          (conv) => conv.id === data.conversationId
        );

        if (existingConv) {
          // Update existing conversation
          updateConversation(data.conversationId, {
            updatedAt: data.updatedAt,
            Messages: data.lastMessage
              ? [{ ...data.lastMessage, Sender: data.lastMessage.Sender }]
              : existingConv.Messages,
          });
        } else {
          // New conversation - reload the list
          refreshConversations();
        }
      },
      // Handle conversation status updates
      (statusData: {
        conversationId: number;
        status: string;
        updatedAt: string;
      }) => {
        // Update conversation status in the list
        updateConversation(statusData.conversationId, {
          status: statusData.status,
          updatedAt: statusData.updatedAt,
        });
      },
      // Handle order status updates
      (orderStatusData: {
        orderId: number;
        status: string;
        updatedAt: string;
      }) => {
        // Use ref to access latest conversations
        conversationsRef.current.forEach((conv) => {
          if (conv.Order?.id === orderStatusData.orderId) {
            updateConversation(conv.id, {
              Order: {
                ...conv.Order,
                status: orderStatusData.status,
              },
            });
          }
        });
      }
    );

    // Subscribe to conversation deletion events
    const conversationDeletedHandler = (data: {
      conversationId: number;
      deletedBy: number;
    }) => {
      // Remove conversation from list
      removeConversation(data.conversationId);
    };

    // Bind to conversation-deleted event on user channel
    const timeoutId = setTimeout(() => {
      const pusher = (pusherService as any).pusher;
      if (pusher) {
        const channel = pusher.channel(`user-${user.id}`);
        if (channel) {
          channel.bind("conversation-deleted", conversationDeletedHandler);
        }
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
      const pusher = (pusherService as any).pusher;
      if (pusher) {
        const channel = pusher.channel(`user-${user.id}`);
        if (channel) {
          channel.unbind("conversation-deleted", conversationDeletedHandler);
        }
      }
    };
  }, [user?.id, updateConversation, refreshConversations, removeConversation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshConversations();
    setRefreshing(false);
  };

  const totalUnreadCount = conversations.reduce((sum, conv) => {
    // Calculate unread count based on last message and participant's lastReadAt
    const currentUserParticipant = conv.Participants.find((p) => p.isActive);
    const lastMessage = conv.Messages[0];

    if (lastMessage && currentUserParticipant?.lastReadAt) {
      const lastReadTime = new Date(currentUserParticipant.lastReadAt);
      const messageTime = new Date(lastMessage.createdAt);
      return messageTime > lastReadTime ? sum + 1 : sum;
    } else if (lastMessage && !currentUserParticipant?.lastReadAt) {
      return sum + 1;
    }
    return sum;
  }, 0);

  const header = (
    <Header
      title={t("messages")}
      subtitle={
        totalUnreadCount > 0
          ? `${totalUnreadCount} ${t("unreadMessages")}`
          : t("allCaughtUp")
      }
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  const filteredConversations = conversations.filter((conv) => {
    const participantNames = conv.Participants.filter((p) => p.isActive)
      .map((p) => p.User.name)
      .join(" ");
    return participantNames.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleConversationPress = async (conversation: Conversation) => {
    try {
      // Mark messages as read on backend
      await chatService.markAsRead(conversation.id);

      // Refresh the conversation from backend to get the actual updated lastReadAt
      // This ensures the read status persists when app reopens
      const updatedConversation = await chatService.getConversation(
        conversation.id
      );

      // Update local state with the actual backend data
      updateConversation(conversation.id, {
        Participants: updatedConversation.Participants,
      });
    } catch (err) {
      console.error("Failed to mark as read:", err);
      // Fallback to optimistic update if refresh fails
      const lastMessage = conversation.Messages[0];
      let newLastReadAt;
      if (lastMessage) {
        const messageTime = new Date(lastMessage.createdAt);
        // Add 1 second to ensure it's after the message
        newLastReadAt = new Date(messageTime.getTime() + 1000).toISOString();
      } else {
        newLastReadAt = new Date().toISOString();
      }

      updateConversation(conversation.id, {
        Participants: conversation.Participants.map((p) =>
          p.isActive ? { ...p, lastReadAt: newLastReadAt } : p
        ),
      });
    }

    // Track conversation opened
    AnalyticsService.getInstance().logEvent("conversation_opened", {
      conversation_id: conversation.id.toString(),
    });

    // Navigate to chat detail
    router.push(`/chat/${conversation.id}`);
  };

  const handleDeleteConversation = async (conversation: Conversation) => {
    const isClosed =
      conversation.status === "closed" || conversation.status === "completed";

    if (!isClosed) {
      Alert.alert(
        t("cannotDeleteConversation"),
        t("conversationMustBeClosed"),
        [{ text: t("ok") }]
      );
      return;
    }

    Alert.alert(t("deleteConversation"), t("areYouSureDeleteConversation"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            AnalyticsService.getInstance().logEvent("conversation_deleted", {
              conversation_id: conversation.id.toString(),
            });
            await chatService.deleteConversation(conversation.id);
            // Remove conversation from local state
            removeConversation(conversation.id);
          } catch (error) {
            console.error("Failed to delete conversation:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : t("failedToDeleteConversation");
            Alert.alert(t("error"), errorMessage);
          }
        },
      },
    ]);
  };

  const getLastMessageIcon = (type: string) => {
    switch (type) {
      case "image":
        return "photo";
      case "file":
        return "doc";
      default:
        return null;
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherParticipants = item.Participants.filter((p) => p.isActive);
    const participantName = otherParticipants
      .map((p) => p.User.name)
      .join(", ");
    const lastMessage = item.Messages[0];
    const currentUserParticipant = item.Participants.find((p) => p.isActive);

    // Calculate unread count
    const hasUnread =
      lastMessage && currentUserParticipant?.lastReadAt
        ? new Date(lastMessage.createdAt) >
          new Date(currentUserParticipant.lastReadAt)
        : lastMessage && !currentUserParticipant?.lastReadAt;

    const formatTimestamp = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInHours * 60);
        return diffInMinutes < 1
          ? t("now")
          : `${diffInMinutes}${t("minutesAgo")}`;
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}${t("hoursAgo")}`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}${t("daysAgo")}`;
      }
    };

    const isClosed = item.status === "closed" || item.status === "completed";

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          {
            backgroundColor: colors.surface,
            borderLeftColor: hasUnread ? colors.primary : "transparent",
            shadowColor: "#000",
          },
        ]}
        onPress={() => handleConversationPress(item)}
        onLongPress={() => handleDeleteConversation(item)}
        activeOpacity={0.6}
      >
        <View style={styles.conversationContent}>
          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: colors.primary,
                  borderWidth: hasUnread ? 2 : 0,
                  borderColor: colors.primary + "40",
                },
              ]}
            >
              <Text style={[styles.avatarText, { color: "white" }]}>
                {participantName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.conversationInfo}>
            <View style={styles.conversationHeader}>
              <View style={styles.nameContainer}>
                <Text
                  style={[
                    styles.participantName,
                    { color: colors.text },
                    hasUnread && styles.unreadText,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {participantName}
                </Text>
                {hasUnread && (
                  <View
                    style={[
                      styles.unreadBadge,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[styles.timestamp, { color: colors.tabIconDefault }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {lastMessage ? formatTimestamp(lastMessage.createdAt) : ""}
              </Text>
            </View>

            <View style={styles.lastMessageContainer}>
              <View style={styles.lastMessageContent}>
                {lastMessage?.messageType !== "text" && (
                  <IconSymbol
                    name={
                      getLastMessageIcon(
                        lastMessage?.messageType || "text"
                      ) as any
                    }
                    size={18}
                    color={colors.tabIconDefault}
                    style={styles.messageIcon}
                  />
                )}
                <Text
                  style={[
                    styles.lastMessage,
                    { color: colors.textSecondary },
                    hasUnread && styles.unreadMessage,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {lastMessage?.content || t("noMessagesYet")}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <Layout header={header}>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t("loadingConversations")}
          </Text>
        </View>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout header={header}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={refreshConversations}
          >
            <Text style={styles.retryButtonText}>{t("retry")}</Text>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }

  return (
    <Layout header={header}>
      <View style={styles.container}>
        {/* Search Section */}
        <ResponsiveCard padding={0}>
          <View style={styles.searchContainer}>
            <IconSymbol
              name="magnifyingglass"
              size={20}
              color={colors.tabIconDefault}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t("searchConversations")}
              placeholderTextColor={colors.tabIconDefault}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (text.trim().length > 0) {
                  setTimeout(() => {
                    AnalyticsService.getInstance().logSearch(text.trim(), {
                      search_type: "conversations",
                    });
                  }, 500);
                }
              }}
            />
          </View>
        </ResponsiveCard>

        {/* Conversations List */}
        <FlatList
          data={filteredConversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t("noConversationsYet")}
              </Text>
            </View>
          }
        />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 80,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  conversationItem: {
    marginBottom: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    overflow: "hidden",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  conversationContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 18,
    paddingLeft: 16,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "white",
  },
  conversationInfo: {
    flex: 1,
    paddingRight: 4,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    minHeight: 24,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  participantName: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: "500",
    letterSpacing: 0.1,
    textAlign: "right",
    minWidth: 60,
  },
  lastMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  lastMessageContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  messageIcon: {
    marginRight: 6,
  },
  lastMessage: {
    fontSize: 15,
    flex: 1,
    opacity: 0.75,
    letterSpacing: -0.1,
  },
  unreadText: {
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  unreadMessage: {
    fontWeight: "600",
    opacity: 0.9,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    minWidth: 8,
  },
  unreadBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
});
