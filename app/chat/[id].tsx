import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/AuthContext";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { chatService, Conversation, Message } from "@/services/chatService";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { Review } from "@/services/api";

export default function ChatDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const { t } = useLanguage();
  const { user } = useAuth();
  const { id } = useLocalSearchParams();
  const [newMessage, setNewMessage] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackDialogVisible, setFeedbackDialogVisible] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "cancel" | "complete" | null
  >(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [hasExistingFeedback, setHasExistingFeedback] = useState(false);

  // Load conversation and messages
  useEffect(() => {
    loadConversation();
  }, [id]);

  // Check for existing feedback and show dialog when conversation loads
  useEffect(() => {
    const checkAndShowDialog = async () => {
      // Only check if user is client and conversation is closed
      if (!conversation || !isConversationClosed()) {
        return;
      }

      // Don't show dialog if feedback was already submitted or existing feedback found
      if (feedbackSubmitted || hasExistingFeedback) {
        return;
      }

      try {
        // Check if feedback already exists for this order
        const response = await chatService.getReviewsByOrder(
          conversation.Order!.id
        );
        const existingFeedback = response.reviews.find(
          (review: Review) => review.reviewerId === user?.id
        );

        if (existingFeedback) {
          // Feedback exists, don't show dialog
          setHasExistingFeedback(true);
        } else {
          // No feedback exists, show dialog
          setHasExistingFeedback(false);
          const actionType =
            conversation.status === "completed" ? "complete" : "cancel";
          setPendingAction(actionType);
          setFeedbackDialogVisible(true);
        }
      } catch (error) {
        // On error, don't show dialog to be safe
        setHasExistingFeedback(true);
      }
    };

    checkAndShowDialog();
  }, [conversation, feedbackSubmitted, hasExistingFeedback]);

  const loadConversation = async () => {
    try {
      setLoading(true);
      setError(null);

      const conversationId = parseInt(id as string);
      const [conversationData, messagesData] = await Promise.all([
        chatService.getConversation(conversationId),
        chatService.getMessages(conversationId),
      ]);

      setConversation(conversationData);
      setMessages(messagesData.messages);

      // Mark messages as read
      await chatService.markAsRead(conversationId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load conversation"
      );
    } finally {
      setLoading(false);
    }
  };

  const getParticipantName = () => {
    if (!conversation) return t("chat");
    const otherParticipants = conversation.Participants.filter(
      (p) => p.isActive
    );
    return otherParticipants.map((p) => p.User.name).join(", ");
  };

  const header = (
    <Header
      title={getParticipantName()}
      subtitle={t("lastSeenRecently")}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  const handleSendMessage = async () => {
    if (
      !newMessage.trim() ||
      !conversation ||
      sending ||
      isConversationClosed()
    )
      return;

    try {
      setSending(true);

      const newMessageData = await chatService.sendMessage({
        conversationId: conversation.id,
        content: newMessage.trim(),
        messageType: "text",
      });

      setMessages((prev) => [...prev, newMessageData]);
      setNewMessage("");

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error("Failed to send message:", err);
      // You could show an error toast here
    } finally {
      setSending(false);
    }
  };

  // Check if current user is the client (order owner)
  const isClient = () => {
    return conversation?.Order?.clientId === user?.id;
  };

  // Check if conversation is closed
  const isConversationClosed = () => {
    return (
      conversation?.status === "closed" || conversation?.status === "completed"
    );
  };

  // Handle reject action
  const handleReject = async () => {
    if (!conversation?.Order?.id) return;

    Alert.alert(t("rejectApplication"), t("rejectApplicationConfirmation"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("reject"),
        style: "destructive",
        onPress: async () => {
          try {
            setActionLoading(true);
            await chatService.rejectApplication(conversation.Order!.id);
            Alert.alert(t("success"), t("applicationRejected"));
            // Reload conversation to get updated status
            await loadConversation();
          } catch (error) {
            console.error("Failed to reject application:", error);
            Alert.alert(t("error"), t("failedToRejectApplication"));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // Handle choose action
  const handleChoose = async () => {
    if (!conversation?.Order?.id) return;

    Alert.alert(t("chooseApplication"), t("chooseApplicationConfirmation"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("choose"),
        style: "default",
        onPress: async () => {
          try {
            setActionLoading(true);
            await chatService.chooseApplication(conversation.Order!.id);
            Alert.alert(t("success"), t("applicationChosen"));
            // Reload conversation to get updated status
            await loadConversation();
          } catch (error) {
            console.error("Failed to choose application:", error);
            Alert.alert(t("error"), t("failedToChooseApplication"));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // Handle cancel action
  const handleCancel = async () => {
    if (!conversation?.Order?.id) return;

    Alert.alert(t("cancelApplication"), t("cancelApplicationConfirmation"), [
      {
        text: t("no"),
        style: "cancel",
      },
      {
        text: t("yes"),
        style: "destructive",
        onPress: async () => {
          try {
            setActionLoading(true);
            await chatService.cancelApplication(conversation.Order!.id);
            Alert.alert(t("success"), t("applicationCanceled"));
            // Reload conversation to get updated status
            await loadConversation();
          } catch (error) {
            console.error("Failed to cancel application:", error);
            Alert.alert(t("error"), t("failedToCancelApplication"));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // Handle complete action
  const handleComplete = async () => {
    if (!conversation?.Order?.id) return;

    Alert.alert(t("completeOrder"), t("completeOrderConfirmation"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("complete"),
        style: "default",
        onPress: async () => {
          try {
            setActionLoading(true);
            await chatService.completeOrder(conversation.Order!.id);
            Alert.alert(t("success"), t("orderCompleted"));
            // Reload conversation to get updated status
            await loadConversation();
          } catch (error) {
            console.error("Failed to complete order:", error);
            Alert.alert(t("error"), t("failedToCompleteOrder"));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async (rating: number, feedback: string) => {
    if (!conversation?.Order?.id || !pendingAction) return;

    try {
      setFeedbackLoading(true);

      // Get specialist ID from the conversation participants
      // Since there are only two participants and one is the client, the other should be the specialist
      // const client = conversation.Participants.find(
      //   (p) => p.User.role === "client"
      // );
      const specialist = conversation.Participants.find(
        (p) => p.userId !== user?.id
      );

      console.log("All participants:", conversation.Participants);
      // console.log("Client found:", client);
      console.log("Specialist found:", specialist);
      console.log("Specialist ID:", specialist?.userId);

      // Submit feedback to backend
      await chatService.submitFeedback({
        orderId: conversation.Order!.id,
        userId: specialist?.userId,
        rating,
        comment: feedback,
        feedbackType: pendingAction === "cancel" ? "canceled" : "completed",
      });

      Alert.alert(t("success"), t("feedbackSubmitted"));

      // Mark feedback as submitted and close dialog
      setFeedbackSubmitted(true);
      setHasExistingFeedback(true);
      setFeedbackDialogVisible(false);
      setPendingAction(null);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      Alert.alert(t("error"), t("failedToSubmitFeedback"));
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleFeedbackClose = () => {
    // Mark feedback as submitted when user cancels to prevent showing again
    setFeedbackSubmitted(true);
    setHasExistingFeedback(true);
    setFeedbackDialogVisible(false);
    setPendingAction(null);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    // Get the current user ID from auth context
    const currentUserId = user?.id || 0;
    const isFromCurrentUser = item.senderId === currentUserId;

    const formatTimestamp = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);

      if (diffInMinutes < 1) {
        return "now";
      } else if (diffInMinutes < 60) {
        return `${Math.floor(diffInMinutes)}m ago`;
      } else {
        const diffInHours = Math.floor(diffInMinutes / 60);
        return `${diffInHours}h ago`;
      }
    };

    return (
      <View
        style={[
          styles.messageContainer,
          isFromCurrentUser
            ? styles.currentUserMessage
            : styles.otherUserMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isFromCurrentUser
                ? colors.primary
                : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              {
                color: isFromCurrentUser ? "white" : colors.text,
              },
            ]}
          >
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                {
                  color: isFromCurrentUser
                    ? "rgba(255,255,255,0.7)"
                    : colors.tabIconDefault,
                },
              ]}
            >
              {formatTimestamp(item.createdAt)}
            </Text>
            {isFromCurrentUser && (
              <IconSymbol
                name="checkmark"
                size={12}
                color={colors.tabIconDefault}
                style={styles.statusIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <Layout header={header} showFooterTabs={false}>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading conversation...
          </Text>
        </View>
      </Layout>
    );
  }

  if (error || !conversation) {
    return (
      <Layout header={header} showFooterTabs={false}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error || t("chatNotFound")}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadConversation}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }

  return (
    <Layout header={header} showFooterTabs={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Action Buttons - Only show for client and if conversation is not closed */}
        {isClient() && !isConversationClosed() && (
          <View
            style={[
              styles.actionContainer,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            <View style={styles.actionButtons}>
              {/* Show Reject/Choose buttons for open orders */}
              {conversation?.Order?.status === "open" && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.rejectButton,
                      { borderColor: "#FF6B6B" },
                      actionLoading && styles.disabledButton,
                    ]}
                    onPress={handleReject}
                    disabled={actionLoading}
                  >
                    <IconSymbol name="xmark" size={16} color="#FF6B6B" />
                    <Text
                      style={[styles.actionButtonText, { color: "#FF6B6B" }]}
                    >
                      {t("reject")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.chooseButton,
                      { backgroundColor: colors.primary },
                      actionLoading && styles.disabledButton,
                    ]}
                    onPress={handleChoose}
                    disabled={actionLoading}
                  >
                    <IconSymbol name="checkmark" size={16} color="white" />
                    <Text style={[styles.actionButtonText, { color: "white" }]}>
                      {t("choose")}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Show Complete/Cancel buttons for in_progress orders */}
              {conversation?.Order?.status === "in_progress" && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.rejectButton,
                      { borderColor: "#FF6B6B" },
                      actionLoading && styles.disabledButton,
                    ]}
                    onPress={handleCancel}
                    disabled={actionLoading}
                  >
                    <IconSymbol name="xmark" size={16} color="#FF6B6B" />
                    <Text
                      style={[styles.actionButtonText, { color: "#FF6B6B" }]}
                    >
                      {t("cancel")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.chooseButton,
                      { backgroundColor: colors.primary },
                      actionLoading && styles.disabledButton,
                    ]}
                    onPress={handleComplete}
                    disabled={actionLoading}
                  >
                    <IconSymbol
                      name="checkmark.circle"
                      size={16}
                      color="white"
                    />
                    <Text style={[styles.actionButtonText, { color: "white" }]}>
                      {t("complete")}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* Conversation Status - Show when closed */}
        {isConversationClosed() && (
          <View
            style={[
              styles.statusContainer,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            <View style={styles.statusMessage}>
              <IconSymbol
                name="checkmark.circle.fill"
                size={20}
                color={
                  conversation?.status === "completed"
                    ? colors.primary
                    : "#FF6B6B"
                }
              />
              <Text style={[styles.statusText, { color: colors.text }]}>
                {conversation?.status === "completed"
                  ? t("conversationCompleted")
                  : t("conversationClosed")}
              </Text>
            </View>
          </View>
        )}

        {/* Review Button - Show for all participants when conversation is closed */}
        {isConversationClosed() &&
          !feedbackSubmitted &&
          !hasExistingFeedback && (
            <View
              style={[
                styles.reviewContainer,
                { backgroundColor: colors.background },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.reviewButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  const actionType =
                    conversation?.status === "completed"
                      ? "complete"
                      : "cancel";
                  setPendingAction(actionType);
                  setFeedbackDialogVisible(true);
                }}
              >
                <IconSymbol name="star.fill" size={20} color="white" />
                <Text style={styles.reviewButtonText}>{t("leaveReview")}</Text>
              </TouchableOpacity>
            </View>
          )}

        {/* Message Input - Only show if conversation is active */}
        {!isConversationClosed() && (
          <View style={styles.inputContainer}>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder={t("typeMessage")}
                placeholderTextColor={colors.tabIconDefault}
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={500}
                textAlignVertical="top"
                scrollEnabled={false}
                returnKeyType="send"
                onSubmitEditing={handleSendMessage}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor:
                      newMessage.trim() && !sending
                        ? colors.primary
                        : colors.border,
                  },
                ]}
                onPress={handleSendMessage}
                disabled={!newMessage.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <IconSymbol
                    name="arrow.up"
                    size={20}
                    color={newMessage.trim() ? "white" : colors.tabIconDefault}
                  />
                )}
              </TouchableOpacity>
            </View>
            {newMessage.length > 400 && (
              <Text
                style={[
                  styles.characterCount,
                  { color: colors.tabIconDefault },
                  newMessage.length > 480 && { color: "#FF6B6B" },
                ]}
              >
                {newMessage.length}/500 {t("charactersRemaining")}
              </Text>
            )}
          </View>
        )}

        {/* Feedback Dialog */}
        <FeedbackDialog
          visible={feedbackDialogVisible}
          onClose={handleFeedbackClose}
          onSubmit={handleFeedbackSubmit}
          title={t("reviewTitle")}
          subtitle={t("reviewSubtitle")}
          loading={feedbackLoading}
        />
      </KeyboardAvoidingView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  currentUserMessage: {
    alignItems: "flex-end",
  },
  otherUserMessage: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 12,
  },
  statusIcon: {
    marginLeft: 2,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  actionContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: "transparent",
  },
  chooseButton: {
    borderColor: "transparent",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 32,
    paddingVertical: 8,
    paddingHorizontal: 4,
    lineHeight: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  characterCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
    marginRight: 8,
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
  statusContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
  },
  reviewContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  reviewButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
