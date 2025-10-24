import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { chatService, Conversation } from "@/services/chatService";

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await chatService.getConversations();
      setConversations(response.conversations);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("failedToLoadConversations")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
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
      // Mark messages as read
      await chatService.markAsRead(conversation.id);

      // Update local state - set lastReadAt to be after the last message time
      const lastMessage = conversation.Messages[0];
      let newLastReadAt;
      if (lastMessage) {
        const messageTime = new Date(lastMessage.createdAt);
        // Add 1 second to ensure it's after the message
        newLastReadAt = new Date(messageTime.getTime() + 1000).toISOString();
      } else {
        newLastReadAt = new Date().toISOString();
      }

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversation.id
            ? {
                ...conv,
                Participants: conv.Participants.map((p) =>
                  p.isActive ? { ...p, lastReadAt: newLastReadAt } : p
                ),
              }
            : conv
        )
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }

    // Navigate to chat detail
    router.push(`/chat/${conversation.id}`);
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
        return diffInMinutes < 1 ? "now" : `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
          hasUnread && {
            backgroundColor: colors.primary + "10",
          },
        ]}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.conversationContent}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: "white" }]}>
                {participantName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.conversationInfo}>
            <View style={styles.conversationHeader}>
              <Text
                style={[
                  styles.participantName,
                  { color: colors.text },
                  hasUnread && styles.unreadText,
                ]}
              >
                {participantName}
              </Text>
              <Text
                style={[styles.timestamp, { color: colors.tabIconDefault }]}
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
                    size={16}
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
                >
                  {lastMessage?.content || t("noMessagesYet")}
                </Text>
              </View>
              {hasUnread && (
                <View
                  style={[
                    styles.unreadBadge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.unreadBadgeText}>1</Text>
                </View>
              )}
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
            onPress={loadConversations}
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
              onChangeText={setSearchQuery}
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
    paddingBottom: 20,
  },
  conversationItem: {
    borderBottomWidth: 1,
  },
  conversationContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
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
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "500",
  },
  timestamp: {
    fontSize: 12,
  },
  lastMessageContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessageContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  messageIcon: {
    marginRight: 4,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadText: {
    fontWeight: "600",
  },
  unreadMessage: {
    fontWeight: "500",
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
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
