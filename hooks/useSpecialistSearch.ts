import { useState, useCallback, useMemo } from "react";
import { Alert } from "react-native";
import { apiService, User } from "@/services/api";
import { useTranslation } from "@/contexts/TranslationContext";
import { Team } from "./useTeamData";

export const useSpecialistSearch = (team: Team | null) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [allSpecialists, setAllSpecialists] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingSpecialists, setLoadingSpecialists] = useState(false);
  const [specialistsPage, setSpecialistsPage] = useState(1);
  const [hasMoreSpecialists, setHasMoreSpecialists] = useState(true);
  const { t } = useTranslation();

  const existingMemberIds = useMemo(
    () => team?.Members?.map((m) => m.User.id) || [],
    [team?.Members]
  );

  // Get IDs of specialists with pending invitations
  const pendingInvitationIds = useMemo(
    () =>
      team?.Members?.filter(
        (m) =>
          m.status === "pending" ||
          (m as any).memberStatus === "pending"
      ).map((m) => m.User.id) || [],
    [team?.Members]
  );

  const extractUsers = useCallback(
    (specialists: Array<{ User?: User } | User>) => {
      return specialists.map((specialist) => {
        if ("User" in specialist && specialist.User) {
          return specialist.User;
        }
        return specialist as User;
      });
    },
    []
  );

  const filterSpecialists = useCallback(
    (users: User[], teamCreatedBy?: number) => {
      return users.filter(
        (user) =>
          user.id !== teamCreatedBy &&
          !existingMemberIds.includes(user.id) &&
          !pendingInvitationIds.includes(user.id)
      );
    },
    [existingMemberIds, pendingInvitationIds]
  );

  const loadAllSpecialists = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        setLoadingSpecialists(true);
        const response = await apiService.getAllSpecialistsWithAuth(page, 20);
        const specialists = response.data || [];
        const users = extractUsers(specialists);
        const filtered = filterSpecialists(users, team?.createdBy);

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
        Alert.alert(t("error"), error.message || t("failedToLoadSpecialists"));
      } finally {
        setLoadingSpecialists(false);
      }
    },
    [team?.createdBy, extractUsers, filterSpecialists, t]
  );

  const searchSpecialists = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        setSearchResults([]);
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
        const filtered = filterSpecialists(results, team?.createdBy);
        setSearchResults(filtered);
      } catch (error) {
        console.error("Error searching specialists:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [
      team?.createdBy,
      filterSpecialists,
      allSpecialists.length,
      loadAllSpecialists,
    ]
  );

  const handleLoadMore = useCallback(() => {
    if (!loadingSpecialists && hasMoreSpecialists && searchQuery.length < 2) {
      const nextPage = specialistsPage + 1;
      setSpecialistsPage(nextPage);
      loadAllSpecialists(nextPage, true);
    }
  }, [
    loadingSpecialists,
    hasMoreSpecialists,
    searchQuery.length,
    specialistsPage,
    loadAllSpecialists,
  ]);

  return {
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
  };
};

