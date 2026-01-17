import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { Filter, FilterSection } from "@/components/FilterComponent";
import { EmptyPage } from "@/components/EmptyPage";
import { ApplyModal } from "@/components/ApplyModal";
import { CheckInModal } from "@/components/CheckInModal";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { FloatingSkeleton } from "@/components/FloatingSkeleton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TopTabs } from "@/components/TopTabs";
import { Spacing, ThemeColors } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { apiService, Order, OrderListResponse } from "@/categories/api";
import { chatService } from "@/categories/chatService";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useInfinitePagination } from "@/hooks/useInfinitePagination";
import { useQueryClient } from "@tanstack/react-query";
import {
  useMyOrders,
  useMyJobs,
  useAllOrders,
  usePublicOrders,
  useSearchOrders,
  useSavedOrders,
  useApplyToOrder,
  useDeleteOrder,
  useCategories,
} from "@/hooks/useApi";
import { getViewedOrders } from "@/utils/viewedOrdersStorage";
import AnalyticsService from "@/categories/AnalyticsService";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OrderItem from "./Item";
import { LocationFilterModal } from "@/components/LocationFilterModal";

export default function OrdersScreen() {
  const screenName =
    useLocalSearchParams().myOrders === "true"
      ? "MyOrders"
      : useLocalSearchParams().myJobs === "true"
      ? "MyJobs"
      : useLocalSearchParams().saved === "true"
      ? "SavedOrders"
      : "Orders";
  useAnalytics(screenName);
  const { myOrders, myJobs, saved, categoryId, q } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const { user, isAuthenticated } = useAuth();
  const { showLoginModal } = useModal();
  const insets = useSafeAreaInsets();
  const isMyOrders = myOrders === "true";
  const isMyJobs = myJobs === "true";
  const isSavedOrders = saved === "true";

  // Add tab state for order type
  const [activeOrderTab, setActiveOrderTab] = useState<
    "one_time" | "permanent"
  >("one_time");
  const filterCategoryId = categoryId
    ? isNaN(parseInt(categoryId as string))
      ? null
      : parseInt(categoryId as string)
    : null;
  // Initialize searchQuery from URL parameter if present
  const [searchQuery, setSearchQuery] = useState(
    q ? decodeURIComponent(q as string) : ""
  );
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const [selectedFilters, setSelectedFilters] = useState<
    Record<
      string,
      | string
      | string[]
      | { min: number; max: number }
      | { latitude: number; longitude: number; address: string; radius: number }
      | null
    >
  >({
    status: isMyJobs || isSavedOrders || isMyOrders ? "all" : "open",
    categories: filterCategoryId ? [filterCategoryId.toString()] : [],
    priceRange: { min: 0, max: 100000 },
    sortBy: "relevance", // Default sort: relevance, date_desc, date_asc, price_desc, price_asc
    location: null as {
      latitude: number;
      longitude: number;
      address: string;
      radius: number;
    } | null, // Location with coordinates and radius
    rating: [], // Selected ratings array (empty = no rating filter)
  });
  const queryClient = useQueryClient();
  const filterStorageKey = useMemo(
    () => `ordersFilters:${screenName}`,
    [screenName]
  );
  const searchStorageKey = useMemo(
    () => `ordersSearch:${screenName}`,
    [screenName]
  );
  // Temporary currentPage for query initialization (will be overridden by hook)
  const [tempCurrentPage, setTempCurrentPage] = useState(1);
  const limit = 10;
  const status = selectedFilters?.status as string;

  // Convert selected categories to number array
  // Prioritize filterCategoryId from URL if present, otherwise use selectedFilters
  const selectedCategoryIds = useMemo(() => {
    // If we have a categoryId from URL, use it directly (most reliable)
    if (filterCategoryId !== null) {
      return [filterCategoryId];
    }
    // Otherwise, use selectedFilters (for manual filter selection)
    const categories = Array.isArray(selectedFilters.categories)
      ? selectedFilters.categories
      : [];
    return categories.map((id) => parseInt(id)).filter((id) => !isNaN(id));
  }, [filterCategoryId, selectedFilters.categories]);

  // TanStack Query hooks
  const myOrdersQuery = useMyOrders();
  const myJobsQuery = useMyJobs();
  // For saved orders, fetch all at once (like My Orders/My Jobs) since users typically don't have many saved orders
  const savedOrdersQuery = useSavedOrders(1, 100);
  const allOrdersQuery = useAllOrders(
    tempCurrentPage,
    limit,
    status && status !== "all" ? status : undefined,
    undefined, // categoryId (single, for backward compatibility)
    selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined
  );
  const publicOrdersQuery = usePublicOrders(
    tempCurrentPage,
    limit,
    status && status !== "all" ? status : undefined,
    undefined, // categoryId (single, for backward compatibility)
    selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined
  );
  const searchOrdersQuery = useSearchOrders(
    searchQuery.trim(),
    tempCurrentPage,
    limit,
    selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined
  );
  const { data: categoriesData } = useCategories(1, 100, undefined, language); // Get all categories for filtering

  // Mutations
  const applyToOrderMutation = useApplyToOrder();
  const deleteOrderMutation = useDeleteOrder();

  // Determine which query to use based on current view
  const activeQuery = useMemo(() => {
    if (isMyOrders) return myOrdersQuery;
    if (isMyJobs) return myJobsQuery;
    if (isSavedOrders) return savedOrdersQuery;
    if (searchQuery.trim()) return searchOrdersQuery;
    if (user?.id) return allOrdersQuery;
    return publicOrdersQuery;
  }, [
    isMyOrders,
    isMyJobs,
    isSavedOrders,
    searchQuery,
    user?.id,
    myOrdersQuery,
    myJobsQuery,
    savedOrdersQuery,
    searchOrdersQuery,
    allOrdersQuery,
    publicOrdersQuery,
  ]);

  // Load saved filters/search from local storage
  useEffect(() => {
    const loadSavedFilters = async () => {
      try {
        const savedFiltersString = await AsyncStorage.getItem(filterStorageKey);
        const savedSearch = await AsyncStorage.getItem(searchStorageKey);

        if (savedFiltersString) {
          const parsed = JSON.parse(savedFiltersString);
          setSelectedFilters((prev) => {
            const updated = {
              ...prev,
              ...parsed,
            };
            // If categoryId is in URL, it takes precedence over saved filters
            if (filterCategoryId !== null) {
              updated.categories = [filterCategoryId.toString()];
            }
            return updated;
          });
        } else if (filterCategoryId !== null) {
          // If no saved filters but categoryId in URL, set it
          setSelectedFilters((prev) => ({
            ...prev,
            categories: [filterCategoryId.toString()],
          }));
        }
        // Only load saved search if no URL parameter is present
        if (!q && savedSearch !== null) {
          setSearchQuery(savedSearch);
        }
      } catch (error) {
        console.error("Error loading saved filters:", error);
      }
    };
    loadSavedFilters();
  }, [filterStorageKey, searchStorageKey, q, filterCategoryId]);

  // Update search query when URL parameter changes
  useEffect(() => {
    if (q) {
      const decodedQuery = decodeURIComponent(q as string);
      setSearchQuery(decodedQuery);
    }
  }, [q]);

  // Persist filters to local storage
  useEffect(() => {
    const saveFilters = async () => {
      try {
        await AsyncStorage.setItem(
          filterStorageKey,
          JSON.stringify(selectedFilters)
        );
      } catch (error) {
        console.error("Error saving filters:", error);
      }
    };
    saveFilters();
  }, [selectedFilters, filterStorageKey]);

  // Persist search query to local storage
  useEffect(() => {
    const saveSearch = async () => {
      try {
        await AsyncStorage.setItem(searchStorageKey, searchQuery);
      } catch (error) {
        console.error("Error saving search query:", error);
      }
    };
    saveSearch();
  }, [searchQuery, searchStorageKey]);

  // Update status filter when switching to saved orders view
  useEffect(() => {
    if (isSavedOrders) {
      setSelectedFilters((prev) => ({
        ...prev,
        status: "all", // Always show all statuses for saved orders
      }));
    }
  }, [isSavedOrders]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (isMyOrders || isMyJobs || isSavedOrders) {
      setClientSidePage(1);
    } else {
      setCurrentPage(1);
    }
  }, [selectedFilters, searchQuery, isMyOrders, isMyJobs, isSavedOrders]);

  // Extract data from active query
  const queryData = activeQuery.data as OrderListResponse | undefined;
  const currentPageOrders = queryData?.orders || [];
  const pagination = queryData?.pagination || {
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  // Use infinite pagination hook for server-side pagination
  const {
    allItems: allOrders,
    currentPage,
    setCurrentPage,
    loadMore: loadMoreOrders,
    onRefresh: handlePaginationRefresh,
    isInitialLoading: isPaginationInitialLoading,
    isLoadingMore: isPaginationLoadingMore,
    flatListProps: paginationFlatListProps,
  } = useInfinitePagination({
    items: currentPageOrders,
    pagination,
    isLoading: activeQuery.isLoading,
    isFetching: activeQuery.isFetching,
    resetDeps: [selectedFilters, searchQuery, activeOrderTab],
    enableScrollGate: true,
  });
  // asdf

  // Sync tempCurrentPage with currentPage from hook
  useEffect(() => {
    if (!isMyOrders && !isMyJobs && !isSavedOrders) {
      setTempCurrentPage(currentPage);
    }
  }, [currentPage, isMyOrders, isMyJobs, isSavedOrders]);

  // Use appropriate orders based on pagination type
  const orders =
    isMyOrders || isMyJobs || isSavedOrders ? currentPageOrders : allOrders;

  // Extract services for filtering
  const categories = categoriesData?.categories || [];

  // Filter configuration
  const filterSections = useMemo<FilterSection[]>(() => {
    const sections: FilterSection[] = [
      {
        key: "sortBy",
        title: t("sortBy"),
        options: [
          { key: "relevance", label: t("relevance") },
          { key: "date_desc", label: t("newestFirst") },
          { key: "date_asc", label: t("oldestFirst") },
          { key: "price_desc", label: t("highestPrice") },
          { key: "price_asc", label: t("lowestPrice") },
        ],
      },
    ];

    // Only show status filter for one-time orders
    if (activeOrderTab === "one_time") {
      sections.push({
        key: "status",
        title: t("filterByStatus"),
        options: [
          { key: "all", label: t("all") },
          { key: "open", label: t("open") },
          { key: "in_progress", label: t("inProgress") },
          { key: "completed", label: t("completed") },
          { key: "cancelled", label: t("cancelled") },
          ...(isMyOrders
            ? [
                { key: "pending_review", label: t("pendingReview") },
                { key: "rejected", label: t("rejected") },
              ]
            : []),
          ...(isAuthenticated && !isMyOrders && !isMyJobs && !isSavedOrders
            ? [{ key: "not_applied", label: t("notApplied") }]
            : []),
        ],
      });
    }

    sections.push(
      {
        key: "priceRange",
        title: t("priceRange"),
        type: "range",
        rangeConfig: {
          min: 0,
          max: 100000,
          step: 100,
        },
      },
      {
        key: "location",
        title: t("location"),
        type: "location",
        onLocationPress: () => {
          // Hide filter modal temporarily when opening location modal
          setFilterModalHiddenForLocation(true);
          setLocationFilterVisible(true);
        },
      },
      // {
      //   key: "rating",
      //   title: t("minimumRating") || "Minimum Rating",
      //   type: "stars",
      // },
      {
        key: "categories",
        title: t("categories"),
        multiSelect: true,
        options: categories.map((category) => ({
          key: category.id.toString(),
          label: category.name,
        })),
      }
    );

    return sections;
  }, [
    t,
    isMyOrders,
    categories,
    activeOrderTab,
    isAuthenticated,
    isMyJobs,
    isSavedOrders,
  ]);

  // Loading states - use hook's provided values for better pagination handling
  const loading = activeQuery.isLoading && !activeQuery.isFetching;
  const filterLoading = activeQuery.isFetching && currentPage === 1;
  const error = activeQuery.error ? (activeQuery.error as Error).message : null;

  // Use pagination hook's loading states
  const isInitialLoad = isPaginationInitialLoading;
  const loadingMore = isPaginationLoadingMore;

  // For My Orders/My Jobs/Saved Orders: client-side pagination
  const [allUserOrders, setAllUserOrders] = useState<Order[]>([]);
  const [clientSidePage, setClientSidePage] = useState(1);

  // Track applied orders (fetched from backend)
  const [appliedOrders, setAppliedOrders] = useState<Set<number>>(new Set());

  // Track viewed orders (stored locally)
  const [viewedOrders, setViewedOrders] = useState<Set<number>>(new Set());

  // Track saved orders (fetched from backend)
  const [savedOrders, setSavedOrders] = useState<Set<number>>(new Set());

  // Refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Apply modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);

  // Feedback dialog state
  const [feedbackDialogVisible, setFeedbackDialogVisible] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [canceledOrderId, setCanceledOrderId] = useState<number | null>(null);

  // Location filter modal state
  const [locationFilterVisible, setLocationFilterVisible] = useState(false);
  const [filterModalHiddenForLocation, setFilterModalHiddenForLocation] =
    useState(false);

  // Helper function to check if user has applied to an order
  const hasAppliedToOrder = (orderId: number): boolean => {
    return appliedOrders.has(orderId);
  };

  // Helper function to check if an order has been viewed
  const isOrderViewed = (orderId: number): boolean => {
    return viewedOrders.has(orderId);
  };

  // Helper function to check if an order is saved
  const isOrderSaved = (orderId: number): boolean => {
    return savedOrders.has(orderId);
  };

  // Callback to mark an order as viewed in state immediately
  const handleOrderViewed = useCallback((orderId: number) => {
    setViewedOrders((prev) => new Set(prev).add(orderId));
    // Track order view
    AnalyticsService.getInstance().logOrderViewed(orderId.toString());
  }, []);

  // Fetch user's applied orders from backend
  const loadAppliedOrders = async () => {
    if (!user?.id) {
      console.log("No user ID available, skipping applied orders load");
      return;
    }

    try {
      const proposals = await apiService.getProposalsByUser(user.id);
      const appliedOrderIds = new Set<number>(
        proposals.proposals.map((proposal: any) => proposal.orderId)
      );
      setAppliedOrders(appliedOrderIds);
      console.log(
        "Loaded applied orders from backend:",
        Array.from(appliedOrderIds)
      );
    } catch (error) {
      console.error("Error loading applied orders:", error);
    }
  };

  // Fetch user's saved orders from backend
  const loadSavedOrders = async () => {
    if (!user?.id) {
      return;
    }

    try {
      // Get all saved orders (we'll fetch the IDs from the first page)
      const savedOrdersData = await apiService.getSavedOrders(1, 100);
      const savedOrderIds = new Set<number>(
        savedOrdersData.orders.map((order: Order) => order.id)
      );
      setSavedOrders(savedOrderIds);
    } catch (error) {
      console.error("Error loading saved orders:", error);
    }
  };

  // Load saved status for displayed orders
  const loadSavedStatusForOrders = async (orderIds: number[]) => {
    if (!user?.id || orderIds.length === 0) {
      return;
    }

    try {
      // Check saved status for each order
      const savedStatusPromises = orderIds.map((orderId) =>
        apiService.isOrderSaved(orderId).catch(() => ({ isSaved: false }))
      );
      const savedStatuses = await Promise.all(savedStatusPromises);

      const newSavedOrders = new Set(savedOrders);
      savedStatuses.forEach((status, index) => {
        if (status.isSaved) {
          newSavedOrders.add(orderIds[index]);
        } else {
          newSavedOrders.delete(orderIds[index]);
        }
      });
      setSavedOrders(newSavedOrders);
    } catch (error) {
      console.error("Error loading saved status:", error);
    }
  };

  // Handle save toggle
  const handleSaveToggle = useCallback(
    (orderId: number, isSaved: boolean) => {
      // Track save/unsave action
      if (isSaved) {
        AnalyticsService.getInstance().logOrderSaved(orderId.toString());
      } else {
        AnalyticsService.getInstance().logOrderUnsaved(orderId.toString());
      }
      // Update saved orders set
      setSavedOrders((prev) => {
        const newSet = new Set(prev);
        if (isSaved) {
          newSet.add(orderId);
        } else {
          newSet.delete(orderId);
        }
        return newSet;
      });

      // If unsaving and we're viewing saved orders, remove from the list immediately
      if (!isSaved && isSavedOrders) {
        setAllUserOrders((prev) =>
          prev.filter((order) => order.id !== orderId)
        );
        // Invalidate saved orders query to refetch from server
        queryClient.invalidateQueries({ queryKey: ["orders", "saved"] });
      } else if (isSaved) {
        // If saving, invalidate to refresh the saved orders list
        queryClient.invalidateQueries({ queryKey: ["orders", "saved"] });
      }
    },
    [isSavedOrders, queryClient]
  );

  // Load viewed orders from local storage
  const loadViewedOrders = async () => {
    try {
      const viewed = await getViewedOrders();
      setViewedOrders(viewed);
      console.log("Loaded viewed orders from storage:", Array.from(viewed));
    } catch (error) {
      console.error("Error loading viewed orders:", error);
    }
  };

  // Helper function to filter orders by search
  const filterOrdersBySearch = useCallback(
    (orders: Order[], searchQuery: string): Order[] => {
      if (!searchQuery.trim()) return orders;

      const queryLower = searchQuery.toLowerCase();

      return orders.filter(
        (order: Order) =>
          order.title.toLowerCase().includes(queryLower) ||
          order.description.toLowerCase().includes(queryLower) ||
          order.skills?.some((skill: string) =>
            skill.toLowerCase().includes(queryLower)
          ) ||
          // Also check OrderSkills if available
          ((order as any).OrderSkills &&
            (order as any).OrderSkills.some((os: any) => {
              const skill = os.Skill;
              if (!skill) return false;
              const skillName =
                skill.nameEn?.toLowerCase() ||
                skill.nameRu?.toLowerCase() ||
                skill.nameHy?.toLowerCase() ||
                "";
              return skillName.includes(queryLower);
            }))
      );
    },
    []
  );

  // Helper function to filter orders by status
  const filterOrdersByStatus = useCallback(
    (orders: Order[], status: string): Order[] => {
      if (!status || status === "all") return orders;
      return orders.filter((order: Order) => order.status === status);
    },
    []
  );

  // Helper function to filter orders by categoryIds (array)
  const filterOrdersByCategories = useCallback(
    (orders: Order[], categoryIds: string[]): Order[] => {
      if (!categoryIds || categoryIds.length === 0) return orders;
      const categoryIdNumbers = categoryIds.map((id) => parseInt(id));
      return orders.filter(
        (order: Order) =>
          (order.categoryId && categoryIdNumbers.includes(order.categoryId)) ||
          (order.Category?.id && categoryIdNumbers.includes(order.Category.id))
      );
    },
    []
  );

  // Helper function to filter orders by price range
  const filterOrdersByPriceRange = useCallback(
    (orders: Order[], priceRange: { min: number; max: number }): Order[] => {
      if (!priceRange) return orders;
      return orders.filter((order: Order) => {
        // If order has no budget, include it (don't filter out orders without budgets)
        if (order.budget == null || order.budget === undefined) {
          return true;
        }
        return order.budget >= priceRange.min && order.budget <= priceRange.max;
      });
    },
    []
  );

  // Helper function to calculate distance between two coordinates (Haversine formula)
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Radius of the Earth in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

  // Helper function to parse location string to coordinates (synchronous)
  const parseLocationCoordinates = useCallback(
    (
      locationString: string
    ): { latitude: number; longitude: number } | null => {
      if (!locationString) return null;

      // Try to parse coordinates from string like "address (lat, lng)"
      // This matches the format used in create.tsx: `${address} (${latitude}, ${longitude})`
      const coordMatch = locationString.match(
        /\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/
      );
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        // Validate coordinates
        if (
          !isNaN(lat) &&
          !isNaN(lng) &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180
        ) {
          return {
            latitude: lat,
            longitude: lng,
          };
        }
      }

      // If no coordinates found, return null (can't calculate distance without coordinates)
      return null;
    },
    []
  );

  // Helper function to filter orders by location and radius (synchronous)
  const filterOrdersByLocation = useCallback(
    (
      orders: Order[],
      locationFilter: {
        latitude: number;
        longitude: number;
        address: string;
        radius: number;
      } | null
    ): Order[] => {
      if (!locationFilter || locationFilter.radius === 0) return orders;

      return orders.filter((order) => {
        if (!order.location) return false;

        // Parse coordinates from order location string
        const orderCoords = parseLocationCoordinates(order.location);

        if (!orderCoords) return false; // Skip orders without valid coordinates

        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          locationFilter.latitude,
          locationFilter.longitude,
          orderCoords.latitude,
          orderCoords.longitude
        );

        // Include order if distance is within radius
        return distance <= locationFilter.radius;
      });
    },
    [calculateDistance, parseLocationCoordinates]
  );

  // Helper function to filter orders by rating (client verified status as proxy)
  const filterOrdersByRating = useCallback(
    (orders: Order[], selectedRatings: number[]): Order[] => {
      if (!selectedRatings || selectedRatings.length === 0) return orders;
      // For now, use client verified status as a proxy for rating
      // In the future, we could calculate actual average ratings from reviews
      // If ratings are selected, only show orders from verified clients
      // This is a simple proxy - in a real implementation, you'd calculate average ratings
      return orders.filter((order: Order) => {
        return order.Client?.verified === true;
      });
    },
    []
  );

  // Helper function to sort orders
  const sortOrders = useCallback((orders: Order[], sortBy: string): Order[] => {
    if (!sortBy || sortBy === "relevance") {
      // For relevance, maintain original order (or could implement relevance scoring)
      return orders;
    }

    const sorted = [...orders];

    switch (sortBy) {
      case "date_desc":
        // Newest first
        return sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });

      case "date_asc":
        // Oldest first
        return sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateA - dateB;
        });

      case "price_desc":
        // Highest price first
        return sorted.sort((a, b) => {
          const priceA = a.budget || 0;
          const priceB = b.budget || 0;
          return priceB - priceA;
        });

      case "price_asc":
        // Lowest price first
        return sorted.sort((a, b) => {
          const priceA = a.budget || 0;
          const priceB = b.budget || 0;
          return priceA - priceB;
        });

      default:
        return orders;
    }
  }, []);

  // Helper function to get paginated orders from a filtered list
  const getPaginatedOrders = useCallback(
    (filteredOrders: Order[], page: number, limit: number) => {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      return filteredOrders.slice(startIndex, endIndex);
    },
    []
  );

  // Helper function to create pagination object for local filtering
  const createPaginationObject = useCallback(
    (total: number, currentPage: number = 1, limit: number = 5) => {
      const totalPages = Math.ceil(total / limit);
      return {
        page: currentPage,
        limit,
        total,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      };
    },
    []
  );

  // Sync allUserOrders with query data for My Orders/My Jobs/Saved Orders
  useEffect(() => {
    if (isMyOrders && myOrdersQuery.data) {
      const data = myOrdersQuery.data as OrderListResponse;
      setAllUserOrders(data.orders || []);
    } else if (isMyJobs && myJobsQuery.data) {
      const data = myJobsQuery.data as OrderListResponse;
      setAllUserOrders(data.orders || []);
    } else if (isSavedOrders && savedOrdersQuery.data) {
      const data = savedOrdersQuery.data as OrderListResponse;
      // Filter out any null/undefined orders (in case an order was deleted)
      const validOrders = (data.orders || []).filter((order) => order != null);
      setAllUserOrders(validOrders);
    }
  }, [
    isMyOrders,
    isMyJobs,
    isSavedOrders,
    myOrdersQuery.data,
    myJobsQuery.data,
    savedOrdersQuery.data,
  ]);

  // Extract price range from filters
  const priceRange = useMemo(() => {
    const range = selectedFilters.priceRange;
    if (
      range &&
      typeof range === "object" &&
      "min" in range &&
      "max" in range
    ) {
      return range as { min: number; max: number };
    }
    return { min: 0, max: 100000 };
  }, [selectedFilters.priceRange]);

  // Compute orders for My Orders/My Jobs with client-side pagination
  const displayedOrders = useMemo(() => {
    const selectedCategories = Array.isArray(selectedFilters.categories)
      ? selectedFilters.categories
      : [];
    const sortBy = (selectedFilters.sortBy as string) || "relevance";

    if (isMyOrders || isMyJobs || isSavedOrders) {
      // Client-side pagination for My Orders/My Jobs/Saved Orders
      // Note: These queries don't support server-side service filtering yet
      let filteredOrders = allUserOrders;

      // Apply search filter
      if (searchQuery.trim()) {
        filteredOrders = filterOrdersBySearch(filteredOrders, searchQuery);
      }

      // Apply status filter (for My Orders/My Jobs, status filtering is done client-side)
      // Note: "not_applied" status is not available for My Orders/My Jobs views
      if (status && status !== "all" && status !== "not_applied") {
        filteredOrders = filterOrdersByStatus(filteredOrders, status);
      }

      // Apply category filter (client-side for My Orders/My Jobs)
      if (selectedCategories.length > 0) {
        filteredOrders = filterOrdersByCategories(
          filteredOrders,
          selectedCategories
        );
      }

      // Apply price range filter (client-side for My Orders/My Jobs)
      // Skip price filter for saved orders - show all saved orders regardless of price
      if (!isSavedOrders) {
        filteredOrders = filterOrdersByPriceRange(filteredOrders, priceRange);
      }

      // Apply location filter using distance calculation
      const locationFilterValue = selectedFilters.location;
      const locationFilter =
        locationFilterValue &&
        typeof locationFilterValue === "object" &&
        "latitude" in locationFilterValue &&
        "longitude" in locationFilterValue &&
        "address" in locationFilterValue &&
        "radius" in locationFilterValue
          ? (locationFilterValue as {
              latitude: number;
              longitude: number;
              address: string;
              radius: number;
            })
          : null;
      if (locationFilter) {
        filteredOrders = filterOrdersByLocation(filteredOrders, locationFilter);
      }

      // Apply rating filter
      const ratingFilterValue = selectedFilters.rating;
      const ratingFilter: number[] = Array.isArray(ratingFilterValue)
        ? ratingFilterValue
            .map((r) =>
              typeof r === "number"
                ? r
                : typeof r === "string"
                ? parseInt(r, 10)
                : null
            )
            .filter((r): r is number => r !== null && !isNaN(r))
        : ratingFilterValue && typeof ratingFilterValue === "number"
        ? [ratingFilterValue]
        : ratingFilterValue && typeof ratingFilterValue === "string"
        ? [parseInt(ratingFilterValue, 10)].filter((r) => !isNaN(r))
        : [];
      if (ratingFilter.length > 0) {
        filteredOrders = filterOrdersByRating(filteredOrders, ratingFilter);
      }

      // Apply sorting
      filteredOrders = sortOrders(filteredOrders, sortBy);

      // Filter by order type (tab)
      // Treat orders without orderType as "one_time" for backward compatibility
      filteredOrders = filteredOrders.filter((order) => {
        const orderType = (order as any).orderType || "one_time";
        return orderType === activeOrderTab;
      });

      // Get paginated results
      return getPaginatedOrders(filteredOrders, clientSidePage, limit);
    }

    // For regular orders, apply price filter and sorting client-side
    // (Server-side price filtering can be added later)
    let filteredOrders = orders;
    if (priceRange.min !== 0 || priceRange.max !== 100000) {
      filteredOrders = filterOrdersByPriceRange(orders, priceRange);
    }

    // Apply location filter using distance calculation
    const locationFilterValue = selectedFilters.location;
    const locationFilter =
      locationFilterValue &&
      typeof locationFilterValue === "object" &&
      "latitude" in locationFilterValue &&
      "longitude" in locationFilterValue &&
      "address" in locationFilterValue &&
      "radius" in locationFilterValue
        ? (locationFilterValue as {
            latitude: number;
            longitude: number;
            address: string;
            radius: number;
          })
        : null;
    if (locationFilter) {
      filteredOrders = filterOrdersByLocation(filteredOrders, locationFilter);
    }

    // Apply rating filter
    const ratingFilterValue = selectedFilters.rating;
    const ratingFilter: number[] = Array.isArray(ratingFilterValue)
      ? ratingFilterValue
          .map((r) =>
            typeof r === "number"
              ? r
              : typeof r === "string"
              ? parseInt(r, 10)
              : null
          )
          .filter((r): r is number => r !== null && !isNaN(r))
      : ratingFilterValue && typeof ratingFilterValue === "number"
      ? [ratingFilterValue]
      : ratingFilterValue && typeof ratingFilterValue === "string"
      ? [parseInt(ratingFilterValue, 10)].filter((r) => !isNaN(r))
      : [];
    if (ratingFilter.length > 0) {
      filteredOrders = filterOrdersByRating(filteredOrders, ratingFilter);
    }

    // Status filtering is now handled server-side for regular orders
    // No need for client-side filtering here since backend already filters by status

    // Apply sorting
    filteredOrders = sortOrders(filteredOrders, sortBy);

    // Filter by order type (tab)
    // Treat orders without orderType as "one_time" for backward compatibility
    filteredOrders = filteredOrders.filter((order) => {
      const orderType = (order as any).orderType || "one_time";

      // For non-owners, hide draft permanent orders (only show published ones)
      if (
        !isMyOrders &&
        orderType === "permanent" &&
        (order as any).status === "draft"
      ) {
        return false;
      }

      return orderType === activeOrderTab;
    });

    return filteredOrders;
  }, [
    isMyOrders,
    isMyJobs,
    isSavedOrders,
    allUserOrders,
    searchQuery,
    status,
    selectedFilters.categories,
    selectedFilters.services,
    selectedFilters.sortBy,
    priceRange,
    clientSidePage,
    selectedFilters.location,
    selectedFilters.rating,
    orders,
    activeOrderTab,
    filterOrdersBySearch,
    filterOrdersByStatus,
    filterOrdersByCategories,
    filterOrdersByPriceRange,
    filterOrdersByLocation,
    filterOrdersByRating,
    sortOrders,
    getPaginatedOrders,
  ]);

  // Compute pagination for My Orders/My Jobs/Saved Orders
  const displayedPagination = useMemo(() => {
    const selectedCategories = Array.isArray(selectedFilters.categories)
      ? selectedFilters.categories
      : [];

    if (isMyOrders || isMyJobs || isSavedOrders) {
      const filteredOrders = (() => {
        let filtered = allUserOrders;
        if (searchQuery.trim()) {
          filtered = filterOrdersBySearch(filtered, searchQuery);
        }
        // Status filtering for My Orders/My Jobs (client-side)
        // Note: "not_applied" status is not available for My Orders/My Jobs views
        if (status && status !== "all" && status !== "not_applied") {
          filtered = filterOrdersByStatus(filtered, status);
        }
        if (selectedCategories.length > 0) {
          filtered = filterOrdersByCategories(filtered, selectedCategories);
        }
        filtered = filterOrdersByPriceRange(filtered, priceRange);
        const locationFilter = selectedFilters.location as {
          latitude: number;
          longitude: number;
          address: string;
          radius: number;
        } | null;
        if (locationFilter) {
          // Simple text matching for now
          filtered = filtered.filter((order) => {
            if (!order.location) return false;
            return order.location
              .toLowerCase()
              .includes(locationFilter.address.toLowerCase());
          });
        }
        const ratingFilterValue = selectedFilters.rating;
        const ratingFilter: number[] = Array.isArray(ratingFilterValue)
          ? ratingFilterValue
              .map((r) =>
                typeof r === "number"
                  ? r
                  : typeof r === "string"
                  ? parseInt(r, 10)
                  : null
              )
              .filter((r): r is number => r !== null && !isNaN(r))
          : ratingFilterValue && typeof ratingFilterValue === "number"
          ? [ratingFilterValue]
          : ratingFilterValue && typeof ratingFilterValue === "string"
          ? [parseInt(ratingFilterValue, 10)].filter((r) => !isNaN(r))
          : [];
        if (ratingFilter.length > 0) {
          filtered = filterOrdersByRating(filtered, ratingFilter);
        }
        // Filter by order type (tab)
        filtered = filtered.filter((order) => {
          const orderType = (order as any).orderType || "one_time";
          return orderType === activeOrderTab;
        });
        return filtered;
      })();

      return createPaginationObject(
        filteredOrders.length,
        clientSidePage,
        limit
      );
    }

    // For regular orders, service filtering is handled server-side
    // Pagination is already correct from the server response
    return pagination;
  }, [
    isMyOrders,
    isMyJobs,
    allUserOrders,
    searchQuery,
    status,
    selectedFilters.services,
    priceRange,
    clientSidePage,
    pagination,
    activeOrderTab,
    filterOrdersBySearch,
    filterOrdersByStatus,
    filterOrdersByCategories,
    filterOrdersByPriceRange,
    filterOrdersByRating,
    createPaginationObject,
    selectedFilters,
  ]);

  // Load more orders (pagination)
  const loadMoreOrdersWrapper = useCallback(() => {
    if (isMyOrders || isMyJobs || isSavedOrders) {
      // Client-side pagination
      if (displayedPagination.hasNextPage) {
        setClientSidePage((prev) => prev + 1);
      }
    } else {
      // Server-side pagination - use hook's loadMore
      loadMoreOrders();
    }
  }, [
    isMyOrders,
    isMyJobs,
    isSavedOrders,
    displayedPagination.hasNextPage,
    loadMoreOrders,
  ]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Reset pagination state from hook
    handlePaginationRefresh();

    // Invalidate and refetch all order queries
    await queryClient.refetchQueries({ queryKey: ["orders"] });

    // Also reload applied orders, viewed orders, and saved orders
    await loadAppliedOrders();
    await loadViewedOrders();
    await loadSavedOrders();

    // Reset pagination for client-side
    if (isMyOrders || isMyJobs || isSavedOrders) {
      setClientSidePage(1);
    }

    setRefreshing(false);
  }, [
    queryClient,
    isMyOrders,
    isMyJobs,
    isSavedOrders,
    handlePaginationRefresh,
  ]);

  // Load applied orders and viewed orders on component mount
  useEffect(() => {
    // If user is trying to access "My Orders" or "My Jobs" but not authenticated, redirect to login
    if ((isMyOrders || isMyJobs) && !user?.id) {
      showLoginModal();
      return;
    }

    loadAppliedOrders();
    loadViewedOrders();
    loadSavedOrders();
  }, [isMyOrders, isMyJobs, user?.id]);

  // Load saved status when orders change
  useEffect(() => {
    if (user?.id && displayedOrders.length > 0) {
      const orderIds = displayedOrders.map((order) => order.id);
      loadSavedStatusForOrders(orderIds);
    }
  }, [displayedOrders, user?.id]);

  // Reload viewed orders when component comes into focus (to catch newly viewed orders)
  useFocusEffect(
    useCallback(() => {
      loadViewedOrders();
    }, [])
  );

  // Filter orders locally for additional filtering (if needed)
  // const filteredOrders = orders.filter(() => {
  //   // Additional local filtering can be added here if needed
  //   return true;
  // });

  const handleCreateOrder = () => {
    AnalyticsService.getInstance().logEvent("button_clicked", {
      button_name: "create_order",
      location: "orders_screen",
    });
    router.push("/orders/create");
  };

  const handleDeleteOrder = (order: Order) => {
    if (order.status === "pending") {
      Alert.alert(t("cannotDeleteOrder"), t("cannotDeletePendingOrder"), [
        { text: t("ok") },
      ]);
      return;
    }

    Alert.alert(t("deleteOrder"), t("areYouSureDeleteOrder"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            // Track order deletion
            AnalyticsService.getInstance().logEvent("order_deleted", {
              order_id: order.id.toString(),
              order_status: order.status,
            });
            // Use TanStack Query mutation
            await deleteOrderMutation.mutateAsync(order.id);
            // The mutation will automatically invalidate queries and refetch
          } catch (err) {
            console.error("Error deleting order:", err);
            Alert.alert(t("error"), t("failedToDeleteOrder"));
          }
        },
      },
    ]);
  };

  const handleFeedbackSubmit = async (
    rating: number,
    feedback: string,
    reasonIds?: number[]
  ) => {
    if (!canceledOrderId) return;

    setFeedbackLoading(true);
    try {
      // Submit feedback for the canceled proposal
      // When specialist cancels, backend will automatically set specialistId
      await chatService.submitFeedback({
        orderId: canceledOrderId,
        specialistId: undefined,
        rating,
        comment: feedback,
        feedbackType: "canceled",
        reasonIds,
      });

      Alert.alert(t("success"), t("feedbackSubmitted"));
      setFeedbackDialogVisible(false);
      setCanceledOrderId(null);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      Alert.alert(t("error"), t("failedToSubmitFeedback"));
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleFeedbackClose = () => {
    setFeedbackDialogVisible(false);
    setCanceledOrderId(null);
  };

  const handleCancelProposal = (order: Order) => {
    Alert.alert(t("cancelProposal"), t("areYouSureCancelProposal"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("yes"),
        style: "destructive",
        onPress: async () => {
          try {
            // Get the proposal ID from the order's proposals
            const userProposal = order.Proposals?.find(
              (proposal: any) => proposal.userId === user?.id
            );

            if (!userProposal) {
              Alert.alert(t("error"), t("proposalNotFound"));
              return;
            }

            await apiService.cancelProposal(userProposal.id);

            // Track proposal cancellation
            AnalyticsService.getInstance().logEvent("proposal_cancelled", {
              order_id: order.id.toString(),
              proposal_id: userProposal.id.toString(),
            });

            // Invalidate queries to refetch orders
            queryClient.invalidateQueries({ queryKey: ["orders"] });

            // Show feedback dialog after successful cancellation
            setCanceledOrderId(order.id);
            setFeedbackDialogVisible(true);
          } catch (err) {
            console.error("Error canceling proposal:", err);
            Alert.alert(t("error"), t("failedToCancelProposal"));
          }
        },
      },
    ]);
  };

  const handleApplyToOrder = async (order: Order) => {
    // Check if user is authenticated
    if (!user?.id) {
      // Show login modal for non-authenticated users
      showLoginModal();
      return;
    }

    setSelectedOrder(order);

    // Check if this is a draft permanent order (needs publishing)
    if (
      (order as any).orderType === "permanent" &&
      (order as any).status === "draft"
    ) {
      handlePublishOrder(order);
      return;
    }

    // Check if this is a permanent order (for check-in)
    if ((order as any).orderType === "permanent") {
      setShowCheckInModal(true);
    } else {
      setShowApplyModal(true);
    }
  };

  const handlePublishOrder = async (order: Order) => {
    try {
      // Check subscription first
      const subscription = await apiService.getMySubscription();
      if (
        !subscription ||
        subscription.status !== "active" ||
        new Date(subscription.endDate) < new Date()
      ) {
        Alert.alert(
          t("subscriptionRequiredForPermanent") || "Subscription Required",
          t("subscriptionRequiredForPermanentDesc") ||
            "An active subscription is required to publish permanent orders.",
          [
            { text: t("cancel"), style: "cancel" },
            {
              text: t("viewSubscriptions") || "View Subscriptions",
              onPress: () => {
                router.push("/subscriptions" as any);
              },
            },
          ]
        );
        return;
      }

      // Confirm publishing
      Alert.alert(
        t("publishPermanentOrder") || "Publish Permanent Order",
        t("publishToMakeVisible") ||
          "Publish this order to make it visible to clients",
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("publishOrder") || "Publish",
            onPress: async () => {
              setApplyLoading(true);
              try {
                await apiService.publishPermanentOrder(order.id);
                Alert.alert(
                  t("orderPublished") || "Success!",
                  t("orderPublishedDesc") ||
                    "Your permanent order has been submitted for review."
                );
                // Refresh orders list
                queryClient.invalidateQueries({ queryKey: ["orders"] });
              } catch (error: any) {
                console.error("Error publishing order:", error);
                Alert.alert(
                  t("error"),
                  error.message ||
                    t("failedToPublishOrder") ||
                    "Failed to publish order"
                );
              } finally {
                setApplyLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error checking subscription:", error);
      Alert.alert(t("error"), t("failedToLoadSubscription"));
    }
  };

  const handleSubmitApplication = async (
    message: string,
    questionAnswers?: Array<{ questionId: number; answer: string }>,
    peerIds?: number[],
    teamId?: number
  ) => {
    if (!selectedOrder) return;

    setApplyLoading(true);

    try {
      // Use TanStack Query mutation
      const result = await applyToOrderMutation.mutateAsync({
        orderId: selectedOrder.id,
        message: message,
        questionAnswers: questionAnswers,
        peerIds: peerIds,
        teamId: teamId,
      });

      // Track proposal submission
      const proposalId = result?.id || result?.proposalId || "unknown";
      await AnalyticsService.getInstance().logProposalSubmitted(
        selectedOrder.id.toString(),
        proposalId.toString()
      );

      // Add order to applied orders set
      setAppliedOrders((prev) => new Set(prev).add(selectedOrder.id));

      // Create a chat conversation with the client (include peers if group application)
      // The proposal message will be automatically sent as the first message by the backend
      try {
        const conversation = await chatService.createOrderConversation(
          selectedOrder.id,
          typeof proposalId === "number" ? proposalId : undefined
        );

        Alert.alert(t("success"), t("applicationSubmittedSuccessfully"), [
          {
            text: t("ok"),
            onPress: () => {
              // Navigate to the chat
              router.push(`/chat/${conversation.id}`);
            },
          },
        ]);
      } catch (chatError) {
        // Still show success for the application, but mention chat creation failed
        Alert.alert(
          t("success"),
          t("applicationSubmittedSuccessfully") + " (Chat creation failed)"
        );
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error.message?.includes("Insufficient credit balance")) {
        Alert.alert(t("insufficientCredits"), t("needMoreCredits"));
      } else if (error.message?.includes("already has a proposal")) {
        Alert.alert(t("error"), "You have already applied to this order");
      } else {
        Alert.alert(t("error"), t("failedToSubmitApplication"));
      }
    } finally {
      setApplyLoading(false);
    }
  };

  const handleCloseApplyModal = () => {
    setShowApplyModal(false);
    setSelectedOrder(null);
  };

  const handleCheckInSubmit = async (
    selectedSlots: Array<{ date: string; startTime: string; endTime: string }>
  ) => {
    if (!selectedOrder) return;

    setApplyLoading(true);

    try {
      const result = await apiService.checkInToOrder(
        selectedOrder.id,
        selectedSlots
      );

      if (result.bookings && result.bookings.length > 0) {
        Alert.alert(
          t("checkInSuccess"),
          `${t("checkInSuccess")} ${result.bookings.length} ${
            result.bookings.length === 1
              ? t("slotSelected")
              : t("slotsSelected")
          }`,
          [
            {
              text: t("ok"),
              onPress: () => {
                setShowCheckInModal(false);
                setSelectedOrder(null);
                // Refresh the orders list
                queryClient.invalidateQueries({ queryKey: ["orders"] });
              },
            },
          ]
        );
      }

      if (result.errors && result.errors.length > 0) {
        console.warn("Some bookings failed:", result.errors);
      }
    } catch (error: any) {
      console.error("Error checking in:", error);
      Alert.alert(t("error"), t("failedToCheckIn"));
    } finally {
      setApplyLoading(false);
    }
  };

  const handleCloseCheckInModal = () => {
    setShowCheckInModal(false);
    setSelectedOrder(null);
  };

  const handleFilterChange = (
    sectionKey: string,
    value:
      | string
      | string[]
      | { min: number; max: number }
      | {
          latitude: number;
          longitude: number;
          address: string;
          radius: number;
        }
      | null
  ) => {
    // Track filter change
    AnalyticsService.getInstance().logEvent("filter_changed", {
      filter_type: sectionKey,
      has_value: value !== null,
    });
    setSelectedFilters((prev) => ({
      ...prev,
      [sectionKey]: value,
    }));
  };

  const handleSearchChange = useCallback(
    (text: string) => {
      // Set typing flag to prevent re-renders
      isTypingRef.current = true;

      // Clear any existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout for debounced search
      searchTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        setSearchQuery(text);
        // Track search when user stops typing
        if (text.trim().length > 0) {
          AnalyticsService.getInstance().logSearch(text.trim(), {
            filter_type: isMyOrders
              ? "my_orders"
              : isMyJobs
              ? "my_jobs"
              : isSavedOrders
              ? "saved"
              : "all",
          });
        }
      }, 300);
    },
    [isMyOrders, isMyJobs, isSavedOrders]
  );

  const header = (
    <Header
      title={
        isMyOrders
          ? t("myOrders")
          : isMyJobs
          ? t("myJobs")
          : isSavedOrders
          ? t("savedOrders")
          : t("orders")
      }
      showNotificationsButton={isAuthenticated}
      showChatButton={isAuthenticated}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color={colors.tint} />
        <Text style={[styles.loadingMoreText, { color: colors.text }]}>
          {t("loadingMoreOrders")}
        </Text>
      </View>
    );
  };

  const renderEmptyComponent = () => {
    // Don't show empty state during initial load
    if (isInitialLoad || (loading && !filterLoading)) {
      return null; // Loading overlay will handle this
    }

    if (error) {
      return (
        <EmptyPage
          type="error"
          title={error}
          buttonText={t("retry")}
          onRetry={() => queryClient.refetchQueries({ queryKey: ["orders"] })}
        />
      );
    }

    if (displayedOrders.length === 0) {
      return (
        <EmptyPage
          type="empty"
          icon="doc.text"
          title={t("noOrders")}
          subtitle={
            searchQuery
              ? t("tryAdjustingSearchTerms")
              : isMyOrders
              ? t("createYourFirstOrder")
              : t("checkBackLater")
          }
          buttonText={!searchQuery && isMyOrders ? t("createOrder") : undefined}
          onButtonPress={
            !searchQuery && isMyOrders ? handleCreateOrder : undefined
          }
        />
      );
    }

    return null;
  };

  // Tab configuration
  const tabs = useMemo(
    () => [
      { key: "one_time", label: t("oneTimeOrders") || "One-Time Orders" },
      { key: "permanent", label: t("permanentOrders") || "Permanent Orders" },
    ],
    [t]
  );

  const handleTabChange = useCallback(
    (tabKey: string) => {
      setActiveOrderTab(tabKey as "one_time" | "permanent");

      // Reset search query
      setSearchQuery("");

      // Reset client-side pagination
      setClientSidePage(1);

      // Reset filters when switching tabs
      setSelectedFilters({
        categories: [],
        services: [],
        priceRange: { min: 0, max: 10000 },
        location: "",
        rating: null,
        sortBy: "relevance",
      });

      // Reset status filter and search from URL
      router.setParams({ status: undefined, q: undefined });

      AnalyticsService.getInstance().logEvent("tab_changed", {
        tab: tabKey,
        location: "orders_screen",
      });
    },
    [router]
  );

  return (
    <>
      <Layout header={header}>
        <TopTabs
          tabs={tabs}
          activeTab={activeOrderTab}
          onTabChange={handleTabChange}
        />
        <View style={{ flex: 1 }}>
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1,
            }}
          >
            <ResponsiveCard>
              <Filter
                searchPlaceholder={t("searchOrdersSkills")}
                initialSearchValue={searchQuery}
                onSearchChange={handleSearchChange}
                filterSections={filterSections}
                selectedFilters={selectedFilters}
                onFilterChange={handleFilterChange}
                loading={filterLoading}
                hideModalForLocation={filterModalHiddenForLocation}
              />
            </ResponsiveCard>
          </View>

          {/* Show skeleton loading during initial load */}
          {isInitialLoad ||
          (loading && !filterLoading && displayedOrders.length === 0) ? (
            <View style={{ marginTop: 84, flex: 1 }}>
              <FloatingSkeleton
                count={5}
                itemHeight={280}
                showImage={true}
                showTitle={true}
                showDescription={true}
                showDetails={true}
                showTags={true}
              />
            </View>
          ) : (
            <FlatList
              style={{ marginTop: 84 }}
              data={displayedOrders}
              renderItem={({ item }) => (
                <OrderItem
                  order={item}
                  isMyOrders={isMyOrders}
                  isMyJobs={isMyJobs}
                  hasAppliedToOrder={hasAppliedToOrder}
                  isViewed={isOrderViewed(item.id)}
                  isSaved={isOrderSaved(item.id)}
                  onOrderViewed={handleOrderViewed}
                  onApplyToOrder={handleApplyToOrder}
                  onCancelProposal={handleCancelProposal}
                  onDeleteOrder={handleDeleteOrder}
                  onSaveToggle={handleSaveToggle}
                />
              )}
              keyExtractor={(item) => item.id.toString()}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={renderEmptyComponent}
              {...(isMyOrders || isMyJobs || isSavedOrders
                ? {}
                : paginationFlatListProps)}
              onEndReached={loadMoreOrdersWrapper}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.tint}
                />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 6 * Spacing.lg + 80 }}
            />
          )}

          {/* Floating Action Button - Only show for authenticated users and not on My Jobs */}
          {isAuthenticated && !isMyJobs && (
            <TouchableOpacity
              style={[
                styles.fab,
                {
                  backgroundColor: colors.primary, // Use primary color which is consistent in both themes
                  bottom: 70 + insets.bottom, // Account for footer tabs + safe area
                },
              ]}
              onPress={handleCreateOrder}
              activeOpacity={0.8}
            >
              <IconSymbol name="plus" size={24} color="#FFFFFF" />
              <Text style={styles.fabText}>{t("createOrder")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Layout>

      <ApplyModal
        visible={showApplyModal}
        onClose={handleCloseApplyModal}
        order={selectedOrder}
        onSubmit={handleSubmitApplication}
        loading={applyLoading}
      />

      <CheckInModal
        visible={showCheckInModal}
        onClose={handleCloseCheckInModal}
        order={selectedOrder}
        onSubmit={handleCheckInSubmit}
        loading={applyLoading}
      />

      <FeedbackDialog
        visible={feedbackDialogVisible}
        onClose={handleFeedbackClose}
        onSubmit={handleFeedbackSubmit}
        title={t("reviewTitle")}
        subtitle={t("reviewSubtitle")}
        loading={feedbackLoading}
      />

      <LocationFilterModal
        visible={locationFilterVisible}
        onClose={() => {
          setLocationFilterVisible(false);
          // Show filter modal again when location modal closes
          setFilterModalHiddenForLocation(false);
        }}
        onConfirm={(locationData) => {
          setSelectedFilters((prev) => ({
            ...prev,
            location: locationData,
          }));
          setLocationFilterVisible(false);
          // Show filter modal again when location is confirmed
          setFilterModalHiddenForLocation(false);
        }}
        initialLocation={
          selectedFilters.location &&
          typeof selectedFilters.location === "object" &&
          "latitude" in selectedFilters.location &&
          "longitude" in selectedFilters.location &&
          "address" in selectedFilters.location &&
          "radius" in selectedFilters.location
            ? (selectedFilters.location as {
                latitude: number;
                longitude: number;
                address: string;
                radius: number;
              })
            : undefined
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingMoreContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
  },
  loadingMoreText: {
    fontSize: 14,
    opacity: 0.7,
  },
  fab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 28,
    gap: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 10,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
