import Pusher, { Channel } from "pusher-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/config/api";

class PusherService {
  private static instance: PusherService;
  private pusher: Pusher | null = null;
  private channels: Map<string, Channel> = new Map();
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
    onNewMessage: (message: any) => void
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

    channel.bind("new-message", messageHandler);

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
    onConversationUpdated: (data: any) => void
  ) {
    if (!this.pusher) {
      return () => {};
    }

    const channelName = `user-${userId}`;

    // Unsubscribe if already subscribed
    if (this.channels.has(channelName)) {
      this.pusher.unsubscribe(channelName);
    }

    const channel = this.pusher.subscribe(channelName);

    channel.bind("conversation-updated", (data: any) => {
      console.log("💬 Conversation updated:", data);
      onConversationUpdated(data);
    });

    channel.bind("pusher:subscription_succeeded", () => {
      console.log(`✅ Subscribed to user-${userId}`);
    });

    this.channels.set(channelName, channel);

    return () => {
      this.pusher?.unsubscribe(channelName);
      this.channels.delete(channelName);
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
