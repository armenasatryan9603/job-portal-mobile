import { useState, useCallback, useMemo } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { router } from "expo-router";
import { Alert } from "react-native";
import { apiService } from "@/categories/api";
import { useTranslation } from "@/contexts/TranslationContext";

export interface TeamMember {
  id: number;
  userId: number;
  role: string;
  isActive: boolean;
  status?: string; // "pending", "accepted", "rejected"
  memberStatus?: string; // Added by backend for pending status
  User: {
    id: number;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
}

export interface Team {
  id: number;
  name: string;
  createdBy: number;
  createdAt: string;
  isActive: boolean;
  Members?: TeamMember[];
}

export const useTeamData = (teamId: number | undefined) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const loadTeam = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      const teams = await apiService.getTeams();
      const foundTeam = teams.find((t: Team) => t.id === teamId);
      if (foundTeam) {
        console.log("Loaded team:", foundTeam);
        console.log("Team members:", foundTeam.Members);
        setTeam(foundTeam);
      } else {
        Alert.alert(t("error"), t("teamNotFound"));
        router.back();
      }
    } catch (error) {
      console.error("Error loading team:", error);
      Alert.alert(t("error"), t("failedToLoadTeam"));
    } finally {
      setLoading(false);
    }
  }, [teamId, t]);

  useFocusEffect(
    useCallback(() => {
      loadTeam();
    }, [loadTeam])
  );

  const updateTeam = useCallback(
    (updater: (team: Team | null) => Team | null) => {
      setTeam(updater);
    },
    []
  );

  return { team, loading, reloadTeam: loadTeam, updateTeam };
};

export const useTeamId = () => {
  const { id } = useLocalSearchParams();
  return useMemo(() => {
    if (typeof id === "string") return parseInt(id, 10);
    if (Array.isArray(id) && id.length > 0) return parseInt(id[0], 10);
    return undefined;
  }, [id]);
};
