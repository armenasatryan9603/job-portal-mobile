import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { Spacing, ThemeColors, Typography } from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { router } from "expo-router";
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { apiService } from "@/categories/api";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTeamId, useTeamData } from "@/hooks/useTeamData";
import { useSpecialistSearch } from "@/hooks/useSpecialistSearch";
import { TeamInfo } from "@/components/TeamInfo";
import { TeamMemberItem } from "@/components/TeamMemberItem";
import { AddMemberModal } from "@/components/AddMemberModal";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function TeamDetailScreen() {
  useAnalytics("TeamDetail");
  const teamId = useTeamId();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const { team, loading, reloadTeam, updateTeam } = useTeamData(teamId);
  const {
    searchQuery,
    setSearchQuery,
    allSpecialists,
    searchResults,
    setSearchResults,
    isSearching,
    loadingSpecialists,
    hasMoreSpecialists,
    searchSpecialists,
    loadAllSpecialists,
    handleLoadMore,
    setAllSpecialists,
  } = useSpecialistSearch(team);

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [updatingTeamName, setUpdatingTeamName] = useState(false);

  const activeMembers = useMemo(() => {
    const members = team?.Members; //?.filter((m) => m.isActive) || [];
    console.log("Active members:", members);
    console.log("All team members:", team?.Members);
    return members;
  }, [team?.Members]);

  const isTeamLead = useMemo(
    () => user?.id === team?.createdBy,
    [user?.id, team?.createdBy]
  );

  const handleAddMember = useCallback(
    async (userId: number, role?: string) => {
      // Teams don't use roles, so we ignore the role parameter
      if (!teamId || typeof teamId !== "number") return;

      try {
        await apiService.addTeamMember(teamId, userId);
        // Small delay to ensure backend has processed the changes
        await new Promise((resolve) => setTimeout(resolve, 300));
        await reloadTeam();
        setSearchQuery("");
        setSearchResults([]);
        setAllSpecialists((prev) => prev.filter((s) => s.id !== userId));
        setShowAddMemberModal(false);
      } catch (error: any) {
        console.error("Error adding member:", error);
        Alert.alert(t("error"), error.message || t("failedToAddMember"));
      }
    },
    [teamId, reloadTeam, t, setSearchQuery, setSearchResults, setAllSpecialists]
  );

  const handleAddMembers = useCallback(
    async (members: Array<{ userId: number; role?: string }>) => {
      // Teams don't use roles, so we extract just the userIds
      if (!teamId || typeof teamId !== "number") return;
      if (members.length === 0) {
        Alert.alert(t("error"), t("selectMembersToAdd"));
        return;
      }

      const addedMemberIds: number[] = [];
      const failedMemberIds: number[] = [];

      try {
        for (const { userId } of members) {
          try {
            await apiService.addTeamMember(teamId, userId);
            addedMemberIds.push(userId);
          } catch (error: any) {
            console.error(`Error adding member ${userId}:`, error);
            failedMemberIds.push(userId);
          }
        }

        // Small delay to ensure backend has processed the changes
        await new Promise((resolve) => setTimeout(resolve, 300));
        await reloadTeam();

        // Remove added members from the list
        setAllSpecialists((prev) =>
          prev.filter((s) => !addedMemberIds.includes(s.id))
        );

        // Show success/error message
        if (addedMemberIds.length > 0 && failedMemberIds.length === 0) {
          setShowAddMemberModal(false);
        } else if (addedMemberIds.length > 0 && failedMemberIds.length > 0) {
        } else {
          Alert.alert(t("error"), t("failedToAddMembers"));
        }

        // Reset modal state
        setSearchQuery("");
        setSearchResults([]);
      } catch (error: any) {
        console.error("Error adding members:", error);
        Alert.alert(t("error"), error.message || t("failedToAddMembers"));
      }
    },
    [teamId, reloadTeam, t, setSearchQuery, setSearchResults, setAllSpecialists]
  );

  const handleRemoveMember = useCallback(
    async (userId: number) => {
      if (!teamId || typeof teamId !== "number") return;

      Alert.alert(t("removeMember"), t("confirmRemoveMember"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("remove"),
          style: "destructive",
          onPress: async () => {
            try {
              await apiService.removeTeamMember(teamId, userId);
              // Remove member from local state instead of reloading
              updateTeam((currentTeam) => {
                if (!currentTeam) return currentTeam;
                return {
                  ...currentTeam,
                  Members: currentTeam.Members?.filter(
                    (member) => member.userId !== userId
                  ),
                };
              });
            } catch (error) {
              console.error("Error removing member:", error);
              Alert.alert(t("error"), t("failedToRemoveMember"));
            }
          },
        },
      ]);
    },
    [teamId, updateTeam, t]
  );

  const handleOpenModal = useCallback(() => {
    setShowAddMemberModal(true);
    if (allSpecialists.length === 0) {
      loadAllSpecialists(1, false);
    }
  }, [allSpecialists.length, loadAllSpecialists]);

  const handleCloseModal = useCallback(() => {
    setShowAddMemberModal(false);
    setSearchQuery("");
    setSearchResults([]);
  }, [setSearchQuery, setSearchResults]);

  const handleSaveTeamName = useCallback(
    async (newName: string) => {
      if (!teamId || typeof teamId !== "number") return;
      if (!newName.trim()) {
        Alert.alert(t("error"), t("teamNameRequired"));
        return;
      }

      try {
        setUpdatingTeamName(true);
        await apiService.updateTeamName(teamId, newName.trim());
        await reloadTeam();
      } catch (error: any) {
        console.error("Error updating team name:", error);
        Alert.alert(
          t("error"),
          error.message ||
            t("failedToUpdateTeamName") ||
            "Failed to update team name"
        );
        throw error; // Re-throw to let component handle it
      } finally {
        setUpdatingTeamName(false);
      }
    },
    [teamId, reloadTeam, t]
  );

  const header = useMemo(
    () => (
      <Header
        title={team?.name || t("team")}
        subtitle={t("manageTeamMembers")}
        showBackButton={true}
        onBackPress={() => router.back()}
      />
    ),
    [team?.name, t]
  );

  if (loading) {
    return (
      <Layout header={header}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </Layout>
    );
  }

  if (!team) {
    return (
      <Layout header={header}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {t("teamNotFound")}
          </Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout header={header}>
      <ScrollView style={styles.container}>
        <View
          style={{
            flexDirection: "row",
            gap: Spacing.md,
          }}
        >
          <TeamInfo
            team={team}
            canEdit={isTeamLead}
            onSave={handleSaveTeamName}
          />

          {isTeamLead && (
            <View style={styles.section}>
              <TouchableOpacity
                style={{
                  padding: Spacing.md,
                  backgroundColor: colors.primary,
                  borderRadius: Spacing.md,
                }}
                onPress={handleOpenModal}
              >
                <IconSymbol
                  name="person.badge.plus"
                  size={20}
                  color={colors.tint}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("members")} ({activeMembers?.length || 0})
          </Text>
          {activeMembers?.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
              {t("noMembers")}
            </Text>
          ) : (
            activeMembers?.map((member) => (
              <TeamMemberItem
                key={member.id}
                member={member}
                canRemove={isTeamLead && member.userId !== team.createdBy}
                onRemove={handleRemoveMember}
              />
            ))
          )}
        </View>
      </ScrollView>

      <AddMemberModal
        visible={showAddMemberModal}
        onClose={handleCloseModal}
        onAddMember={handleAddMember}
        onAddMembers={handleAddMembers}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={searchSpecialists}
        allSpecialists={allSpecialists}
        searchResults={searchResults}
        isSearching={isSearching}
        loadingSpecialists={loadingSpecialists}
        hasMoreSpecialists={hasMoreSpecialists}
        onLoadMore={handleLoadMore}
        onLoadInitial={() => {
          if (allSpecialists.length === 0) {
            loadAllSpecialists(1, false);
          }
        }}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
    marginBottom: 90,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    padding: Spacing.xl,
  },
});
