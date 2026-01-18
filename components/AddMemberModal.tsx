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
  Image,
  Pressable,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors, Typography } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { User } from "@/categories/api";
import { SelectableItemsForm, SelectableItem } from "./SelectableItemsForm";
import { Button } from "./ui/button";

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onAddMember: (userId: number, role?: string) => void;
  onAddMembers?: (members: Array<{ userId: number; role?: string }>) => Promise<void>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: (query: string) => void;
  allSpecialists: User[];
  searchResults: User[];
  isSearching: boolean;
  loadingSpecialists: boolean;
  onLoadMore: () => void;
  hasMoreSpecialists: boolean;
  onLoadInitial: () => void;
  availableRoles?: Array<{ name: string; nameEn?: string; nameRu?: string; nameHy?: string }>;
  defaultRole?: string;
}

export const AddMemberModal = memo(
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
    onLoadMore,
    hasMoreSpecialists,
    onLoadInitial,
    availableRoles = [],
    defaultRole,
  }: AddMemberModalProps) => {
    // Default to "member" role if not specified
    const effectiveDefaultRole = defaultRole || "member";
    const { isDark } = useTheme();
    const { t } = useTranslation();
    const colors = ThemeColors[isDark ? "dark" : "light"];
    const [selectedMembers, setSelectedMembers] = useState<Array<{ userId: number; role?: string }>>([]);
    const [addingMembers, setAddingMembers] = useState(false);
    const [rolePickerUserId, setRolePickerUserId] = useState<number | null>(null);
    const [pendingRoleSelection, setPendingRoleSelection] = useState<string | SelectableItem | SelectableItem[] | null>(null);
    const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

    const hasRoleSelection = availableRoles.length > 0;
    // Filter out "owner" role - it should not be assignable to members
    const selectableRoles = useMemo(() => {
      return availableRoles.filter((role) => role.name.toLowerCase() !== "owner");
    }, [availableRoles]);
    
    const rolesAsItems: SelectableItem[] = useMemo(() => {
      if (selectableRoles.length === 0) return [];
      return selectableRoles.map((role, index) => ({
        ...role,
        id: role.name || `role-${index}`,
        name: role.nameEn || role.name,
        nameEn: role.nameEn,
        nameRu: role.nameRu,
        nameHy: role.nameHy,
        roleName: role.name,
      }));
    }, [selectableRoles]);

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
      setSelectedMembers((prev) => {
        const existing = prev.find((m) => m.userId === userId);
        if (existing) {
          return prev.filter((m) => m.userId !== userId);
        } else {
          return [...prev, { userId, role: effectiveDefaultRole }];
        }
      });
    }, [effectiveDefaultRole]);

    const getSelectedRole = useCallback((userId: number) => {
      const selected = selectedMembers.find((m) => m.userId === userId);
      return selected?.role || effectiveDefaultRole;
    }, [selectedMembers, effectiveDefaultRole]);

    const handleRoleSelect = useCallback((selected: string | SelectableItem | SelectableItem[]) => {
      // Prevent selecting "owner" role
      let roleName: string | undefined;
      if (typeof selected === "string") {
        roleName = selected.toLowerCase();
      } else if (Array.isArray(selected)) {
        if (selected.length > 0) {
          roleName = ((selected[0] as any)?.roleName || (selected[0] as any)?.name || selected[0]?.name || "").toLowerCase();
        }
      } else {
        roleName = ((selected as any)?.roleName || selected.name || "").toLowerCase();
      }
      
      if (roleName === "owner") {
        // Ignore owner role selection
        return;
      }
      
      // Store the selection temporarily, don't update yet
      setPendingRoleSelection(selected);
    }, []);

    const handleConfirmRole = useCallback(() => {
      if (!rolePickerUserId) return;
      
      // Use pending selection if available, otherwise use current role
      let roleName: string | undefined;
      if (pendingRoleSelection) {
        if (typeof pendingRoleSelection === "string") {
          roleName = pendingRoleSelection || undefined;
        } else if (Array.isArray(pendingRoleSelection)) {
          if (pendingRoleSelection.length > 0) {
            roleName = (pendingRoleSelection[0] as any)?.roleName || (pendingRoleSelection[0] as any)?.name || pendingRoleSelection[0]?.name || undefined;
          }
        } else {
          roleName = (pendingRoleSelection as any)?.roleName || pendingRoleSelection.name || undefined;
        }
      } else {
        // If no pending selection, use the current role from SelectableItemsForm
        roleName = getSelectedRole(rolePickerUserId);
      }

      // Prevent assigning "owner" role
      if (roleName?.toLowerCase() === "owner") {
        return;
      }

      setSelectedMembers((prev) => {
        const existing = prev.find((m) => m.userId === rolePickerUserId);
        if (existing) {
          return prev.map((m) => m.userId === rolePickerUserId ? { ...m, role: roleName } : m);
        } else {
          return [...prev, { userId: rolePickerUserId, role: roleName }];
        }
      });
      setPendingRoleSelection(null);
      setRolePickerUserId(null);
    }, [rolePickerUserId, pendingRoleSelection, getSelectedRole]);

    const handleOpenRolePicker = useCallback((userId: number) => {
      setRolePickerUserId(userId);
      // Initialize pending selection with current role
      const currentRole = getSelectedRole(userId);
      if (currentRole) {
        const roleItem = rolesAsItems.find(
          (r) => (r as any).roleName?.toLowerCase() === currentRole.toLowerCase() ||
                 r.name.toLowerCase() === currentRole.toLowerCase()
        );
        setPendingRoleSelection(roleItem || currentRole);
      } else {
        setPendingRoleSelection(null);
      }
    }, [getSelectedRole, rolesAsItems]);

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
      setRolePickerUserId(null);
      setPendingRoleSelection(null);
      setHasAttemptedLoad(false);
      onClose();
      onSearchChange("");
    }, [onClose, onSearchChange]);

    const handleLoadMore = useCallback(() => {
      // Only load more when:
      // 1. Not currently searching (searchQuery.length < 2)
      // 2. There are more specialists to load
      // 3. Not currently loading
      if (searchQuery.length < 2 && hasMoreSpecialists && !loadingSpecialists) {
        onLoadMore();
      }
    }, [searchQuery.length, hasMoreSpecialists, loadingSpecialists, onLoadMore]);

    // Track when loading starts to know when to show "no specialists"
    useEffect(() => {
      if (loadingSpecialists) {
        setHasAttemptedLoad(true);
      }
    }, [loadingSpecialists]);

    const getRoleDisplayName = useCallback((roleName?: string) => {
      if (!roleName) return "";
      const role = availableRoles.find((r) => r.name === roleName);
      return role?.nameEn || role?.name || roleName;
    }, [availableRoles]);

    const getCurrentRoleItem = useCallback((roleName?: string): SelectableItem | string => {
      if (!roleName || !hasRoleSelection) return "";
      const roleItem = rolesAsItems.find(
        (r) => (r as any).roleName?.toLowerCase() === roleName.toLowerCase() ||
               r.name.toLowerCase() === roleName.toLowerCase()
      );
      return roleItem || roleName;
    }, [rolesAsItems, hasRoleSelection]);

    // Get the current role selection for the role picker (either pending or existing)
    const getRolePickerSelectedItem = useCallback((): SelectableItem | string => {
      if (!rolePickerUserId) return "";
      
      // If there's a pending selection, use that
      if (pendingRoleSelection) {
        if (typeof pendingRoleSelection === "string") {
          return getCurrentRoleItem(pendingRoleSelection);
        } else if (Array.isArray(pendingRoleSelection)) {
          return pendingRoleSelection[0] || getCurrentRoleItem(getSelectedRole(rolePickerUserId));
        } else {
          return pendingRoleSelection;
        }
      }
      
      // Otherwise use the existing role
      return getCurrentRoleItem(getSelectedRole(rolePickerUserId));
    }, [rolePickerUserId, pendingRoleSelection, getCurrentRoleItem, getSelectedRole]);

    return (
      <>
        <Modal
          visible={visible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleClose}
          onShow={() => {
            setHasAttemptedLoad(false);
            onLoadInitial();
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
                {selectionMode ? t("addMembers") : t("addMember")}{" "}
                {selectionMode &&
                  selectedMembers.length > 0 &&
                  `(${selectedMembers.length})`}
              </Text>
              {selectionMode && selectedMembers.length > 0 && (
                <Button
                  onPress={handleAddSelected}
                  disabled={addingMembers}
                  variant="primary"
                >
                  {addingMembers ? (
                    <ActivityIndicator size="small" color="#fff" />
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
              placeholder={t("searchSpecialists")}
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
                const isSelected = selectionMode && selectedMembers.some((m) => m.userId === item.id);
                const selectedRole = isSelected ? getSelectedRole(item.id) : effectiveDefaultRole;
                
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
                        // Single selection mode
                        if (hasRoleSelection) {
                          handleOpenRolePicker(item.id);
                        } else {
                          onAddMember(item.id);
                        }
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
                      {isSelected && selectionMode && hasRoleSelection && (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            handleOpenRolePicker(item.id);
                          }}
                          style={styles.roleSelector}
                        >
                          <Text style={[styles.roleSelectorText, { color: colors.tint }]}>
                            {t("role")}: {selectedRole ? getRoleDisplayName(selectedRole) : t("selectRole") || "Select role..."}
                          </Text>
                          <IconSymbol name="chevron.down" size={14} color={colors.tint} />
                        </TouchableOpacity>
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
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                loadingSpecialists || !hasAttemptedLoad ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.tint} />
                  </View>
                ) : searchQuery.length >= 2 && !isSearching ? (
                  <Text
                    style={[styles.emptyText, { color: colors.tabIconDefault }]}
                  >
                    {t("noResults")}
                  </Text>
                ) : allSpecialists.length === 0 && hasAttemptedLoad ? (
                  <Text
                    style={[styles.emptyText, { color: colors.tabIconDefault }]}
                  >
                    {t("noSpecialists")}
                  </Text>
                ) : null
              }
              ListFooterComponent={
                loadingSpecialists && searchQuery.length < 2 && allSpecialists.length > 0 && hasMoreSpecialists ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.tint} />
                  </View>
                ) : null
              }
            />

            {/* Role Selector Modal - Using View instead of Modal to avoid nested modals */}
            {hasRoleSelection && rolePickerUserId !== null && (
              <View style={styles.roleModalOverlay}>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => {
                    setRolePickerUserId(null);
                    setPendingRoleSelection(null);
                  }}
                />
                <View style={[styles.roleModalContent, { backgroundColor: colors.background }]}>
                  <View style={styles.roleModalHeader}>
                    <Text style={[styles.roleModalTitle, { color: colors.text }]}>
                      {t("selectRole")}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setRolePickerUserId(null);
                        setPendingRoleSelection(null);
                      }}
                      style={styles.roleModalCloseButton}
                    >
                      <IconSymbol name="xmark" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <SelectableItemsForm
                    title=""
                    placeholder={t("searchRole") || "Search role..."}
                    items={rolesAsItems}
                    selectedItems={getRolePickerSelectedItem()}
                    errors={{}}
                    errorKey="role"
                    multi={false}
                    allowCreate={true}
                    showDescription={false}
                    onSelectionChange={handleRoleSelect}
                    hideCard={true}
                    containerStyle={styles.roleSelectorContainer}
                  />

                  <View style={styles.roleModalActions}>
                    <TouchableOpacity
                      style={[styles.roleModalButton, { borderColor: colors.border }]}
                      onPress={() => {
                        setRolePickerUserId(null);
                        setPendingRoleSelection(null);
                      }}
                    >
                      <Text style={[styles.roleModalButtonText, { color: colors.text }]}>
                        {t("cancel")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.roleModalButton, { backgroundColor: colors.tint }]}
                      onPress={() => {
                        if (rolePickerUserId === null) return;
                        
                        if (selectionMode) {
                          // In selection mode, confirm the role selection
                          handleConfirmRole();
                        } else {
                          // Single selection mode - get the role and add member
                          let roleName: string | undefined;
                          if (pendingRoleSelection) {
                            if (typeof pendingRoleSelection === "string") {
                              roleName = pendingRoleSelection;
                            } else if (Array.isArray(pendingRoleSelection)) {
                              if (pendingRoleSelection.length > 0) {
                                roleName = (pendingRoleSelection[0] as any)?.roleName || (pendingRoleSelection[0] as any)?.name || pendingRoleSelection[0]?.name || undefined;
                              }
                            } else {
                              roleName = (pendingRoleSelection as any)?.roleName || pendingRoleSelection.name || undefined;
                            }
                          } else {
                            // Get from SelectableItemsForm's current selection
                            const currentItem = getRolePickerSelectedItem();
                            if (typeof currentItem === "string") {
                              roleName = currentItem;
                            } else if (currentItem) {
                              roleName = (currentItem as any)?.roleName || currentItem.name || undefined;
                            } else {
                              roleName = getSelectedRole(rolePickerUserId);
                            }
                          }
                          
                          // Prevent assigning "owner" role
                          if (roleName?.toLowerCase() === "owner") {
                            return;
                          }
                          
                          onAddMember(rolePickerUserId, roleName);
                          setRolePickerUserId(null);
                          setPendingRoleSelection(null);
                          handleClose();
                        }
                      }}
                    >
                      <Text style={[styles.roleModalButtonText, { color: colors.background }]}>
                        {selectionMode ? t("save") : t("confirm")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </Modal>
      </>
    );
  }
);

AddMemberModal.displayName = "AddMemberModal";

// Keep the old export name for backward compatibility
export const AddMarketMemberModal = AddMemberModal;

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
  roleSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingVertical: 2,
  },
  roleSelectorText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    padding: Spacing.xl,
  },
  roleModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  roleModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  roleModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  roleModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  roleModalCloseButton: {
    padding: 4,
  },
  roleSelectorContainer: {
    marginVertical: 16,
  },
  roleModalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    justifyContent: "flex-end",
  },
  roleModalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
