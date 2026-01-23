import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

interface UseFormPersistenceOptions<T> {
  storageKey: string;
  formData: T;
  onRestore: (data: T) => void;
  onClear?: () => void;
  enabled?: boolean;
  alertTitle?: string;
  alertMessage?: string;
  continueText?: string;
  startFreshText?: string;
}

export const useFormPersistence = <T extends Record<string, any>>({
  storageKey,
  formData,
  onRestore,
  onClear,
  enabled = true,
  alertTitle = "Continue Form?",
  alertMessage = "You have unsaved changes. Do you want to continue?",
  continueText = "Continue",
  startFreshText = "Start Fresh",
}: UseFormPersistenceOptions<T>) => {
  const isInitialMount = useRef(true);
  const hasRestored = useRef(false);

  // Save form data to storage when it changes
  useEffect(() => {
    if (!enabled || isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const saveData = async () => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(formData));
      } catch (error) {
        console.error("Error saving form data:", error);
      }
    };

    const timeoutId = setTimeout(saveData, 500); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [formData, storageKey, enabled]);

  // Check for saved data on mount
  useEffect(() => {
    if (!enabled || hasRestored.current) return;

    const checkSavedData = async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          Alert.alert(
            alertTitle,
            alertMessage,
            [
              {
                text: startFreshText,
                style: "cancel",
                onPress: async () => {
                  await AsyncStorage.removeItem(storageKey);
                  onClear?.();
                  hasRestored.current = true;
                },
              },
              {
                text: continueText,
                onPress: () => {
                  onRestore(parsed);
                  hasRestored.current = true;
                },
              },
            ]
          );
        }
      } catch (error) {
        console.error("Error loading saved form data:", error);
      } finally {
        hasRestored.current = true;
      }
    };

    checkSavedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearSavedData = async () => {
    try {
      await AsyncStorage.removeItem(storageKey);
      hasRestored.current = false;
    } catch (error) {
      console.error("Error clearing saved form data:", error);
    }
  };

  return { clearSavedData };
};
