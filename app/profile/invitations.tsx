import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors, Typography } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { router, useFocusEffect } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { apiService, User } from "@/categories/api";
import { useAnalytics } from "@/hooks/useAnalytics";

interface PeerInvitation {
  id: number;
  userId: number;
  peerId: number;
  status: string;
  createdAt: string;
  User: User;
}

interface TeamInvitation {
  id: number;
  teamId: number;
  userId: number;
  status: string;
  joinedAt: string;
  Team: {
    id: number;
    name: string;
    createdBy: number;
    Creator: {
      id: number;
      name: string;
      email: string;
      avatarUrl?: string;
    };
    Members: Array<{
      id: number;
      userId: number;
      User: {
        id: number;
        name: string;
        avatarUrl?: string;
      };
    }>;
  };
}

export default function InvitationsScreen() {
  useAnalytics("Invitations");
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const [peerInvitations, setPeerInvitations] = useState<PeerInvitation[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const [peers, teams] = await Promise.all([
        apiService.getPendingPeerInvitations(),
        apiService.getPendingTeamInvitations(),
      ]);
      setPeerInvitations(peers);
      setTeamInvitations(teams);
    } catch (error) {
      console.error("Error loading invitations:", error);
      Alert.alert(t("error"), t("failedToLoadInvitations"));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInvitations();
    }, [])
  );

  const handleAcceptPeer = async (relationshipId: number) => {
    try {
      setProcessingId(relationshipId);
      await apiService.acceptPeerInvitation(relationshipId);
      Alert.alert(t("success"), t("peerInvitationAccepted"));
      await loadInvitations();
    } catch (error: any) {
      console.error("Error accepting peer invitation:", error);
      Alert.alert(t("error"), error.message || t("failedToAcceptInvitation"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectPeer = async (relationshipId: number) => {
    Alert.alert(t("rejectInvitation"), t("confirmRejectPeerInvitation"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("reject"),
        style: "destructive",
        onPress: async () => {
          try {
            setProcessingId(relationshipId);
            await apiService.rejectPeerInvitation(relationshipId);
            await loadInvitations();
          } catch (error: any) {
            console.error("Error rejecting peer invitation:", error);
            Alert.alert(
              t("error"),
              error.message || t("failedToRejectInvitation")
            );
          } finally {
            setProcessingId(null);
          }
        },
      },
    ]);
  };

  const handleAcceptTeam = async (teamMemberId: number) => {
    try {
      setProcessingId(teamMemberId);
      await apiService.acceptTeamInvitation(teamMemberId);
      Alert.alert(t("success"), t("teamInvitationAccepted"));
      await loadInvitations();
    } catch (error: any) {
      console.error("Error accepting team invitation:", error);
      Alert.alert(t("error"), error.message || t("failedToAcceptInvitation"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectTeam = async (teamMemberId: number) => {
    Alert.alert(t("rejectInvitation"), t("confirmRejectTeamInvitation"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("reject"),
        style: "destructive",
        onPress: async () => {
          try {
            setProcessingId(teamMemberId);
            await apiService.rejectTeamInvitation(teamMemberId);
            await loadInvitations();
          } catch (error: any) {
            console.error("Error rejecting team invitation:", error);
            Alert.alert(
              t("error"),
              error.message || t("failedToRejectInvitation")
            );
          } finally {
            setProcessingId(null);
          }
        },
      },
    ]);
  };

  const renderPeerInvitation = (invitation: PeerInvitation) => {
    const isProcessing = processingId === invitation.id;
    const inviter = invitation.User;

    return (
      <ResponsiveCard key={invitation.id}>
        <View style={styles.invitationItem}>
          {inviter.avatarUrl ? (
            <Image source={{ uri: inviter.avatarUrl }} style={styles.avatar} />
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
                {inviter.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>
          )}
          <View style={styles.invitationInfo}>
            <Text style={[styles.invitationTitle, { color: colors.text }]}>
              {t("peerInvitationFrom")} {inviter.name}
            </Text>
            <Text
              style={[
                styles.invitationSubtitle,
                { color: colors.tabIconDefault },
              ]}
            >
              {new Date(invitation.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.rejectButton, { borderColor: colors.border }]}
              onPress={() => handleRejectPeer(invitation.id)}
              disabled={isProcessing}
            >
              <Text style={[styles.rejectButtonText, { color: colors.text }]}>
                {t("reject")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptButton, { backgroundColor: colors.tint }]}
              onPress={() => handleAcceptPeer(invitation.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.acceptButtonText}>{t("accept")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ResponsiveCard>
    );
  };

  const renderTeamInvitation = (invitation: TeamInvitation) => {
    const isProcessing = processingId === invitation.id;
    const team = invitation.Team;

    return (
      <ResponsiveCard key={invitation.id}>
        <View style={styles.invitationItem}>
          <View
            style={[styles.teamIcon, { backgroundColor: colors.tint + "20" }]}
          >
            <IconSymbol name="person.3.fill" size={24} color={colors.tint} />
          </View>
          <View style={styles.invitationInfo}>
            <Text style={[styles.invitationTitle, { color: colors.text }]}>
              {t("teamInvitationTo")} {team.name}
            </Text>
            <Text
              style={[
                styles.invitationSubtitle,
                { color: colors.tabIconDefault },
              ]}
            >
              {t("invitedBy")} {team.Creator.name} • {team.Members.length}{" "}
              {t("members")}
            </Text>
            <Text
              style={[styles.invitationDate, { color: colors.tabIconDefault }]}
            >
              {new Date(invitation.joinedAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.rejectButton, { borderColor: colors.border }]}
              onPress={() => handleRejectTeam(invitation.id)}
              disabled={isProcessing}
            >
              <Text style={[styles.rejectButtonText, { color: colors.text }]}>
                {t("reject")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptButton, { backgroundColor: colors.tint }]}
              onPress={() => handleAcceptTeam(invitation.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.acceptButtonText}>{t("accept")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ResponsiveCard>
    );
  };

  const header = (
    <Header
      title={t("invitations")}
      subtitle={t("manageInvitations")}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
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

  const totalInvitations = peerInvitations.length + teamInvitations.length;

  return (
    <Layout header={header}>
      <ScrollView style={styles.container}>
        {totalInvitations === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol
              name="envelope"
              size={64}
              color={colors.tabIconDefault}
            />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {t("noInvitations")}
            </Text>
            <Text
              style={[styles.emptySubtext, { color: colors.tabIconDefault }]}
            >
              {t("noInvitationsDescription")}
            </Text>
          </View>
        ) : (
          <>
            {/* Peer Invitations */}
            {peerInvitations.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("peerInvitations")} ({peerInvitations.length})
                </Text>
                {peerInvitations.map((invitation) =>
                  renderPeerInvitation(invitation)
                )}
              </View>
            )}

            {/* Team Invitations */}
            {teamInvitations.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("teamInvitations")} ({teamInvitations.length})
                </Text>
                {teamInvitations.map((invitation) =>
                  renderTeamInvitation(invitation)
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    marginBottom: Spacing.md,
  },
  invitationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
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
  teamIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  invitationInfo: {
    flex: 1,
  },
  invitationTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  invitationSubtitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  invitationDate: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  acceptButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  rejectButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
});
