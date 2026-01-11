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
    }) => void
  ) {
    if (!this.pusher) {
      return () => {};
    }

    const channelName = `user-${userId}`;

    // Check if already subscribed - if so, just update handlers, don't resubscribe
    // This prevents duplicate subscriptions and logs when useEffect re-runs
    if (this.channels.has(channelName)) {
      const existingChannel = this.channels.get(channelName);

      // Unbind old handlers and bind new ones
      existingChannel.unbind("conversation-updated");
      existingChannel.unbind("conversation-status-updated");
      existingChannel.unbind("order-status-updated");

      existingChannel.bind("conversation-updated", (data: any) => {
        console.log("💬 Conversation updated:", data);
        if (data) onConversationUpdated(data);
      });

      if (onStatusUpdate) {
        existingChannel.bind("conversation-status-updated", (data: any) => {
          console.log("🔄 Conversation status updated:", data);
          onStatusUpdate(data);
        });
      }

      if (onOrderStatusUpdate) {
        existingChannel.bind("order-status-updated", (data: any) => {
          console.log("📦 Order status updated:", data);
          onOrderStatusUpdate(data);
        });
      }

      // Return cleanup function that doesn't unsubscribe (since we're reusing the channel)
      // The channel will only be unsubscribed when the component fully unmounts
      return () => {
        // Just unbind handlers, don't unsubscribe the channel
        // This prevents the subscription_succeeded event from firing again
        existingChannel.unbind("conversation-updated");
        existingChannel.unbind("conversation-status-updated");
        existingChannel.unbind("order-status-updated");
      };
    }

    // New subscription - only happens once per user
    const channel = this.pusher.subscribe(channelName);

    channel.bind("conversation-updated", (data: any) => {
      console.log("💬 Conversation updated:", data);
      if (data) onConversationUpdated(data);
    });

    if (onStatusUpdate) {
      channel.bind("conversation-status-updated", (data: any) => {
        console.log("🔄 Conversation status updated:", data);
        onStatusUpdate(data);
      });
    }

    if (onOrderStatusUpdate) {
      channel.bind("order-status-updated", (data: any) => {
        console.log("📦 Order status updated:", data);
        onOrderStatusUpdate(data);
      });
    }

    channel.bind("pusher:subscription_succeeded", () => {
      console.log(`✅ Subscribed to user-${userId}`);
    });

    channel.bind("pusher:subscription_error", (error: any) => {
      console.error(`❌ Subscription error for user-${userId}:`, error);
    });

    this.channels.set(channelName, channel);

    return () => {
      // Only unsubscribe if this is the last handler (when component unmounts)
      // For now, we'll keep the channel subscribed and just unbind handlers
      // The channel will be cleaned up when Pusher disconnects
      const channel = this.channels.get(channelName);
      if (channel) {
        channel.unbind("conversation-updated");
        channel.unbind("conversation-status-updated");
        channel.unbind("order-status-updated");
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
