// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<
  SymbolViewProps["name"],
  ComponentProps<typeof MaterialIcons>["name"]
>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "gearshape.fill": "settings",
  "gear.circle.fill": "settings",
  "list.bullet": "list",
  "person.2.fill": "group",
  // Header and navigation icons
  "line.3.horizontal": "menu",
  bell: "notifications",
  "bell.fill": "notifications",
  message: "message",
  "message.fill": "message",
  xmark: "close",
  "xmark.circle": "cancel",
  "chevron.left": "chevron-left",
  // User and profile icons
  "person.fill": "person",
  "person.badge.plus": "person-add",
  // Menu and action icons
  "doc.text.fill": "description",
  "briefcase.fill": "work",
  "questionmark.circle.fill": "help",
  "rectangle.portrait.and.arrow.right": "logout",
  // Location and map icons
  "location.fill": "location-on",
  map: "map",
  magnifyingglass: "search",
  // Filter icons
  "slider.horizontal.3": "tune",
  "line.3.horizontal.decrease": "tune",
  // Star rating icons
  "star.fill": "star",
  star: "star-border",
  // Action icons
  "plus.circle.fill": "add-circle",
  plus: "add",
  checkmark: "check",
  "checkmark.circle": "check-circle",
  "checkmark.circle.fill": "check-circle",
  trash: "delete",
  "trash.fill": "delete",
  "camera.fill": "camera-alt",
  photo: "photo",
  "photo.fill": "photo",
  doc: "description",
  calendar: "event",
  "clock.fill": "schedule",
  "phone.fill": "phone",
  pencil: "edit",
  "arrow.right": "arrow-forward",
  "arrow.up": "arrow-upward",
  "doc.on.doc": "content-copy",
  // Settings icons
  "moon.fill": "dark-mode",
  globe: "language",
  "gift.fill": "card-giftcard",
  "lock.fill": "lock",
  "creditcard.fill": "credit-card",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const materialIconName = MAPPING[name] || "help-outline"; // Fallback icon
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={materialIconName}
      style={style}
    />
  );
}
