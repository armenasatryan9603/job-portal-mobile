import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useTranslation } from "@/hooks/useTranslation";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeColors } from "@/constants/styles";
import { IconSymbol } from "./ui/icon-symbol";
import { SelectableItemsForm, SelectableItem } from "./SelectableItemsForm";

interface Role {
  name: string;
  nameEn?: string;
  nameRu?: string;
  nameHy?: string;
}

interface RoleSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (role: SelectableItem | string) => void;
  availableRoles: Role[];
  currentRole?: string;
  title?: string;
}

export const RoleSelectorModal: React.FC<RoleSelectorModalProps> = ({
  visible,
  onClose,
  onSelect,
  availableRoles,
  currentRole,
  title,
}) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  // Convert roles to SelectableItem format
  // Store the original role name in a special property so we can retrieve it
  const rolesAsItems: SelectableItem[] = availableRoles.map((role, index) => ({
    ...role, // Include all role properties first
    id: role.name || `role-${index}`,
    name: role.nameEn || role.name, // Display name
    nameEn: role.nameEn,
    nameRu: role.nameRu,
    nameHy: role.nameHy,
    roleName: role.name, // Store the actual role identifier (overrides if role.name exists)
  }));

  // Convert current role to SelectableItem if it exists
  const getCurrentRoleItem = (): SelectableItem | string => {
    if (!currentRole) return "";
    // Try to find by roleName first (the actual role identifier)
    const roleItem = rolesAsItems.find(
      (r) => (r as any).roleName?.toLowerCase() === currentRole.toLowerCase() ||
             r.name.toLowerCase() === currentRole.toLowerCase() ||
             (r.nameEn || "").toLowerCase() === currentRole.toLowerCase() ||
             (r.nameRu || "").toLowerCase() === currentRole.toLowerCase() ||
             (r.nameHy || "").toLowerCase() === currentRole.toLowerCase()
    );
    return roleItem || currentRole;
  };

  const [selectedRole, setSelectedRole] = useState<SelectableItem | string>(
    getCurrentRoleItem()
  );

  // Update selected role when currentRole changes
  useEffect(() => {
    setSelectedRole(getCurrentRoleItem());
  }, [currentRole, availableRoles]);

  const handleSelectionChange = (selected: string | SelectableItem | SelectableItem[]) => {
    if (Array.isArray(selected)) {
      // Should not happen in single mode, but handle it
      if (selected.length > 0) {
        setSelectedRole(selected[0]);
      }
    } else if (typeof selected === "string") {
      setSelectedRole(selected);
    } else {
      // It's a SelectableItem
      setSelectedRole(selected);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedRole);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={onClose}
      >
        <Pressable
          style={[styles.modalContent, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {title || t("selectRole")}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <SelectableItemsForm
            title=""
            placeholder={t("searchRole") || "Search role..."}
            items={rolesAsItems}
            selectedItems={selectedRole}
            errors={{}}
            errorKey="role"
            multi={false}
            allowCreate={true}
            showDescription={false}
            onSelectionChange={handleSelectionChange}
            hideCard={true}
            containerStyle={styles.roleSelectorContainer}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                {t("cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: colors.tint }]}
              onPress={handleConfirm}
            >
              <Text style={[styles.confirmButtonText, { color: colors.background }]}>
                {t("confirm")}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  roleSelectorContainer: {
    marginVertical: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    justifyContent: "flex-end",
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
