import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/config/api";

// Lazy load Pusher to avoid netinfo import error
let Pusher: any = null;
let Channel: any = null;

const loadPusher = async () => {
  if (!Pusher) {
    try {
      const pusherModule = await import("pusher-js");
      Pusher = pusherModule.default;
      Channel = pusherModule.Channel;
    } catch (error) {
      console.error("Failed to load pusher-js:", error);
      throw error;
    }
  }
  return { Pusher, Channel };
};

class PusherService {
  private static instance: PusherService;
  private pusher: any = null;
  private channels: Map<string, any> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): PusherService {
    if (!PusherService.instance) {
      PusherService.instance = new PusherService();
    }
    return PusherService.instance;
  }

  async initialize() {
    if (this.isInitialized && this.pusher) {
      return; // Already initialized
    }

    try {
      // Lazy load Pusher
      await loadPusher();

      const token = await AsyncStorage.getItem("auth_token");

      // Try to get Pusher config from API first, fallback to env vars
      let PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY || "";
      let PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER || "eu";

      try {
        const configResponse = await fetch(
          `${API_BASE_URL}/chat/pusher/config`
        );
        if (configResponse.ok) {
          const config = await configResponse.json();
          if (config.key) PUSHER_KEY = config.key;
          if (config.cluster) PUSHER_CLUSTER = config.cluster;
        }
      } catch (error) {
        console.warn(
          "Could not fetch Pusher config from API, using env vars:",
          error
        );
      }

      if (!PUSHER_KEY) {
        console.warn(
          "⚠️  Pusher key not configured. Real-time features will be disabled."
        );
        return;
      }

      this.pusher = new Pusher(PUSHER_KEY, {
        cluster: PUSHER_CLUSTER,
        authEndpoint: `${API_BASE_URL}/chat/pusher/auth`,
        auth: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        enabledTransports: ["ws", "wss"],
      });

      this.pusher.connection.bind("connected", () => {
        console.log("✅ Pusher connected");
      });

      this.pusher.connection.bind("disconnected", () => {
        console.log("⚠️  Pusher disconnected");
      });

      this.pusher.connection.bind("error", (err: any) => {
        console.error("❌ Pusher connection error:", err);
      });

      this.pusher.connection.bind("state_change", (states: any) => {
        console.log(
          "🔄 Pusher state changed:",
          states.previous,
          "->",
          states.current
        );
      });

      this.isInitialized = true;
      console.log("✅ Pusher initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Pusher:", error);
    }
  }

  subscribeToConversation(
    conversationId: number,
    onNewMessage: (message: any) => void,
    onStatusUpdate?: (data: {
      conversationId: number;
      status: string;
      updatedAt: string;
    }) => void
  ) {
    if (!this.pusher) {
      console.warn("Pusher not initialized");
      return () => {};
    }

    const channelName = `conversation-${conversationId}`;

    // Unsubscribe if already subscribed (prevents duplicate subscriptions)
    if (this.channels.has(channelName)) {
      console.log(
        `🔄 Already subscribed to ${channelName}, unsubscribing first...`
      );
      this.unsubscribeFromConversation(conversationId);
    }

    console.log(`📡 Subscribing to ${channelName}...`);
    const channel = this.pusher.subscribe(channelName);

    // Create a wrapper to add conversation ID validation
    const messageHandler = (data: any) => {
      // Validate message has conversationId and it matches
      if (data.conversationId && data.conversationId !== conversationId) {
        console.warn(
          `⚠️ Message conversationId mismatch: expected ${conversationId}, got ${data.conversationId}`
        );
        return;
      }

      console.log(`📨 New message received on ${channelName}:`, {
        messageId: data.id,
        conversationId: data.conversationId,
        senderId: data.senderId,
      });
      onNewMessage(data);
    };

    // Handler for conversation status updates
    const statusUpdateHandler = (data: any) => {
      if (data.conversationId !== conversationId) {
        console.warn(
          `⚠️ Status update conversationId mismatch: expected ${conversationId}, got ${data.conversationId}`
        );
        return;
      }

      console.log(`🔄 Conversation status updated on ${channelName}:`, {
        conversationId: data.conversationId,
        status: data.status,
      });
      if (onStatusUpdate) {
        onStatusUpdate(data);
      }
    };

    channel.bind("new-message", messageHandler);
    channel.bind("conversation-status-updated", statusUpdateHandler);

    channel.bind("pusher:subscription_succeeded", () => {
      console.log(`✅ Successfully subscribed to ${channelName}`);
    });

    channel.bind("pusher:subscription_error", (error: any) => {
      console.error(`❌ Subscription error for ${channelName}:`, error);
    });

    this.channels.set(channelName, channel);

    // Return cleanup function
    return () => {
      console.log(`🧹 Cleaning up subscription to ${channelName}`);
      this.unsubscribeFromConversation(conversationId);
    };
  }

  unsubscribeFromConversation(conversationId: number) {
    const channelName = `conversation-${conversationId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      // Unbind all event handlers to prevent memory leaks
      channel.unbind_all();
      this.pusher?.unsubscribe(channelName);
      this.channels.delete(channelName);
      console.log(`✅ Unsubscribed from ${channelName}`);
    } else {
      console.log(`ℹ️  No active subscription found for ${channelName}`);
    }
  }

  subscribeToUserUpdates(
    userId: number,
    onConversationUpdated: (data: any) => void,
    onStatusUpdate?: (data: {
      conversationId: number;
      status: string;
      updatedAt: string;
    }) => void,
    onOrderStatusUpdate?: (data: {
      orderId: number;
      status: string;
      updatedAt: string;
    }) => void,
    onNotificationCreated?: (data: any) => void,
    onBookingCreated?: (data: any) => void,
    onBookingUpdated?: (data: any) => void,
    onBookingCancelled?: (data: any) => void
  ) {
    if (!this.pusher) {
      return () => {};
    }

    const channelName = `user-${userId}`;

    // Check if already subscribed - if so, just update handlers, don't resubscribe
    // This prevents duplicate subscriptions and logs when useEffect re-runs
    if (this.channels.has(channelName)) {
      const existingChannel = this.channels.get(channelName);

      // Store the specific handler functions so we can unbind them later
      const conversationHandler = (data: any) => {
        console.log("💬 Conversation updated:", data);
        if (data) onConversationUpdated(data);
      };

      const statusHandler = onStatusUpdate
        ? (data: any) => {
            console.log("🔄 Conversation status updated:", data);
            onStatusUpdate(data);
          }
        : null;

      const orderHandler = onOrderStatusUpdate
        ? (data: any) => {
            console.log("📦 Order status updated:", data);
            onOrderStatusUpdate(data);
          }
        : null;

      const notificationHandler = onNotificationCreated
        ? (data: any) => {
            console.log("🔔 Notification created:", data);
            onNotificationCreated(data);
          }
        : null;

      const bookingCreatedHandler = onBookingCreated
        ? (data: any) => {
            console.log("📅 Booking created:", data);
            onBookingCreated(data);
          }
        : null;

      const bookingUpdatedHandler = onBookingUpdated
        ? (data: any) => {
            console.log("📅 Booking updated:", data);
            onBookingUpdated(data);
          }
        : null;

      const bookingCancelledHandler = onBookingCancelled
        ? (data: any) => {
            console.log("📅 Booking cancelled:", data);
            onBookingCancelled(data);
          }
        : null;

      // Bind new handlers (don't unbind existing ones - they might be from other subscribers)
      existingChannel.bind("conversation-updated", conversationHandler);

      if (statusHandler) {
        existingChannel.bind("conversation-status-updated", statusHandler);
      }

      if (orderHandler) {
        existingChannel.bind("order-status-updated", orderHandler);
      }

      if (notificationHandler) {
        existingChannel.bind("notification-created", notificationHandler);
      }

      if (bookingCreatedHandler) {
        existingChannel.bind("booking-created", bookingCreatedHandler);
      }

      if (bookingUpdatedHandler) {
        existingChannel.bind("booking-updated", bookingUpdatedHandler);
      }

      if (bookingCancelledHandler) {
        existingChannel.bind("booking-cancelled", bookingCancelledHandler);
      }

      // Return cleanup function that unbinds only our specific handlers
      return () => {
        existingChannel.unbind("conversation-updated", conversationHandler);
        if (statusHandler) {
          existingChannel.unbind("conversation-status-updated", statusHandler);
        }
        if (orderHandler) {
          existingChannel.unbind("order-status-updated", orderHandler);
        }
        if (notificationHandler) {
          existingChannel.unbind("notification-created", notificationHandler);
        }
        if (bookingCreatedHandler) {
          existingChannel.unbind("booking-created", bookingCreatedHandler);
        }
        if (bookingUpdatedHandler) {
          existingChannel.unbind("booking-updated", bookingUpdatedHandler);
        }
        if (bookingCancelledHandler) {
          existingChannel.unbind("booking-cancelled", bookingCancelledHandler);
        }
      };
    }

    // New subscription - only happens once per user
    const channel = this.pusher.subscribe(channelName);

    // Store the specific handler functions so we can unbind them later
    const conversationHandler = (data: any) => {
      console.log("💬 Conversation updated:", data);
      if (data) onConversationUpdated(data);
    };

    const statusHandler = onStatusUpdate
      ? (data: any) => {
          console.log("🔄 Conversation status updated:", data);
          onStatusUpdate(data);
        }
      : null;

    const orderHandler = onOrderStatusUpdate
      ? (data: any) => {
          console.log("📦 Order status updated:", data);
          onOrderStatusUpdate(data);
        }
      : null;

    const notificationHandler = onNotificationCreated
      ? (data: any) => {
          console.log("🔔 Notification created:", data);
          onNotificationCreated(data);
        }
      : null;

    const bookingCreatedHandler = onBookingCreated
      ? (data: any) => {
          console.log("📅 Booking created:", data);
          onBookingCreated(data);
        }
      : null;

    const bookingUpdatedHandler = onBookingUpdated
      ? (data: any) => {
          console.log("📅 Booking updated:", data);
          onBookingUpdated(data);
        }
      : null;

    const bookingCancelledHandler = onBookingCancelled
      ? (data: any) => {
          console.log("📅 Booking cancelled:", data);
          onBookingCancelled(data);
        }
      : null;

    channel.bind("conversation-updated", conversationHandler);

    if (statusHandler) {
      channel.bind("conversation-status-updated", statusHandler);
    }

    if (orderHandler) {
      channel.bind("order-status-updated", orderHandler);
    }

    if (notificationHandler) {
      channel.bind("notification-created", notificationHandler);
    }

    if (bookingCreatedHandler) {
      channel.bind("booking-created", bookingCreatedHandler);
    }

    if (bookingUpdatedHandler) {
      channel.bind("booking-updated", bookingUpdatedHandler);
    }

    if (bookingCancelledHandler) {
      channel.bind("booking-cancelled", bookingCancelledHandler);
    }

    channel.bind("pusher:subscription_succeeded", () => {
      console.log(`✅ Subscribed to user-${userId}`);
    });

    channel.bind("pusher:subscription_error", (error: any) => {
      console.error(`❌ Subscription error for user-${userId}:`, error);
    });

    this.channels.set(channelName, channel);

    return () => {
      // Unbind only our specific handlers
      const channel = this.channels.get(channelName);
      if (channel) {
        channel.unbind("conversation-updated", conversationHandler);
        if (statusHandler) {
          channel.unbind("conversation-status-updated", statusHandler);
        }
        if (orderHandler) {
          channel.unbind("order-status-updated", orderHandler);
        }
        if (notificationHandler) {
          channel.unbind("notification-created", notificationHandler);
        }
        if (bookingCreatedHandler) {
          channel.unbind("booking-created", bookingCreatedHandler);
        }
        if (bookingUpdatedHandler) {
          channel.unbind("booking-updated", bookingUpdatedHandler);
        }
        if (bookingCancelledHandler) {
          channel.unbind("booking-cancelled", bookingCancelledHandler);
        }
      }
    };
  }

  /**
   * Subscribe only to notification events without affecting conversation handlers
   * Use this when you only need notification updates and don't want to interfere with chat
   */
  subscribeToNotifications(
    userId: number,
    onNotificationCreated: (data: any) => void
  ) {
    if (!this.pusher) {
      return () => {};
    }

    const channelName = `user-${userId}`;

    // Get or create the channel
    let channel = this.channels.get(channelName);

    if (!channel) {
      // Channel doesn't exist yet, create it
      channel = this.pusher.subscribe(channelName);
      this.channels.set(channelName, channel);

      channel.bind("pusher:subscription_succeeded", () => {
        console.log(`✅ Subscribed to user-${userId} (notifications only)`);
      });

      channel.bind("pusher:subscription_error", (error: any) => {
        console.error(`❌ Subscription error for user-${userId}:`, error);
      });
    }

    // Create a specific handler function for proper cleanup
    const notificationHandler = (data: any) => {
      console.log("🔔 Notification created:", data);
      onNotificationCreated(data);
    };

    // Bind to notification events
    channel.bind("notification-created", notificationHandler);

    // Return cleanup function that unbinds only this specific handler
    return () => {
      const channel = this.channels.get(channelName);
      if (channel) {
        channel.unbind("notification-created", notificationHandler);
      }
    };
  }

  disconnect() {
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
      this.channels.clear();
      this.isInitialized = false;
      console.log("✅ Pusher disconnected");
    }
  }

  isConnected(): boolean {
    return this.pusher?.connection.state === "connected";
  }
}

export const pusherService = PusherService.getInstance();
