import AsyncStorage from "@react-native-async-storage/async-storage";

const REFERRAL_CODE_KEY = "pending_referral_code";

/**
 * Store a referral code to be applied during signup
 */
export async function storeReferralCode(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(REFERRAL_CODE_KEY, code);
    console.log(`✅ Stored referral code: ${code}`);
  } catch (error) {
    console.error("❌ Error storing referral code:", error);
  }
}

/**
 * Get and clear the stored referral code
 * This should be called once during signup to apply the code
 */
export async function getAndClearReferralCode(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(REFERRAL_CODE_KEY);
    if (code) {
      await AsyncStorage.removeItem(REFERRAL_CODE_KEY);
      console.log(`✅ Retrieved and cleared referral code: ${code}`);
    }
    return code;
  } catch (error) {
    console.error("❌ Error getting referral code:", error);
    return null;
  }
}

/**
 * Get the stored referral code without clearing it
 */
export async function getReferralCode(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(REFERRAL_CODE_KEY);
    return code;
  } catch (error) {
    console.error("❌ Error getting referral code:", error);
    return null;
  }
}

/**
 * Clear the stored referral code
 */
export async function clearReferralCode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(REFERRAL_CODE_KEY);
    console.log("✅ Cleared referral code");
  } catch (error) {
    console.error("❌ Error clearing referral code:", error);
  }
}

