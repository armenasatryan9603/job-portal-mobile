import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { Filter, FilterSection } from "@/components/FilterComponent";
import { EmptyPage } from "@/components/EmptyPage";
import { ApplyModal } from "@/components/ApplyModal";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors } from "@/constants/styles";
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

// Filter configuration
const filterSections = (
  t: any,
  isMyOrders: boolean,
  isMyJobs: boolean
): FilterSection[] => [
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
];

export default function OrdersScreen() {
  const { myOrders, myJobs } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useLanguage();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const { user, isAuthenticated } = useAuth();
  const { showLoginModal } = useModal();
  const isMyOrders = myOrders === "true";
  const isMyJobs = myJobs === "true";
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string | string[] | { min: number; max: number }>
  >({
    status: isMyJobs ? "all" : "open",
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allUserOrders, setAllUserOrders] = useState<Order[]>([]); // Store all user orders for client-side pagination
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const initialLoadDone = useRef(false);

  // Apply modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);

  // Track applied orders (fetched from backend)
  const [appliedOrders, setAppliedOrders] = useState<Set<number>>(new Set());

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

  // Helper function to create pagination object for local filtering
  const createPaginationObject = (
    total: number,
    currentPage: number = 1,
    limit: number = 20
  ) => {
    const totalPages = Math.ceil(total / limit);
    return {
      page: currentPage,
      limit,
      total,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  };

  // Helper function to filter orders by search
  const filterOrdersBySearch = (
    orders: Order[],
    searchQuery: string
  ): Order[] => {
    if (!searchQuery.trim()) return orders;

    return orders.filter(
      (order: Order) =>
        order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.skills?.some((skill: string) =>
          skill.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );
  };

  // Helper function to filter orders by status
  const filterOrdersByStatus = (orders: Order[], status: string): Order[] => {
    if (!status || status === "all") return orders;
    return orders.filter((order: Order) => order.status === status);
  };

  // Helper function to get paginated orders from a filtered list
  const getPaginatedOrders = (
    filteredOrders: Order[],
    page: number,
    limit: number
  ) => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return filteredOrders.slice(startIndex, endIndex);
  };

  // Load orders from API
  const loadOrders = async (
    page: number = 1,
    search?: string,
    filters?: Record<string, string | string[] | { min: number; max: number }>,
    isFilterChange: boolean = false,
    append: boolean = false
  ) => {
    try {
      if (isFilterChange) {
        setFilterLoading(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let response: OrderListResponse;
      const status = filters?.status as string;

      if (isMyOrders) {
        // For My Orders, load all orders once and cache them for client-side pagination
        let allOrders = allUserOrders;

        // Only fetch from API if we don't have cached orders or if it's a refresh
        if (allOrders.length === 0 || page === 1) {
          const allOrdersResponse = await apiService.getMyOrders();
          allOrders = allOrdersResponse.orders || [];
          setAllUserOrders(allOrders);
        }

        // Apply filters to all orders
        let filteredOrders = allOrders;
        if (search && search.trim()) {
          filteredOrders = filterOrdersBySearch(filteredOrders, search);
        }
        if (status && status !== "all") {
          filteredOrders = filterOrdersByStatus(filteredOrders, status);
        }

        // Get paginated results from filtered orders
        const paginatedOrders = getPaginatedOrders(
          filteredOrders,
          page,
          pagination.limit
        );

        response = {
          orders: paginatedOrders,
          pagination: createPaginationObject(
            filteredOrders.length,
            page,
            pagination.limit
          ),
        };
      } else if (isMyJobs) {
        // For My Jobs, load all jobs once and cache them for client-side pagination
        let allJobs = allUserOrders; // Reuse the same state for caching

        // Only fetch from API if we don't have cached jobs or if it's a refresh
        if (allJobs.length === 0 || page === 1) {
          const allJobsResponse = await apiService.getMyJobs();
          allJobs = allJobsResponse.orders || [];
          setAllUserOrders(allJobs);
        }

        // Apply filters to all jobs
        let filteredJobs = allJobs;
        if (search && search.trim()) {
          filteredJobs = filterOrdersBySearch(filteredJobs, search);
        }
        if (status && status !== "all") {
          filteredJobs = filterOrdersByStatus(filteredJobs, status);
        }

        // Get paginated results from filtered jobs
        const paginatedJobs = getPaginatedOrders(
          filteredJobs,
          page,
          pagination.limit
        );

        response = {
          orders: paginatedJobs,
          pagination: createPaginationObject(
            filteredJobs.length,
            page,
            pagination.limit
          ),
        };
      } else {
        // Regular orders logic - use API filtering
        if (search && search.trim()) {
          // Search works for both authenticated and non-authenticated users
          response = await apiService.searchOrders(
            search,
            page,
            pagination.limit
          );
        } else if (status && status !== "all") {
          // Use public method for non-authenticated users, authenticated method for logged-in users
          if (user?.id) {
            response = await apiService.getAllOrders(
              page,
              pagination.limit,
              status
            );
          } else {
            response = await apiService.getPublicOrders(
              page,
              pagination.limit,
              status
            );
          }
        } else {
          // Use public method for non-authenticated users, authenticated method for logged-in users
          if (user?.id) {
            response = await apiService.getAllOrders(page, pagination.limit);
          } else {
            response = await apiService.getPublicOrders(page, pagination.limit);
          }
        }
      }

      if (append) {
        setOrders((prev) => [...prev, ...(response.orders || [])]);
      } else {
        setOrders(response.orders || []);
      }

      setPagination(
        response.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        }
      );
    } catch (err) {
      console.error("Error loading orders:", err);
      setError(t("failedToLoadOrders"));
      // Alert.alert("Error", "Failed to load orders. Please try again.");
    } finally {
      if (isFilterChange) {
        setFilterLoading(false);
      } else if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const loadMoreOrders = useCallback(() => {
    if (!loadingMore && pagination.hasNextPage && !isInitialLoad) {
      loadOrders(
        pagination.page + 1,
        searchQuery,
        selectedFilters,
        false,
        true
      );
    }
  }, [
    loadingMore,
    pagination.hasNextPage,
    pagination.page,
    isInitialLoad,
    searchQuery,
    selectedFilters,
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders(1, searchQuery, selectedFilters, false, false);
    setRefreshing(false);
  }, [searchQuery, selectedFilters]);

  // Load orders and applied orders on component mount
  useEffect(() => {
    // If user is trying to access "My Orders" or "My Jobs" but not authenticated, redirect to login
    if ((isMyOrders || isMyJobs) && !user?.id) {
      showLoginModal();
      return;
    }

    loadOrders();
    loadAppliedOrders();
    // Set initial load as done after a small delay to prevent immediate filter effect
    setTimeout(() => {
      initialLoadDone.current = true;
      setIsInitialLoad(false);
    }, 100);
  }, [isMyOrders, isMyJobs, user?.id, showLoginModal]);

  // Handle search and filter changes (only after initial load)
  useEffect(() => {
    // Skip if initial load hasn't completed yet
    if (isInitialLoad) {
      return;
    }

    // Skip if user is currently typing
    if (isTypingRef.current) {
      return;
    }

    // Clear cached orders when filters change for My Orders/My Jobs
    if (isMyOrders || isMyJobs) {
      setAllUserOrders([]);
    }

    // Load orders with search query
    loadOrders(1, searchQuery, selectedFilters, true);
  }, [searchQuery, selectedFilters, isInitialLoad, isMyOrders, isMyJobs]);

  // Filter orders locally for additional filtering (if needed)
  // const filteredOrders = orders.filter(() => {
  //   // Additional local filtering can be added here if needed
  //   return true;
  // });

  const handleOrderPress = (order: Order) => {
    if (isMyOrders) {
      // For user's own orders, open in edit mode
      router.push(`/orders/edit/${order.id}`);
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
            await apiService.deleteOrder(order.id);
            // Remove the order from the list
            setOrders((prev) => prev.filter((o) => o.id !== order.id));
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

            // Remove the order from the list
            setOrders((prev) => prev.filter((o) => o.id !== order.id));

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
      // console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxzzzzzx");
      // Call the API to create proposal and deduct credits
      const result = await apiService.applyToOrder({
        orderId: selectedOrder.id,
        message: message,
      });

      // Add order to applied orders set
      setAppliedOrders((prev) => new Set(prev).add(selectedOrder.id));

      // Create a chat conversation with the client
      try {
        const conversation = await chatService.createOrderConversation(
          selectedOrder.id
        );

        // Try to send the initial message, but don't fail if it doesn't work
        try {
          await apiService.sendMessage({
            conversationId: conversation.id,
            content: message,
            messageType: "text",
          });
        } catch (messageError) {
          // Don't fail the whole process if message sending fails
        }

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
      rightComponent={
        isAuthenticated ? (
          <TouchableOpacity onPress={handleCreateOrder}>
            <IconSymbol name="plus.circle.fill" size={24} color={colors.tint} />
          </TouchableOpacity>
        ) : null
      }
    />
  );

  // Order item component
  const OrderItem = ({ order }: { order: Order }) => (
    <TouchableOpacity onPress={() => handleOrderPress(order)}>
      <ResponsiveCard>
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
              <IconSymbol name="location.fill" size={16} color={colors.tint} />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {order.location}
              </Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <IconSymbol name="person.fill" size={16} color={colors.tint} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {order._count.Proposals} {t("proposals")}
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
          {/* Apply Button - Only show for other users' orders */}
          {!isMyOrders &&
            order.status === "open" &&
            !hasAppliedToOrder(order.id) && (
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: colors.tint }]}
                onPress={() => handleApplyToOrder(order)}
              >
                <IconSymbol name="paperplane.fill" size={16} color="black" />
                <Text style={styles.applyButtonText}>
                  {t("apply")} (1 {t("credit")})
                </Text>
              </TouchableOpacity>
            )}

          {/* Applied Status - Show when user has already applied */}
          {!isMyOrders &&
            order.status === "open" &&
            hasAppliedToOrder(order.id) && (
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
    if (loading && !filterLoading) {
      return <EmptyPage type="loading" title={t("loading")} />;
    }

    if (error) {
      return (
        <EmptyPage
          type="error"
          title={error}
          buttonText={t("retry")}
          onRetry={() => loadOrders()}
        />
      );
    }

    if (orders.length === 0) {
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
            <ResponsiveCard style={{ marginBottom: 0 }}>
              <Filter
                searchPlaceholder={t("searchOrdersSkills")}
                onSearchChange={handleSearchChange}
                filterSections={filterSections(t, isMyOrders, isMyJobs)}
                selectedFilters={selectedFilters}
                onFilterChange={handleFilterChange}
                loading={filterLoading}
              />
            </ResponsiveCard>
          </View>

          <FlatList
            style={{ marginTop: 100 }}
            data={orders}
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
            contentContainerStyle={{ paddingBottom: 6 * Spacing.lg }}
          />
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
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontWeight: "600",
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
});
