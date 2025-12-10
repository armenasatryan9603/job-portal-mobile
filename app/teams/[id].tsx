import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { Spacing, ThemeColors } from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useLocalSearchParams } from "expo-router";
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
import { apiService } from "@/services/api";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTeamData } from "@/hooks/useTeamData";
import { useSpecialistSearch } from "@/hooks/useSpecialistSearch";
import { TeamInfo } from "@/components/TeamInfo";
import { TeamMemberItem } from "@/components/TeamMemberItem";
import { AddTeamMemberModal } from "@/components/AddTeamMemberModal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { HiringDialog } from "@/components/HiringDialog";
import { useModal } from "@/contexts/ModalContext";
import { useMyOrders } from "@/hooks/useApi";
import AnalyticsService from "@/services/AnalyticsService";

export default function TeamDetailScreen() {
  useAnalytics("TeamDetail");
  const { id } = useLocalSearchParams<{ id: string }>();
  const teamId = id ? parseInt(id, 10) : undefined;
  const { user, isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const { showLoginModal } = useModal();
  const { data: ordersData } = useMyOrders();

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

  // Hiring dialog state
  const [hiringDialogVisible, setHiringDialogVisible] = useState(false);
  const [hiringLoading, setHiringLoading] = useState(false);

  const activeMembers = useMemo(() => {
    const members = team?.Members?.filter((m) => m.isActive) || [];
    return members;
  }, [team?.Members]);

  const isTeamLead = useMemo(
    () => user?.id === team?.createdBy,
    [user?.id, team?.createdBy]
  );

  const isUserPartOfTeam = useMemo(() => {
    if (!team || !user) return false;
    return (
      team.createdBy === user.id ||
      activeMembers.some((member) => member.userId === user.id)
    );
  }, [team, user, activeMembers]);

  const handleAddMember = useCallback(
    async (userId: number) => {
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
    async (userIds: number[]) => {
      if (!teamId || typeof teamId !== "number") return;
      if (userIds.length === 0) {
        Alert.alert(t("error"), t("selectMembersToAdd"));
        return;
      }

      const addedMemberIds: number[] = [];
      const failedMemberIds: number[] = [];

      try {
        for (const userId of userIds) {
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

  const handleHireTeam = useCallback(() => {
    if (!team) return;

    // Track hire team action
    AnalyticsService.getInstance().logEvent("hire_team_initiated", {
      team_id: team.id.toString(),
    });

    // Check if user is authenticated
    if (!isAuthenticated) {
      // User is not logged in, show login modal
      showLoginModal();
      return;
    }

    const userOrders = ordersData?.orders || [];
    // Check if user has existing orders
    if (userOrders.length > 0) {
      // User has orders, show hiring dialog
      setHiringDialogVisible(true);
    } else {
      // User has no orders, redirect to create order page
      router.push(`/orders/create?teamId=${team.id}`);
    }
  }, [team, isAuthenticated, showLoginModal, ordersData]);

  const handleHiringSubmit = useCallback(
    async (message: string, orderId: number) => {
      if (!team) return;

      try {
        setHiringLoading(true);
        const result = await apiService.hireTeam({
          teamId: team.id,
          message,
          orderId,
        });

        // Track successful hiring
        AnalyticsService.getInstance().logEvent("team_hired", {
          team_id: team.id.toString(),
          order_id: orderId.toString(),
        });

        // Navigate to the conversation after successful hiring
        if (result.conversation?.id) {
          router.push(`/chat/${result.conversation.id}`);
        } else {
          Alert.alert(t("success"), t("hiringRequestSent"));
        }

        setHiringDialogVisible(false);
      } catch (error) {
        console.error("Error hiring team:", error);
        Alert.alert(t("error"), t("failedToSendHiringRequest"));
      } finally {
        setHiringLoading(false);
      }
    },
    [team, t]
  );

  const handleHiringClose = useCallback(() => {
    setHiringDialogVisible(false);
  }, []);

  const header = useMemo(
    () => (
      <Header
        title={team?.name || t("team")}
        subtitle={t("manageTeamMembers")}
        showBackButton={true}
        onBackPress={() => router.back()}
        showNotificationsButton={!!user}
        showChatButton={!!user}
        unreadNotificationsCount={unreadNotificationsCount}
        unreadMessagesCount={unreadMessagesCount}
      />
    ),
    [team?.name, t, user, unreadNotificationsCount, unreadMessagesCount]
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
      <View
        style={{
          flexDirection: "row",
          marginBottom: Spacing.lg,
          marginHorizontal: Spacing.xl,
          alignItems: "center",
          gap: Spacing.md,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <TeamInfo
            team={team}
            canEdit={isTeamLead}
            onSave={handleSaveTeamName}
          />
        </View>

        {isTeamLead && (
          <TouchableOpacity
            style={[
              styles.addButton,
              {
                backgroundColor: colors.tint,
              },
            ]}
            onPress={handleOpenModal}
          >
            <IconSymbol
              name="person.badge.plus"
              size={20}
              color={colors.background}
            />
          </TouchableOpacity>
        )}
        {!isUserPartOfTeam && (
          <TouchableOpacity
            style={[
              styles.hireButton,
              {
                backgroundColor: colors.tint,
              },
            ]}
            onPress={handleHireTeam}
          >
            <Text style={[styles.hireButtonText, { color: colors.background }]}>
              {t("hire")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("members")} ({activeMembers.length})
        </Text>
        {activeMembers.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
            {t("noMembers")}
          </Text>
        ) : (
          activeMembers.map((member) => (
            <TeamMemberItem
              key={member.id}
              member={member}
              canRemove={isTeamLead && member.userId !== team.createdBy}
              onRemove={handleRemoveMember}
            />
          ))
        )}
      </View>

      <AddTeamMemberModal
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

      <HiringDialog
        visible={hiringDialogVisible}
        onClose={handleHiringClose}
        onSubmit={handleHiringSubmit}
        specialistName={team?.name || ""}
        specialistId={team?.id || 0}
        userOrders={ordersData?.orders || []}
        loading={hiringLoading}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
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
    margin: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    padding: Spacing.xl,
  },
  addButton: {
    padding: Spacing.md,
    borderRadius: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
    minHeight: 40,
    flexShrink: 0,
  },
  hireButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
    flexShrink: 0,
  },
  hireButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
