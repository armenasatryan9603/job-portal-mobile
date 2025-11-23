import { useCallback, useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Custom hook that tracks keyboard visibility and provides a wrapper
 * for press handlers that dismisses keyboard first when visible.
 * 
 * This is a general solution for the entire application - when keyboard is open,
 * tapping on interactive elements (buttons, list items, etc.) will dismiss the
 * keyboard first instead of triggering the action. Users need to tap again after
 * keyboard is dismissed to trigger the action.
 * 
 * Usage:
 * ```tsx
 * const { wrapPressHandler } = useKeyboardAwarePress();
 * 
 * const handlePress = useCallback(() => {
 *   router.push('/some-route');
 * }, []);
 * 
 * const wrappedHandlePress = wrapPressHandler(handlePress);
 * 
 * <TouchableOpacity onPress={wrappedHandlePress}>...</TouchableOpacity>
 * ```
 * 
 * Or inline:
 * ```tsx
 * const { wrapPressHandler } = useKeyboardAwarePress();
 * 
 * <TouchableOpacity onPress={wrapPressHandler(() => {
 *   router.push('/some-route');
 * })}>...</TouchableOpacity>
 * ```
 */
export const useKeyboardAwarePress = () => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Track keyboard visibility
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setIsKeyboardVisible(true);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  /**
   * Wraps a press handler to dismiss keyboard first if visible
   * @param handler - The original press handler function
   * @returns A new handler that checks keyboard visibility first
   */
  const wrapPressHandler = useCallback(
    <T extends (...args: any[]) => any>(handler: T): T => {
      return ((...args: Parameters<T>) => {
        // If keyboard is visible, dismiss it and prevent the action
        if (isKeyboardVisible) {
          Keyboard.dismiss();
          return;
        }
        // Otherwise, execute the original handler
        return handler(...args);
      }) as T;
    },
    [isKeyboardVisible]
  );

  return {
    isKeyboardVisible,
    wrapPressHandler,
  };
};

