import React, { memo, useCallback, useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { Order } from "@/categories/api";
import { Button } from "./ui/button";

interface AttachOrderModalProps {
  visible: boolean;
  onClose: () => void;
  onAttachOrders: (orderIds: number[]) => Promise<void>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  allOrders: Order[];
  searchResults: Order[];
  isSearching: boolean;
  loadingOrders: boolean;
  attachedOrderIds: number[]; // IDs of orders already attached
}

export const AttachOrderModal = memo(
  ({
    visible,
    onClose,
    onAttachOrders,
    searchQuery,
    onSearchChange,
    allOrders,
    searchResults,
    isSearching,
    loadingOrders,
    attachedOrderIds,
  }: AttachOrderModalProps) => {
    const { isDark } = useTheme();
    const { t } = useTranslation();
    const colors = ThemeColors[isDark ? "dark" : "light"];
    const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
    const [attachingOrders, setAttachingOrders] = useState(false);
    const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

    // Filter out already attached orders and only show permanent orders
    const availableOrders = useMemo(() => {
      return allOrders.filter(
        (order) =>
          order.orderType === "permanent" &&
          !attachedOrderIds.includes(order.id)
      );
    }, [allOrders, attachedOrderIds]);

    const availableSearchResults = useMemo(() => {
      return searchResults.filter(
        (order) =>
          order.orderType === "permanent" &&
          !attachedOrderIds.includes(order.id)
      );
    }, [searchResults, attachedOrderIds]);

    const displayData = useMemo(
      () => (searchQuery.length >= 2 ? availableSearchResults : availableOrders),
      [searchQuery.length, availableSearchResults, availableOrders]
    );

    const handleSearchChange = useCallback(
      (text: string) => {
        onSearchChange(text);
        // Trigger search if query is long enough
        if (text.length >= 2) {
          // Search will be handled by parent component
        }
      },
      [onSearchChange]
    );

    const handleToggleSelection = useCallback((orderId: number) => {
      setSelectedOrders((prev) => {
        if (prev.includes(orderId)) {
          return prev.filter((id) => id !== orderId);
        } else {
          return [...prev, orderId];
        }
      });
    }, []);

    const handleAttachSelected = useCallback(async () => {
      if (selectedOrders.length === 0) return;

      try {
        setAttachingOrders(true);
        await onAttachOrders(selectedOrders);
        setSelectedOrders([]);
      } catch (error) {
        // Error handling is done in parent
      } finally {
        setAttachingOrders(false);
      }
    }, [selectedOrders, onAttachOrders]);

    const handleClose = useCallback(() => {
      setSelectedOrders([]);
      setHasAttemptedLoad(false);
      onClose();
      onSearchChange("");
    }, [onClose, onSearchChange]);

    // Track when loading starts or when data is available
    useEffect(() => {
      if (loadingOrders) {
        setHasAttemptedLoad(true);
      } else if (allOrders.length > 0 || (searchQuery.length >= 2 && searchResults.length > 0)) {
        // If we have data, mark as attempted (loading completed)
        setHasAttemptedLoad(true);
      }
    }, [loadingOrders, allOrders.length, searchQuery.length, searchResults.length]);

    // When modal becomes visible, check if we already have data
    useEffect(() => {
      if (visible && allOrders.length > 0 && !loadingOrders) {
        setHasAttemptedLoad(true);
      }
    }, [visible, allOrders.length, loadingOrders]);

    const formatBudget = useCallback((budget: number, currency?: string) => {
      const currencySymbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "";
      return `${currencySymbol}${budget.toLocaleString()}`;
    }, []);

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
        onShow={() => {
          // Only reset if we don't have any data yet
          if (allOrders.length === 0 && searchResults.length === 0) {
            setHasAttemptedLoad(false);
          } else {
            setHasAttemptedLoad(true);
          }
        }}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("attach")}
              {selectedOrders.length > 0 && ` (${selectedOrders.length})`}
            </Text>
            {selectedOrders.length > 0 && (
              <Button
                onPress={handleAttachSelected}
                disabled={attachingOrders}
                variant="primary"
              >
                {attachingOrders ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={styles.addSelectedButtonText}>{t("save")}</Text>
                )}
              </Button>
            )}
          </View>

          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder={t("searchOrders") || "Search orders..."}
            placeholderTextColor={colors.tabIconDefault}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <FlatList
            data={displayData}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const isSelected = selectedOrders.includes(item.id);
              const isAttached = attachedOrderIds.includes(item.id);

              return (
                <TouchableOpacity
                  style={[
                    styles.orderItem,
                    {
                      backgroundColor: colors.background,
                      borderColor: isSelected ? colors.tint : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                      opacity: isAttached ? 0.5 : 1,
                    },
                  ]}
                  onPress={() => {
                    if (!isAttached) {
                      handleToggleSelection(item.id);
                    }
                  }}
                  disabled={isAttached}
                >
                  <View style={styles.orderInfo}>
                    <Text style={[styles.orderTitle, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    {item.description && (
                      <Text
                        style={[
                          styles.orderDescription,
                          { color: colors.tabIconDefault },
                        ]}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    )}
                    <View style={styles.orderMeta}>
                      <View style={styles.orderMetaItem}>
                        <IconSymbol
                          name="dollarsign.circle"
                          size={14}
                          color={colors.tabIconDefault}
                        />
                        <Text
                          style={[
                            styles.orderMetaText,
                            { color: colors.tabIconDefault },
                          ]}
                        >
                          {formatBudget(item.budget, item.currency)}
                        </Text>
                      </View>
                      {item.Category && (
                        <View style={styles.orderMetaItem}>
                          <IconSymbol
                            name="tag"
                            size={14}
                            color={colors.tabIconDefault}
                          />
                          <Text
                            style={[
                              styles.orderMetaText,
                              { color: colors.tabIconDefault },
                            ]}
                          >
                            {item.Category.nameEn || item.Category.name}
                          </Text>
                        </View>
                      )}
                      <View style={styles.orderMetaItem}>
                        <IconSymbol
                          name="circle.fill"
                          size={8}
                          color={
                            item.status === "open"
                              ? colors.openNow
                              : item.status === "in_progress"
                              ? colors.link
                              : colors.iosGray
                          }
                        />
                        <Text
                          style={[
                            styles.orderMetaText,
                            { color: colors.tabIconDefault },
                          ]}
                        >
                          {t(item.status)}
                        </Text>
                      </View>
                    </View>
                    {isAttached && (
                      <Text
                        style={[
                          styles.attachedLabel,
                          { color: colors.tint },
                        ]}
                      >
                        {t("alreadyAttached") || "Already attached"}
                      </Text>
                    )}
                  </View>
                  {isSelected ? (
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={24}
                      color={colors.tint}
                    />
                  ) : (
                    <IconSymbol
                      name="circle"
                      size={24}
                      color={colors.border}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              (loadingOrders || (allOrders.length === 0 && !hasAttemptedLoad)) && !isSearching ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              ) : searchQuery.length >= 2 && !isSearching && availableSearchResults.length === 0 ? (
                <Text
                  style={[styles.emptyText, { color: colors.tabIconDefault }]}
                >
                  {t("noResults")}
                </Text>
              ) : availableOrders.length === 0 && hasAttemptedLoad && !loadingOrders && !isSearching ? (
                <View style={styles.emptyContainer}>
                  <IconSymbol
                    name="doc.text"
                    size={48}
                    color={colors.tabIconDefault}
                  />
                  <Text
                    style={[styles.emptyText, { color: colors.tabIconDefault }]}
                  >
                    {t("noPermanentOrders") || "No permanent orders available"}
                  </Text>
                  <Text
                    style={[
                      styles.emptySubtext,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t("onlyPermanentOrdersCanBeAttached") ||
                      "Only permanent orders can be attached to services"}
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      </Modal>
    );
  }
);

AttachOrderModal.displayName = "AttachOrderModal";

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    paddingTop: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  addSelectedButtonText: {
    // Note: Should use colors.textInverse dynamically - consider inline style
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  loadingContainer: {
    padding: Spacing.md,
    alignItems: "center",
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  orderDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 18,
  },
  orderMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: 4,
  },
  orderMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orderMetaText: {
    fontSize: 12,
    fontWeight: "500",
  },
  attachedLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: Spacing.md,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.sm,
    opacity: 0.7,
  },
});
