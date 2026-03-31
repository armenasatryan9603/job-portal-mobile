import React from "react";
import { Platform, TextInput, TextInputProps } from "react-native";

/**
 * App-wide TextInput wrapper.
 * - Android: removes the bottom-line highlight on focus (underlineColorAndroid)
 * - Web:     removes the browser focus outline ring (outlineStyle / outlineWidth)
 */
const AppTextInput = React.forwardRef<TextInput, TextInputProps>(
  ({ style, ...props }, ref) => {
    const noFocusRing =
      Platform.OS === "web"
        ? ({ outlineStyle: "none", outlineWidth: 0 } as any)
        : undefined;

    return (
      <TextInput
        ref={ref}
        underlineColorAndroid="transparent"
        style={[noFocusRing, style]}
        {...props}
      />
    );
  }
);

AppTextInput.displayName = "AppTextInput";

export { AppTextInput };
