import FirebaseService from "@/services/FirebaseService";

// Firebase configuration
// Use FirebaseService for reliable initialization

const firebaseService = FirebaseService.getInstance();
const app = firebaseService.getApp();

export default app;
