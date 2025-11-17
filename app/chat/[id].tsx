import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
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
  Keyboard,
  Animated,
} from "react-native";
import { chatService, Conversation, Message } from "@/services/chatService";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { Review } from "@/services/api";
import { pusherService } from "@/services/pusherService";

// Typing Indicator Component
const TypingIndicator = ({
  typingUsers,
  conversation,
  colors,
}: {
  typingUsers: Set<number>;
  conversation: Conversation | null;
  colors: any;
}) => {
  const [dot1] = useState(new Animated.Value(0));
  const [dot2] = useState(new Animated.Value(0));
  const [dot3] = useState(new Animated.Value(0));

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = [
      animateDot(dot1, 0),
      animateDot(dot2, 200),
      animateDot(dot3, 400),
    ];

    animations.forEach((anim) => anim.start());

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, [dot1, dot2, dot3]);

  const getTypingUserName = () => {
    if (!conversation || typingUsers.size === 0) return "";
    const typingUserIds = Array.from(typingUsers);
    const typingParticipants = conversation.Participants.filter((p) =>
      typingUserIds.includes(p.userId)
    );
    if (typingParticipants.length === 0) return "";
    if (typingParticipants.length === 1) {
      return typingParticipants[0].User.name;
    }
    return "Someone";
  };

  const typingName = getTypingUserName();
  if (!typingName) return null;

  const opacity1 = dot1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });
  const opacity2 = dot2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });
  const opacity3 = dot3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.typingContainer}>
      <View
        style={[
          styles.typingBubble,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.typingText, { color: colors.tabIconDefault }]}>
          {typingName} is typing
        </Text>
        <View style={styles.typingDots}>
          <Animated.View
            style={[
              styles.typingDot,
              { backgroundColor: colors.tabIconDefault, opacity: opacity1 },
            ]}
          />
          <Animated.View
            style={[
              styles.typingDot,
              { backgroundColor: colors.tabIconDefault, opacity: opacity2 },
            ]}
          />
          <Animated.View
            style={[
              styles.typingDot,
              { backgroundColor: colors.tabIconDefault, opacity: opacity3 },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

export default function ChatDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const { t } = useTranslation();
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = useRef(false);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingClearTimeoutsRef = useRef<
    Map<number, ReturnType<typeof setTimeout>>
  >(new Map());
  const typingChannelRef = useRef<any>(null);

  // Load conversation and messages
  useEffect(() => {
    loadConversation();
  }, [id]);

  // Handle keyboard show/hide for Android
  useEffect(() => {
    if (Platform.OS === "android") {
      const keyboardWillShowListener = Keyboard.addListener(
        "keyboardDidShow",
        (e) => {
          // Add extra padding to ensure input is fully visible above keyboard
          const height = e.endCoordinates.height;
          setKeyboardHeight(height);
          // Scroll to bottom when keyboard appears
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      );
      const keyboardWillHideListener = Keyboard.addListener(
        "keyboardDidHide",
        () => {
          setKeyboardHeight(0);
        }
      );

      return () => {
        keyboardWillShowListener.remove();
        keyboardWillHideListener.remove();
      };
    }
  }, []);

  // Initialize Pusher and subscribe to conversation updates
  useEffect(() => {
    pusherService.initialize();

    if (!conversation?.id) return;

    const currentConversationId = conversation.id;
    const conversationChannelName = `conversation-${currentConversationId}`;
    const typingChannelName = `private-conversation-${currentConversationId}`;
    const pusher = (pusherService as any).pusher;
    let typingChannelRetryTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleTypingEvent = (data: { userId: number; isTyping: boolean }) => {
      if (data.userId === user?.id) {
        return;
      }

      const existingTimeout = typingClearTimeoutsRef.current.get(data.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      if (data.isTyping) {
        setTypingUsers((prev) => new Set(prev).add(data.userId));
        const timeoutId = setTimeout(() => {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(data.userId);
            return newSet;
          });
          typingClearTimeoutsRef.current.delete(data.userId);
        }, 4000);
        typingClearTimeoutsRef.current.set(data.userId, timeoutId);
      } else {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
        typingClearTimeoutsRef.current.delete(data.userId);
      }
    };

    const ensureTypingChannel = () => {
      if (!pusher) return null;
      try {
        const channel =
          pusher.channel(typingChannelName) ||
          pusher.subscribe(typingChannelName);
        if (channel) {
          channel.unbind("client-currently-typing", handleTypingEvent);
          channel.bind("client-currently-typing", handleTypingEvent);
          typingChannelRef.current = channel;
        }
        return channel;
      } catch (error) {
        console.error(
          `Failed to subscribe to ${typingChannelName} for typing events`,
          error
        );
        return null;
      }
    };

    if (pusher) {
      const channel = ensureTypingChannel();
      if (!channel) {
        typingChannelRetryTimeout = setTimeout(() => {
          ensureTypingChannel();
        }, 500);
      }
    }

    const unsubscribe = pusherService.subscribeToConversation(
      currentConversationId,
      (newMessage: Message) => {
        if (newMessage.conversationId !== currentConversationId) {
          console.warn(
            `⚠️ Received message for conversation ${newMessage.conversationId} but current is ${currentConversationId}. Ignoring.`
          );
          return;
        }

        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === newMessage.id);
          if (exists) {
            console.log(
              `⚠️ Duplicate message detected: ${newMessage.id}, skipping`
            );
            return prev;
          }
          return [...prev, newMessage];
        });

        if (newMessage.senderId !== user?.id) {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(newMessage.senderId);
            return newSet;
          });
          const existingTimeout = typingClearTimeoutsRef.current.get(
            newMessage.senderId
          );
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            typingClearTimeoutsRef.current.delete(newMessage.senderId);
          }
        }

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (statusData: {
        conversationId: number;
        status: string;
        updatedAt: string;
      }) => {
        setConversation((prev) => {
          if (!prev || prev.id !== statusData.conversationId) {
            return prev;
          }
          return {
            ...prev,
            status: statusData.status,
            updatedAt: statusData.updatedAt,
          };
        });
      }
    );

    const conversationDeletedHandler = (data: {
      conversationId: number;
      deletedBy: number;
    }) => {
      if (data.conversationId !== currentConversationId) {
        return;
      }

      setConversation((prev) => {
        if (!prev) return prev;
        return { ...prev, status: "removed" };
      });
    };

    const timeoutId = setTimeout(() => {
      const pusherInstance = (pusherService as any).pusher;
      if (pusherInstance) {
        const channel = pusherInstance.channel(conversationChannelName);
        if (channel) {
          channel.bind("conversation-deleted", conversationDeletedHandler);
        }
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (typingChannelRetryTimeout) {
        clearTimeout(typingChannelRetryTimeout);
      }
      unsubscribe();
      const pusherInstance = (pusherService as any).pusher;
      if (pusherInstance) {
        const conversationChannel = pusherInstance.channel(
          conversationChannelName
        );
        if (conversationChannel) {
          conversationChannel.unbind(
            "conversation-deleted",
            conversationDeletedHandler
          );
        }
        const privateChannel = pusherInstance.channel(typingChannelName);
        if (privateChannel) {
          privateChannel.unbind("client-currently-typing", handleTypingEvent);
          if (typingChannelRef.current === privateChannel) {
            typingChannelRef.current = null;
          }
          pusherInstance.unsubscribe(typingChannelName);
        }
      }

      setTypingUsers(new Set());
      typingClearTimeoutsRef.current.forEach((timeout) =>
        clearTimeout(timeout)
      );
      typingClearTimeoutsRef.current.clear();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, [conversation?.id, user?.id]);

  // Subscribe to user updates for order status changes
  useEffect(() => {
    if (!user?.id) return;

    pusherService.initialize();

    const unsubscribe = pusherService.subscribeToUserUpdates(
      user.id,
      () => {}, // conversation-updated handler (not needed here)
      undefined, // conversation-status-updated (handled above)
      // Handle order status updates
      (orderStatusData: {
        orderId: number;
        status: string;
        updatedAt: string;
      }) => {
        // Update order status in conversation if it matches
        setConversation((prev) => {
          if (!prev || prev.Order?.id !== orderStatusData.orderId) {
            return prev;
          }
          return {
            ...prev,
            Order: {
              ...prev.Order!,
              status: orderStatusData.status,
            },
          };
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id, conversation?.Order?.id]);

  // Check for existing feedback and show dialog when conversation loads
  useEffect(() => {
    const checkAndShowDialog = async () => {
      // Only check if conversation is closed
      if (!conversation || !isConversationClosed()) {
        return;
      }

      // Don't show dialog if feedback was already submitted or existing feedback found
      if (feedbackSubmitted || hasExistingFeedback) {
        return;
      }

      // Small delay to ensure conversation state is fully updated
      await new Promise((resolve) => setTimeout(resolve, 100));

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
        console.error("Error checking for existing feedback:", error);
        // On error, don't show dialog to be safe
        setHasExistingFeedback(true);
      }
    };

    checkAndShowDialog();
  }, [conversation, feedbackSubmitted, hasExistingFeedback, user?.id]);

  const loadConversation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Clear previous messages to prevent showing messages from wrong conversation
      setMessages([]);

      const conversationId = parseInt(id as string);
      const [conversationData, messagesData] = await Promise.all([
        chatService.getConversation(conversationId),
        chatService.getMessages(conversationId),
      ]);

      // Double-check: ensure we're setting messages for the correct conversation
      if (conversationData.id === conversationId) {
        setConversation(conversationData);
        // Deduplicate messages by ID before setting
        const uniqueMessages = messagesData.messages.filter(
          (msg, index, self) => index === self.findIndex((m) => m.id === msg.id)
        );
        setMessages(uniqueMessages);
      } else {
        console.warn(
          `⚠️ Conversation ID mismatch: expected ${conversationId}, got ${conversationData.id}`
        );
      }

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

  // Function to detect phone numbers in text
  const containsPhoneNumber = (text: string): boolean => {
    // More comprehensive phone number detection
    // Handles various formats including:
    // - International: +374 77 7539543, +1-234-567-8900
    // - Local formats: 094122345, 093 10 19 43, 094 40-60 - 71 10
    // - With multiple spaces: 033      50 6070
    // - With quotes: "000777659-67"

    // Pattern to match sequences that look like phone numbers:
    // - Starts with optional + or 0
    // - Followed by digits with various separators (spaces, dashes, dots, parentheses)
    // - Matches sequences that when cleaned have 7-15 digits
    const phonePatterns = [
      // International format: +374 77 7539543, +1 234 567 8900
      /\+\d{1,4}[\s\-\.]?\d{1,4}[\s\-\.]?\d{1,4}[\s\-\.]?\d{1,9}/g,
      // Local formats with spaces/dashes: 094 40-60 - 71 10, 093 10 19 43
      /0\d{1,2}[\s\-\.]+[\d\s\-\.]{5,}/g,
      // Formats with parentheses: (123) 456-7890
      /\(\d{1,4}\)[\s\-\.]?\d{1,4}[\s\-\.]?\d{1,9}/g,
      // Sequences of digits with separators: 055906940, "000777659-67"
      /["']?\d{2,}[\s\-\.]?\d{1,}[\s\-\.]?\d{1,}["']?/g,
      // Consecutive digits (7+): 1234567890
      /\d{7,}/g,
    ];

    // Check if any pattern matches
    for (const pattern of phonePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Remove all non-digit characters to get pure number
          const digitsOnly = match.replace(/\D/g, "");

          // Check if it's a valid phone number length (7-15 digits)
          if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
            const num = parseInt(digitsOnly);

            // Filter out false positives:
            // - Years (1900-2099)
            // - Very small numbers that are likely not phones
            // - Numbers that are too short even after cleaning
            if (
              !(num >= 1900 && num <= 2099) &&
              digitsOnly.length >= 7 &&
              // Additional check: if it starts with 0 and has 7+ digits, likely a phone
              (match.trim().startsWith("0") ||
                match.trim().startsWith("+") ||
                digitsOnly.length >= 8)
            ) {
              return true;
            }
          }
        }
      }
    }

    // Additional check: look for sequences of digits separated by spaces/dashes
    // that when combined form a phone number (7-15 digits)
    const flexiblePattern = /[\d\s\-\.\(\)\+]{7,}/g;
    const flexibleMatches = text.match(flexiblePattern);
    if (flexibleMatches) {
      for (const match of flexibleMatches) {
        const digitsOnly = match.replace(/\D/g, "");
        if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
          const num = parseInt(digitsOnly);
          // Check if it looks like a phone number (not a year, not too small)
          if (
            !(num >= 1900 && num <= 2099) &&
            digitsOnly.length >= 7 &&
            // Must have some separators or be 8+ digits to avoid false positives
            (match.match(/[\s\-\.]/) || digitsOnly.length >= 8)
          ) {
            return true;
          }
        }
      }
    }

    return false;
  };

  // Send typing indicator via Pusher (like Messenger.com)
  const sendTypingIndicator = (isTyping: boolean) => {
    if (!conversation?.id || !user?.id) return;

    const channelName = `private-conversation-${conversation.id}`;
    const pusher = (pusherService as any).pusher;
    if (!pusher) return;

    let channel = typingChannelRef.current;
    if (!channel) {
      channel = pusher.channel(channelName) || pusher.subscribe(channelName);
      typingChannelRef.current = channel;
    }

    if (channel?.trigger) {
      channel.trigger("client-currently-typing", {
        userId: user.id,
        isTyping,
      });
    }
  };

  // Handle typing with debounce (like Messenger.com behavior)
  const handleTyping = (text: string) => {
    setNewMessage(text);

    // Clear existing timeout and interval
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    // Send typing indicator immediately when user starts typing
    if (text.trim().length > 0) {
      if (!typingSentRef.current) {
        // First time typing - send typing indicator immediately
        sendTypingIndicator(true);
        typingSentRef.current = true;

        // Send periodic typing indicators every 2.5 seconds while actively typing (like Messenger.com)
        typingIntervalRef.current = setInterval(() => {
          if (typingSentRef.current) {
            sendTypingIndicator(true);
          }
        }, 2500);
      }
      // Reset the timeout - stop typing indicator after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (typingSentRef.current) {
          sendTypingIndicator(false);
          typingSentRef.current = false;
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
        }
      }, 3000); // 3 seconds of inactivity = stop typing (like Messenger.com)
    } else {
      // Text is empty - stop typing indicator immediately
      if (typingSentRef.current) {
        sendTypingIndicator(false);
        typingSentRef.current = false;
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
      }
    }
  };

  const handleSendMessage = async () => {
    if (
      !newMessage.trim() ||
      !conversation ||
      sending ||
      isConversationClosed() ||
      conversation.status === "removed"
    )
      return;

    // Stop typing indicator when sending message
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    sendTypingIndicator(false);
    typingSentRef.current = false;

    // Check for phone numbers in the message - only prevent when order is "open"
    // Once order is "in_progress" (candidate chosen), phone numbers are allowed
    const orderStatus = conversation?.Order?.status;
    if (orderStatus === "open" && containsPhoneNumber(newMessage.trim())) {
      Alert.alert(
        t("cannotSendPhoneNumber") || "Cannot Send Phone Number",
        t("phoneNumbersNotAllowedUntilChosen") ||
          "Phone numbers cannot be shared until you choose a candidate. Please wait until the order is accepted.",
        [{ text: t("ok") || "OK" }]
      );
      return;
    }

    try {
      setSending(true);

      const newMessageData = await chatService.sendMessage({
        conversationId: conversation.id,
        content: newMessage.trim(),
        messageType: "text",
      });

      setMessages((prev) => {
        // Check if message already exists (avoid duplicates from Pusher)
        const exists = prev.some((msg) => msg.id === newMessageData.id);
        if (exists) {
          console.log(
            `⚠️ Message ${newMessageData.id} already exists, skipping duplicate`
          );
          return prev;
        }
        return [...prev, newMessageData];
      });
      setNewMessage("");

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error("Failed to send message:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";

      // Check if it's a phone number error
      if (
        errorMessage.includes("phone number") ||
        errorMessage.includes("phone numbers")
      ) {
        Alert.alert(
          t("cannotSendPhoneNumber") || "Cannot Send Phone Number",
          errorMessage,
          [{ text: t("ok") || "OK" }]
        );
      } else {
        Alert.alert(t("error") || "Error", errorMessage);
      }
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
            // Reload conversation to get updated status
            await loadConversation();
            // The useEffect will automatically show the feedback dialog
            // after the conversation is reloaded with "completed" status
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
    const isSystemMessage = item.messageType === "system";

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

    // Render system messages differently
    if (isSystemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          <View
            style={[
              styles.systemMessageBubble,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <IconSymbol
              name="info.circle.fill"
              size={16}
              color={colors.primary}
              style={styles.systemMessageIcon}
            />
            <Text
              style={[
                styles.systemMessageText,
                {
                  color: colors.text,
                },
              ]}
            >
              {item.content}
            </Text>
          </View>
        </View>
      );
    }

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

  const handleViewOrder = () => {
    if (conversation?.Order?.id) {
      router.push(`/orders/${conversation.Order.id}`);
    }
  };

  return (
    <Layout header={header} showFooterTabs={false}>
      <KeyboardAvoidingView
        style={[
          styles.container,
          Platform.OS === "android" && keyboardHeight > 0
            ? { paddingBottom: keyboardHeight + 20 }
            : {},
        ]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        enabled={Platform.OS === "ios"}
      >
        {/* Order Reference Card with Action Buttons */}
        {conversation?.Order && (
          <View
            style={[
              styles.orderCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Order Info Section - Clickable */}
            <TouchableOpacity
              onPress={handleViewOrder}
              activeOpacity={0.7}
              style={styles.orderCardHeader}
            >
              <View style={styles.orderCardLeft}>
                <IconSymbol name="doc.text" size={20} color={colors.primary} />
                <View style={styles.orderCardInfo}>
                  <Text
                    style={[styles.orderCardTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {conversation.Order.title || t("order")}
                  </Text>
                  <Text
                    style={[
                      styles.orderCardSubtitle,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t("viewOrderDetails") || "View Order Details"}
                  </Text>
                </View>
              </View>
              <IconSymbol
                name="chevron.right"
                size={16}
                color={colors.tabIconDefault}
              />
            </TouchableOpacity>

            {/* Action Buttons - Only show for client and if conversation is not closed */}
            {isClient() && !isConversationClosed() && (
              <>
                <View
                  style={[
                    styles.orderCardDivider,
                    { backgroundColor: colors.border },
                  ]}
                />
                <View
                  style={[
                    styles.orderCardActions,
                    {
                      paddingBottom: ["open", "in_progress"].includes(
                        conversation?.Order?.status
                      )
                        ? 10
                        : 0,
                    },
                  ]}
                >
                  {/* Show Reject/Choose buttons for open orders */}
                  {conversation?.Order?.status === "open" && (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.orderActionButton,
                          styles.orderRejectButton,
                          { borderColor: "#FF6B6B" },
                          actionLoading && styles.disabledButton,
                        ]}
                        onPress={handleReject}
                        disabled={actionLoading}
                      >
                        <IconSymbol name="xmark" size={14} color="#FF6B6B" />
                        <Text
                          style={[
                            styles.orderActionButtonText,
                            { color: "#FF6B6B" },
                          ]}
                        >
                          {t("reject")}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.orderActionButton,
                          styles.orderApproveButton,
                          { backgroundColor: colors.primary },
                          actionLoading && styles.disabledButton,
                        ]}
                        onPress={handleChoose}
                        disabled={actionLoading}
                      >
                        <IconSymbol name="checkmark" size={14} color="white" />
                        <Text
                          style={[
                            styles.orderActionButtonText,
                            { color: "white" },
                          ]}
                        >
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
                          styles.orderActionButton,
                          styles.orderRejectButton,
                          { borderColor: "#FF6B6B" },
                          actionLoading && styles.disabledButton,
                        ]}
                        onPress={handleCancel}
                        disabled={actionLoading}
                      >
                        <IconSymbol name="xmark" size={14} color="#FF6B6B" />
                        <Text
                          style={[
                            styles.orderActionButtonText,
                            { color: "#FF6B6B" },
                          ]}
                        >
                          {t("cancel")}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.orderActionButton,
                          styles.orderApproveButton,
                          { backgroundColor: colors.primary },
                          actionLoading && styles.disabledButton,
                        ]}
                        onPress={handleComplete}
                        disabled={actionLoading}
                      >
                        <IconSymbol
                          name="checkmark.circle"
                          size={14}
                          color="white"
                        />
                        <Text
                          style={[
                            styles.orderActionButtonText,
                            { color: "white" },
                          ]}
                        >
                          {t("complete")}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        )}

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => {
            // Use ID if available, otherwise fallback to index
            // This prevents duplicate key errors
            return item.id ? `msg-${item.id}` : `msg-${index}`;
          }}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListFooterComponent={
            typingUsers.size > 0 ? (
              <TypingIndicator
                typingUsers={typingUsers}
                conversation={conversation}
                colors={colors}
              />
            ) : null
          }
        />

        {/* Conversation Status - Show when closed or removed */}
        {(isConversationClosed() || conversation?.status === "removed") && (
          <View
            style={[
              styles.statusContainer,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
                paddingBottom: 30,
              },
            ]}
          >
            <View style={styles.statusMessage}>
              <IconSymbol
                name={
                  conversation?.status === "removed"
                    ? "trash.fill"
                    : conversation?.status === "completed"
                    ? "checkmark.circle.fill"
                    : "xmark.circle.fill"
                }
                size={20}
                color={
                  conversation?.status === "removed"
                    ? "#FF6B6B"
                    : conversation?.status === "completed"
                    ? colors.primary
                    : "#FF6B6B"
                }
              />
              <Text style={[styles.statusText, { color: colors.text }]}>
                {conversation?.status === "removed"
                  ? t("conversationDeleted") || "This conversation was deleted"
                  : conversation?.status === "completed"
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
                {
                  backgroundColor: colors.background,
                  paddingBottom: Platform.OS === "android" ? 20 : 8,
                },
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

        {/* Message Input - Only show if conversation is active and not removed */}
        {!isConversationClosed() && conversation?.status !== "removed" && (
          <View
            style={[
              styles.inputContainer,
              Platform.OS === "android" && keyboardHeight > 0
                ? { paddingBottom: 10 }
                : {},
            ]}
          >
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
                onChangeText={handleTyping}
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
    padding: 12,
    paddingBottom: 12,
  },
  orderCard: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  orderCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  orderCardInfo: {
    flex: 1,
  },
  orderCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  orderCardSubtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
  orderCardDivider: {
    height: 1,
    marginHorizontal: 12,
    opacity: 0.3,
  },
  orderCardActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    // paddingBottom: 12,
    paddingTop: 0,
  },
  orderActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    minHeight: 40,
  },
  orderRejectButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
  },
  orderApproveButton: {
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  orderActionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  messageContainer: {
    marginBottom: 8,
  },
  currentUserMessage: {
    alignItems: "flex-end",
  },
  otherUserMessage: {
    alignItems: "flex-start",
  },
  systemMessageContainer: {
    marginBottom: 12,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  systemMessageBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: "90%",
    gap: 8,
  },
  systemMessageIcon: {
    marginRight: 0,
  },
  systemMessageText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    textAlign: "center",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 3,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  statusIcon: {
    marginLeft: 2,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: Platform.OS === "android" ? 50 : 30,
  },
  actionContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
    minHeight: 38,
    minWidth: 100,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rejectButton: {
    backgroundColor: "transparent",
  },
  chooseButton: {
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  disabledButton: {
    opacity: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 28,
    paddingVertical: 6,
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
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "android" ? 20 : 8,
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
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "android" ? 20 : 8,
  },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  reviewButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  typingContainer: {
    marginBottom: 8,
    alignItems: "flex-start",
    paddingHorizontal: 12,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: "80%",
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    fontStyle: "italic",
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
