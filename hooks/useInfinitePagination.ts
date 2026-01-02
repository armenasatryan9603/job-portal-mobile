import { useState, useEffect, useRef, useCallback } from "react";

interface UseInfinitePaginationOptions<T extends { id: number | string }> {
  // Current page data from query
  items: T[];
  // Pagination metadata
  pagination: {
    page: number;
    hasNextPage: boolean;
  };
  // Loading states
  isLoading: boolean;
  isFetching: boolean;
  // Dependencies that should reset pagination
  resetDeps?: any[];
  // Enable scroll-gate protection (prevent immediate page 2 load)
  enableScrollGate?: boolean;
}

interface UseInfinitePaginationReturn<T> {
  // All accumulated items
  allItems: T[];
  // Pagination controls
  currentPage: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  loadMore: () => void;
  onRefresh: () => void;
  // Loading states
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  // FlatList props
  flatListProps: {
    onScroll?: () => void;
    scrollEventThrottle?: number;
    onEndReached: () => void;
    onEndReachedThreshold: number;
  };
}

export function useInfinitePagination<T extends { id: number | string }>(
  options: UseInfinitePaginationOptions<T>
): UseInfinitePaginationReturn<T> {
  const {
    items,
    pagination,
    isLoading,
    isFetching,
    resetDeps = [],
    enableScrollGate = false,
  } = options;

  // State for accumulated items and current page
  const [allItems, setAllItems] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Single ref to prevent duplicate load requests
  const isLoadingMoreRef = useRef(false);
  const hasScrolledRef = useRef(false);

  // Reset everything when reset dependencies change
  // useEffect(() => {
  //   setAllItems([]);
  //   setCurrentPage(1);
  //   isLoadingMoreRef.current = false;
  //   hasScrolledRef.current = false;
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, resetDeps);

  // Accumulate items when new data arrives for the current page
  useEffect(() => {
    // Only process if we have items and the pagination page matches our current page
    if (items.length === 0 || pagination.page !== currentPage) {
      return;
    }

    if (currentPage === 1) {
      // First page: replace all items
      setAllItems(items);
    } else {
      // Subsequent pages: append new items (avoid duplicates)
      setAllItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const newItems = items.filter((item) => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
    }

    // Re-enable loading after data is processed
    isLoadingMoreRef.current = false;
  }, [items, pagination.page, currentPage]);

  // Load more callback
  const loadMore = useCallback(() => {
    // Check scroll gate if enabled
    if (enableScrollGate && !hasScrolledRef.current) {
      return;
    }

    // Only load if: not already loading, not fetching, has next page
    if (
      !isLoadingMoreRef.current &&
      !isFetching &&
      !isLoading &&
      pagination.hasNextPage
    ) {
      isLoadingMoreRef.current = true;
      setCurrentPage((prev) => prev + 1);
    }
  }, [enableScrollGate, isFetching, isLoading, pagination.hasNextPage]);

  // Refresh callback
  const onRefresh = useCallback(() => {
    setAllItems([]);
    setCurrentPage(1);
    isLoadingMoreRef.current = false;
    hasScrolledRef.current = false;
  }, []);

  // Handle scroll event for scroll gate
  const handleScroll = useCallback(() => {
    if (enableScrollGate && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
    }
  }, [enableScrollGate]);

  // Loading states
  const isInitialLoading = isLoading && currentPage === 1;
  const isLoadingMore = isFetching && currentPage > 1;

  // FlatList props
  const flatListProps = {
    ...(enableScrollGate && {
      onScroll: handleScroll,
      scrollEventThrottle: 400,
    }),
    onEndReached: loadMore,
    onEndReachedThreshold: 0.5,
  };

  return {
    allItems,
    currentPage,
    setCurrentPage,
    loadMore,
    onRefresh,
    isInitialLoading,
    isLoadingMore,
    flatListProps,
  };
}
