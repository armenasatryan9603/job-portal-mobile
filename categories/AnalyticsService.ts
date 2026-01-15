/**
 * AnalyticsService - Google Analytics (Firebase Analytics) Integration
 *
 * This service provides Google Analytics tracking capabilities using Firebase Analytics.
 * Firebase Analytics is Google Analytics 4 (GA4) for mobile apps.
 */
let analytics: any = null;
let isNativeModuleAvailable: boolean = false;

// Try to import Firebase Analytics with fallback for development
try {
  analytics = require("@react-native-firebase/analytics").default;
  // Check if native module is actually available by trying to access it
  try {
    const analyticsInstance = analytics();
    isNativeModuleAvailable =
      analyticsInstance !== null && analyticsInstance !== undefined;
    if (isNativeModuleAvailable) {
      console.log("✅ Firebase Analytics loaded and native module available");
    } else {
      console.warn(
        "⚠️ Firebase Analytics JS module loaded but native module not available - rebuild required"
      );
    }
  } catch (nativeError: any) {
    console.warn(
      "⚠️ Firebase Analytics native module not available:",
      nativeError?.message || nativeError
    );
    isNativeModuleAvailable = false;
  }
} catch (error) {
  console.warn("⚠️ Firebase Analytics not available:", error);
  // Analytics will be disabled in development if Firebase is not configured
  isNativeModuleAvailable = false;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private isEnabled: boolean = false;

  private constructor() {
    this.isEnabled = analytics !== null && isNativeModuleAvailable;
    if (this.isEnabled) {
      console.log("✅ Analytics Service initialized");
    } else {
      console.warn(
        "⚠️ Analytics Service disabled (Firebase Analytics native module not available - rebuild app required)"
      );
    }
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Check if analytics is enabled and available
   */
  isAnalyticsEnabled(): boolean {
    return this.isEnabled && analytics !== null && isNativeModuleAvailable;
  }

  /**
   * Helper method to safely get analytics instance
   * Returns null if not available
   */
  private getAnalyticsInstance(): any {
    if (!this.isAnalyticsEnabled()) {
      return null;
    }
    try {
      return analytics();
    } catch (error: any) {
      if (error?.message?.includes("not installed natively")) {
        this.isEnabled = false;
        isNativeModuleAvailable = false;
      }
      return null;
    }
  }

  /**
   * Log a screen view
   * @param screenName - Name of the screen
   * @param screenClass - Optional screen class (e.g., component name)
   */
  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    const analyticsInstance = this.getAnalyticsInstance();
    if (!analyticsInstance) return;

    try {
      await analyticsInstance.logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
      console.log(`📊 Screen view logged: ${screenName}`);
    } catch (error: any) {
      if (error?.message?.includes("not installed natively")) {
        console.warn(
          "⚠️ Firebase Analytics native module not available - please rebuild the app"
        );
        this.isEnabled = false;
        isNativeModuleAvailable = false;
      } else {
        console.error("❌ Error logging screen view:", error);
      }
    }
  }

  /**
   * Log a custom event
   * @param eventName - Name of the event
   * @param parameters - Optional event parameters
   */
  async logEvent(
    eventName: string,
    parameters?: { [key: string]: any }
  ): Promise<void> {
    const analyticsInstance = this.getAnalyticsInstance();
    if (!analyticsInstance) return;

    try {
      await analyticsInstance.logEvent(eventName, parameters || {});
      console.log(`📊 Event logged: ${eventName}`, parameters || {});
    } catch (error: any) {
      if (error?.message?.includes("not installed natively")) {
        this.isEnabled = false;
        isNativeModuleAvailable = false;
        return;
      }
      console.error("❌ Error logging event:", error);
    }
  }

  /**
   * Set user property
   * @param name - Property name
   * @param value - Property value
   */
  async setUserProperty(name: string, value: string | null): Promise<void> {
    const analyticsInstance = this.getAnalyticsInstance();
    if (!analyticsInstance) return;

    try {
      await analyticsInstance.setUserProperty(name, value);
      console.log(`📊 User property set: ${name} = ${value}`);
    } catch (error: any) {
      if (error?.message?.includes("not installed natively")) {
        this.isEnabled = false;
        isNativeModuleAvailable = false;
        return;
      }
      console.error("❌ Error setting user property:", error);
    }
  }

  /**
   * Set user ID for tracking
   * @param userId - User ID (set to null to clear)
   */
  async setUserId(userId: string | null): Promise<void> {
    const analyticsInstance = this.getAnalyticsInstance();
    if (!analyticsInstance) return;

    try {
      await analyticsInstance.setUserId(userId);
      console.log(`📊 User ID set: ${userId || "cleared"}`);
    } catch (error: any) {
      if (error?.message?.includes("not installed natively")) {
        this.isEnabled = false;
        isNativeModuleAvailable = false;
        return;
      }
      console.error("❌ Error setting user ID:", error);
    }
  }

  /**
   * Set user properties in batch
   * @param properties - Object with user properties
   */
  async setUserProperties(properties: {
    [key: string]: string | null;
  }): Promise<void> {
    const analyticsInstance = this.getAnalyticsInstance();
    if (!analyticsInstance) return;

    try {
      for (const [key, value] of Object.entries(properties)) {
        await analyticsInstance.setUserProperty(key, value);
      }
      console.log(`📊 User properties set:`, properties);
    } catch (error: any) {
      if (error?.message?.includes("not installed natively")) {
        this.isEnabled = false;
        isNativeModuleAvailable = false;
        return;
      }
      console.error("❌ Error setting user properties:", error);
    }
  }

  /**
   * Reset analytics data (useful for logout)
   */
  async resetAnalyticsData(): Promise<void> {
    const analyticsInstance = this.getAnalyticsInstance();
    if (!analyticsInstance) return;

    try {
      await analyticsInstance.resetAnalyticsData();
      console.log("📊 Analytics data reset");
    } catch (error: any) {
      if (error?.message?.includes("not installed natively")) {
        this.isEnabled = false;
        isNativeModuleAvailable = false;
        return;
      }
      console.error("❌ Error resetting analytics data:", error);
    }
  }

  /**
   * Set analytics collection enabled/disabled
   * @param enabled - Whether to enable analytics collection
   */
  async setAnalyticsCollectionEnabled(enabled: boolean): Promise<void> {
    const analyticsInstance = this.getAnalyticsInstance();
    if (!analyticsInstance) return;

    try {
      await analyticsInstance.setAnalyticsCollectionEnabled(enabled);
      console.log(
        `📊 Analytics collection ${enabled ? "enabled" : "disabled"}`
      );
    } catch (error: any) {
      if (error?.message?.includes("not installed natively")) {
        this.isEnabled = false;
        isNativeModuleAvailable = false;
        return;
      }
      console.error("❌ Error setting analytics collection:", error);
    }
  }

  // ========== Predefined Event Helpers ==========

  /**
   * Track user login
   */
  async logLogin(method?: string): Promise<void> {
    await this.logEvent("login", method ? { method } : {});
  }

  /**
   * Track user signup
   */
  async logSignUp(method?: string): Promise<void> {
    await this.logEvent("sign_up", method ? { method } : {});
  }

  /**
   * Track order creation
   */
  async logOrderCreated(
    orderId: string,
    value?: number,
    currency?: string
  ): Promise<void> {
    await this.logEvent("order_created", {
      order_id: orderId,
      value,
      currency: currency || "USD",
    });
  }

  /**
   * Track order view
   */
  async logOrderViewed(orderId: string): Promise<void> {
    await this.logEvent("view_item", {
      item_id: orderId,
      item_category: "order",
    });
  }

  /**
   * Track proposal submission
   */
  async logProposalSubmitted(
    orderId: string,
    proposalId: string
  ): Promise<void> {
    await this.logEvent("proposal_submitted", {
      order_id: orderId,
      proposal_id: proposalId,
    });
  }

  /**
   * Track service view
   */
  async logServiceViewed(
    serviceId: string,
    serviceName?: string
  ): Promise<void> {
    await this.logEvent("view_item", {
      item_id: serviceId,
      item_name: serviceName,
      item_category: "service",
    });
  }

  /**
   * Track specialist profile view
   */
  async logSpecialistViewed(specialistId: string): Promise<void> {
    await this.logEvent("view_item", {
      item_id: specialistId,
      item_category: "specialist",
    });
  }

  /**
   * Track search
   */
  async logSearch(
    searchTerm: string,
    filters?: { [key: string]: any }
  ): Promise<void> {
    await this.logEvent("search", {
      search_term: searchTerm,
      ...filters,
    });
  }

  /**
   * Track payment initiated
   */
  async logPaymentInitiated(
    orderId: string,
    value: number,
    currency?: string
  ): Promise<void> {
    await this.logEvent("begin_checkout", {
      transaction_id: orderId,
      value,
      currency: currency || "USD",
    });
  }

  /**
   * Track payment completed
   */
  async logPaymentCompleted(
    orderId: string,
    value: number,
    currency?: string
  ): Promise<void> {
    await this.logEvent("purchase", {
      transaction_id: orderId,
      value,
      currency: currency || "USD",
    });
  }

  /**
   * Track chat message sent
   */
  async logChatMessageSent(conversationId: string): Promise<void> {
    await this.logEvent("chat_message_sent", {
      conversation_id: conversationId,
    });
  }

  /**
   * Track saved order
   */
  async logOrderSaved(orderId: string): Promise<void> {
    await this.logEvent("add_to_wishlist", {
      item_id: orderId,
      item_category: "order",
    });
  }

  /**
   * Track removed saved order
   */
  async logOrderUnsaved(orderId: string): Promise<void> {
    await this.logEvent("remove_from_wishlist", {
      item_id: orderId,
      item_category: "order",
    });
  }
}

export default AnalyticsService;
