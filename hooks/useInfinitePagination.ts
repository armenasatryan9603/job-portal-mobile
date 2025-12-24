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

  // State for accumulated items (infinite scroll)
  const [allItems, setAllItems] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const prevPageRef = useRef(0);
  const canLoadMoreRef = useRef(true);
  const hasScrolledRef = useRef(false);
  const prevItemsLengthRef = useRef(0);

  // Accumulate items for server-side pagination
  useEffect(() => {
    // Skip if no items
    if (items.length === 0) return;

    // Wait for pagination.page to catch up with currentPage
    // This ensures we're processing the correct page's data
    if (pagination.page !== currentPage) {
      return;
    }

    // Detect when we have new data (items array changed)
    const hasNewData =
      items.length !== prevItemsLengthRef.current ||
      (currentPage !== prevPageRef.current && items.length > 0);

    if (!hasNewData) return;

    prevItemsLengthRef.current = items.length;

    // Check if this is a page change or just a data update
    if (currentPage !== prevPageRef.current) {
      prevPageRef.current = currentPage;

      if (currentPage === 1) {
        // Reset on page 1 (new query)
        setAllItems(items);
        canLoadMoreRef.current = true;
        hasScrolledRef.current = false; // Reset scroll flag
      } else {
        // Append for pages > 1
        setAllItems((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const newItems = items.filter((item) => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [currentPage, items, pagination.page]);

  // Re-enable loading after fetch completes
  useEffect(() => {
    if (!isFetching && !isLoading) {
      canLoadMoreRef.current = true;
    }
  }, [isFetching, isLoading]);

  // Reset accumulated items when dependencies change
  useEffect(() => {
    setAllItems([]);
    prevPageRef.current = 0;
    prevItemsLengthRef.current = 0;
    canLoadMoreRef.current = true;
    hasScrolledRef.current = false;
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  // Load more callback
  const loadMore = useCallback(() => {
    // Check scroll gate if enabled
    if (enableScrollGate && !hasScrolledRef.current) {
      return;
    }

    // Only load if: not loading, has next page, and can load more
    if (
      canLoadMoreRef.current &&
      !isFetching &&
      !isLoading &&
      pagination.hasNextPage
    ) {
      canLoadMoreRef.current = false; // Prevent duplicate calls
      setCurrentPage((prev) => prev + 1);
    }
  }, [
    enableScrollGate,
    isFetching,
    isLoading,
    pagination.hasNextPage,
    currentPage,
  ]);

  // Refresh callback
  const onRefresh = useCallback(() => {
    setAllItems([]);
    prevPageRef.current = 0;
    prevItemsLengthRef.current = 0;
    canLoadMoreRef.current = true;
    hasScrolledRef.current = false;
    setCurrentPage(1);
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
