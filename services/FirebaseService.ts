import { initializeApp, getApps } from "@react-native-firebase/app";

class FirebaseService {
  private static instance: FirebaseService;
  private app: any = null;

  private constructor() {
    this.initializeFirebase();
  }

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  private initializeFirebase() {
    try {
      if (getApps().length === 0) {
        this.app = initializeApp({
          apiKey: "AIzaSyBSQEhsGpU5-ZZk6MPrSvFTlCKlxD1_PMg",
          appId: "1:195669708353:ios:76371cf1d89c3ff84780c0",
          projectId: "job-portal-mobile",
          storageBucket: "job-portal-mobile.firebasestorage.app",
          messagingSenderId: "195669708353",
          measurementId: "G-1234567890",
          databaseURL: "https://job-portal-mobile-default-rtdb.firebaseio.com",
        });
        console.log("✅ Firebase initialized successfully");
      } else {
        this.app = getApps()[0];
        console.log("✅ Firebase app already initialized");
      }
    } catch (error) {
      console.error("❌ Firebase initialization failed:", error);
      this.app = null;
    }
  }

  getApp() {
    return this.app;
  }

  isInitialized() {
    return this.app !== null;
  }
}

export default FirebaseService;
