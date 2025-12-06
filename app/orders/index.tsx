import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { Filter, FilterSection } from "@/components/FilterComponent";
import { EmptyPage } from "@/components/EmptyPage";
import { ApplyModal } from "@/components/ApplyModal";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { FloatingSkeleton } from "@/components/FloatingSkeleton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { apiService, Order, OrderListResponse } from "@/services/api";
import { chatService } from "@/services/chatService";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
  useServices,
} from "@/hooks/useApi";
import { getViewedOrders } from "@/utils/viewedOrdersStorage";
import AnalyticsService from "@/services/AnalyticsService";
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
  const { myOrders, myJobs, saved, serviceId } = useLocalSearchParams();
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
  const filterServiceId = serviceId
    ? isNaN(parseInt(serviceId as string))
      ? null
      : parseInt(serviceId as string)
    : null;
  const [searchQuery, setSearchQuery] = useState("");
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
    services: filterServiceId ? [filterServiceId.toString()] : [],
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
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;
  const status = selectedFilters?.status as string;

  // Convert selected services to number array
  // Prioritize filterServiceId from URL if present, otherwise use selectedFilters
  const selectedServiceIds = useMemo(() => {
    // If we have a serviceId from URL, use it directly (most reliable)
    if (filterServiceId !== null) {
      return [filterServiceId];
    }
    // Otherwise, use selectedFilters (for manual filter selection)
    const services = Array.isArray(selectedFilters.services)
      ? selectedFilters.services
      : [];
    return services.map((id) => parseInt(id)).filter((id) => !isNaN(id));
  }, [filterServiceId, selectedFilters.services]);

  // TanStack Query hooks
  const myOrdersQuery = useMyOrders();
  const myJobsQuery = useMyJobs();
  // For saved orders, fetch all at once (like My Orders/My Jobs) since users typically don't have many saved orders
  const savedOrdersQuery = useSavedOrders(1, 100);
  const allOrdersQuery = useAllOrders(
    currentPage,
    limit,
    status && status !== "all" ? status : undefined,
    undefined, // serviceId (single, for backward compatibility)
    selectedServiceIds.length > 0 ? selectedServiceIds : undefined
  );
  const publicOrdersQuery = usePublicOrders(
    currentPage,
    limit,
    status && status !== "all" ? status : undefined,
    undefined, // serviceId (single, for backward compatibility)
    selectedServiceIds.length > 0 ? selectedServiceIds : undefined
  );
  const searchOrdersQuery = useSearchOrders(
    searchQuery.trim(),
    currentPage,
    limit,
    selectedServiceIds.length > 0 ? selectedServiceIds : undefined
  );
  const { data: servicesData } = useServices(1, 100, undefined, language); // Get all services for filtering

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

  // Sync serviceId from URL parameter with selectedFilters
  // This ensures that when navigating from service detail page, the filter is applied
  useEffect(() => {
    if (filterServiceId !== null) {
      const serviceIdString = filterServiceId.toString();
      setSelectedFilters((prev) => {
        // Always update to match URL parameter when it's present
        const currentServices = Array.isArray(prev.services)
          ? prev.services
          : [];
        // Update if different or if we have multiple services selected
        if (
          currentServices.length !== 1 ||
          currentServices[0] !== serviceIdString
        ) {
          return {
            ...prev,
            services: [serviceIdString],
          };
        }
        return prev;
      });
      // Reset to page 1 when service changes
      if (!isMyOrders && !isMyJobs) {
        setCurrentPage(1);
      }
    } else {
      // If no serviceId in URL, clear the service filter (unless user manually selected)
      // Only clear if it was set from URL (we can detect this by checking if it's a single service)
      setSelectedFilters((prev) => {
        const currentServices = Array.isArray(prev.services)
          ? prev.services
          : [];
        // Only clear if it's a single service (likely from URL), not multiple (user selection)
        if (currentServices.length === 1) {
          return {
            ...prev,
            services: [],
          };
        }
        return prev;
      });
    }
  }, [filterServiceId, isMyOrders, isMyJobs]);

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
  const orders = queryData?.orders || [];
  const pagination = queryData?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  // Extract services for filtering
  const services = servicesData?.services || [];

  // Filter configuration
  const filterSections = useMemo<FilterSection[]>(
    () => [
      {
        key: "sortBy",
        title: t("sortBy") || "Sort By",
        options: [
          { key: "relevance", label: t("relevance") || "Relevance" },
          { key: "date_desc", label: t("newestFirst") || "Newest First" },
          { key: "date_asc", label: t("oldestFirst") || "Oldest First" },
          { key: "price_desc", label: t("highestPrice") || "Highest Price" },
          { key: "price_asc", label: t("lowestPrice") || "Lowest Price" },
        ],
      },
      {
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
        ],
      },
      {
        key: "priceRange",
        title: t("priceRange") || "Price Range",
        type: "range",
        rangeConfig: {
          min: 0,
          max: 100000,
          step: 100,
        },
      },
      {
        key: "location",
        title: t("location") || "Location",
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
        key: "services",
        title: t("services") || "Services",
        multiSelect: true,
        options: services.map((service) => ({
          key: service.id.toString(),
          label: service.name,
        })),
      },
    ],
    [t, isMyOrders, services]
  );

  // Loading states
  const loading = activeQuery.isLoading && !activeQuery.isFetching;
  const filterLoading = activeQuery.isFetching && currentPage === 1;
  const loadingMore = activeQuery.isFetching && currentPage > 1;
  const error = activeQuery.error ? (activeQuery.error as Error).message : null;
  const isInitialLoad = activeQuery.isLoading && currentPage === 1;

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

      return orders.filter(
        (order: Order) =>
          order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.skills?.some((skill: string) =>
            skill.toLowerCase().includes(searchQuery.toLowerCase())
          )
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

  // Helper function to filter orders by serviceIds (array)
  const filterOrdersByServices = useCallback(
    (orders: Order[], serviceIds: string[]): Order[] => {
      if (!serviceIds || serviceIds.length === 0) return orders;
      const serviceIdNumbers = serviceIds.map((id) => parseInt(id));
      return orders.filter(
        (order: Order) =>
          (order.serviceId && serviceIdNumbers.includes(order.serviceId)) ||
          (order.Service?.id && serviceIdNumbers.includes(order.Service.id))
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
    (total: number, currentPage: number = 1, limit: number = 20) => {
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
    const selectedServices = Array.isArray(selectedFilters.services)
      ? selectedFilters.services
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

      // Apply status filter
      if (status && status !== "all") {
        filteredOrders = filterOrdersByStatus(filteredOrders, status);
      }

      // Apply service filter (client-side for My Orders/My Jobs)
      if (selectedServices.length > 0) {
        filteredOrders = filterOrdersByServices(
          filteredOrders,
          selectedServices
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

    // Apply sorting
    filteredOrders = sortOrders(filteredOrders, sortBy);

    return filteredOrders;
  }, [
    isMyOrders,
    isMyJobs,
    isSavedOrders,
    allUserOrders,
    searchQuery,
    status,
    selectedFilters.services,
    selectedFilters.sortBy,
    priceRange,
    clientSidePage,
    selectedFilters.location,
    selectedFilters.rating,
    orders,
    filterOrdersBySearch,
    filterOrdersByStatus,
    filterOrdersByServices,
    filterOrdersByPriceRange,
    filterOrdersByLocation,
    filterOrdersByRating,
    sortOrders,
    getPaginatedOrders,
  ]);

  // Compute pagination for My Orders/My Jobs/Saved Orders
  const displayedPagination = useMemo(() => {
    const selectedServices = Array.isArray(selectedFilters.services)
      ? selectedFilters.services
      : [];

    if (isMyOrders || isMyJobs || isSavedOrders) {
      const filteredOrders = (() => {
        let filtered = allUserOrders;
        if (searchQuery.trim()) {
          filtered = filterOrdersBySearch(filtered, searchQuery);
        }
        if (status && status !== "all") {
          filtered = filterOrdersByStatus(filtered, status);
        }
        if (selectedServices.length > 0) {
          filtered = filterOrdersByServices(filtered, selectedServices);
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
    filterOrdersBySearch,
    filterOrdersByStatus,
    filterOrdersByServices,
    filterOrdersByPriceRange,
    filterOrdersByRating,
    createPaginationObject,
    selectedFilters,
  ]);

  // Load more orders (pagination)
  const loadMoreOrders = useCallback(() => {
    if (isMyOrders || isMyJobs || isSavedOrders) {
      // Client-side pagination
      if (displayedPagination.hasNextPage) {
        setClientSidePage((prev) => prev + 1);
      }
    } else {
      // Server-side pagination
      if (!loadingMore && displayedPagination.hasNextPage && !isInitialLoad) {
        setCurrentPage((prev) => prev + 1);
      }
    }
  }, [
    isMyOrders,
    isMyJobs,
    isSavedOrders,
    loadingMore,
    displayedPagination.hasNextPage,
    isInitialLoad,
  ]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Invalidate and refetch all order queries
    await queryClient.refetchQueries({ queryKey: ["orders"] });

    // Also reload applied orders, viewed orders, and saved orders
    await loadAppliedOrders();
    await loadViewedOrders();
    await loadSavedOrders();

    // Reset pagination
    if (isMyOrders || isMyJobs || isSavedOrders) {
      setClientSidePage(1);
    } else {
      setCurrentPage(1);
    }

    setRefreshing(false);
  }, [queryClient, isMyOrders, isMyJobs, isSavedOrders]);

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
      await chatService.submitFeedback({
        orderId: canceledOrderId,
        userId: user?.id,
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

  const handleApplyToOrder = (order: Order) => {
    // Check if user is authenticated
    if (!user?.id) {
      // Show login modal for non-authenticated users
      showLoginModal();
      return;
    }

    setSelectedOrder(order);
    setShowApplyModal(true);
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
      subtitle={
        isMyOrders
          ? t("myOrdersDesc")
          : isMyJobs
          ? t("myJobsDesc")
          : isSavedOrders
          ? t("savedOrdersDesc")
          : t("browseAvailableJobOrders")
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

  return (
    <>
      <Layout header={header}>
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
            <ResponsiveCard padding={Spacing.md}>
              <Filter
                searchPlaceholder={t("searchOrdersSkills")}
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
            <View style={{ marginTop: 100, flex: 1 }}>
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
              style={{ marginTop: 100 }}
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
              onEndReached={loadMoreOrders}
              onEndReachedThreshold={0.1}
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
    paddingHorizontal: 20,
    paddingVertical: 14,
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
    fontSize: 16,
    fontWeight: "600",
  },
});
