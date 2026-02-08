import { useCallback, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { CACHE_TTL } from "@/categories/queryClient";
import { Category } from "@/categories/api";
import { apiService } from "@/categories/api";
import { useNetworkStatus } from "./useNetworkStatus";

const PAGE_SIZE = 20;

export interface UseCategoriesListReturn {
  items: Category[];
  rootsForFilter: Category[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  onRefresh: () => void;
  error: Error | null;
  refetch: () => void;
  hasNextPage: boolean;
}

/**
 * Single hook for the categories screen: roots when no search (no pagination),
 * paginated search results when search query is set. Resets correctly when search changes.
 */
export function useCategoriesList(
  language: string,
  debouncedSearchQuery: string
): UseCategoriesListReturn {
  const { isOnline } = useNetworkStatus();
  const trimmedQuery = debouncedSearchQuery?.trim() ?? "";
  const isSearchMode = !!trimmedQuery;

  // Roots: for filter options and for list when not searching
  const rootsQuery = useQuery({
    queryKey: ["categories", "root", language],
    queryFn: () => apiService.getRootCategories(language),
    staleTime: CACHE_TTL.STATIC,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: isOnline,
  });

  const rootsForFilter = rootsQuery.data ?? [];

  // Search: infinite query when user has typed a search
  const searchQuery = useInfiniteQuery({
    queryKey: ["categories", "search", trimmedQuery, language],
    queryFn: async ({ pageParam }) => {
      const res = await apiService.searchCategories(
        trimmedQuery,
        pageParam,
        PAGE_SIZE,
        language
      );
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      if (pagination.hasNextPage) {
        return pagination.page + 1;
      }
      return undefined;
    },
    enabled: isSearchMode,
    staleTime: CACHE_TTL.DYNAMIC,
    retry: isOnline,
    refetchOnMount: false,
  });


  // const searchItems = useMemo(() => {
  //   if (!searchQuery.data?.pages) return [];
  //   const seen = new Set<number>();
  //   return searchQuery.data.pages.flatMap((p) => p.categories).filter((c) => {
  //     if (seen.has(c.id)) return false;
  //     seen.add(c.id);
  //     return true;
  //   });
  // }, [searchQuery.data?.pages]);

  const searchItems = useMemo(() => {
    if (!searchQuery.data?.pages) return [];
    return searchQuery.data.pages.flatMap((p) => p.categories);
  }, [searchQuery.data?.pages]);

  const hasNextPage = searchQuery.hasNextPage ?? false;

  const items = isSearchMode ? searchItems : rootsForFilter;

  const isInitialLoading = isSearchMode
    ? searchQuery.isLoading && searchQuery.data == null
    : rootsQuery.isLoading && rootsQuery.data == null;

  const isLoadingMore =
    isSearchMode && (searchQuery.isFetchingNextPage ?? false);

  const loadMore = useCallback(() => {
    if (!isSearchMode) return;
    if (hasNextPage && !searchQuery.isFetchingNextPage) {
      searchQuery.fetchNextPage();
    }
  }, [isSearchMode, hasNextPage, searchQuery]);

  const onRefresh = useCallback(() => {
    if (isSearchMode) {
      searchQuery.refetch();
    } else {
      rootsQuery.refetch();
    }
  }, [isSearchMode, searchQuery, rootsQuery]);

  const refetch = useCallback(() => {
    if (isSearchMode) {
      searchQuery.refetch();
    } else {
      rootsQuery.refetch();
    }
  }, [isSearchMode, searchQuery, rootsQuery]);

  const error = (isSearchMode ? searchQuery.error : rootsQuery.error) as
    | Error
    | null
    | undefined;

  return {
    items,
    rootsForFilter,
    isInitialLoading,
    isLoadingMore,
    loadMore,
    onRefresh,
    error: error ?? null,
    refetch,
    hasNextPage,
  };
}
