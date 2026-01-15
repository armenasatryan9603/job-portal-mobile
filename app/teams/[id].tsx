import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Button } from "@/components/ui/button";
import {
  BorderRadius,
  Spacing,
  ThemeColors,
  Typography,
} from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { apiService } from "@/categories/api";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTeamData } from "@/hooks/useTeamData";
import { useSpecialistSearch } from "@/hooks/useSpecialistSearch";
import { TeamMemberItem } from "@/components/TeamMemberItem";
import { AddTeamMemberModal } from "@/components/AddTeamMemberModal";
import { TeamGallerySection } from "@/components/TeamGallerySection";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { HiringDialog } from "@/components/HiringDialog";
import { useModal } from "@/contexts/ModalContext";
import { useMyOrders } from "@/hooks/useApi";
import AnalyticsService from "@/categories/AnalyticsService";
import { fileUploadService } from "@/categories/fileUpload";

export default function TeamDetailScreen() {
  useAnalytics("TeamDetail");
  const { id } = useLocalSearchParams<{ id: string }>();
  const teamId = id ? parseInt(id, 10) : undefined;
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const colors = ThemeColors[isDark ? "dark" : "light"];
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

  // Banner image state
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Team description and name editing state
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState("");
  const [teamNameText, setTeamNameText] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);

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

  // Sync banner and description with team data
  useEffect(() => {
    if (team) {
      const teamAny = team as any;
      setBannerImage(teamAny.bannerUrl || null);
      setDescriptionText(teamAny.description || teamAny.bio || "");
    }
  }, [team]);

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

            console.log("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz", addedMemberIds);
            //
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
        console.log("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
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

  // Banner handlers
  const handleBannerTap = () => {
    if (!isTeamLead || uploadingBanner) return;

    const options = [];
    if (bannerImage) {
      options.push({
        text: t("removeBanner"),
        onPress: handleBannerRemove,
        style: "destructive" as const,
      });
    }
    options.push({
      text: t("uploadBanner"),
      onPress: handleBannerUpload,
    });

    Alert.alert(t("bannerOptions"), t("chooseBannerAction"), [
      ...options,
      {
        text: t("cancel"),
        style: "cancel" as const,
      },
    ]);
  };

  const handleBannerRemove = async () => {
    if (!isTeamLead || !team || !teamId) return;

    try {
      setUploadingBanner(true);
      await apiService.updateTeam(teamId, { bannerUrl: null });
      setBannerImage(null);
      await reloadTeam();
      AnalyticsService.getInstance().logEvent("team_updated", {
        update_type: "banner_removed",
      });
    } catch (error) {
      console.error("Error removing banner:", error);
      Alert.alert(t("error"), t("failedToRemoveBanner"));
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleBannerUpload = async () => {
    if (!isTeamLead) return;

    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(t("permissionRequired"), t("permissionToAccessCameraRoll"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 1], // Banner ratio
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const mediaFile = {
          uri: asset.uri,
          fileName: `team_banner_${Date.now()}.jpg`,
          type: "image" as const,
          mimeType: "image/jpeg",
          fileSize: asset.fileSize || 0,
        };

        setBannerImage(asset.uri);
        setUploadingBanner(true);

        try {
          const uploadResult = await fileUploadService.uploadProfilePicture(
            mediaFile
          );
          if (uploadResult.success && uploadResult.fileUrl) {
            if (teamId) {
              await apiService.updateTeam(teamId, {
                bannerUrl: uploadResult.fileUrl,
              });
              await reloadTeam();
            }
            setBannerImage(uploadResult.fileUrl);
            AnalyticsService.getInstance().logEvent("team_updated", {
              update_type: "banner",
            });
          } else {
            throw new Error(uploadResult.error || t("uploadFailed"));
          }
        } catch (error) {
          console.error("Error uploading banner:", error);
          Alert.alert(t("error"), t("failedToUploadProfilePicture"));
          setBannerImage(null);
        } finally {
          setUploadingBanner(false);
        }
      }
    } catch (error) {
      console.error("Error selecting banner:", error);
      Alert.alert(t("error"), t("failedToSelectImage"));
    }
  };

  // Description handlers
  const handleStartEditDescription = () => {
    const teamAny = team as any;
    setDescriptionText(teamAny.description || teamAny.bio || "");
    setTeamNameText(team?.name || "");
    setIsEditingDescription(true);
  };

  const handleCancelEditDescription = () => {
    const teamAny = team as any;
    setDescriptionText(teamAny.description || teamAny.bio || "");
    setTeamNameText(team?.name || "");
    setIsEditingDescription(false);
  };

  const handleSaveDescription = async () => {
    if (!isTeamLead || !team || !teamId) return;

    // Validate team name
    if (!teamNameText.trim()) {
      Alert.alert(t("error"), t("teamNameRequired"));
      return;
    }

    try {
      setSavingDescription(true);

      // Update team name if it changed
      if (teamNameText.trim() !== team.name) {
        await apiService.updateTeamName(teamId, teamNameText.trim());
      }

      // Update description
      await apiService.updateTeam(teamId, {
        description: descriptionText.trim() || null,
      });

      await reloadTeam();
      AnalyticsService.getInstance().logEvent("team_updated", {
        update_type: "description_and_name",
      });
      setIsEditingDescription(false);
    } catch (error: any) {
      console.error("Error updating team:", error);
      Alert.alert(t("error"), error.message || t("failedToUpdateProfile"));
    } finally {
      setSavingDescription(false);
    }
  };

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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t("loadingProfile")}
          </Text>
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
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => reloadTeam()}
          >
            <Text
              style={[styles.retryButtonText, { color: colors.textInverse }]}
            >
              {t("retry")}
            </Text>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }

  return (
    <Layout header={header}>
      <ScrollView
        style={{
          flex: 1,
          marginBottom: 4 * Spacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Team Header with banner background */}
          <ResponsiveCard padding={0} style={{ overflow: "hidden" }}>
            <ImageBackground
              source={bannerImage ? { uri: bannerImage } : undefined}
              style={[{ paddingTop: bannerImage ? 140 : 0 }]}
              imageStyle={styles.bannerImage}
            >
              {isTeamLead && (
                <TouchableOpacity
                  style={styles.bannerTapArea}
                  onPress={handleBannerTap}
                  activeOpacity={0.8}
                  disabled={uploadingBanner}
                >
                  {!bannerImage && (
                    <View
                      style={[
                        styles.bannerPlaceholder,
                        { backgroundColor: colors.border, width: "100%" },
                      ]}
                    >
                      <IconSymbol
                        name="photo"
                        size={28}
                        color={colors.tabIconDefault}
                      />
                      <Text
                        style={[
                          styles.bannerPlaceholderText,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {t("addBanner")}
                      </Text>
                    </View>
                  )}
                  {uploadingBanner && (
                    <View style={styles.bannerLoadingOverlay}>
                      <ActivityIndicator size="small" color={colors.tint} />
                    </View>
                  )}
                </TouchableOpacity>
              )}

              <View style={styles.teamHeader}>
                <View style={styles.teamIconContainer}>
                  <View
                    style={[
                      styles.teamIcon,
                      styles.defaultTeamIcon,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <IconSymbol
                      name="person.3.fill"
                      size={40}
                      color={colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.teamInfo}>
                  <View style={styles.nameAndEditContainer}>
                    <Text style={[styles.teamName, { color: colors.text }]}>
                      {team.name}
                    </Text>
                  </View>

                  <View style={styles.teamMetaContainer}>
                    <View style={styles.metaRow}>
                      <IconSymbol
                        name="calendar"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.teamMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("createdOn")}{" "}
                        {new Date(team.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <IconSymbol
                        name={
                          team.isActive
                            ? "checkmark.circle.fill"
                            : "xmark.circle.fill"
                        }
                        size={14}
                        color={team.isActive ? "#4CAF50" : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.teamMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {team.isActive ? t("activeTeam") : t("inactiveTeam")}
                      </Text>
                    </View>
                  </View>

                  {!isUserPartOfTeam && (
                    <TouchableOpacity
                      style={[
                        styles.hireButton,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={handleHireTeam}
                    >
                      <Text
                        style={[
                          styles.hireButtonText,
                          { color: colors.textInverse },
                        ]}
                      >
                        {t("hire")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ImageBackground>
          </ResponsiveCard>

          {/* Team Description */}
          <ResponsiveCard>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("about")}
              </Text>
              {isTeamLead && !isEditingDescription && (
                <Button
                  onPress={handleStartEditDescription}
                  title={t("edit")}
                  variant="primary"
                  icon="pencil"
                  iconSize={14}
                  backgroundColor={colors.primary}
                />
              )}
            </View>

            {isEditingDescription ? (
              <View style={styles.descriptionEditContainer}>
                <View style={styles.editFieldContainer}>
                  <Text style={[styles.editFieldLabel, { color: colors.text }]}>
                    {t("teamName")}
                  </Text>
                  <TextInput
                    style={[
                      styles.teamNameTextInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={teamNameText}
                    onChangeText={setTeamNameText}
                    placeholder={t("teamName")}
                    placeholderTextColor={colors.tabIconDefault}
                    maxLength={100}
                  />
                </View>
                <View style={styles.editFieldContainer}>
                  <Text style={[styles.editFieldLabel, { color: colors.text }]}>
                    {t("description")}
                  </Text>
                  <TextInput
                    style={[
                      styles.descriptionTextInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={descriptionText}
                    onChangeText={setDescriptionText}
                    placeholder={t("tellUsAboutYourTeam")}
                    placeholderTextColor={colors.tabIconDefault}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    maxLength={500}
                  />
                </View>
                {descriptionText.length > 400 && (
                  <Text
                    style={[
                      styles.characterCount,
                      { color: colors.tabIconDefault },
                      descriptionText.length > 480 && { color: "#FF6B6B" },
                    ]}
                  >
                    {descriptionText.length}/500 {t("charactersRemaining")}
                  </Text>
                )}
                <View style={styles.descriptionEditActions}>
                  <Button
                    variant="outline"
                    icon="xmark"
                    iconSize={14}
                    title={t("cancel")}
                    iconPosition="left"
                    backgroundColor={colors.background}
                    textColor={colors.text}
                    onPress={handleCancelEditDescription}
                    disabled={savingDescription}
                  />
                  <Button
                    variant="primary"
                    icon="checkmark"
                    iconSize={14}
                    title={t("save")}
                    iconPosition="left"
                    backgroundColor={colors.primary}
                    textColor="white"
                    onPress={handleSaveDescription}
                    disabled={savingDescription}
                  />
                </View>
              </View>
            ) : (
              <>
                {descriptionText ? (
                  <Text
                    style={[styles.descriptionText, { color: colors.text }]}
                  >
                    {descriptionText}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.descriptionText,
                      { color: colors.textSecondary, fontStyle: "italic" },
                    ]}
                  >
                    {t("noDescriptionProvided")}
                  </Text>
                )}
              </>
            )}
          </ResponsiveCard>

          {/* Members Section */}
          <ResponsiveCard>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("members")} ({activeMembers.length})
              </Text>
              {isTeamLead && (
                <Button
                  onPress={handleOpenModal}
                  title={t("addMember")}
                  variant="primary"
                  icon="person.badge.plus"
                  iconSize={14}
                  backgroundColor={colors.primary}
                />
              )}
            </View>

            {activeMembers.length === 0 ? (
              <View style={styles.emptyMembersContainer}>
                <IconSymbol
                  name="person.3"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.emptyMembersTitle, { color: colors.text }]}
                >
                  {t("noMembers")}
                </Text>
                <Text
                  style={[
                    styles.emptyMembersDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {isTeamLead
                    ? t("addMembersToGetStarted")
                    : t("noMembersInTeam")}
                </Text>
              </View>
            ) : (
              <View style={styles.membersList}>
                {activeMembers.map((member) => (
                  <TeamMemberItem
                    key={member.id}
                    member={member}
                    canRemove={isTeamLead && member.userId !== team.createdBy}
                    onRemove={handleRemoveMember}
                  />
                ))}
              </View>
            )}
          </ResponsiveCard>

          {/* Gallery Section */}
          {teamId && (
            <ResponsiveCard>
              <TeamGallerySection
                teamId={teamId}
                colors={colors}
                isTeamLead={isTeamLead}
              />
            </ResponsiveCard>
          )}
        </ResponsiveContainer>
      </ScrollView>

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
  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Team Header
  teamHeader: {
    padding: Spacing.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  teamIconContainer: {
    position: "relative",
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  teamIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  defaultTeamIcon: {
    justifyContent: "center",
    alignItems: "center",
  },
  teamInfo: {
    flex: 1,
  },
  nameAndEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamName: {
    fontSize: 24,
    fontWeight: "700",
  },
  teamMetaContainer: {
    gap: 8,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  teamMeta: {
    fontSize: 14,
    fontWeight: "500",
  },

  // Banner
  bannerTapArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerImage: {
    width: "100%",
    height: 140,
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bannerPlaceholderText: {
    fontSize: 14,
    fontWeight: "600",
  },
  bannerLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
  },

  // Section titles
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    marginBottom: 16,
  },

  // Description
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  descriptionEditContainer: {
    gap: 16,
  },
  editFieldContainer: {
    gap: 8,
  },
  editFieldLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  teamNameTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  descriptionTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  descriptionEditActions: {
    flexDirection: "row",
    gap: 10,
  },

  // Members
  membersList: {
    gap: 12,
  },
  emptyMembersContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyMembersTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyMembersDescription: {
    fontSize: 14,
    textAlign: "center",
  },

  // Hire Button
  hireButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    alignSelf: "flex-start",
  },
  hireButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
