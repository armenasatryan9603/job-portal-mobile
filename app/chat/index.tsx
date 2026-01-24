import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BorderRadius, Spacing, ThemeColors } from "@/constants/styles";
import { Conversation, chatService } from "@/categories/chatService";
import React, { useEffect, useRef, useState } from "react";

import AnalyticsService from "@/categories/AnalyticsService";
import { ChatListSkeleton } from "@/components/ChatListSkeleton";
import { Header } from "@/components/Header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { formatTimestamp } from "@/utils/dateFormatting";
import { pusherService } from "@/categories/pusherService";
import { router } from "expo-router";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useConversations } from "@/contexts/ConversationsContext";
import { useTranslation } from "@/contexts/TranslationContext";

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
    removeConversation,
  } = useConversations();
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const conversationsRef = useRef(conversations);

  // Keep ref in sync with conversations
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Note: Conversations are loaded in ConversationsContext on mount
  // No need to reload on focus - Pusher keeps them updated in real-time

  // Note: User updates subscription is handled globally in ConversationsContext
  // to prevent handler conflicts. This screen uses the context's updateConversation
  // which is automatically called when Pusher events arrive.

  // Handle conversation deletion events (bound directly to channel, not via subscribeToUserUpdates)
  useEffect(() => {
    if (!user?.id) return;

    pusherService.initialize();

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
      const pusher = (pusherService as any).pusher;
      if (pusher) {
        const channel = pusher.channel(`user-${user.id}`);
        if (channel) {
          channel.unbind("conversation-deleted", conversationDeletedHandler);
        }
      }
    };
  }, [user?.id, removeConversation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshConversations();
    setRefreshing(false);
  };

  const totalUnreadCount = conversations.reduce((sum, conv) => {
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
    // Track conversation opened
    AnalyticsService.getInstance().logEvent("conversation_opened", {
      conversation_id: conversation.id.toString(),
    });

    // Navigate to chat detail (mark as read happens in useFocusEffect)
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
      .map((p) => p.User?.name || t("deletedUser"))
      .join(", ");
    const lastMessage = item.Messages[0];
    const currentUserParticipant = item.Participants.find(
      (p) => p.userId === user?.id && p.isActive
    );

    // Don't count messages sent by current user as unread
    const hasUnread =
      lastMessage &&
      lastMessage.senderId !== user?.id &&
      (currentUserParticipant?.lastReadAt
        ? new Date(lastMessage.createdAt) >
          new Date(currentUserParticipant.lastReadAt)
        : !currentUserParticipant?.lastReadAt);

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
              <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                {participantName && participantName.length > 0
                  ? participantName.charAt(0).toUpperCase()
                  : "?"}
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
                {lastMessage ? formatTimestamp(lastMessage.createdAt, t) : ""}
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
        <ChatListSkeleton itemCount={6} />
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
    paddingHorizontal: Spacing.md,
    paddingTop: 4,
    paddingBottom: 24,
  },
  conversationItem: {
    marginBottom: 8,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    overflow: "hidden",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  conversationContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    paddingLeft: Spacing.md,
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
    // Note: Should use colors.surface or colors.textInverse dynamically - consider inline style
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
    // Note: Should use colors.textInverse dynamically - consider inline style
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
    // Note: Should use colors.textInverse dynamically - consider inline style
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
