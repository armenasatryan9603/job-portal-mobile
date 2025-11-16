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
import { router, useLocalSearchParams } from "expo-router";
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
  useApplyToOrder,
  useDeleteOrder,
  useServices,
} from "@/hooks/useApi";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OrdersScreen() {
  const { myOrders, myJobs, serviceId } = useLocalSearchParams();
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
  const filterServiceId = serviceId
    ? isNaN(parseInt(serviceId as string))
      ? null
      : parseInt(serviceId as string)
    : null;
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string | string[] | { min: number; max: number }>
  >({
    status: isMyJobs ? "all" : "open",
    services: filterServiceId ? [filterServiceId.toString()] : [],
    priceRange: { min: 0, max: 100000 },
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
    if (searchQuery.trim()) return searchOrdersQuery;
    if (user?.id) return allOrdersQuery;
    return publicOrdersQuery;
  }, [
    isMyOrders,
    isMyJobs,
    searchQuery,
    user?.id,
    myOrdersQuery,
    myJobsQuery,
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

  // Reset to page 1 when filters change
  useEffect(() => {
    if (isMyOrders || isMyJobs) {
      setClientSidePage(1);
    } else {
      setCurrentPage(1);
    }
  }, [selectedFilters, searchQuery, isMyOrders, isMyJobs]);

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
        key: "status",
        title: t("filterByStatus"),
        options: [
          { key: "all", label: t("all") },
          { key: "open", label: t("open") },
          { key: "in_progress", label: t("inProgress") },
          { key: "completed", label: t("completed") },
          { key: "cancelled", label: t("cancelled") },
          ...(isMyOrders ? [{ key: "pending", label: t("pending") }] : []),
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

  // For My Orders/My Jobs: client-side pagination
  const [allUserOrders, setAllUserOrders] = useState<Order[]>([]);
  const [clientSidePage, setClientSidePage] = useState(1);

  // Track applied orders (fetched from backend)
  const [appliedOrders, setAppliedOrders] = useState<Set<number>>(new Set());

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

  // Helper function to check if user has applied to an order
  const hasAppliedToOrder = (orderId: number): boolean => {
    return appliedOrders.has(orderId);
  };

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
      return orders.filter(
        (order: Order) =>
          order.budget >= priceRange.min && order.budget <= priceRange.max
      );
    },
    []
  );

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

  // Sync allUserOrders with query data for My Orders/My Jobs
  useEffect(() => {
    if (isMyOrders && myOrdersQuery.data) {
      const data = myOrdersQuery.data as OrderListResponse;
      setAllUserOrders(data.orders || []);
    } else if (isMyJobs && myJobsQuery.data) {
      const data = myJobsQuery.data as OrderListResponse;
      setAllUserOrders(data.orders || []);
    }
  }, [isMyOrders, isMyJobs, myOrdersQuery.data, myJobsQuery.data]);

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

    if (isMyOrders || isMyJobs) {
      // Client-side pagination for My Orders/My Jobs
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
      filteredOrders = filterOrdersByPriceRange(filteredOrders, priceRange);

      // Get paginated results
      return getPaginatedOrders(filteredOrders, clientSidePage, limit);
    }

    // For regular orders, apply price filter client-side
    // (Server-side price filtering can be added later)
    let filteredOrders = orders;
    if (priceRange.min !== 0 || priceRange.max !== 100000) {
      filteredOrders = filterOrdersByPriceRange(orders, priceRange);
    }
    return filteredOrders;
  }, [
    isMyOrders,
    isMyJobs,
    allUserOrders,
    searchQuery,
    status,
    selectedFilters.services,
    priceRange,
    clientSidePage,
    orders,
    filterOrdersBySearch,
    filterOrdersByStatus,
    filterOrdersByServices,
    filterOrdersByPriceRange,
    getPaginatedOrders,
  ]);

  // Compute pagination for My Orders/My Jobs
  const displayedPagination = useMemo(() => {
    const selectedServices = Array.isArray(selectedFilters.services)
      ? selectedFilters.services
      : [];

    if (isMyOrders || isMyJobs) {
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
    createPaginationObject,
  ]);

  // Load more orders (pagination)
  const loadMoreOrders = useCallback(() => {
    if (isMyOrders || isMyJobs) {
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
    loadingMore,
    displayedPagination.hasNextPage,
    isInitialLoad,
  ]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Invalidate and refetch all order queries
    await queryClient.refetchQueries({ queryKey: ["orders"] });

    // Also reload applied orders
    await loadAppliedOrders();

    // Reset pagination
    if (isMyOrders || isMyJobs) {
      setClientSidePage(1);
    } else {
      setCurrentPage(1);
    }

    setRefreshing(false);
  }, [queryClient, isMyOrders, isMyJobs]);

  // Load applied orders on component mount
  useEffect(() => {
    // If user is trying to access "My Orders" or "My Jobs" but not authenticated, redirect to login
    if ((isMyOrders || isMyJobs) && !user?.id) {
      showLoginModal();
      return;
    }

    loadAppliedOrders();
  }, [isMyOrders, isMyJobs, user?.id]);

  // Filter orders locally for additional filtering (if needed)
  // const filteredOrders = orders.filter(() => {
  //   // Additional local filtering can be added here if needed
  //   return true;
  // });

  const handleOrderPress = (order: Order) => {
    if (isMyOrders) {
      // For user's own orders, open in edit mode (create.tsx)
      router.push(`/orders/create?orderId=${order.id}`);
    } else {
      // For other orders, open in view mode
      router.push(`/orders/${order.id}`);
    }
  };

  const handleCreateOrder = () => {
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

  const handleSubmitApplication = async (message: string) => {
    if (!selectedOrder) return;

    setApplyLoading(true);

    try {
      // Use TanStack Query mutation
      await applyToOrderMutation.mutateAsync({
        orderId: selectedOrder.id,
        message: message,
      });

      // Add order to applied orders set
      setAppliedOrders((prev) => new Set(prev).add(selectedOrder.id));

      // Create a chat conversation with the client
      // The proposal message will be automatically sent as the first message by the backend
      try {
        const conversation = await chatService.createOrderConversation(
          selectedOrder.id
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
    value: string | string[] | { min: number; max: number }
  ) => {
    console.log("sectionKey", sectionKey, value);
    setSelectedFilters((prev) => ({
      ...prev,
      [sectionKey]: value,
    }));
  };

  const handleSearchChange = useCallback((text: string) => {
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
    }, 300);
  }, []);

  // Status configuration
  const statusConfig = {
    open: { color: "#4CAF50", icon: "circle.fill" },
    in_progress: { color: "#FF9800", icon: "clock.fill" },
    completed: { color: "#2196F3", icon: "checkmark.circle.fill" },
    cancelled: { color: "#F44336", icon: "xmark.circle.fill" },
    pending: { color: "#9E9E9E", icon: "clock.circle.fill" },
  };

  const getStatusColor = (status: string) =>
    statusConfig[status as keyof typeof statusConfig]?.color ||
    colors.tabIconDefault;

  const getStatusIcon = (status: string) =>
    statusConfig[status as keyof typeof statusConfig]?.icon || "circle";

  const header = (
    <Header
      title={isMyOrders ? t("myOrders") : isMyJobs ? t("myJobs") : t("orders")}
      subtitle={
        isMyOrders
          ? t("myOrdersDesc")
          : isMyJobs
          ? t("myJobsDesc")
          : t("browseAvailableJobOrders")
      }
      showNotificationsButton={isAuthenticated}
      showChatButton={isAuthenticated}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
    />
  );

  // Order item component
  const OrderItem = ({ order }: { order: Order }) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    return (
      <TouchableOpacity onPress={() => handleOrderPress(order)}>
        <ResponsiveCard>
          {/* Banner Image */}
          {order.BannerImage && (
            <View style={styles.bannerImageContainer}>
              {imageLoading && (
                <View
                  style={[
                    styles.bannerImageSkeleton,
                    { backgroundColor: colors.border },
                  ]}
                >
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              )}
              <Image
                source={{ uri: order.BannerImage.fileUrl }}
                style={[
                  styles.bannerImage,
                  imageLoading && styles.bannerImageHidden,
                ]}
                resizeMode="cover"
                onLoadStart={() => {
                  setImageLoading(true);
                  setImageError(false);
                }}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
              {imageError && (
                <View
                  style={[
                    styles.bannerImageSkeleton,
                    { backgroundColor: colors.border },
                  ]}
                >
                  <IconSymbol
                    name="photo"
                    size={24}
                    color={colors.tabIconDefault}
                  />
                </View>
              )}
            </View>
          )}
          <View style={styles.orderHeader}>
            <Text style={[styles.orderTitle, { color: colors.text }]}>
              {order.title}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(order.status) },
              ]}
            >
              <IconSymbol
                name={getStatusIcon(order.status) as any}
                size={12}
                color="white"
              />
              <Text style={styles.statusText}>
                {order.status.replace("_", " ").toUpperCase()}
              </Text>
            </View>
          </View>

          <Text
            style={[styles.orderDescription, { color: colors.tabIconDefault }]}
            numberOfLines={5}
          >
            {order.description}
          </Text>

          <View style={styles.orderDetails}>
            <View style={styles.detailItem}>
              <IconSymbol
                name="dollarsign.circle.fill"
                size={16}
                color={colors.tint}
              />
              <Text style={[styles.detailText, { color: colors.text }]}>
                ${order.budget.toLocaleString()}
              </Text>
            </View>
            {order.location && (
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <IconSymbol
                    name="location.fill"
                    size={16}
                    color={colors.tint}
                  />
                </View>
                <Text
                  style={[styles.detailText, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {order.location}
                </Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <IconSymbol name="person.fill" size={16} color={colors.tint} />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {order._count.Proposals} {t("application")}
              </Text>
            </View>
          </View>

          {order.skills && order.skills.length > 0 && (
            <View style={styles.skillsContainer}>
              {order.skills.slice(0, 4).map((skill, index) => (
                <View
                  key={index}
                  style={[
                    styles.skillTag,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.skillText, { color: colors.text }]}>
                    {skill}
                  </Text>
                </View>
              ))}
              {order.skills.length > 4 && (
                <Text
                  style={[
                    styles.moreSkillsText,
                    { color: colors.tabIconDefault },
                  ]}
                >
                  +{order.skills.length - 4} {t("more")}
                </Text>
              )}
            </View>
          )}

          <View>
            <Text style={[styles.clientName, { color: colors.tabIconDefault }]}>
              {t("postedBy")} {order.Client.name} •{" "}
              {new Date(order.createdAt).toLocaleDateString()}
            </Text>
            {order.Service && (
              <Text style={[styles.serviceName, { color: colors.tint }]}>
                {order.Service.name}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* Apply Button - Only show for other users' orders (not owner) */}
            {!isMyOrders &&
              order.status === "open" &&
              !hasAppliedToOrder(order.id) &&
              user?.id !== order.clientId && (
                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: colors.tint }]}
                  onPress={() => handleApplyToOrder(order)}
                >
                  <IconSymbol name="paperplane.fill" size={16} color="black" />
                  <Text style={styles.applyButtonText}>
                    {t("apply")} ({order.creditCost || 1} {t("credit")})
                  </Text>
                </TouchableOpacity>
              )}

            {/* Applied Status - Show when user has already applied */}
            {!isMyOrders &&
              order.status === "open" &&
              hasAppliedToOrder(order.id) &&
              user?.id !== order.clientId && (
                <View
                  style={[
                    styles.appliedButton,
                    { backgroundColor: colors.tabIconDefault },
                  ]}
                >
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={16}
                    color="white"
                  />
                  <Text style={styles.appliedButtonText}>{t("applied")}</Text>
                </View>
              )}

            {/* Cancel Button - Only show for My Jobs */}
            {isMyJobs && order.Proposals && order.Proposals.length > 0 && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelProposal(order)}
              >
                <IconSymbol name="xmark.circle" size={16} color="#FF3B30" />
                <Text style={[styles.cancelButtonText, { color: "#FF3B30" }]}>
                  {t("cancel")}
                </Text>
              </TouchableOpacity>
            )}

            {/* Delete Button - Only show for user's own orders */}
            {isMyOrders && order.status !== "pending" && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteOrder(order)}
              >
                <IconSymbol name="trash" size={16} color="#FF3B30" />
                <Text style={[styles.deleteButtonText, { color: "#FF3B30" }]}>
                  {t("delete")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ResponsiveCard>
      </TouchableOpacity>
    );
  };

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
              backgroundColor: colors.background,
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
              renderItem={({ item }) => <OrderItem order={item} />}
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
                  bottom: 80 + insets.bottom, // Account for footer tabs + safe area
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
    </>
  );
}

const styles = StyleSheet.create({
  bannerImageContainer: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    position: "relative",
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  bannerImageHidden: {
    opacity: 0,
  },
  bannerImageSkeleton: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
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
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
    lineHeight: 26,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "white",
  },
  orderDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    opacity: 0.8,
  },
  orderDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    flexShrink: 1,
    maxWidth: "100%",
    flex: 1,
    minWidth: 0,
  },
  detailIconContainer: {
    marginTop: 2,
  },
  detailText: {
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
    flex: 1,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  skillTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  moreSkillsText: {
    fontSize: 12,
    fontStyle: "italic",
    opacity: 0.7,
  },
  clientName: {
    fontSize: 13,
    opacity: 0.7,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: 12,
    justifyContent: "flex-end",
    gap: 12,
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "black",
  },
  appliedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  appliedButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
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
