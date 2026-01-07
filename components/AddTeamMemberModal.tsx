import React, { memo, useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors, Typography } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { User } from "@/services/api";

interface AddTeamMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onAddMember: (userId: number) => void;
  onAddMembers?: (userIds: number[]) => Promise<void>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: (query: string) => void;
  allSpecialists: User[];
  searchResults: User[];
  isSearching: boolean;
  loadingSpecialists: boolean;
  hasMoreSpecialists: boolean;
  onLoadMore: () => void;
  onLoadInitial: () => void;
}

export const AddTeamMemberModal = memo(
  ({
    visible,
    onClose,
    onAddMember,
    onAddMembers,
    searchQuery,
    onSearchChange,
    onSearch,
    allSpecialists,
    searchResults,
    isSearching,
    loadingSpecialists,
    hasMoreSpecialists,
    onLoadMore,
    onLoadInitial,
  }: AddTeamMemberModalProps) => {
    const { isDark } = useTheme();
    const { t } = useTranslation();
    const colors = ThemeColors[isDark ? "dark" : "light"];
    const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
    const [addingMembers, setAddingMembers] = useState(false);

    const displayData = useMemo(
      () => (searchQuery.length >= 2 ? searchResults : allSpecialists),
      [searchQuery.length, searchResults, allSpecialists]
    );

    const selectionMode = !!onAddMembers;

    const handleSearchChange = useCallback(
      (text: string) => {
        onSearchChange(text);
        onSearch(text);
      },
      [onSearchChange, onSearch]
    );

    const handleToggleSelection = useCallback((userId: number) => {
      setSelectedMembers((prev) =>
        prev.includes(userId)
          ? prev.filter((id) => id !== userId)
          : [...prev, userId]
      );
    }, []);

    const handleAddSelected = useCallback(async () => {
      if (selectedMembers.length === 0 || !onAddMembers) return;

      try {
        setAddingMembers(true);
        await onAddMembers(selectedMembers);
        setSelectedMembers([]);
      } catch (error) {
        // Error handling is done in parent
      } finally {
        setAddingMembers(false);
      }
    }, [selectedMembers, onAddMembers]);

    const handleClose = useCallback(() => {
      setSelectedMembers([]);
      onClose();
      onSearchChange("");
    }, [onClose, onSearchChange]);

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
        onShow={onLoadInitial}
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
              {selectionMode ? t("addMembers") : t("addMember")}{" "}
              {selectionMode &&
                selectedMembers.length > 0 &&
                `(${selectedMembers.length})`}
            </Text>
            {selectionMode && selectedMembers.length > 0 && (
              <TouchableOpacity
                onPress={handleAddSelected}
                disabled={addingMembers}
                style={[
                  styles.addSelectedButton,
                  { backgroundColor: colors.tint },
                ]}
              >
                {addingMembers ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addSelectedButtonText}>{t("save")}</Text>
                )}
              </TouchableOpacity>
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
            placeholder={t("searchSpecialists")}
            placeholderTextColor={colors.tabIconDefault}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {(isSearching || loadingSpecialists) && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          )}

          <FlatList
            data={displayData}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const isSelected =
                selectionMode && selectedMembers.includes(item.id);
              return (
                <TouchableOpacity
                  style={[
                    styles.searchResultItem,
                    {
                      backgroundColor: colors.background,
                      borderColor: isSelected ? colors.tint : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => {
                    if (selectionMode) {
                      handleToggleSelection(item.id);
                    } else {
                      onAddMember(item.id);
                    }
                  }}
                >
                  {item.avatarUrl ? (
                    <Image
                      source={{ uri: item.avatarUrl }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        styles.avatarPlaceholder,
                        { backgroundColor: colors.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {item.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.peerInfo}>
                    <Text style={[styles.peerName, { color: colors.text }]}>
                      {item.name}
                    </Text>
                    {item.email && (
                      <Text
                        style={[
                          styles.peerEmail,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {item.email}
                      </Text>
                    )}
                  </View>
                  {selectionMode ? (
                    isSelected ? (
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
                    )
                  ) : (
                    <IconSymbol
                      name="plus.circle"
                      size={24}
                      color={colors.tint}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              searchQuery.length >= 2 && !isSearching ? (
                <Text
                  style={[styles.emptyText, { color: colors.tabIconDefault }]}
                >
                  {t("noResults")}
                </Text>
              ) : !loadingSpecialists && allSpecialists.length === 0 ? (
                <Text
                  style={[styles.emptyText, { color: colors.tabIconDefault }]}
                >
                  {t("noSpecialists")}
                </Text>
              ) : null
            }
            ListFooterComponent={
              loadingSpecialists && searchQuery.length < 2 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              ) : null
            }
          />
        </View>
      </Modal>
    );
  }
);

AddTeamMemberModal.displayName = "AddTeamMemberModal";

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
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
  },
  addSelectedButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  addSelectedButtonText: {
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
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
  },
  peerInfo: {
    flex: 1,
  },
  peerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  peerEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    padding: Spacing.xl,
  },
});
