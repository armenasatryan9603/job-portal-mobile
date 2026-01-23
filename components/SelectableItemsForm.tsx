import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ThemeColors, Typography } from "@/constants/styles";

import { IconSymbol } from "./ui/icon-symbol";
import { ResponsiveCard } from "./ResponsiveContainer";
import { SkillDescriptionModal } from "./SkillDescriptionModal";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";

// Generic item interface
export interface SelectableItem {
  id: number | string;
  name: string;
  nameEn?: string;
  nameRu?: string;
  nameHy?: string;
  [key: string]: any;
}

interface ItemBadge {
  id: number | null;
  name: string;
  itemId?: number | string;
}

interface SelectableItemsFormProps {
  title: string;
  placeholder?: string;
  items: SelectableItem[];
  selectedItems?: string | SelectableItem | SelectableItem[];
  errors?: { [key: string]: string };
  errorKey?: string;
  multi?: boolean;
  allowCreate?: boolean;
  showDescription?: boolean;
  onSelectionChange: (selected: string | SelectableItem | SelectableItem[]) => void;
  onItemIdsChange?: (itemIds: (number | string)[], newItemNames?: string[]) => void;
  getItemName?: (item: SelectableItem) => string;
  filterItems?: (items: SelectableItem[], query: string) => SelectableItem[];
  maxItems?: number;
  containerStyle?: any;
  hideCard?: boolean;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
}

export const SelectableItemsForm: React.FC<SelectableItemsFormProps> = ({
  title,
  placeholder,
  items = [],
  selectedItems = "",
  errors = {},
  errorKey = "items",
  multi = true,
  allowCreate = true,
  showDescription = false,
  onSelectionChange,
  onItemIdsChange,
  getItemName,
  filterItems,
  maxItems,
  containerStyle,
  hideCard = false,
  onInputFocus,
  onInputBlur,
}) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  // Get display name for an item
  const getDisplayName = useCallback((item: SelectableItem): string => {
    if (getItemName) return getItemName(item);
    switch (language) {
      case "ru": return item.nameRu || item.name;
      case "hy": return item.nameHy || item.name;
      default: return item.nameEn || item.name;
    }
  }, [getItemName, language]);

  // Check if item is already selected
  const isItemSelected = useCallback((item: SelectableItem, badges: ItemBadge[]): boolean => {
    return badges.some(
      (badge) =>
        badge.itemId === item.id ||
        getDisplayName(item).toLowerCase() === badge.name.toLowerCase()
    );
  }, [getDisplayName]);

  // Convert selectedItems to array of badges
  const getInitialBadges = useCallback((): ItemBadge[] => {
    if (!selectedItems || selectedItems === "") return [];
    
    if (typeof selectedItems === "string") {
      const itemsArray = selectedItems.split(",").map((s) => s.trim()).filter(Boolean);
      if (itemsArray.length === 0) return [];
      
      return itemsArray.map((name, index) => {
        const matchedItem = items.find((item) => {
          return getDisplayName(item).toLowerCase().trim() === name.toLowerCase().trim();
        });
        return {
          id: Date.now() + index,
          name: name.trim(),
          itemId: matchedItem?.id,
        };
      });
    }
    
    if (Array.isArray(selectedItems)) {
      if (selectedItems.length === 0) return [];
      return selectedItems.map((item, index) => ({
        id: Date.now() + index,
        name: getDisplayName(item),
        itemId: item.id,
      }));
    }
    
    if (typeof selectedItems === "object" && selectedItems !== null) {
      const item = selectedItems as SelectableItem;
      if (!item || (!item.id && !item.name)) return [];
      return [{
        id: Date.now(),
        name: getDisplayName(item),
        itemId: item.id,
      }];
    }
    
    return [];
  }, [selectedItems, items, getDisplayName]);

  const [itemBadges, setItemBadges] = useState<ItemBadge[]>(getInitialBadges);
  const [currentInput, setCurrentInput] = useState<string>("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SelectableItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | string | null>(null);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const isSelectingSuggestionRef = useRef(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNotifiedBadgesRef = useRef<string>("");
  const lastSyncedBadgesRef = useRef<string>("");
  const onItemIdsChangeRef = useRef(onItemIdsChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const getDisplayNameRef = useRef(getDisplayName);
  const lastSuggestionsKeyRef = useRef<string>("");

  // Sync badges when selectedItems changes externally
  useEffect(() => {
    try {
      const newBadges = getInitialBadges();
      const newKey = newBadges.map((b) => b.name.trim().toLowerCase()).sort().join(",");
      
      // Only update if keys are different to prevent infinite loop
      if (lastSyncedBadgesRef.current !== newKey) {
        lastSyncedBadgesRef.current = newKey;
        setItemBadges(newBadges);
      }
    } catch (error) {
      console.warn("Error syncing badges:", error);
      setItemBadges([]);
      lastSyncedBadgesRef.current = "";
    }
    // getInitialBadges is stable (useCallback), so we don't need it in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItems, items, language]);

  // Keep refs updated
  useEffect(() => {
    onItemIdsChangeRef.current = onItemIdsChange;
    onSelectionChangeRef.current = onSelectionChange;
    getDisplayNameRef.current = getDisplayName;
  }, [onItemIdsChange, onSelectionChange, getDisplayName]);

  // Filter items for suggestions
  const filterSuggestions = useCallback((query: string, badges: ItemBadge[]): SelectableItem[] => {
    let filtered: SelectableItem[];
    
    if (query.length === 0) {
      // Show all items, filtering out selected ones in multi mode
      filtered = multi
        ? items.filter((item) => !isItemSelected(item, badges))
        : items;
    } else {
      // Filter based on query
      if (filterItems) {
        filtered = filterItems(items, query);
      } else {
        // Default filter: search in all name fields
        const queryLower = query.toLowerCase();
        filtered = items.filter((item) => {
          const nameEn = (item.nameEn || item.name || "").toLowerCase();
          const nameRu = (item.nameRu || item.name || "").toLowerCase();
          const nameHy = (item.nameHy || item.name || "").toLowerCase();
          const displayName = getDisplayName(item).toLowerCase();
          return (
            nameEn.includes(queryLower) ||
            nameRu.includes(queryLower) ||
            nameHy.includes(queryLower) ||
            displayName.includes(queryLower)
          );
        });
      }
      
      // Filter out already selected items in multi mode
      if (multi) {
        filtered = filtered.filter((item) => !isItemSelected(item, badges));
      }
    }
    
    return filtered.slice(0, 8);
  }, [items, multi, filterItems, isItemSelected, getDisplayName]);

  // Update suggestions when input or focus changes
  useEffect(() => {
    if (isInputFocused) {
      const query = currentInput.trim().toLowerCase();
      const filtered = filterSuggestions(query, itemBadges);
      const suggestionsKey = filtered.map((item) => item.id).join(",");
      
      // Always update suggestions when focused, even if key is the same
      // This ensures suggestions show up after clicking again
      lastSuggestionsKeyRef.current = suggestionsKey;
      setSuggestions(filtered);
      // Always show suggestions when input is focused (if there are any)
      setShowSuggestions(filtered.length > 0 || query.length > 0);
    } else {
      if (!currentInput || currentInput.trim().length === 0) {
        setShowSuggestions(false);
        setSuggestions([]);
        return;
      }
      
      const filtered = filterSuggestions(currentInput.trim().toLowerCase(), itemBadges);
      const suggestionsKey = filtered.map((item) => item.id).join(",");
      
      if (suggestionsKey !== lastSuggestionsKeyRef.current) {
        lastSuggestionsKeyRef.current = suggestionsKey;
        setSuggestions(filtered);
      }
      setShowSuggestions(filtered.length > 0);
    }
  }, [currentInput, isInputFocused, itemBadges, filterSuggestions]);

  // Notify parent when badges change
  useEffect(() => {
    const badgesKey = itemBadges.length === 0
      ? "empty"
      : itemBadges
          .map((b) => `${b.itemId || "new"}:${b.name}`)
          .sort()
          .join("|");

    if (badgesKey === lastNotifiedBadgesRef.current) return;
    lastNotifiedBadgesRef.current = badgesKey;

    if (multi) {
      const itemNames = itemBadges
        .filter((b) => b.name.trim().length > 0)
        .map((b) => b.name.trim());
      
      onSelectionChangeRef.current(itemNames.join(", "));

      if (onItemIdsChangeRef.current) {
        const itemIds = itemBadges
          .filter((b) => b.itemId !== undefined)
          .map((b) => b.itemId!);
        const newItemNames = itemBadges
          .filter((b) => b.itemId === undefined && b.name.trim().length > 0)
          .map((b) => b.name.trim());

        setTimeout(() => {
          onItemIdsChangeRef.current?.(itemIds, newItemNames.length > 0 ? newItemNames : undefined);
        }, 0);
      }
    } else {
      if (itemBadges.length === 0) {
        onSelectionChangeRef.current("");
      } else {
        const selectedBadge = itemBadges[0];
        const fullItem = items.find((item) => {
          if (selectedBadge.itemId !== undefined) {
            return item.id === selectedBadge.itemId;
          }
          return getDisplayNameRef.current(item).toLowerCase().trim() === selectedBadge.name.toLowerCase().trim();
        });
        
        onSelectionChangeRef.current(fullItem || selectedBadge.name);
      }
    }
  }, [itemBadges, multi, items]);

  // Create a new badge
  const createBadge = useCallback((name: string, itemId?: number | string): ItemBadge => {
    return {
      id: Date.now(),
      name: name.trim(),
      itemId,
    };
  }, []);

  // Handle selecting an item from suggestions
  const handleSelectSuggestion = useCallback((item: SelectableItem) => {
    isSelectingSuggestionRef.current = true;
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    const itemName = getDisplayName(item);
    setCurrentInput("");
    setShowSuggestions(false);
    setIsInputFocused(false);

    if (multi) {
      // Check if already exists or max items reached
      if (isItemSelected(item, itemBadges) || (maxItems && itemBadges.length >= maxItems)) {
        setTimeout(() => { isSelectingSuggestionRef.current = false; }, 300);
        inputRef.current?.blur();
        return;
      }
      setItemBadges([...itemBadges, createBadge(itemName, item.id)]);
    } else {
      setItemBadges([createBadge(itemName, item.id)]);
    }

    setTimeout(() => { isSelectingSuggestionRef.current = false; }, 300);
    inputRef.current?.blur();
  }, [multi, itemBadges, maxItems, isItemSelected, createBadge, getDisplayName]);

  // Handle creating a new item
  const handleCreateNewItem = useCallback(() => {
    const inputValue = currentInput?.trim() || "";
    if (!inputValue || !allowCreate) return;

    // Check if already exists
    if (itemBadges.some((b) => b.name.toLowerCase() === inputValue.toLowerCase())) {
      setCurrentInput("");
      return;
    }

    // Check if it exactly matches any existing item
    const exactMatch = items.find((item) => {
      return getDisplayName(item).toLowerCase() === inputValue.toLowerCase();
    });

    if (exactMatch) {
      handleSelectSuggestion(exactMatch);
      return;
    }

    // Check max items limit
    if (maxItems && itemBadges.length >= maxItems) {
      setCurrentInput("");
      return;
    }

    // Create new item
    const newBadge = createBadge(inputValue);
    setItemBadges(multi ? [...itemBadges, newBadge] : [newBadge]);
    setCurrentInput("");
    setShowSuggestions(false);
    setIsInputFocused(false);
    
    setTimeout(() => { isSelectingSuggestionRef.current = false; }, 300);
  }, [currentInput, allowCreate, itemBadges, items, maxItems, multi, createBadge, handleSelectSuggestion, getDisplayName]);

  // Handle input change
  const handleInputChange = (value: string) => {
    setCurrentInput(value);
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsInputFocused(true);
    onInputFocus?.();
    setTimeout(() => {
      const query = currentInput.trim().toLowerCase();
      const filtered = filterSuggestions(query, itemBadges);
      const suggestionsKey = filtered.map((item) => item.id).join(",");
      lastSuggestionsKeyRef.current = suggestionsKey;
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    }, 0);
  };

  // Handle input blur
  const handleInputBlur = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      if (!isSelectingSuggestionRef.current) {
        setIsInputFocused(false);
        onInputBlur?.();
      }
    }, 200);
  };

  // Handle clicking outside to close suggestions
  const handleOutsidePress = () => {
    if (showSuggestions) {
      setShowSuggestions(false);
      setIsInputFocused(false);
      inputRef.current?.blur();
    }
  };

  // Handle submitting input
  const handleSubmitEditing = () => {
    const inputValue = currentInput?.trim() || "";
    if (inputValue) {
      const exactMatch = suggestions.find((item) => {
        return getDisplayName(item).toLowerCase() === inputValue.toLowerCase();
      });
      
      if (exactMatch) {
        handleSelectSuggestion(exactMatch);
      } else if (allowCreate) {
        handleCreateNewItem();
      }
    } else if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
    }
  };

  // Handle deleting a badge
  const handleBadgeDelete = (index: number, e: any) => {
    e?.stopPropagation();
    if (!multi) return;
    setItemBadges(itemBadges.filter((_, i) => i !== index));
  };

  // Handle long press on badge to show description
  const handleBadgeLongPress = (badge: ItemBadge) => {
    if (showDescription && badge.itemId) {
      setSelectedItemId(badge.itemId as number);
      setShowDescriptionModal(true);
    }
  };

  // Focus input when container is pressed
  const handleContainerPress = () => {
    if (!multi || itemBadges.length === 0 || (!maxItems || itemBadges.length < maxItems)) {
      // Focus the input - handleInputFocus will be called by the onFocus event
      inputRef.current?.focus();
      // Also explicitly show suggestions in case input is already focused
      if (isInputFocused) {
        const query = currentInput.trim().toLowerCase();
        const filtered = filterSuggestions(query, itemBadges);
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      }
    }
  };

  // Check if create button should be shown
  const shouldShowCreateButton = (): boolean => {
    const inputValue = currentInput?.trim() || "";
    if (!inputValue || !allowCreate) return false;
    
    const inputLower = inputValue.toLowerCase();
    const exactMatch = items.some((item) => {
      return getDisplayName(item).toLowerCase() === inputLower;
    });
    const matchesSelected = itemBadges.some(
      (badge) => badge.name.toLowerCase() === inputLower
    );
    
    return !exactMatch && !matchesSelected;
  };

  const inputBorderColor = errors[errorKey] ? "#ff4444" : colors.border;
    
  const content = (
    <>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {title}
      </Text>

      <Pressable
        onPress={handleContainerPress}
        onPressIn={() => {
          // Ensure input gets focus when container is pressed
          if (!isInputFocused && (!maxItems || itemBadges.length < maxItems)) {
            inputRef.current?.focus();
          }
        }}
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.background,
            borderColor: inputBorderColor,
          },
          containerStyle,
        ]}
      >
        <View style={styles.badgesContainer}>
          {itemBadges.map((badge, index) => (
            <Pressable
              key={badge.id || index}
              style={[
                styles.itemBadge,
                {
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.05)",
                },
              ]}
              onLongPress={() => handleBadgeLongPress(badge)}
            >
              <Text
                style={[styles.itemBadgeText, { color: colors.text }]}
                numberOfLines={1}
              >
                {badge.name}
              </Text>
              {multi && (
                <Pressable
                  onPress={(e) => handleBadgeDelete(index, e)}
                  style={styles.deleteButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IconSymbol
                    name="xmark.circle.fill"
                    size={16}
                    color={colors.tabIconDefault}
                  />
                </Pressable>
              )}
            </Pressable>
          ))}

          {(!maxItems || itemBadges.length < maxItems) && (
            <TextInput
              ref={inputRef}
              style={[styles.itemInput, { color: colors.text }]}
              value={currentInput}
              onChangeText={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onSubmitEditing={handleSubmitEditing}
              placeholder={placeholder || t("addItem") || "Add item..."}
              placeholderTextColor={colors.tabIconDefault}
              maxLength={50}
              returnKeyType="done"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="none"
            />
          )}
        </View>
      </Pressable>

      {showSuggestions && (
        <>
          <Pressable style={styles.backdrop} onPress={handleOutsidePress} />
          <Pressable
            onPressIn={() => {
              isSelectingSuggestionRef.current = true;
              if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
                blurTimeoutRef.current = null;
              }
            }}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.suggestionsContainer,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                shadowColor: "#000",
              },
            ]}
          >
            {suggestions.length > 0 ? (
              suggestions.map((item) => (
                <Pressable
                  key={item.id.toString()}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    pressed && {
                      backgroundColor:
                        colorScheme === "dark"
                          ? "rgba(255, 255, 255, 0.1)"
                          : "rgba(0, 0, 0, 0.05)",
                    },
                  ]}
                  onPress={() => handleSelectSuggestion(item)}
                  onPressIn={() => {
                    isSelectingSuggestionRef.current = true;
                    if (blurTimeoutRef.current) {
                      clearTimeout(blurTimeoutRef.current);
                      blurTimeoutRef.current = null;
                    }
                  }}
                >
                  <IconSymbol
                    name="checkmark.circle"
                    size={18}
                    color={colors.tint}
                    style={styles.suggestionIcon}
                  />
                  <Text style={[styles.suggestionText, { color: colors.text }]}>
                    {getDisplayName(item)}
                  </Text>
                </Pressable>
              ))
            ) : shouldShowCreateButton() ? (
              <Pressable
                style={({ pressed }) => [
                  styles.suggestionItem,
                  styles.createSuggestionItem,
                  pressed && {
                    backgroundColor:
                      colorScheme === "dark"
                        ? "rgba(0, 122, 255, 0.2)"
                        : "rgba(0, 122, 255, 0.1)",
                  },
                ]}
                onPress={handleCreateNewItem}
                onPressIn={() => {
                  isSelectingSuggestionRef.current = true;
                  if (blurTimeoutRef.current) {
                    clearTimeout(blurTimeoutRef.current);
                    blurTimeoutRef.current = null;
                  }
                }}
              >
                <IconSymbol
                  name="plus.circle.fill"
                  size={18}
                  color={colors.tint}
                  style={styles.suggestionIcon}
                />
                <Text style={[styles.suggestionText, { color: colors.tint, fontWeight: "600" }]}>
                  {t("createItem") || "Create"} "{currentInput.trim()}"
                </Text>
              </Pressable>
            ) : null}
          </Pressable>
        </>
      )}

      {errors[errorKey] && (
        <Text style={[styles.errorText, { color: "#ff4444" }]}>
          {errors[errorKey]}
        </Text>
      )}

      {showDescription && (
        <SkillDescriptionModal
          visible={showDescriptionModal}
          skillId={selectedItemId as number}
          onClose={() => {
            setShowDescriptionModal(false);
            setSelectedItemId(null);
          }}
        />
      )}
    </>
  );

  if (hideCard) {
    return <View>{content}</View>;
  }

  return <ResponsiveCard>{content}</ResponsiveCard>;
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.bold,
    marginBottom: 12,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    // gap: 8,
    flex: 1,
    alignItems: "center",
  },
  itemBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    // gap: 6,
    maxWidth: "100%",
  },
  itemBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
  deleteButton: {
    padding: 2,
    marginLeft: -2,
  },
  itemInput: {
    fontSize: 15,
    fontWeight: "500",
    padding: 0,
    margin: 0,
    minWidth: 100,
    flex: 1,
  },
  suggestionsContainer: {
    maxHeight: 240,
    borderRadius: 12,
    marginTop: 4,
    overflow: "hidden",
    borderWidth: 1,
    zIndex: 999,
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  createSuggestionItem: {
    borderBottomWidth: 2,
    borderBottomColor: "rgba(0, 122, 255, 0.3)",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
    backgroundColor: "transparent",
  },
  errorText: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: "500",
  },
});
