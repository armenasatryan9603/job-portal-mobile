import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  // Normalize selectedItems to a stable string for comparison
  const normalizeSelectedItems = useCallback((selected: string | SelectableItem | SelectableItem[]): string => {
    if (!selected || selected === "") return "";
    if (typeof selected === "string") {
      return selected.split(",").map((s) => s.trim()).filter(Boolean).sort().join(", ");
    }
    if (Array.isArray(selected)) {
      return selected.map(item => getDisplayName(item).trim()).sort().join(", ");
    }
    return getDisplayName(selected).trim();
  }, [getDisplayName]);

  // Memoize normalized selectedItems to detect actual changes
  const normalizedSelectedItems = useMemo(() => {
    return normalizeSelectedItems(selectedItems);
  }, [selectedItems, normalizeSelectedItems]);

  const initialBadges = getInitialBadges();
  const [itemBadges, setItemBadges] = useState<ItemBadge[]>(initialBadges);
  const itemBadgesRef = useRef<ItemBadge[]>(initialBadges);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<number | string | null>(null);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const lastSyncedSelectedItemsRef = useRef<string>(normalizedSelectedItems);
  const isSyncingFromPropsRef = useRef<boolean>(false);
  
  // Keep ref in sync with itemBadges
  useEffect(() => {
    itemBadgesRef.current = itemBadges;
  }, [itemBadges]);

  // Sync badges when normalized selectedItems changes
  useEffect(() => {
    // Only sync if the normalized selectedItems value actually changed
    if (lastSyncedSelectedItemsRef.current === normalizedSelectedItems) {
      return;
    }
    
    lastSyncedSelectedItemsRef.current = normalizedSelectedItems;
    const newBadges = getInitialBadges();
    
    // Normalize badges for comparison (sort by name for consistency, ignore generated IDs)
    const newBadgesStr = JSON.stringify(
      newBadges.map(b => ({ name: b.name.trim(), itemId: b.itemId }))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    const currentBadgesStr = JSON.stringify(
      itemBadgesRef.current.map(b => ({ name: b.name.trim(), itemId: b.itemId }))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    
    // Only update if badges actually changed
    if (currentBadgesStr !== newBadgesStr) {
      isSyncingFromPropsRef.current = true;
      setItemBadges(newBadges);
      // Reset flag in next tick to allow notification effect to skip
      Promise.resolve().then(() => {
        isSyncingFromPropsRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedSelectedItems]);

  // Custom/created badges (no itemId) as synthetic SelectableItems for modal display
  const getCreatedItemsAsSelectable = useCallback((): SelectableItem[] => {
    const customBadges = itemBadges.filter((b) => b.itemId === undefined && b.name.trim().length > 0);
    return customBadges.map((badge) => ({
      id: badge.id ?? `custom-${badge.name}`,
      name: badge.name,
    }));
  }, [itemBadges]);

  // Filter items for modal display (predefined + created items, show selected state)
  const getFilteredItems = useCallback((): SelectableItem[] => {
    let filtered: SelectableItem[];
    
    if (searchQuery.trim().length === 0) {
      filtered = items;
    } else {
      if (filterItems) {
        filtered = filterItems(items, searchQuery);
      } else {
        const queryLower = searchQuery.toLowerCase();
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
    }

    // Add created/custom items (always selected); filter by search if needed
    const createdItems = getCreatedItemsAsSelectable();
    const createdFiltered =
      searchQuery.trim().length === 0
        ? createdItems
        : createdItems.filter((item) =>
            item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
          );
    // Dedupe: created item might match a predefined item by name; prefer predefined
    const predefinedIds = new Set(filtered.map((i) => getDisplayName(i).toLowerCase()));
    const createdOnly = createdFiltered.filter(
      (item) => !predefinedIds.has(item.name.toLowerCase())
    );
    const combined = [...filtered, ...createdOnly];

    // Sort: selected first, then unselected
    return combined.sort((a, b) => {
      const aSelected = isItemSelected(a, itemBadges);
      const bSelected = isItemSelected(b, itemBadges);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });
  }, [items, filterItems, getDisplayName, searchQuery, isItemSelected, itemBadges, getCreatedItemsAsSelectable]);

  // Notify parent when badges change (only when value actually differs from selectedItems to avoid update loops)
  useEffect(() => {
    // Skip notification if we're currently syncing from props to prevent circular updates
    if (isSyncingFromPropsRef.current) {
      return;
    }
    
    if (multi) {
      const itemNames = itemBadges
        .filter((b) => b.name.trim().length > 0)
        .map((b) => b.name.trim())
        .sort();
      const nextValue = itemNames.join(", ");
      // Normalize current selectedItems for comparison to avoid unnecessary parent updates
      const currentNormalized = normalizeSelectedItems(selectedItems);
      if (nextValue === currentNormalized) return;

      onSelectionChange(nextValue);

      if (onItemIdsChange) {
        const itemIds = itemBadges
          .filter((b) => b.itemId !== undefined)
          .map((b) => b.itemId!);
        const newItemNames = itemBadges
          .filter((b) => b.itemId === undefined && b.name.trim().length > 0)
          .map((b) => b.name.trim());

        onItemIdsChange(itemIds, newItemNames.length > 0 ? newItemNames : undefined);
      }
    } else {
      if (itemBadges.length === 0) {
        const currentEmpty = !selectedItems || selectedItems === "" || (Array.isArray(selectedItems) && selectedItems.length === 0);
        if (currentEmpty) return;
        onSelectionChange("");
      } else {
        const selectedBadge = itemBadges[0];
        const fullItem = items.find((item) => {
          if (selectedBadge.itemId !== undefined) {
            return item.id === selectedBadge.itemId;
          }
          return getDisplayName(item).toLowerCase().trim() === selectedBadge.name.toLowerCase().trim();
        });
        const nextValue = fullItem || selectedBadge.name;
        // Avoid notifying if parent already has this selection
        const currentName =
          typeof selectedItems === "object" && selectedItems !== null && !Array.isArray(selectedItems)
            ? getDisplayName(selectedItems as SelectableItem)
            : typeof selectedItems === "string"
            ? selectedItems.trim()
            : "";
        const nextName = typeof nextValue === "string" ? nextValue : getDisplayName(nextValue as SelectableItem);
        if (currentName && nextName.trim().toLowerCase() === currentName.trim().toLowerCase()) return;
        onSelectionChange(nextValue);
      }
    }
  }, [itemBadges, multi, items, selectedItems, onSelectionChange, onItemIdsChange, getDisplayName, normalizeSelectedItems]);

  // Create a new badge
  const createBadge = useCallback((name: string, itemId?: number | string): ItemBadge => {
    return {
      id: Date.now(),
      name: name.trim(),
      itemId,
    };
  }, []);

  // Handle selecting/deselecting an item from modal
  const handleSelectItem = useCallback((item: SelectableItem) => {
    const itemName = getDisplayName(item);
    const isSelected = isItemSelected(item, itemBadges);
    
    if (multi) {
      if (isSelected) {
        // Deselect: remove the badge (predefined by itemId, created by badge.id === item.id)
        setItemBadges(itemBadges.filter((badge) => {
          if (badge.itemId !== undefined) {
            return badge.itemId !== item.id;
          }
          return badge.id !== item.id;
        }));
      } else {
        // Select: check max items limit
        if (maxItems && itemBadges.length >= maxItems) {
          return; // Don't add if max reached
        }
        setItemBadges([...itemBadges, createBadge(itemName, item.id)]);
      }
    } else {
      setItemBadges([createBadge(itemName, item.id)]);
      setShowModal(false);
    }
  }, [multi, maxItems, isItemSelected, createBadge, getDisplayName, itemBadges]);

  // Handle creating a new item
  const handleCreateNewItem = useCallback(() => {
    const inputValue = searchQuery.trim();
    if (!inputValue || !allowCreate) {
      return;
    }

    // Check if already exists
    if (itemBadges.some((b) => b.name.toLowerCase() === inputValue.toLowerCase())) {
      return;
    }

    // Check if it exactly matches any existing item
    const exactMatch = items.find((item) => {
      return getDisplayName(item).toLowerCase() === inputValue.toLowerCase();
    });

    if (exactMatch) {
      handleSelectItem(exactMatch);
      return;
    }

    // Check max items limit
    if (maxItems && itemBadges.length >= maxItems) {
      return;
    }

    // Create new item
    const newBadge = createBadge(inputValue);
    setItemBadges(multi ? [...itemBadges, newBadge] : [newBadge]);
    setSearchQuery("");
    
    if (!multi) {
      setShowModal(false);
    }
  }, [searchQuery, allowCreate, itemBadges, items, maxItems, multi, createBadge, handleSelectItem, getDisplayName]);

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

  // Open modal when container is pressed
  const handleContainerPress = () => {
    if (!maxItems || itemBadges.length < maxItems) {
      setShowModal(true);
      onInputFocus?.();
    }
  };

  // Check if create button should be shown
  const shouldShowCreateButton = (): boolean => {
    const inputValue = searchQuery.trim();
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

  const filteredItems = getFilteredItems();

  const inputBorderColor = errors[errorKey] ? "#ff4444" : colors.border;
    
  const content = (
    <>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {title}
      </Text>

      <Pressable
        onPress={handleContainerPress}
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
            <Text
              style={[styles.placeholderText, { color: colors.tabIconDefault }]}
            >
              {placeholder || t("addItem") || "Add item..."}
            </Text>
          )}
        </View>
        <IconSymbol
          name="chevron.down"
          size={16}
          color={colors.tabIconDefault}
        />
      </Pressable>

      {errors[errorKey] && (
        <Text style={[styles.errorText, { color: "#ff4444" }]}>
          {errors[errorKey]}
        </Text>
      )}

      {/* Selection Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowModal(false);
          setSearchQuery("");
          onInputBlur?.();
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowModal(false);
            setSearchQuery("");
            onInputBlur?.();
          }}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {title}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  setSearchQuery("");
                  onInputBlur?.();
                }}
                style={styles.closeButton}
              >
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={colors.textSecondary}
              />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={placeholder || t("search") || "Search..."}
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            <ScrollView style={styles.modalScrollView}>
              {filteredItems.map((item) => {
                const isSelected = isItemSelected(item, itemBadges);
                return (
                  <TouchableOpacity
                    key={item.id.toString()}
                    activeOpacity={0.7}
                    style={[
                      styles.modalItem,
                      isSelected && {
                        backgroundColor: colors.primary + "20",
                      },
                    ]}
                    onPress={() => handleSelectItem(item)}
                  >
                    <IconSymbol
                      name={isSelected ? "checkmark.circle.fill" : "circle"}
                      size={18}
                      color={isSelected ? colors.tint : colors.tabIconDefault}
                      style={styles.modalItemIcon}
                    />
                    <Text
                      style={[
                        styles.modalItemText,
                        { color: colors.text },
                        isSelected && { fontWeight: "600" },
                      ]}
                    >
                      {getDisplayName(item)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              
              {shouldShowCreateButton() && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.modalItem, styles.createItem]}
                  onPress={handleCreateNewItem}
                >
                  <IconSymbol
                    name="plus.circle.fill"
                    size={18}
                    color={colors.tint}
                    style={styles.modalItemIcon}
                  />
                  <Text style={[styles.modalItemText, { color: colors.tint, fontWeight: "600" }]}>
                    {t("createItem") || "Create"} "{searchQuery.trim()}"
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
    justifyContent: "space-between",
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
    gap: 4,
    flex: 1,
    alignItems: "center",
  },
  itemBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  placeholderText: {
    fontSize: 15,
    fontWeight: "500",
    padding: 0,
    margin: 0,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    paddingBottom: 28,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "80%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  modalItemIcon: {
    marginRight: 12,
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  createItem: {
    borderBottomWidth: 2,
    borderBottomColor: "rgba(0, 122, 255, 0.3)",
  },
  errorText: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: "500",
  },
});
