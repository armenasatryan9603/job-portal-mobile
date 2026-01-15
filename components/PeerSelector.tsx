import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Modal,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors, Shadows } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/TranslationContext";
import { apiService, User, SpecialistListResponse } from "@/categories/api";
import { router } from "expo-router";
import { CountBadge } from "@/components/CountBadge";

interface PeerSelectorProps {
  selectedPeerIds: number[];
  onPeersChange: (peerIds: number[]) => void;
  maxPeers?: number;
  currentUserId?: number;
  onTeamSelect?: (teamId: number) => void;
  selectedTeamId?: number;
  hideSearchAndAdd?: boolean; // Hide search and add peer functionality
}

interface Team {
  id: number;
  name: string;
  Members?: Array<{
    User: User;
    status?: string; // "pending", "accepted", "rejected"
    memberStatus?: string; // Added by backend for pending status
  }>;
}

// Sub-components
const PeerAvatar: React.FC<{ peer: User; size?: number; colors: any }> = ({
  peer,
  size = 40,
  colors,
}) => {
  if (peer.avatarUrl) {
    return (
      <Image
        source={{ uri: peer.avatarUrl }}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
    );
  }

  const initials = peer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.avatar,
        styles.avatarPlaceholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.avatarText, { color: colors.tabIconDefault }]}>
        {initials}
      </Text>
    </View>
  );
};

const PeerItem: React.FC<{
  peer: User;
  isSelected: boolean;
  onPress: () => void;
  colors: any;
}> = React.memo(({ peer, isSelected, onPress, colors }) => (
  <TouchableOpacity
    style={[
      styles.peerItem,
      {
        backgroundColor: isSelected
          ? colors.tint + "15"
          : colors.surface || colors.background,
        borderColor: isSelected ? colors.tint : colors.border,
        borderWidth: isSelected ? 2 : 1,
      },
      isSelected && styles.peerItemSelected,
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.peerItemContent}>
      <View style={styles.peerAvatarContainer}>
        <PeerAvatar peer={peer} size={34} colors={colors} />
        {isSelected && (
          <View
            style={[styles.selectedBadge, { backgroundColor: colors.tint }]}
          >
            <IconSymbol name="checkmark" size={8} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.peerInfo}>
        <Text
          style={[
            styles.peerName,
            {
              color: colors.text,
              fontWeight: isSelected ? "600" : "500",
            },
          ]}
        >
          {peer.name}
        </Text>
        {peer.email && (
          <Text
            style={[
              styles.peerEmail,
              {
                color: colors.textSecondary || colors.tabIconDefault,
              },
            ]}
            numberOfLines={1}
          >
            {peer.email}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.actionIconContainer,
          {
            backgroundColor: isSelected
              ? colors.tint + "20"
              : colors.backgroundSecondary || colors.background + "80",
          },
        ]}
      >
        <IconSymbol
          name={isSelected ? "checkmark.circle.fill" : "plus.circle.fill"}
          size={17}
          color={isSelected ? colors.tint : colors.tabIconDefault}
        />
      </View>
    </View>
  </TouchableOpacity>
));

const SelectedPeerChip: React.FC<{
  peer: User;
  onRemove: () => void;
  colors: any;
}> = React.memo(({ peer, onRemove, colors }) => (
  <View style={styles.selectedPeerChip}>
    <PeerAvatar peer={peer} size={24} colors={colors} />
    <Text style={[styles.chipText, { color: colors.text }]}>{peer.name}</Text>
    <TouchableOpacity
      onPress={onRemove}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <IconSymbol name="xmark.circle.fill" size={16} color={colors.text} />
    </TouchableOpacity>
  </View>
));

const CollapsibleSection: React.FC<{
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  colors: any;
}> = ({ title, isOpen, onToggle, children, colors }) => (
  <View>
    <TouchableOpacity
      style={[
        styles.collapsibleHeader,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
      onPress={onToggle}
    >
      <Text style={[styles.collapsibleTitle, { color: colors.text }]}>
        {title}
      </Text>
      <IconSymbol
        name={isOpen ? "chevron.up" : "chevron.down"}
        size={20}
        color={colors.text}
      />
    </TouchableOpacity>
    {isOpen && <View style={styles.collapsibleContent}>{children}</View>}
  </View>
);

const TeamItem: React.FC<{
  team: Team;
  isSelected: boolean;
  onSelect: () => void;
  colors: any;
  t: (key: string) => string;
}> = React.memo(({ team, isSelected, onSelect, colors, t }) => (
  <TouchableOpacity
    style={[
      styles.teamItem,
      {
        backgroundColor: isSelected
          ? colors.tint + "15"
          : colors.surface || colors.background,
        borderColor: isSelected ? colors.tint : colors.border,
        borderWidth: isSelected ? 2 : 1,
      },
      isSelected && styles.teamItemSelected,
    ]}
    onPress={onSelect}
    activeOpacity={0.7}
  >
    <View style={styles.teamItemContent}>
      <View
        style={[
          styles.teamIconContainer,
          {
            backgroundColor: isSelected
              ? colors.tint + "20"
              : colors.backgroundSecondary || colors.background + "80",
          },
        ]}
      >
        <IconSymbol name="person.3.fill" size={18} color={colors.tint} />
      </View>
      <View style={styles.teamDetails}>
        <Text
          style={[
            styles.teamName,
            {
              color: colors.text,
              fontWeight: isSelected ? "600" : "500",
            },
          ]}
        >
          {team.name}
        </Text>
        <Text
          style={[
            styles.teamMembers,
            {
              color: colors.textSecondary || colors.tabIconDefault,
            },
          ]}
        >
          {team.Members?.filter(
            (m) =>
              m.status === "accepted" ||
              (m.memberStatus !== "pending" && !m.status)
          ).length || 0}{" "}
          {t("members")}
        </Text>
      </View>
      <View
        style={[
          styles.actionIconContainer,
          {
            backgroundColor: isSelected
              ? colors.tint + "20"
              : colors.backgroundSecondary || colors.background + "80",
          },
        ]}
      >
        <IconSymbol
          name={isSelected ? "checkmark.circle.fill" : "plus.circle.fill"}
          size={17}
          color={isSelected ? colors.tint : colors.tabIconDefault}
        />
      </View>
    </View>
  </TouchableOpacity>
));

export const PeerSelector: React.FC<PeerSelectorProps> = ({
  selectedPeerIds,
  onPeersChange,
  maxPeers = 5,
  currentUserId,
  onTeamSelect,
  selectedTeamId,
  hideSearchAndAdd = false,
}) => {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const colors = ThemeColors[colorScheme ?? "light"];

  // State
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [myPeers, setMyPeers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [showMyPeers, setShowMyPeers] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [showAddPeerModal, setShowAddPeerModal] = useState(false);
  const [allSpecialists, setAllSpecialists] = useState<User[]>([]);
  const [loadingSpecialists, setLoadingSpecialists] = useState(false);
  const [specialistsPage, setSpecialistsPage] = useState(1);
  const [hasMoreSpecialists, setHasMoreSpecialists] = useState(true);
  const [addPeerSearchQuery, setAddPeerSearchQuery] = useState("");
  const [addPeerSearchResults, setAddPeerSearchResults] = useState<User[]>([]);
  const [isAddPeerSearching, setIsAddPeerSearching] = useState(false);
  const [selectedPeersToAdd, setSelectedPeersToAdd] = useState<number[]>([]);
  const [addingPeers, setAddingPeers] = useState(false);
  const [loadingPeers, setLoadingPeers] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Load data
  useEffect(() => {
    loadMyPeers();
    if (onTeamSelect) {
      loadTeams();
    }
  }, []);

  useEffect(() => {
    if (!showAddPeerModal) {
      loadMyPeers();
    }
  }, [showAddPeerModal]);

  const loadMyPeers = useCallback(async () => {
    try {
      setLoadingPeers(true);
      const peers = await apiService.getPeers();
      setMyPeers(peers);
    } catch (error) {
      console.error("Error loading peers:", error);
    } finally {
      setLoadingPeers(false);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    try {
      setLoadingTeams(true);
      const teamsData = await apiService.getTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error("Error loading teams:", error);
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  // Memoized peer lookup
  const peerMap = useMemo(() => {
    const map = new Map<number, User>();
    [...myPeers, ...searchResults].forEach((peer) => {
      map.set(peer.id, peer);
    });
    if (onTeamSelect && selectedTeamId) {
      const selectedTeam = teams.find((t) => t.id === selectedTeamId);
      // Only include accepted members
      selectedTeam?.Members?.filter(
        (m) =>
          m.status === "accepted" || (m.memberStatus !== "pending" && !m.status)
      ).forEach((member) => {
        map.set(member.User.id, member.User);
      });
    }
    return map;
  }, [myPeers, searchResults, teams, selectedTeamId, onTeamSelect]);

  // Handlers
  const handleAddPeer = useCallback(
    (peer: User) => {
      if (selectedPeerIds.length >= maxPeers) {
        Alert.alert(
          t("error"),
          t("maximumPeersAllowed").replace("{maxPeers}", maxPeers.toString())
        );
        return;
      }
      if (!selectedPeerIds.includes(peer.id)) {
        // Clear team selection when individual peer is selected
        if (onTeamSelect && selectedTeamId) {
          onTeamSelect(undefined as any);
        }
        onPeersChange([...selectedPeerIds, peer.id]);
        setSearchResults([]);
      }
    },
    [selectedPeerIds, maxPeers, onPeersChange, onTeamSelect, selectedTeamId, t]
  );

  const handleRemovePeer = useCallback(
    (peerId: number) => {
      onPeersChange(selectedPeerIds.filter((id) => id !== peerId));
    },
    [selectedPeerIds, onPeersChange]
  );

  const handleTeamSelect = useCallback(
    (team: Team) => {
      if (onTeamSelect) {
        // Only include members with status "accepted"
        const acceptedMembers =
          team.Members?.filter(
            (m) =>
              m.status === "accepted" ||
              (m.memberStatus !== "pending" && !m.status)
          ) || [];
        const teamMemberIds = acceptedMembers.map((m) => m.User.id);
        const validMemberIds = teamMemberIds.filter(
          (id) => id !== currentUserId
        );

        // Clear individual peer selections when team is selected
        onPeersChange(validMemberIds.slice(0, maxPeers));
        onTeamSelect(team.id);
      }
    },
    [onTeamSelect, currentUserId, maxPeers, onPeersChange]
  );

  const searchSpecialists = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const response = (await (apiService as any).request(
          `/users/specialists/search?q=${encodeURIComponent(query)}&limit=20`,
          {},
          true
        )) as { specialists?: any[] };
        const results = response.specialists || [];
        const filtered = results.filter(
          (user: any) =>
            user.id !== currentUserId && !selectedPeerIds.includes(user.id)
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error("Error searching specialists:", error);
        setSearchResults([]);
      }
    },
    [currentUserId, selectedPeerIds]
  );

  const loadAllSpecialistsForAdd = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        setLoadingSpecialists(true);
        const response = await apiService.getAllSpecialistsWithAuth(page, 20);
        const specialists = response.data || [];
        const users = specialists.map(
          (specialist: any) => specialist.User || specialist
        );

        const filtered = users.filter(
          (user: any) =>
            user.id !== currentUserId &&
            !selectedPeerIds.includes(user.id) &&
            !myPeers.some((p) => p.id === user.id)
        );

        if (append) {
          setAllSpecialists((prev) => [...prev, ...filtered]);
        } else {
          setAllSpecialists(filtered);
        }

        setHasMoreSpecialists(
          response.pagination?.hasNextPage || filtered.length === 20
        );
      } catch (error) {
        console.error("Error loading specialists:", error);
      } finally {
        setLoadingSpecialists(false);
      }
    },
    [currentUserId, selectedPeerIds, myPeers]
  );

  const searchSpecialistsForAdd = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        setAddPeerSearchResults([]);
        if (allSpecialists.length === 0) {
          loadAllSpecialistsForAdd(1, false);
        }
        return;
      }

      setIsAddPeerSearching(true);
      try {
        const response = (await (apiService as any).request(
          `/users/specialists/search?q=${encodeURIComponent(query)}&limit=20`,
          {},
          true
        )) as { specialists?: any[] };
        const results = response.specialists || [];
        const filtered = results.filter(
          (user: any) =>
            user.id !== currentUserId &&
            !selectedPeerIds.includes(user.id) &&
            !myPeers.some((p) => p.id === user.id)
        );
        setAddPeerSearchResults(filtered);
      } catch (error) {
        console.error("Error searching specialists:", error);
        setAddPeerSearchResults([]);
      } finally {
        setIsAddPeerSearching(false);
      }
    },
    [
      currentUserId,
      selectedPeerIds,
      myPeers,
      allSpecialists.length,
      loadAllSpecialistsForAdd,
    ]
  );

  const handleTogglePeerSelection = useCallback((peerId: number) => {
    setSelectedPeersToAdd((prev) =>
      prev.includes(peerId)
        ? prev.filter((id) => id !== peerId)
        : [...prev, peerId]
    );
  }, []);

  const handleAddSelectedPeers = useCallback(async () => {
    if (selectedPeersToAdd.length === 0) {
      Alert.alert(t("error"), t("selectPeersToAdd"));
      return;
    }

    setAddingPeers(true);
    const addedPeerIds: number[] = [];
    const failedPeerIds: number[] = [];

    try {
      for (const peerId of selectedPeersToAdd) {
        try {
          await apiService.addPeer(peerId);
          addedPeerIds.push(peerId);
        } catch (error: any) {
          console.error(`Error adding peer ${peerId}:`, error);
          failedPeerIds.push(peerId);
        }
      }

      await loadMyPeers();

      const newPeerIds = addedPeerIds.filter(
        (id) =>
          !selectedPeerIds.includes(id) &&
          selectedPeerIds.length + addedPeerIds.length <= maxPeers
      );
      if (newPeerIds.length > 0) {
        onPeersChange([...selectedPeerIds, ...newPeerIds]);
      }

      if (addedPeerIds.length > 0 && failedPeerIds.length === 0) {
        Alert.alert(
          t("success"),
          (
            t("peersAddedSuccessfully") || "{count} peer(s) added successfully"
          ).replace("{count}", addedPeerIds.length.toString())
        );
      } else if (addedPeerIds.length > 0 && failedPeerIds.length > 0) {
        Alert.alert(
          t("partialSuccess"),
          `${addedPeerIds.length} peer(s) added, ${failedPeerIds.length} failed`
        );
      } else {
        Alert.alert(t("error"), t("failedToAddPeers"));
      }

      setAddPeerSearchQuery("");
      setAddPeerSearchResults([]);
      setSelectedPeersToAdd([]);
      setShowAddPeerModal(false);
    } catch (error: any) {
      console.error("Error adding peers:", error);
      Alert.alert(t("error"), error.message || t("failedToAddPeers"));
    } finally {
      setAddingPeers(false);
    }
  }, [
    selectedPeersToAdd,
    selectedPeerIds,
    maxPeers,
    onPeersChange,
    loadMyPeers,
    t,
  ]);

  // Memoized filtered lists
  const availablePeers = useMemo(
    () => myPeers.filter((p) => !selectedPeerIds.includes(p.id)),
    [myPeers, selectedPeerIds]
  );

  const availableSearchResults = useMemo(
    () => searchResults.filter((p) => !selectedPeerIds.includes(p.id)),
    [searchResults, selectedPeerIds]
  );

  const selectedPeers = useMemo(
    () =>
      selectedPeerIds.map((id) => peerMap.get(id)).filter(Boolean) as User[],
    [selectedPeerIds, peerMap]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.text }]}>
          {t("selectPeers")}
        </Text>
        <CountBadge
          text={`${selectedPeerIds.length}/${maxPeers}`}
          color={colors.tint}
          showOnlyIfPositive={false}
          style={styles.countBadge}
          textStyle={styles.count}
        />
      </View>

      {/* Selected Peers */}
      {selectedPeers.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("selectedPeers")}
          </Text>
          <FlatList
            data={selectedPeers}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <SelectedPeerChip
                peer={item}
                onRemove={() => handleRemovePeer(item.id)}
                colors={colors}
              />
            )}
            contentContainerStyle={styles.selectedList}
          />
        </View>
      )}

      {/* Teams Section */}
      {onTeamSelect && (
        <CollapsibleSection
          title={`${t("myTeams")} (${teams.length})`}
          isOpen={showTeams}
          onToggle={() => setShowTeams(!showTeams)}
          colors={colors}
        >
          {loadingTeams ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          ) : teams.length === 0 ? (
            <View style={styles.emptyState}>
              <Text
                style={[styles.emptyText, { color: colors.tabIconDefault }]}
              >
                {t("noTeams")}
              </Text>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.tint }]}
                onPress={() => router.push("/profile/peers")}
              >
                <IconSymbol name="person.3" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>{t("createTeam")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.teamsList}>
              {teams.map((team) => (
                <TeamItem
                  key={team.id}
                  team={team}
                  isSelected={selectedTeamId === team.id}
                  onSelect={() => handleTeamSelect(team)}
                  colors={colors}
                  t={t}
                />
              ))}
            </View>
          )}
        </CollapsibleSection>
      )}

      {/* My Peers Section */}
      <CollapsibleSection
        title={`${t("myPeers")} (${myPeers.length})`}
        isOpen={showMyPeers}
        onToggle={() => setShowMyPeers(!showMyPeers)}
        colors={colors}
      >
        {loadingPeers ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.tint} />
          </View>
        ) : myPeers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
              {t("noPeers")}
            </Text>
            {!hideSearchAndAdd && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.tint }]}
                onPress={() => setShowAddPeerModal(true)}
              >
                <IconSymbol name="person.badge.plus" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>{t("addPeer")}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={styles.peersList}>
              {availablePeers.map((peer) => (
                <PeerItem
                  key={peer.id}
                  peer={peer}
                  isSelected={false}
                  onPress={() => handleAddPeer(peer)}
                  colors={colors}
                />
              ))}
            </View>
            {!hideSearchAndAdd && (
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={() => setShowAddPeerModal(true)}
              >
                <IconSymbol name="plus.circle" size={20} color={colors.tint} />
                <Text
                  style={[styles.secondaryButtonText, { color: colors.tint }]}
                >
                  {t("addMorePeers")}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </CollapsibleSection>

      {/* Add Peer Modal */}
      {!hideSearchAndAdd && (
        <Modal
          visible={showAddPeerModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowAddPeerModal(false);
            setAddPeerSearchQuery("");
            setAddPeerSearchResults([]);
            setSelectedPeersToAdd([]);
          }}
          onShow={() => {
            if (allSpecialists.length === 0) {
              loadAllSpecialistsForAdd(1, false);
            }
          }}
        >
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <TouchableOpacity
                onPress={() => {
                  setShowAddPeerModal(false);
                  setAddPeerSearchQuery("");
                  setAddPeerSearchResults([]);
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
                styles.modalSearchInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={t("searchSpecialists")}
              placeholderTextColor={colors.tabIconDefault}
              value={addPeerSearchQuery}
              onChangeText={(text) => {
                setAddPeerSearchQuery(text);
                searchSpecialistsForAdd(text);
              }}
            />

            {(isAddPeerSearching || loadingSpecialists) && (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            )}

            <FlatList
              data={
                addPeerSearchQuery.length >= 2
                  ? addPeerSearchResults
                  : allSpecialists
              }
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isSelected = selectedPeersToAdd.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalSearchResultItem,
                      {
                        backgroundColor: colors.background,
                        borderColor: isSelected ? colors.tint : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => handleTogglePeerSelection(item.id)}
                  >
                    <PeerAvatar peer={item} colors={colors} />
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
                    <IconSymbol
                      name={isSelected ? "checkmark.circle.fill" : "circle"}
                      size={24}
                      color={isSelected ? colors.tint : colors.border}
                    />
                  </TouchableOpacity>
                );
              }}
              onEndReached={() => {
                if (addPeerSearchQuery.length < 2 && hasMoreSpecialists) {
                  const nextPage = specialistsPage + 1;
                  setSpecialistsPage(nextPage);
                  loadAllSpecialistsForAdd(nextPage, true);
                }
              }}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                addPeerSearchQuery.length >= 2 && !isAddPeerSearching ? (
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
                loadingSpecialists && addPeerSearchQuery.length < 2 ? (
                  <View style={styles.modalLoadingContainer}>
                    <ActivityIndicator size="small" color={colors.tint} />
                  </View>
                ) : null
              }
            />
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  count: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectedSection: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  selectedList: {
    paddingVertical: Spacing.xs,
  },
  selectedPeerChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    marginRight: Spacing.sm,
    gap: Spacing.sm,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  collapsibleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  collapsibleTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  collapsibleContent: {
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.sm,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  teamsList: {
    gap: Spacing.sm,
  },
  teamItem: {
    borderRadius: 10,
    marginBottom: Spacing.xs,
    overflow: "hidden",
    ...Shadows.sm,
  },
  teamItemSelected: {
    ...Shadows.md,
  },
  teamItemContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  teamIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  teamDetails: {
    flex: 1,
    marginLeft: Spacing.xs,
  },
  teamName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 1,
    letterSpacing: -0.1,
  },
  teamMembers: {
    fontSize: 11,
    marginTop: 0,
    opacity: 0.7,
  },
  peersList: {
    gap: Spacing.sm,
  },
  peerItem: {
    borderRadius: 10,
    marginBottom: Spacing.xs,
    overflow: "hidden",
    ...Shadows.sm,
  },
  peerItemSelected: {
    ...Shadows.md,
  },
  peerItemContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  peerAvatarContainer: {
    position: "relative",
  },
  selectedBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
    ...Shadows.sm,
  },
  avatar: {
    borderRadius: 20,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "600",
  },
  peerInfo: {
    flex: 1,
    marginLeft: Spacing.xs,
  },
  peerName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 1,
    letterSpacing: -0.1,
  },
  peerEmail: {
    fontSize: 11,
    marginTop: 0,
    opacity: 0.7,
  },
  actionIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  searchSection: {
    marginTop: Spacing.sm,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  loadingContainer: {
    padding: Spacing.md,
    alignItems: "center",
  },
  searchResults: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
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
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
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
  modalSearchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  modalLoadingContainer: {
    padding: Spacing.md,
    alignItems: "center",
  },
  modalSearchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 8,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
});
