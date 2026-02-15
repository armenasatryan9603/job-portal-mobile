import { useCallback, useEffect, useRef, useState } from "react";

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
  // Optional callback to trigger refetch when refresh is called
  onRefreshCallback?: () => void | Promise<void>;
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
    enableScrollGate = false,
    onRefreshCallback,
    resetDeps = [],
  } = options;

  // State for accumulated items and current page
  const [allItems, setAllItems] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Single ref to prevent duplicate load requests
  const isLoadingMoreRef = useRef(false);
  const hasScrolledRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const onEndReachedCalledRef = useRef(false);

  // Reset everything when reset dependencies change (e.g. tab switch, filter change)
  useEffect(() => {
    if (resetDeps.length === 0) return;
    setAllItems([]);
    setCurrentPage(1);
    isLoadingMoreRef.current = false;
    hasScrolledRef.current = false;
    onEndReachedCalledRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  // Accumulate items when new data arrives for the current page
  useEffect(() => {
    // When on page 1 with no items, clear the list (handles tab switch to empty, filter with no results, etc.)
    // Use functional update to avoid setState when already empty (prevents infinite loop - items = [] creates new ref each render)
    if (currentPage === 1 && items.length === 0) {
      setAllItems((prev) => (prev.length === 0 ? prev : []));
      isRefreshingRef.current = false;
      return;
    }

    // Only process if we have items and the pagination page matches our current page
    if (items.length === 0 || pagination.page !== currentPage) {
      return;
    }

    if (currentPage === 1) {
      // First page: replace all items (especially important when refreshing)
      setAllItems(items);
      // Clear refresh flag once we have new data
      isRefreshingRef.current = false;
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
    if (currentPage > 1) {
      onEndReachedCalledRef.current = false; // Allow next page load when user scrolls again
    }
  }, [items, pagination.page, currentPage]);

  // Load more callback - guards against initial mount fires and duplicate calls per scroll
  const loadMore = useCallback(() => {
    if (enableScrollGate && !hasScrolledRef.current) return;

    // Prevent multiple onEndReached fires during one scroll (FlatList known issue)
    if (onEndReachedCalledRef.current) return;

    if (
      !isLoadingMoreRef.current &&
      !isFetching &&
      !isLoading &&
      pagination.hasNextPage
    ) {
      onEndReachedCalledRef.current = true;
      isLoadingMoreRef.current = true;
      setCurrentPage((prev) => prev + 1);
    }
  }, [enableScrollGate, isFetching, isLoading, pagination.hasNextPage]);

  // Refresh callback
  const onRefresh = useCallback(() => {
    // Set refresh flag - items will be replaced when new page 1 data arrives
    isRefreshingRef.current = true;
    // Reset to page 1 - this will trigger parent to refetch if needed
    setCurrentPage(1);
    isLoadingMoreRef.current = false;
    hasScrolledRef.current = false;
    onEndReachedCalledRef.current = false;
    // Call parent's refresh callback if provided (e.g., to trigger refetch)
    onRefreshCallback?.();
    // Note: We don't clear allItems here to avoid showing empty data
    // Items will be replaced when new page 1 data arrives
  }, [onRefreshCallback]);

  // Set scroll gate and reset load guard when user starts a new scroll (fires immediately)
  const handleScrollBeginDrag = useCallback(() => {
    if (enableScrollGate) hasScrolledRef.current = true;
    onEndReachedCalledRef.current = false; // Allow loadMore on this scroll gesture
  }, [enableScrollGate]);

  // Loading states
  const isInitialLoading = isLoading && currentPage === 1;
  const isLoadingMore = isFetching && currentPage > 1;

  // FlatList props - scrollEventThrottle helps onEndReached fire reliably when scrolling
  const flatListProps = {
    ...(enableScrollGate && {
      onScrollBeginDrag: handleScrollBeginDrag,
    }),
    onEndReached: loadMore,
    onEndReachedThreshold: 0.5,
    scrollEventThrottle: 16,
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
