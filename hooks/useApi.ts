import type { SubscriptionPlan, UserSubscription } from "@/categories/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { CACHE_TTL } from "@/categories/queryClient";
import { apiService } from "@/categories/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNetworkStatus } from "./useNetworkStatus";

// ===== AUTHENTICATION HOOKS =====

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiService.login(email, password),
    onSuccess: (data) => {
      // Invalidate user-related queries after successful login
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

export const useSignup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      password: string;
      role: string;
    }) => apiService.signup(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useVerifyOTP = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      phone,
      otp,
      name,
      isSimulator,
    }: {
      phone: string;
      otp: string;
      name: string;
      isSimulator?: boolean;
    }) =>
      apiService.post<{ access_token: string; user: any }>("/auth/verify-otp", {
        phone,
        otp,
        name,
        isSimulator,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiService.post("/auth/logout", {}, true),
    onSuccess: () => {
      // Clear all cached data on logout
      queryClient.clear();
    },
  });
};

// ===== USER PROFILE HOOKS =====

export const useProfile = () => {
  const { isOnline } = useNetworkStatus();
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => apiService.getUserProfile(),
    staleTime: CACHE_TTL.USER_DATA,
    enabled: true,
    retry: isOnline,
  });
};

const PLATFORM_STATS_CACHE_KEY = "platform_stats_cache";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const usePlatformStats = () => {
  const { isOnline } = useNetworkStatus();
  return useQuery({
    queryKey: ["platformStats"],
    queryFn: async () => {
      const now = Date.now();
      try {
        const cachedRaw = await AsyncStorage.getItem(PLATFORM_STATS_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached?.timestamp && now - cached.timestamp < ONE_DAY_MS) {
            return cached.data;
          }
        }
      } catch (e) {
        console.warn("Failed to read platform stats cache", e);
      }

      const fresh = await apiService.getPlatformStats();

      try {
        await AsyncStorage.setItem(
          PLATFORM_STATS_CACHE_KEY,
          JSON.stringify({ data: fresh, timestamp: now })
        );
      } catch (e) {
        console.warn("Failed to write platform stats cache", e);
      }

      return fresh;
    },
    staleTime: Infinity, // rely on our 24h manual gate above
    gcTime: CACHE_TTL.STATIC,
    retry: isOnline,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiService.updateUserProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useUpdatePassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => apiService.updatePassword(currentPassword, newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useUserById = (id: number) => {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => apiService.getUserById(id),
    staleTime: CACHE_TTL.USER_DATA,
    enabled: !!id,
  });
};

export const useUpdateUserById = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiService.updateUserById(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["users", id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      phoneNumber,
    }: {
      userId: number;
      phoneNumber?: string;
    }) => apiService.deleteAccount(userId, phoneNumber),
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

// ===== SERVICES HOOKS =====

// ===== SKILLS HOOKS =====

export const useSkills = () => {
  return useQuery({
    queryKey: ["skills", "all"],
    queryFn: () => apiService.getAllSkills(),
    staleTime: CACHE_TTL.STATIC, // 24 hours - skills don't change often
    gcTime: CACHE_TTL.STATIC,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useRootCategories = (language: string = "en") => {
  return useQuery({
    queryKey: ["categories", "root", language],
    queryFn: () => apiService.getRootCategories(language),
    staleTime: CACHE_TTL.STATIC,
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const useCategories = (
  page: number = 1,
  limit: number = 10,
  parentId?: number,
  language: string = "en",
  searchQuery?: string
) => {
  const { isOnline } = useNetworkStatus();
  const trimmedQuery = searchQuery?.trim();
  const hasSearchQuery = !!trimmedQuery;

  return useQuery({
    queryKey: hasSearchQuery
      ? ["categories", "search", trimmedQuery, page, limit, language]
      : ["categories", page, limit, parentId, language],
    queryFn: () =>
      hasSearchQuery
        ? apiService.searchCategories(trimmedQuery, page, limit, language)
        : apiService.getAllCategories(page, limit, parentId, language),
    staleTime: hasSearchQuery ? CACHE_TTL.DYNAMIC : CACHE_TTL.STATIC,
    enabled: true, // Always enabled - hook handles both search and regular listing
    retry: isOnline,
  });
};

export const useCategoryById = (id: number, language: string = "en") => {
  return useQuery({
    queryKey: ["categories", id, language],
    queryFn: () => apiService.getCategoryById(id, language),
    staleTime: CACHE_TTL.STATIC,
    enabled: !!id,
  });
};

export const useChildCategories = (
  parentId: number,
  language: string = "en"
) => {
  return useQuery({
    queryKey: ["categories", "children", parentId, language],
    queryFn: () => apiService.getChildCategories(parentId, language),
    staleTime: CACHE_TTL.STATIC,
    enabled: !!parentId,
  });
};

export const useSearchServices = (
  query: string,
  page: number = 1,
  limit: number = 10,
  language: string = "en"
) => {
  const { isOnline } = useNetworkStatus();
  return useQuery({
    queryKey: ["categories", "search", query, page, limit, language],
    queryFn: () => apiService.searchCategories(query, page, limit, language),
    staleTime: CACHE_TTL.DYNAMIC,
    enabled: !!query,
    retry: isOnline,
  });
};

// ===== SPECIALISTS HOOKS =====

export const useSpecialists = (page: number = 1, limit: number = 10) => {
  const { isOnline } = useNetworkStatus();
  return useQuery({
    queryKey: ["specialists", page, limit],
    queryFn: () => apiService.getAllSpecialists(page, limit),
    staleTime: CACHE_TTL.DYNAMIC,
    enabled: true,
    retry: isOnline,
  });
};

export const useSpecialistsWithAuth = (
  page: number = 1,
  limit: number = 10
) => {
  const { isOnline } = useNetworkStatus();
  return useQuery({
    queryKey: ["specialists", "auth", page, limit],
    queryFn: () => apiService.getAllSpecialistsWithAuth(page, limit),
    staleTime: CACHE_TTL.DYNAMIC,
    enabled: true,
    retry: isOnline,
  });
};

export const useSpecialistById = (id: number) => {
  return useQuery({
    queryKey: ["specialists", id],
    queryFn: () => apiService.getSpecialistById(id),
    staleTime: CACHE_TTL.DYNAMIC,
    enabled: !!id,
  });
};

// ===== ORDERS HOOKS =====

export const useOrderById = (id: number) => {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => apiService.getOrderById(id),
    staleTime: CACHE_TTL.USER_DATA,
    enabled: !!id,
  });
};

export const useAllOrders = (
  page: number = 1,
  limit: number = 10,
  status?: string,
  categoryId?: number,
  categoryIds?: number[],
  clientId?: number,
  orderType?: "one_time" | "permanent",
  enabled: boolean = true
) => {
  const { isOnline } = useNetworkStatus();
  return useQuery({
    queryKey: [
      "orders",
      "all",
      page,
      limit,
      status,
      categoryId,
      categoryIds,
      clientId,
      orderType,
    ],
    queryFn: () =>
      apiService.getAllOrders(
        page,
        limit,
        status,
        categoryId,
        categoryIds,
        clientId,
        orderType
      ),
    staleTime: CACHE_TTL.USER_DATA,
    enabled: enabled,
    retry: isOnline,
  });
};

export const useMyOrders = () => {
  const { isOnline } = useNetworkStatus();
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["orders", "my"],
    queryFn: () => apiService.getMyOrders(),
    staleTime: CACHE_TTL.USER_DATA,
    enabled: isAuthenticated,
    retry: isOnline,
  });
};

export const useMyJobs = () => {
  const { isOnline } = useNetworkStatus();
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["orders", "my-jobs"],
    queryFn: () => apiService.getMyJobs(),
    staleTime: CACHE_TTL.USER_DATA,
    enabled: isAuthenticated,
    retry: isOnline,
  });
};

export const useAvailableOrders = (
  page: number = 1,
  limit: number = 10,
  categoryId?: number,
  location?: string,
  budgetMin?: number,
  budgetMax?: number
) => {
  const { isOnline } = useNetworkStatus();
  return useQuery({
    queryKey: [
      "orders",
      "available",
      page,
      limit,
      categoryId,
      location,
      budgetMin,
      budgetMax,
    ],
    queryFn: () =>
      apiService.getAvailableOrders(
        page,
        limit,
        categoryId,
        location,
        budgetMin,
        budgetMax
      ),
    staleTime: CACHE_TTL.DYNAMIC,
    enabled: true,
    retry: isOnline,
  });
};

export const usePublicOrders = (
  page: number = 1,
  limit: number = 10,
  status?: string,
  categoryId?: number,
  categoryIds?: number[],
  clientId?: number,
  orderType?: "one_time" | "permanent",
  enabled: boolean = true
) => {
  const { isOnline } = useNetworkStatus();
  return useQuery({
    queryKey: [
      "orders",
      "public",
      page,
      limit,
      status,
      categoryId,
      categoryIds,
      clientId,
      orderType,
    ],
    queryFn: () =>
      apiService.getPublicOrders(
        page,
        limit,
        status,
        categoryId,
        categoryIds,
        clientId,
        orderType
      ),
    staleTime: CACHE_TTL.DYNAMIC,
    enabled: enabled,
    retry: isOnline,
  });
};

export const useSearchOrders = (
  query: string,
  page: number = 1,
  limit: number = 10,
  categoryIds?: number[],
  orderType?: "one_time" | "permanent",
  enabled: boolean = true
) => {
  const { isOnline } = useNetworkStatus();
  return useQuery({
    queryKey: ["orders", "search", query, page, limit, categoryIds, orderType],
    queryFn: () =>
      apiService.searchOrders(query, page, limit, categoryIds, orderType),
    staleTime: CACHE_TTL.DYNAMIC,
    enabled: enabled && !!query,
    retry: isOnline,
  });
};

export const useSavedOrders = (page: number = 1, limit: number = 20) => {
  const { isOnline } = useNetworkStatus();
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["orders", "saved", page, limit],
    queryFn: () => apiService.getSavedOrders(page, limit),
    staleTime: CACHE_TTL.USER_DATA,
    enabled: isAuthenticated,
    retry: isOnline,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiService.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiService.updateOrder(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", id] });
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiService.deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

// ===== PROPOSALS HOOKS =====

export const useCreateProposal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiService.createProposal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

export const useApplyToOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      orderId: number;
      message?: string;
      questionAnswers?: Array<{ questionId: number; answer: string }>;
      peerIds?: number[];
      teamId?: number;
    }) => apiService.applyToOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

export const useAllProposals = (
  page: number = 1,
  limit: number = 10,
  status?: string,
  orderId?: number,
  userId?: number
) => {
  const { isOnline } = useNetworkStatus();
  return useQuery({
    queryKey: ["proposals", page, limit, status, orderId, userId],
    queryFn: () =>
      apiService.getAllProposals(page, limit, status, orderId, userId),
    staleTime: CACHE_TTL.USER_DATA,
    enabled: true,
    retry: isOnline,
  });
};

export const useProposalById = (id: number) => {
  return useQuery({
    queryKey: ["proposals", id],
    queryFn: () => apiService.getProposalById(id),
    staleTime: CACHE_TTL.USER_DATA,
    enabled: !!id,
  });
};

export const useUpdateProposal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiService.updateProposal(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposals", id] });
    },
  });
};

export const useDeleteProposal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiService.deleteProposal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
};

export const useProposalsByOrder = (orderId: number) => {
  return useQuery({
    queryKey: ["proposals", "order", orderId],
    queryFn: () => apiService.getProposalsByOrder(orderId),
    staleTime: CACHE_TTL.USER_DATA,
    enabled: !!orderId,
  });
};

export const useProposalsByUser = (userId: number) => {
  return useQuery({
    queryKey: ["proposals", "user", userId],
    queryFn: () => apiService.getProposalsByUser(userId),
    staleTime: CACHE_TTL.USER_DATA,
    enabled: !!userId,
  });
};

export const useCancelProposal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: number) => apiService.cancelProposal(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

// ===== REVIEWS HOOKS =====

export const useReviewsByReviewer = (
  reviewerId: number,
  page: number = 1,
  limit: number = 10
) => {
  return useQuery({
    queryKey: ["reviews", "reviewer", reviewerId, page, limit],
    queryFn: () => apiService.getReviewsByReviewer(reviewerId, page, limit),
    staleTime: CACHE_TTL.USER_DATA,
    enabled: !!reviewerId,
  });
};

// ===== REASONS HOOKS =====

export const useReasons = () => {
  return useQuery({
    queryKey: ["reasons"],
    queryFn: () => apiService.getReasons(),
    staleTime: CACHE_TTL.STATIC,
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// ===== CHAT HOOKS =====

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiService.createConversation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiService.sendMessage(data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["conversations", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

// ===== HIRING HOOKS =====

export const useCheckHiringStatus = () => {
  return useMutation({
    mutationFn: (data: { specialistId: number; orderId: number }) =>
      apiService.checkHiringStatus(data),
  });
};

export const useHireSpecialist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      specialistId: number;
      message: string;
      orderId: number;
    }) => apiService.hireSpecialist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["specialists"] });
    },
  });
};

// ===== MEDIA FILES HOOKS =====

export const useUploadMediaFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiService.uploadMediaFile(data),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

// ===== USER CATEGORIES HOOKS =====

export const useUserCategories = (userId: number) => {
  const { isOnline } = useNetworkStatus();
  return useQuery({
    queryKey: ["user-categories", userId],
    queryFn: () => apiService.getUserCategories(userId),
    staleTime: CACHE_TTL.USER_DATA,
    enabled: !!userId,
    retry: isOnline,
  });
};

export const useAddUserCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      categoryId,
      notificationsEnabled,
    }: {
      userId: number;
      categoryId: number;
      notificationsEnabled: boolean;
    }) => apiService.addUserCategory(userId, categoryId, notificationsEnabled),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["user-categories", userId] });
    },
  });
};

export const useRemoveUserCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      categoryId,
    }: {
      userId: number;
      categoryId: number;
    }) => apiService.removeUserCategory(userId, categoryId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["user-categories", userId] });
    },
  });
};

export const useUpdateUserCategoryNotifications = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      categoryId,
      notificationsEnabled,
    }: {
      userId: number;
      categoryId: number;
      notificationsEnabled: boolean;
    }) =>
      apiService.updateUserCategoryNotifications(
        userId,
        categoryId,
        notificationsEnabled
      ),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["user-categories", userId] });
    },
  });
};

// ===== PHONE VERIFICATION HOOKS =====

export const useSendPhoneVerification = () => {
  return useMutation({
    mutationFn: ({ phone }: { phone: string }) =>
      apiService.post<{ success: boolean; message: string }>(
        "/phone-verification/send",
        { phone }
      ),
  });
};

export const useVerifyPhoneOTP = () => {
  return useMutation({
    mutationFn: ({ phone, otp }: { phone: string; otp: string }) =>
      apiService.post<{ success: boolean; message: string }>(
        "/phone-verification/verify",
        { phone, otp }
      ),
  });
};

export const useTrackPhoneNumber = () => {
  return useMutation({
    mutationFn: ({ phoneNumber }: { phoneNumber: string }) =>
      apiService.post<{ success: boolean }>("/phone-verification/track", {
        phoneNumber,
      }),
  });
};

// ===== NOTIFICATIONS HOOKS =====

export const useNotifications = (page: number = 1, limit: number = 100) => {
  const { isOnline } = useNetworkStatus();
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["notifications", page, limit],
    queryFn: async () => {
      const response = await apiService.get<{
        notifications: any[];
        pagination: any;
      }>("/notifications?limit=100", true);
      // Convert backend format to frontend format
      return {
        notifications: response.notifications.map((n: any) => ({
          id: n.id.toString(),
          title: n.title || "",
          message: n.message || "",
          timestamp: n.createdAt || new Date().toISOString(),
          isRead: n.isRead || false,
          type: n.type || "system",
        })),
        pagination: response.pagination,
      };
    },
    staleTime: CACHE_TTL.DYNAMIC,
    enabled: isAuthenticated,
    retry: isOnline,
  });
};

export const useUnreadNotificationCount = () => {
  const { isOnline } = useNetworkStatus();
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const response = await apiService.get<{ unreadCount: number }>(
        "/notifications/unread-count",
        true
      );
      return response.unreadCount;
    },
    staleTime: CACHE_TTL.DYNAMIC,
    enabled: isAuthenticated,
    retry: isOnline,
    refetchInterval: 300000, // 5 minutes (Pusher is primary, this is backup)
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      apiService.post(`/notifications/${notificationId}/read`, {}, true),
    onSuccess: (_, notificationId) => {
      // Optimistically update the cache
      queryClient.setQueryData(["notifications", 1, 100], (old: any) => {
        if (!old?.notifications) return old;
        return {
          ...old,
          notifications: old.notifications.map((n: any) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          ),
        };
      });
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiService.post("/notifications/mark-all-read", {}, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      });
    },
  });
};

export const useClearAllNotifications = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiService.delete("/notifications/clear-all", true),
    onSuccess: () => {
      // Clear the cache and set to empty array
      queryClient.setQueryData(["notifications", 1, 100], {
        notifications: [],
        pagination: { total: 0, page: 1, limit: 100, pages: 0 },
      });
      queryClient.setQueryData(["notifications", "unread-count"], 0);
      // Also invalidate to ensure fresh data on next fetch
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

// ===== SUBSCRIPTION HOOKS =====

export const useSubscriptionPlans = () => {
  const { isOnline } = useNetworkStatus();
  const { language } = useLanguage();
  return useQuery<SubscriptionPlan[]>({
    queryKey: ["subscription-plans", language],
    queryFn: () => apiService.getSubscriptionPlans(language),
    staleTime: CACHE_TTL.STATIC,
    gcTime: CACHE_TTL.STATIC * 2,
    retry: isOnline,
  });
};

export const useSubscriptionPlan = (planId: number | null) => {
  const { isOnline } = useNetworkStatus();
  const { language } = useLanguage();
  return useQuery<SubscriptionPlan>({
    queryKey: ["subscription-plan", planId, language],
    queryFn: () => {
      if (!planId) throw new Error("Plan ID is required");
      return apiService.getSubscriptionPlanById(planId, language);
    },
    enabled: !!planId,
    staleTime: CACHE_TTL.STATIC,
    gcTime: CACHE_TTL.STATIC * 2,
    retry: isOnline,
  });
};

export const useMySubscription = () => {
  const { isOnline } = useNetworkStatus();
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  return useQuery<UserSubscription | null>({
    queryKey: ["my-subscription", language],
    queryFn: () => apiService.getMySubscription(language),
    enabled: isAuthenticated,
    staleTime: CACHE_TTL.STATIC,
    gcTime: CACHE_TTL.STATIC * 2,
    retry: isOnline,
  });
};

export const usePurchaseSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { planId: number; autoRenew?: boolean }) =>
      apiService.purchaseSubscription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    },
  });
};

export const useCancelSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: number) =>
      apiService.cancelSubscription(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
    },
  });
};

export const useRenewSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { subscriptionId: number }) =>
      apiService.renewSubscription(data.subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
    },
  });
};

// ===== UTILITY HOOKS =====

export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  return {
    invalidateAll: () => queryClient.invalidateQueries(),
    invalidateCategories: () =>
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
    invalidateSpecialists: () =>
      queryClient.invalidateQueries({ queryKey: ["specialists"] }),
    invalidateOrders: () =>
      queryClient.invalidateQueries({ queryKey: ["orders"] }),
    invalidateProposals: () =>
      queryClient.invalidateQueries({ queryKey: ["proposals"] }),
    invalidateProfile: () =>
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
    invalidateUserCategories: () =>
      queryClient.invalidateQueries({ queryKey: ["user-categories"] }),
    invalidateConversations: () =>
      queryClient.invalidateQueries({ queryKey: ["conversations"] }),
    invalidateReviews: () =>
      queryClient.invalidateQueries({ queryKey: ["reviews"] }),
    invalidateReasons: () =>
      queryClient.invalidateQueries({ queryKey: ["reasons"] }),
    invalidateSkills: () =>
      queryClient.invalidateQueries({ queryKey: ["skills"] }),
    invalidateSubscriptions: () =>
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] }),
    invalidateMySubscription: () =>
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] }),
  };
};
