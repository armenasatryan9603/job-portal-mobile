import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BorderRadius, Spacing, ThemeColors } from "@/constants/styles";
import { Filter, FilterSection } from "@/components/FilterComponent";
import { Order, OrderListResponse, apiService } from "@/categories/api";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  extractCountryFromLocation,
  getCountryIsoCode,
  getCountryIsoFromLocation,
  getLocationDisplay,
} from "@/utils/countryExtraction";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  useApplyToOrder,
  useCategories,
  useMyJobs,
  useMyOrders,
  useOrdersFeed,
  useSavedOrders,
} from "@/hooks/useApi";

import AnalyticsService from "@/categories/AnalyticsService";
import { ApplyModal } from "@/components/ApplyModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "@/components/ui/button";
import { CheckInModal } from "@/components/CheckInModal";
import { EmptyPage } from "@/components/EmptyPage";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { FloatingSkeleton } from "@/components/FloatingSkeleton";
import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { LocationFilterModal } from "@/components/LocationFilterModal";
import OrderItem from "./Item";
import { TopTabs } from "@/components/TopTabs";
import { chatService } from "@/categories/chatService";
import { getViewedOrders } from "@/utils/viewedOrdersStorage";
import { parseLocationCoordinates as parseLocationCoordinatesUtil } from "@/utils/locationParsing";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useInfinitePagination } from "@/hooks/useInfinitePagination";
import { useLanguage } from "@/contexts/LanguageContext";
import { useModal } from "@/contexts/ModalContext";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/contexts/TranslationContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";

/** Price range config per currency so filter min/max/step match (e.g. AMD in drams, USD in dollars). */
function getPriceRangeConfigForCurrency(currency: string): {
  min: number;
  max: number;
  step: number;
} {
  const code = (currency || "USD").toUpperCase();
  switch (code) {
    case "AMD":
      return { min: 0, max: 50_000_000, step: 10_000 };
    case "RUB":
      return { min: 0, max: 10_000_000, step: 1000 };
    case "EUR":
      return { min: 0, max: 100_000, step: 100 };
    case "USD":
    default:
      return { min: 0, max: 100_000, step: 100 };
  }
}

/** Approximate rate to USD for price filter comparison (rates may vary; update periodically). */
const CURRENCY_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.05,
  AMD: 1 / 400,
  RUB: 1 / 95,
};

function amountToUsd(amount: number, currency: string): number {
  const code = (currency || "USD").toUpperCase();
  const rate = CURRENCY_TO_USD[code] ?? 1;
  return amount * rate;
}

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
  const isMyOrders = myOrders === "true";
  const isMyJobs = myJobs === "true";
  const isSavedOrders = saved === "true";

  // Add tab state for order type
  const [activeOrderTab, setActiveOrderTab] = useState<
    "one_time" | "permanent"
  >("one_time");
  const [tabLoaded, setTabLoaded] = useState(false);
  const tabStorageKey = "ordersActiveTab";
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
  // Per-tab filter/search keys so each tab keeps its own saved state
  const getFilterStorageKey = useCallback(
    (tab: string) => `ordersFilters:${screenName}:${tab}`,
    [screenName]
  );
  const getSearchStorageKey = useCallback(
    (tab: string) => `ordersSearch:${screenName}:${tab}`,
    [screenName]
  );
  const filterStorageKey = useMemo(
    () => getFilterStorageKey(activeOrderTab),
    [getFilterStorageKey, activeOrderTab]
  );
  const searchStorageKey = useMemo(
    () => getSearchStorageKey(activeOrderTab),
    [getSearchStorageKey, activeOrderTab]
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

  // Extract country from user location for default filtering
  // Only apply for general orders view (not My Orders, My Jobs, or Saved Orders)
  // ISO from location: "address__ISO" or fallback parse from address text
  const userCountryIso = useMemo(() => {
    if (isMyOrders || isMyJobs || isSavedOrders) return undefined;
    const fromSeparator = user?.location ? getCountryIsoFromLocation(user.location) : null;
    if (fromSeparator) return fromSeparator;
    if (!user?.location) return undefined;
    const name = extractCountryFromLocation(getLocationDisplay(user.location));
    return name ? getCountryIsoCode(name) ?? undefined : undefined;
  }, [user?.location, isMyOrders, isMyJobs, isSavedOrders]);

  // Currency for price filter: based on app language for now (use user?.currency ?? "USD" in future)
  const priceFilterCurrency = useMemo(() => {
    const lang = (language || "en").toLowerCase();
    if (lang === "hy") return "AMD";
    if (lang === "ru") return "RUB";
    if (lang === "en") return "USD";
    return "USD";
  }, [language]);

  // TanStack Query hooks
  const myOrdersQuery = useMyOrders();
  const myJobsQuery = useMyJobs();
  // For saved orders, fetch all at once (like My Orders/My Jobs) since users typically don't have many saved orders
  const savedOrdersQuery = useSavedOrders(1, 100);

  // Budget params for feed: only when one-time tab and user has set a non-default price range (backend filters by budget + currency)
  const feedBudgetParams = useMemo(() => {
    if (activeOrderTab !== "one_time") return {};
    const range = selectedFilters.priceRange;
    if (
      !range ||
      typeof range !== "object" ||
      !("min" in range) ||
      !("max" in range)
    )
      return {};
    const config = getPriceRangeConfigForCurrency(priceFilterCurrency);
    const min = Number((range as { min: number; max: number }).min);
    const max = Number((range as { min: number; max: number }).max);
    if (
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      (min === config.min && max === config.max)
    )
      return {};
    return {
      budgetMin: min,
      budgetMax: max,
      budgetCurrency: priceFilterCurrency,
    };
  }, [
    activeOrderTab,
    selectedFilters.priceRange,
    priceFilterCurrency,
  ]);

  // Single orders feed: uses getPublicOrders when no search, searchOrders when searching (price range handled by backend)
  const ordersFeedQuery = useOrdersFeed(tempCurrentPage, limit, {
    searchQuery: searchQuery.trim() || undefined,
    status: status && status !== "all" ? status : undefined,
    categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
    orderType: activeOrderTab,
    country: userCountryIso ?? undefined,
    ...feedBudgetParams,
    enabled: tabLoaded,
  });

  const { data: categoriesData } = useCategories(1, 100, undefined, language);

  // Mutations
  const applyToOrderMutation = useApplyToOrder();

  // Determine which query to use based on current view
  const activeQuery = useMemo(() => {
    if (isMyOrders) return myOrdersQuery;
    if (isMyJobs) return myJobsQuery;
    if (isSavedOrders) return savedOrdersQuery;
    return ordersFeedQuery;
  }, [
    isMyOrders,
    isMyJobs,
    isSavedOrders,
    myOrdersQuery,
    myJobsQuery,
    savedOrdersQuery,
    ordersFeedQuery,
  ]);

  // Load saved filters/search from local storage (per-tab keys using loadedTab)
  useEffect(() => {
    const loadSavedFilters = async () => {
      try {
        const savedTab = await AsyncStorage.getItem(tabStorageKey);

        // Load saved tab BEFORE marking as loaded
        let loadedTab: "one_time" | "permanent" = "one_time";
        if (savedTab && (savedTab === "one_time" || savedTab === "permanent")) {
          loadedTab = savedTab as "one_time" | "permanent";
          setActiveOrderTab(loadedTab);
        }

        // Load filters and search for this tab only
        const savedFiltersString = await AsyncStorage.getItem(
          getFilterStorageKey(loadedTab)
        );
        const savedSearch = await AsyncStorage.getItem(
          getSearchStorageKey(loadedTab)
        );

        // Mark tab as loaded (enables queries)
        setTabLoaded(true);

        if (savedFiltersString) {
          const parsed = JSON.parse(savedFiltersString);
          setSelectedFilters((prev) => {
            const updated = {
              ...prev,
              ...parsed,
            };
            // For permanent orders, ensure status is "all" to show all statuses
            if (loadedTab === "permanent" && updated.status !== "all") {
              updated.status = "all";
            }
            // If categoryId is in URL, it takes precedence over saved filters
            if (filterCategoryId !== null) {
              updated.categories = [filterCategoryId.toString()];
            }
            return updated;
          });
        } else {
          // If no saved filters for this tab, set appropriate defaults
          if (filterCategoryId !== null) {
            setSelectedFilters((prev) => ({
              ...prev,
              categories: [filterCategoryId.toString()],
              status: loadedTab === "permanent" ? "all" : prev.status,
            }));
          } else if (loadedTab === "permanent") {
            setSelectedFilters((prev) => ({
              ...prev,
              status: "all",
            }));
          }
        }
        // Only load saved search if no URL parameter is present
        if (!q && savedSearch !== null) {
          setSearchQuery(savedSearch);
        }
      } catch (error) {
        console.error("Error loading saved filters:", error);
        setTabLoaded(true); // Still mark as loaded even on error
      }
    };
    loadSavedFilters();
  }, [getFilterStorageKey, getSearchStorageKey, tabStorageKey, q, filterCategoryId]);

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
  }, [
    selectedFilters,
    searchQuery,
    activeOrderTab,
    isMyOrders,
    isMyJobs,
    isSavedOrders,
  ]);

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

  // Only reset pagination when filters that affect the API request change (not client-side sort/location/rating)
  const ordersFeedResetDeps = useMemo(
    () => [
      searchQuery,
      activeOrderTab,
      status,
      selectedCategoryIds.length ? selectedCategoryIds.join(",") : "",
      feedBudgetParams.budgetMin ?? "",
      feedBudgetParams.budgetMax ?? "",
      feedBudgetParams.budgetCurrency ?? "",
      userCountryIso ?? "",
    ],
    [
      searchQuery,
      activeOrderTab,
      status,
      selectedCategoryIds,
      feedBudgetParams.budgetMin,
      feedBudgetParams.budgetMax,
      feedBudgetParams.budgetCurrency,
      userCountryIso,
    ]
  );

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
    resetDeps: ordersFeedResetDeps,
    enableScrollGate: false, // Allow onEndReached to trigger without requiring scroll-begin (fixes pagination when list is short or with numColumns)
  });  

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

    // Only show price filter for one-time orders (range depends on currency, e.g. dram for AMD)
    if (activeOrderTab === "one_time") {
      sections.push({
        key: "priceRange",
        title: t("priceRange"),
        type: "range",
        rangeConfig: getPriceRangeConfigForCurrency(priceFilterCurrency),
      });
    }

    sections.push(
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
    priceFilterCurrency,
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

  // Helper function to filter orders by price range (converts to USD so filter works across currencies)
  const filterOrdersByPriceRange = useCallback(
    (
      orders: Order[],
      priceRange: { min: number; max: number },
      filterCurrency: string
    ): Order[] => {
      if (!priceRange) return orders;
      const minUsd = amountToUsd(priceRange.min, filterCurrency);
      const maxUsd = amountToUsd(priceRange.max, filterCurrency);
      return orders.filter((order: Order) => {
        if (order.budget == null || order.budget === undefined) return true;
        const orderBudgetUsd = amountToUsd(
          order.budget,
          order.currency ?? "USD"
        );
        return orderBudgetUsd >= minUsd && orderBudgetUsd <= maxUsd;
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
  // Uses the shared utility and extracts only coordinates for distance calculation
  const parseLocationCoordinates = useCallback(
    (
      locationString: string
    ): { latitude: number; longitude: number } | null => {
      const parsed = parseLocationCoordinatesUtil(locationString);
      return parsed ? { latitude: parsed.latitude, longitude: parsed.longitude } : null;
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

        // Parse coordinates from order location string (strip __ISO for parsing)
        const orderCoords = parseLocationCoordinates(getLocationDisplay(order.location));

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
    const config = getPriceRangeConfigForCurrency(priceFilterCurrency);
    return { min: config.min, max: config.max };
  }, [selectedFilters.priceRange, priceFilterCurrency]);

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
      // Skip price filter for saved orders and for permanent orders
      if (!isSavedOrders && activeOrderTab === "one_time") {
        filteredOrders = filterOrdersByPriceRange(
          filteredOrders,
          priceRange,
          priceFilterCurrency
        );
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

      // Filter by order type (tab) - needed for My Orders/My Jobs/Saved Orders
      // since these queries fetch all order types
      filteredOrders = filteredOrders.filter((order) => {
        const orderType = (order as any).orderType || "one_time";
        return orderType === activeOrderTab;
      });

      // Get paginated results - return all items up to current page for infinite scroll
      const endIndex = clientSidePage * limit;
      return filteredOrders.slice(0, endIndex);
    }

    // For regular orders feed: price range is handled by backend (budgetMin/Max/Currency). Only location, rating, sort client-side.
    let filteredOrders = orders;

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

    // For non-owners, hide draft permanent orders (only show published ones)
    // Note: Backend now filters by orderType, so we only need to filter drafts
    // Also exclude user's own created orders
    if (!isMyOrders && !isMyJobs && !isSavedOrders) {
      filteredOrders = filteredOrders.filter((order) => {
        // Exclude user's own created orders
        if (user?.id && order.clientId === user.id) {
          return false;
        }
        // Hide draft permanent orders (only show published ones)
        const orderType = (order as any).orderType || "one_time";
        if (orderType === "permanent" && (order as any).status === "draft") {
          return false;
        }
        return true;
      });
    }

    return filteredOrders;
  }, [
    isMyOrders,
    isMyJobs,
    isSavedOrders,
    allUserOrders,
    searchQuery,
    user?.id,
    status,
    selectedFilters.categories,
    selectedFilters.services,
    selectedFilters.sortBy,
    priceRange,
    priceFilterCurrency,
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
        if (activeOrderTab === "one_time") {
          filtered = filterOrdersByPriceRange(
            filtered,
            priceRange,
            priceFilterCurrency
          );
        }
        const locationFilter = selectedFilters.location as {
          latitude: number;
          longitude: number;
          address: string;
          radius: number;
        } | null;
        if (locationFilter) {
          // Simple text matching for now (match against display part only)
          filtered = filtered.filter((order) => {
            if (!order.location) return false;
            return getLocationDisplay(order.location)
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
    priceFilterCurrency,
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

  const handleCreateOrder = () => {
    AnalyticsService.getInstance().logEvent("button_clicked", {
      button_name: "create_order",
      location: "orders_screen",
    });
    router.push("/orders/create");
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
        t("publishPermanentOrder"),
        t("publishToMakeVisible"),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("publishOrder"),
            onPress: async () => {
              setApplyLoading(true);
              try {
                const publishedOrder = await apiService.publishPermanentOrder(order.id);
                // Check if order was republished (already approved) or needs review
                // If status is not "pending_review", it means it was republished and went directly live
                const isRepublished = publishedOrder.status !== "pending_review";
                Alert.alert(
                  t("orderPublished"),
                  isRepublished ? t("orderRepublishedDesc") : t("orderPublishedDesc")
                );
                // Refresh orders list
                queryClient.invalidateQueries({ queryKey: ["orders"] });
              } catch (error: any) {
                console.error("Error publishing order:", error);
                Alert.alert(
                  "",
                  t("subscriptionRequiredToPublishOrder"),
                  [
                    { text: t("cancel"), style: "cancel" },
                    {
                      text: t("viewSubscriptions"),
                      onPress: () => {
                        router.push("/subscriptions");
                      },
                    },
                  ]
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
          t("applicationSubmittedSuccessfully") + " " + t("chatCreationFailed")
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
    selectedSlots: Array<{ date: string; startTime: string; endTime: string; marketMemberId?: number; message?: string }>
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
        
        // Check if any errors are market conflict errors
        const marketConflictErrors = result.errors.filter((err: any) =>
          err.error?.includes("another order from the same service") ||
          err.error?.includes("same service")
        );

        if (marketConflictErrors.length > 0) {
          // Show market conflict alert
          const conflictMessage = marketConflictErrors.length === 1
            ? marketConflictErrors[0].error
            : `${marketConflictErrors.length} ${t("slotsSelected") || "slots"} ${t("conflictWithMarketOrder") || "conflict with another order from the same service"}`;
          
          Alert.alert(
            t("bookingConflict") || "Booking Conflict",
            conflictMessage,
            [{ text: t("ok") }]
          );
        } else {
          // Show generic error for other failures
          const errorMessages = result.errors.map((err: any) => err.error).join("\n");
          Alert.alert(
            t("error"),
            `${t("someBookingsFailed") || "Some bookings failed"}:\n${errorMessages}`
          );
        }
      }
    } catch (error: any) {
      console.error("Error checking in:", error);
      
      // Check if error is a market conflict
      const errorMessage = error?.message || error?.toString() || "";
      if (
        errorMessage.includes("another order from the same service") ||
        errorMessage.includes("same service")
      ) {
        Alert.alert(
          t("bookingConflict") || "Booking Conflict",
          errorMessage || t("marketBookingConflict") || "You already have a booking for this time in another order from the same service. Please choose a different time."
        );
      } else {
        Alert.alert(t("error"), t("failedToCheckIn"));
      }
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
      { key: "one_time", label: t("oneTimeOrders") },
      { key: "permanent", label: t("permanentOrders") },
    ],
    [t]
  );

  const handleTabChange = useCallback(
    async (tabKey: string) => {
      if (tabKey === activeOrderTab) return;

      setClientSidePage(1);
      router.setParams({ status: undefined, q: undefined });

      // Load the switched-to tab's saved filters and search first (each tab has its own storage key)
      try {
        const savedFiltersString = await AsyncStorage.getItem(
          getFilterStorageKey(tabKey)
        );
        const savedSearch = await AsyncStorage.getItem(
          getSearchStorageKey(tabKey)
        );

        if (savedFiltersString) {
          const parsed = JSON.parse(savedFiltersString);
          setSelectedFilters((prev) => {
            const updated = { ...prev, ...parsed };
            if (tabKey === "permanent" && updated.status !== "all") {
              updated.status = "all";
            }
            return updated;
          });
        } else {
          setSelectedFilters((prev) => ({
            ...prev,
            status:
              tabKey === "permanent"
                ? "all"
                : isMyJobs || isSavedOrders || isMyOrders
                ? "all"
                : "open",
          }));
        }

        setSearchQuery(savedSearch ?? "");
      } catch (error) {
        console.error("Error loading tab filters:", error);
        setSelectedFilters((prev) => ({
          ...prev,
          status:
            tabKey === "permanent"
              ? "all"
              : isMyJobs || isSavedOrders || isMyOrders
              ? "all"
              : "open",
        }));
        setSearchQuery("");
      }

      // Then switch tab and persist tab choice (save effect will write to new tab key with the filters we just set)
      setActiveOrderTab(tabKey as "one_time" | "permanent");
      try {
        await AsyncStorage.setItem(tabStorageKey, tabKey);
      } catch (error) {
        console.error("Error saving tab:", error);
      }

      AnalyticsService.getInstance().logEvent("tab_changed", {
        tab: tabKey,
        location: "orders_screen",
      });
    },
    [router, tabStorageKey, activeOrderTab, getFilterStorageKey, getSearchStorageKey]
  );

  return (
    <>
      <Layout header={header}>
        <TopTabs
          tabs={tabs}
          activeTab={activeOrderTab}
          onTabChange={handleTabChange}
        />
        <View style={{ flex: 1, marginBottom: Spacing.xxxl * 2.5 }}>    
          <Filter
            searchPlaceholder={t("searchOrdersSkills")}
            initialSearchValue={searchQuery}
            onSearchChange={handleSearchChange}
            filterSections={filterSections}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
            loading={filterLoading}
            hideModalForLocation={filterModalHiddenForLocation}
            priceRangeCurrency={priceFilterCurrency}
          />

          {/* Show skeleton loading during initial load */}
          {isInitialLoad ||
          (loading && !filterLoading && displayedOrders.length === 0) ? (
            <View style={{ marginTop: -2, flex: 1 }}>
              <FloatingSkeleton
                count={6}
                variant="grid2"
              />
            </View>
          ) : (
            <FlatList
              data={displayedOrders}
              renderItem={({ item }) => (
                <OrderItem
                  order={item}
                  isMyOrders={isMyOrders}
                  isMyJobs={isMyJobs}
                  hasAppliedToOrder={hasAppliedToOrder}
                  isViewed={isMyOrders || isMyJobs ? false : isOrderViewed(item.id)}
                  isSaved={isOrderSaved(item.id)}
                  onOrderViewed={handleOrderViewed}
                  onApplyToOrder={handleApplyToOrder}
                  onCancelProposal={handleCancelProposal}
                  onSaveToggle={handleSaveToggle}
                  onPublishOrder={handlePublishOrder}
                />
              )}
              keyExtractor={(item) => item.id.toString()}
              ListFooterComponent={renderFooter}
              numColumns={2}
              columnWrapperStyle={{ marginRight: -Spacing.sm }}
              ListEmptyComponent={renderEmptyComponent}
              {...(isMyOrders || isMyJobs || isSavedOrders
                ? {}
                : paginationFlatListProps)}
              onEndReached={loadMoreOrdersWrapper}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.tint}
                />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ marginHorizontal: Spacing.md, paddingBottom: Spacing.lg }}
            />
          )}

          {/* Floating Action Button - Only show for authenticated users and not on My Jobs */}
          {isAuthenticated && !isMyJobs && (
            <Button
              style={styles.fab}
              onPress={handleCreateOrder}
              icon="plus"
              iconSize={24}
              title={t("createOrder")}
              variant="primary"
            />
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
    bottom: 20,
    borderRadius: BorderRadius.round,
    position: 'absolute',
    right: Spacing.lg,
  },
});
