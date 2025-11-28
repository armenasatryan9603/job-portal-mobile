import AsyncStorage from "@react-native-async-storage/async-storage";

const VIEWED_ORDERS_KEY = "viewed_orders";

/**
 * Mark an order as viewed
 */
export async function markOrderAsViewed(orderId: number): Promise<void> {
  try {
    const viewedOrders = await getViewedOrders();
    if (!viewedOrders.has(orderId)) {
      viewedOrders.add(orderId);
      await AsyncStorage.setItem(
        VIEWED_ORDERS_KEY,
        JSON.stringify(Array.from(viewedOrders))
      );
      console.log(`✅ Marked order ${orderId} as viewed`);
    }
  } catch (error) {
    console.error("❌ Error marking order as viewed:", error);
  }
}

/**
 * Get all viewed order IDs
 */
export async function getViewedOrders(): Promise<Set<number>> {
  try {
    const data = await AsyncStorage.getItem(VIEWED_ORDERS_KEY);
    if (data) {
      const orderIds = JSON.parse(data) as number[];
      return new Set(orderIds);
    }
    return new Set<number>();
  } catch (error) {
    console.error("❌ Error getting viewed orders:", error);
    return new Set<number>();
  }
}

/**
 * Check if an order has been viewed
 */
export async function isOrderViewed(orderId: number): Promise<boolean> {
  try {
    const viewedOrders = await getViewedOrders();
    return viewedOrders.has(orderId);
  } catch (error) {
    console.error("❌ Error checking if order is viewed:", error);
    return false;
  }
}

/**
 * Clear all viewed orders (useful for testing or reset)
 */
export async function clearViewedOrders(): Promise<void> {
  try {
    await AsyncStorage.removeItem(VIEWED_ORDERS_KEY);
    console.log("✅ Cleared all viewed orders");
  } catch (error) {
    console.error("❌ Error clearing viewed orders:", error);
  }
}



