import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNetworkStatus } from "./useNetworkStatus";
import { apiService } from "@/services/api";
import { CACHE_TTL } from "@/services/queryClient";
import { useAuth } from "@/contexts/AuthContext";

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

export const useRootServices = (language: string = "en") => {
  return useQuery({
    queryKey: ["services", "root", language],
    queryFn: () => apiService.getRootServices(language),
    staleTime: CACHE_TTL.STATIC,
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const useServices = (
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
      ? ["services", "search", trimmedQuery, page, limit, language]
      : ["services", page, limit, parentId, language],
    queryFn: () =>
      hasSearchQuery
        ? apiService.searchServices(trimmedQuery, page, limit, language)
        : apiService.getAllServices(page, limit, parentId, language),
    staleTime: hasSearchQuery ? CACHE_TTL.DYNAMIC : CACHE_TTL.STATIC,
    enabled: true, // Always enabled - hook handles both search and regular listing
    retry: isOnline,
  });
};

export const useServiceById = (id: number, language: string = "en") => {
  return useQuery({
    queryKey: ["services", id, language],
    queryFn: () => apiService.getServiceById(id, language),
    staleTime: CACHE_TTL.STATIC,
    enabled: !!id,
  });
};

export const useChildServices = (parentId: number, language: string = "en") => {
  return useQuery({
    queryKey: ["services", "children", parentId, language],
    queryFn: () => apiService.getChildServices(parentId, language),
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
    queryKey: ["services", "search", query, page, limit, language],
    queryFn: () => apiService.searchServices(query, page, limit, language),
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
  serviceId?: number,
  serviceIds?: number[],
  clientId?: number
) => {
  const { isOnline } = useNetworkStatus();
  return useQuery({
    queryKey: ["orders", "all", page, limit, status, serviceId, serviceIds, clientId],
    queryFn: () =>
      apiService.getAllOrders(page, limit, status, serviceId, serviceIds, clientId),
    staleTime: CACHE_TTL.USER_DATA,
    enabled: true,
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
  serviceId?: number,
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
      serviceId,
      location,
      budgetMin,
      budgetMax,
    ],
    queryFn: () =>
      apiService.getAvailableOrders(
        page,
        limit,
        serviceId,
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
  serviceId?: number,
  serviceIds?: number[],
  clientId?: number
) => {
  const { isOnline } = useNetworkStatus();
  return useQuery({
    queryKey: ["orders", "public", page, limit, status, serviceId, serviceIds, clientId],
    queryFn: () =>
      apiService.getPublicOrders(page, limit, status, serviceId, serviceIds, clientId),
    staleTime: CACHE_TTL.DYNAMIC,
    enabled: true,
    retry: isOnline,
  });
};

export const useSearchOrders = (
  query: string,
  page: number = 1,
  limit: number = 10,
  serviceIds?: number[]
) => {
  const { isOnline } = useNetworkStatus();
  return useQuery({
    queryKey: ["orders", "search", query, page, limit, serviceIds],
    queryFn: () => apiService.searchOrders(query, page, limit, serviceIds),
    staleTime: CACHE_TTL.DYNAMIC,
    enabled: !!query,
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

// ===== USER SERVICES HOOKS =====

export const useUserServices = (userId: number) => {
  const { isOnline } = useNetworkStatus();
  return useQuery({
    queryKey: ["user-services", userId],
    queryFn: () => apiService.getUserServices(userId),
    staleTime: CACHE_TTL.USER_DATA,
    enabled: !!userId,
    retry: isOnline,
  });
};

export const useAddUserService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      serviceId,
      notificationsEnabled,
    }: {
      userId: number;
      serviceId: number;
      notificationsEnabled: boolean;
    }) => apiService.addUserService(userId, serviceId, notificationsEnabled),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["user-services", userId] });
    },
  });
};

export const useRemoveUserService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      serviceId,
    }: {
      userId: number;
      serviceId: number;
    }) => apiService.removeUserService(userId, serviceId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["user-services", userId] });
    },
  });
};

export const useUpdateUserServiceNotifications = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      serviceId,
      notificationsEnabled,
    }: {
      userId: number;
      serviceId: number;
      notificationsEnabled: boolean;
    }) =>
      apiService.updateUserServiceNotifications(
        userId,
        serviceId,
        notificationsEnabled
      ),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["user-services", userId] });
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

// ===== UTILITY HOOKS =====

export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  return {
    invalidateAll: () => queryClient.invalidateQueries(),
    invalidateServices: () =>
      queryClient.invalidateQueries({ queryKey: ["services"] }),
    invalidateSpecialists: () =>
      queryClient.invalidateQueries({ queryKey: ["specialists"] }),
    invalidateOrders: () =>
      queryClient.invalidateQueries({ queryKey: ["orders"] }),
    invalidateProposals: () =>
      queryClient.invalidateQueries({ queryKey: ["proposals"] }),
    invalidateProfile: () =>
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
    invalidateUserServices: () =>
      queryClient.invalidateQueries({ queryKey: ["user-services"] }),
    invalidateConversations: () =>
      queryClient.invalidateQueries({ queryKey: ["conversations"] }),
    invalidateReviews: () =>
      queryClient.invalidateQueries({ queryKey: ["reviews"] }),
    invalidateReasons: () =>
      queryClient.invalidateQueries({ queryKey: ["reasons"] }),
  };
};
