/**
 * FirebaseService - Minimal Firebase initialization for FCM only
 * 
 * NOTE: This service is kept for backward compatibility but is no longer needed.
 * Firebase Messaging auto-initializes when @react-native-firebase/messaging is used.
 * 
 * We only use Firebase Cloud Messaging (FCM) for push notifications.
 * Other Firebase services (Storage, Database, Analytics) are disabled to reduce costs.
 */
import { getApps } from "@react-native-firebase/app";

class FirebaseService {
  private static instance: FirebaseService;
  private app: any = null;

  private constructor() {
    // Firebase Messaging auto-initializes, so we just check if it's available
    try {
      const apps = getApps();
      if (apps.length > 0) {
        this.app = apps[0];
        console.log("✅ Firebase app available (auto-initialized by messaging)");
      } else {
        console.log("⚠️ Firebase app not yet initialized (will be auto-initialized by messaging)");
      }
    } catch (error) {
      console.warn("⚠️ Firebase check failed:", error);
      this.app = null;
    }
  }

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  getApp() {
    return this.app;
  }

  isInitialized() {
    return this.app !== null;
  }
}

export default FirebaseService;
