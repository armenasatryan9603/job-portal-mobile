import React, { memo, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { Team } from "@/hooks/useTeamData";

interface TeamInfoProps {
  team: Team;
  canEdit?: boolean;
  onSave?: (newName: string) => Promise<void>;
}

export const TeamInfo = memo(({ team, canEdit, onSave }: TeamInfoProps) => {
  const { isDark } = useTheme();
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(team.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditedName(team.name);
  }, [team.name]);

  const handleStartEdit = () => {
    setEditedName(team.name);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedName(team.name);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editedName.trim()) {
      return;
    }
    if (editedName.trim() === team.name) {
      setIsEditing(false);
      return;
    }
    if (onSave) {
      try {
        setSaving(true);
        await onSave(editedName.trim());
        setIsEditing(false);
      } catch (error) {
        // Error handling is done in parent
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <ResponsiveCard
      padding={0}
      marginBlock={0}
      marginHorizontal={0}
      style={{ flex: 1 }}
    >
      <View style={styles.teamInfo}>
        <View style={styles.teamNameRow}>
          {isEditing ? (
            <>
              <TextInput
                style={[
                  styles.teamNameInput,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={editedName}
                onChangeText={setEditedName}
                autoFocus
                editable={!saving}
              />
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !editedName.trim()}
                style={styles.saveButton}
              >
                <IconSymbol
                  name="checkmark"
                  size={18}
                  color={
                    saving || !editedName.trim()
                      ? colors.tabIconDefault
                      : colors.tint
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCancel}
                disabled={saving}
                style={styles.cancelButton}
              >
                <IconSymbol
                  name="xmark"
                  size={18}
                  color={saving ? colors.tabIconDefault : colors.text}
                />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.teamName, { color: colors.text }]}>
                {team.name}
              </Text>
              {canEdit && (
                <TouchableOpacity
                  onPress={handleStartEdit}
                  style={styles.editButton}
                >
                  <IconSymbol name="pencil" size={18} color={colors.tint} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </ResponsiveCard>
  );
});

TeamInfo.displayName = "TeamInfo";

const styles = StyleSheet.create({
  teamInfo: {
    padding: Spacing.sm,
  },
  teamNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  teamName: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
  },
  teamNameInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
  },
  editButton: {
    padding: Spacing.xs,
  },
  saveButton: {
    padding: Spacing.xs,
  },
  cancelButton: {
    padding: Spacing.xs,
  },
  teamMeta: {
    fontSize: 14,
  },
});
