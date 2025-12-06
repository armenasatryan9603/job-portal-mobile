import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Button } from "@/components/ui/button";
import { Spacing, ThemeColors, Typography } from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { apiService, User } from "@/services/api";
import { useFocusEffect } from "expo-router";
import { useAnalytics } from "@/hooks/useAnalytics";

interface Team {
  id: number;
  name: string;
  createdBy: number;
  createdAt: string;
  isActive: boolean;
  Members?: Array<{
    id: number;
    userId: number;
    role: string;
    isActive: boolean;
    User: User;
  }>;
}

export default function PeersScreen() {
  useAnalytics("Peers");
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const [peers, setPeers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [allSpecialists, setAllSpecialists] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingSpecialists, setLoadingSpecialists] = useState(false);
  const [specialistsPage, setSpecialistsPage] = useState(1);
  const [hasMoreSpecialists, setHasMoreSpecialists] = useState(true);
  const [showAddPeerModal, setShowAddPeerModal] = useState(false);
  const [selectedPeersToAdd, setSelectedPeersToAdd] = useState<number[]>([]);
  const [addingPeers, setAddingPeers] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  const loadPeers = async () => {
    try {
      setLoading(true);
      const peersData = await apiService.getPeers();
      console.log("Loaded peers data:", peersData);
      console.log("Number of peers:", peersData?.length || 0);
      setPeers(peersData || []);
    } catch (error) {
      console.error("Error loading peers:", error);
      Alert.alert(t("error"), t("failedToLoadPeers") || "Failed to load peers");
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const teamsData = await apiService.getTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error("Error loading teams:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPeers();
      loadTeams();
    }, [])
  );

  const loadAllSpecialists = async (
    page: number = 1,
    append: boolean = false
  ) => {
    try {
      setLoadingSpecialists(true);
      const response = await apiService.getAllSpecialistsWithAuth(page, 20);
      console.log("Specialists API response:", response);

      // Backend returns { data: [...], pagination: {...} }
      const specialists = response.data || [];
      console.log("Extracted specialists:", specialists.length);

      const currentUserId = user?.id;

      // Extract User object from each specialist (backend wraps it in User property)
      const users = specialists.map((specialist: any) => {
        // Backend returns specialist with nested User object
        return specialist.User || specialist;
      });

      const filtered = users.filter(
        (specialist: any) =>
          specialist.id !== currentUserId &&
          !peers.some((p) => p.id === specialist.id)
      );

      console.log("Filtered specialists:", filtered.length);

      if (append) {
        setAllSpecialists((prev) => [...prev, ...filtered]);
      } else {
        setAllSpecialists(filtered);
      }

      setHasMoreSpecialists(
        response.pagination?.hasNextPage || filtered.length === 20
      );
    } catch (error: any) {
      console.error("Error loading specialists:", error);
      console.error("Error details:", error.message);
      Alert.alert(t("error"), error.message || t("failedToLoadSpecialists"));
    } finally {
      setLoadingSpecialists(false);
    }
  };

  const searchSpecialists = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      // If search is cleared, show all specialists again
      if (allSpecialists.length === 0) {
        loadAllSpecialists(1, false);
      }
      return;
    }

    setIsSearching(true);
    try {
      const response = (await (apiService as any).request(
        `/users/specialists/search?q=${encodeURIComponent(query)}&limit=20`,
        {},
        true
      )) as { specialists?: any[] };
      const results = response.specialists || [];
      // Backend returns users directly, not wrapped in User object
      const currentUserId = user?.id;
      const filtered = results.filter(
        (specialist: any) =>
          specialist.id !== currentUserId &&
          !peers.some((p) => p.id === specialist.id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error("Error searching specialists:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTogglePeerSelection = (peerId: number) => {
    setSelectedPeersToAdd((prev) => {
      if (prev.includes(peerId)) {
        return prev.filter((id) => id !== peerId);
      } else {
        return [...prev, peerId];
      }
    });
  };

  const handleAddSelectedPeers = async () => {
    if (selectedPeersToAdd.length === 0) {
      Alert.alert(t("error"), t("selectPeersToAdd"));
      return;
    }

    setAddingPeers(true);
    const addedPeerIds: number[] = [];
    const failedPeerIds: number[] = [];

    try {
      // Add all selected peers
      for (const peerId of selectedPeersToAdd) {
        try {
          const result = await apiService.addPeer(peerId);
          addedPeerIds.push(peerId);
        } catch (error: any) {
          console.error(`Error adding peer ${peerId}:`, error);
          failedPeerIds.push(peerId);
        }
      }

      // Reload peers to see the newly added ones
      // Small delay to ensure backend has processed the changes
      await new Promise((resolve) => setTimeout(resolve, 300));
      await loadPeers();

      // Remove added peers from the list
      setAllSpecialists((prev) =>
        prev.filter((s) => !addedPeerIds.includes(s.id))
      );

      // Reset modal state
      setSearchQuery("");
      setSearchResults([]);
      setSelectedPeersToAdd([]);
      setShowAddPeerModal(false);
    } catch (error: any) {
      console.error("Error adding peers:", error);
      Alert.alert(t("error"), error.message || t("failedToAddPeers"));
    } finally {
      setAddingPeers(false);
    }
  };

  const handleLoadMoreSpecialists = () => {
    if (!loadingSpecialists && hasMoreSpecialists) {
      const nextPage = specialistsPage + 1;
      setSpecialistsPage(nextPage);
      loadAllSpecialists(nextPage, true);
    }
  };

  const handleRemovePeer = async (peerId: number) => {
    Alert.alert(t("removePeer"), t("confirmRemovePeer"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("remove"),
        style: "destructive",
        onPress: async () => {
          try {
            await apiService.removePeer(peerId);
            // Remove peer from local state instead of reloading
            setPeers((prevPeers) =>
              prevPeers.filter((peer) => peer.id !== peerId)
            );
          } catch (error: any) {
            console.error("Error removing peer:", error);
            Alert.alert(t("error"), error.message || t("failedToRemovePeer"));
          }
        },
      },
    ]);
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      Alert.alert(t("error"), t("teamNameRequired"));
      return;
    }

    try {
      setCreatingTeam(true);
      await apiService.createTeam(newTeamName.trim());
      setNewTeamName("");
      setShowCreateTeamModal(false);
      await loadTeams();
    } catch (error: any) {
      console.error("Error creating team:", error);
      Alert.alert(t("error"), error.message || t("failedToCreateTeam"));
    } finally {
      setCreatingTeam(false);
    }
  };

  const renderPeerItem = (peer: User & { relationshipStatus?: string }) => {
    const isPending = peer.relationshipStatus === "pending";
    return (
      <ResponsiveCard
        margin={0}
        padding={0}
        style={[
          { marginTop: Spacing.lg },
          isPending && {
            borderLeftWidth: 4,
            borderLeftColor: "#FF9500",
            backgroundColor: isDark ? "#FF950010" : "#FF950008",
          },
        ]}
        key={peer.id}
      >
        <View style={styles.peerItem}>
          {peer.avatarUrl ? (
            <Image source={{ uri: peer.avatarUrl }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                { backgroundColor: colors.border },
              ]}
            >
              <Text
                style={[styles.avatarText, { color: colors.tabIconDefault }]}
              >
                {peer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>
          )}
          <View style={styles.peerInfo}>
            <View style={styles.peerNameRow}>
              <Text style={[styles.peerName, { color: colors.text }]}>
                {peer.name}
              </Text>
              {isPending && (
                <View style={styles.pendingBadge}>
                  <IconSymbol name="clock.fill" size={12} color="#FF9500" />
                  <Text style={styles.pendingBadgeText}>
                    {t("pending") || "Pending"}
                  </Text>
                </View>
              )}
            </View>
            {peer.email && (
              <Text
                style={[styles.peerEmail, { color: colors.tabIconDefault }]}
              >
                {peer.email}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => handleRemovePeer(peer.id)}
            style={styles.removeButton}
          >
            <IconSymbol name="trash" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </ResponsiveCard>
    );
  };

  const renderTeamItem = (team: Team) => (
    <ResponsiveCard
      margin={0}
      padding={0}
      style={{ marginTop: Spacing.lg }}
      key={team.id}
    >
      <TouchableOpacity
        onPress={() => router.push(`/profile/teams/${team.id}`)}
      >
        <View style={styles.teamItem}>
          <View style={styles.teamInfo}>
            <Text style={[styles.teamName, { color: colors.text }]}>
              {team.name}
            </Text>
            <Text
              style={[styles.teamMembers, { color: colors.tabIconDefault }]}
            >
              {team.Members?.length || 0} {t("members")}
            </Text>
          </View>

          <IconSymbol name="chevron.right" size={20} color={colors.text} />
        </View>
      </TouchableOpacity>
    </ResponsiveCard>
  );

  const header = (
    <Header
      title={t("peers")}
      subtitle={t("managePeersAndTeams")}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  return (
    <Layout header={header}>
      <ScrollView style={{ marginBottom: 3 * Spacing.xxxl }}>
        {/* Invitations Button */}
        <View
          style={[
            {
              paddingHorizontal: Spacing.lg,
              flexDirection: "row",
              justifyContent: "flex-end",
            },
          ]}
        >
          <Button
            onPress={() => router.push("/profile/invitations")}
            title={t("invitations")}
            icon="envelope.fill"
            variant="outline"
          />
        </View>

        {/* My Peers Section */}
        <View style={styles.section}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("myPeers")} ({peers.length})
            </Text>
            <Button
              onPress={() => setShowAddPeerModal(true)}
              title={t("addPeer")}
              icon="person.badge.plus"
              variant="primary"
            />
          </View>
          {loading ? (
            <ActivityIndicator size="large" color={colors.tint} />
          ) : peers.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
              {t("noPeers")}
            </Text>
          ) : (
            peers.map(renderPeerItem)
          )}
        </View>

        {/* My Teams Section */}
        <View style={styles.section}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("myTeams")} ({teams.length})
            </Text>
            <Button
              onPress={() => setShowCreateTeamModal(true)}
              title={t("createTeam")}
              icon="person.3"
              variant="primary"
            />
          </View>
          {teams.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
              {t("noTeams")}
            </Text>
          ) : (
            teams.map((team) => renderTeamItem(team))
          )}
        </View>
      </ScrollView>

      {/* Add Peer Modal */}
      <Modal
        visible={showAddPeerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowAddPeerModal(false);
          setSearchQuery("");
          setSearchResults([]);
          setSelectedPeersToAdd([]);
        }}
        onShow={() => {
          // Load all specialists when modal opens
          if (allSpecialists.length === 0) {
            loadAllSpecialists(1, false);
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
            <TouchableOpacity
              onPress={() => {
                setShowAddPeerModal(false);
                setSearchQuery("");
                setSearchResults([]);
                setSelectedPeersToAdd([]);
              }}
              style={styles.closeButton}
            >
              <IconSymbol name="xmark" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("addPeers")}{" "}
              {selectedPeersToAdd.length > 0 &&
                `(${selectedPeersToAdd.length})`}
            </Text>
            {selectedPeersToAdd.length > 0 && (
              <TouchableOpacity
                onPress={handleAddSelectedPeers}
                disabled={addingPeers}
                style={[
                  styles.addSelectedButton,
                  { backgroundColor: colors.tint },
                ]}
              >
                {addingPeers ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addSelectedButtonText}>
                    {t("addSelected")}
                  </Text>
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
            placeholder={t("searchSpecialists") || "Search specialists..."}
            placeholderTextColor={colors.tabIconDefault}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchSpecialists(text);
            }}
          />

          {(isSearching || loadingSpecialists) && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          )}

          <FlatList
            data={searchQuery.length >= 2 ? searchResults : allSpecialists}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const isSelected = selectedPeersToAdd.includes(item.id);
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
                  onPress={() => handleTogglePeerSelection(item.id)}
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
                  {isSelected ? (
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={24}
                      color={colors.tint}
                    />
                  ) : (
                    <IconSymbol name="circle" size={24} color={colors.border} />
                  )}
                </TouchableOpacity>
              );
            }}
            onEndReached={() => {
              if (searchQuery.length < 2 && hasMoreSpecialists) {
                handleLoadMoreSpecialists();
              }
            }}
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

      {/* Create Team Modal */}
      <Modal
        visible={showCreateTeamModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateTeamModal(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowCreateTeamModal(false)}
              style={styles.closeButton}
            >
              <IconSymbol name="xmark" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("createTeam")}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("teamName")}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={t("enterTeamName")}
              placeholderTextColor={colors.tabIconDefault}
              value={newTeamName}
              onChangeText={setNewTeamName}
            />

            <Button
              onPress={handleCreateTeam}
              title={t("create")}
              icon="checkmark"
              variant="primary"
              loading={creatingTeam}
              style={styles.createButton}
            />
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    marginBottom: Spacing.lg,
  },
  peerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  teamItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
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
  peerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  peerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FF950020",
    borderWidth: 1,
    borderColor: "#FF9500",
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF9500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  peerEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "600",
  },
  teamMembers: {
    fontSize: 14,
    marginTop: 2,
  },
  removeButton: {
    padding: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    padding: Spacing.xl,
  },
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
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
  },
  placeholder: {
    width: 40,
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
  modalContent: {
    padding: Spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  createButton: {
    marginTop: Spacing.md,
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
});
