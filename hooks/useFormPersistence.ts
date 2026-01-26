import { useEffect, useRef } from "react";

import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UseFormPersistenceOptions<T> {
  storageKey: string;
  formData: T;
  defaultData?: T;
  onRestore: (data: T) => void;
  onClear?: () => void;
  enabled?: boolean;
  alertTitle?: string;
  alertMessage?: string;
  continueText?: string;
  startFreshText?: string;
}

// Deep comparison function to check if two values are equal
const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== "object") {
    // For primitives, do strict comparison
    if (typeof a === "string") {
      return a.trim() === (typeof b === "string" ? b.trim() : b);
    }
    return a === b;
  }
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  // For objects, compare all keys
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every((key) => deepEqual(a[key], b[key]));
};

// Helper function to check if data differs from defaults
const differsFromDefaults = <T>(data: T, defaultData?: T): boolean => {
  if (!defaultData) {
    // If no defaults provided, use the old hasMeaningfulData logic
    return hasMeaningfulData(data);
  }
  
  return !deepEqual(data, defaultData);
};

// Helper function to check if saved data has meaningful content (fallback)
const hasMeaningfulData = (data: any): boolean => {
  if (data === null || data === undefined) return false;
  
  if (typeof data === "string") {
    return data.trim().length > 0;
  }
  
  if (typeof data === "number") {
    return data !== 0;
  }
  
  if (typeof data === "boolean") {
    // Booleans are considered meaningful
    return true;
  }
  
  if (Array.isArray(data)) {
    return data.length > 0 && data.some((item) => hasMeaningfulData(item));
  }
  
  if (typeof data === "object") {
    // Check if object has any meaningful properties
    return Object.values(data).some((value) => hasMeaningfulData(value));
  }
  
  return false;
};

export const useFormPersistence = <T extends Record<string, any>>({
  storageKey,
  formData,
  defaultData,
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

  // Save form data to storage when it changes (only if it differs from defaults)
  useEffect(() => {
    if (!enabled || isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only save if data differs from defaults
    if (!differsFromDefaults(formData, defaultData)) {
      // If data matches defaults, remove any saved data
      AsyncStorage.removeItem(storageKey).catch((error) => {
        console.error("Error removing default form data:", error);
      });
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
  }, [formData, defaultData, storageKey, enabled]);

  // Check for saved data on mount
  useEffect(() => {
    if (!enabled || hasRestored.current) return;

    const checkSavedData = async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Only show alert if data differs from defaults
          if (differsFromDefaults(parsed, defaultData)) {
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
          } else {
            // If data matches defaults, clear it silently
            await AsyncStorage.removeItem(storageKey);
            hasRestored.current = true;
          }
        } else {
          hasRestored.current = true;
        }
      } catch (error) {
        console.error("Error loading saved form data:", error);
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
